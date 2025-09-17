/**
 * @typedef {{key:!Array,rowPos:number, meta:!Object,keyCols: !Array<!recoil.structs.table.ColumnKey>,cellMeta:Object<string,Object>}}
 */
import {WidgetScope} from "../widgetscope";
import {StructType} from "../../../frp/struct";
import {Table, TableMetaType} from "../../../structs/table/table";
import {AvlTree} from "../../../structs/avltree";

export type TypeFactoryMap = {
    [index:string]: (meta:StructType) => Column,
}

private type RowAndCellMeta_;

/**
 * @typedef {goog.structs.AvlTree<recoil.ui.widgets.table.RowAndCellMeta_>}
 */
recoil.ui.widgets.table.RowAndCellMetaMap_;

/**
 * @typedef {{rowMeta:!recoil.ui.widgets.table.RowAndCellMetaMap_, columnMeta:!Array<{key:!recoil.structs.table.ColumnKey}>, tableMeta:Object}}
 */
recoil.ui.widgets.table.TableInfo_;

/**
 * @typedef {{rows:goog.structs.AvlTree,headerCols:Array, headerRow:Object}}
 */
type RenderState_ = {rows:AvlTree<xxx>, headerCols:xxx[], headerRow:xxx};


/**
 * @constructor
 * @param {!recoil.ui.WidgetScope} scope
 * @implements recoil.ui.AttachableWidget
 */
export class TableWidget {

    constructor(scope:WidgetScope) {
        this.scope_ = scope;
        this.container_ = new goog.ui.Component();
        this.container_.createDom();
        this.helper_ = new recoil.ui.ComponentWidgetHelper(scope, this.container_, this, this.updateState_);
        this.selectNewRow_ = false;
        var me = this;
        this.rowClickHelper_ = new recoil.ui.ComponentWidgetHelper(scope, this.container_, this, function () {
        });

        var applyClass = function (node, cls) {
            goog.dom.setProperties(node, {class: cls});
            var children = goog.dom.getChildren(node);
            for (var i = 0; i < children.length; i++) {
                console.log(children.item(i));
//            applyClass(children.item(i), cls);
            }
        };
        var SelectionMode = recoil.ui.widgets.table.TableWidget.SelectionMode;

        this.selectionHelper_ = new recoil.ui.ComponentWidgetHelper(scope, this.container_, this, function (helper, selectedB, selectMetaB) {
            var i = 0;
            var row;
            var selector;
            if (helper.isGood()) {
                var selected = selectedB.get();
                var selectMeta = selectMetaB.get();
                var canSelect = selectMeta.canSelect;
                for (i = 0; i < me.curSelected_.length; i++) {
                    var rowMeta = selectMeta.rowMeta.findFirst({key: me.curSelected_[i]});
                    selector = me.getMetaValue('rowSelector', selectMetaB.table, rowMeta ? rowMeta.meta : undefined);
                    row = me.renderState_.rows.findFirst({key: me.curSelected_[i]});
                    if (row) {
                        selector(row.outer, false);
                    }
                }

                for (i = 0; i < selected.length; i++) {
                    selector = me.getMetaValue('rowSelector', selectMeta.table, selectMeta.rowMeta.findFirst({key: selected[i]}));
                    row = me.renderState_.rows.findFirst({key: selected[i]});
                    if (row) {
                        selector(row.outer, canSelect);
                    }
                }
                me.curSelected_ = selected;
            }

        });
        // the state the current table we are displaying (only the important stuff)
        this.state_ = recoil.ui.widgets.table.TableWidget.emptyState_();
        // information on what we are currently rendering
        this.renderState_ = {
            rows: new goog.structs.AvlTree(recoil.ui.widgets.table.TableWidget.rowMetaCompare_),
            headerCols: []
        };
        this.curSelected_ = [];
        this.selected_ = this.scope_.getFrp().createB([]);
        this.lastClickedB_ = this.scope_.getFrp().createB(null);
        // this will keep the current table in it, it will allow us to get selected before
        // we have attached a table
        this.tableBB_ = this.scope_.getFrp().createNotReadyB();

        this.rowClickEvent_ = scope.getFrp().createCallback(function (e, selectedB, tableB, lastB) {
            this.selectNewRow_ = false;
            var oldSelected = selectedB.get();
            var mode = tableB.get().getMeta().selectionMode || SelectionMode.SINGLE;
            var clickRow = tableB.get().getRow(e.data);
            if (!clickRow || clickRow.getMeta().selectable === false) {
                return;
            }
            var keyEqual = function (x) {
                return recoil.util.isEqual(x, e.data);
            };
            if (mode === SelectionMode.SINGLE) {
                if (!goog.array.find(oldSelected, keyEqual)) {
                    selectedB.set([e.data]);
                }
                lastB.set(e.data);
            } else if (mode === SelectionMode.MULTI) {
                if (e.event.ctrlKey) {

                    var found = goog.array.find(oldSelected, keyEqual);
                    if (found) {
                        selectedB.set(oldSelected.filter(function (v) {
                            return !keyEqual(v);
                        }));
                    } else {
                        selectedB.set(oldSelected.concat([e.data]));
                    }
                    lastB.set(e.data);
                } else if (e.event.shiftKey && lastB.get() !== null && tableB.get().getRow(lastB.get())) {
                    var newSelected = [];
                    var started = false;
                    var finished = false;
                    var tbl = tableB.get();
                    tbl.forEach(function (row, pks) {
                        if (finished) {
                            return;
                        }

                        var matches = recoil.util.isEqual(pks, lastB.get()) || recoil.util.isEqual(pks, e.data);
                        if (matches) {
                            newSelected.push(pks);
                            finished = started;
                            started = true;
                        } else if (started) {
                            newSelected.push(pks);
                        }
                    });
                    selectedB.set(newSelected);
                } else {
                    selectedB.set([e.data]);
                    lastB.set(e.data);
                }
            }


        }, this.selected_, this.scope_.getFrp().switchB(this.tableBB_), this.lastClickedB_);
        this.rowClickHelper_.attach(this.rowClickEvent_);
    }

