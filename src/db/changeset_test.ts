import {assertEquals, assertFalse, assertObjectEquals, assertThrows, assertTrue} from "../test";
import {StructType} from "../frp/struct";
import { isEqual } from "../util/object";
import {PathMap} from "./pathmap";
import test from "node:test";
import {DefaultPathCompressor, Path, PathItem, Schema} from "./path";
import { ChangeDbInterface } from "./changedb";
import {ChangeDb, ChangeSet, diff, DupPk} from "./changeset";
import {Add, ChangePosition, ChangeType, Delete, deserializeChange, Move, Reorder, SetChange} from "./change";

class MySchema implements Schema {
    root: StructType = {
        obj1 : {
           
            children : {
                a : {},
                b : {
                    children: {
                        c: {}
                    }
                }
            }
        },
        a: {
            children: {
                b: {
                    children : {
                        c: {
                            keys : ['k']
                        },
                        d:{}
                    }
                },
                b1 : {}
            }
        },
        adel: {
            children: {
                b: {
                    children : {
                        c: {
                            keys : ['k'],
                            children: {
                                k : {},
                                d: {
                                    children : {
                                        e: {}
                                    }
                                }
                            }
                        }
                    }
                },
                b1 : {}
            }
        },

        a1 : {
            alias : '/test/a',
            children: {
                b1 : {}
            }
        },
            
        
        e: {
            children: {
                f: {
                    children : {
                        g: {
                            keys : ['k']
                        }
                    }
                }
            }
        },

        key1: {
            children : {
                k: {},
                v: {}
            },
            keys : ['k']
        },
        test: {
            children : {
            }
        },
        full: {
            children : {
                k1 : {
                    keys:['k'],
                    children: {
                        a :{},
                        k :{}
                    }
                },

                a: {
                    children: {
                        v: {},
                        v2: {},
                        list: {
                            children: {
                                k: {},
                                v: {},
                                v2: {}
                            },
                            keys: ['k']
                        }
                    }
                }
            }
        },
        'ordered': {
            children: {
                k :{},
                v :{},
            }
        },
        'list-a': {
            children: {
                k :{},
                v :{},
                c : {
                    children: {
                        t : {}
                    }
                }
                
            },
            keys: ['k']
        },
        'cont' : {
            children: {
                c1: {
                    children: {
                        c2:{}
                    }
                }
            }
        },
        'named-a': {
            alias : '/full/a',
            children: {
                v: {},
                list: {
                    children: {
                        k: {},
                        v: {}
                    },
                    keys: ['k']
                }
            }
        }
            
    };
    

                
    meta1(path:Path, opt_keys?:any[]) {
        let keys = opt_keys || [];
        let parts = path.parts();
        let cur = this.root[parts[0]];
        if (cur && cur.keys) {
            cur.keys.forEach(function (k: any) {
                keys.push(k);
            });
        }
        
        for (let i = 1; i < parts.length && cur; i++) {
            let part = parts[i];
            cur = cur.children && cur.children[part];

            if (cur && cur.keys) {
                for (let k of cur.keys) {
                    keys.push(k);
                }
            }

        }
        return cur;
    }
    meta(path:Path, opt_keys:any[]) {
        let parts = path.parts();
        let cur = this.root;
        for (let i = 0; i < parts.length && cur; i++) {
            let part = parts[i];
            cur = cur[part].children;
           
        }
        return cur;
    };
    applyDefaults(path:Path, db:ChangeDbInterface) {}
    children(path:Path) {
        let parts = path.parts();
        let cur = this.root;
        for (let i = 0; i < parts.length && cur; i++) {
            cur = cur[parts[i]].children;
        }
        if (cur === undefined) {
            return [];
        }
        return Object.keys(cur);
    }
    exists(path:Path):boolean {
        return this.meta1(path) ? true : false;
    }
    keys(path:Path) {
        let meta = this.meta1(path);
        let k = meta ? meta.keys  : [];
        return k === undefined ? [] : k;
    }
    createKeyPath (path:Path, obj:StructType):Path {
        let keys = this.keys(path);
        if (!obj) {
            return path;
        }
        let keyValues:any[] = [];
        
        for (let k of keys){
            keyValues.push(obj[k]);
        }
        return path.setKeys(keys, keyValues);
    }
    isPartial(path:Path) {
        return false;
    }
    absolute (path:Path):Path {
        if (path.parts()[0] === 'full' || path.parts()[0] === 'test') {
            return path;
        }
        if (path.parts()[0] === 'named-a') {
            return Path.fromString('full/a');
        }

        let item = this.root[path.parts()[0]];
        if (item && item.alias) {
            let prefix = Path.fromString(item.alias);
            let parts = prefix.items();
            let pathParts = path.items();
            for (let i = 1; i < pathParts.length; i++) {
                parts.push(pathParts[i]);
            }
            
            return new Path(parts);
        }
        return path.prepend([new PathItem('test',[],[])]);
    }
        
