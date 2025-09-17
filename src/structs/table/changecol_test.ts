import test from "node:test"
import {ColumnKey} from "./columnkey";
import {assertEquals, assertObjectEquals} from "../../test";
import {ChangeCol, ChangeColType, ChangeType} from "./changecol";
import {MutableTable, MutableTableRow, TableInterface} from "./table";
import {Frp} from "../../frp/frp";

const COL_A = new ColumnKey<number>("a");
const COL_B = new ColumnKey("b");
const COL_PK = new ColumnKey("pk");
const COL_C = new ColumnKey<ChangeColType>("change");

const ADD = ChangeType.ADD;
const CHANGE = ChangeType.CHANGE;
const DELETE = ChangeType.DELETE;
const NONE = ChangeType.NONE;


function checkTable(expected: any[], table: TableInterface, changeCol:ColumnKey<any>    ):{[key:number]:any} {
    assertEquals(expected.length, table.size());
    if (changeCol) {
        assertObjectEquals({col: true}, table.getColumnMeta(changeCol));
    }
    let mappings:{[key:number]:any} = {};
    let pos = 0;
    for (let {row: tblRow, key: keys} of table) {
        let row = expected[pos];
        assertEquals("a.value [" + pos + "]", row.a.val, tblRow.get(COL_A));
        assertEquals("b.value [" + pos + "]", row.b.val, tblRow.get(COL_B));
        assertObjectEquals("a.meta [" + pos + "]", row.a.meta, tblRow.getCellMeta(COL_A));
        assertObjectEquals("b.meta [" + pos + "]", row.b.meta, tblRow.getCellMeta(COL_B));

        if (changeCol) {
            assertObjectEquals("c.value [" + pos + "]", row.c.val, tblRow.get(changeCol));
        }
        if (row.rowMeta) {
            assertObjectEquals("rowMeta [" + pos + "]", row.rowMeta, tblRow.getRowMeta());
        }
        mappings[tblRow.get(COL_A) as number] = keys[0];
        pos++;
    }
    // map from origkey to immutable key
    return mappings;
}

function mkTable(rows: number[], orig: boolean): MutableTable {
    let tbl = orig ? new MutableTable([COL_A], [COL_B]) :
        new MutableTable([COL_PK], [COL_A, COL_B]);
    tbl.setMeta({tableMeta: true});

    tbl.setColumnMeta(COL_A, {meta: "a", position: 1});
    tbl.setColumnMeta(COL_B, {meta: "b", position: 2});

    let pos = 0;

    let genRow = function (val:number) {
        let row = new MutableTableRow(pos++);
        row.set(COL_PK, pos - 1);
        row.set(COL_A, val);
        row.setCellMeta(COL_A, {cell: "a" + val});
        row.set(COL_B, "b" + val);
        row.setCellMeta(COL_B, {cell: "b" + val});
        tbl.addRow(row);
    };
    rows.forEach(genRow);
    return tbl;
}

