import test from "node:test";
import {assertEquals, assertObjectEquals, assertThrows} from "../../test";
import {Join} from "./join";
import {MutableTable, MutableTableRow, TableRow} from "./table";
import {ColumnKey} from "./columnkey";

const COL_A = new ColumnKey("a");
const COL_B = new ColumnKey("b");
const COL_C = new ColumnKey<number>("c");
const COL_D = new ColumnKey<number>("d");
const COL_E = new ColumnKey("e");

function valGetter<T> (key:ColumnKey<T>):(row:TableRow) => T {
    return (row:TableRow):T => {
        return row.get$(key) ;
    };
}

function valSub1Getter (key:ColumnKey<number>):(row:TableRow) => number {
    return function (row:TableRow) {
        return row.get$(key) - 1;
    };
}


test("OuterJoin", () => {
    let leftTbl = new MutableTable([COL_A], [COL_B]);
    let rightTbl = new MutableTable([COL_D], [COL_E]);
    let defaults = new MutableTableRow();
    defaults.set(COL_D, -1);
    defaults.set(COL_E, -2);
    
    
    leftTbl.setMeta({left:true});
    rightTbl.setMeta({right:true});
    leftTbl.setColumnMeta(COL_B, {left : true});
    rightTbl.setColumnMeta(COL_E, {right : true});

    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, val);
        row.set(COL_B, val);
        
        leftTbl.addRow(row);

        row = new MutableTableRow();
        row.set(COL_D, val + 1);
        row.set(COL_E, val + 1);
        rightTbl.addRow(row);
    });

    let testee = new Join(valGetter(COL_A), valGetter(COL_D), undefined, defaults.freeze());

    
    let expected:any[] = [1, 2,3,4];
    let i = 0;
    let table = testee.calculate({left : leftTbl.freeze(), right : rightTbl.freeze()});

    assertObjectEquals({left: true, right: true}, table.getMeta());
    assertObjectEquals({left: true}, table.getColumnMeta(COL_B));
    assertObjectEquals({right: true}, table.getColumnMeta(COL_E));
    assertEquals(expected.length, table.size());

    for (let {row} of table) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        if (i === 0) {
            assertEquals(-1, row.get(COL_D));
            assertEquals(-2, row.get(COL_E));
        }
        else {
            assertEquals(expected[i], row.get(COL_D));
            assertEquals(expected[i], row.get(COL_E));
        }
        i++;
    }

    let mtable = table.unfreeze();

    
    mtable.set([2], COL_B, 8);
    mtable.set([2], COL_E, 9);

    let orig = testee.inverse(mtable.freeze(),{left : leftTbl.freeze(), right: rightTbl.freeze()});

    expected = [{a: 1, b: 1} ,{a : 2, b: 8}, {a : 3, b : 3}, {a : 4, b : 4}];
    i = 0;
    assertEquals(expected.length, orig.left.size());
    for (let {row} of orig.left) {
        assertEquals(expected[i].a, row.get(COL_A));
        assertEquals(expected[i].b, row.get(COL_B));
        i++;
    }

    expected = [{d: 2, e: 9} ,{d : 3, e: 3}, {d : 4, e : 4}, {d : 5, e : 5}];
    i = 0;
    assertEquals(expected.length, orig.right.size());
    for (let {row} of orig.right) {
        assertEquals(expected[i].d, row.get(COL_D));
        assertEquals(expected[i].e, row.get(COL_E));
        i++;
    }
    return;
    
    
});

