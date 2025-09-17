import {
    Path,
    PathItem,
    Schema,
    ValueSerializor
} from "./path";
import {AvlTree} from "../structs/avltree";
import {clone, compare, compareKey, isEqual} from "../util/object";
import {StructType} from "../frp/struct";
import {ChangeMapNodeChild, PathChangeMap} from "./changepathmap";
import {Add, Change, ChangePosition, ChangeType, Delete, Move, Reorder, SetChange} from "./change";
import {ChangeDbInterface, ReferenceFilter} from "./changedb";


export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

/**
 * @constructor
 */
export class ChangeSet {
    /**
     * remove a path from the list
     */
    static removePath(path:Path, list:Path[]) {
        for (let i = 0; i < list.length; i++) {
            if (isEqual(list[i], path)) {
                list.splice(i, 1);
                return;
            }
        }
    }

    static findPath(path:Path, list:Path[]):Path|null {
        for (let i = 0; i < list.length; i++) {
            if (isEqual(list[i], path)) {
                return list[i];
            }
        }
        return null;
    };

    /**
     * takes a list of changes and converts it into a set of minimal changes
     */
    static merge(schema:Schema, changes:Change[]):Change[] {
        let pathChangeMap = new PathChangeMap();

        for (let i = 0; i < changes.length; i++) {
            let change = changes[i].absolute(schema);

            change.merge(pathChangeMap, null, []);

            // if the change is add just add

            // if the change is a delete
            // remove all changes sub changes
            // if was and add of this key then do not add us
            // if move to us change path to original

            // if move
            // if was added move all actions us and change path to dest
            // do not add
        }
        let toSort:ChangeMapNodeChild[] = [];
        pathChangeMap.forEach(function(change:ChangeMapNodeChild) {
            if (!change.ancestor && !change.hide) {
                change.change.sortDesendents(pathChangeMap);
                toSort.push(change);
            }
        });
        return toSort.sort(PathChangeMap.comparePos).map(v => v.change).filter(c => !c.isNoOp());
    }

    /**
     * @return {!AvlTree<!Path>} set of changed roots
     */
    static applyChanges(dbInterface: ChangeDbInterface, schema: Schema, changes: Change[]):AvlTree<Path> {
        let changedRoots = new AvlTree<Path>(compare);

        const addRoot = (root:Path)=> {
            changedRoots.add(root);
        };
        const addRoots =  (path:Path)=> {
            dbInterface.getRoots(path).forEach(addRoot);
        };
        for (let i = 0; i < changes.length; i++) {
            let change = changes[i];

            addRoots(change.path());

            if (change instanceof Add || change instanceof Move) {
                // we may have changes in children
                schema.children(change.path()).forEach(function (child) {
                    addRoots(change.path().appendName(child));
                });
            }
            if (change instanceof Move) {
                addRoots(change.to());
                for (let child of schema.children(change.to())) {
                    addRoots(change.to().appendName(child));
                }
            }
            change.applyToDb(dbInterface, schema);
        }

        return changedRoots;
    }
}
export class ChangeDb implements ChangeDbInterface {
    private schema_: Schema;
    private rootLock_: number;
    private data_:ContainerNode;
    private roots_:Path[];

    constructor(schema: Schema) {
        this.schema_ = schema;
        this.data_ = new ContainerNode();
        this.rootLock_ = 0;
        this.roots_ = [];
    }

    /**
     * these are used to remove data from the database when there are no longer references to the data. The data should be deleted
     * this may replace set root so that we need the root c
     * @param path
     * @param filter
     */
    addReference(path:Path, filter:ReferenceFilter) {
    }
    removeReference(path: Path, filter: ReferenceFilter) {
    }

    updatePk(schema: Schema, path:Path, keys:any[]) {
        let node = this.resolve_(path.unsetKeys(), false);
        if (node) {
            node.updatePk(schema, path, keys);
        }

    }