test("AddedRow", () => {
    let frp = new Frp();

    let origB = frp.createB(mkTable([1, 3, 4], true).freeze());
    let newB = frp.createB(mkTable([1, 2, 3, 4], false).freeze());
    let testeeB = ChangeCol.createB(newB, origB, COL_C, {col: true}, {del: true});

    frp.attach(testeeB);


    let expected = [
        {
            a: {val: 1, meta: {cell: "a1"}}, b: {val: "b1", meta: {cell: "b1"}},
            c: {val: {changes: new Map(), type: NONE}}
        },
        {
            a: {val: 3, meta: {cell: "a3"}}, b: {val: "b3", meta: {cell: "b3"}},
            c: {val: {changes: new Map(), type: NONE}}
        },
        {
            a: {val: 4, meta: {cell: "a4"}}, b: {val: "b4", meta: {cell: "b4"}},
            c: {val: {changes: new Map(), type: NONE}}
        },
        {
            a: {val: 2, meta: {cell: "a2"}}, b: {val: "b2", meta: {cell: "b2"}},
            c: {val: {changes: new Map(), type: ADD}}
        }
    ];
    let mappings:{[key:number]:any} = {};
    frp.accessTrans(function () {
        let table = testeeB.get();
        assertObjectEquals({tableMeta: true}, table.getMeta());
        mappings = checkTable(expected, table, COL_C);
        let mtable = table.unfreeze();
        mtable.set([mappings[2]], COL_B, "b2new");
        testeeB.set(mtable.freeze());
    }, testeeB);


    expected = [
        {
            a: {val: 1, meta: {cell: "a1"}}, b: {val: "b1", meta: {cell: "b1"}},
            c: {val: {changes: new Map(), type: NONE}}
        },
        {
            a: {val: 3, meta: {cell: "a3"}}, b: {val: "b3", meta: {cell: "b3"}},
            c: {val: {changes: new Map(), type: NONE}}
        },
        {
            a: {val: 4, meta: {cell: "a4"}}, b: {val: "b4", meta: {cell: "b4"}},
            c: {val: {changes: new Map(), type: NONE}}
        },
        {
            a: {val: 2, meta: {cell: "a2"}}, b: {val: "b2new", meta: {cell: "b2"}},
            c: {val: {changes: new Map(), type: ADD}}
        }
    ];

    frp.accessTrans(function () {
        let table = testeeB.get();
        assertObjectEquals({tableMeta: true}, table.getMeta());
        mappings = checkTable(expected, table, COL_C);

        // now add a new duplicate key directly to newB
        let mtable = mkTable([1, 2, 3, 4, 2], false);
        mtable.set([1], COL_B, "b2new");
        newB.set(mtable.freeze());
    }, testeeB, newB);

    expected = [
        {
            a: {val: 1, meta: {cell: "a1"}}, b: {val: "b1", meta: {cell: "b1"}},
            c: {val: {changes: new Map(), type: NONE}}
        },
        {
            a: {val: 3, meta: {cell: "a3"}}, b: {val: "b3", meta: {cell: "b3"}},
            c: {val: {changes: new Map(), type: NONE}}
        },
        {
            a: {val: 4, meta: {cell: "a4"}}, b: {val: "b4", meta: {cell: "b4"}},
            c: {val: {changes: new Map(), type: NONE}}
        },
        {
            a: {val: 2, meta: {cell: "a2"}}, b: {val: "b2new", meta: {cell: "b2"}},
            c: {val: {changes: new Map(), type: ADD}}
        },
        {
            a: {val: 2, meta: {cell: "a2"}}, b: {val: "b2", meta: {cell: "b2"}},
            c: {val: {changes: new Map(), type: ADD}}
        }
    ];

    frp.accessTrans(function () {
        let table = testeeB.get();
        assertObjectEquals({tableMeta: true}, table.getMeta());
        checkTable(expected, table, COL_C);

        // now change an existing row to a new row key
        let mtable = table.unfreeze();
        mtable.set([mappings[1]], COL_A, 2);
        testeeB.set(mtable.freeze());
    }, testeeB, newB);

    let changes = new Map<ColumnKey<any>,any>();
    changes.set(COL_A,1);
    expected = [
        {
            a: {val: 2, meta: {cell: "a1"}}, b: {val: "b1", meta: {cell: "b1"}},
            c: {val: {changes: changes, type: CHANGE}}
        },
        {
            a: {val: 3, meta: {cell: "a3"}}, b: {val: "b3", meta: {cell: "b3"}},
            c: {val: {changes: new Map(), type: NONE}}
        },
        {
            a: {val: 4, meta: {cell: "a4"}}, b: {val: "b4", meta: {cell: "b4"}},
            c: {val: {changes: new Map(), type: NONE}}
        },
        {
            a: {val: 2, meta: {cell: "a2"}}, b: {val: "b2new", meta: {cell: "b2"}},
            c: {val: {changes: new Map(), type: ADD}}
        },
        {
            a: {val: 2, meta: {cell: "a2"}}, b: {val: "b2", meta: {cell: "b2"}},
            c: {val: {changes: new Map(), type: ADD}}
        }
    ];

    frp.accessTrans(function () {
        let table = testeeB.get();
        assertObjectEquals({tableMeta: true}, table.getMeta());
        checkTable(expected, table, COL_C);
    }, testeeB, newB);

});

