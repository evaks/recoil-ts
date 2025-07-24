/**
 * Radio button widget
 * the inputs are value and a selected value
 *
 */
goog.provide('recoil.ui.widgets.RadioWidget');

goog.require('goog.dom');
goog.require('goog.ui.Container');
goog.require('recoil.ui.ComponentWidgetHelper');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.WidgetScope');
goog.require('recoil.ui.message.Message');
goog.require('recoil.ui.messages');

/**
 *
 * @template T
 * @param {!recoil.ui.WidgetScope} scope
 * @implements {recoil.ui.Widget}
 * @constructor
 */
recoil.ui.widgets.RadioWidget = function(scope) {
    this.scope_ = scope;
    this.radio_ = null;

    var toControl = recoil.ui.ComponentWidgetHelper.elementToControl;
    this.container_ = new goog.ui.Component();
    this.radio_ = goog.dom.createDom('input', {type: 'radio', autocomplete: 'off'});
    this.container_.addChild(toControl(this.radio_), true);
    this.helper_ = new recoil.ui.ComponentWidgetHelper(scope, this.container_, this, this.updateState_);
    this.tooltip_ = new recoil.ui.TooltipHelper(scope, this.container_);
};


/**
 * @type {recoil.frp.Util.OptionsType}
 */
recoil.ui.widgets.RadioWidget.options =
    recoil.frp.Util.Options('value', 'selectValue',
                            {
                                enabled: recoil.ui.BoolWithExplanation.TRUE
                            });

/**
 * @param {!recoil.frp.Behaviour<T>|T} value the widget that will be displayed in the popup
 * @param {!recoil.frp.Behaviour<T>|T} selectValue the widget that will be displayed normally (no popup required
 * @suppress {missingProperties}
 */

recoil.ui.widgets.RadioWidget.prototype.attach = function(value, selectValue)  {
    recoil.ui.widgets.RadioWidget.options.value(value).selectValue(selectValue).attach(this);
};


/**
 * see recoil.ui.widgets.PopupWidget.options fro valid options
 * @param {!Object|!recoil.frp.Behaviour<Object>} options
 * @suppress {missingProperties}
 */
recoil.ui.widgets.RadioWidget.prototype.attachStruct = function(options) {
    var frp = this.helper_.getFrp();
    var bound = recoil.ui.widgets.RadioWidget.options.bind(frp, options);

    this.valueB_ = bound.value();
    this.selectValueB_ = bound.selectValue();
    this.enabledB_ = bound.enabled();

    this.helper_.attach(this.valueB_, this.selectValueB_, this.enabledB_);
    var me = this;
    this.radio_.onchange = function() {
        frp.accessTrans(function() {
            if (me.helper_.isGood()) {
                me.valueB_.set(me.selectValueB_.get());
            }
        }, me.valueB_, me.selectValueB_, me.enabledB_);
    };
    this.tooltip_.attach(this.enabledB_, this.helper_);
};

/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.RadioWidget.prototype.updateState_ = function(helper) {
    this.radio_.disabled = !helper.isGood() || !this.enabledB_.get().val();
    if (helper.isGood()) {
        var newVal = recoil.util.object.isEqual(this.valueB_.get(), this.selectValueB_.get());
        if (this.radio_.checked != newVal) {
            this.radio_.checked = newVal;
        }
    }

};

/**
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.RadioWidget.prototype.getComponent = function() {
    return this.container_;
};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.RadioWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;
