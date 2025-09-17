import {compareAll, isEqual} from "../util/object";
import {StructType} from "../frp/struct";
import {ChangePosition} from "./change";
import {ChangeDbInterface} from "./changedb";




/**
 * allows override to serialize/deserialize values, eg buffers
 */
export interface ValueSerializor {
    serialize(path:Path, val:any):any;
    deserialize(path:Path, serialized:any):any;
}

/**
 * allows override serialization of path
 */
export interface PathSerializer {
    serialize(path:Path, valSerializor:ValueSerializor, compressor:PathCompressor<any>): StructType;
}

/**
 * allows paths to be compressed/decompressed
 */
export interface PathCompressor<T> {
    /**
     * converts a path to an object that can be turned into json
     */
    compress(path:string[]): T;
    /**
     * converts a path to an object that can be turned into json
     */
    decompress (path:T): string[]
}


export class DefaultPathCompressor implements PathCompressor<string> {
    compress(path: string[]): string {
        return path.join('/');
    }
    decompress(path: string): string[] {
        return path.split('/');
    }


}
export interface Schema {
    /**
     * @return the children
     */
    children(path: Path): string[];

    isOrderedList(path: Path): boolean;

    /**
     * @return true if the user has to create
     */
    isCreatable(path: Path): boolean;

    /**
     * set up container after item is added
     */
    applyDefaults(path: Path, db:ChangeDbInterface): void;

    /**
     * this is used to filter out items that may exist in the aboslute path
     * but not in the named path
     *
     * @return true if the path exist for this path
     */
    exists(path: Path): boolean;

    /**
     * this is a partial list and may set only the keys in this path
     * this does not mean the other items get deleted
     * @return true if the path exist for this path
     */
    isPartial(path: Path): boolean;

    /**
     * returns a list of keys at the path level not parent keys
     * @param {recoil.db.ChangeSet.Path} path
     * @return {!Array<string>} keys
     */
    keys(path: Path): string[];

    isLeaf(path: Path): boolean;

    /**
     * @return true if the path is a list of object and the keys are not specified, else false
     */
    isKeyedList(path: Path): boolean;

    /**
     * converts a path into an absolute path this solve
     * so you can have different paths for the same thing
     *
     */
    absolute(path: Path): Path;

    createKeyPath(path:Path, obj:any): Path;
}

export class PathItem {
    private readonly name_: string;
    private readonly keys_: any[];
    private readonly keyNames_: string[];

    constructor(name: string, keyNames: string[], keys: any[]) {
        this.name_ = name;
        this.keys_ = keys;
        this.keyNames_ = keyNames;
    };
    name():string {
        return this.name_;
    };

    compare(other: PathItem): number {
        let res = this.name_.localeCompare(other.name_);

        if (res !== 0) {
            return res;
        }

        if (this.keys_.length != other.keys_.length) {
            return this.keys_.length - other.keys_.length;
        }
        return compareAll([{x: this.keys_, y: other.keys_}, {x: this.keyNames_, y: other.keyNames_}]) as number;
    };

    keyMatch(obj: StructType): boolean {
        if (!obj) {
            return false;
        }
        for (let i = 0; i < this.keyNames_.length; i++) {
            if (!isEqual(obj[this.keyNames_[i]], this.keys_[i])) {
                return false;
            }
        }
        return true;
    };

    keys(): any[] {
        return this.keys_;
    };

    unsetKeys(): PathItem {
        return new PathItem(this.name_, [], []);
    };

    setKeys(keys: any[]): PathItem {
        return new PathItem(this.name_, this.keyNames_, keys);
    }

    /**
     * @return {!Array<?>}
     */
    keyNames(): string[] {
        return this.keyNames_;
    }

}

/**
 * @constructor
 * @param {Array<!PathItem>} items
 */
export class Path implements Iterable<PathItem>{
    private readonly items_: PathItem[];

    constructor(items: PathItem[]) {
        this.items_ = [...items];
    }

    [Symbol.iterator](): Iterator<PathItem, any, any> {
        return this.items()[Symbol.iterator]();
    }

    /**
     * creates from a string no parameters are provided
     */
    static fromString(path: string): Path {
        let parts: PathItem[] = [];
        path.split('/').forEach(function (part) {
            if (part !== '') {
                parts.push(new PathItem(part, [], []));
            }
        });
        return new Path(parts);
    }
    /**
     * @param {!PathItem} part
     * @return {!recoil.db.ChangeSet.Path}
     */
    append(part: PathItem): Path {
        return new Path(
            this.items_.concat(part));
    }


    /**
     * @return {!Array<string>}
     */
    toStringArray(): string[] {
        return this.items_.map(function (v) {
            return v.name();
        });
    }