test("ChangeRow", () => {
    let frp = new Frp();

    let origB = frp.createB(mkTable([1, 2], true).freeze());
    let mtable = mkTable([1, 2], false);
    mtable.set([0], COL_B, "b1new");
    let newB = frp.createB(mtable.freeze());
    let testeeB = ChangeCol.createB(newB, origB, COL_C, {col: true}, {del: true});

    frp.attach(testeeB);


    let changes = new Map<ColumnKey<any>,any>();
    changes.set(COL_B,"b1");
    let expected = [
        {
            a: {val: 1, meta: {cell: "a1"}}, b: {val: "b1new", meta: {cell: "b1"}},
            c: {val: {changes: changes, type: CHANGE}}
        },
        {
            a: {val: 2, meta: {cell: "a2"}}, b: {val: "b2", meta: {cell: "b2"}},
            c: {val: {changes: new Map(), type: NONE}}
        }
    ];
    let mappings:{[key:number]:any};
    frp.accessTrans(function () {
        let table = testeeB.get();
        assertObjectEquals({tableMeta: true}, table.getMeta());
        mappings = checkTable(expected, table, COL_C);
        let mtable = table.unfreeze();
        mtable.set([0], COL_B, "b1new.1");
        testeeB.set(mtable.freeze());
    }, testeeB);

    expected = [
        {
            a: {val: 1, meta: {cell: "a1"}}, b: {val: "b1new.1", meta: {cell: "b1"}},
            c: {val: {changes: changes, type: CHANGE}}
        },
        {
            a: {val: 2, meta: {cell: "a2"}}, b: {val: "b2", meta: {cell: "b2"}},
            c: {val: {changes: new Map(), type: NONE}}
        }
    ];

    frp.accessTrans(function () {
        let table = testeeB.get();
        assertObjectEquals({tableMeta: true}, table.getMeta());
        checkTable(expected, table, COL_C);
        let mtable = table.unfreeze();
        // duplicate primary key
        mtable.set([0], COL_A, 2);
        testeeB.set(mtable.freeze());

    }, testeeB, newB);

    changes = new Map<ColumnKey<any>,any>();
    changes.set(COL_B, "b1");
    changes.set(COL_A, 1);

    expected = [
        {
            a: {val: 2, meta: {cell: "a1"}}, b: {val: "b1new.1", meta: {cell: "b1"}},
            c: {val: {changes: changes, type: CHANGE}}
        },
        {
            a: {val: 2, meta: {cell: "a2"}}, b: {val: "b2", meta: {cell: "b2"}},
            c: {val: {changes: new Map(), type: NONE}}
        }
    ];

    frp.accessTrans(function () {
        let table = testeeB.get();
        assertObjectEquals({tableMeta: true}, table.getMeta());
        checkTable(expected, table, COL_C);
        /*
        let mtable = table.unfreeze();
        // duplicate primary key
        mtable.set([0], COL_A, 2);
        testeeB.set(mtable.freeze());*/

    }, testeeB, newB);

});

test("ChangeDelete", () => {
    let frp = new Frp();

    let origB = frp.createB(mkTable([1, 2, 3], true).freeze());
    let mtable = mkTable([1, 2], false);
    let newB = frp.createB(mtable.freeze());
    let testeeB = ChangeCol.createB(newB, origB, COL_C, {col: true}, {del: true});

    frp.attach(testeeB);


    let changes = new Map<ColumnKey<any>,any>();
    changes.set(COL_B,"b1");
    let expected = [
        {
            a: {val: 1, meta: {cell: "a1"}}, b: {val: "b1", meta: {cell: "b1"}},
            c: {val: {changes: new Map(), type: NONE}}
        },
        {
            a: {val: 2, meta: {cell: "a2"}}, b: {val: "b2", meta: {cell: "b2"}},
            c: {val: {changes: new Map(), type: NONE}}
        },
        {
            a: {val: 3, meta: {cell: "a3"}}, b: {val: "b3", meta: {cell: "b3"}},
            c: {val: {changes: new Map(), type: DELETE}, rowMeta: {del: true}}
        }

    ];
    let mappings:{[key:number]:any} ;
    frp.accessTrans(function () {
        let table = testeeB.get();
        assertObjectEquals({tableMeta: true}, table.getMeta());
        mappings = checkTable(expected, table, COL_C);
    }, testeeB);
});