    static create(tableMeta:TypeFactoryMap, columnMeta:TableMetaType, rawTable:StructType[], opt_ordered?:boolean):Table {
        return Table.create(tableMeta, columnMeta, rawTable, opt_ordered);
    }


    /**
     * use this when adding for the table widget to select a new row
     * this highlight which row was added to the user
     *
     */
    selectNewRow() {
        this.selectNewRow_ = true;
    }

/**
 * this should be called after the attach this way it can filter out the
 * rows that do not exist in the table.
 *
 * note this is a bidirectional behaviour, so setting it will change the selection
 *
 * @return {!recoil.frp.Behaviour<!Array<!Array<Object>>>}
 */
recoil.ui.widgets.table.TableWidget.prototype.createSelected = function() {
    var frp = this.scope_.getFrp();
    var me = this;
    return frp.liftBI(
        function(selected, table) {
            var res = [];
            let reselector = table.getMeta()['reselector'];
            let reselected = false;
            selected.forEach(function(key) {
                try {
                    if (table.getRow(key) !== null) {
                        res.push(key);
                    }
                    else if (reselector) {
                        let found = null;
                        table.forEach(function(row, pks) {
                            if (reselector(key, row, pks)) {
                                found = pks;
                            }
                        });

                        if (found) {
                            reselected = true;
                            res.push(found);
                        }
                    }
                }
                catch (e) {
                    // maybe the table has changed number of pk since we generated selected
                    // so this may throw ignore
                }
            });
            if (reselected) {
                me.selected_.set(res);
            }
            return res;
        },
        function(selected) {
            me.selected_.set(selected);
        }, this.selected_, frp.switchB(this.tableBB_));
};

/**
 * creates an empty state
 * @return {recoil.ui.widgets.table.TableInfo_}
 * @private
 */
recoil.ui.widgets.table.TableWidget.emptyState_ = function() {
    return {
        rowMeta: new goog.structs.AvlTree(recoil.ui.widgets.table.TableWidget.rowMetaCompare_),
        columnMeta: [],
        tableMeta: {}
    };
};

/**
 * this gets the most relevant value for this field int the meta, it goes backwards
 * through the meta information until it finds the key that it is looking for
 * if it does not find it there it then will check the scope for that value with the name
 * recoil.ui.widgets.table.TableWidget.'value' if it is not there it will then return
 * recoil.ui.widgets.table.TableWidget.default'Value'_ (note the first letter is capitalised)
 * @template T
 * @param {string} value the key of value to get
 * @param {...Object} var_meta all the meta information
 * @return {T}
 */
recoil.ui.widgets.table.TableWidget.prototype.getMetaValue = function(value, var_meta) {
    var args = [this.scope_];
    for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    return recoil.ui.widgets.table.TableWidget.getMetaValue.apply(null, args);
};

/**
 * this gets the most relevant value for this field int the meta, it goes backwards
 * through the meta information until it finds the key that it is looking for
 * if it does not find it there it then will check the scope for that value with the name
 * recoil.ui.widgets.table.TableWidget.'value' if it is not there it will then return
 * recoil.ui.widgets.table.TableWidget.default'Value'_ (note the first letter is capitalised)
 * @template T
 * @param {!recoil.ui.WidgetScope} scope
 * @param {string} value the key of value to get
 * @param {...Object} var_meta all the meta information
 * @return {T}
 */
recoil.ui.widgets.table.TableWidget.getMetaValue = function(scope, value, var_meta) {
    var val;

    for (var i = arguments.length - 1; i > 1; i--) {
        var arg = arguments[i];
        if (arg === null) {
            console.log('arg is null');
        }
        else if (arg === undefined) {

        } else {
            val = arg[value];
            if (val !== undefined) {
                return val;
            }
        }
    }
    val = recoil.util.object.getByParts(scope, 'recoil', 'ui', 'widgets', 'table', 'TableWidget', value);

    if (val !== undefined) {
        return val;
    }
    val = recoil.ui.widgets.table.TableWidget['default' + goog.string.toTitleCase(value)];
    if (val !== undefined) {
        return val;
    }

    return recoil.ui.widgets.table.TableWidget['default' + goog.string.toTitleCase(value) + '_'];
};

/**
 * the default decorator for making tables
 * @final
 * @private
 * @return {recoil.ui.RenderedDecorator}
 */
recoil.ui.widgets.table.TableWidget.defaultTableDecorator_ = function() {
    return new recoil.ui.RenderedDecorator(
        recoil.ui.widgets.table.TableWidget.defaultTableDecorator_,
        goog.dom.createDom('table'));
};

/**
 * @private
 * @param {Element} row
 * @param {boolean} selected
 */
recoil.ui.widgets.table.TableWidget.defaultRowSelector_ = function(row, selected) {
    if (selected) {
        goog.dom.classlist.add(row, 'recoil_table_selected');
    }
    else {
        goog.dom.classlist.remove(row, 'recoil_table_selected');
    }
};


/**
 * the default decorator for making header rows
 * @final
 * @private
 * @return {recoil.ui.RenderedDecorator}
 */

recoil.ui.widgets.table.TableWidget.defaultHeaderRowDecorator_ = function() {
    return new recoil.ui.RenderedDecorator(
        recoil.ui.widgets.table.TableWidget.defaultHeaderRowDecorator_,
        goog.dom.createDom('tr'));
};

/**
 * the default decorator for making rows
 * @final
 * @private
 * @return {recoil.ui.RenderedDecorator}
 */

recoil.ui.widgets.table.TableWidget.defaultRowDecorator_ = function() {
    return new recoil.ui.RenderedDecorator(
        recoil.ui.widgets.table.TableWidget.defaultRowDecorator_,
        goog.dom.createDom('tr'));
};

/**
 * the default decorator for making cells
 * @final
 * @private
 * @return {recoil.ui.RenderedDecorator}
 */

recoil.ui.widgets.table.TableWidget.defaultCellDecorator_ = function() {
    return new recoil.ui.RenderedDecorator(
        recoil.ui.widgets.table.TableWidget.defaultCellDecorator_,
        goog.dom.createDom('td'));

};

/**
 * the default decorator for making header cells
 * @final
 * @return {recoil.ui.RenderedDecorator}
 */

recoil.ui.widgets.table.TableWidget.defaultHeaderDecorator = function() {
    return new recoil.ui.RenderedDecorator(
        recoil.ui.widgets.table.TableWidget.defaultHeaderDecorator,
        goog.dom.createDom('th'));
};


/**
 * the default factory form for making header widgets for header cells
 * @final
 * @private
 * @param {!recoil.ui.WidgetScope} scope
 * @param {recoil.frp.Behaviour<recoil.structs.table.TableCell>} cellB
 * @return {recoil.ui.Widget}
 */

recoil.ui.widgets.table.TableWidget.defaultHeaderWidgetFactory_ =
    function(scope, cellB) {
        var widget = new recoil.ui.widgets.LabelWidget(scope);
        var metaB = scope.getFrp().liftB(function(cell) {
            let meta  = cell.getMeta();
            let res = {
                name: meta.name
            };
            if (meta.enabled) {
                res.enabled = meta.enabled;
            }
            return res;
        }, cellB);
        widget.attachStruct(metaB);
        return widget;
    };
/**
 * the default factory form for making header widgets for header cells
 * @final
 * @param {!recoil.ui.WidgetScope} scope
 * @param {recoil.frp.Behaviour<recoil.structs.table.TableCell>} cellB
 * @return {recoil.ui.Widget}
 */
recoil.ui.widgets.table.TableWidget.defaultHeaderWidgetFactory = recoil.ui.widgets.table.TableWidget.defaultHeaderWidgetFactory_;

/**
 * compares the rows based on its position
 * @private
 * @param {!recoil.ui.widgets.table.RowAndCellMeta_} x
 * @param {!recoil.ui.widgets.table.RowAndCellMeta_} y
 * @return {number}
 */
recoil.ui.widgets.table.TableWidget.rowMetaPosCompare_ = function(x, y) {
    return x.rowPos - y.rowPos;
};

/**
 * utility function to compare rows in meta data
 * TODO we don't have the position in here so we will loose the row ordering
 * @private
 * @param {!recoil.ui.widgets.table.RowAndCellMeta_} x
 * @param {!recoil.ui.widgets.table.RowAndCellMeta_} y
 * @return {number}
 */
recoil.ui.widgets.table.TableWidget.rowMetaCompare_ = function(x, y) {
    var res;

    for (var i = 0; i < x.key.length; i++) {
        res = x.keyCols[i].valCompare(x.key[i], y.key[i]);
        if (res !== 0) {
            return res;
        }
    }

    return 0;
};
/**
 * @param {Array<string>} fields array of fields to copy
 * @param {...Array<Object>} var_metas each array should be size 2 and
 *                                     like [src,dest]
 * @return {number} number of fields copied
 */
recoil.ui.widgets.table.TableWidget.copyMeta = function(fields, var_metas) {
    var copied = 0;
    for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        for (var m = 1; m < arguments.length; m++) {
            var src = arguments[m][0];
            var dst = arguments[m][1];
            if (src[field] !== undefined) {
                dst[field] = src[field];
                copied++;
            }
        }
    }
    return copied;
};

