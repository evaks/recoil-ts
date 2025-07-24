goog.provide('recoil.ui.widgets.table.NumberComboColumn');

goog.require('recoil.frp.Behaviour');
goog.require('recoil.ui.widgets.ComboWidget');
goog.require('recoil.ui.widgets.NumberWidget');
goog.require('recoil.ui.widgets.table.Column');
/**
 *
 * @param {recoil.structs.table.ColumnKey} key
 * @param {string|Node} name
 * @param {(recoil.frp.Behaviour<Object>|Object)=} opt_options
 * @implements {recoil.ui.widgets.table.Column}
 * @constructor
 */
recoil.ui.widgets.table.NumberComboColumn = function(key, name, opt_options) {
    this.key_ = key;
    this.options_ = opt_options || {};
    this.name_ = name;
    //, opt_maxB, opt_stepB, opt_editableB
};
/**
 * @private
 * @param {recoil.ui.WidgetScope} scope
 * @param {!recoil.frp.Behaviour<recoil.structs.table.TableCell>} cellB
 * @return {recoil.ui.Widget}
 */
recoil.ui.widgets.table.NumberComboColumn.defaultWidgetFactory_ = function(scope, cellB) {

    var frp = scope.getFrp();
    var widget = new recoil.ui.widgets.NumberWidget(scope);
    var combo = new recoil.ui.widgets.ComboWidget(scope, widget);
    var value = recoil.frp.table.TableCell.getValue(frp, cellB);
    var meta = recoil.frp.table.TableCell.getMeta(frp, cellB);
    widget.attachStruct(recoil.frp.struct.extend(frp, meta, {value: value}));
    combo.attachStruct(recoil.frp.struct.extend(frp, meta, {value: value}));
    return combo;
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
recoil.ui.widgets.table.NumberComboColumn.prototype.getMeta = function(curMeta) {
    var meta = {name: this.name_,
                cellWidgetFactory: recoil.ui.widgets.table.NumberComboColumn.defaultWidgetFactory_};

    goog.object.extend(meta, this.options_, curMeta);
    return meta;
};

/**
 * @return {recoil.structs.table.ColumnKey}
 */
recoil.ui.widgets.table.NumberComboColumn.prototype.getKey = function() {
    return this.key_;
};