    /**
     * @param {!Path} path
     */
    applyAdd(path: Path) {
        let listNode;
        if (path.lastKeys().length > 0) {
            // this is a list node we are adding
            listNode = this.resolve_(path.unsetKeys(), this.rootLock_ === 0);
            if (!listNode) {
                return;
            }
            if (!(listNode instanceof ListNode)) {
                throw new Error("cannot add node '" + path.toString() + "' to non-list");
            }

            let newNode = new ContainerNode();
            listNode.add(path.last(), newNode);
        } else {
            listNode = this.resolve_(path.parent(), false);

            if (!(listNode instanceof ContainerNode)) {
                // a root container maybe added because it maybe an object and null
                if (listNode !== null) {
                    throw new Error("cannot add node '" + path.toString() + "' to non-container");
                }
            }
            listNode = this.resolve_(path, true);
            if (listNode instanceof ContainerNode) {
                if (!listNode.get(this.schema_, path)) {
                    listNode.set(this.schema_, path, {});
                }
            }
        }
        this.schema_.applyDefaults(path, this);
    }


    /**
     * @param {!Path} path
     */
    applyDelete(path:Path) {
        let listNode;
        if (path.lastKeys().length > 0) {
            // this is a list node we are deleting from
            listNode = this.resolve_(path.unsetKeys(), false);
            if (!listNode) {
                return;
            }
            if (!(listNode instanceof ListNode)) {
                throw new Error("cannot delete node '" + path.toString() + "' from non-list");
            }

            listNode.remove(path.last());
            return;
        } else {
            listNode = this.resolve_(path.parent(), false);

            if (!(listNode instanceof ContainerNode)) {
                throw new Error("cannot remove node '" + path.toString() + "' to non-container");
            }
            let curNode = this.resolve_(path, false);
            if (curNode) {
                curNode.set(this.schema_, path, null);
            }
            return;
        }
    }

    applyReorder(from:Path, to:Path|null, position:ChangePosition) {
        let listNode = this.resolve_(from.unsetKeys(), false);
        if (!listNode) {
            return;
        }

        if (!(listNode instanceof ListNode)) {
            throw new Error("move node '" + from.unsetKeys().toString() + "' is not a list");
        }

        if (this.schema_.isOrderedList(from)) {
            listNode.reorder(this.schema_, from.last(), to ? to.last() : null, position);
        }

    }
    applyMove(from:Path, to:Path) {
        let listNode = this.resolve_(from.unsetKeys(), false);
        if (!listNode) {
            return;
        }
        if (!(listNode instanceof ListNode)) {
            throw new Error("move node '" + from.unsetKeys().toString() + "' is not a list");
        }

        if (this.schema_.isOrderedList(from)) {
            listNode.move(from.last(), to.last());
        } else {
            let oldNode = listNode.remove(from.last());
            if (!oldNode) {
                throw new Error("move node '" + from.toString() + "' does not exist");
            }
            listNode.add(to.last(), oldNode);
        }
    }
    applySet(path:Path, val:any) {
        let node = this.resolve_(path, false);
        if (!node) {
            let parent = this.resolve_(path.parent(), false);
            if (!parent) {
                if (this.rootLock_ === 0) {
                    throw new Error("set node '" + path.toString() + "' does not exist");
                }
                let roots = this.getRoots(path);
                if (roots.length === 0) {
                    // there is no existing root for this path
                    // and the roots are locked so we don't want to add it
                    return;
                }
                // this will add the node
                parent = this.resolve_(path.parent(), true);
            }

            node = parent.getChildNode(this.schema_, path.last(), path, true);
        }
        if (!(node instanceof LeafNode)) {
            throw new Error("set node '" + path.toString() + "' is not a leaf");
        }
        node.setValue(val);

    }

    isRoot(path:Path):boolean {
        let absolutePath = this.schema_.absolute(path);
        for (let i = 0; i < this.roots_.length; i++) {
            let root = this.roots_[i];
            if (isEqual(absolutePath, this.schema_.absolute(root))) {
                return true;
            }
        }
        return false;
    };