    isCreatable(path:Path):boolean {
        return true;
    }
    isKeyedList(path:Path):boolean {
        let keys:any[] = [];
        let meta = this.meta1(path, keys);
        if (meta && meta.keys && meta.keys.length > 0) {
            return keys.length > path.keys().length;
        }
        return false;
    }
        
    isLeaf (path:Path) {
        return this.children(path).length === 0;
    }
    isOrderedList(path:Path){
        let parts = path.parts();
        for (let i = 0; i < parts.length; i++) {
            if (parts[i] === 'ordered') {
                return true;
            }
        }
        return false;
    }
    
}
let schema = new MySchema();

schema.root.test.children.obj1 = schema.root.obj1;
schema.root.test.children.cont = schema.root.cont;
schema.root.test.children['list-a'] = schema.root['list-a'];
schema.root.test.children.a = schema.root.a;

function assertSameObjects (expected:any, actual:any) {
 
    assertTrue(
        'Bad arguments to assertSameElements(opt_message, expected: ' +
            'ArrayLike, actual: ArrayLike)',
        Array.isArray(expected) && Array.isArray(actual));
    
    assertEquals(expected.length, actual.length);

    for (let i = 0; i < actual.length; i++) {
        let toFind = actual[i];
        let j;
        for (j = 0; j < expected.length; j++) {
            if (isEqual(toFind, expected[j])) {
                break;
            }
        }
        assertFalse("Element " + i + '[' + toFind + '] not found in expected', j === expected.length);
    }

    for (let i = 0; i < expected.length; i++) {
        let toFind = expected[i];
        let j;
        for (j = 0; j < actual.length; j++) {
            if (isEqual(toFind, actual[j])) {
                break;
            }
        }
        assertFalse("Element " + i + '[' + toFind + '] not found in actual', j === expected.length);
    }

    
}

test("SetList", () => {
    let path1 = Path.fromString('/full/k1');
    let  path = path1.setKeys(['k'],[1]);

    let testee = new ChangeDb(schema);
    testee.set(path, {k:1, a:{foo: 5, list :[1]}});
    assertObjectEquals([{k:1, a:{foo: 5, list :[1]}}], testee.get(path1));
    
});
    
test("DbNonExistantDesendant", () => {
    let path = Path.fromString('/obj1');
    let pathc = Path.fromString('/obj1/b/c');

    let testee = new ChangeDb(schema);


    assertObjectEquals([path],testee.setRoot(path, {}));
    assertObjectEquals([pathc],testee.setRoot(pathc, null));

    assertObjectEquals({}, testee.get(path));
    assertObjectEquals([path, pathc],testee.setRoot(pathc, 1));
    assertObjectEquals({b:{c:1}}, testee.get(path));

});
    
test("DiffChange", () => {
    let path = Path.fromString('/obj1');
    let outPath = Path.fromString('/test/obj1');
    // basic set
    let changes = diff({a:1}, {a:2},
                              path,'orig',
                              schema);
    assertObjectEquals({changes: [new SetChange(outPath.appendName('a'), 1, 2)], errors: []},changes);

    // set inside sub object
    changes = diff({a:1, b: {c:1}}, {a:2, b: {c:2}},
                          path,'orig',
                          schema);
    
    assertSameObjects([
        new SetChange(outPath.appendName('b').appendName('c'), 1, 2),
        new SetChange(outPath.appendName('a'), 1, 2),
    ],changes.changes);

    assertObjectEquals([], changes.errors);

    changes = diff({a:null}, {},
                          path,'orig',
                          schema);
    
    assertSameObjects([],changes.changes);

    changes = diff({a:undefined}, {a:null},
                          path,'orig',
                          schema);
    
    assertSameObjects([],changes.changes);

    assertObjectEquals([], changes.errors);


});

test("DiffInsert", () => {
    let path = Path.fromString('/obj1');
    let outPath = Path.fromString('/test/obj1');
    let changes = diff({a:1}, {a:1, b: {c: 3}},
                              path,'orig',
                              schema);
    assertObjectEquals({changes: [new Add(outPath.appendName('b'), [new SetChange(outPath.appendNames(['b','c']), null, 3)])], errors :[]},changes);


});

test("DiffDelete", () => {
    let path = Path.fromString('/obj1');
    let outPath = Path.fromString('/test/obj1');
    let changes = diff({a:1, b: {c: 3}}, {a:1},
                              path,'orig',
                              schema);
    assertObjectEquals({changes: [new Delete(outPath.appendName('b'),{c:3})], errors:[]},changes);
});


