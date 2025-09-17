import test from "node:test";
import {DefaultPathCompressor, Path} from "./path";
import {assertObjectEquals} from "../test";
import {Add, ChangeType, Delete, Move, SetChange} from "./change";
import {deserializeChange} from "./changeset";
import {StructType} from "../frp/struct";

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