test("ExtraRowJoin", () => {
    let leftTbl = new MutableTable([COL_A], [COL_B]);
    let rightTbl = new MutableTable([COL_D], [COL_E]);

    leftTbl.setMeta({left:true});
    rightTbl.setMeta({right:true});
    leftTbl.setColumnMeta(COL_B, {left : true});
    rightTbl.setColumnMeta(COL_E, {right : true});

    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, val);
        row.set(COL_B, val);
        
        leftTbl.addRow(row);

        row = new MutableTableRow();
        row.set(COL_D, val + 1);
        row.set(COL_E, val + 1);
        rightTbl.addRow(row);
    });

    let testee = new Join(valGetter(COL_A), valGetter(COL_D));

    
    let expected:any[] = [2,3,4];
    let i = 0;
    let table = testee.calculate({left : leftTbl.freeze(), right : rightTbl.freeze()});

    assertObjectEquals({left: true, right: true}, table.getMeta());
    assertObjectEquals({left: true}, table.getColumnMeta(COL_B));
    assertObjectEquals({right: true}, table.getColumnMeta(COL_E));
    assertEquals(expected.length, table.size());

    for (let {row} of table) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        assertEquals(expected[i], row.get(COL_D));
        assertEquals(expected[i], row.get(COL_E));
        i++;
    }

    let mtable = table.unfreeze();

    
    mtable.set([2], COL_B, 8);
    mtable.set([2], COL_E, 9);

    let orig = testee.inverse(mtable.freeze(),{left : leftTbl.freeze(), right: rightTbl.freeze()});

    expected = [{a: 1, b: 1} ,{a : 2, b: 8}, {a : 3, b : 3}, {a : 4, b : 4}];
    i = 0;
    assertEquals(expected.length, orig.left.size());
    for (let {row} of orig.left) {
        assertEquals(expected[i].a, row.get(COL_A));
        assertEquals(expected[i].b, row.get(COL_B));
        i++;
    }

    expected = [{d: 2, e: 9} ,{d : 3, e: 3}, {d : 4, e : 4}, {d : 5, e : 5}];
    i = 0;
    assertEquals(expected.length, orig.right.size());
    for (let {row} of orig.right) {
        assertEquals(expected[i].d, row.get(COL_D));
        assertEquals(expected[i].e, row.get(COL_E));
        i++;
    }
});

test("SimpleJoin", () => {
    let leftTbl = new MutableTable([COL_A], [COL_B]);
    let rightTbl = new MutableTable([COL_D], [COL_E]);

    leftTbl.setMeta({left:true});
    rightTbl.setMeta({right:true});
    leftTbl.setColumnMeta(COL_B, {left : true});
    rightTbl.setColumnMeta(COL_E, {right : true});

    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, val);
        row.set(COL_B, val);
        
        leftTbl.addRow(row);

        row = new MutableTableRow();
        row.set(COL_D, val + 1);
        row.set(COL_E, val + 1);
        rightTbl.addRow(row);
    });

    let testee = new Join(valGetter(COL_A), valSub1Getter(COL_D));


    
    let expected:any[] = [1,2,3,4];
    let i = 0;
    let table = testee.calculate({left : leftTbl.freeze(), right : rightTbl.freeze()});

    assertObjectEquals({left: true, right: true}, table.getMeta());
    assertObjectEquals({left: true}, table.getColumnMeta(COL_B));
    assertObjectEquals({right: true}, table.getColumnMeta(COL_E));
    assertEquals(expected.length, table.size());

    for (let {row} of table) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        assertEquals(expected[i] + 1, row.get(COL_D));
        assertEquals(expected[i] + 1, row.get(COL_E));
        i++;
    }

    let mtable = table.unfreeze();
    mtable.set([2], COL_B, 8);
    mtable.set([2], COL_E, 9);

    let orig = testee.inverse(mtable.freeze(),{left : leftTbl.freeze(), right: rightTbl.freeze()});

    expected = [{a: 1, b: 1} ,{a : 2, b: 8}, {a : 3, b : 3}, {a : 4, b : 4}];
    i = 0;
    assertEquals(expected.length, orig.left.size());
    for (let {row} of orig.left) {
        assertEquals(expected[i].a, row.get(COL_A));
        assertEquals(expected[i].b, row.get(COL_B));
        i++;
    }

    expected = [{d: 2, e: 2} ,{d : 3, e: 9}, {d : 4, e : 4}, {d : 5, e : 5}];
    i = 0;
    assertEquals(expected.length, orig.right.size());
    for (let {row} of orig.right) {
        assertEquals(expected[i].d, row.get(COL_D));
        assertEquals(expected[i].e, row.get(COL_E));
        i++;
    }
});


