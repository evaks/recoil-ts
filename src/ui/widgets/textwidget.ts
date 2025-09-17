/**
 *
 * @param {!recoil.ui.WidgetScope} scope
 * @constructor
 * @implements recoil.ui.Widget
 */
recoil.ui.widgets.TextWidget = function(scope) {
    this.component_ = new goog.ui.Textarea('');
};

/**
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.TextWidget.prototype.getComponent = function() {
    return this.component_;
};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.TextWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;
