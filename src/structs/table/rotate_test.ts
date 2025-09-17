goog.provide('recoil.structs.table.RotateTest');

goog.require('goog.testing.jsunit');
goog.require('recoil.structs.table.Rotate');
goog.require('recoil.util');
goog.require('recoil.structs.table.ColumnKey');
goog.require('recoil.ui.widgets.TableMetaData');



goog.setTestOnly('recoil.structs.table.RotateTest');

var COL_A = new recoil.structs.table.ColumnKey("a");
var COL_B = new recoil.structs.table.ColumnKey("b");
var COL_C = new recoil.structs.table.ColumnKey("c");
var COL_D = new recoil.structs.table.ColumnKey("d");
var COL_E = new recoil.structs.table.ColumnKey("e");

function testRotate() {
    var tbl = new recoil.structs.table.MutableTable([COL_A], [COL_B,COL_C, COL_D]);

    tbl.setMeta({tableMeta:true});

    tbl.setColumnMeta(COL_A, {meta:"a"});
    tbl.setColumnMeta(COL_B, {meta:"b"});
    tbl.setColumnMeta(COL_C, {meta:"c"});
    tbl.setColumnMeta(COL_D, {meta:"d"});

    [1,2,3,4].forEach(function (val) {
        var row = new recoil.structs.table.MutableTableRow();
        row.set(COL_A, "a" + val);
        row.setCellMeta(COL_A, {cell : "a" + val});
        row.set(COL_B, "b" + val);
        row.setCellMeta(COL_B, {cell : "b" + val});
        row.set(COL_C, "c" + val);
        row.setCellMeta(COL_C, {cell : "c" + val});
        row.set(COL_D, "d" + val);
        row.setCellMeta(COL_D, {cell : "d" + val});
        tbl.addRow(row);
    });

    var meta = new recoil.ui.widgets.TableMetaData();
    meta.add(COL_A, "A");
    meta.add(COL_B, "B");
    meta.add(COL_C, "C");

    var testee = new recoil.structs.table.Rotate(true);
    var applyTable = meta.applyMeta(tbl.freeze());
    var table = testee.calculate({table : applyTable});

    assertEquals(2, table.size()); // lose the non placed columns and the first column, that is the header
    assertObjectEquals({tableMeta: true}, table.getMeta());
    
    var expected = [
        {val: "b", col : COL_B},{val:"c", col: COL_C}];
   
    var r = 0;
    table.forEach(function (row, pk) {
        var c = 0;
        var expectedRow = expected[r];
        table.forEachPlacedColumn(function (col) {
            if (c === 0) {
                assertEquals("name col name " + r, "", table.getColumnMeta(col).name);
                assertEquals("name col type " + r, "string", table.getCell(pk,col).getMeta().type);
                assertEquals("name col factor " + r, recoil.ui.widgets.table.TableWidget.defaultHeaderWidgetFactory
                             , table.getCell(pk,col).getMeta().cellWidgetFactory);
                
                assertEquals("name col " + r, expectedRow.val.toUpperCase(), row.get(col));
            }
            else {
                assertEquals("data col name " + r, "a" + c, table.getColumnMeta(col).name);
                assertEquals("data col " + r + "," + c, expectedRow.val + c, row.get(col));
                var expectedMeta = goog.object.clone(applyTable.getColumnMeta(expectedRow.col));
                expectedMeta.cell = expectedRow.val + c;
                assertObjectEquals("cellmeta col " + r + "," + c, expectedMeta, row.getCell(col).getMeta());

            }
            c++;
        });
        assertEquals(5, c); // all rows + 1 for name
        r++;
    });

    // check column names

    // check meta data of headers
    // change the values of the table

    var mtable = table.unfreeze();
    table.forEach(function (row, pk) {
        table.forEachPlacedColumn(function (col) {
            mtable.set(pk, col, row.get(col) + "new");
        });
    });

    var orig = testee.inverse(mtable.freeze(),{table : applyTable}).table;

    [1,2,3,4].forEach(function (val) {
        assertEquals("a" + val, orig.get(["a" + val],COL_A));
        assertEquals("b" + val + "new", orig.get(["a" + val],COL_B));
        assertEquals("c" + val + "new", orig.get(["a" + val],COL_C));
        assertEquals("d" + val, orig.get(["a" + val],COL_D));
    });

    
}