/**
 * creates a data structure with all the information needed to do selection
 * table but does not contain the actual data, this is useful because
 * it will only fire when we need to update the table, it is the widgets inside
 * the table to update the data itself when it changes
 *
 * @private
 * @param {recoil.frp.Behaviour<recoil.structs.table.Table>} tableB
 * @return {recoil.frp.Behaviour<Object>}
 */
recoil.ui.widgets.table.TableWidget.prototype.createSelectInfo_ = function(tableB) {
    var frp = this.scope_.getFrp();
    var me = this;

    return frp.liftB(function(table) {
        var info = recoil.ui.widgets.table.TableWidget.emptyState_();
        var mode = table.getMeta().selectionMode || recoil.ui.widgets.table.TableWidget.SelectionMode.SINGLE;
        info.canSelect = mode !== recoil.ui.widgets.table.TableWidget.SelectionMode.NONE;
        var tableMeta = table.getMeta();
        recoil.ui.widgets.table.TableWidget.copyMeta(['rowSelector'], [tableMeta, info.tableMeta]);
        var primaryColumns = table.getPrimaryColumns();
        var rowAndColumnFields = ['cellWidgetFactory', 'cellDecorator'];

        var pos = 0;
        table.forEach(function(row, rowKey, tableRowMeta) {
            var rowMeta = {};
            recoil.ui.widgets.table.TableWidget.copyMeta(
                goog.array.concat(
                    rowAndColumnFields,
                    ['rowSelector']),
                [tableRowMeta, rowMeta], [tableMeta, info.tableMeta]);
            var rowAndCellMeta = {key: rowKey,
                                  rowPos: pos,
                                  keyCols: table.getKeyColumns(),
                                  meta: rowMeta,
                                  cellMeta: {}};
            info.rowMeta.add(rowAndCellMeta);
            pos++;
        });  // table.forEach
        return info;
    }, tableB);
};
/**
 * creates a data structure with all the information needed to layout the
 * table but does not contain the actual data, this is useful because
 * it will only fire when we need to update the table, it is the widgets inside
 * the table to update the data itself when it changes
 *
 * @private
 * @param {!recoil.frp.Behaviour<!recoil.structs.table.Table>} tableB
 * @return {!recoil.frp.Behaviour<!recoil.ui.widgets.table.TableInfo_>}
 */
