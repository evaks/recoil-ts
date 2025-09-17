import test from "node:test";
import {assertEquals, assertObjectEquals} from "../../test";
import {SwapUnion} from "./swap_union";
import {Frp} from "../../frp/frp";
import {MutableTable, MutableTableRow, Table, TableRow} from "./table";
import {ColumnKey} from "./columnkey";


let COL_A = new ColumnKey<number>("a");
let COL_B = new ColumnKey("b");
let COL_C = new ColumnKey("c");

function checkExpected(tbl:Table, expected:({r?: number, a?:any, b?:any, c?:any}|number)[]) {
    let i = 0;
    assertEquals("length", expected.length, tbl.size());
    for (let {row} of tbl) {
        let e = expected[i];
        if (typeof e !== "number") {
            assertEquals("A[" + i + "]", e.a === undefined ? e.r : e.a, row.get(COL_A));
            assertEquals("B[" + i + "]", e.b === undefined ? e.r : e.b, row.get(COL_B));
            assertEquals("C[" + i + "]", e.c === undefined ? e.r : e.c, row.get(COL_C));
        }
        else {
            assertEquals("A[" + i + "]", e, row.get(COL_A));
            assertEquals("B[" + i + "]", e, row.get(COL_B));
            assertEquals("C[" + i + "]", e, row.get(COL_C));
        }
        i++;
    }
}

test("WriteTable", () => {
    let tbl1 = new MutableTable([COL_A], [COL_B,COL_C]);
    let tbl2 = new MutableTable([COL_A], [COL_B,COL_C]);

    tbl1.setMeta({left:true});
    tbl1.setColumnMeta(COL_B, {left:true});
    tbl2.setMeta({right:true});
    tbl2.setColumnMeta(COL_B, {right:true});
    let p = 0;
    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow(p++);
        row.set(COL_A, val);
        row.set(COL_B, val);
        row.set(COL_C, val);
        tbl1.addRow(row);
    });

    p = 0;
    [-1,-2,-3,-4].forEach(function (val) {
        let row = new MutableTableRow(p++);
        row.set(COL_A, val);
        row.set(COL_B, val);
        row.set(COL_C, val);
        tbl2.addRow(row);
    });

    let chooser = (row:TableRow)=> {return row.get$(COL_A) < 0 ? 1 : 0;};
    let testee = new SwapUnion([COL_A], chooser);
    
    let expected = [1,2,3,4,-1,-2, -3,-4];
    let i = 0;
    let table = testee.calculate({tables: [ tbl1.freeze(), tbl2.freeze()]});

    assertObjectEquals({left: true, right : true}, table.getMeta());
    assertObjectEquals({left: true, right : true}, table.getColumnMeta(COL_B));
    assertEquals(expected.length, table.size());

    for (let {row} of table) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        assertEquals(expected[i], row.get(COL_C));
        i++;
    }

    let mtable = table.unfreeze();
    mtable.set([1], COL_C, 8);
    mtable.set([-1], COL_C, 8);

    let orig = testee.inverse(mtable.freeze(),{tables : [tbl1.freeze(),  tbl2.freeze()]});

    expected = [1,2,3,4];
    i = 0;
    assertEquals(expected.length, orig.tables[0].size());
    for (let {row} of orig.tables[0]) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        assertEquals(i == 0 ? 8 : expected[i], row.get(COL_C));
        i++;
    }


    checkExpected(orig.tables[1], [{c: 8, r: -1},-2,-3,-4]);


    // test swapping table
    mtable = table.unfreeze();
    mtable.set([1], COL_A, -8);
    mtable.set([-1], COL_A, 8);

    orig = testee.inverse(mtable.freeze(),{tables : [tbl1.freeze(), tbl2.freeze()]});

    checkExpected(orig.tables[0], [2,3,4,{a:8, r:-1}]); // goes to back because comes after last in src
    checkExpected(orig.tables[1], [{a:-8, r:1},-2,-3,-4]);

    table = testee.calculate({tables : [orig.tables[0], orig.tables[1]]});

    checkExpected(table, [{a:-8, r: 1}, 2,3,4,{a:8, r:-1},-2,-3,-4]); // goes to back because comes after last in src

    // check that the table comes back in the same order
});


test("Behaviour", () => {
    let tbl1 = new MutableTable([COL_A], [COL_B,COL_C]);
    let tbl2 = new MutableTable([COL_A], [COL_B,COL_C]);

    tbl1.setMeta({left:true});
    tbl1.setColumnMeta(COL_B, {left:true});
    tbl2.setMeta({right:true});
    tbl2.setColumnMeta(COL_B, {right:true});
    let p = 0;
    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow(p++);
        row.set(COL_A, val);
        row.set(COL_B, val);
        row.set(COL_C, val);
        tbl1.addRow(row);
    });

    p = 0;
    [-1,-2,-3,-4].forEach(function (val) {
        let row = new MutableTableRow(p++);
        row.set(COL_A, val);
        row.set(COL_B, val);
        row.set(COL_C, val);
        tbl2.addRow(row);
    });

    let chooser = (row:TableRow): number => {return row.get$(COL_A) < 0 ? 1 : 0;};
    let testee = new SwapUnion([COL_A], chooser);
    let frp = new Frp();
    let tbl1B = frp.createB(tbl1.freeze());
    let tbl2B = frp.createB(tbl2.freeze());
    let testeeB = SwapUnion.createB([COL_A], chooser, tbl1B,  tbl2B);

    frp.attach(testeeB);
    let expected = [1,2,3,4,-1,-2, -3,-4];
    let i = 0;

    frp.accessTrans(function () {
        let table = testeeB.get();
        assertObjectEquals({left: true, right : true}, table.getMeta());
        assertObjectEquals({left: true, right : true}, table.getColumnMeta(COL_B));
        assertEquals(expected.length, table.size());

        for (let {row} of table) {
            assertEquals(expected[i], row.get(COL_A));
            assertEquals(expected[i], row.get(COL_B));
            assertEquals(expected[i], row.get(COL_C));
            i++;
        }

        let mtable = table.unfreeze();
        mtable.set([1], COL_C, 8);
        mtable.set([-1], COL_C, 8);

        testeeB.set(mtable.freeze());
        
    }, testeeB);

    frp.accessTrans(function () {
        checkExpected(tbl1B.get(), [{c: 8, r: 1},2,3,4]);
        checkExpected(tbl2B.get(), [{c: 8, r: -1},-2,-3,-4]);

        let table = testeeB.get();

        let mtable = table.unfreeze();
        mtable.set([1], COL_A, -8);
        mtable.set([-1], COL_A, 8);
        // test swapping table
        testeeB.set(mtable.freeze());
    }, tbl1B, tbl2B, testeeB);


    frp.accessTrans(function () {
        checkExpected(tbl1B.get(), [2,3,4,{a:8, r:-1, c:8}]); // goes to back because comes after last in src
        checkExpected(tbl2B.get(), [{a:-8, r:1, c: 8},-2,-3,-4]);

        let table = testeeB.get();

        checkExpected(table, [{a:-8, r: 1, c: 8}, 2,3,4,{a:8, r:-1, c:8},-2,-3,-4]); // goes to back because comes after last in src
    }, tbl1B, tbl2B, testeeB);
    // check that the table comes back in the same order
});



