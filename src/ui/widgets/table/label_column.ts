goog.provide('recoil.ui.widgets.table.LabelColumn');

goog.require('recoil.frp.Behaviour');
goog.require('recoil.frp.struct');
goog.require('recoil.ui.BoolWithExplanation');
goog.require('recoil.ui.widgets.LabelWidget');
goog.require('recoil.ui.widgets.table.Column');


/**
 * @implements {recoil.ui.widgets.table.Column}
 * @template T
 * @constructor
 * @param {recoil.structs.table.ColumnKey} key
 * @param {string|Node} name
 * @param {(recoil.frp.Behaviour<Object>|Object)=} opt_meta
 */
recoil.ui.widgets.table.LabelColumn = function(key, name, opt_meta) {
    this.key_ = key;
    this.name_ = name;
    this.options_ = opt_meta || {};
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
recoil.ui.widgets.table.LabelColumn.prototype.getMeta = function(curMeta) {
    var meta = {name: this.name_,
                cellWidgetFactory: recoil.ui.widgets.table.LabelColumn.defaultWidgetFactory_};

    goog.object.extend(meta, this.options_, curMeta);
    return meta;
};

/**
 * @private
 * @param {!recoil.ui.WidgetScope} scope
 * @param {!recoil.frp.Behaviour<recoil.structs.table.TableCell>} cellB
 * @return {!recoil.ui.Widget}
 */
recoil.ui.widgets.table.LabelColumn.defaultWidgetFactory_ =
    function(scope, cellB) 
{
    var frp = scope.getFrp();
    var widget = new recoil.ui.widgets.LabelWidget(scope);
    var value = recoil.frp.table.TableCell.getValue(frp, cellB);

    var metaData = recoil.frp.table.TableCell.getMeta(frp, cellB);
    widget.attachStruct(recoil.frp.struct.extend(frp, metaData, {name: value}));
    return widget;
};
/**
 * @const
 * @type {!Object}
 */
recoil.ui.widgets.table.LabelColumn.meta = {cellWidgetFactory: recoil.ui.widgets.table.LabelColumn.defaultWidgetFactory_};
/**
 * @param {!recoil.ui.WidgetScope} scope
 * @param {!recoil.frp.Behaviour<recoil.structs.table.TableCell>} cellB
 * @return {!recoil.ui.Widget}
 */
recoil.ui.widgets.table.LabelColumn.defaultWidgetFactory = recoil.ui.widgets.table.LabelColumn.defaultWidgetFactory_;

/**
 * @return {recoil.structs.table.ColumnKey}
 */
recoil.ui.widgets.table.LabelColumn.prototype.getKey = function() {
    return this.key_;
};