recoil.ui.widgets.table.TableWidget.prototype.createRenderInfo_ = function(tableB) {
    var frp = this.scope_.getFrp();
    var me = this;
    var old = undefined;

    return frp.liftB(function(table) {
        var info = recoil.ui.widgets.table.TableWidget.emptyState_();
        var mode = table.getMeta().selectionMode || recoil.ui.widgets.table.TableWidget.SelectionMode.SINGLE;
        info.canSelect = mode !== recoil.ui.widgets.table.TableWidget.SelectionMode.NONE;

        var tableMeta = table.getMeta();
        recoil.ui.widgets.table.TableWidget.copyMeta(['tableDecorator', 'headerRowDecorator'], [tableMeta, info.tableMeta]);
        var primaryColumns = table.getPrimaryColumns();
        var rowAndColumnFields = ['cellWidgetFactory', 'cellDecorator'];
        table.forEachPlacedColumn(function(key, columnMeta) {

            var myInfo = {key: key};
            recoil.ui.widgets.table.TableWidget.copyMeta(
                goog.array.concat(
                    ['headerDecorator', 'headerWidgetFactory'],
                    rowAndColumnFields),
                [tableMeta, info.tableMeta], [columnMeta, myInfo]);
            info.columnMeta.push(myInfo);
        });

        var curPos = 0;
        table.forEach(function(row, rowKey, tableRowMeta) {
            var rowMeta = {};
            recoil.ui.widgets.table.TableWidget.copyMeta(
                goog.array.concat(
                    rowAndColumnFields,
                    ['rowDecorator']),
                [tableRowMeta, rowMeta], [tableMeta, info.tableMeta]);
            var rowAndCellMeta = {key: rowKey,
                                  rowPos: curPos++,
                                  keyCols: table.getKeyColumns(),
                                  meta: rowMeta,
                                  cellMeta: {}};
            info.rowMeta.add(rowAndCellMeta);

            table.forEachPlacedColumn(function(key, columnMeta) {
                var cell = table.getCell(rowKey, key);
                var cellMeta = {};
                var added = recoil.ui.widgets.table.TableWidget.copyMeta(
                    rowAndColumnFields, [cell.getMeta(), cellMeta]);
                if (added > 0) {
                    rowAndCellMeta.cellMeta[key.getId()] = cellMeta;
                }
            });
        });  // table.forEach
        old = info;
        return info;

    }, tableB);
};

/**
 * @private
 * @param {Array<{key:!recoil.structs.table.ColumnKey}>} newColumnInfo the relevant meta data for the colun
 * @return {!Array<{pos:number, meta:{key:!recoil.structs.table.ColumnKey}}>} an object containing the pos the position to delete,
 *       and the meta information for that column
 */
recoil.ui.widgets.table.TableWidget.prototype.getColumnRemoves_ = function(newColumnInfo) {
    var delColumns = [];
    var newColMap = {};
    var curColumnInfo = this.state_.columnMeta;

    var i = 0;
    for (i = 0; i < newColumnInfo.length; i++) {
        newColMap[newColumnInfo[i].key] = newColumnInfo[i];
    }

    // backwards is important otherwize deleting the columns
    // will change the column number
    for (i = curColumnInfo.length - 1; i >= 0; i--) {
        var info = curColumnInfo[i];
        if (newColMap[info.key] === undefined) {
            delColumns.push({pos: i, meta: info});
        }
    }
    return delColumns;

};


/**
 * before calling this we must delete all columns not in new, and add all
 * all new columns have been added
 *
 * @private
 * @param {!Array<{key:!recoil.structs.table.ColumnKey}>} newColumnInfo the column meta data of the new table
 * @return {!Array<number>} this is a map the index is to the value is from
 */
recoil.ui.widgets.table.TableWidget.prototype.getColumnMoves_ = function(newColumnInfo) {
    var delColumns = [];
    var curColMap = [];
    var curColumnInfo = this.state_.columnMeta;
    var curPositions = {};
    var result = [];

    var i = 0;

    for (i = 0; i < curColumnInfo.length; i++) {
        curPositions[curColumnInfo[i].key] = i;
    }

    for (i = 0; i < newColumnInfo.length; i++) {
        var meta = newColumnInfo[i];
        var curPos = curPositions[meta.key];
        result.push(curPos);
    }
    return result;
};


/**
 * works out which rows need to be removed
 *
 * we should guaranteed that there are columns in cur that are not in new,
 * since whe should delete the old cols before calling this
 *
 * @private
 * @param {!recoil.ui.widgets.table.RowAndCellMetaMap_} newRows the new rows that are going to be in the table
 * @return {!recoil.ui.widgets.table.RowAndCellMetaMap_} the rows to remove
 *
 */
recoil.ui.widgets.table.TableWidget.prototype.getRowRemoves_ = function(newRows) {
    var oldRows = this.state_.rowMeta;

    var result = new goog.structs.AvlTree(recoil.ui.widgets.table.TableWidget.rowMetaCompare_);
    oldRows.inOrderTraverse(function(oldRow) {
        if (!newRows.findFirst(oldRow)) {
            result.add(oldRow);
        }
    });
    return result;
};
var cellCount = 0;
/**
 * @private
 * @param {Object} tableMeta the relevant meta data assocatied with the table
 * @param {recoil.ui.RenderedDecorator} row information about currently rendered row
 * @param {recoil.ui.widgets.table.RowAndCellMeta_} rowMeta the relavant metadata associated with row
 * @param {Object} columnMeta
 */
recoil.ui.widgets.table.TableWidget.prototype.createCell_ =
    function(tableMeta, row, rowMeta, columnMeta)
{

    var renderInfo = this.createRenderInfoCell_(tableMeta, row.key, rowMeta, columnMeta);
    if (renderInfo.outer && row.inner) {
        row.inner.appendChild(renderInfo.outer);
    }
    row.cols.push(renderInfo);
};

/**
 * @private
 * @param {Object} tableMeta the relevant meta data assocatied with the table
 * @param {!Array<?>} key information about currently rendered row
 * @param {recoil.ui.widgets.table.RowAndCellMeta_} rowMeta the relavant metadata associated with row
 * @param {Object} columnMeta
 * @return {!Object}
 */
recoil.ui.widgets.table.TableWidget.prototype.createRenderInfoCell_ =
    function(tableMeta, key, rowMeta, columnMeta)
{
    var cellMeta = rowMeta.cellMeta[columnMeta.key];
    var cellDecorator = this.getMetaValue(
        'cellDecorator', tableMeta, rowMeta.meta, columnMeta, cellMeta);
    var cellFactory = this.getMetaValue(
        'cellWidgetFactory', tableMeta, rowMeta.meta, columnMeta, cellMeta);
    var renderInfo = cellDecorator ? cellDecorator() : new recoil.ui.RenderedDecorator(null, null);
    renderInfo.decorator = cellDecorator;
    renderInfo.factory = cellFactory;

    if (renderInfo.inner && renderInfo.factory) {
        var widget = renderInfo.factory(
            this.scope_,
            recoil.frp.table.TableCell.create(
                this.scope_.getFrp(), this.tableB_,
                key, columnMeta.key));
        //TODO    renderInfo.widget = widget;
        widget.getComponent().render(renderInfo.inner);
    }
    return renderInfo;
};

