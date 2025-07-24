
/**
 *
 * @param {!recoil.ui.WidgetScope} scope
 * @constructor
 * @implements {recoil.ui.Widget}
 */
recoil.ui.widgets.NumberWidget = function(scope) {
    this.scope_ = scope;
    this.errorDiv_ = goog.dom.createDom('div', {class: 'recoil-error'});
    this.containerDiv_ = goog.dom.createDom('div', {}, this.errorDiv_);
    var toControl = recoil.ui.ComponentWidgetHelper.elementToNoFocusControl;
    this.number_ = new recoil.ui.widgets.NumberWidget.NumberInput();
    this.number_.createDom();
    this.number_.setEnabled(false);
    this.container_ = toControl(this.containerDiv_);
    /**
     * @private
     */
    this.readonly_ = new recoil.ui.widgets.LabelWidget(scope);

    this.readonly_.getComponent().render(this.containerDiv_);
    this.number_.render(this.containerDiv_);

    this.valueHelper_ = new recoil.ui.ComponentWidgetHelper(scope, this.number_, this, this.updateValue_, this.detach_);
    this.configHelper_ = new recoil.ui.ComponentWidgetHelper(scope, this.number_, this, this.updateConfig_);
    this.errorHelper_ = new recoil.ui.ComponentWidgetHelper(scope, this.number_, this, function() {});
    this.validatorHelper_ = new recoil.ui.ComponentWidgetHelper(scope, this.number_, this, this.updateValidator_);
    this.changeHelper_ = new recoil.ui.EventHelper(scope, this.number_, recoil.ui.EventHelper.EL_CHANGE);
    this.enabledHelper_ = new recoil.ui.TooltipHelper(scope, this.number_);
    this.readonlyHelper_ = new recoil.ui.VisibleHelper(scope, this.containerDiv_, [this.number_.getElement()], [this.readonly_.getComponent().getElement()]);
    this.keyPressHelper_ = new recoil.ui.EventHelper(scope, this.number_, goog.events.EventType.KEYDOWN);
    this.keyUpHelper_ = new recoil.ui.EventHelper(scope, this.number_, goog.events.EventType.KEYUP);
};

/**
 * if not immediate we need to put data back before we detach
 * @private
 */
recoil.ui.widgets.NumberWidget.prototype.detach_ = function() {
    var frp = this.valueHelper_.getFrp();
    var me = this;
    frp.accessTrans(function() {

        if (me.valueB_.good()) {
            try {
                var element = me.number_.getElement();
                var val = element.value === '' ? null : parseFloat(element.value);
                if (element.validity.valid && element.value !== '') {
                    me.valueB_.set(val);
                }
            }
            catch (e) {
                console.error(e);
            }
        }
    }, me.valueB_);
};
/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.NumberWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;


/**
 * @private
 * @return {!goog.dom.DomHelper}
 */
recoil.ui.widgets.NumberWidget.DomHelper_ = function() {
    return goog.dom.getDomHelper();
};


/**
 * @constructor
 * @extends {goog.ui.LabelInput}}
 */
recoil.ui.widgets.NumberWidget.NumberInput = function() {
    goog.ui.LabelInput.call(this);
    this.ranges_ = [{ min: undefined, max: undefined}];
    this.step_ = undefined;
    this.prev_ = undefined;
    this.lastKey_ = undefined;
    // we need this because some browsers don't filter keys
    this.keyFilter_ = function(e) {
        if (!goog.events.KeyCodes.isTextModifyingKeyEvent(e)) {
            return;
        }
        this.lastKey_ = new Date().getTime();
        // Allow: backspace, delete, tab, escape, enter and .
        if (goog.array.contains([116, 46, 40, 8, 9, 27, 13, 110, 190], e.keyCode) ||
            // Allow: Ctrl+A
            (e.keyCode == 65 && e.ctrlKey === true) ||
            // Allow: Ctrl+C
            (e.keyCode == 67 && e.ctrlKey === true) ||
            // Allow: Ctrl+C
            (e.keyCode == 86 && e.ctrlKey === true) ||
            // Allow: Ctrl+X
               (e.keyCode == 88 && e.ctrlKey === true) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)) {
            // let it happen, don't do anything
            return;
        }
         // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105) && (e.keyCode !== 189 && e.keyCode !== 109)) {
            e.preventDefault();
        }
    }.bind(this);

};
goog.inherits(recoil.ui.widgets.NumberWidget.NumberInput, goog.ui.LabelInput);

