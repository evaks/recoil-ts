goog.provide('recoil.ui.widgets.CheckboxWidget');

goog.require('goog.events');
goog.require('goog.ui.Checkbox');
goog.require('goog.ui.Checkbox.State');
goog.require('goog.ui.Component');
goog.require('recoil.frp.Behaviour');
goog.require('recoil.frp.Util');
goog.require('recoil.frp.struct');
goog.require('recoil.ui.ComponentWidgetHelper');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.WidgetHelper');
goog.require('recoil.ui.WidgetScope');


/**
 * @constructor
 * @implements {recoil.ui.Widget}
 * @param {!recoil.ui.WidgetScope} scope
 */
recoil.ui.widgets.CheckboxWidget = function(scope) {
    this.scope_ = scope;
    this.checkBox_ = new goog.ui.Checkbox();
    this.editableDiv_ = goog.dom.createDom('span');
    this.readonlyDiv_ = goog.dom.createDom('span');
    this.containerDiv_ = goog.dom.createDom('span');
    this.container_ = recoil.ui.ComponentWidgetHelper.elementToNoFocusControl(this.containerDiv_);
    this.container_.addClassName('goog-inline-block');
    this.checkBox_.setEnabled(false);
    this.changeHelper_ = new recoil.ui.EventHelper(scope, this.checkBox_, goog.ui.Component.EventType.CHANGE);
    this.helper_ = new recoil.ui.ComponentWidgetHelper(scope, this.container_, this, this.updateState_);
    this.checkBox_.render(this.editableDiv_);
    this.tooltipHelper = new recoil.ui.TooltipHelper(scope, this.checkBox_);
};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.CheckboxWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;

/**
 * list of functions available when creating a CHECKBOXWidget
 */
recoil.ui.widgets.CheckboxWidget.options = recoil.frp.Util.Options('value',
                                                                   {
                                                                       'name' : '',
                                                                       'editable' : true,
                                                                       'enabled' : recoil.ui.BoolWithExplanation.TRUE
                                                                   });

/**
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.CheckboxWidget.prototype.getComponent = function() {
    return this.container_;
};


/**
 * @param {recoil.frp.Behaviour<string>|string} name
 * @param {recoil.frp.Behaviour<boolean>|boolean} value
 * @param {!recoil.frp.Behaviour<!recoil.ui.BoolWithExplanation>|boolean} enabled
 */
recoil.ui.widgets.CheckboxWidget.prototype.attach = function(name, value, enabled) {
    var frp = this.helper_.getFrp();
    var util = new recoil.frp.Util(frp);

    this.attachStruct(recoil.frp.struct.extend(frp, {enabled: enabled, 'name': name, 'value': value}));
};

/**
 * @param {!Object| !recoil.frp.Behaviour<Object>} options
 */
recoil.ui.widgets.CheckboxWidget.prototype.attachStruct = function(options) {
    var frp = this.helper_.getFrp();
    var util = new recoil.frp.Util(frp);
    var structs = recoil.frp.struct;
    var bound = recoil.ui.widgets.CheckboxWidget.options.bind(frp, options);

    this.nameB_ = bound.name();
    this.valueB_ = bound.value();
    this.enabledB_ = bound.enabled();
    this.editableB_ = bound.editable();


    var me = this;
    this.changeHelper_.listen(this.scope_.getFrp().createCallback(function(v) {
        me.valueB_.set(me.checkBox_.getChecked());
    }, me.valueB_));

    this.helper_.attach(this.nameB_, this.valueB_, this.enabledB_, this.editableB_);
    this.tooltipHelper.attach(this.enabledB_, this.helper_);
};

/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.CheckboxWidget.prototype.updateState_ = function(helper) {
    var good = helper.isGood();
    var enabled = good && this.enabledB_.get().val();
    var editable = !this.editableB_.good() || this.editableB_.get();
    var defined = this.valueB_.good() ? this.valueB_.get() : null;
    this.checkBox_.setChecked(defined);
    var statename = defined === true ? 'checked' : (defined === false ? 'unchecked' : 'unknown');
    goog.dom.classlist.set(this.readonlyDiv_, 'recoil-ro-checkbox-' + statename);

    goog.dom.removeNode(this.editableDiv_);
    goog.dom.removeNode(this.readonlyDiv_);
    if (editable) {
        goog.dom.append(this.containerDiv_, this.editableDiv_);
    }
    else {
        goog.dom.append(this.containerDiv_, this.readonlyDiv_);
    }

};