test("DiffKeyMove", ()=> {
    let path = Path.fromString('/key1');
    let outPath = Path.fromString('/test/key1');

    let changes = diff([{orig:11, k:1, v:1}, {orig:12, k:2, v:2}, {orig:13, k:3, v:3}],
                              [{orig:11, k:2, v:1}, {orig:12, k:3, v:2}, {orig:13, k:4, v:3}],
                              path,'orig',
                              schema);
    assertObjectEquals({changes: [
        new Move(outPath.setKeys(['k'],[3]),outPath.setKeys(['k'],[4])),
        new Move(outPath.setKeys(['k'],[2]),outPath.setKeys(['k'],[3])),
        new Move(outPath.setKeys(['k'],[1]),outPath.setKeys(['k'],[2]))
    ], errors: []},changes);

    changes = diff([{orig:11, k:1, v:1},  {orig:12, k:2, v:2}, {orig:13, k:3, v:3}],
                          [{orig:11, k:2, v:10}, {orig:12, k:3, v:2}, {orig:13 ,k:4, v:3}],
                          path,'orig',
                          schema);
    assertObjectEquals({changes: [
        new Move(outPath.setKeys(['k'],[3]),outPath.setKeys(['k'],[4])),
        new Move(outPath.setKeys(['k'],[2]),outPath.setKeys(['k'],[3])),
        new SetChange(outPath.setKeys(['k'],[1]).appendName('v'), 1, 10),
        new Move(outPath.setKeys(['k'],[1]),outPath.setKeys(['k'],[2]))
    ], errors:[]},changes);
                              // check loop
});

test("DiffKeyChangeNonKey", () => {
     let path = Path.fromString('/key1');
    let outPath = Path.fromString('/test/key1');

    let changes = diff([{orig:'1', k:1, v: 1}, {orig: '2',k:2, v: 2}], [{orig:'1', k:1, v:1}, {orig:'2', k:2, v:3}],
                              path,'orig',
                              schema);
    assertObjectEquals({changes: [
        new SetChange(outPath.setKeys(['k'],[2]).appendName('v'),2,3)
    ], errors: []},changes);
});

test("DiffKeyMoveLoop", () => {
    let path = Path.fromString('/key1');
    let outPath = Path.fromString('/test/key1');

    let changes = diff(
        [{orig:11,k:1, v:1}, {orig:12, k:2, v:2}, {orig:13,k:3, v:3}],
        [{orig:11,k:2, v:1}, {orig:12, k:3, v:2}, {orig:13,k:1, v:3}],
                              path,'orig',
                              schema);

    assertSameObjects([
        new DupPk(outPath.setKeys(['k'],[1])),
        new DupPk(outPath.setKeys(['k'],[2])),
        new DupPk(outPath.setKeys(['k'],[3]))], changes.errors);
        
    assertObjectEquals([],changes.changes);
});


test("DiffKeyInsert", () => {
    let path = Path.fromString('/key1');
    let outPath = Path.fromString('/test/key1');

    let changes = diff([],[{orig: '1', k:1, v:1}],
                              path,'orig',
                              schema);

    assertObjectEquals({changes: [
        new Add(outPath.setKeys(['k'],[1]), [
            new SetChange(outPath.setKeys(['k'],[1]).appendName('v'), null, 1)])], errors: []}
                       , changes);
});

test("DiffSubKeyInsert", () => {
    let path = Path.fromString('/key1');
    let outPath = Path.fromString('/test/key1');

    let changes = diff(null,[{orig: '1', k:1, v:1}],
                              path,'orig',
                              schema);

    assertObjectEquals({changes: [
        new Add(outPath.setKeys(['k'],[1]), [
            new SetChange(outPath.setKeys(['k'],[1]).appendName('v'), null, 1)])], errors: []}
                       , changes);

    changes = diff([{orig: '1', k:1, v:1}],null,
                              path,'orig',
                          schema);
    assertObjectEquals({changes: [
        new Delete(outPath.setKeys(['k'],[1]), {orig: '1', v:1})], errors: []}, changes);

});

test("DiffKeyRemove", () => {
    let path = Path.fromString('/key1');
    let outPath = Path.fromString('/test/key1');
    
    let changes = diff([{orig:11, k:1, v:1}],[],
                              path,'orig',
                              schema);

    assertObjectEquals({changes: [
        new Delete(outPath.setKeys(['k'],[1]),{orig:11, v:1})], errors: []}
                       , changes);
});