/**
 * called when added to dom
 */
recoil.ui.widgets.NumberWidget.NumberInput.prototype.enterDocument = function() {
  recoil.ui.widgets.NumberWidget.NumberInput.superClass_.enterDocument.call(this);
};


/**
 * called when removed from dom
 */

recoil.ui.widgets.NumberWidget.NumberInput.prototype.exitDocument = function() {
  recoil.ui.widgets.NumberWidget.NumberInput.superClass_.exitDocument.call(this);
};

/**
 * @override
 */

recoil.ui.widgets.NumberWidget.NumberInput.prototype.setValue = function(v) {
    try {
        this.prev_ = parseFloat(v);
    }
    catch (e) {}
    recoil.ui.widgets.NumberWidget.NumberInput.superClass_.setValue.call(this, v);
};

/**
 * @param {number} min
 */

recoil.ui.widgets.NumberWidget.NumberInput.prototype.setMin = function(min) {
    this.ranges_ = [{min: min, max: this.ranges_[this.ranges_.length - 1].max}];
    if (this.getElement()) {
        this.getElement().min = min;
    }
};

/**
 * @param {!Array} ranges
 */

recoil.ui.widgets.NumberWidget.NumberInput.prototype.setRanges = function(ranges) {
    this.ranges_ = ranges;
    if (this.getElement()) {
        this.getElement().min = ranges[0].min;
        this.getElement().max = ranges[ranges.length - 1].max;
    }
};

/**
 * @param {number} max
 */
recoil.ui.widgets.NumberWidget.NumberInput.prototype.setMax = function(max) {
    this.ranges_ = [{min: this.ranges_[0].min, max: max}];
    this.max_ = max;
    if (this.getElement()) {
        this.getElement().max = max;

    }
};

/**
 * @param {number} step
 */
recoil.ui.widgets.NumberWidget.NumberInput.prototype.setStep = function(step) {
    this.step_ = step;
    if (this.getElement()) {
        this.getElement().step = step;
    }
};


/**
 * Creates the DOM nodes needed for the label input.
 * @override
 */
recoil.ui.widgets.NumberWidget.NumberInput.prototype.createDom = function() {
    var element = this.getDomHelper().createDom(
        goog.dom.TagName.INPUT,
        {
            'title' : goog.userAgent.EDGE_OR_IE ? '' : ' ',
            'class' : 'recoil-number-input',
            'type': goog.dom.InputType.NUMBER,
            step: this.step_, min: this.ranges_[0].min, max: this.ranges_[this.ranges_.length - 1].max_});

    goog.events.listen(element,
                       goog.events.EventType.KEYDOWN, this.keyFilter_);

    var doChange = function(e) {
        var val;
        try {
            val = parseFloat(this.getElement().value);
        }
        catch (e) {
            return;
        }
        var i = 0;
        for (; i < this.ranges_.length; i++) {
            var r = this.ranges_[i];
            if (val >= r.min && val <= r.max) {
                this.prev_ = val;
                return;
            }
            if (val < r.min) {
                break;
            }

        }
        if (this.lastKey_ !== undefined) {
            var tdiff = new Date().getTime() - this.lastKey_;
            if (tdiff < 500) {
                this.prev_ = val;
                return;
            }
        }

        if (i >= this.ranges_.length || i == 0 || this.prev_ === undefined) {
            this.prev_ = val;
            return;
        }
        var diff = Math.abs(this.prev_ - val);
        if (diff >= this.step_ * 2) {
            this.prev_ = val;
            return;
        }
        if (this.prev_ === val) {
            return;
        }
        if (this.prev_ < val) {
            val = this.ranges_[i].min;
        }
        else {
            val = this.ranges_[i - 1].max;
        }
        this.getElement().value = '' + val;
        this.prev_ = val;

    };
    goog.events.listen(element,
                       goog.events.EventType.INPUT, doChange.bind(this));

   element.style['text-align'] = 'right';
    this.setElementInternal(element);
};

