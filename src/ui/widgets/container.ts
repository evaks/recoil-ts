/**
 * This is a widget takes a dom element node and turns it into a widget
 * that dom element can contain other widgets.
 *
 * This widget is usefull if you want to specify the basic layout of a node by using the DOM
 * and simply placing subwidgets in it, there is no attach, the widgets included in here need
 * to be attached outside
 *
 */
goog.provide('recoil.ui.widgets.ContainerWidget');

goog.require('goog.ui.Container');
goog.require('recoil.ui.ComponentWidgetHelper');
goog.require('recoil.ui.Widget');


/**
 *
 * @template T
 * @param {!Node} node
 * @implements {recoil.ui.Widget}
 * @constructor
 */
recoil.ui.widgets.ContainerWidget = function(node) {
    this.container_ = new goog.ui.Component();
    this.container_.addChild(recoil.ui.ComponentWidgetHelper.elementToNoFocusControl(node), true);
};

/**
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.ContainerWidget.prototype.getComponent = function() {
    return this.container_;
};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.ContainerWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;