    /**
     * @param {!Path} path
     * @return {!Array<!Path>}
     */
    getRoots(path:Path):Path[] {
        let res:Path[] = [];
        let me = this;
        let absolutePath = me.schema_.absolute(path);
        this.roots_.forEach(function (root) {
            let absRoot = me.schema_.absolute(root);
            if (absRoot.isAncestor(absolutePath, true)) {
                let suffix = absolutePath.getSuffix(absRoot);
                if (me.schema_.exists(root.appendSuffix(suffix as any))) {
                    res.push(root);
                }
            }
        });
        return res;
    };

    /**
     * stops new roots from being added this is useful
     * @param {function()} callback
     */
    lockRoots(callback:() => void) {
        try {
            this.rootLock_++;
            callback();
        } finally {
            this.rootLock_--;
        }
    };

    /**
     * replaces this db with the src db
     */
    replaceDb(srcDb:ChangeDb):Path[] {
        this.schema_ = srcDb.schema_;
        this.data_ = clone(srcDb.data_);
        this.roots_ = [...srcDb.roots_];
        return this.roots_;
    }
    applyChanges(changes:Change[]) {
        for (let i = 0; i < changes.length; i++) {
            let change = changes[i];
            change.applyToDb(this, this.schema_);
        }
    }


    /**
     * @param rootPath
     * @param val
     * @param opt_filter
     * @return returns a list of roots that have changed
     */
    set(rootPath:Path, val:any, opt_filter?: (v:any) => boolean) {
        // don't create path if val is null
        let cur = this.resolve_(rootPath, true);

        let absolutePath = this.schema_.absolute(rootPath);
        cur.set(this.schema_, rootPath, val, opt_filter);
        let found = false;
        let changed = [];
        for (let i = 0; i < this.roots_.length; i++) {
            let root = this.roots_[i];
            found = found || isEqual(root, rootPath);
            if (this.schema_.absolute(root).isAncestor(absolutePath, true)) {
                changed.push(root);
            }
        }

        /*
          if (!found && this.rootLock_ === 0) {
            this.roots_.push(rootPath);
            changed.push(rootPath);
        }*/
        return changed;
    }

    /**
     * used to set entire trees as opposed when changes are applied
     * this checks for null value set and if so does not create ansestors
     * @return a list of roots that have changed
     */
    setRoot(rootPath:Path, val:any, opt_filter?: (v:any) => boolean):Path[] {
        // don't create path if val is null
        let cur = this.resolve_(rootPath, val !== null);

        let absolutePath = this.schema_.absolute(rootPath);
        if (cur) {
            cur.set(this.schema_, rootPath, val, opt_filter);
        }
        let found = false;
        let changed = [];
        for (let i = 0; i < this.roots_.length; i++) {
            let root = this.roots_[i];
            let equal = isEqual(root, rootPath);
            found = found || equal;
            if (this.schema_.absolute(root).isAncestor(absolutePath, true)) {
                if (cur || equal) {
                    changed.push(root);
                }
            }

        }

        if (!found && this.rootLock_ === 0) {
            this.roots_.push(rootPath);
            changed.push(rootPath);
        }

        return changed;
    }

    remove(rootPath:Path) {
        let cur = this.resolve_(rootPath, false);
        if (!cur) {
            return;
        }
        let absolutePath = this.schema_.absolute(rootPath);
        let found = false;

        for (let i = this.roots_.length - 1; i >= 0; i--) {
            let root = this.roots_[i];
            if (isEqual(root, rootPath)) {
                this.roots_.splice(i, 1);
            } else if (this.schema_.absolute(root).isAncestor(absolutePath, true)) {
                found = true;
            }
        }
        // TODO remove data from the tree no other roots access it
    }

