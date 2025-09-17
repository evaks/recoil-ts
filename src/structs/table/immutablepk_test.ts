
import test from "node:test";
import {ColumnKey} from "./columnkey";
import {assertEquals, assertObjectEquals} from "../../test";
import {ImmutablePk} from "./immutablepk";
import {MutableTable, MutableTableRow, Table} from "./table";
import {StructType} from "../../frp/struct";
import {Frp} from "../../frp/frp";

const COL_A = new ColumnKey("a");
const COL_B = new ColumnKey("b");

type ExpectedTableRow = {id?:number, dups?:any, a:{val:number, meta:any}, b:{val:string, meta:any}}

function checkTable(expected:ExpectedTableRow[], table:Table, mappings:StructType, dupsCol?:any) {
    assertEquals(expected.length, table.size());
    let idMap:StructType = {};
    let pos = 0;
    for (let {row:tblRow, key: keys} of table) {
        let row = expected[pos];
        assertEquals("a.value [" + pos + "]", row.a.val, tblRow.get(COL_A));
        assertEquals("b.value [" + pos + "]", row.b.val, tblRow.get(COL_B));
        assertObjectEquals("a.meta [" + pos + "]",row.a.meta, tblRow.getCellMeta(COL_A));
        assertObjectEquals("b.meta [" + pos + "]",row.b.meta, tblRow.getCellMeta(COL_B));

        if (row.id !== undefined) {
            assertEquals("id [" + pos + "]", row.id, tblRow.get(table.getPrimaryColumns()[0]));
        }

        if (row.dups !== undefined) {
            assertObjectEquals("dups [" + pos + "]", row.dups, tblRow.get(dupsCol));
        }

        if (mappings[row.a.val] !== undefined) {
            assertEquals("mapping [" + pos + "]", mappings[row.a.val], keys[0]);
        }
        idMap[row.a.val] = keys[0];
        
        pos++;
    }
    // map from origkey to immutable key
    return idMap;
}
function mkTable(rows:number[]):MutableTable {
    let tbl = new MutableTable([COL_A], [COL_B]);
    tbl.setMeta({tableMeta:true});
    
    tbl.setColumnMeta(COL_A, {meta:"a"});
    tbl.setColumnMeta(COL_B, {meta:"b"});
    
    let pos = 0;
    
    const genRow = function (val:number) {
        let row = new MutableTableRow(pos++);
        row.set(COL_A, val);
        row.setCellMeta(COL_A, {cell : "a" + val});
            row.set(COL_B, "b" + val);
        row.setCellMeta(COL_B, {cell : "b" + val});
        tbl.addRow(row);
    };
    rows.forEach(genRow);
    return tbl;
}

test("CreateB", ()=> {
    let frp = new Frp();
    
    let tblB = frp.createB(mkTable([2,3,4,1]).freeze());
    let testeeB = ImmutablePk.createB(tblB);
    
    frp.attach(testeeB);
    

    let expected:ExpectedTableRow[] = [
        {a: {val: 2, meta: {cell : "a2"}}, b: {val:"b2",  meta : {cell : "b2"}}},
        {a: {val: 3, meta: {cell : "a3"}}, b: {val:"b3",  meta : {cell : "b3"}}},
        {a: {val: 4, meta: {cell : "a4"}}, b: {val:"b4",  meta : {cell : "b4"}}},
        {a: {val: 1, meta: {cell : "a1"}}, b: {val:"b1",  meta : {cell : "b1"}}}
    ];
    frp.accessTrans(() => {
        let table = testeeB.get();
        assertObjectEquals({tableMeta: true}, table.getMeta());
        let mappings = checkTable(expected, table, {});
        let mtable = table.unfreeze();
        mtable.removeRow([mappings[1]]);
        testeeB.set(mtable.freeze());
    }, testeeB);

    expected = [
        {a: {val: 2, meta: {cell : "a2"}}, b: {val:"b2",  meta : {cell : "b2"}}},
        {a: {val: 3, meta: {cell : "a3"}}, b: {val:"b3",  meta : {cell : "b3"}}},
        {a: {val: 4, meta: {cell : "a4"}}, b: {val:"b4",  meta : {cell : "b4"}}}
    ];

    frp.accessTrans(function () {
        let table = testeeB.get();
        assertObjectEquals({tableMeta: true}, table.getMeta());
        let mappings = checkTable (expected, table, {});

    }, testeeB);



});