test("Serialize", () => {
    let path = Path.fromString('/a/b/c').setKeys(['k'], [2]);
    let delPath = Path.fromString('/adel/b/c');
    let path2 = Path.fromString('/e/f/g').setKeys(['k'], [3]);
    let compressor = new DefaultPathCompressor ();
    let vser = {
        serialize: function (path:Path,  v:any) {
            return path.pathAsString() + v;
        },
        deserialize: function (path:Path, v:any) {
            let p = path.pathAsString();
            let s =  v.substr(p.length);
            if (s.match(/^[0-9]+$/)) {
                return parseInt(s);
            }
            return s;
        }
    };
    assertObjectEquals({parts:'a/b/c', params:['/a/b/c/k2']},path.serialize(vser, compressor));
    assertObjectEquals(path, Path.deserialize(path.serialize(vser, compressor), schema, vser,compressor));

    let set = new SetChange(path, 1, 2);
    let move = new Move(path, path2);
    let add = new Add(path,[set]);
    let del = new Delete(delPath, [{k:1, d: {e: 'x0', e1: '1'}}]);
    assertObjectEquals(move, deserializeChange(move.serialize(true, schema, vser), schema, vser));
    assertObjectEquals(set, deserializeChange(set.serialize(true, schema, vser), schema, vser));
    assertObjectEquals(add, deserializeChange(add.serialize(true, schema, vser), schema, vser));
    assertObjectEquals(del, deserializeChange(del.serialize(true, schema, vser), schema, vser));
    let res:StructType = set.serialize(true, schema, vser);
    assertObjectEquals({type: ChangeType.SET, old: '/a/b/c1', new: '/a/b/c2',
        path:{parts:'a/b/c', params:['/a/b/c/k2']}}, res);

    res = del.serialize(true, schema, vser);
    assertObjectEquals({type: ChangeType.DEL, ///path: '/adel/b/c',
        orig: [{k:'/adel/b/c/k1', d: { e: '/adel/b/c/d/ex0', e1: '1'}}],
        path:{parts:'adel/b/c', params:[]}}, res);
    del = new Delete(delPath.setKeys(['k'],[1]), {k:1, d: {e: 'x0', e1: '1'}});


    // check it serializes keys and values
});

/**
 * types of change set
 * orig changeset when we set unapply any changes
 * sending apply changes on send
 * sent apply changes on getting back conformation
 */
test("ChangeDbSet", () => {
    let testee = new ChangeDb(schema);
    let fullPath = Path.fromString('full/a');
    let contPath = Path.fromString('cont');
    let namedPath = Path.fromString('named-a');
    let listA = Path.fromString('list-a');
    
    assertObjectEquals([fullPath],testee.setRoot(fullPath, {v : 1, v2: 2, list : [{k:1, v:1, v2:2},{k:2, v:2, v2: 2}]}));
    assertSameObjects([fullPath, namedPath],testee.setRoot(namedPath, {v : 10, list : [{k:1, v:10},{k:2, v:20}]}));
    testee.setRoot(contPath, {});


    assertObjectEquals([fullPath,namedPath],testee.getRoots(fullPath.appendName('v')));
    assertObjectEquals({v : 10, v2: 2, list : [{k:1, v:10, v2:2},{k:2, v: 20, v2: 2}]}, testee.get(fullPath));
    assertObjectEquals({v : 10, list : [{k:1, v:10},{k:2, v: 20}]}, testee.get(namedPath));
    assertObjectEquals({}, testee.get(contPath));

    testee.setRoot(fullPath, {v : 1, v2: 2, list : [{k:1, v:1, v2:2},{k:2, v:2, v2: 2}]});
    assertObjectEquals({v : 1, v2: 2, list : [{k:1, v:1, v2:2},{k:2, v: 2, v2: 2}]}, testee.get(fullPath));
    assertObjectEquals({v : 1, list : [{k:1, v:1},{k:2, v: 2}]}, testee.get(namedPath));


    // resolve full path that does not exist
    testee.setRoot(listA, [{k:1, v:1}, {k:2, v:2}]);
    assertObjectEquals([{k:1, v:1}, {k:2, v:2}], testee.get(listA));
    testee.setRoot(listA, [{k:1, v:10}, {k:2, v:20}]);
    assertObjectEquals([{k:1, v:10}, {k:2, v:20}], testee.get(listA));
    
    // now apply some changes
    let set = new SetChange(listA.setKeys(['k'], [2]).appendName('v'), 20, 200);
    let move = new Move(listA.setKeys(['k'], [1]), listA.setKeys(['k'], [11]));
    let setList = new SetChange(listA.setKeys(['k'], [3]).appendName('v'), null, 300);
    let addList = new Add(listA.setKeys(['k'],[3]),[setList]);
    let changes = [set, move];
    testee.applyChanges(changes);
    assertSameObjects([{k:11, v:10}, {k:2, v:200}], testee.get(listA));
    testee.applyChanges([addList]);
    assertSameObjects([{k:11, v:10}, {k:2, v:200}, {k:3,v:300}], testee.get(listA));

    testee.applyChanges([new Add(listA.setKeys(['k'],[3]).appendName('c'),[])]);
    // add container in list

    assertSameObjects([{k:11, v:10}, {k:2, v:200}, {k:3,v:300,c:{}}], testee.get(listA));

    // add container not in list
    testee.applyChanges([new Add(contPath.appendName('c1'),[])]);

    assertObjectEquals({c1:{}}, testee.get(contPath));

    // delete container in list
    testee.applyChanges([new Delete(listA.setKeys(['k'],[3]).appendName('c'), undefined)]);
    assertSameObjects([{k:11, v:10}, {k:2, v:200}, {k:3,v:300, c:null}], testee.get(listA));

    // remove from list
    testee.applyChanges([new Delete(listA.setKeys(['k'],[3]), undefined)]);
    assertSameObjects([{k:11, v:10}, {k:2, v:200}], testee.get(listA));

    // remove from container
    testee.applyChanges([new Delete(contPath.appendName('c1'),[])]);
    assertObjectEquals({c1: null}, testee.get(contPath));

    testee.set(Path.fromString('a'),{b:null});
    assertObjectEquals({b:null}, testee.get(Path.fromString('a')));
});