    private resolve_(path: Path, create: true): ChangeDbNode;
    private resolve_(path: Path, create: boolean): ChangeDbNode|null;
    private resolve_(path: Path, create: boolean): ChangeDbNode|null {
        let items = this.schema_.absolute(path).items();
        let cur:ChangeDbNode|null = this.data_;
        let seenItems = [];
        for (let i = 0; i < items.length && cur; i++) {
            let item = items[i];
            let unkeyed = item.unsetKeys();
            seenItems.push(unkeyed);
            cur = cur.getChildNode(this.schema_, item, new Path(seenItems), create);
            if (cur && item.keys().length > 0) {
                seenItems[seenItems.length - 1] = item;
                cur = cur.getChildNode(
                    this.schema_, item,
                    new Path(seenItems), create);
            }
        }
        return cur;
    }

    get(rootPath:Path):any {
        let fullObj = this.resolve_(rootPath, false);
        if (fullObj === null) {
            return null;
        }
        return fullObj.get(this.schema_, rootPath);
    };
}




/**
 * allows override to serialize/deserialize values, eg buffers
 */
class DefaultValueSerializor implements ValueSerializor {
    serializeKeys(_path:Path, val:any):any {
        return val;
    }
    serialize(_path: Path, val: any) {
        return val;
    }
    deserializeKeys(_path:Path, serialized:any):any {
        return serialized;
    }
    deserialize(_path: Path, serialized: any) {
        return serialized;
    }

}






/**
 * @interface
 */
interface ChangeSetError {
}

export class DupPk implements ChangeSetError {
    private path_: Path;
    constructor(path:Path) {
        this.path_ = path;
    }
}


export function inverseChanges(schema:Schema, changes:Change[]):Change[] {
    let res = [];
    for (let i = changes.length - 1; i >= 0; i--) {
        let c = changes[i].inverse(schema);
        if (c) {
            res.push(c);
        }
    }
    return res;
}

type ChangesAndErrors = {changes:Change[],errors:ChangeSetError[]}
/**
 * caculates a list of changes between an old an new objec
 *
 * it should be noted the origColumn is used to determine the original key if it is a keyed list
 *
 * @param oldObj the old object
 * @param newObj the new obj
 * @param path the path to the object
 * @param pkColumn the column key a unique immutable key for each object, only used for arrays of objects
 * @param schema an interface describing all the object in the schema
 * @param changes will add changes to this if provided
 */