function testNoHeaderRotate() {
    var tbl = new recoil.structs.table.MutableTable([COL_A], [COL_B,COL_C, COL_D]);

    tbl.setMeta({tableMeta:true});

    tbl.setColumnMeta(COL_A, {meta:"a"});
    tbl.setColumnMeta(COL_B, {meta:"b"});
    tbl.setColumnMeta(COL_C, {meta:"c"});
    tbl.setColumnMeta(COL_D, {meta:"d"});

    [1,2,3,4].forEach(function (val) {
        var row = new recoil.structs.table.MutableTableRow();
        row.set(COL_A, "a" + val);
        row.setCellMeta(COL_A, {cell : "a" + val});
        row.set(COL_B, "b" + val);
        row.setCellMeta(COL_B, {cell : "b" + val});
        row.set(COL_C, "c" + val);
        row.setCellMeta(COL_C, {cell : "c" + val});
        row.set(COL_D, "d" + val);
        row.setCellMeta(COL_D, {cell : "d" + val});
        tbl.addRow(row);
    });

    var meta = new recoil.ui.widgets.TableMetaData();
    meta.add(COL_A, "A");
    meta.add(COL_B, "B");
    meta.add(COL_C, "C");

    var testee = new recoil.structs.table.Rotate(false);
    var applyTable = meta.applyMeta(tbl.freeze());
    var table = testee.calculate({table : applyTable});

    assertEquals(3, table.size()); // lose the non placed columns and the first column, that is the header
    assertObjectEquals({tableMeta: true, headerRowDecorator: recoil.structs.table.Rotate.emptyDecorator}, table.getMeta());
    
    var expected = [
        {val: "a", col: COL_A},{val: "b", col : COL_B},{val:"c", col: COL_C}];
   
    var r = 0;
    table.forEach(function (row, pk) {
        var c = 0;
        var expectedRow = expected[r];
        table.forEachPlacedColumn(function (col) {
            if (c === 0) {
                assertEquals("name col name " + r, "", table.getColumnMeta(col).name);
                assertEquals("name col type " + r, "string", table.getCell(pk,col).getMeta().type);
                assertEquals("name col " + r, expectedRow.val.toUpperCase(), row.get(col));
                assertEquals("name col factor " + r, recoil.ui.widgets.table.TableWidget.defaultHeaderWidgetFactory
                             , table.getCell(pk,col).getMeta().cellWidgetFactory);

            }
            else {
                assertEquals("data col name " + r, "a" + c, table.getColumnMeta(col).name);
                assertEquals("data col " + r + "," + c, expectedRow.val + c, row.get(col));
                var expectedMeta = goog.object.clone(applyTable.getColumnMeta(expectedRow.col));
                expectedMeta.cell = expectedRow.val + c;
                assertObjectEquals("cellmeta col " + r + "," + c, expectedMeta, row.getCell(col).getMeta());

            }
            c++;
        });
        assertEquals(5, c); // all rows + 1 for name
        r++;
    });

    // check column names

    // check meta data of headers
    // change the values of the table

    var mtable = table.unfreeze();
    table.forEach(function (row, pk) {
        table.forEachPlacedColumn(function (col) {
            mtable.set(pk, col, row.get(col) + "new");
        });
    });

    var orig = testee.inverse(mtable.freeze(),{table : applyTable}).table;

    [1,2,3,4].forEach(function (val) {
        var key = 'a' + val + 'new';
        assertEquals("a" + val + 'new', orig.get([key],COL_A));
        assertEquals("b" + val + 'new', orig.get([key],COL_B));
        assertEquals("c" + val + 'new', orig.get([key],COL_C));
        assertEquals("d" + val, orig.get([key],COL_D));
    });

    
}



