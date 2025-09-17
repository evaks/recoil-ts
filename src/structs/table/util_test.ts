import assert from "node:assert/strict";
import test from "node:test";
import {UniqKeyGenerator, UniqueForeignKey} from "./util";
import {MutableTable, MutableTableRow, TableRow} from "./table";
import {ColumnKey} from "./columnkey";

test("unique key generator", () => {
    const PK = new ColumnKey<number>("pk");
    const VAL = new ColumnKey<string>("val");
    let table = new MutableTable([PK],[VAL]);

    table.addRow(TableRow.create([PK, 3], [VAL, "3"]));
    table.addRow(TableRow.create([PK, 4], [VAL, "4"]));
    table.addRow(TableRow.create([PK, 6], [VAL, "6"]));

    let testee = new UniqKeyGenerator(table);
    assert.equal(testee.nextPk(),0);
    assert.equal(testee.nextPk(),1);
    assert.equal(testee.nextPk(),2);
    assert.equal(testee.nextPk(),5);
    assert.equal(testee.nextPk(),7);

})

test("unique foriegn key generator", () => {
    const PK = new ColumnKey<number>("pk");
    const VAL = new ColumnKey<string>("val");
    let table = new MutableTable([PK],[VAL]);

    table.addRow(TableRow.create([PK, 3], [VAL, "3"]));
    table.addRow(TableRow.create([PK, 4], [VAL, "4"]));
    table.addRow(TableRow.create([PK, 6], [VAL, "6"]));

    let testee = new UniqueForeignKey(table, [
        {col:PK, options:[1,2, 3, 4, 5, 6]},
        {col:VAL, options:["1","2", "3", "4", "5", "6"]},
    ]);

    const setList = (pk:number) => {
        let r = testee.setList((table.getRow([pk]) as TableRow).unfreeze());
        return [r.getCellMeta(PK).list, r.getCellMeta(VAL).list]

    }
    function dup(l:number[]):[number[],string[]] {
        return [l,l.map(v => v.toString())];
    }
    assert.deepEqual(setList(3), dup([3,1,2,5]));
    assert.deepEqual(setList(4), dup([4,1,2,5]));
    assert.deepEqual(setList(6), dup([6,1,2,5]));


})