/**
 * add new columns to rows that already exist
 * @private
 * @param {Array<Object>} columns columns to add
 * @param {Object} tableMeta meta data associated with table
 * @param {goog.structs.AvlTree} rowsMeta row meta data
 */
recoil.ui.widgets.table.TableWidget.prototype.addRowColumns_ = function(columns, tableMeta, rowsMeta) {
    var me = this;
    var renderState = this.renderState_;
    renderState.rows.inOrderTraverse(function(row) {
        var rowMeta = rowsMeta.findFirst(row);

        columns.forEach(function(columnMeta) {

            me.createCell_(tableMeta, row, rowMeta, columnMeta);
        });

    });

};
/**
 * add any headers to the table specified by columns
 * @private
 * @param {!Array<{key:!recoil.structs.table.ColumnKey}>} columns array of relevant meta data to be added
 * @param {Object} tableMeta
 */
recoil.ui.widgets.table.TableWidget.prototype.addHeaders_ =
    function(columns, tableMeta) 
{
    var renderState = this.renderState_;
    var me = this;
    if (!renderState.headerRow) {
        return;
    }
    columns.forEach(function(meta) {
        var columnHeaderDecorator = me.getMetaValue(
            'headerDecorator', tableMeta, meta);

        var columnHeaderWidgetFactory = me.getMetaValue(
            'headerWidgetFactory', tableMeta, meta);

        var renderInfo = columnHeaderDecorator();
        if (renderInfo.outer && renderState.headerRow.inner) {
            renderState.headerRow.inner.appendChild(renderInfo.outer);
        }
        renderState.headerCols.push(renderInfo);

        renderInfo.factory = columnHeaderWidgetFactory;
        if (renderInfo.inner) {
            var widget = columnHeaderWidgetFactory(
                me.scope_,
                recoil.frp.table.TableCell.createHeader(
                    me.scope_.getFrp(),
                    me.tableB_, meta.key));
            //        renderInfo.widget = widget;
            widget.getComponent().render(renderInfo.inner);
        }
    });
};

/**
 * assumes there are no row in the current table that do not exist
 * @private
 * @param {!recoil.ui.widgets.table.RowAndCellMetaMap_} orderedRows the new rows that are sorted it the order they need to be displayed
 */
recoil.ui.widgets.table.TableWidget.prototype.doRowMoves_ = function(orderedRows) {
    var renderState = this.renderState_;
    // get a list of rendered rows in its current order
    // this is currently sorted just on pk
    // remove
    var curSorted = new goog.structs.AvlTree(recoil.ui.widgets.table.TableWidget.rowMetaPosCompare_);
    var seen = new goog.structs.AvlTree(recoil.ui.widgets.table.TableWidget.rowMetaCompare_);

    renderState.rows.inOrderTraverse(function(row) {
        curSorted.add(row);

    });

    var curRowList = [];
    curSorted.inOrderTraverse(function(row) {
        curRowList.push(row);
    });

    var srcPos = 0;
    var destPos = 0;
    orderedRows.inOrderTraverse(function(row) {
        var needed = renderState.rows.findFirst(row);
        // skip if it doesn't exist yet
        if (needed) {
            // skip rows that we have already done
            var currentRow = curRowList[srcPos];
            // this shouldn't result in an infinte loop because
            // all previous rows have been seen so if we are
            // doing a row it must also have been unseen I hope
            while (seen.findFirst(currentRow)) {
                srcPos++;
                currentRow = curRowList[srcPos];
            }

            if (recoil.ui.widgets.table.TableWidget.rowMetaCompare_(currentRow, needed) !== 0) {
                //move needed to before the current row
                if (!goog.dom.removeNode(needed.outer)) {
                    throw 'node does not exits';
                }
                goog.dom.insertSiblingBefore(needed.outer, currentRow.outer);
            }
            needed.rowPos = destPos;
            seen.add(needed);
        }
        destPos++;
    });
};
/**
 * @private
 * @param {!recoil.ui.widgets.table.TableInfo_} table all the relevant meta data for the table
 *
 */
recoil.ui.widgets.table.TableWidget.prototype.doRemoves_ = function(table) {
    var renderState = this.renderState_;
    var me = this;
    var state = this.state_;
    var rowRemoves = this.getRowRemoves_(table.rowMeta);
    rowRemoves.inOrderTraverse(function(key) {

        var renderRow = renderState.rows.remove(key);
        if (renderRow && renderRow.outer) {
            renderState.table.inner.removeChild(renderRow.outer);
        }
        state.rowMeta.remove(key);//TODO watch this it changed from {key:x}
    });

    // remove the header rows if any
    var colRemoves = this.getColumnRemoves_(table.columnMeta);
    colRemoves.forEach(function(col) {
        var renderInfo = renderState.headerCols[col.pos];
        if (renderState.headerRow && renderInfo.outer) {
            if (renderState.headerRow.inner) {
                renderState.headerRow.inner.removeChild(renderInfo.outer);
            }
            renderState.headerCols.splice(col.pos, 1);
        }
        state.columnMeta.splice(col.pos, 1);
    });


    // remove the columns from each row
    renderState.rows.inOrderTraverse(function(row) {
        colRemoves.forEach(function(col) {
            var renderInfo = row.cols[col.pos];
            if (renderInfo.outer) {
                row.inner.removeChild(renderInfo.outer);
            }
            row.cols.splice(col.pos, 1);
        });
    });
};

/**
 * @private
 * @param {!Element} parent
 * @param {!Node} el
 * @param {?{cols:Array<!recoil.ui.RenderedDecorator>}} row
 * @param {number} position
 */