/**
 *
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.NumberWidget.prototype.getComponent = function() {
    return this.container_;
};


/**
 *
 * @param {recoil.frp.Behaviour<number>|number} value
 * @param {!recoil.frp.Behaviour<?>} options
 */
recoil.ui.widgets.NumberWidget.prototype.attachMeta = function(value, options) {
    var frp = this.valueHelper_.getFrp();

    this.attachStruct(recoil.frp.struct.extend(frp, options, {value: value}));
};


/**
 * the behaviours that this widget can take
 *
 * all standard options
 * value - number the number to edit
 * min - number the miniumn value
 * max - number the maxiumn value
 * ranges - use to specify multiple ranges will override min/max each entry is an object {min:?,max:?}
 * step - step size of the number
 * validator - a function that takes a number and returns a message if it is invalid, else null
 *
 */
recoil.ui.widgets.NumberWidget.options = recoil.ui.util.StandardOptions(
    'value',
    {
        min: 0,
        max: Number.MAX_SAFE_INTEGER || 9007199254740991,
        displayLength: null,
        step: 1,
        allowNull: false,
        ranges: [],
        outErrors: [],
        validator: function(val) {return null;},
        readonlyFormatter: null,
        classes: [],
        immediate: false
    }
);

/**
 * @private
 * @param {number} num
 * @return {number} the number of decimal point this number has
 *
 */

recoil.ui.widgets.NumberWidget.getDp_ = function(num) {
    if (isNaN(num)) {
        return 0;
    }
    var str = num + '';
    var idx = str.indexOf('.');
    if (idx === -1) {
        return 0;
    }
    return str.length - 1 - idx;
};

/**
 * @private
 * @type {Object<string,number>}
 */
recoil.ui.widgets.NumberWidget.sizesMap_ = {};
/**
 * calculates the width of the number field based on the numbers that can go
 * into it
 * @private
 * @param {!Element} parent
 * @param {string} str
 * @return {number}
 */
recoil.ui.widgets.NumberWidget.calcWidth_ = function(parent, str) {
    return str.length;
};

/**
 *
 * @param {!Object|!recoil.frp.Behaviour<!Object>} options
 */