export function diff(oldObj:any, newObj:any, path:Path, pkColumn:string, schema:Schema, changes:ChangesAndErrors = {changes: [], errors: []}) : ChangesAndErrors {
    if (schema.isLeaf(path)) {
        if (oldObj === undefined || oldObj === null) {
            if (newObj === undefined || newObj === null) {
                // these are considered the same
                return changes;
            }
        }
        if (!isEqual(oldObj, newObj)) {
            changes.changes.push(new SetChange(schema.absolute(path), oldObj, newObj));
        }
        return changes;
    }

    if ((oldObj === null || oldObj === undefined) && (newObj == null)) {
        return changes;
    }
    if (schema.isKeyedList(path)) {
        // if the item is null and a list assume it is a list
        if (oldObj === null || oldObj === undefined) {
            oldObj = [];
        }
        if (newObj === null || newObj === undefined) {
            newObj = [];
        }
    }
    if (newObj === null || newObj === undefined) {
        let cloned = {...oldObj};
        for (let k of path.last().keyNames()){
            delete cloned[k];
        }
        changes.changes.push(new Delete(schema.absolute(path), cloned));
        return changes;
    }
    let subChanges = changes;
    if (oldObj === null || oldObj === undefined) {
        subChanges = {changes: [], errors: changes.errors};
        changes.changes.push(new Add(schema.absolute(path), subChanges.changes));
    }
    else if (schema.isKeyedList(path)) {
        let needed:{idx: number|null, newIdx: number, key: Path, removeKey?: Path}[] = [];
        let used:Path[] = [];
        let newRowMap = new Map();
        let oldRowMap = new Map();
        let oldRowPos = new Map<string, number>();
        let curOrder = [];

        for (let i = 0; i < newObj.length; i++) {
            let origKey:string = newObj[i][pkColumn];
            newRowMap.set(origKey,{idx: i, val: newObj[i]});
        }

        // do any deletes first they are not going to conflict with any existing keys
        for (let i = 0; i < oldObj.length; i++) {
            let oldChild = oldObj[i];
            let oldKey = schema.createKeyPath(path, oldChild);
            let oldPk = oldChild[pkColumn];
            oldRowMap.set(oldPk, oldChild);
            oldRowPos.set(oldPk,  i);
            let newChildEntry = newRowMap.get(oldPk);
            if (newChildEntry && newChildEntry.val) {
                let newKey = schema.createKeyPath(path, newChildEntry.val);
                used.push(oldKey);
                curOrder.push(oldChild);
                if (!isEqual(newKey, oldKey)) {
                    needed.push({idx: i, newIdx: newChildEntry.idx, key: newKey, removeKey: oldKey});
                }
                else {
                    diff(oldChild, newChildEntry.val, newKey, pkColumn, schema, changes);
                }
            }
            else {
                diff(oldChild, undefined, oldKey, pkColumn, schema, changes);
            }
        }
        for (let i = 0; i < newObj.length; i++) {
            let newChild = newObj[i];
            // this is a new item
            if (!oldRowMap.has(newChild[pkColumn])) {
                curOrder.push(newChild);
                let newKey = schema.createKeyPath(path, newChild);
                needed.push({idx: null, newIdx: i, key: newKey});
            }
        }


        while (needed.length > 0) {
            let newNeeded:{idx: number|null, newIdx: number, key: Path, removeKey?: Path}[] = [];
            needed.forEach((info)=> {
                if (ChangeSet.findPath(info.key, used)) {
                    newNeeded.push(info);
                }
                else {
                    if (info.removeKey) {
                        diff(oldObj[info.idx as number], newObj[info.newIdx], info.removeKey, pkColumn, schema,
                                                 changes);
                        changes.changes.push(new Move(schema.absolute(info.removeKey), schema.absolute(info.key)));
                        ChangeSet.removePath(info.removeKey, used);
                    }
                    else {
                        diff(null, newObj[info.newIdx], info.key, pkColumn, schema, changes);
                    }
                    used.push(info.key);
                }
            });
            if (needed.length === newNeeded.length) {
                // for now just leave we may deal with these at a higher level

                // first build up a map of dup needed or in used if they are in there then they are real duplicate
                // add to errors
                // the rest are just loops pick one and do a delete
                needed.forEach(function(info) {
                    changes.errors.push(new DupPk(schema.absolute(info.key)));
                });
                break;
            }
            needed = newNeeded;
        }
        if (schema.isOrderedList(path)) {
            let prev = null;
            let nextCur = 0;
            let seen= new Set<string>();
            for (let i = 0; i < newObj.length; i++) {
                let child = newObj[i];
                if (nextCur < curOrder.length) {
                    let old = curOrder[nextCur];


                    let newPk = child[pkColumn];
                    let curPk = old[pkColumn];

                    if (curPk === newPk) {
                        seen.add(newPk);
                        while (nextCur < curOrder.length && seen.has(curOrder[nextCur][pkColumn])) {
                            nextCur++;
                        }


                        continue;
                    }
                    seen.add(newPk);
                    let childKey = schema.createKeyPath(path, child);
                    let prevKey = prev ? schema.createKeyPath(path, child) : null;
                    changes.changes.push(new Reorder(schema.absolute(childKey), prevKey ? schema.absolute(prevKey) : null, ChangePosition.AFTER, null));
                }
                prev = child;
            }
        }
        return changes;

    }

    schema.children(path).forEach(
        function(child) {
            let keys = schema.keys(path);
            if (keys.indexOf(child) !== -1) {
                return;
            }
            let myChildren = schema.children(path.appendName(child));
            let oldV = oldObj ? oldObj[child] : null;
            let newV = newObj ? newObj[child] : null;
            diff(oldV, newV, path.appendName(child), pkColumn, schema, subChanges);
        });
    return changes;

}

