goog.provide('recoil.ui.widgets.PasswordWidget');

goog.require('goog.events');
goog.require('goog.events.InputHandler');
goog.require('goog.ui.Component');
goog.require('recoil.frp.Util');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.widgets.InputWidget');

/**
 *
 * @param {!recoil.ui.WidgetScope} scope
 * @param {boolean=} opt_autocomplete this has to be static since chrome doesn't update this when it changes
 * @constructor
 * @implements {recoil.ui.Widget}
 */
recoil.ui.widgets.PasswordWidget = function(scope, opt_autocomplete) {
    this.scope_ = scope;
    let frp = scope.getFrp();
    
    let passwordDiv = goog.dom.createDom('dive','goog-inline-block');
    this.showIcon_ = goog.dom.createDom('i','fas fa-eye');
    this.hideIcon_ = goog.dom.createDom('i','fas fa-eye-slash');
    this.show_ = goog.dom.createDom(
        'div', {class: 'recoil-password-show goog-inline-block'},
        this.showIcon_, this.hideIcon_
    );
    this.containerDiv_ = goog.dom.createDom('div', {}, passwordDiv, this.show_);
    this.component_ = recoil.ui.ComponentWidgetHelper.elementToNoFocusControl(this.containerDiv_);

    this.passwordInput_ = new recoil.ui.widgets.InputWidget(scope, opt_autocomplete);
    this.passwordInput_.setType('password');

    var el = this.passwordInput_.getComponent().getElement();
    if (!el) {
        this.passwordInput_.getComponent().createDom();
        el = this.passwordInput_.getComponent().getElement();
    }
    el.setAttribute('type', 'password');

    let showB = scope.getFrp().createB(false);
    this.showB_ = showB;
    this.helper_ = new recoil.ui.ComponentWidgetHelper(scope, this.component_, this, function () {
        let showAny = this.helper_.isGood() && this.hasShowButtonB_.get();
        let show = this.helper_.isGood() && this.showB_.get();
        
        goog.style.setElementShown(this.showIcon_, showAny && show);
        goog.style.setElementShown(this.hideIcon_, showAny && !show);
        this.passwordInput_.setType(show ? 'input' : 'password');
    });

    goog.events.listen(
        this.show_, goog.events.EventType.MOUSEDOWN,
        frp.accessTransFunc(function () {
            showB.set(!showB.get());
        }, this.showB_));
    
    this.passwordInput_.getComponent().render(passwordDiv);


};

/**
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.PasswordWidget.prototype.getComponent = function() {
    return this.component_;
};

/**
 * @param {recoil.frp.Behaviour<string>|string} name
 * @param {recoil.frp.Behaviour<string>|string} value
 * @param {recoil.frp.Behaviour<!recoil.ui.BoolWithExplanation>|!recoil.ui.BoolWithExplanation} enabled
 */
recoil.ui.widgets.PasswordWidget.prototype.attach = function(name, value, enabled) {
    //this.passwordInput_.attachStruct({'name': name, 'value': value, 'enabled': enabled});
    this.hasShowButtonB_ = this.scope_.getFrp().createB(false);
    this.attachStruct({'name': name, 'value': value, 'enabled': enabled});
    this.helper_.attach(this.showB_, this.hasShowButtonB_);
};

/**
 *
 * @param {!Object| !recoil.frp.Behaviour<Object>} options
 */
recoil.ui.widgets.PasswordWidget.prototype.attachStruct = function(options) {
    let util = new recoil.frp.Util(this.scope_.getFrp());
    this.hasShowButtonB_ = recoil.frp.struct.get('show', util.toBehaviour(options), false), 
    this.passwordInput_.attachStruct(options);
    this.helper_.attach(this.showB_, this.hasShowButtonB_);
};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.PasswordWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;