    /**
     * if from is an ansestor of this path changes the from part to the
     * to part
     * @param {!recoil.db.ChangeSet.Path} from
     * @param {!recoil.db.ChangeSet.Path} to
     * @return {!recoil.db.ChangeSet.Path}
     */
    move(from: Path, to: Path): Path {
        if (!from.isAncestor(this, true)) {
            return this;
        }
        let items = from.items_;
        let parts = [];
        let lastTo = null;
        for (let item of to.items_) {
            parts.push(item);
            lastTo = item;
        }
        if (items.length > 0 && lastTo) {
            let lastFrom = items[items.length - 1];
            let lastMe = this.items_[items.length - 1];
            if (lastMe.keys().length > 0 && lastFrom.keys().length === 0) {
                parts[parts.length - 1] = new PathItem(lastTo.name(), lastMe.keyNames(), lastMe.keys());
            }
        }
        for (let i = from.items_.length; i < this.items_.length; i++) {
            parts.push(this.items_[i]);
        }
        return new Path(parts);
    }

    /**
     * @param {!recoil.db.ChangeSet.Path} path
     * @return {!recoil.db.ChangeSet.Path}
     */
    appendPath(path: Path): Path {
        return new Path(this.items_.concat(path.items_));
    }

    /**
     * @param {!Array<!PathItem>} items
     * @return {!recoil.db.ChangeSet.Path}
     */
    appendItems(items: PathItem[]): Path {
        return new Path(this.items_.concat(items));
    }

    getSuffix(prefix: Path): { keys: any[], keyNames: string[], suffix: PathItem[] } | { keys: null, keyNames: null, suffix: PathItem[] } {


        // we need to get just the common part between the absolute path and the
        // path

        if (this.items_.length < prefix.items_.length) {
            throw 'prefix is not a prefix';
        }

        for (let i = 0; i < prefix.items_.length; i++) {
            let last = i === prefix.items_.length - 1;
            if (last) {
                if (this.items_[i].name() !== prefix.items_[i].name()) {
                    throw 'prefix is not a prefix';
                }
            } else if (!isEqual(this.items_[i], prefix.items_[i])) {
                throw 'prefix is not a prefix';
            }

        }
        if (prefix.items_.length > 0) {
            let idx = prefix.items_.length - 1;
            let item = this.items_[idx];
            if (!isEqual(this.items_[idx], prefix.items_[idx])) {
                return {keys: item.keys(), keyNames: item.keyNames(), suffix: this.items_.slice(prefix.items_.length)};
            }
        }

        return {keys: null, keyNames: null, suffix: this.items_.slice(prefix.items_.length)};

    }
    appendSuffix(suffix:  { keys: null, keyNames: null, suffix: PathItem[] } | { keys: any[], keyNames: string[]|null, suffix: PathItem[] }): Path {
        let res = suffix.keys && suffix.keyNames ? this.setKeys(suffix.keyNames, suffix.keys) : this;
        return res.appendItems(suffix.suffix);
    }

    /**
     * since paths are immutable it is more effecient to just return itself
     * @return {!recoil.db.ChangeSet.Path}
     */
    clone():this {
        return this;
    }


    /**
     * check to see if this is an ancesetor of path
     */
    isAncestor(path: Path, allowSelf: boolean):boolean {
        if (this.items_.length > path.items_.length) {
            return false;
        }

        for (let i = 0; i < this.items_.length; i++) {
            let myItem = this.items_[i];
            let otherItem = path.items_[i];

            if (i + 1 === this.items_.length && myItem.keys().length === 0 && otherItem.keys().length > 0) {
                return myItem.name() === otherItem.name();
            } else if (!isEqual(myItem, otherItem)) {
                return false;
            }
        }
        if (!allowSelf && this.items_.length === path.items_.length) {
            return false;
        }
        return true;
    };

    /**
     * @param {string} name
     * @return {!recoil.db.ChangeSet.Path}
     */
    appendName(name: string): Path {
        return this.append(new PathItem(name, [], []));
    }

    appendNames(names: string[]): Path {
        let res: Path = this;
        for (let i = 0; i < names.length; i++) {
            res = res.appendName(names[i]);
        }
        return res;
    }


    /**
     * @param {!Array<!PathItem>} parts
     * @return {!recoil.db.ChangeSet.Path}
     */
    prepend(parts: PathItem[]): Path {
        return new Path(parts.concat(this.items_));
    }

    length():number {
        return this.items_.length;
    };

    /**
     * @param {number} parts
     * @return {!recoil.db.ChangeSet.Path}
     */
    removeFront(parts: number): Path {
        return new Path(this.items_.slice(parts));
    }

    parent():Path {
        let parts = [];
        for (let i = 0; i < this.items_.length - 1; i++) {
            parts.push(this.items_[i]);
        }
        return new Path(parts);
    }

