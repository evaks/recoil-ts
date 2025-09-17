goog.provide('recoil.structs.table.Rotate');


goog.require('goog.structs.AvlTree');
goog.require('recoil.frp.Inversable');
goog.require('recoil.structs.table.ColumnKey');
goog.require('recoil.structs.table.Table');
goog.require('recoil.ui.widgets.table.TableWidget');
goog.require('recoil.util.object');
/**
 * this rotates the table so that the column are rows and th rows are columns
 * it is best that all meta data is applied before rotation, so that the Correct Meta data and name
 * for the row can be applied
 *
 * The first column will be considered column header
 *
 * @implements {recoil.frp.Inversable<!recoil.structs.table.Table,
 {table:!recoil.structs.table.Table},
 {table:!recoil.structs.table.Table}>}>}
 * @constructor
 * @param {boolean} firstIsHeader if true first column the column header otherwize the header is removed, and
 *   the first column is data
 * @param {!recoil.structs.table.ColumnKey<!recoil.structs.table.ColumnKey>=} opt_keyCol
 * @param {!recoil.structs.table.ColumnKey<string>=} opt_nameCol
 */

recoil.structs.table.Rotate = function(firstIsHeader, opt_keyCol, opt_nameCol) {
    this.firstIsHeader_ = firstIsHeader;
    /**
     * @private
     * @type {!recoil.structs.table.ColumnKey<!recoil.structs.table.ColumnKey>}
     */
    this.primaryKey_ = opt_keyCol || new recoil.structs.table.ColumnKey('$key');
    /**
     * @private
     * @type {!recoil.structs.table.ColumnKey<!Array<{srcPk:!Array,destCol:!recoil.structs.table.ColumnKey}>>}
     */
    this.colMapKey_ = new recoil.structs.table.ColumnKey('$colmap');
    this.nameKey_ = opt_nameCol || new recoil.structs.table.ColumnKey('$name');
    this.cachedColKeys_ = new goog.structs.AvlTree(recoil.util.object.compareKey);
};

/**
 * @return {recoil.ui.RenderedDecorator}
 */
recoil.structs.table.Rotate.emptyDecorator = function() {
    return null;
};
/**
 * @param {{table:!recoil.structs.table.Table}} params
 * @return {!recoil.structs.table.Table}
 */
recoil.structs.table.Rotate.prototype.calculate = function(params) {
    var me = this;
    var table = params.table;


    // work out what columns we will need
    var otherCols = [this.nameKey_, this.colMapKey_];

    table.forEach(function(row, pk) {
        var cached = me.cachedColKeys_.findFirst({key: pk});
        if (!cached) {
            cached = {key: pk, col: new recoil.structs.table.ColumnKey('' + pk)};
            me.cachedColKeys_.add(cached);
        }
        cached.row = row;
        otherCols.push(cached.col);
    });


    var result = new recoil.structs.table.MutableTable([this.primaryKey_], otherCols);
    result.setMeta(table.getMeta());
    if (!me.firstIsHeader_) {
        result.addMeta({headerRowDecorator: recoil.structs.table.Rotate.emptyDecorator});
    }
    // setup the column meta, for the first column it will be like a header renderer
    result.setColumnMeta(this.nameKey_, {name: '', position: 0, cellDecorator: recoil.ui.widgets.table.TableWidget.defaultHeaderDecorator});


    // for the other column we will set the row meta data on it, and add the column name

    var colPos = 1;
    table.forEach(function(row, pk) {
        var cached = me.cachedColKeys_.findFirst({key: pk});
        var first = true;

        table.forEachPlacedColumn(function(col, meta) {
            if (first) {
                result.setColumnMeta(cached.col, {name: row.get(col), position: colPos++});
                result.addColumnMeta(cached.col, row.getMeta());
            }
            first = false;
        });

    });


    var pos = 0;
    // now add the data to the table
    table.forEachPlacedColumn(function(col, meta) {
        if (pos > 0 || !me.firstIsHeader_) {
            var newRow = new recoil.structs.table.MutableTableRow(pos);
            newRow.set(me.primaryKey_, col);

            newRow.set(me.nameKey_, table.getColumnMeta(col).name);
            var colMeta = table.getColumnMeta(col);
            if (colMeta.rowDecorator) {
                newRow.addRowMeta({rowDecorator: colMeta.rowDecorator});
            }
            newRow.addRowMeta({columnMeta: colMeta});
            newRow.setCellMeta(me.nameKey_, colMeta);
            newRow.addCellMeta(me.nameKey_, {type: 'string', editable: false, errors: [],
                                             cellWidgetFactory: recoil.ui.widgets.table.TableWidget.defaultHeaderWidgetFactory });
            var colMappings = [];

            table.forEach(function(row, pk) {
                var cached = me.cachedColKeys_.findFirst({key: pk});

                newRow.set(cached.col, row.get(col));
                newRow.setCellMeta(cached.col, meta);
                newRow.addCellMeta(cached.col, row.getCell(col).getMeta());
                colMappings.push({srcPk: pk, destCol: cached.col});

            });
            newRow.set(me.colMapKey_, colMappings);
            result.addRow(newRow);
        }
        pos++;
    });

    return result.freeze();
};

/**
 * for now we do not handle adding new rows, that would be like adding a new
 * column, or adding new columns
 *
 * @param {!recoil.structs.table.Table} table
 * @param {{table:!recoil.structs.table.Table}} sources
 * @return {{table:!recoil.structs.table.Table}}
 */
recoil.structs.table.Rotate.prototype.inverse = function(table, sources) {
    var dest = sources.table.unfreeze();
    var me = this;

    var toSet = new goog.structs.AvlTree(recoil.util.object.compareKey);

    table.forEach(function(row) {
        var destCol = row.get(me.primaryKey_);
        var rowMappings = row.get(me.colMapKey_);
        // this is because the first row will not have a mapping
        if (rowMappings) {
            rowMappings.forEach(function(mapping) {
                var modifyRow = dest.getRow(mapping.srcPk);
                if (modifyRow) {
                    dest.removeRow(mapping.srcPk);
                    toSet.add({key: mapping.srcPk, row: modifyRow.unfreeze()});
                }
                var found = toSet.findFirst({key: mapping.srcPk});
                if (found) {
                    found.row.set(destCol, row.get(mapping.destCol));
                }
            });
        }
    });
    toSet.inOrderTraverse(function(node) {
        dest.addRow(node.row);
    });
    return {table: dest.freeze()};
};