interface ChangeDbNode {
    get(schema:Schema, path:Path):any;
    updatePk(schema:Schema, path:Path, keys:any[]):void;
    /**
     * @param schema
     * @param item the item to create or get
     * @param path if not null then specifies what type to create otherwise creates container
     * @param create create if not present
     */
    getChildNode(schema: Schema, item: PathItem | null, path: Path, create: true): ChangeDbNode;
    getChildNode(schema: Schema, item: PathItem | null, path: Path, create: boolean): ChangeDbNode|null;
    getChildNode(schema: Schema, item: PathItem | null, path: Path, create: boolean): ChangeDbNode|null;
    set(schema:Schema, path:Path, val:any, opt_filter?:(v:any) => boolean):void;
    setKeys(item: PathItem): void;

}

export function createDbNode(schema:Schema, path:Path) :ChangeDbNode{
    if (schema.isKeyedList(path)) {
        return new ListNode();
    }
    if (schema.isLeaf(path)) {
        return new LeafNode();
    }
    return new ContainerNode();

}

export class LeafNode implements ChangeDbNode {
    private value_: Primitive;
    set(schema: Schema, path: Path, val: any, opt_filter?: (v:any) => boolean) {
        this.value_ = val;
    }

    updatePk(schema: Schema, path: Path, keys: any[]) {
        // leaves don't have primary keys
    }

    get(schema: Schema, path: Path): Primitive {
        return this.value_;
    }

    setValue(val: any) {
        this.value_ = val;
    }
    setKeys(item: PathItem): void {
    }

    /**
     * @param schema
     * @param item the item to create or get
     * @param path if not null then specifies what type to create otherwise creates container
     * @param {boolean} create create if not present

     */
    getChildNode(schema: Schema, item: PathItem | null, path: Path, create: true): ChangeDbNode;
    getChildNode(schema: Schema, item: PathItem | null, path: Path, create: boolean): ChangeDbNode|null;
    getChildNode(schema: Schema, item: PathItem | null, path: Path, create: boolean): ChangeDbNode|null {
        throw 'unsupported operation, leaves have no children';
    }
}


type ContainerChildrenType = { [key: string]: ChangeDbNode };

export class ContainerNode implements ChangeDbNode {
    private children_: ContainerChildrenType = {};
    private useVal_ = false;
    private val_: StructType | null = null;


    updatePk(schema: Schema, path: Path, keys: any[]) {
        // update the keys in the node
        let item = path.last();
        let names = item.keyNames();
        let children = this.children_;

        for (let i = 0; i < names.length; i++) {
            let child = names[i];
            let val = keys[i];
            if (!children[child]) {
                children[child] = new LeafNode();
                this.useVal_ = false;
            }
            let node = children[child];
            if (! (node instanceof LeafNode)) {
                throw Error('Key not leaf node')
            }
            node.setValue(val);
        }

    }

    setKeys(item: PathItem) {
        // update the keys in the node
        let keys = item.keys();
        let names = item.keyNames();
        let children = this.children_;

        for (let i = 0; i < names.length; i++) {
            let child = names[i];
            let val = keys[i];
            if (!children[child]) {
                children[child] = new LeafNode();
                this.useVal_ = false;
            }
            let node = children[child];
            if (! (node instanceof LeafNode)) {
                throw Error('Key not leaf node')
            }
            node.setValue(val);
        }
    }

    set(schema: Schema, path: Path, val: any, opt_filter?: (v: any) => boolean) {
        let children = this.children_;
        if (val) {
            this.useVal_ = false;
            for (let child of schema.children(path)) {
                if (val.hasOwnProperty(child)) {
                    let subPath = path.appendName(child);
                    if (!children[child]) {
                        children[child] = createDbNode(schema, subPath);
                    }
                    children[child].set(schema, subPath, val[child]);
                } else {
                    delete children[child];
                }
            }
        } else {
            this.useVal_ = true;
            this.children_ = {};
            this.val_ = val;
        }
    }

    remove(item: PathItem) {
        delete this.children_[item.name()];
    }

