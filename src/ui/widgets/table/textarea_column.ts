goog.provide('recoil.ui.widgets.table.TextAreaColumn');

goog.require('recoil.frp.Behaviour');
goog.require('recoil.frp.struct');
goog.require('recoil.ui.BoolWithExplanation');
goog.require('recoil.ui.widgets.TextAreaWidget');
goog.require('recoil.ui.widgets.table.Column');


/**
 * @implements {recoil.ui.widgets.table.Column}
 * @template T
 * @constructor
 * @param {recoil.structs.table.ColumnKey} key
 * @param {string|!recoil.ui.message.Message} name
 *
 */
recoil.ui.widgets.table.TextAreaColumn = function(key, name) {
    this.key_ = key;
    this.name_ = name;
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
recoil.ui.widgets.table.TextAreaColumn.prototype.getMeta = function(curMeta) {
    var meta = {name: this.name_,
                cellWidgetFactory: recoil.ui.widgets.table.TextAreaColumn.defaultWidgetFactory_};

    goog.object.extend(meta, curMeta);
    return meta;
};

/**
 * @private
 * @param {!recoil.ui.WidgetScope} scope
 * @param {!recoil.frp.Behaviour<recoil.structs.table.TableCell>} cellB
 * @return {!recoil.ui.Widget}
 */
recoil.ui.widgets.table.TextAreaColumn.defaultWidgetFactory_ =
    function(scope, cellB) 
{
    var frp = scope.getFrp();
    var widget = new recoil.ui.widgets.TextAreaWidget(scope);
    var value = recoil.frp.table.TableCell.getValue(frp, cellB);

    var metaData = recoil.frp.table.TableCell.getMeta(frp, cellB);
    widget.attachStruct(recoil.frp.struct.extend(frp, metaData, {value: value}));
    return widget;
};
/**
 * @const
 * @type {!Object}
 */
recoil.ui.widgets.table.TextAreaColumn.meta = {cellWidgetFactory: recoil.ui.widgets.table.TextAreaColumn.defaultWidgetFactory_};
/**
 * @param {!recoil.ui.WidgetScope} scope
 * @param {!recoil.frp.Behaviour<recoil.structs.table.TableCell>} cellB
 * @return {!recoil.ui.Widget}
 */
recoil.ui.widgets.table.TextAreaColumn.defaultWidgetFactory = recoil.ui.widgets.table.TextAreaColumn.defaultWidgetFactory_;

/**
 * @return {recoil.structs.table.ColumnKey}
 */
recoil.ui.widgets.table.TextAreaColumn.prototype.getKey = function() {
    return this.key_;
};
