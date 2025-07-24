goog.provide('recoil.ui.widgets.table.Column');
goog.provide('recoil.ui.widgets.table.makeStructColumn');

goog.require('recoil.structs.table.ColumnKey');
goog.require('recoil.structs.table.TableCell');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.WidgetScope');
/**
 * @interface
 * @template T
 */
recoil.ui.widgets.table.Column = function() {
};
/**
 * adds all the meta information that a column should need
 * this should at least include cellWidgetFactory
 * other meta data can include:
 *   headerDecorator
 *   cellDecorator
 * and anything else specific to this column such as options for a combo box
 *
 * @param {Object} curMeta
 * @return {Object}
 */
recoil.ui.widgets.table.Column.prototype.getMeta = function(curMeta) {

};

/**
 * @return {recoil.structs.table.ColumnKey}
 */
recoil.ui.widgets.table.Column.prototype.getKey = function() {

};


/**
 * a utility to make a column that attaches to a widget
 * that has the interface of
 * create = new Widget(scope)
 * attachStruct = function ({value:*,...})
 * @template T
 * @param {function (new:recoil.ui.Widget,T,?):undefined} widgetCons
 * @param {?=} opt_options
 * @return {function(!recoil.structs.table.ColumnKey,(string|!recoil.ui.message.Message|!Element),Object=)}
 */
recoil.ui.widgets.table.makeStructColumn = function(widgetCons, opt_options) {
    var factory = function(scope, cellB) {
        var frp = scope.getFrp();
        var widget = new widgetCons(scope, opt_options);
        var value = recoil.frp.table.TableCell.getValue(frp, cellB);


        var metaData = recoil.frp.table.TableCell.getMeta(frp, cellB);
        widget.attachStruct(recoil.frp.struct.extend(frp, metaData, {value: value}));
        return widget;
    };
    /**
     * @constructor
     * @param {!recoil.structs.table.ColumnKey} column
     * @param {string|!recoil.ui.message.Message|!Element} name
     * @param {Object=} opt_meta
     * @implements {recoil.ui.widgets.table.Column}
     */
    var res = function(column, name, opt_meta) {
        this.key_ = column;
        this.name_ = name;
        this.meta_ = opt_meta || {};
    };

    res.prototype.getMeta = function(curMeta) {
        var meta = {name: this.name_,
                    cellWidgetFactory: factory};
        goog.object.extend(meta, this.meta_, curMeta);
        return meta;
    };

    /**
     * @return {recoil.structs.table.ColumnKey}
     */
    res.prototype.getKey = function() {
        return this.key_;
    };

    return res;
};


/**
 * a utility to make a column that attaches to a widget
 * that has the interface of
 * create = new Widget(scope)
 * attachStruct = function ({value:*,...})
 * @template T
 * @param {function (new:recoil.ui.CellWidget,T,?):undefined} widgetCons
 * @param {?=} opt_extra
 * @return {function(!recoil.structs.table.ColumnKey,string)}
 */
recoil.ui.widgets.table.makeCellColumn = function(widgetCons, opt_extra) {
    var factory = function(scope, cellB) {
        var frp = scope.getFrp();
        var widget = new widgetCons(scope, opt_extra);
        var newCellB = frp.liftBI(
            function(v) {
                return v;
            },
            function(v) {
                var meta = goog.object.clone(cellB.get().getMeta());
                goog.object.extend(meta, v.getMeta());
                var res = new recoil.structs.table.TableCell(v.getValue(), meta);
                cellB.set(res);
            }, cellB);
        widget.attachCell(newCellB);
        return widget;
    };
    /**
     * @constructor
     * @param {!recoil.structs.table.ColumnKey} column
     * @param {string} name
     * @param {Object=} opt_meta
     * @implements {recoil.ui.widgets.table.Column}
     */
    var res = function(column, name, opt_meta) {
        this.key_ = column;
        this.name_ = name;
        this.meta_ = opt_meta || {};
    };

    res.prototype.getMeta = function(curMeta) {
        var meta = {name: this.name_,
                    cellWidgetFactory: factory};
        goog.object.extend(meta, this.meta_, curMeta);
        return meta;
    };

    /**
     * @return {recoil.structs.table.ColumnKey}
     */
    res.prototype.getKey = function() {
        return this.key_;
    };

    return res;
};
