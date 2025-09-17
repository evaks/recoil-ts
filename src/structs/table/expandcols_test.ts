goog.provide('recoil.structs.table.ExpandColsTest');

goog.require('goog.testing.jsunit');
goog.require('recoil.structs.table.ExpandCols');
goog.require('recoil.util');
goog.require('recoil.structs.table.ColumnKey');

goog.setTestOnly('recoil.structs.table.ExpandColsTest');

var COL_A = new recoil.structs.table.ColumnKey("a");
var COL_B = new recoil.structs.table.ColumnKey("b");
var COL_C = new recoil.structs.table.ColumnKey("c");
var COL_C_1 = new recoil.structs.table.ColumnKey("c.1");
var COL_C_2 = new recoil.structs.table.ColumnKey("c.2");
var COL_D = new recoil.structs.table.ColumnKey("d");
var COL_E = new recoil.structs.table.ColumnKey("e");


var getCol = function (row, key) {
    for (var i = 0; i < row.length; i++) {
        if (key === row[i].col) {
            return row[i];
        }
    }
    fail("can't find col " + key);
    return null;
};
var checkTable = function (table, expected) {
    var r = 0;
    table.forEach(function (row, pk) {
        var c = 0;
        var expectedRow = expected[r];
        table.forEachColumn(function (col) {
            var colInfo = getCol(expectedRow, col);
            assertObjectEquals("row " + (r + 1),colInfo.val,  row.get(col));
            c++;
        });
        assertEquals(expectedRow.length, c); // all rows + 1 for name
        r++;
    });
};

function testExpand() {
    var tbl = new recoil.structs.table.MutableTable([COL_A], [COL_B,COL_C]);

    tbl.setMeta({tableMeta:true});

    tbl.setColumnMeta(COL_A, {meta:"a"});
    tbl.setColumnMeta(COL_B, {meta:"b"});
    tbl.setColumnMeta(COL_C, {meta:"c"});

    [1,2,3,4].forEach(function (val) {
        var row = new recoil.structs.table.MutableTableRow();
        row.set(COL_A, "a" + val);
        row.setCellMeta(COL_A, {cell : "a" + val});
        row.set(COL_B, val);
        row.setCellMeta(COL_B, {cell : "b" + val});
        row.set(COL_C, {c1 : "c.1." + val, c2 : 'c.2.' + val, c3:'c.3.' + val});
        row.setCellMeta(COL_C, {cell : "c" + val});
        tbl.addRow(row);
    });
    var expanders = [new recoil.structs.table.ExpandCols.PresenceDef(
        function (row) {
            return row.get(COL_B) % 2 == 0;
        },
        COL_C,undefined,
        [
            {path:recoil.db.ChangeSet.Path.fromString("c1"),col:COL_C_1, defaultVal:"c1def"},
            {path:recoil.db.ChangeSet.Path.fromString("c2"),col:COL_C_2, defaultVal:"c2def"}])];
    
    var testee = new recoil.structs.table.ExpandCols();
    var table = testee.calculate({table : tbl.freeze(), expand:expanders});

    assertEquals(4, table.size()); // lose the non placed columns and the first column, that is the header
    assertObjectEquals({tableMeta: true}, table.getMeta());
    
    var expected = [
        [{val:"a1", col: COL_A}, {val: 1, col : COL_B},{val:null, col: COL_C_1},{val:null, col: COL_C_2},
         {val:{c1:'c.1.1',c2:'c.2.1', c3:'c.3.1'}, col: COL_C}],
        [{val:"a2", col: COL_A}, {val: 2, col : COL_B},{val:"c.1.2", col: COL_C_1},{val:"c.2.2", col: COL_C_2},
         {val:{c1:'c.1.2',c2:'c.2.2', c3:'c.3.2'}, col: COL_C}],
        [{val:"a3", col: COL_A}, {val: 3, col : COL_B},{val:null, col: COL_C_1},{val:null, col: COL_C_2},
         {val:{c1:'c.1.3',c2:'c.2.3', c3:'c.3.3'}, col: COL_C}],
        [{val:"a4", col: COL_A}, {val: 4, col : COL_B},{val:"c.1.4", col: COL_C_1},{val:"c.2.4", col: COL_C_2},
         {val:{c1:'c.1.4',c2:'c.2.4', c3:'c.3.4'}, col: COL_C}],
         
    ];


    checkTable(table,expected);
    
    // check column names

    // check meta data of headers
    // change the values of the table

    var mtable = table.unfreeze();
    mtable.set(['a1'],COL_C_1,"fred1"); // should do nothing because b is odd
    mtable.set(['a2'],COL_C_1,"fred2");


    var orig = testee.inverse(mtable.freeze(),{table : tbl.freeze(), expand: expanders}).table;

    expected = [
        [{val:"a1", col: COL_A}, {val: 1, col : COL_B},{val:{c1: "c.1.1", c2:"c.2.1", c3:"c.3.1"}, col: COL_C}],
        [{val:"a2", col: COL_A}, {val: 2, col : COL_B},{val:{c1: "fred2", c2:"c.2.2", c3:"c.3.2"},col: COL_C}],
        [{val:"a3", col: COL_A}, {val: 3, col : COL_B},{val:{c1: "c.1.3", c2:"c.2.3", c3:"c.3.3"}, col: COL_C}],
        [{val:"a4", col: COL_A}, {val: 4, col : COL_B},{val:{c1:"c.1.4", c2:"c.2.4", c3:"c.3.4"}, col: COL_C}],
     ];

    checkTable(orig,expected);

    table = testee.calculate({table : orig, expand:expanders});
    
    expected = [
        [{val:"a1", col: COL_A}, {val: 1, col : COL_B},{val:null, col: COL_C_1},{val:null, col: COL_C_2},
         {val:{c1:'c.1.1',c2:'c.2.1', c3:'c.3.1'}, col: COL_C}],
        [{val:"a2", col: COL_A}, {val: 2, col : COL_B},{val:"fred2", col: COL_C_1},{val:"c.2.2", col: COL_C_2},
         {val:{c1:'fred2',c2:'c.2.2', c3:'c.3.2'}, col: COL_C}],
        [{val:"a3", col: COL_A}, {val: 3, col : COL_B},{val:null, col: COL_C_1},{val:null, col: COL_C_2},
         {val:{c1:'c.1.3',c2:'c.2.3', c3:'c.3.3'}, col: COL_C}],
        [{val:"a4", col: COL_A}, {val: 4, col : COL_B},{val:"c.1.4", col: COL_C_1},{val:"c.2.4", col: COL_C_2},
         {val:{c1:'c.1.4',c2:'c.2.4', c3:'c.3.4'}, col: COL_C}],
    ];

    checkTable(table,expected);


    
    // set b to even and see it populates default values
    mtable = table.unfreeze();
    mtable.set(['a1'],COL_B,6); 
    mtable.set(['a1'],COL_C_2,"c2set"); 
    orig = testee.inverse(mtable.freeze(),{table : orig, expand: expanders}).table;

    expected = [
        [{val:"a1", col: COL_A}, {val: 6, col : COL_B},{val:{c1: "c1def", c2:"c2set", c3:"c.3.1"}, col: COL_C}],
        [{val:"a2", col: COL_A}, {val: 2, col : COL_B},{val:{c1: "fred2", c2:"c.2.2", c3:"c.3.2"},col: COL_C}],
        [{val:"a3", col: COL_A}, {val: 3, col : COL_B},{val:{c1:'c.1.3',c2:'c.2.3', c3:'c.3.3'}, col: COL_C}],
        [{val:"a4", col: COL_A}, {val: 4, col : COL_B},{val:{c1:"c.1.4", c2:"c.2.4",c3:'c.3.4'}, col: COL_C}],
     ];
//    

    checkTable(orig,expected);

}


