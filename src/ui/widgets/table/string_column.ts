goog.provide('recoil.ui.widgets.table.StringColumn');

goog.require('recoil.frp.Behaviour');
goog.require('recoil.frp.struct');
goog.require('recoil.ui.BoolWithExplanation');
goog.require('recoil.ui.widgets.InputWidget');
goog.require('recoil.ui.widgets.table.Column');


/**
 * @implements {recoil.ui.widgets.table.Column}
 * @template T
 * @constructor
 * @param {recoil.structs.table.ColumnKey} key
 * @param {string|Node|!recoil.ui.message.Message} name
 * @param {number=} opt_maxChars
 * @param {boolean=} opt_editable
 *
 */
recoil.ui.widgets.table.StringColumn = function(key, name, opt_maxChars, opt_editable) {
    this.meta_ = recoil.util.object.removeUndefined(
        {maxChars: opt_maxChars,
         editable: opt_editable});
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
recoil.ui.widgets.table.StringColumn.prototype.getMeta = function(curMeta) {
    var meta = {name: this.name_,
                cellWidgetFactory: recoil.ui.widgets.table.StringColumn.defaultWidgetFactory_};

    goog.object.extend(meta, this.meta_, curMeta);
    return meta;
};

/**
 * @private
 * @param {!recoil.ui.WidgetScope} scope
 * @param {!recoil.frp.Behaviour<recoil.structs.table.TableCell>} cellB
 * @return {!recoil.ui.Widget}
 */
recoil.ui.widgets.table.StringColumn.defaultWidgetFactory_ =
    function(scope, cellB) 
{
    var frp = scope.getFrp();
    var widget = new recoil.ui.widgets.InputWidget(scope);
    var value = recoil.frp.table.TableCell.getValue(frp, cellB);

    var metaData = recoil.frp.table.TableCell.getMeta(frp, cellB);
    widget.attachStruct(recoil.frp.struct.extend(frp, metaData, {value: value}));
    return widget;
};
/**
 * @param {!recoil.ui.WidgetScope} scope
 * @param {!recoil.frp.Behaviour<recoil.structs.table.TableCell>} cellB
 * @return {!recoil.ui.Widget}
 */
recoil.ui.widgets.table.StringColumn.defaultWidgetFactory = recoil.ui.widgets.table.StringColumn.defaultWidgetFactory_;

/**
 * @return {recoil.structs.table.ColumnKey}
 */
recoil.ui.widgets.table.StringColumn.prototype.getKey = function() {
    return this.key_;
};