recoil.ui.widgets.table.TableWidget.prototype.insertChildAtPos_ = function(parent, el, row, position)  {
    var actualPosition = 0;
    var i;
    var cols = row ? row.cols : this.renderState_.headerCols;

    for (i = 0; i < position; i++) {
        if (cols[i] && cols[i].outer) {
            actualPosition++;
        }
    }
    goog.dom.insertChildAt(parent, el, actualPosition);
};
/**
 * @private
 * @param {Object} oldRenderInfo
 * @param {!Element} parent
 * @param {number} position
 * @param {Object} tableMeta
 * @param {?recoil.ui.widgets.table.RowAndCellMeta_} row
 * @param {Object} columnMeta
 * @param {?{cols:Array<recoil.ui.RenderedDecorator>}} rowState
 * @return {Object}
 */
recoil.ui.widgets.table.TableWidget.prototype.replaceWidgetAndDecorator_ = function(oldRenderInfo, parent, position, tableMeta, row, columnMeta, rowState) {
    var type = row ? 'cell' : 'header';
    var cellMeta = row ? row.cellMeta[columnMeta.key] : {};
    var rowMeta = row ? row.meta : {};
    var decorator = this.getMetaValue(type + 'Decorator', tableMeta, rowMeta, columnMeta, cellMeta);
    var factory = this.getMetaValue(type + 'WidgetFactory', tableMeta, rowMeta, columnMeta, cellMeta);
    var widget;

    if (recoil.util.object.isEqual(decorator, oldRenderInfo.decorator)
        && recoil.util.object.isEqual(factory, oldRenderInfo.factory)) {
        return oldRenderInfo;
    }
    var res = {};
    var me = this;
    var mkHeader = function() {
        return factory(
            me.scope_,
            recoil.frp.table.TableCell.createHeader(
                me.scope_.getFrp(),
                me.tableB_, columnMeta.key));
    };
    if (!recoil.util.object.isEqual(decorator, oldRenderInfo.decorator)) {

        if (recoil.util.object.isEqual(factory, oldRenderInfo.factory)) {
            res = decorator ? decorator() : new recoil.ui.RenderedDecorator(null, null);
            if (oldRenderInfo.outer && res.outer) {
                this.replaceChild(parent, oldRenderInfo.outer, res.outer);
                this.moveChildren(oldRenderInfo.inner, res.inner);
            }
            else if (oldRenderInfo.outer) {
                parent.removeChild(oldRenderInfo.outer);
            }
            else if (res.outer && row) {
                res = this.createRenderInfoCell_(tableMeta, row.key, row, columnMeta);
                this.insertChildAtPos_(parent, res.outer, rowState, position);
            }
            else if (res.outer) {
                this.insertChildAtPos_(parent, res.outer, rowState, position);
                widget = mkHeader();
                widget.getComponent().render(res.inner);
            }
//            res.widget = oldRenderInfo.widget;
        }
        else {
            if (row) {
                // this is a cell create it as a cell
                res = this.createRenderInfoCell_(tableMeta, row.key, row, columnMeta);
                this.replaceChild(parent, oldRenderInfo.outer, res.outer);
            }
            else {
                res = decorator();
                this.replaceChild(parent, oldRenderInfo.outer, res.outer);
                widget = mkHeader();
                widget.getComponent().render(res.inner);
            }
        }
        res.factory = factory;

    }
    else if (oldRenderInfo.outer) {
        // no need to deal with null outer hear because the are not changing
        // so if the old one is null so is the new one and we dont' need to render
        // the cell
        res.inner = oldRenderInfo.inner;
        res.outer = oldRenderInfo.outer;
        goog.dom.removeChildren(oldRenderInfo.inner);
        if (row) {
            var cell = this.createRenderInfoCell_(tableMeta, row.key, row, columnMeta);
            res.factory = cell.factory;
            this.moveChildren(cell.inner, res.inner);
        }
        else {
            var header = mkHeader();
            header.getComponent().render(res.inner);
        }
    }
    res.decorator = decorator;

    return res;
};
/**
 * moves all the children from one element to another
 * @param {Element} from
 * @param {Element} to
 */
recoil.ui.widgets.table.TableWidget.prototype.moveChildren = function(from, to) {
    if (!from) {
        return;
    }
    var children = from.childNodes;
    var toMove = [];

    for (var i = 0; children && i < children.length; i++) {
        toMove.push(children[i]);
    }

    for (i = 0; i < toMove.length; i++) {
        if (from) {
            from.removeChild(toMove[i]);
        }
        if (to) {
            to.appendChild(toMove[i]);
        }
    }
};


/**
 * @param {!Element} parent
 * @param {Element} oldChild
 * @param {Element} newChild
 */
recoil.ui.widgets.table.TableWidget.prototype.replaceChild = function(parent, oldChild, newChild) {

    if (newChild) {
        parent.insertBefore(newChild, oldChild);
    }
    if (oldChild) {
        parent.removeChild(oldChild);
    }
};

/**
 * updates existing headers and cells if the widget, or decorator has changed
 *
 * @private
 * @param {Object} table meta data decribing the whole table
 */

recoil.ui.widgets.table.TableWidget.prototype.doUpdates_ = function(table) {
    var renderState = this.renderState_;
    var me = this;
    var state = this.state_;
    var tableMeta = table.tableMeta;
    var meta;
    for (var i = 0; i < table.columnMeta.length; i++) {
        meta = table.columnMeta[i];

        if (renderState.headerRow) {
            var oldRenderInfo = renderState.headerCols[i];
            renderState.headerCols[i] = this.replaceWidgetAndDecorator_(oldRenderInfo, renderState.headerRow.inner, i, tableMeta, null, meta, null);
        }
    }

    renderState.rows.inOrderTraverse(function(row) {
        var newRow = table.rowMeta.findFirst(row);
        var rowDecorator = me.getMetaValue('rowDecorator', tableMeta, newRow.meta);
        if (rowDecorator !== row.decorator) {
            var newRowDec = rowDecorator();
            // clone otherwize removeChildren will change this
            var children = goog.array.clone(goog.dom.getChildren(row.inner));
            goog.dom.removeChildren(row.inner);
            children.forEach(function(child) {
                newRowDec.inner.appendChild(child);
            });
            recoil.ui.events.longListen(newRowDec.outer, goog.events.EventType.CLICK,
                                    me.rowClickEvent_, undefined, row.key);
            goog.dom.insertSiblingAfter(newRowDec.outer, row.outer);
            goog.dom.removeNode(row.outer);

            row.inner = newRowDec.inner;
            row.outer = newRowDec.outer;
            row.decorator = newRowDec.decorator;
        }
        for (var i = 0; i < table.columnMeta.length; i++) {
            var columnMeta = table.columnMeta[i];
            var cellMeta = newRow.cellMeta[columnMeta.key];
            var meta = {};
            var oldRenderInfo = row.cols[i];
            row.cols[i] = me.replaceWidgetAndDecorator_(oldRenderInfo, row.inner, i, tableMeta, newRow, columnMeta, row);
        }
    });
};

