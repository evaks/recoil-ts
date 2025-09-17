import assert from "node:assert/strict";
import test from "node:test";
import {ColumnKey} from "./columnkey";
import {CalcTable} from "./calc";
import {StructType} from "../../frp/struct";
import {MutableTable, MutableTableRow, Table} from "./table";
import {isEqual} from "../../util/object";


const COLS = {
    x_p : new ColumnKey("x_p"),
    x : new ColumnKey("x"),
    y : new ColumnKey("y"),
    z : new ColumnKey("z")
} as StructType

function makeTable(raw:StructType[]) {
    let pks:ColumnKey<any>[] = [];
    let other = [];
 

    let row = raw[0];
    for (let k in row) {
        if (k.endsWith('_p')) {
            pks.push(COLS[k]);
        }
        else {
            other.push(COLS[k]);
        }
    }
    
    let res  = new MutableTable(pks, other);
    for (let i = 0; i < raw.length; i++) {
        row = raw[i];
        let newRow = new MutableTableRow();
        for (let k in row) {
            newRow.set(COLS[k], row[k]);
        }
        res.addRow(newRow);
    }    
    return res.freeze(); 
}

function checkTable (expected:StructType[], table:Table, ...misssing:ColumnKey<any>[]) {
    let expectedTable = makeTable(expected);
    let orderedRows = [];

    assert.equal(expectedTable.size(), table.size());
    
    for(let {row} of expectedTable) {
        orderedRows.push(row);
    }

    let i = 0;
    for (let missingCol of misssing) {
        assert.equal(table.getColumns().indexOf(missingCol) , -1);
    }
    for (let {row} of table) {
        let expectedRow = orderedRows[i];

        // todo check that there are no extra column that we are not expecting
        expectedTable.getColumns().forEach(function (col) {
            assert.deepEqual(expectedRow.get(col), row.get(col));
        });

        i++;
    }
    
    
}

test("RemoveCol", () => {
    let tableRaw = [
        {x_p : 1, y : 2, z: 3},
        {x_p : 2, y : 2, z: 3},
        {x_p : 3, y : 2, z: 3}];

    let expectedRaw = [
        {x_p : 1, z: 3},
        {x_p : 2, z: 3},
        {x_p : 3, z: 3}];

    let testee = new CalcTable();
    testee.removeCol(COLS.y);

    let res = testee.calculate(makeTable(tableRaw));

    checkTable(expectedRaw,res, COLS.y);
    let expected = makeTable(tableRaw);
    let actual = testee.inverse(res, makeTable(tableRaw));

    assert.equal(actual.equals(expected), true);
    

    
});

test("AddCol",  () => {
    let tableRaw = [
        {x_p : 1, y : 2, z: 3},
        {x_p : 2, y : 2, z: 3},
        {x_p : 3, y : 2, z: 3}];

    let expectedRaw = [
        {x_p : 1, x: 2, y: 2, z: 3},
        {x_p : 2, x: 2, y: 2, z: 3},
        {x_p : 3, x: 2, y: 2, z: 3}];
    
    let expectedOutRaw = [
        {x_p : 1, y : 2, z: 3},
        {x_p : 2, y : 10, z: 3},
        {x_p : 3, y : 2, z: 3}];

    let testee = new CalcTable();
    testee.addCol(COLS.x, COLS.y, function (v) {return v;}, function (v) {return v;}, {fish:true});

    let res = testee.calculate(makeTable(tableRaw));
    let expected = makeTable(expectedRaw);
    
    checkTable(expectedRaw,res);
    assert.deepEqual({fish:true}, res.getColumnMeta(COLS.x));
    let mres = res.unfreeze();
    mres.set([2], COLS.x, 10);

    assert.equal(isEqual(makeTable(expectedOutRaw), testee.inverse(mres.freeze(), makeTable(tableRaw))), true);
    
    mres = res.unfreeze();
    mres.set([2], COLS.y, 10);

    assert.equal(isEqual(makeTable(expectedOutRaw), testee.inverse(mres.freeze(), makeTable(tableRaw))), true);
    
});

test("AddRow", () => {
    let tableRaw = [
        {x_p : 1, y : 2, z: 3},
        {x_p : 2, y : 2, z: 3},
        {x_p : 3, y : 2, z: 3}];

    let expectedRaw = [
        {x_p : 1, x: 2, y: 2, z: 3},
        {x_p : 2, x: 2, y: 2, z: 3},
        {x_p : 3, x: 2, y: 2, z: 3}];
    
    let expectedOutRaw = [
        {x_p : 1, y : 2, z: 3},
        {x_p : 2, y : 2, z: 3},
        {x_p : 3, y : 2, z: 3},
        {x_p : 4, y : 5, z: 5}];

    let testee = new CalcTable();
    testee.addCol(COLS.x, COLS.y, function (v) {return v;}, function (v) {return v;}, {fish:true});

    let res = testee.calculate(makeTable(tableRaw));
    let expected = makeTable(expectedRaw);
    
    checkTable(expectedRaw,res);
    assert.deepEqual({fish:true}, res.getColumnMeta(COLS.x));
    let mres = res.unfreeze();
    let row = new MutableTableRow();
    row.set(COLS.x_p, 4);
    row.set(COLS.x, 5);
    row.set(COLS.y, 5);
    row.set(COLS.z, 5);
    
    mres.addRow(row);

    assert.equal(isEqual(makeTable(expectedOutRaw), testee.inverse(mres.freeze(), makeTable(tableRaw))), true);
    
});


