import test from "node:test";
import {MutableTable, MutableTableRow} from "./table";
import {ColumnKey} from "./columnkey";
import {MapColumns} from "./mapcolumns";
import {assertEquals, assertObjectEquals} from "../../test";

const COL_A = new ColumnKey("a");
const COL_B = new ColumnKey("b");
const COL_C = new ColumnKey("c");
const COL_D = new ColumnKey("d");
const COL_E = new ColumnKey("e");


test("Set", () => {
    let tbl = new MutableTable([COL_A], [COL_B, COL_C]);

    tbl.setMeta({left:true});
    tbl.setColumnMeta(COL_B, {left:true});
    tbl.setColumnMeta(COL_C, {left:true});
    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, "a" + val);
        row.set(COL_B, "b" + val);
        row.set(COL_C, "c" + val);
        tbl.addRow(row);
    });

    let testee = new MapColumns();
    
    let expected = [1,2,3,4];
    let i = 0;
    let mappings = [{from :COL_A, to:COL_D},{from :COL_C, to: COL_E}];
    let table = testee.calculate({table : tbl.freeze(), mappings :mappings});

    assertObjectEquals({left: true}, table.getMeta());
    assertObjectEquals({left: true}, table.getColumnMeta(COL_B));
    assertObjectEquals({left: true}, table.getColumnMeta(COL_E));
    assertEquals(expected.length, table.size());

    for (let {row} of table) {
        assertEquals("a" + expected[i], row.get(COL_D));
        assertEquals("b" + expected[i], row.get(COL_B));
        assertEquals("c" + expected[i], row.get(COL_E));
        assertEquals(null, row.get(COL_A));
        assertEquals(null, row.get(COL_C));
        i++;
    }

    let mtable = table.unfreeze();
    mtable.set(["a3"], COL_B, "b8");
    mtable.set(["a3"], COL_E, "e8");
    mtable.setMeta({left:false});
    mtable.setColumnMeta(COL_B, {left:false});
    mtable.setColumnMeta(COL_E, {left:false});

    let orig = testee.inverse(mtable.freeze(),{table : tbl.freeze(), mappings: mappings});


    assertObjectEquals({left: false}, orig.table.getMeta());
    assertObjectEquals({left: false}, orig.table.getColumnMeta(COL_B));
    assertObjectEquals({left: false}, orig.table.getColumnMeta(COL_C));

    expected = [1,2,3,4];
    i = 0;
    assertEquals(expected.length, orig.table.size());
    for (let {row} of orig.table) {
        assertEquals("a" + expected[i], row.get(COL_A));
        assertEquals (i === 2 ? "e8" : "c" +  expected[i], row.get(COL_C));
        assertEquals(i == 2 ? "b8" : "b" + expected[i], row.get(COL_B));
        i++;
    }
    
});

test("Delete", () => {
    let tbl = new MutableTable([COL_A], [COL_B, COL_C]);

    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, val);
        row.set(COL_B, val);
        row.set(COL_C, val);
        tbl.addRow(row);
    });

    let testee = new MapColumns();
    
    let mappings = [{from :COL_A, to:COL_D},{from :COL_C, to: COL_E}];
    let i = 0;
    let table = testee.calculate({table : tbl.freeze(), mappings : mappings});

    let mtable = table.unfreeze();
    mtable.removeRow([3]);

    let orig = testee.inverse(mtable.freeze(),{table : tbl.freeze(), mappings: mappings});

    let expected = [1,2,4];
    i = 0;
    assertEquals(expected.length, orig.table.size());
    for (let {row} of orig.table) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        assertEquals(expected[i], row.get(COL_C));
        i++;
    }
    
});

test("Insert", () => {
    let mappings = [{from :COL_A, to:COL_D},{from :COL_C, to: COL_E}];

    let tbl = new MutableTable([COL_A], [COL_B, COL_C]);

    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, val);
        row.set(COL_B, val);
        row.set(COL_C, val);
        tbl.addRow(row);
    });

    let testee = new MapColumns();
    
    let expected = [1,3];
    let i = 0;
    let table = testee.calculate({table : tbl.freeze(), mappings : mappings});
    let mtable = table.unfreeze();

    let row = new MutableTableRow();
    row.set(COL_D, 5);
    row.set(COL_B, 5);
    row.set(COL_E, 5);
    mtable.addRow(row);


    let orig = testee.inverse(mtable.freeze(),{table : tbl.freeze(), mappings: mappings});

    expected = [1,2,3,4,5];
    i = 0;
    assertEquals(expected.length, orig.table.size());
    for (let {row} of orig.table) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        assertEquals(expected[i], row.get(COL_C));
        i++;
    }
    
});