    get(schema: Schema, path: Path):StructType|null {
        let res:StructType = {};
        if (this.useVal_) {
            return this.val_;
        }
        let children = this.children_;
        for (let child of schema.children(path)) {
            if (children.hasOwnProperty(child)) {
                res[child] = children[child].get(schema, path.appendName(child));
            }
        }
        return res;
    }


    /**
     * @param schema
     * @param item the item to create or get
     * @param path if not null then specifies what type to create otherwise creates container
     * @param create create if not present
     */
    getChildNode(schema: Schema, item:PathItem, path: Path,create:true) :ChangeDbNode;
    getChildNode(schema: Schema, item:PathItem, path: Path,create:boolean) :ChangeDbNode|null;
    getChildNode(schema: Schema, item:PathItem, path: Path,create:boolean) :ChangeDbNode|null {
        let res = this.children_[item.name()];
        if (res) {
            return res;
        }
        if (!create) {
            return null;
        }
        if (path) {
            res = createDbNode(schema, path);
        } else {
            res = new ContainerNode();
        }
        this.children_[item.name()] = res;
        this.useVal_ = false;
        return res;
    }
}

type ListNodeKeyType = { key: any, pos: number, value: ChangeDbNode|null };
class ListNode implements ChangeDbNode {
    private keys_ = new AvlTree<ListNodeKeyType>(compareKey);
    private positions_ = new AvlTree<number>(compare);


    /**
     * @param schema
     * @param {!Path} path
     * @param {!Array<?>} keys
     */
    updatePk(schema: Schema, path: Path, keys: any[]) {
        let removed = this.keys_.remove({key: path.lastKeys(), pos: 0, value: null});
        if (removed) {
            let last = path.last();
            let newNode = {...removed};
            newNode.key = keys;
            if (newNode.value) {
                newNode.value.setKeys(last.setKeys(keys));
            }
            this.keys_.add(newNode);
        }

    }

    set(schema: Schema, path: Path, val: any, opt_filter?: (v: any) => boolean) {
        let keys = this.keys_;
        // we could schemas that filter nodes but not yet
        let newKeys = new AvlTree<ListNodeKeyType>(compareKey);
        let newPositions = new AvlTree<number>(compare);
        let partial = schema.isPartial(path);
        if (val) {
            let pos = 0;
            let maxPos = 0;
            if (partial || opt_filter) {
                this.keys_.inOrderTraverse(function (val) {
                    maxPos = Math.max(val.pos + 1, maxPos);
                });
            }
            for (let item of val) {
                let ourPos = pos;
                // if this partial then our pos needs to be calculated
                let subKey = schema.createKeyPath(path, item);
                if (partial || opt_filter) {
                    let oldNode = keys.findFirst({
                        key: subKey.lastKeys(),
                        pos: ourPos,
                        value: new ContainerNode()
                    });
                    if (oldNode) {
                        ourPos = oldNode.pos;
                    } else {
                        ourPos = maxPos;
                        maxPos++;
                    }
                }


                newPositions.add(ourPos);
                let newNode = keys.safeFind({
                    key: subKey.lastKeys(),
                    pos: ourPos,
                    value: new ContainerNode()
                });
                pos++;
                newNode.value?.set(schema, subKey, item);
                newKeys.add(newNode);
            }
        }
        if (opt_filter) {
            this.keys_.inOrderTraverse(function (item) {
                let subKey = schema.createKeyPath(path, item.value);
                // leave anything that doesn't match the query here we are not replacing these

                if (!opt_filter(item.value?.get(schema, subKey))) {
                    if (!newKeys.findFirst(item)) {
                        newKeys.add(item);
                    }
                }
            });
        } else if (partial) {
            this.keys_.inOrderTraverse(function (item) {
                if (!newKeys.findFirst(item)) {
                    newKeys.add(item);
                }
            });
        }

        this.keys_ = newKeys;
        this.positions_ = newPositions;
    }

