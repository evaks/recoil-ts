/**
 * @implements {recoil.ui.LabeledWidget}
 * @param {!recoil.ui.WidgetScope} scope
 * @constructor
 */
recoil.ui.widgets.TextAreaWidget = function(scope) {
    this.scope_ = scope;
    this.textarea_ = new goog.ui.Textarea('');
    this.container_ = new goog.ui.Container();

    this.label_ = new recoil.ui.widgets.LabelWidget(scope);
    this.changeHelper_ = new recoil.ui.EventHelper(scope, this.textarea_, goog.events.InputHandler.EventType.INPUT);
    this.blurChangeHelper_ = new recoil.ui.EventHelper(scope, this.textarea_, goog.events.EventType.BLUR);
    this.helper_ = new recoil.ui.ComponentWidgetHelper(scope, this.textarea_, this, this.updateState_, this.detach_);
    this.configHelper_ = new recoil.ui.ComponentWidgetHelper(scope, this.textarea_, this, this.updateConfig_);
};

/**
 * if not immediate we need to put data back before we detach
 * @private
 */
recoil.ui.widgets.TextAreaWidget.prototype.detach_ = function() {
    let frp = this.helper_.getFrp();
    let me = this;
    frp.accessTrans(function() {
        if (me.immediateB_.good() && me.valueB_.good() && !me.immediateB_.get()) {
            me.valueB_.set(me.textarea_.getValue());
        }
    }, me.immediateB_, me.valueB_);
};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.TextAreaWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;
/**
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.TextAreaWidget.prototype.getComponent = function() {
    return this.textarea_;
};

/**
 *
 * @return {goog.ui.Container}
 */
recoil.ui.widgets.TextAreaWidget.prototype.getContainer = function() {
    return this.container_;
};

/**
 *
 * @return {recoil.ui.widgets.LabelWidget}
 */
recoil.ui.widgets.TextAreaWidget.prototype.getLabel = function() {
    return this.label_;
};
/**
 * @param {recoil.frp.Behaviour<string>|string} nameB
 * @param {recoil.frp.Behaviour<string>|string} valueB
 * @param {!recoil.frp.Behaviour<!recoil.ui.BoolWithExplanation>=} opt_enabledB
 */
recoil.ui.widgets.TextAreaWidget.prototype.attach = function(nameB, valueB, opt_enabledB) {
    let frp = this.helper_.getFrp();

    this.attachStruct({'name': nameB, 'value': valueB, 'enabled': opt_enabledB });
};

/**
 * @param {!Object| !recoil.frp.Behaviour<Object>} options
 */
recoil.ui.widgets.TextAreaWidget.prototype.attachStruct = function(options) {
    let frp = this.helper_.getFrp();
    let util = new recoil.frp.Util(frp);

    let structs = recoil.frp.struct;
    let optionsB = structs.flatten(frp, options);

    this.maxLengthB_ = structs.get('maxLength', optionsB, null);
    this.valueB_ = structs.get('value', optionsB);
    this.minHeightB_ = structs.get('minHeight', optionsB, 70);
    this.displayLengthB_ = structs.get('displayLength', optionsB, null);    
    this.immediateB_ = structs.get('immediate', optionsB, false);
    this.enabledB_ = structs.get('enabled', optionsB, recoil.ui.BoolWithExplanation.TRUE);
    this.editableB_ = structs.get('editable', optionsB, true);
    this.placeholderB_ = structs.get('placeholder', optionsB, null);
    let readyB = util.isAllGoodExplain(this.valueB_, this.enabledB_);

    this.label_.attach(
          structs.get('name', optionsB),
          recoil.ui.BoolWithExplanation.and(frp, this.enabledB_, readyB));

    this.helper_.attach(this.valueB_, this.immediateB_, this.enabledB_, this.editableB_, this.placeholderB_, this.maxLengthB_);
    this.configHelper_.attach(this.minHeightB_, this.displayLengthB_);

    let me = this;
    this.changeHelper_.listen(this.scope_.getFrp().createCallback(function(v) {
        if (me.immediateB_.get()) {
            me.valueB_.set(v.target.value);
        }
    }, this.valueB_, this.immediateB_));

    this.blurChangeHelper_.listen(this.scope_.getFrp().createCallback(
        function(v) {
            if (!me.immediateB_.get()) {
                me.valueB_.set(v.target.value);
            }
        }, this.valueB_, this.immediateB_));

};


/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.TextAreaWidget.prototype.updateState_ = function(helper) {

    let len = this.maxLengthB_.good() && this.maxLengthB_.get() ? this.maxLengthB_.get() : undefined;
    if (!this.textarea_.getElement()) {
        this.textarea_.createDom();
    }
    if (len) {
        this.textarea_.getElement().maxLength = len;
    }
    else {
        this.textarea_.getElement().removeAttribute('maxlength');
    }


    this.textarea_.setPlaceholder(
        this.placeholderB_.good() && this.placeholderB_.get() ? this.placeholderB_.get() : '');
    if (helper.isGood()) {
        this.textarea_.setContent(this.valueB_.get());
        this.textarea_.setEnabled(this.enabledB_.get().val() && this.editableB_.get());
    }
    else {
        this.textarea_.setEnabled(false);
    }


};

/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.TextAreaWidget.prototype.updateConfig_ = function(helper) {

    if (helper.isGood()) {
        if (!this.textarea_.getElement()) {
            this.textarea_.createDom();
        }

        let h = this.minHeightB_.get();
        let w = this.displayLengthB_.get();
        this.textarea_.setMinHeight(h);
        
        let el = this.textarea_.getElement();            
        if (el) {
            if (!el.scrollHeight) {
                const resizeObserver = new ResizeObserver(
                    entries => {
                        if (entries[0]["target"].scrollHeight) {
                            this.textarea_.setMinHeight(h);
                            resizeObserver.disconnect();
                            
                        }
                    }
                );
                resizeObserver.observe(el);
            }
            
            el.style.minWidth = w == null ? "" : w + "em";
        }            

    }

};