    /**
     * converts a path to an object that can be turned into json
     */
    serialize(valSerializor:ValueSerializor, compressor:PathCompressor<any>, opt_pathSerializer?:PathSerializer):StructType {

        if (opt_pathSerializer) {
            return opt_pathSerializer.serialize(this, valSerializor, compressor);
        } else {
            let names = [];
            let params = [];
            let curPath = new Path([]);
            for (let i = 0; i < this.items_.length; i++) {
                names.push(this.items_[i].name());
                curPath = curPath.append(this.items_[i]);
                let keys = this.items_[i].keys();
                let keyNames = this.items_[i].keyNames();

                for (let j = 0; j < keys.length; j++) {
                    let keyPath = curPath.appendName(keyNames[j]);
                    params.push(valSerializor.serialize(keyPath, keys[j]));
                }
            }
            return {parts: compressor.compress(names), params: params};
        }
    }


    /**
     * converts a path to an object that can be turned into json
     */
    static deserialize(obj: StructType, schema: Schema, valSerializor: ValueSerializor, compressor: PathCompressor<any>):Path {
        let parts = compressor.decompress(obj.parts);
        let curPath = new Path([]);
        let curKey = 0;
        for (let i = 0; i < parts.length; i++) {
            curPath = curPath.append(new PathItem(parts[i], [], []));
            let keyNames = schema.keys(curPath);
            if (keyNames.length <= obj.params.length - curKey) {
                let keys = [];
                for (let j = 0; j < keyNames.length; j++) {
                    keys.push(valSerializor.deserialize(curPath.appendName(keyNames[j]), obj.params[curKey++]));
                }
                curPath = curPath.setKeys(keyNames, keys);
            }
        }

        return curPath;
    };

    toString(): string {
        let txt: string[] = [];
        this.items().forEach(function (part) {
            let p = part.name();

            if (part.keys().length > 0) {
                let keyStrs: string[] = [];
                part.keys().forEach(function (key) {
                    keyStrs.push(JSON.stringify(key));
                });
                p += '{' + keyStrs.join(',') + '}';
            }
            txt.push(p);
        });
        return '/' + txt.join('/');
    };

    /**
     * get the path as a string but do not include the parameters
     */
    pathAsString():string {
        return '/' + this.parts().join('/');
    }


    /**
     * sets the keys on the last child
     */
    setKeys(keyNames: string[]|null, keyValues: any[]):Path {
        let newItems = [...this.items_];
        let last = newItems.pop();
        if (last == undefined) {
            throw new Error("unable to set keys in root element");
        }
        if (keyNames === null) {
            newItems.push(new PathItem(last.name(), last.keyNames(), keyValues));
        } else {
            newItems.push(new PathItem(last.name(), keyNames, keyValues));
        }
        return new Path(newItems);

    }

    /**
     * sets the keys on the last child

     */
    setKeysAt(level: number | undefined, keyNames: string[]|null, keyValues: any[]):Path {
        if (level == undefined) {
            return this.setKeys(keyNames, keyValues);
        }
        let newItems = [...this.items_];
        let end = newItems.splice(level);

        let item = end.shift();
        if (item == undefined) {
            throw new Error(`unable to set keys at ${level} item does not exist`);
        }

        if (keyNames === null) {
            newItems.push(new PathItem(item.name(), item.keyNames(), keyValues));
        } else {
            newItems.push(new PathItem(item.name(), keyNames, keyValues));
        }

        return new Path(newItems.concat(end));

    }

    /**
     * unsets the keys on the las child, although right now does exactly
     * the same setKeys([],[]) later on I may have to support lists with no keys
     */
    unsetKeys():Path {
        let newItems = this.items_.slice(0);
        let last = newItems.pop();
        if (last) {
            newItems.push(last.unsetKeys());
            return new Path(newItems);
        }
        return this;

    }

    /**
     * just the keys of the lastItem
     * @return {!Array<?>}
     */
    lastKeys():any[] {
        if (this.items_.length > 0) {
            return this.items_[this.items_.length - 1].keys();
        }
        return [];
    };

    /**
     * just the keys of the lastItem
     */
    last():PathItem {
        if (this.items_.length > 0) {
            return this.items_[this.items_.length - 1];
        }
        throw 'path contains no items';
    };

    /**
     * return all the keys for a path not just the last level
     * @return {!Array<?>}
     */
    keys():any[] {
        let params:any[] = [];
        for (let item of this.items_){
            for (let key of item.keys()){
                params.push(key);
            }
        }
        return params;
    }


    /**
     * @return {!Array<string>}
     */
    parts():string[] {
        let parts:string[] = [];
        this.items_.forEach(function (item) {
            parts.push(item.name());
        });
        return parts;
    };

    items(): PathItem[] {
        return [...this.items_];
    };

    size(): number {
        return this.items_.length;
    };

    /**
     * @param {number} pos
     */
    item(pos: number):PathItem {
        return this.items_[pos];
    };

}
