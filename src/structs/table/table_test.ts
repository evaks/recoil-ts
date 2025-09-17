import assert from "node:assert/strict";
import test from "node:test";
import { ColumnKey } from "./columnkey";
import {MutableTable, MutableTableRow, TableCell, TableRow} from "./table";
import { isEqual } from "../../util/object";
import {
    assertEqualIgnoreOrder,
    assertEquals,
    assertFalse,
    assertNull,
    assertObjectEquals,
    assertThrows,
    assertTrue
} from "../../test";

let COL_A = new ColumnKey<number|string>("a");
let COL_B = new ColumnKey<number|string>("b");
let COL_C = new ColumnKey("c");
let COL_D = new ColumnKey("d", function (x:number, y:number) {
   return  y - x;
});
let COL_AUTO = ColumnKey.createUnique("auto");

test("AutoKey()", () => {
    let tbl = new MutableTable([COL_AUTO], []);
    let row = new MutableTableRow();

    tbl.addRow(row);
    tbl.addRow(row);
    let i = 1;
    assertEquals(2,tbl.size());
    for (let {row} of tbl) {
        let val = row.get(COL_AUTO);
        assertEquals(""+ i,val);
        i++;
    }
    
});

test("RowValuesEqual", () => {
    let r1 = new MutableTableRow(1);
    let r2 = new MutableTableRow(2);

    assertTrue(r1.valuesEqual(r2));
    r1.set(COL_A,1);
    assertFalse(r1.valuesEqual(r2));

    r2.set(COL_A,1);
    assertTrue(r1.valuesEqual(r2));


    r2.set(COL_B,2);
    assertFalse(r1.valuesEqual(r2));

    r1.set(COL_B,2);
    assertTrue(r1.valuesEqual(r2));

    r1.setCellMeta(COL_A,{x: 2});
    assertTrue(r1.valuesEqual(r2));

    r1.setRowMeta({x: 2});
    assertTrue(r1.valuesEqual(r2));

});
test("Ordered", () => {
    let tbl = new MutableTable([COL_A], []);
    let row = new MutableTableRow(1);
    row.set(COL_A, 1);
    tbl.addRow(row);

    row = new MutableTableRow(-1);
    row.set(COL_A, 2);
    tbl.addRow(row);


    let expected = [2, 1];
    let i = 0;
    for (let {row} of tbl.freeze()) {
        assertEquals(expected[i], row.get(COL_A));
        i++;
    }

    i = 0;
    for (let {row} of tbl.freeze().unfreeze().freeze()) {
        assertEquals(expected[i], row.get(COL_A));
        i++;
    }
    
    

});

test("Equals", () => {
    let tbl1 = new MutableTable([COL_A], [COL_B]);
    let tbl2 = new MutableTable([COL_A], [COL_B]);
    let row = new MutableTableRow();
    row.set(COL_A, "hello");
    row.setCellMeta(COL_A, {errors:[]});
    row.set(COL_B, "world");
    
    tbl1.addRow(row);

    row = new MutableTableRow();
    row.set(COL_A, "hello");
    row.setCellMeta(COL_A, {errors:['hi']});
    row.set(COL_B, "world");

    tbl2.addRow(row);
    assertFalse(isEqual(tbl1.freeze(), tbl2.freeze()));

});

test("AddRow", () => {
    let tbl = new MutableTable([], [COL_A, COL_B]);
    let row = new MutableTableRow();
    row.set(COL_A, "hello");
    row.set(COL_B, "world");
    
    tbl.addRow(row);
    
    assertEquals("hello",tbl.get([0], COL_A));
    assertEquals("world",tbl.get([0], COL_B));

    let table = tbl.freeze();
    
    assertEquals("hello",table.get([0], COL_A));
    assertEquals("world",table.get([0], COL_B));
});

test("AddIncompleteRow", () => {
    let tbl = new MutableTable([], [COL_A, COL_B]);
    let row = new MutableTableRow();
    let tblPk = new MutableTable([COL_A], [COL_B]);

    row.set(COL_B, "world");

    assertThrows(function () {
        tbl.addRow(row);
    });

    assertThrows(function () {
        tblPk.addRow(row);
    });

    row.set(COL_A, "hello");
    tbl.addRow(row);
    tblPk.addRow(row);

    assertEquals("hello",tbl.get([0], COL_A));
    assertEquals("world",tbl.get([0], COL_B));
    assertNull(tbl.get([0], COL_C));
    
    assertEquals("world",tblPk.get(["hello"], COL_B));
    
    row.set(COL_C, "!");

    tbl.addRow(row);
    assertNull(tbl.get([1], COL_C));
    assertEquals("world",tbl.get([1], COL_B));
});