/**
 * get columns that didn't exist but now do
 * @private
 * @param {!Array<{key:!recoil.structs.table.ColumnKey}>} columnMeta
 * @return {!Array<{key:!recoil.structs.table.ColumnKey}>}
 */
recoil.ui.widgets.table.TableWidget.prototype.getAddedColumns_ = function(columnMeta) {
    var oldColumns = this.state_.columnMeta;
    var oldColMap = {};
    var res = [];

    var i = 0;
    for (i = 0; i < oldColumns.length; i++) {
        oldColMap[oldColumns[i].key] = true;
    }


    for (i = 0; i < columnMeta.length; i++) {
        if (!oldColMap[columnMeta[i].key]) {
            res.push(columnMeta[i]);
        }
    }
    return res;

};
/**
 * @private
 * @param {!recoil.ui.widgets.table.TableInfo_} table table meta data
 *
 */
recoil.ui.widgets.table.TableWidget.prototype.doColumnAdds_ = function(table) {
    var renderState = this.renderState_;
    var me = this;
    var state = this.state_;
    var tableMeta = table.tableMeta;
    var addedColumns = this.getAddedColumns_(table.columnMeta);
    var headerRowDecorator = this.getMetaValue('headerRowDecorator', tableMeta);
    var headerRowDecoratorVal = headerRowDecorator ? headerRowDecorator() : null;


    if (headerRowDecoratorVal && renderState.headerRow) {
        if (headerRowDecorator === renderState.headerRow.decorator) {
            //nothing has changed
        }
        else {
            var newHeaderRow = headerRowDecorator();
            this.replaceChild(renderState.table.inner, renderState.headerRow.outer, newHeaderRow.outer);
            if (renderState.headerRow.inner) {
                this.moveChildren(renderState.headerRow.inner, newHeaderRow.inner);
            }
            else {
                renderState.headerCols = [];
                renderState.headerRow.inner = newHeaderRow.inner;
                this.addHeaders_(state.columnMeta, tableMeta);
            }

            renderState.headerRow = newHeaderRow;
        }
    } else if (headerRowDecoratorVal) {

        renderState.headerRow = headerRowDecoratorVal;
        this.addHeaders_(state.columnMeta, tableMeta);
        goog.dom.insertChildAt(renderState.table.inner,
                               renderState.headerRow.outer, 0);




        // just construct the existing headers TODO
    }
    else if (renderState.headerRow) {

        renderState.table.inner.removeChild(renderState.headerRow.outer);
        renderState.headerRow = false;
    }

    // add new columns to existing rows and headers
    this.addHeaders_(addedColumns, tableMeta);
    addedColumns.forEach(function(meta) {
        state.columnMeta.push(meta);
    });
    this.addRowColumns_(addedColumns, tableMeta, table.rowMeta);
};

/**
 * @private
 * @param {!recoil.ui.widgets.table.TableInfo_} table table meta data
 */
recoil.ui.widgets.table.TableWidget.prototype.doColumnMoves_ = function(table) {
    var movedColumns = this.getColumnMoves_(table.columnMeta);
    var renderState = this.renderState_;
    var me = this;
    var state = this.state_;
    var to;
    var from;
    var newColumnMeta = [];
    var newHeaderCols = [];

    for (to = 0; to < movedColumns.length; to++) {
        from = movedColumns[to];
        newColumnMeta.push(state.columnMeta[from]);
        if (renderState.headerRow) {
            var renderInfo = renderState.headerCols[from];

            if (from !== to) {
                if (renderState.headerRow.inner && renderInfo.outer) {
                    renderState.headerRow.inner.removeChild(renderInfo.outer);

                    goog.dom.insertChildAt(renderState.headerRow.inner, renderInfo.outer, to);
                }
            }
            newHeaderCols.push(renderInfo);

        }

    }

    renderState.headerCols = newHeaderCols;

    renderState.rows.inOrderTraverse(function(row) {
        var newCols = [];
        for (to = 0; to < movedColumns.length; to++) {
            from = movedColumns[to];
            var renderInfo = row.cols[from];
            newCols.push(renderInfo);
            if (from !== to) {
                if (renderInfo.outer) {
                    row.inner.removeChild(renderInfo.outer);
                    goog.dom.insertChildAt(row.inner, renderInfo.outer, to);
                }
            }
        }
        row.cols = newCols;
    });

    state.columnMeta = newColumnMeta;

};
/**
 * @private
 * @param {goog.structs.AvlTree<Object>} sortedRowMeta
 * @return {goog.structs.AvlTree<Object>} rowmeta and the position it should be inserted
 */
recoil.ui.widgets.table.TableWidget.prototype.getNewRows_ = function(sortedRowMeta) {

    var me = this;
    var state = this.state_;
    var result = new goog.structs.AvlTree(recoil.ui.widgets.table.TableWidget.rowMetaPosCompare_);

    var pos = 0;

    sortedRowMeta.inOrderTraverse(function(row) {
        if (!state.rowMeta.findFirst(row)) {
            var newRow = goog.object.clone(row);
            result.add(newRow);
        }
        pos++;
    });

    return result;

};
/**
 * todo split out the table, and the useful meta data from a table
 * this will be helpful, because we don't really need to trigger an update
 * unless the useful parts have changed
 * @private
 * @param {recoil.ui.ComponentWidgetHelper} helper
 * @param {!recoil.frp.Behaviour<!recoil.ui.widgets.table.TableInfo_>} tableB meta data associated with table
 */