test("ChangeDbReplace", () => {

    let testee1 = new ChangeDb(schema);
    let testee2 = new ChangeDb(schema);
    
    let fullPath = Path.fromString('full/a');
    let obj1 =  {v : 1, v2: 2, list : [{k:1, v:1, v2:2},{k:2, v:2, v2: 2}]};
    let obj3 =  {v : 1, v2: 2, list : [{k:1, v:1, v2:2},{k:2, v:2, v2: 2}]};
    let obj2 =  {v : 1, v2: 2, list : [{k:1, v:11, v2:2},{k:2, v:2, v2: 2}]};
    let key1Path = fullPath.appendName('list').setKeys(['k'],[1]);
    let v1Path = key1Path.appendName('v');
    
    
    assertObjectEquals([fullPath],testee1.setRoot(fullPath,obj1));
    assertObjectEquals(obj1, testee1.get(fullPath));
    assertObjectEquals(null, testee2.get(fullPath));
    testee2.replaceDb(testee1);
    assertObjectEquals(obj1, testee2.get(fullPath));
    testee2.applyChanges([new SetChange(v1Path, 1, 11)]);
    assertObjectEquals(obj1, testee1.get(fullPath));
    assertObjectEquals(obj3, testee1.get(fullPath));
    assertObjectEquals(obj2, testee2.get(fullPath));

});

test("PathMove", () => {
    let pre1 = Path.fromString('a/b/c');
    let pre2 = Path.fromString('x/y');

    let pre3 = pre1.setKeys(['f','g'],[1,2]);
    let pre4 = pre1.setKeys(['f','g'],[3,4]);
    let a = pre3.appendNames(['d','e']);

    assertObjectEquals(
        Path.fromString('x/y').setKeys(['f','g'],[1,2]).appendNames(['d','e']),
        a.move(pre1, pre2));

    assertObjectEquals(
        pre4.appendNames(['d','e']),
        a.move(pre3, pre4));

    assertObjectEquals(
        pre2,
        pre1.move(pre1, pre2));
});

test("Suffix", () => {
    let a = Path.fromString('a/b/c').setKeys(['f','g'],[1,2]).appendNames(['d','e']);
    let pre = Path.fromString('a/b/c');
    let x = Path.fromString('x/y');
    assertObjectEquals(x.setKeys(['f','g'],[1,2]).appendNames(['d','e']),
                       x.appendSuffix(a.getSuffix(pre)));

    assertObjectEquals(x.appendNames(['d','e']),
                       x.appendSuffix(a.getSuffix(pre.setKeys(['f','g'],[1,2]))));


    assertObjectEquals(x.appendNames(['b']),
                       x.appendSuffix(Path.fromString('a/b').getSuffix(Path.fromString('a'))));

});
    