test("ImmutableRow", () => {
    let tbl = new MutableTable([], [COL_A, COL_B]);
    let row = new MutableTableRow();
    row.set(COL_A, "hello");
    row.set(COL_B, "world");

    tbl.addRow(row);

    assertEquals("hello",row.get(COL_A));
    assertEquals("world",row.get(COL_B));

    let row2 = row.freeze();

    row.set(COL_A, "pinky");
    assertEquals("pinky",row.get(COL_A));

    row2.set(COL_A, "smurf");
    assertEquals("hello",row2.get( COL_A));

});

test("RemoveRow", () => {
    let mTable = new MutableTable([], [COL_A, COL_B]);
    let tblRow = TableRow;

    mTable.addRow(tblRow.create([COL_A, 1], [COL_B, 8]));
    mTable.addRow(tblRow.create([COL_A, 7], [COL_B, 9]));

    assertEquals(1, mTable.get([0], COL_A));
    mTable.removeRow([0]);
    assertNull(mTable.get([0], COL_A));


});
test("ColCompare", () => {
    let colA = new ColumnKey('a');
    let colB = new ColumnKey('a');

    assertTrue((colA.compare(colB) as number) < 0);
    assertTrue(colA.compare(colA) as number === 0 );
    assertTrue((colB.compare(colA) as number) > 0);

    assertTrue(colB.compare("fred") === undefined);

});
test("MetaData", () => {
    let mTable = new MutableTable([], [COL_A, COL_B]);
    let tblRow = TableRow;

    
    mTable.addRow(tblRow.create([COL_A, 1], [COL_B, 8]).addCellMeta(COL_B, {bob:1}));
    mTable.addRow(tblRow.create([COL_A, 7], [COL_B, 9]));
    let table = mTable.freeze();

    assertObjectEquals({}, mTable.getRow([0])?.getCellMeta(COL_A));
    assertObjectEquals({bob:1}, mTable.getRow([0])?.getCellMeta(COL_B));
    assertObjectEquals({}, table.getRow([0])?.getCellMeta(COL_A));
    assertObjectEquals({bob:1}, table.getRow([0])?.getCellMeta(COL_B));
    assertObjectEquals({},table.getMeta());
    assertObjectEquals({},mTable.getMeta());
    let stuff = {a:1};
    
    mTable.setMeta({foo: stuff});
    table = mTable.freeze();
    assertObjectEquals({foo: {a:1}},mTable.getMeta());
    assertObjectEquals({foo: {a:1}},table.getMeta());


    mTable.setMeta({foo: stuff, x: 1});

    assertObjectEquals({foo: {a:1}},table.getMeta());
    assertObjectEquals({foo: {a:1}, x : 1},mTable.getMeta());
    
    mTable.addMeta({y:2});

    assertObjectEquals({foo: {a:1}},table.getMeta());
    assertObjectEquals({foo: {a:1}, x : 1, y : 2},mTable.getMeta());

    mTable.setColumnMeta(COL_A, {a: 2});
    mTable.addColumnMeta(COL_A, {b: 4});

    assertObjectEquals({a: 2, b:4}, mTable.getColumnMeta(COL_A));
    assertObjectEquals({}, table.getColumnMeta(COL_A));
    table = mTable.freeze();
    assertObjectEquals({a: 2, b:4}, table.getColumnMeta(COL_A));
    
    assertObjectEquals({}, mTable.getRowMeta([1]));
    assertObjectEquals({}, table.getRowMeta([1]));

    assertObjectEquals({},mTable.getRowMeta([2]));
    assertObjectEquals({},table.getRowMeta([2]));
    assertThrows(function () {
        mTable.setRowMeta([2], {a:10});
    });
    mTable.setRowMeta([1], {a:10});
    mTable.addRowMeta([1], {b:11});
    assertObjectEquals({a:10, b:11}, mTable.getRowMeta([1]));
    assertObjectEquals({}, table.getRowMeta([1]));

    table = mTable.freeze();
    
    assertObjectEquals({a:10, b:11}, table.getRowMeta([1]));
    
    mTable = table.unfreeze();
    assertObjectEquals({a:10, b:11}, mTable.getRowMeta([1]));
    assertObjectEquals({foo: {a:1}, x : 1, y : 2},mTable.getMeta());
    assertObjectEquals({a: 2, b:4}, mTable.getColumnMeta(COL_A));


    

});