recoil.ui.widgets.NumberWidget.prototype.attachStruct = function(options) {
    var frp = this.valueHelper_.getFrp();
    var util = new recoil.frp.Util(frp);
    var arrUtil = new recoil.frp.Array(frp);
    var bound = recoil.ui.widgets.NumberWidget.options.bind(frp, options);

    this.valueB_ = bound.value();
    this.rangeB_ = bound.getGroup(
        [bound.min, bound.max, bound.step, bound.ranges, bound.immediate],
        function(obj) {
            var min = obj.min;
            var max = obj.max;
            var step = obj.step;
            var ranges = [{min: min, max: max}];

            if (obj.ranges.length > 0) {
                min = obj.ranges[0].min;
                max = obj.ranges[0].max;
                ranges = obj.ranges;
                obj.ranges.forEach(function(r) {
                    min = Math.min(min, r.min);
                    max = Math.max(max, r.max);
                });
            }
            return {min: min, max: max, step: step, ranges: ranges, immediate: obj.immediate};
        });
    this.displayLengthB_ = bound.displayLength();
    this.editableB_ = bound.editable();
    this.enabledB_ = bound.enabled();
    this.classesB_ = bound.classes();
    this.validatorB_ = bound.validator();
    this.outErrorsB_ = bound.outErrors();
    this.allowNullB_ = bound.allowNull();
    this.hasErrors_ = false;

    this.formatterB_ = frp.liftB(function(range, fmt) {
        if (fmt) {
            return fmt;
        }
        var dp = Math.max(
            recoil.ui.widgets.NumberWidget.getDp_(range.min),
            recoil.ui.widgets.NumberWidget.getDp_(range.step));
        return function(v) {
             if (v === null || v === undefined) {
                return '';
             }
            if (isNaN(v)) {
                return recoil.ui.messages.NOT_APPLICABLE.toString();
            }
            return v.toLocaleString(undefined, {minimumFractionDigits: dp});
        };
    }, this.rangeB_, bound.readonlyFormatter());

    this.errorHelper_.attach(this.outErrorsB_, this.validatorB_, this.allowNullB_, this.enabledB_);
    this.validatorHelper_.attach(this.validatorB_, this.allowNullB_, this.rangeB_);
    this.valueHelper_.attach(this.valueB_);

    this.configHelper_.attach(this.rangeB_, this.enabledB_, this.editableB_, this.formatterB_, this.displayLengthB_);

    let tooltipB = frp.liftB(v => v.reason(), this.enabledB_);
    this.readonlyHelper_.attach(this.editableB_);
    this.readonly_.attachStruct({name: this.valueB_,
                                 formatter: this.formatterB_, enabled: this.enabledB_,
                                 classes: arrUtil.append(this.classesB_, ['recoil-number'])
                                });
    var me = this;
    this.keyPressHelper_.listen(this.scope_.getFrp().createCallback(function(v) {
        if (v.keyCode === goog.events.KeyCodes.ESC) {
            me.updateValue_(me.valueHelper_);
        }
    }, this.valueB_, this.outErrorsB_, this.validatorB_, this.allowNullB_));

    var setValue = function(inputEl) {
        if (inputEl.validity.valid && (inputEl.value !== '' || me.allowNullB_.get())) {
            var val = inputEl.value === '' ? null : parseFloat(inputEl.value);
            var error = me.validatorB_.get()(val);
            if (error) {
                me.updateErrors_(inputEl, me.outErrorsB_, me.validatorB_);
            }
            else {
                me.valueB_.set(val);
                me.updateErrors_(inputEl, me.outErrorsB_, me.validatorB_);
            }
        }
        else {
            me.updateErrors_(inputEl, me.outErrorsB_, me.validatorB_);
        }
    };
    this.keyUpHelper_.listen(this.scope_.getFrp().createCallback(function(v) {
        if (v.keyCode !== goog.events.KeyCodes.ESC && me.rangeB_.get().immediate) {
            setValue(v.target);
        }
    }, this.valueB_, this.outErrorsB_, this.validatorB_, this.allowNullB_, this.rangeB_));

    this.changeHelper_.listen(this.scope_.getFrp().createCallback(function(v) {
        var inputEl = v.target;
        setValue(inputEl);
    }, this.valueB_, this.outErrorsB_, this.validatorB_, this.allowNullB_));

    var toolTipB = frp.liftB(function(enabled, range) {
        if (!enabled.val()) {
            return enabled;
        }
        var reason = enabled.reason();
        if (reason && reason.toString() !== '') {
            return enabled;
        }
        if (range.ranges.length !== 1) {
            let rangeMessages = [];
            range.ranges.forEach(function(range) {
                if( range.min === range.max){
                    rangeMessages.push(recoil.ui.message.getParamMsg(['distinctValue']).resolve({'distinctValue': range.min}));
                }
                else{
                    rangeMessages.push(recoil.ui.messages.MIN_TO_MAX.resolve({min: range.min, max: range.max}));
                }
            });
            let info = {'ranges': recoil.ui.messages.join(rangeMessages, recoil.ui.messages.OR), step: range.step};
            let message = range.step == 1 ? recoil.ui.messages.MIN_MAX_RANGES.resolve(info)
                : recoil.ui.messages.MIN_MAX_RANGES_STEP.resolve(info);
            return new recoil.ui.BoolWithExplanation(true, message);
        }
        else {
            let info = {'min': range.min, max: range.max, step: range.step};
            let message = range.step == 1 ? recoil.ui.messages.MIN_MAX.resolve(info)
                : recoil.ui.messages.MIN_MAX_STEP.resolve(info);
            return new recoil.ui.BoolWithExplanation(true, message);
        }

    }, this.enabledB_, this.rangeB_);
    this.enabledHelper_.attach(
        /** @type {!recoil.frp.Behaviour<!recoil.ui.BoolWithExplanation>} */ (toolTipB),
        this.valueHelper_, this.configHelper_);
};
/**
 * @private
 * @param {recoil.ui.ComponentWidgetHelper} helper
 */