test("PathMap", () => {
    let a = Path.fromString('a');
    let ac = Path.fromString('a/c');
    let ab = Path.fromString('a/b');
    let abc = Path.fromString('a/b/d');
    let ab1 = Path.fromString('a/b1');
    let a1 = Path.fromString('a1');
    let z1 = Path.fromString('z1');
    let testee = new PathMap(schema);

    testee.put(a,1);
    assertSameObjects([1], testee.get(a));
    assertSameObjects([], testee.get(ab));
    testee.put(ab,2);
    assertSameObjects([1,2], testee.get(a));
    assertSameObjects([2], testee.get(ab));
    testee.put(ab1,3);
    assertSameObjects([1,2,3], testee.get(a));
    assertSameObjects([2], testee.get(ab));
    assertSameObjects([1,3], testee.get(a1));

    testee.remove(a);
    assertSameObjects([2,3], testee.get(a));
    assertSameObjects([2], testee.get(ab));
    assertSameObjects([3], testee.get(a1));

    testee = new PathMap(schema);
    testee.putList(a,[1,2]);
    testee.put(ab,2);
    assertSameObjects([1,2,2],testee.get(a));
    testee.putList(a,[]);
    assertSameObjects([2], testee.get(a));
    testee.putList(ab,[]);
    assertSameObjects([], testee.get(a));


    testee = new PathMap(schema);
    testee.put(a,1);
    testee.put(ab,2);
    testee.put(abc,3);
    testee.put(z1,10);
    testee.put(ac,20);
    assertSameObjects([1], testee.getAncestors(a));
    assertSameObjects([1,2], testee.getAncestors(ab));
    assertSameObjects([1,2], testee.getAncestors(ab.setKeys(['k'],[1])));
    testee.put(ab.setKeys(['k'],[1]),44);

    assertSameObjects([1,2,44], testee.getAncestors(ab.setKeys(['k'],[1])));
    assertSameObjects([1,2,3], testee.getAncestors(abc));
});

