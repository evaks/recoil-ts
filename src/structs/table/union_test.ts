import test from "node:test";
import {assertEquals, assertObjectEquals} from "../../test";
import {MutableTable, MutableTableRow, TableRowInterface} from "./table";
import {ColumnKey} from "./columnkey";
import {Union} from "./union";

let COL_A = new ColumnKey<any>("a");
let COL_B = new ColumnKey("b");
let COL_C = new ColumnKey("c");

test("UniqueKey", () => {
    let tbl1 = new MutableTable([COL_A], [COL_B,COL_C]);
    let tbl2 = new MutableTable([COL_A], [COL_B,COL_C]);

    tbl1.setMeta({left:true});
    tbl1.setColumnMeta(COL_B, {left:true});
    tbl2.setMeta({right:true});
    tbl2.setColumnMeta(COL_B, {right:true});
    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, val);
        row.set(COL_B, val);
        row.set(COL_C, val);
        tbl1.addRow(row);
    });

    [5,6,7,8].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, val);
        row.set(COL_B, val);
        row.set(COL_C, val);
        tbl2.addRow(row);
    });

    let testee = new Union(true,false);
    
    let expected = [1,2,3,4,5,6,7,8];
    let i = 0;
    let table = testee.calculate({table1 : tbl1.freeze(), table2 : tbl2.freeze()});

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
    mtable.set([5], COL_C, 8);

    let orig = testee.inverse(mtable.freeze(),{table1 : tbl1.freeze(), table2: tbl2.freeze()});

    expected = [1,2,3,4];
    i = 0;
    assertEquals(expected.length, orig.table1.size());
    for (let {row} of orig.table1) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        assertEquals(i == 0 ? 8 : expected[i], row.get(COL_C));
        i++;
    }


    expected = [5,6,7,8];
    i = 0;
    assertEquals(expected.length, orig.table2.size());
    for (let {row} of orig.table2) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        assertEquals(i == 0 ? 8 : expected[i], row.get(COL_C));
        i++;
    }
    
});


test("ConcatKey", () => {
    let tbl1 = new MutableTable([COL_A], [COL_B,COL_C]);
    let tbl2 = new MutableTable([COL_A], [COL_B,COL_C]);
    let srcCol =  new ColumnKey<number[]|null>('$src', undefined, undefined,  null);
    tbl1.setMeta({left:true});
    tbl1.setColumnMeta(COL_B, {left:true});
    tbl2.setMeta({right:true});
    tbl2.setColumnMeta(COL_B, {right:true});
    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, val + '');
        row.set(COL_B, val);
        row.set(COL_C, val);
        tbl1.addRow(row);
    });

    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, val + '');
        row.set(COL_B, val);
        row.set(COL_C, val);
        tbl2.addRow(row);
    });

    let testee = new Union(true,false, srcCol, [':0',':1']);
    
    let expected:({v:number,k:string, c?:any})[] = [
        {v: 1, k: '1:0'},{v: 1, k: '1:1'},
        {v: 2, k: '2:0'},{v: 2, k: '2:1'},
        {v: 3, k: '3:0'},{v: 3, k: '3:1'},
        {v: 4, k: '4:0'},{v: 4, k: '4:1'}];
    let i = 0;
    let table = testee.calculate({table1 : tbl1.freeze(), table2 : tbl2.freeze()});

    assertObjectEquals({left: true, right : true}, table.getMeta());
    assertObjectEquals({left: true, right : true}, table.getColumnMeta(COL_B));
    assertEquals(expected.length, table.size());

    for(let {row} of table) {
        assertEquals(expected[i].k, row.get(COL_A));
        assertEquals(expected[i].v, row.get(COL_B));
        assertEquals(expected[i].v, row.get(COL_C));
        i++;
    }

    let mtable = table.unfreeze();
    mtable.set(['1:0'], COL_C, 7);
    mtable.set(['1:1'], COL_C, 8);

    let orig = testee.inverse(mtable.freeze(),{table1 : tbl1.freeze(), table2: tbl2.freeze()});

    expected = [
        {v: 1, k: '1', c: 7},
        {v: 2, k: '2'},
        {v: 3, k: '3'},
        {v: 4, k: '4'}];
    i = 0;
    let checkExpected = function (row:TableRowInterface) {
        assertEquals(expected[i].k, row.get(COL_A));
        assertEquals(expected[i].v, row.get(COL_B));
        if (expected[i].c) {
            assertEquals(expected[i].c, row.get(COL_C));
        }
        else {
            assertEquals(expected[i].v, row.get(COL_C));
        }
        i++;
    };
    assertEquals(expected.length, orig.table1.size());
    for(let {row} of orig.table1) {checkExpected(row)};

    expected = [
        {v: 1, k: '1', c: 8},
        {v: 2, k: '2'},
        {v: 3, k: '3'},
        {v: 4, k: '4'}];
    i = 0;
    assertEquals(expected.length, orig.table2.size());
    for(let {row} of orig.table2) {checkExpected(row)};
    
});