test("getRows", () => {
    let mTable = new MutableTable([], [COL_A, COL_B]);
    let tblRow = TableRow;

    mTable.addRow(tblRow.createOrdered(3,[COL_A, 1], [COL_B, 8]));
    mTable.addRow(tblRow.createOrdered(2, [COL_A, 7], [COL_B, 9]));

    let row = mTable.findRow(row => row.get(COL_A) == 1) as TableRow;
    assert.equal(8, row.get(COL_B));
    assert.equal(9, mTable.getFirstRow()?.get(COL_B) );
    assert.equal(null, mTable.findRow(row => row.get(COL_A) == -1) );

    row = mTable.freeze().findRow(row => row.get(COL_A) == 1) as TableRow;
    assert.equal(8, row?.get(COL_B));
    assert.equal(9, mTable.freeze().getFirstRow()?.get(COL_B));
    assert.equal(null, mTable.freeze().findRow(row => row.get(COL_A) == -1) );

});
test("ImmutableTable", () => {

    let mTable = new MutableTable([], [COL_A, COL_B]);
    let tblRow = TableRow;

    mTable.addRow(tblRow.create([COL_A, 1], [COL_B, 8]));
    mTable.addRow(tblRow.create([COL_A, 7], [COL_B, 9]));

    

    let table = mTable.freeze();

    assertEquals(1, table.get([0], COL_A));
    mTable.set([0], COL_A, 3);
    assertEquals(1, table.get([0], COL_A));
    assertEquals(3, mTable.get([0], COL_A));

});

test("ChangeCell", () => {
    let mTable = new MutableTable([], [COL_A]);
    let row = new MutableTableRow();

    row.set(COL_A, "hello");

    mTable.addRow(row);

    assertEquals("hello",row.get(COL_A));

    let cell = new TableCell("bobo", { color: 'red'});
    row.setCell(COL_A, cell);

    assertEquals("bobo",row.get(COL_A));
    assertEquals('red', row.getCell(COL_A)?.getMeta().color);

    let cell2 = cell.setMeta({color: 'blue'});
    assertEquals("blue", cell2.getMeta().color);

    row.set(COL_A, "fish");
    assertEquals("fish",row.get(COL_A));
});

test("ColKeyComparator", () => {
    let orderedTable = new MutableTable([COL_A], [COL_B]);
    let revTable = new MutableTable([COL_D], [COL_B]);
    let rowF = TableRow;

    orderedTable.addRow(rowF.create([COL_A, 7], [COL_B, 9]));
    orderedTable.addRow(rowF.create([COL_A, 1], [COL_B, 8]));

    revTable.addRow(rowF.create([COL_D, 1], [COL_B, 8]));
    revTable.addRow(rowF.create([COL_D, 7], [COL_B, 9]));

    let expected: any[] = [{a:1, b: 8}, {a:7, b: 9}];
    let i = 0;
    for (let {row} of orderedTable.freeze()) {
        assertEquals(expected[i].a, row.get(COL_A));
        assertEquals(expected[i].b, row.get(COL_B));
        i++;
    }

    assertEquals(i, expected.length);

    i = 0;
    for (let {row} of orderedTable) {
        assertEquals(expected[i].a, row.get(COL_A));
        assertEquals(expected[i].b, row.get(COL_B));
        i++;
    }
    assertEquals(i, expected.length);

    expected = [{d:7, b: 9}, {d:1, b: 8}];

    i = 0;
    for (let {row} of revTable.freeze()) {
        assertEquals(expected[i].d, row.get(COL_D));
        assertEquals(expected[i].b, row.get(COL_B));
        i++;
    }

    assertEquals(i, expected.length);

    i = 0;
    for (let {row} of revTable){
        assertEquals(expected[i].d, row.get(COL_D));
        assertEquals(expected[i].b, row.get(COL_B));
        i++;
    }

    assertEquals(i, expected.length);

    //assertTrue(false);
    /*
     table.getMeta([1], COL_A);

    table.setTableMeta({name : 'foo'});
    table.setCell([0], COL_A, new TableCell('hi', {color : 'red'}))
    assertEquals({name: 'foo', color : 'red'}, table.getMeta([0],COL_A));*/
});

test("GetNonExistentRow", () => {
    let mTable = new MutableTable([], [COL_A, COL_B]);
    let rowF = TableRow;

    mTable.addRow(rowF.create([COL_A, 1], [COL_B, 8]));

    let table = mTable.freeze();

    assertNull(table.get([1], COL_D));
});

