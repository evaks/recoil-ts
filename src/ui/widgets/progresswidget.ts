goog.provide('recoil.ui.widgets.ProgressWidget');

goog.require('goog.events');
goog.require('goog.ui.ProgressBar');
goog.require('recoil.frp.Util');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.util');

/**
 *
 * @param {!recoil.ui.WidgetScope} scope
 * @constructor
 * @implements {recoil.ui.Widget}
 */
recoil.ui.widgets.ProgressWidget = function(scope) {
    this.scope_ = scope;
    this.progress_ = new goog.ui.ProgressBar();
    this.text_ = goog.dom.createDom('div', {class: 'progress-bar-text'});

    this.progressDiv_ = goog.dom.createDom(
        'div', {},
        goog.dom.createDom('div', {class: 'progress-bar-thumb'}),
        this.text_);
    this.containerDiv_ = goog.dom.createDom('div', {}, this.progressDiv_);
    this.container_ = recoil.ui.ComponentWidgetHelper.elementToNoFocusControl(this.containerDiv_);
    this.progress_.decorate(this.progressDiv_);
    this.helper_ = new recoil.ui.ComponentWidgetHelper(scope, this.progress_, this, this.updateState_);
};

/**
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.ProgressWidget.prototype.getComponent = function() {
    return this.container_;
};

/**
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.ProgressWidget.prototype.updateState_ = function(helper) {
    if (helper.isGood()) {
        let max = this.maxB_.get();
        let curVal = this.valueB_.get();
        this.progress_.setMaximum(max);
        this.progress_.setValue(curVal);
        let val = this.textB_.get();

        goog.dom.classlist.enable(this.progressDiv_, 'progress-bar-done', curVal >= max);

        if (goog.dom.isElement(val)) {
            goog.dom.setTextContent(this.text_, '' /*this.textB_.get().innerText*/);
            this.text_.appendChild(this.textB_.get());
        } else {
            goog.dom.setTextContent(this.text_, this.textB_.get());
        }
    }
    else {
        goog.dom.classlist.enable(this.progressDiv_, 'progress-bar-done', false);
        goog.dom.setTextContent(this.text_, '');
        this.progress_.setValue(0);
        this.progress_.setMaximum(100);
    }
};

/**
 * attachable behaviours for widget
 */
recoil.ui.widgets.ProgressWidget.options = recoil.ui.util.StandardOptions(
    'max', 'value', {
        text: ''
    });

/**
 * @param {recoil.frp.Behaviour<number>|number} valueB
 * @param {recoil.frp.Behaviour<number>|number} maxB
 * @param {recoil.frp.Behaviour<string>|string|Element} textB
 * @param {recoil.frp.Behaviour<!recoil.ui.BoolWithExplanation>|!recoil.ui.BoolWithExplanation=} opt_enabledB
 */
recoil.ui.widgets.ProgressWidget.prototype.attach = function(valueB, maxB, textB,  opt_enabledB) {
    //this.passwordInput_.attachStruct({'name': name, 'value': value, 'enabled': enabled});
    this.attachStruct({value: valueB, max: maxB, text: textB});

};

/**
 *
 * @param {!Object| !recoil.frp.Behaviour<Object>} options
 */
recoil.ui.widgets.ProgressWidget.prototype.attachStruct = function(options) {
    var frp = this.helper_.getFrp();

    var bound = recoil.ui.widgets.ProgressWidget.options.bind(frp, options);
    this.maxB_ = bound.max();
    this.valueB_ = bound.value();
    this.textB_ = bound.text().debug('text');
    this.enabledB_ = bound.enabled();
    this.helper_.attach(this.valueB_, this.maxB_, this.textB_, this.enabledB_);
};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.ProgressWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;