test("RemoveDupes", () => {
    let tbl1 = new MutableTable([COL_A], [COL_B,COL_C]);
    let tbl2 = new MutableTable([COL_A], [COL_B,COL_C]);

    tbl1.setMeta({left:true});
    tbl1.setColumnMeta(COL_B, {left:true});
    tbl2.setMeta({right:true});
    tbl2.setColumnMeta(COL_B, {right:true});
    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, val);
        row.set(COL_B, val);
        row.set(COL_C, val);
        tbl1.addRow(row);
    });

    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, val);
        row.set(COL_B, val);
        row.set(COL_C, val);
        tbl2.addRow(row);
    });

    let testee = new Union(true,true);
    
    let expected = [1,2,3,4];
    let i = 0;
    let table = testee.calculate({table1 : tbl1.freeze(), table2 : tbl2.freeze()});

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

    let orig = testee.inverse(mtable.freeze(),{table1 : tbl1.freeze(), table2: tbl2.freeze()});

    expected = [1,2,3,4];
    i = 0;
    assertEquals(expected.length, orig.table1.size());
    for (let {row} of orig.table1) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        assertEquals(i == 0 ? 8 : expected[i], row.get(COL_C));
        i++;
    }


    i = 0;
    assertEquals(expected.length, orig.table2.size());
    for (let {row} of orig.table2) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        assertEquals(i == 0 ? 8 : expected[i], row.get(COL_C));
        i++;
    }
    
});

test("AllowDupes", () => {
    let tbl1 = new MutableTable([COL_A], [COL_B,COL_C]);
    let tbl2 = new MutableTable([COL_A], [COL_B,COL_C]);

    tbl1.setMeta({left:true});
    tbl1.setColumnMeta(COL_B, {left:true});
    tbl2.setMeta({right:true});
    tbl2.setColumnMeta(COL_B, {right:true});
    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, val);
        row.set(COL_B, val);
        row.set(COL_C, val);
        tbl1.addRow(row);
    });

    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, val);
        row.set(COL_B, val);
        row.set(COL_C, val);
        tbl2.addRow(row);
    });

    let testee = new Union(false, false);
    
    let expected = [1,2,3,4,1,2,3,4];
    let i = 0;
    let table = testee.calculate({table1 : tbl1.freeze(), table2 : tbl2.freeze()});

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
    mtable.set([0], COL_C, 8);
    mtable.set([4], COL_C, 10);

    let orig = testee.inverse(mtable.freeze(),{table1 : tbl1.freeze(), table2: tbl2.freeze()});

    expected = [1,2,3,4];
    i = 0;
    assertEquals(expected.length, orig.table1.size());
    for (let {row} of orig.table1) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        assertEquals(i == 0 ? 8 : expected[i], row.get(COL_C));
        i++;
    }


    i = 0;
    assertEquals(expected.length, orig.table2.size());
    for (let {row} of orig.table2) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        assertEquals(i == 0 ? 10 : expected[i], row.get(COL_C));
        i++;
    }
    
});