recoil.ui.widgets.NumberWidget.prototype.updateValidator_ = function(helper) {
    var me = this;
    var hadErrors = this.hasErrors_;
    if (me.updateErrors_(me.number_.getElement(), me.outErrorsB_, me.validatorB_) && hadErrors) {
        this.scope_.getFrp().accessTrans(function() {
            if (me.valueB_.hasRefs() && me.valueB_.good()) {
                var element = me.number_.getElement();
                var val = element.value == '' ? null : parseFloat(element.value);
                me.valueB_.set(val);
            }
            return true;
        }, this.valueB_);
    }
};
/**
 * @private
 * @param {Element} el
 * @param {!recoil.frp.Behaviour<!Array>} errorsB
 * @param {!recoil.frp.Behaviour<function(number):recoil.ui.message.Message>} validatorB
 * @return {boolean} true if no error
 */
recoil.ui.widgets.NumberWidget.prototype.updateErrors_ = function(el, errorsB, validatorB) {
    var me = this;
    var res = false;
    this.scope_.getFrp().accessTrans(function() {
        var allowNull = (me.allowNullB_.hasRefs() && me.allowNullB_.good() && me.allowNullB_.get());
        if (me.editableB_.good() && !me.editableB_.get()) {
            res = true;
            errorsB.set([]);
            return;
        }
        if (me.enabledB_.good() && !me.enabledB_.get().val()) {
            res = true;
            if (me.valueB_.good()) {
                me.number_.setValue(me.valueB_.get());
            }
            errorsB.set([]);
            return;
        }
        // do the validation ourselves since it is inconsistent between browsers
        var manualValid = true;
         if (me.rangeB_.hasRefs() && me.rangeB_.good()) {

            if (el.value === '') {
                manualValid = allowNull;
            }
            else {
                try {
                    var v = parseFloat(el.value);
                    // run to get the range that v applies for
                    var curRange = undefined;
                    me.rangeB_.get().ranges.forEach(function(r) {
                        if (v >= r.min && v <= r.max) {
                            curRange = r;
                        }
                    });
                    if (curRange === undefined) {
                        manualValid = false;
                    }
                    else {
                        v = v - curRange.min;
                        var mul = Math.pow(10, Math.max(
                            recoil.ui.widgets.NumberWidget.getDp_(curRange.min),
                            recoil.ui.widgets.NumberWidget.getDp_(me.rangeB_.get().step)));
                        var step = Math.floor(mul * me.rangeB_.get().step);
                        v = Math.floor(v * mul);

                        manualValid = (v % step) === 0;
                    }
                }
                catch (e) {
                    manualValid = false;
                }
            }
        }

        if (manualValid && el.validity.valid && (el.value !== '' || allowNull)) {
            var v = el.value === '' ? null : parseFloat(el.value);
            var validator = validatorB.hasRefs() && validatorB.good() ? validatorB.get() : function() {return null;};
            var error = validator(v);
            if (error) {
                errorsB.set([error]);
            }
            else {
                errorsB.set([]);
                res = true;
            }
        }
        else {
            if (!me.rangeB_.hasRefs() || !me.rangeB_.good()) {
                res = true;
                return;
            }
            var ranges = me.rangeB_.get().ranges;
            if (!ranges || ranges.length === 0) {
                ranges = [{min: me.rangeB_.get().min, max: me.rangeB_.get().max}];
            }

            var errors = [];
            let hasValid = false;
            ranges.forEach(function(range) {
                if (range.min <= range.max) {
                    hasValid = true;
                }
                if(range.min === range.max) {
                    errors.push(recoil.ui.message.getParamMsg(['distinctValue']).resolve({'distinctValue': range.min}));
                }
                else{
                    errors.push(recoil.ui.messages.MIN_TO_MAX.resolve({'min': range.min, 'max': range.max}));
                }
            });
            var msg = recoil.ui.messages.join(errors, recoil.ui.messages.OR);
            if (me.rangeB_.get().step === 1) {
                msg = recoil.ui.messages.MUST_BE.resolve({'ranges': msg});
            }
            else {
                msg = recoil.ui.messages.MUST_BE_RANGE_STEP.resolve({'ranges': msg, step: me.rangeB_.get().step});
            }
            if (!hasValid) {
                msg = recoil.ui.messages.NO_VALID_RANGES.resolve({'mesg': msg});
            }
            me.outErrorsB_.set([msg]);
        }

    }, errorsB, validatorB, me.allowNullB_, this.rangeB_, this.editableB_, this.enabledB_, me.valueB_);

    if (this.hasErrors_ !== !res) {
        if (res) {
            goog.dom.classlist.remove(el, 'recoil-error');
        }
        else {
            goog.dom.classlist.add(el, 'recoil-error');
        }
    }
    this.hasErrors_ = !res;

    return res;

};

