goog.provide('recoil.ui.widgets.table.CustomColumn');

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
 * @param {string} name
 * @param {function(!recoil.ui.WidgetScope,!recoil.frp.Behaviour<recoil.structs.table.TableCell>): !recoil.ui.Widget} factory
 *
 */
recoil.ui.widgets.table.CustomColumn = function(key, name, factory) {
    this.key_ = key;
    this.name_ = name;
    this.factory_ = factory;
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
recoil.ui.widgets.table.CustomColumn.prototype.getMeta = function(curMeta) {
    var meta = {name: this.name_,
                cellWidgetFactory: this.factory_};

    goog.object.extend(meta, curMeta);
    return meta;
};

/**
 * @return {recoil.structs.table.ColumnKey}
 */
recoil.ui.widgets.table.CustomColumn.prototype.getKey = function() {
    return this.key_;
};