recoil.ui.widgets.table.TableWidget.prototype.updateState_ = function(helper, tableB) {
    var me = this;
    var state = this.state_;
    var renderState = this.renderState_;

    if (helper.isGood()) {
        // not just build table
        if (this.renderState_.errors) {
            this.container_.getElement().removeChild(this.renderState_.errors);
            if (this.renderState_.table) {
                this.container_.getElement().appendChild(this.renderState_.table.outer);
            }
            this.renderState_.errors = null;
        }

        var table = tableB.get();
        var tableMeta = table.tableMeta;
        /**
         * @type {function () : recoil.ui.RenderedDecorator}
         */
        var tableDecorator = this.getMetaValue('tableDecorator', tableMeta);
        var tableComponent = tableDecorator();

        if (this.renderState_.table) {
            if (this.renderState_.table.decorator !== tableDecorator) {
                this.container_.getElement().removeChild(this.renderState_.table.outer);
                this.moveChildren(this.renderState_.table.inner, tableComponent.inner);
                goog.dom.insertChildAt(this.container_.getElement(), tableComponent.outer, 0);
                this.renderState_.table = tableComponent;
            }

        }
        else {
            this.container_.getElement().appendChild(tableComponent.outer);
            this.renderState_.table = tableComponent;

        }
        this.renderState_.table.decorator = tableDecorator;

        var sortedRowMeta = new goog.structs.AvlTree(recoil.ui.widgets.table.TableWidget.rowMetaPosCompare_);
        table.rowMeta.inOrderTraverse(function(row) {
            sortedRowMeta.add(row);
        });

        this.doRemoves_(table);
        this.doRowMoves_(sortedRowMeta);
        this.doColumnAdds_(table);
        this.doColumnMoves_(table);
        // all the columns are in the right position, update the decorators and stuff so they
        // are correct
        this.doUpdates_(table);

        // at this point every existing cell has the correct behaviour
        // now all we have to do is add th new rows

        var sortedNewRows = this.getNewRows_(sortedRowMeta);
        var newSelect = null;

        sortedNewRows.inOrderTraverse(function(row) {

            // do this in order of the columns defined in the meta data
            var rowDecorator = me.getMetaValue('rowDecorator', tableMeta, row.meta);
            var rowComponent = rowDecorator();
            recoil.ui.events.longListen(rowComponent.outer, goog.events.EventType.CLICK,
                                    me.rowClickEvent_, undefined, row.key);

            rowComponent.cols = [];
            rowComponent.key = row.key;
            if (me.selectNewRow_) {
                newSelect = {key: row.key, el: rowComponent.outer};
            }
            rowComponent.rowPos = row.rowPos;
            rowComponent.keyCols = row.keyCols;
            goog.dom.insertChildAt(me.renderState_.table.inner, rowComponent.outer, me.renderState_.headerRow ? row.rowPos + 1 : row.rowPos);


            table.columnMeta.forEach(function(columnMeta) {
                me.createCell_(tableMeta, rowComponent, row, columnMeta);
            });
            renderState.rows.add(rowComponent);

        });
        this.state_ = table;
        if (newSelect) {
            this.scope_.getFrp().accessTrans(function() {
                if (table.canSelect) {
                    me.selected_.set([newSelect.key]);
                }
                if (newSelect.el) {
                    newSelect.el.scrollIntoView();
                }
            }, this.selected_);
        }

    }
    else {
        if (!this.renderState_.errors) {
            if (this.renderState_.table) {

                this.container_.getElement().removeChild(this.renderState_.table.outer);
            }
            this.renderState_.errors = goog.dom.createDom('div');
            this.container_.getElement().appendChild(this.renderState_.errors);
        }
        goog.dom.removeChildren(this.renderState_.errors);

        helper.errors().forEach(function(error) {
            var div = goog.dom.createDom('div', {class: 'error'}, goog.dom.createTextNode(error.toString()));
            div.onclick = function() {
                console.error('Error was', error);
            };
            me.renderState_.errors.appendChild(
                div);

        });

        // display error or not ready state
    }
    this.selectNewRow_ = false;
};

/**
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.table.TableWidget.prototype.getComponent = function() {
    return this.container_;
};

/**
 * @param {!recoil.frp.Behaviour<!recoil.structs.table.Table>|!recoil.structs.table.Table} table
 */
recoil.ui.widgets.table.TableWidget.prototype.attachStruct = function(table) {
    var util = new recoil.frp.Util(this.scope_.getFrp());
    this.tableB_ = util.toBehaviour(table);
    var me = this;
    this.scope_.getFrp().accessTrans(
        function() {
            me.tableBB_.set(me.tableB_);
        }, me.tableBB_);
    this.renderInfoB_ = this.createRenderInfo_(this.tableB_);
    this.helper_.attach(this.renderInfoB_);
    this.selectionHelper_.attach(this.selected_, this.createSelectInfo_(this.tableB_));
};

/**
 * @param {!recoil.frp.Behaviour<!recoil.structs.table.Table> | !recoil.structs.table.Table} table
 * @param {!recoil.frp.Behaviour<!recoil.ui.widgets.TableMetaData> |!recoil.ui.widgets.TableMetaData} meta
 */
recoil.ui.widgets.table.TableWidget.prototype.attach = function(table, meta) {

    var util = new recoil.frp.Util(this.scope_.getFrp());
    var frp = this.scope_.getFrp();

    var tableB = util.toBehaviour(table);
    var metaB = util.toBehaviour(meta);

    var complete = frp.liftBI(function() {
        return metaB.get().applyMeta(tableB.get());
    }, function(val) {
        tableB.set(val);
    }, tableB, metaB);


    this.attachStruct(complete);

};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.table.TableWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;



/**
 *
 * @enum {number}
 * @final
 */
recoil.ui.widgets.table.TableWidget.SelectionMode = {
    NONE: 1,
    SINGLE: 2,
    MULTI: 3
};
