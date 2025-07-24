goog.provide('recoil.ui.widgets.PopupWidget');

goog.require('goog.dom');
goog.require('goog.positioning.AnchoredViewportPosition');
goog.require('goog.ui.Container');
goog.require('goog.ui.Popup');
goog.require('recoil.ui.ComponentWidgetHelper');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.WidgetScope');

/**
 *
 * @template T
 * @param {!recoil.ui.WidgetScope} scope
 * @implements {recoil.ui.Widget}
 * @constructor
 */
recoil.ui.widgets.PopupWidget = function(scope) {
    this.scope_ = scope;
    this.popupContainer_ = goog.dom.createDom('div');
    this.displayContainer_ = goog.dom.createDom(
        'div',
        {'class' : 'goog-inline-block goog-menu-button-caption', tabindex: 0});
    this.buttonContainer_ = goog.dom.createDom('div', {'class' : 'goog-inline-block goog-menu-button-dropdown'});
    this.displayAndButtonContainer_ = goog.dom.createDom('div', {'class' : 'goog-inline-block goog-menu-button'});
    var outerBox = goog.dom.createDom('div', {'class' : 'goog-inline-block goog-menu-button-outer-box'});
    var innerBox = goog.dom.createDom('div', {'class' : 'goog-inline-block goog-menu-button-inner-box'});

    goog.dom.append(this.displayAndButtonContainer_, outerBox);
    goog.dom.append(outerBox, innerBox);
    goog.dom.append(innerBox, this.displayContainer_);
    goog.dom.append(innerBox, this.buttonContainer_);

    this.container_ = new goog.ui.Component();
    var toControl = recoil.ui.ComponentWidgetHelper.elementToNoFocusControl;

//    this.container_.addClassName("goog-inline-block");

    var buttonControl = recoil.ui.ComponentWidgetHelper.elementToControl(this.displayAndButtonContainer_);
    this.container_.addChild(buttonControl, true);
    this.container_.addChild(toControl(this.popupContainer_), true);
    this.popup_ = new goog.ui.Popup(this.popupContainer_);
    goog.dom.setProperties(this.popupContainer_, {class: 'recoil-popup'});

    this.popup_.setVisible(false);
    var me = this;
    var doPopup = function() {
        me.popup_.setVisible(false);
        me.popup_.setPinnedCorner(goog.positioning.Corner.TOP_LEFT); // button corner
        me.popup_.setMargin(new goog.math.Box(0, 0, 0, 0));
        me.popup_.setPosition(new goog.positioning.AnchoredViewportPosition(me.displayAndButtonContainer_,
        goog.positioning.Corner.BOTTOM_LEFT));

        me.popup_.setVisible(true);

    };
    this.displayAndButtonContainer_.onmousedown = doPopup;

    goog.events.listen(this.displayAndButtonContainer_
, goog.events.EventType.KEYDOWN,
                       function(e) {
                               console.log(e.keyCode);
                           if (e.keyCode === goog.events.KeyCodes.SPACE) {
                               if (me.popup_.isVisible()) {
                                   me.popup_.setVisible(false);
                               }
                               else {
                                   doPopup();
                               }
                           }
                           else if (e.keyCode === goog.events.KeyCodes.ESC) {
                               me.popup_.setVisible(false);
                           }

                       });
    goog.events.listen(this.popup_.getElement(), goog.events.EventType.BLUR, function(e) {
        console.log('bluring popup');
    });

    this.popup_.setHideOnEscape(true);
    this.popup_.setAutoHide(true);
    this.helper_ = new recoil.ui.ComponentWidgetHelper(scope, this.container_, this, this.updateState_);
};


/**
 */
recoil.ui.widgets.PopupWidget.options = recoil.frp.Util.Options('popupWidget', 'displayWidget');

/**
 * @param {!recoil.frp.Behaviour<!recoil.ui.Widget>|!recoil.ui.Widget} popupWidget the widget that will be displayed in the popup
 * @param {!recoil.frp.Behaviour<!recoil.ui.Widget>|!recoil.ui.Widget} displayWidget the widget that will be displayed normally (no popup required
 * @suppress {missingProperties}
 */

recoil.ui.widgets.PopupWidget.prototype.attach = function(popupWidget, displayWidget)  {
    recoil.ui.widgets.PopupWidget.options.displayWidget(displayWidget).popupWidget(popupWidget).attach(this);
};


/**
 * see recoil.ui.widgets.PopupWidget.options fro valid options
 * @param {!Object|!recoil.frp.Behaviour<Object>} options
 * @suppress {missingProperties}
 */
recoil.ui.widgets.PopupWidget.prototype.attachStruct = function(options) {
    var frp = this.helper_.getFrp();
    var bound = recoil.ui.widgets.PopupWidget.options.bind(frp, options);

    this.displayWidgetB = bound.displayWidget();
    this.popupWidgetB = bound.popupWidget();

    this.helper_.attach(this.popupWidgetB, this.displayWidgetB);

};

/**
 * @private
 * @param {!Element} container where the component goes
 * @param {goog.ui.Component} current the currently renderd component
 * @param {goog.ui.Component} newComponent the component we want to render
 * @return {goog.ui.Component} the new Component
 */
recoil.ui.widgets.PopupWidget.prototype.replaceComponent_ = function(container, current, newComponent) {
    if (current !== newComponent) {
        goog.dom.removeChildren(container);
        newComponent.render(container);
    }
    return newComponent;
};
/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.PopupWidget.prototype.updateState_ = function(helper) {
    if (helper.isGood()) {
        this.displayComponent_ = this.replaceComponent_(this.displayContainer_, this.displayComponent_, this.displayWidgetB.get().getComponent());
        this.popupComponent_ = this.replaceComponent_(this.popupContainer_, this.popupComponent_, this.popupWidgetB.get().getComponent());
    }
    else {
    }
};

/**
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.PopupWidget.prototype.getComponent = function() {
    return this.container_;
};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.PopupWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;
