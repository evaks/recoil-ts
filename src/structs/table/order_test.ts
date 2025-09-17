import test from "node:test";
import {MutableTable, MutableTableRow, TableRow} from "./table";
import {ColumnKey} from "./columnkey";
import {Order} from "./order";
import {assertEquals} from "../../test";

test("order", () => {
    const COL_A = new ColumnKey<number>("a");
    const COL_B = new ColumnKey<number>("b");

    let r1 = TableRow.createOrdered(1, [COL_A, 1], [COL_B, 1]);
    let r2 = TableRow.createOrdered(2, [COL_A, 2], [COL_B, 2]);
    let r3 = TableRow.createOrdered(3, [COL_A, 3], [COL_B, 3]);
    let table = new MutableTable([COL_A], [COL_B]);

    [r3, r2, r1].forEach( r => table.addRow(r));



    let testee = new Order();
    testee.rememberStart([COL_A])
    testee.remember(r3);
    testee.remember(r1);

    let i = 0;
    let expected = [1,2,3];
    for(let {row} of table) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        i++;
    }

    [r3,r2, r1].forEach(r => testee.addRow(r));

    let table2 = new MutableTable([COL_A], [COL_B]);
    testee.apply(table2);
    i = 0;
    expected = [3,1,2];
    for(let {row} of table2) {
        assertEquals(expected[i], row.get(COL_A));
        assertEquals(expected[i], row.get(COL_B));
        i++;
    }
})