    move(from: PathItem, to: PathItem): ChangeDbNode {

        let node = this.keys_.remove({key: from.keys(), pos: 0, value: null});
        if (node && node.value) {
            node.value.setKeys(to);
            this.keys_.add({key: to.keys(), pos: node.pos, value: node.value});
            return node.value;
        } else {
            throw new Error("move node '" + from.toString() + "' does not exist");
        }
    }

    reorder(schema: Schema, from: PathItem, to: PathItem|null, position: ChangePosition) {
        let changeEntry = this.keys_.findFirst({key: from.keys(), pos: 0, value: null});
        let pos = 0;
        // new order of the list
        let order = [];
        let after = ChangePosition.AFTER;
        let before = ChangePosition.BEFORE;
        if (!changeEntry) {
            // the entry we are trying to reorder doesn't exist do nothing
            return;
        }

        let entries = [...this.keys_];
        entries.sort( (e1, e2) => e1.pos - e2.pos);
        let found = false;
        if (position === after && !to) {
            // gos in the first position
            order.push({key: changeEntry.key, pos: pos++, value: changeEntry.value});
            found = true;
        }

        entries.forEach(function (entry) {
            if (isEqual(from.keys(), entry.key)) {
                // ignore this one it will be added later
                return;
            }

            if (to && isEqual(to.keys(), entry.key)) {
                found = true;
                if (changeEntry) {
                    if (position === after) {
                        order.push({key: entry.key, pos: pos++, value: entry.value});
                        order.push({key: changeEntry.key, pos: pos++, value: changeEntry.value});
                    } else if (position === before) {
                        order.push({key: changeEntry.key, pos: pos++, value: changeEntry.value});
                        order.push({key: entry.key, pos: pos++, value: entry.value});
                    }
                }
            } else {
                order.push({key: entry.key, pos: pos++, value: entry.value});
            }
        });
        if (position === before && !to) {
            found = true;
            order.push({key: changeEntry.key, pos: pos++, value: changeEntry.value});
        }
        if (found) {
            let me = this;
            this.positions_ = new AvlTree(compare);
            this.keys_ = new AvlTree<ListNodeKeyType>(compareKey);
            order.forEach(function (e) {
                me.keys_.add(e);
                me.positions_.add(e.pos);
            });
        }

    }

    remove(item: PathItem): ChangeDbNode | null {
        let node = this.keys_.remove({key: item.keys(), pos: 0, value: null});
        if (node) {
            this.positions_.remove(node.pos);
            return node.value;
        }
        return null;
    }

    add(item: PathItem, node: ChangeDbNode) {
        node.setKeys(item);
        let pos = this.positions_.getCount() === 0 ? 0 : this.positions_.getMaximum() + 1;
        this.positions_.add(pos);
        this.keys_.add({key: item.keys(), pos: pos, value: node});
    }

    get(schema: Schema, path: Path): any[] {
        let res: any[]= [];
        let map = this.keys_ ;
        if (schema.isOrderedList(path)) {
            map = new AvlTree<{ key: any, pos: number, value: ChangeDbNode|null }>(compareKey);
            for(let val of this.keys_) {
                map.add({value: val.value, key: val.pos, pos:0});
            }
        }
        for (let val of map) {
            let subKey = schema.createKeyPath(path, val.value);
            if (val.value) {
                res.push(val.value.get(schema, subKey));
            }
        }
        return res;
    }
    setKeys(item: PathItem): void {}

    /**
     * @param schema
     * @param item the item to create or get
     * @param path if not null then specifies what type to create otherwize creates container
     * @param create create if not present
     */
    getChildNode(schema: Schema, item: PathItem | null, path: Path, create: true): ChangeDbNode;
    getChildNode(schema: Schema, item: PathItem | null, path: Path, create: boolean): ChangeDbNode|null;
    getChildNode(schema: Schema, item:PathItem, path:Path, create:boolean): ChangeDbNode|null {
        let lookup = {key: item.keys(), pos: 0, value: new ContainerNode()};
        let entry = create ?
            this.keys_.safeFind(lookup) : this.keys_.findFirst(lookup);
        if (entry) {
            return entry.value;
        }
        return null;

    }
}