test("ImmutablePk", () =>{
    let testee = new ImmutablePk();
    let tbl = mkTable([2,3,4,1]);
    let table = testee.calculate({table : tbl.freeze()});
    assertObjectEquals({tableMeta: true}, table.getMeta());
    let expected = [
        {a: {val: 2, meta: {cell : "a2"}}, b: {val:"b2",  meta : {cell : "b2"}}},
        {a: {val: 3, meta: {cell : "a3"}}, b: {val:"b3",  meta : {cell : "b3"}}},
        {a: {val: 4, meta: {cell : "a4"}}, b: {val:"b4",  meta : {cell : "b4"}}},
        {a: {val: 1, meta: {cell : "a1"}}, b: {val:"b1",  meta : {cell : "b1"}}},
    ];


    let mappings = checkTable (expected, table, {});
    let origTable = mkTable([5,1,2,3,4]).freeze();
    table = testee.calculate({table : origTable});
    
    expected = [
        {a: {val: 5, meta: {cell : "a5"}}, b: {val:"b5",  meta : {cell : "b5"}}},
        {a: {val: 1, meta: {cell : "a1"}}, b: {val:"b1",  meta : {cell : "b1"}}},
        {a: {val: 2, meta: {cell : "a2"}}, b: {val:"b2",  meta : {cell : "b2"}}},
        {a: {val: 3, meta: {cell : "a3"}}, b: {val:"b3",  meta : {cell : "b3"}}},
        {a: {val: 4, meta: {cell : "a4"}}, b: {val:"b4",  meta : {cell : "b4"}}},

    ];

    mappings = checkTable (expected, table, mappings);

    // now test adding a row

    let mtable = table.unfreeze();

    let row = Table.createUniqueIntPkRow(mtable);
    row.set(COL_A, 6);
    row.set(COL_B, "b6");
    mtable.addRow(row);
    mtable.set([mappings[3]],COL_B, "b3new"); 
    
    expected = [
        {a: {val: 5, meta: {cell : "a5"}}, b: {val:"b5",  meta : {cell : "b5"}}},
        {a: {val: 1, meta: {cell : "a1"}}, b: {val:"b1",  meta : {cell : "b1"}}},
        {a: {val: 2, meta: {cell : "a2"}}, b: {val:"b2",  meta : {cell : "b2"}}},
        {a: {val: 3, meta: {cell : "a3"}}, b: {val:"b3new",  meta : {cell : "b3"}}},
        {a: {val: 4, meta: {cell : "a4"}}, b: {val:"b4",  meta : {cell : "b4"}}},
        {a: {val: 6, meta: {}}, b: {val:"b6",  meta : {}}},
    ] as ExpectedTableRow[];
    let res = testee.inverse(mtable.freeze(), {table:origTable});
    checkTable (expected, res.table, {});

    // check keeps new keys unchanged
    
});



test("NewKeyUnchanged", () => {

    let testee = new ImmutablePk();
    let tbl = mkTable([1]);
    let table = testee.calculate({table : tbl.freeze()});
    let mtable = table.unfreeze();
    
    let expected = [
        {a: {val: 1, meta: {cell : "a1"}}, b: {val:"b1",  meta : {cell : "b1"}}},
        {a: {val: 6, meta: {}}, b: {val:"b6",  meta : {}}},

    ];

    let row = Table.createUniqueIntPkRow(mtable);
    row.set(table.getPrimaryColumns()[0], 100);
    row.set(COL_A, 6);
    row.set(COL_B, "b6");
    mtable.addRow(row);

    let res = testee.inverse(mtable.freeze(), {table:tbl.freeze()});
    checkTable (expected, res.table, {});
    checkTable (expected, testee.calculate({table: res.table}), {6:100});
});