function testExpandRec() {
    var tbl = new recoil.structs.table.MutableTable([COL_A], [COL_B,COL_C]);

    tbl.setMeta({tableMeta:true});

    tbl.setColumnMeta(COL_A, {meta:"a"});
    tbl.setColumnMeta(COL_B, {meta:"b"});
    tbl.setColumnMeta(COL_C, {meta:"c"});

    [1,2].forEach(function (val) {
        var row = new recoil.structs.table.MutableTableRow();
        row.set(COL_A, "a" + val);
        row.setCellMeta(COL_A, {cell : "a" + val});
        row.set(COL_B, val);
        row.setCellMeta(COL_B, {cell : "b" + val});
        row.set(COL_C, {d : {e: 'e' + val}});
        row.setCellMeta(COL_C, {cell : "c" + val});
        tbl.addRow(row);
    });
    var expanders = [new recoil.structs.table.ExpandCols.PresenceDef(
        function (row) {
            return row.get(COL_B) % 2 == 0;
        },
        COL_C,undefined,
        [
            {path:recoil.db.ChangeSet.Path.fromString("d/e"),col: COL_E, defaultVal:"e.def"}])];

    
    var testee = new recoil.structs.table.ExpandCols();
    var table = testee.calculate({table : tbl.freeze(), expand:expanders});

    assertEquals(2, table.size()); // lose the non placed columns and the first column, that is the header
    assertObjectEquals({tableMeta: true}, table.getMeta());
    
    var expected = [
        [{val:"a1", col: COL_A}, {val: 1, col : COL_B},{val:null, col: COL_E},
         {val:{d: {e: 'e1'}}, col: COL_C}],
        [{val:"a2", col: COL_A}, {val: 2, col : COL_B},{val:"e2", col: COL_E},
         {val:{d:{e:'e2'}}, col: COL_C}],
         
    ];

    checkTable(table,expected);
    
    // check column names

    // check meta data of headers
    // change the values of the table

    var mtable = table.unfreeze();
    mtable.set(['a1'],COL_E,"fred1"); // should do nothing because b is odd
    mtable.set(['a2'],COL_E,"fred2");


    var orig = testee.inverse(mtable.freeze(),{table : tbl.freeze(), expand: expanders}).table;

    expected = [
        [{val:"a1", col: COL_A}, {val: 1, col : COL_B},{val:{d: {e: "e1"}}, col: COL_C}],
        [{val:"a2", col: COL_A}, {val: 2, col : COL_B},{val:{d: {e: "fred2"}},col: COL_C}],
     ];

    checkTable(orig,expected);

    table = testee.calculate({table : orig, expand:expanders});
    expected = [
        [{val:"a1", col: COL_A}, {val: 1, col : COL_B},{val:null, col: COL_E},
         {val:{d: {e: 'e1'}}, col: COL_C}],
        [{val:"a2", col: COL_A}, {val: 2, col : COL_B},{val:"fred2", col: COL_E},
         {val:{d:{e:'fred2'}}, col: COL_C}],
         
    ];

    checkTable(table,expected);


}