test("MultiRowJoin", () => {
    let leftTbl = new MutableTable([COL_A], [COL_B]);
    let rightTbl = new MutableTable([COL_C, COL_D], [COL_E]);
    
    leftTbl.setColumnMeta(COL_B, {left : true});
    rightTbl.setColumnMeta(COL_E, {right : true});

    [1,2,3,4].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, val);
        row.set(COL_B, val);
        
        leftTbl.addRow(row);

        row = new MutableTableRow();
        row.set(COL_C, val + 1);
        row.set(COL_D, val + 1);
        row.set(COL_E, val + 1);
        rightTbl.addRow(row);

        row = new MutableTableRow();
        row.set(COL_C, val + 1);
        row.set(COL_D, val + 2);
        row.set(COL_E, val + 2);
        rightTbl.addRow(row);
    });

    let testee = new Join(valGetter(COL_A), valSub1Getter(COL_C),[COL_D]);
    
    let expected :any[]= [1,1,2,2,3,3,4,4];
    let i = 0;
    let table = testee.calculate({left: leftTbl.freeze(), right: rightTbl.freeze()});

    assertObjectEquals({left: true}, table.getColumnMeta(COL_B));
    assertObjectEquals({right: true}, table.getColumnMeta(COL_E));

    assertEquals(expected.length, table.size());
    for (let {row} of table) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        assertEquals(expected[i] + 1, row.get(COL_C));
        assertEquals(expected[i] + 1 + (i % 2), row.get(COL_D));
        assertEquals(expected[i] + 1 + (i % 2), row.get(COL_E));
        i++;
    }

    let mtable = table.unfreeze();

    
    mtable.set([2,3], COL_B, 8);
    mtable.set([2,4], COL_B, 8);
    mtable.set([2,3], COL_E, 9);
    mtable.set([2,4], COL_E, 10);

    let orig = testee.inverse(mtable.freeze(),{left:leftTbl.freeze(),right: rightTbl.freeze()});

    expected = [{a: 1, b: 1} ,{a : 2, b: 8}, {a : 3, b : 3}, {a : 4, b : 4}];
    i = 0;
    assertEquals(expected.length, orig.left.size());
    for (let {row} of orig.left) {
        assertEquals(expected[i].a, row.get(COL_A));
        assertEquals(expected[i].b, row.get(COL_B));
        i++;
    }

    expected = [{c: 2, d: 2, e: 2}, {c: 2, d: 3, e: 3},
                {c: 3, d: 3, e: 9}, {c: 3, d: 4, e: 10},
                {c: 4, d: 4, e: 4}, {c: 4, d: 5, e: 5},
                {c: 5, d: 5, e: 5}, {c: 5, d: 6, e: 6}];
    i = 0;
    assertEquals(expected.length, orig.right.size());
    for (let {row} of orig.right) {
        assertEquals("row " + i + " d ",expected[i].d, row.get(COL_D));
        assertEquals("row " + i + " e ",expected[i].e, row.get(COL_E));
        i++;
    }
});

test("SameRight", () => {
    let leftTbl = new MutableTable([COL_A], [COL_B]);
    let rightTbl = new MutableTable([COL_D], [COL_C]);
    
    [1,2].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_A, val);
        row.set(COL_B, 1);
        
        leftTbl.addRow(row);
    });

    [1,2].forEach(function (val) {
        let row = new MutableTableRow();
        row.set(COL_C, 1);
        row.set(COL_D, val);
        rightTbl.addRow(row);
    });

    let testee = new Join(valGetter(COL_B), valGetter(COL_C),[COL_D]);
    
    let expected: any[] = [
        {a : 1, c : 1, d : 1},
        {a : 1, c : 1, d : 2},
        {a : 2, c : 1, d : 1},
        {a : 2, c : 1, d : 2}];

    let i = 0;
    let table = testee.calculate({left: leftTbl.freeze(),right: rightTbl.freeze()});

    assertEquals(expected.length, table.size());
    for (let {row} of table) {
        assertEquals("row " + i +  " a",expected[i].a, row.get(COL_A));
        assertEquals("row " + i +  " c",expected[i].c, row.get(COL_C));
        assertEquals("row " + i +  " d",expected[i].d, row.get(COL_D));

        i++;
    }

    let mtable = table.unfreeze();

    
    mtable.set([2,1], COL_C, 8);
    // we have an another row we need to set otherwise it will not know which to filter
    assertThrows (function () {
        testee.inverse(mtable.freeze(),{left:leftTbl.freeze(),right: rightTbl.freeze()});
    });
    mtable.set([1,1], COL_C, 8);

    let orig = testee.inverse(mtable.freeze(),{left:leftTbl.freeze(),right: rightTbl.freeze()});

    expected = [{a: 1, b: 1} ,{a : 2, b: 1}];
    i = 0;
    assertEquals(expected.length, orig.left.size());
    for (let {row} of orig.left) {
        assertEquals(expected[i].a, row.get(COL_A));
        assertEquals(expected[i].b, row.get(COL_B));
        i++;
    }

    expected = [{c: 8, d: 1}, {c: 1, d: 2}];
    i = 0;
    assertEquals(expected.length, orig.right.size());
    for (let {row} of orig.right) {
        assertEquals("row " + i + " d ",expected[i].d, row.get(COL_D));
        assertEquals("row " + i + " c ",expected[i].c, row.get(COL_C));
        i++;
    }
});