/**
 *
 * @param {recoil.ui.ComponentWidgetHelper} helper
 * @private
 */
recoil.ui.widgets.NumberWidget.prototype.updateValue_ = function(helper) {
    var me = this;
    if (helper.isGood()) {
        this.number_.setValue(this.valueB_.get());
        this.updateErrors_(this.number_.getElement(), this.outErrorsB_, this.validatorB_);

    }
    let errors = helper.isGood() ? [] : helper.errors();
    goog.style.setElementShown(this.errorDiv_, errors.length > 0);
    goog.dom.removeChildren(this.errorDiv_);

    errors.forEach(function(error) {
        var div = goog.dom.createDom('div', {class: 'error'}, goog.dom.createTextNode(error.toString()));
        div.onclick = function() {
            console.error('Error was', error);
        };
        me.errorDiv_.appendChild(
            div);

    });

};


/**
 * @private
 * @param {recoil.ui.ComponentWidgetHelper} helper
 */
recoil.ui.widgets.NumberWidget.prototype.updateConfig_ = function(helper) {
    var enabled = helper.isGood();

    var el = this.containerDiv_;
    var formatter = this.formatterB_.metaGet().good() ?
        this.formatterB_.metaGet().get() : function(v) {
            return '' + v;
        };
    var displayLen = this.displayLengthB_.good() ? this.displayLengthB_.get() : null;
    var editable = this.editableB_.good() && this.editableB_.get();
    var calcWidth = function(width, val, step) {
        if (displayLen) {
            return null;
        }
        var str = editable ? '' + val : formatter(val);
        let stepStr = '' + step;

        if (!editable || stepStr.indexOf('.') == -1) {
            return Math.max(width,
                            recoil.ui.widgets.NumberWidget.calcWidth_(el, str));
        }
        else {
            let dps = stepStr.length - stepStr.indexOf('.') - 1;
            let strPointIdx = str.indexOf('.');
            if (strPointIdx != -1) {
                let strDps = str.length - strPointIdx - 1;
                dps = Math.max(dps, strDps);
                str = str.substring(0, strPointIdx);
            }
            str += '.' + '' .padEnd(dps, '0');
            return Math.max(width,
                            recoil.ui.widgets.NumberWidget.calcWidth_(el, str));

        }

    };

    var width = calcWidth(0, 0, 1);
    if (this.rangeB_.metaGet().good()) {
        var range = this.rangeB_.get();
        width = calcWidth(width, range.min, range.step);
        width = calcWidth(width, range.max, range.step);
        this.number_.setRanges(range.ranges);
        this.number_.setStep(range.step);
    }
    var c = this.number_.getContentElement();
    //    c.width = 2;
    if (displayLen === -1) {
        this.number_.getContentElement().style.width = '';
        this.readonly_.getComponent().getElement().style.width = '';
    } else if (displayLen) {
        this.number_.getContentElement().style.width = (displayLen + 2) + 'ch';
        this.readonly_.getComponent().getElement().style.width = displayLen + 'em';
    }
    else {
        this.number_.getContentElement().style.width = (width + 3) + 'ch';
        this.readonly_.getComponent().getElement().style.width = (width) + 'em';
    }
    var hadErrors = this.hasErrors_;
    this.updateErrors_(this.number_.getElement(), this.outErrorsB_, this.validatorB_);
    if (hadErrors && !this.hasErrors_) {
        var me = this;
        var frp = this.valueHelper_.getFrp();
        frp.accessTrans(function() {

            if (me.valueB_.good()) {
            try {
                var element = me.number_.getElement();
                var val = element.value === '' ? null : parseFloat(element.value);
                me.valueB_.set(val);
            }
            catch (e) {
                console.error(e);
            }
        }
    }, me.valueB_);
    }
};