test("MergeChanges", () => {
    let testee = new ChangeDb(schema);
    let fullPath = Path.fromString('full/a');
    let contPath = Path.fromString('test/cont');
    let namedPath = Path.fromString('named-a');
    let listA = Path.fromString('list-a');
    let fullListA = Path.fromString('test/list-a');

    // set operations
    // Set(a), Set(a) -> Set(a)
    assertObjectEquals(
        [new SetChange(fullListA.setKeys(['k'], [2]).appendName('v'), 20, 200)],
        ChangeSet.merge(schema, [
            new SetChange(fullListA.setKeys(['k'], [2]).appendName('v'), 20, 100),
            new SetChange(fullListA.setKeys(['k'], [2]).appendName('v'), 100, 200),
        ]));

    // Move(a{1},a{2}), Set(a{2}/b) -> Set(a{1}/b},  Move(a{1},a{2}) TODO
    assertObjectEquals(
        [
            new SetChange(fullListA.setKeys(['k'], [1]).appendName('v'), 20, 200),
            new Move(fullListA.setKeys(['k'], [1]), fullListA.setKeys(['k'],[2]))
        ],
        ChangeSet.merge(schema,[
            new Move(fullListA.setKeys(['k'], [1]), fullListA.setKeys(['k'],[2])),
            new SetChange(fullListA.setKeys(['k'], [2]).appendName('v'), 20, 200)
        ]));


        // Move(a{1},a{2}), Move(a{2},a{1}) -> []) TODO
    assertObjectEquals(
        [
        ],
        ChangeSet.merge(schema,[
            new Move(fullListA.setKeys(['k'], [1]), fullListA.setKeys(['k'],[2])),
            new Move(fullListA.setKeys(['k'], [2]), fullListA.setKeys(['k'],[1])),
        ]));


    

    let addKey = fullListA.setKeys(['k'], [1]);
    let moveKey = addKey.appendName('m');
    
    assertObjectEquals(
        [
            new Add(addKey, [])
            
        ],
        ChangeSet.merge(schema,[
            new Add(addKey, [
                new Move(moveKey.setKeys(['k'],[1]), moveKey.setKeys(['k'],[2])),
                new Move(moveKey.setKeys(['k'],[2]), moveKey.setKeys(['k'],[1])),
            ])
        ]));


    // multi move
    // Set(a{1}/b),Del(a{1}) -> Del(a{1}})
    // Set(a/b),Del(a) -> Del(a})
    // Add(a{1}),Set(a{1}/b) -> Add(a{1},[Set(a{1}/b])
    assertObjectEquals(
        [
            new Add(fullListA.setKeys(['k'], [1]), [new SetChange(fullListA.setKeys(['k'], [1]).appendName('v'),undefined, 200)])
        ],
        ChangeSet.merge(schema,[
            new Add(fullListA.setKeys(['k'], [1]), []),
            new SetChange(fullListA.setKeys(['k'], [1]).appendName('v'), undefined, 200),
        ]));
    // Add(a{1},[Set(a{1}/b)]),Set(a{1}/b) -> Add(a{1},[Set(a{1}/b])

    assertObjectEquals(
        [
            new Add(fullListA.setKeys(['k'], [1]), [new SetChange(fullListA.setKeys(['k'], [1]).appendName('v'),undefined, 200)])
        ],
        ChangeSet.merge(schema,[
            new Add(fullListA.setKeys(['k'], [1]), [new SetChange(fullListA.setKeys(['k'], [1]).appendName('v'),undefined, 20)]),
            new SetChange(fullListA.setKeys(['k'], [1]).appendName('v'), 20, 200),
        ]));

    
    // Add(a),Set(a/b) -> Add(a,[Set(a/b])
    
    assertObjectEquals(
        [
            new Add(contPath.appendName('c1'), [new SetChange(contPath.appendName('c1').appendName('c2'),undefined, 200)])
        ],
        ChangeSet.merge(schema,[
            new Add(contPath.appendName('c1'),[]),
            new SetChange(contPath.appendNames(['c1','c2']), undefined, 200),
        ]));

    // Add(a{1},[Set(a{1}/b)]),Add(a{1}/c) -> Add(a{1},[Set(a{1}/b, ])

    assertObjectEquals(
        [
            new Add(fullListA.setKeys(['k'], [1]), [
                new SetChange(fullListA.setKeys(['k'], [1]).appendName('v'),undefined, 20),
                new Add(fullListA.setKeys(['k'], [1]).appendName('c'),[])
            ])
        ],
        ChangeSet.merge(schema,[
            new Add(fullListA.setKeys(['k'], [1]), [new SetChange(fullListA.setKeys(['k'], [1]).appendName('v'),undefined, 20)]),
            new Add(fullListA.setKeys(['k'], [1]).appendName('c'), []),
        ]));

    // Move(a{1},a{2}),Add(a{2},[]) -> error
    assertThrows(function () {
        ChangeSet.merge(schema,[
            new Move(fullListA.setKeys(['k'], [1]),fullListA.setKeys(['k'], [2])),
            new Add(fullListA.setKeys(['k'], [2]), []),
        ]);
    });

    
    // Move(a{1},a{2}),Add(a{2}/c,[]) -> // Add(a{1}),Move(a{1},a{2})    

    assertObjectEquals(
        [
            new Add(fullListA.setKeys(['k'], [1]).appendName('c'), []),
            new Move(fullListA.setKeys(['k'], [1]),fullListA.setKeys(['k'], [2])),

        ],
        ChangeSet.merge(schema,[
            new Move(fullListA.setKeys(['k'], [1]),fullListA.setKeys(['k'], [2])),
            new Add(fullListA.setKeys(['k'], [2]).appendName('c'), []),
        ]));

    // delete is ok we should remove it because it may clear out stuff

    assertObjectEquals(
        [
            new Delete(fullListA.setKeys(['k'], [1]), {x:1}),
            new Add(fullListA.setKeys(['k'], [1]), [])
        ],
        ChangeSet.merge(schema,[
            new Delete(fullListA.setKeys(['k'], [1]),{x:1}),
            new Add(fullListA.setKeys(['k'], [1]), []),
        ]));


    // deletes 
    assertObjectEquals(
        [
            new Add(fullListA.setKeys(['k'], [1]), []),
        ],
        ChangeSet.merge(schema,[
            new Add(fullListA.setKeys(['k'], [1]), [new Add(fullListA.setKeys(['k'], [1]).appendName('c'),[])]),
            new Delete(fullListA.setKeys(['k'], [1]).appendName('c'),undefined)
        ]));
    assertObjectEquals(
        [
            new Add(fullListA.setKeys(['k'], [1]), [new Delete(fullListA.setKeys(['k'], [1]).appendName('c'),undefined)]),
        ],
        ChangeSet.merge(schema,[
            new Add(fullListA.setKeys(['k'], [1]), [new SetChange(fullListA.setKeys(['k'], [1]).appendName('c').appendName('d'),1,2)]),
            new Delete(fullListA.setKeys(['k'], [1]).appendName('c'),undefined)
        ]));
    
    assertObjectEquals(
        [
            new Delete(fullListA.setKeys(['k'], [1]),undefined),
        ],
        ChangeSet.merge(schema,[
            new SetChange(fullListA.setKeys(['k'], [1]).appendName('c'), 7, 8),
            new Delete(fullListA.setKeys(['k'], [1]),undefined)
        ]));

    // deletes and moves

    assertObjectEquals(
        [
            new Delete(fullListA.setKeys(['k'], [1]), undefined),
        ],
        ChangeSet.merge(schema,[
            new Move(fullListA.setKeys(['k'], [1]), fullListA.setKeys(['k'], [2])),
            new Delete(fullListA.setKeys(['k'], [2]), undefined)
        ]));

    assertObjectEquals(
        [
            new Delete(fullListA.setKeys(['k'], [1]).appendName('c'), undefined),
            new Move(fullListA.setKeys(['k'], [1]), fullListA.setKeys(['k'], [2])),
        ],
        ChangeSet.merge(schema,[
            new Move(fullListA.setKeys(['k'], [1]), fullListA.setKeys(['k'], [2])),
            new Delete(fullListA.setKeys(['k'], [2]).appendName('c'), undefined)
        ]));


    assertObjectEquals(
        [
            new Delete(fullListA.setKeys(['k'], [2]), undefined),
        ],
        ChangeSet.merge(schema,[
            new Move(fullListA.setKeys(['k'], [2]).appendName('c')
                        .setKeys(['k'], [2]),
                        fullListA.setKeys(['k'], [2]).appendName('c')
                        .setKeys(['k'],[1])),
            new Delete(fullListA.setKeys(['k'], [2]),undefined)
        ]));

    // move ... move

    assertObjectEquals(
        [
            new Move(fullListA.setKeys(['k'], [1]),fullListA.setKeys(['k'], [3])),
        ],
        ChangeSet.merge(schema,[
            new Move(fullListA.setKeys(['k'], [1]),
                        fullListA.setKeys(['k'], [2])),
            new Move(fullListA.setKeys(['k'], [2]),
                        fullListA.setKeys(['k'], [3]))
        ]));


});