test("NewKeyDup", () => {

    let testee = new ImmutablePk();
    let tbl = mkTable([1]);
    let table = testee.calculate({table : tbl.freeze()});
    let mtable = table.unfreeze();
    
    let expectedSrc = [
        {a: {val: 1, meta: {cell : "a1"}}, b: {val:"b1",  meta : {cell : "b1"}}}
    ];

    let mappings = checkTable (expectedSrc, table, {});
    let expectedDest = [
        {a: {val: 1, meta: {cell : "a1"}}, b: {val:"b1",  meta : {cell : "b1"}, dups: [100]}},
        {a: {val: 1, meta: {}}, b: {val:"b6",  meta : {}}, dups: [mappings[1]]},

    ];

    let row = Table.createUniqueIntPkRow(mtable);
    row.set(table.getPrimaryColumns()[0], 100);
    row.set(COL_A, 1);
    row.set(COL_B, "b6");
    mtable.addRow(row);

    let res = testee.inverse(mtable.freeze(), {table:tbl.freeze()});
    checkTable (expectedSrc, res.table, {});
    table  =testee.calculate({table: res.table});
    checkTable (expectedDest, table,{6:100},testee.DUPLICATES);

    // test removing a row
    mtable = table.unfreeze();
    mtable.removeRow([100]);
    let expected = [
        {a: {val: 1, meta: {cell : "a1"}}, b: {val:"b1",  meta : {cell : "b1"},  id:mappings[1], dups:[]}},
    ];
    res = testee.inverse(mtable.freeze(), {table:res.table});
    checkTable (expected, res.table, {});
    table = testee.calculate({table: res.table});
    checkTable (expected, table, {}, testee.DUPLICATES);

})

test("ExistingKeyDup", () => {

    let testee = new ImmutablePk();
    let tbl = mkTable([1,2]);
    let table = testee.calculate({table : tbl.freeze()});
    let mtable = table.unfreeze();

    
    let expectedOrig = [
        {a: {val: 1, meta: {cell : "a1"}}, b: {val:"b1",  meta : {cell : "b1"}}},
        {a: {val: 2, meta: {cell : "a2"}}, b: {val:"b2",  meta : {cell : "b2"}}}
    ];
    let expectedSrc = [
        {a: {val: 1, meta: {cell : "a1"}}, b: {val:"b1new",  meta : {cell : "b1"}}},
        {a: {val: 2, meta: {cell : "a2"}}, b: {val:"b2new",  meta : {cell : "b2"}}}
    ];
    let mappings = checkTable (expectedOrig, table, {});
    let expectedDst = [
        {a: {val: 1, meta: {cell : "a1"}}, b: {val:"b1new",  meta : {cell : "b1"},  id:mappings[1], dups:[mappings[2]]}},
        {a: {val: 1, meta: {cell : "a2"}}, b: {val:"b2new",  meta : {cell : "b2"}}, id:mappings[2], dups:[mappings[1]]}
    ];

    
    mtable.set([mappings[1]],COL_B, "b1new");
    mtable.set([mappings[2]],COL_B, "b2new");
    mtable.set([mappings[2]],COL_A, 1);

    let res = testee.inverse(mtable.freeze(), {table:tbl.freeze()});
    checkTable (expectedSrc, res.table, {});
    table = testee.calculate({table: res.table});
    checkTable (expectedDst, table, {}, testee.DUPLICATES);

    // test removing a row
    mtable = table.unfreeze();
    mtable.removeRow([mappings[2]]);
    let expected = [
        {a: {val: 1, meta: {cell : "a1"}}, b: {val:"b1new",  meta : {cell : "b1"},  id:mappings[1], dups:[]}},
    ];
    res = testee.inverse(mtable.freeze(), {table:res.table});
    checkTable (expected, res.table, {});
    table = testee.calculate({table: res.table});
    checkTable (expected, table, {}, testee.DUPLICATES);
});


test("Remove", () => {

    let testee = new ImmutablePk();
    let tbl = mkTable([1,2]);
    let table = testee.calculate({table : tbl.freeze()});
    let mtable = table.unfreeze();

    
    let expectedOrig = [
        {a: {val: 1, meta: {cell : "a1"}}, b: {val:"b1",  meta : {cell : "b1"}}},
        {a: {val: 2, meta: {cell : "a2"}}, b: {val:"b2",  meta : {cell : "b2"}}}
    ];
    let mappings = checkTable (expectedOrig, table, {});
    let expectedDst = [
        {a: {val: 1, meta: {cell : "a1"}}, b: {val:"b1",  meta : {cell : "b1"}}},
    ];

    
    mtable.removeRow([mappings[2]]);

    let res = testee.inverse(mtable.freeze(), {table:tbl.freeze()});
    checkTable (expectedDst, res.table, {});
    checkTable (expectedDst, testee.calculate({table: res.table}), {});
});