test("createEmptyKeep", () => {
    let mTable = new MutableTable([], [COL_A, COL_B, COL_C]);
    let tblRow = TableRow;

    mTable.addRow(tblRow.createOrdered(3,[COL_A, 1], [COL_B, 8], [COL_C, 1]));
    mTable.addRow(tblRow.createOrdered(2, [COL_A, 7], [COL_B, 9], [COL_C, 1]));

    let table = mTable.freeze();

    let testee = table.createEmptyKeep([COL_C]);
    assert.equal(0, testee.size());
    assert.deepEqual([ColumnKey.INDEX, COL_C], testee.columns().map(v => v.key));

    testee = table.createEmptyAddCols([COL_D], [COL_AUTO]);
    assert.equal(0, testee.size());
    assert.deepEqual([COL_D], testee.getPrimaryColumns());
    assertEqualIgnoreOrder([COL_A,  COL_B, COL_C, COL_AUTO, ColumnKey.INDEX], testee.getOtherColumns());
});

test("modifableRows", () => {
    let mTable = new MutableTable([], [COL_A, COL_B, COL_C]);
    let tblRow = TableRow;

    let expected = [
        {a:7, b:9, c:2},
        {a:1, b:8, c:1}
    ];

    mTable.addRow(tblRow.createOrdered(3,[COL_A, 1], [COL_B, 8], [COL_C, 1]));
    mTable.addRow(tblRow.createOrdered(2, [COL_A, 7], [COL_B, 9], [COL_C, 2]));

    let i = 0;
    for (let {row} of mTable.modifiableRows()) {
        assert.equal(row.get(COL_A), expected[i].a);
        assert.equal(row.get(COL_B), expected[i].b);
        assert.equal(row.get(COL_C), expected[i].c);
        i++
    }
    i = 0;
    for (let {row} of mTable.freeze().modifiableRows()) {
        assert.equal(row.hasColumn(COL_C), true);
        assert.equal(row.hasColumn(COL_D), false);
        assert.equal(row.freeze().hasColumn(COL_C), true);
        assert.equal(row.freeze().hasColumn(COL_D), false);
        assert.equal(row.get(COL_A), expected[i].a);
        assert.equal(row.get(COL_B), expected[i].b);
        assert.equal(row.get(COL_C), expected[i].c);
        i++
    }

});
test("transfer", () => {
    let src = new MutableTableRow();
    src.set(COL_A, 1);
    src.setCellMeta(COL_A, {bob:true});
    let dst = new MutableTableRow();

    let val = src.columnValues()[0];
    assert.equal(val.col, COL_A);
    assert.equal(val.cell.getValue(),1);
    assert.deepEqual(val.cell.getMeta(),{bob:true});

    src.set(COL_B, 2);
    src.setCellMeta(COL_B, {bob:false});
    dst.transfer([COL_B], src);

    val = dst.columnValues()[0];
    assert.equal(dst.columnValues().length, 1);
    assert.equal(val.col, COL_B);
    assert.equal(val.cell.getValue(),2);
    assert.deepEqual(val.cell.getMeta(),{});

})
test("DuplicateRow", () => {
    let mTable = new MutableTable([COL_A], [COL_B]);
    let rowF = TableRow;

    mTable.addRow(rowF.create([COL_A, 1], [COL_B, 8]));

    assertThrows(function () {
        mTable.addRow(rowF.create([COL_A, 1], [COL_B, 6]));
    });
});

test("ComplexPrimaryKey", () => {
    let mTable = new MutableTable([COL_A, COL_B], [COL_C]);
    let rowF = TableRow;

    mTable.addRow(rowF.create([COL_A, 1], [COL_B, 8], [COL_C, 9]));
    mTable.addRow(rowF.create([COL_A, 4], [COL_B, 6], [COL_C, 10]));

    assertEquals(9, mTable.get([1, 8], COL_C));
    assertEquals(10, mTable.get([4, 6], COL_C));

    assertNull(mTable.get([1, 6], COL_C));

    mTable.set([1, 8], COL_C, 15);
    assertEquals(15, mTable.get([1, 8], COL_C));

    assertThrows(function () {
        assertEquals(15, mTable.get([1], COL_C));
    });

});

test("ForEach", () => {
    let mTable = new MutableTable([], [COL_A, COL_B]);

    mTable.addRow(TableRow.create([COL_A, 1], [COL_B, 8]));
    mTable.addRow(TableRow.create([COL_A, 7], [COL_B, 9]));

    let table = mTable.freeze();

    let i = 0;
    for (let {row:r} of mTable) {
        assertTrue(isEqual(mTable.getRow([i]), r));
        i++;
    }
    assertEquals(2, i);

    i = 0;
    for (let {row:r} of table) {
        assertTrue(isEqual(mTable.getRow([i]), r));
        i++;
    }
    assertEquals(2, i);
});
