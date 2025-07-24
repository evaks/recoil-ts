goog.provide('recoil.ui.widgets.table.InputComboColumn');

goog.require('recoil.frp.Debug');
goog.require('recoil.frp.struct');
goog.require('recoil.ui.widgets.ComboWidget');
goog.require('recoil.ui.widgets.table.Column');

/**
 *
 * @param {recoil.structs.table.ColumnKey} key
 * @param {string|Node} name
 * @param {recoil.frp.Behaviour<!Array<T>>|Array<T>} list
 * @param {(recoil.frp.Behaviour<Object>|Object)=} opt_options
 * @implements {recoil.ui.widgets.table.Column}
 * @template T
 * @constructor
 */
recoil.ui.widgets.table.InputComboColumn = function(key, name, list, opt_options) {
    this.key_ = key;
    this.name_ = name;
    this.list_ = list;
    this.options_ = opt_options || {};
};

/**
 *
 * @param {recoil.ui.WidgetScope} scope
 * @param {!recoil.frp.Behaviour<recoil.structs.table.TableCell>} cellB
 * @return {recoil.ui.Widget}
 */
recoil.ui.widgets.table.InputComboColumn.defaultWidgetFactory = function(scope, cellB) {
    var frp = scope.getFrp();
    var value = recoil.frp.table.TableCell.getValue(frp, cellB);


    var metaData = recoil.frp.table.TableCell.getMeta(frp, cellB);

    let input = new recoil.ui.widgets.InputWidget(scope);
    var widget = new recoil.ui.widgets.ComboWidget(scope, input, function(v) {
        input.forceSetValue(v);
    });

    widget.attachStruct(recoil.frp.struct.extend(frp, metaData, {value: value}));
    input.attachStruct(recoil.frp.struct.extend(frp, metaData, {value: value}));

    return widget;
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
recoil.ui.widgets.table.InputComboColumn.prototype.getMeta = function(curMeta) {
    var meta = {name: this.name_, list: this.list_,
        cellWidgetFactory: recoil.ui.widgets.table.InputComboColumn.defaultWidgetFactory};

    goog.object.extend(meta, this.options_, curMeta);
    return meta;
};

/**
 * @return {recoil.structs.table.ColumnKey}
 */
recoil.ui.widgets.table.InputComboColumn.prototype.getKey = function() {
    return this.key_;
};