test("MergeAddThenMove", () => {
    let fullListA = Path.fromString('test/list-a');
        // Add(a{1}), Set(a{1}/v/2), Move(a{1},a{2}) -> [Add(a{2})]) xxx

    let res = ChangeSet.merge(schema,[
            new Add(fullListA.setKeys(['k'], [1]), []),
            new SetChange(fullListA.setKeys(['k'], [1]).appendName('v'), 20, 200),
        new Move(fullListA.setKeys(['k'], [1]), fullListA.setKeys(['k'],[2]))
        ]);
    assertObjectEquals(
        [
            new Add(fullListA.setKeys(['k'], [2]), [
                new SetChange(fullListA.setKeys(['k'], [2]).appendName('v'), 20, 200)
            ]),
        ],res);
});

test("OrderThenMove", () => {
    let fullListA = Path.fromString('test/ordered');
        // Add(a{1}), Set(a{1}/v/2), Move(a{1},a{2}) -> [Add(a{2})]) xxx
    // reorders cannot be rearranged or moved
    let res = ChangeSet.merge(schema,[
        new Reorder(fullListA.setKeys(['k'], [2]), null, ChangePosition.AFTER ,null),
        new Move(fullListA.setKeys(['k'], [2]),fullListA.setKeys(['k'], [3])),
    ]);
    assertObjectEquals(
        [
            new Reorder(fullListA.setKeys(['k'], [2]), null, ChangePosition.AFTER ,null),
            new Move(fullListA.setKeys(['k'], [2]),fullListA.setKeys(['k'], [3]))
        ],res);

});


test("OrderThenRemove", () => {
    let fullListA = Path.fromString('test/ordered');
        // Add(a{1}), Set(a{1}/v/2), Move(a{1},a{2}) -> [Add(a{2})]) xxx

    let res = ChangeSet.merge(schema,[
        new Add(fullListA.setKeys(['k'], [1]), []),
        new Add(fullListA.setKeys(['k'], [2]),[]),
        new Reorder(fullListA.setKeys(['k'], [2]), null, ChangePosition.AFTER ,fullListA.setKeys(['k'], [1] )),
        new Delete(fullListA.setKeys(['k'], [2]),[]),
    ]);
    assertObjectEquals(
        [
            new Add(fullListA.setKeys(['k'], [1]), []),
        ],res);
    res = ChangeSet.merge(schema,[
        new Add(fullListA.setKeys(['k'], [1]), []),
        new Add(fullListA.setKeys(['k'], [2]),[]),
        new Add(fullListA.setKeys(['k'], [3]),[]),
        new Reorder(fullListA.setKeys(['k'], [2]), fullListA.setKeys(['k'], [3]), ChangePosition.AFTER ,fullListA.setKeys(['k'], [1] )),
        new Delete(fullListA.setKeys(['k'], [3]),[]),
    ]);
    assertObjectEquals(
        [
            new Add(fullListA.setKeys(['k'], [1]), []),
            new Add(fullListA.setKeys(['k'], [2]), []),
        ],res);
});

test("MergeAddChildrenStay", ()=> {
    let fullListA = Path.fromString('test/list-a');

    assertObjectEquals(
        [
            new Add(fullListA.setKeys(['k'], [1]), [
                new SetChange(fullListA.setKeys(['k'], [1]).appendName('v'), 20, 200)
            ]),
        ],ChangeSet.merge(schema,[
            new Add(fullListA.setKeys(['k'], [1]), [
                new SetChange(fullListA.setKeys(['k'], [1]).appendName('v'), 20, 200)
            ]),
        ]));
});
