goog.provide('recoil.ui.widgets.table.RadioColumn');

goog.require('recoil.ui.widgets.RadioWidget');
goog.require('recoil.ui.widgets.table.Column');

/**
 *
 * @param {recoil.structs.table.ColumnKey} key
 * @param {string} name
 * @param {(recoil.frp.Behaviour<Object>|Object)=} opt_options
 * @implements {recoil.ui.widgets.table.Column}
 * @template T
 * @constructor
 */
recoil.ui.widgets.table.RadioColumn = function(key, name, opt_options) {
    this.key_ = key;
    this.name_ = name;
    this.options_ = opt_options || {};
};

/**
 *
 * @param {recoil.ui.WidgetScope} scope
 * @param {!recoil.frp.Behaviour<recoil.structs.table.TableCell>} cellB
 * @return {recoil.ui.Widget}
 * @private
 */
recoil.ui.widgets.table.RadioColumn.defaultWidgetFactory_ = function(scope, cellB) {
    var frp = scope.getFrp();
    var widget = new recoil.ui.widgets.RadioWidget(scope);
    var value = recoil.frp.table.TableCell.getValue(frp, cellB);
    var meta = recoil.frp.table.TableCell.getMeta(frp, cellB);

    widget.attachStruct(recoil.frp.struct.extend(frp, meta, {value: value}));
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
recoil.ui.widgets.table.RadioColumn.prototype.getMeta = function(curMeta) {
    var meta = {name: this.name_,
                cellWidgetFactory: recoil.ui.widgets.table.RadioColumn.defaultWidgetFactory_};

    goog.object.extend(meta, this.options_, curMeta);
    return meta;
};

/**
 * @return {recoil.structs.table.ColumnKey}
 */
recoil.ui.widgets.table.RadioColumn.prototype.getKey = function() {
    return this.key_;
};
