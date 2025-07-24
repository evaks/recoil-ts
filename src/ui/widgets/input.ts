import {WidgetScope} from "./widgetscope";
import {createDom} from "../dom/dom";
import {TagName} from "../dom/tags";
import {Widget} from "./widget";
import {WidgetHelper} from "../widgethelper";
import {BehaviourOrType} from "../../frp/struct";
import {Behaviour} from "../../frp/frp";

/**
 *
 * @param {!recoil.ui.WidgetScope} scope
 * @param {boolean=} opt_autocomplete this has to be static since chrome doesn't update this when it changes
 * @constructor
 * @implements {recoil.ui.Widget}
 */
export class InputWidget extends Widget{
    constructor(scope: WidgetScope) {
        this.scope_ = scope;
        this.input_ = createDom(TawgName.INPUT);
        this.container_ = createDom(TagName.DIV);
        this.readonly_ = createDom(TagName.SPAN);

        this.helper_ new WidgetHelper(scope,this.container_,v this, this.update_, this.detach_);

        this.changeHelper_ = new EventHelper(scope, this.input_, goog.events.InputHandler.EventType.INPUT);
        this.keyPressHelper_ = new EventHelper(scope, this.input_, goog.events.EventType.KEYDOWN);
        this.blurChangeHelper_ = new EventHelper(scope, this.input_, goog.events.EventType.BLUR);
        this.focusChangeHelper_ = new EventHelper(scope, this.input_, goog.events.EventType.FOCUS);
        this.pasteHelper_ = new EventHelper(scope, this.input_, goog.events.EventType.PASTE);
        this.lastInputSet_ = '';
        // todo enabled
        this.focusB_ = scope.getFrp().createB(false);
        this.curClasses_ = [];

    }

    /**
     * binds the data to the widget, this can be a behaviour with a struct inside it or
     * a struct with behaviours or just values inside it, if the values inside the struct are
     * not behaviours they are read only
     * @param data
     *
     * immediate - the data will update as the user types, normally the inpute will not change until the input box
     *             loses focus
     * classes the class names that the input box has
     * converter:  allows different types to be displayed for example you could reneder an object, while you
     *             could of course just convert the item into a string first
     */
    attachStruct(data:Behaviour<{
        value: string,
        classes?: string[],
        placehold?: string, // default null
        immediate?: boolean, // default true
        converter?: StringConverter,
        maxLength? : number,
        outErrors?: ErrorType[],
        displayLength?:number,
        charValidator?: (c: string) => boolean,
        unfocusConverter?: string,
    }>|{value: BehaviourOrType<string>,
        classes?: BehaviourOrType<string[]>,
        placehold?: BehaviourOrType<string>, // default null
        immediate?: BehaviourOrType<boolean>, // default true
        converter?: StringConverter,
        maxLength? : number,
        outErrors?: ErrorType[],
        displayLength?:number,
        charValidator?: (c: string) => boolean,
        unfocusConverter?: string,}) {

    }
}

/**
 * attachable behaviours for widget
 */
recoil.ui.widgets.InputWidget.options = recoil.ui.util.StandardOptions(
    'value',
    {
        classes: [],
        placeholder: null,
        immediate: false, // if false changes will not propogate until blur
        converter: new recoil.converters.DefaultStringConverter(),
        maxLength: undefined,
        outErrors: [],
        displayLength: undefined,
        charValidator: function() {return true;},
        unFocusConverter: null
    }
);

/**
 *
 * @param {recoil.ui.widgets.InputWidget} me
 * @param {Element} inputEl
 * @param {boolean} setVal
 * @param {boolean} setError
 * @private
 */
recoil.ui.widgets.InputWidget.prototype.updateElement_ = function(me, inputEl, setVal, setError) {
    if (!me.converterB_.metaGet().good()) {
        return;
    }

    var res = me.converterB_.get().unconvert(inputEl.value);

    if (res.supported === false) {
        return;
    }
    var el = inputEl;

    var editable = true;
    me.scope_.getFrp().accessTrans(function() {
        editable = this.editableB_.metaGet().good() && this.editableB_.get();
    }.bind(this), this.editableB_);
    if (!res.error || !editable) {
        if (setVal) {
            me.valueB_.set(res.value);
        }
        if (setError) {
            me.scope_.getFrp().accessTrans(function() {
                me.outErrorsB_.set([]);
            }, me.outErrorsB_);
        }
        goog.dom.classlist.remove(el, 'recoil-error');
    } else {
        if (setVal && res.settable && editable) {
            me.valueB_.set(res.value);
        }

        if (setError) {
            me.scope_.getFrp().accessTrans(function() {
                me.outErrorsB_.set([res.error]);
            }, me.outErrorsB_);
        }
        // if we don't remove the error on empty then the placeholder
        // goes red
        if (inputEl.value) {
            goog.dom.classlist.add(el, 'recoil-error');
        }
        else {
            goog.dom.classlist.remove(el, 'recoil-error');
        }
    }
};
/**
 * if not immediate we need to put data back before we detach
 * @private
 */
recoil.ui.widgets.InputWidget.prototype.detach_ = function() {
    var frp = this.helper_.getFrp();
    var me = this;
    this.lastValueB_ = undefined;
    this.lastConverter_ = undefined;
    frp.accessTrans(function() {
        if (me.immediateB_.good() && me.converterB_.good() && me.valueB_.good() && !me.immediateB_.get()) {
            me.updateElement_(me, me.input_.getElement(), true, false);
        }
    }, me.immediateB_, me.converterB_, me.valueB_);
};

/**
 *
 * @param {!Object| !recoil.frp.Behaviour<Object>} options
 */
recoil.ui.widgets.InputWidget.prototype.attachStruct = function(options) {
    var frp = this.helper_.getFrp();

    var bound = recoil.ui.widgets.InputWidget.options.bind(frp, options);
    this.valueB_ = bound.value();
    this.placeholderB_ = bound.placeholder();
    this.enabledB_ = bound.enabled();
    this.editableB_ = bound.editable();
    this.immediateB_ = bound.immediate();
    this.tooltipB_ = bound.tooltip();
    this.converterB_ = bound.converter();
    this.maxLengthB_ = bound.maxLength();
    this.outErrorsB_ = bound.outErrors();
    this.displayLengthB_ = bound.displayLength();
    this.charValidatorB_ = bound.charValidator();
    this.classesB_ = bound.classes();
    this.spellcheckB_ = bound.spellcheck();

    var formatterB = frp.liftB(function(converter) {
        var func = function(val) {
            return converter.convert(val);
        };
        func.converter = converter;
        func.equals = function(other) {
            return other && recoil.util.object.isEqual(other.converter, converter);
        };
        return func;
    }, this.converterB_);
    this.readonlyHelper_.attach(this.editableB_);
    this.readonly_.attachStruct({name: this.valueB_, formatter: formatterB});
    this.helper_.attach(this.editableB_, this.valueB_, this.enabledB_, this.immediateB_, this.converterB_,
                        this.maxLengthB_, this.displayLengthB_, this.charValidatorB_, this.classesB_, this.spellcheckB_, this.outErrorsB_, this.placeholderB_);


    var me = this;


    this.changeHelper_.listen(this.scope_.getFrp().createCallback(function(v) {
        var inputEl = v.target;
        me.updateElement_(me, inputEl, me.immediateB_.get(), me.immediateB_.get());
    }, this.valueB_, this.immediateB_, this.converterB_, this.editableB_));

    var blurListener = function(v) {
        var inputEl = v.target;
        me.focusB_.set(false);

        if (!me.immediateB_.get()) {
            me.updateElement_(me, inputEl, true, true);
        }
        else {
            frp.accessTrans(function() {
                if (me.converterB_.metaGet().good() && me.valueB_.metaGet().good()) {
                    var t = me.converterB_.get();
                    var strVal = t.convert(me.valueB_.get());
                    me.setInputValue_(strVal);
                    me.updateElement_(me, inputEl, false, true);
                }
            }, me.converterB_, me.valueB_);
        }
    };

    this.blurChangeHelper_.listen(this.scope_.getFrp().createCallback(
        /** @type {function (...?): ?}*/ (blurListener), this.valueB_, this.immediateB_, this.converterB_, this.focusB_));

    this.focusChangeHelper_.listen(this.scope_.getFrp().createCallback(
        /** @type {function (...?): ?}*/ (function() {
            me.focusB_.set(true);
        }), this.focusB_));

    this.keyPressHelper_.listen(this.scope_.getFrp().createCallback(function(v) {


        if (!me.immediateB_.get()) {
            if (v.keyCode === goog.events.KeyCodes.ENTER) {
                 blurListener(v);
                 me.focusB_.set(true);
            }
        }
        if (v.keyCode === goog.events.KeyCodes.ESC) {
            if (me.valueB_.metaGet().good() && me.converterB_.metaGet().good()) {
                var t = me.converterB_.get();
                var strVal = t.convert(me.valueB_.get());
                me.setInputValue_(strVal);
                me.updateElement_(me, v.target, true, true);
                v.preventDefault();
                return;
            }
        }


        var bevent = v.getBrowserEvent();
        var ch = bevent.key !== undefined ? bevent.key : bevent.char;
        // Allow: backspace, delete, tab, escape, enter
        if (goog.array.contains([116, 46, 40, 8, 9, 27, 13, 110], v.keyCode) ||
            // Allow: Ctrl+A
            (v.keyCode == 65 && v.ctrlKey === true) ||
            // Allow: Ctrl+C
            (v.keyCode == 67 && v.ctrlKey === true) ||
            // Allow: Ctrl+C
            (v.keyCode == 86 && v.ctrlKey === true) ||
            // Allow: Ctrl+X
            (v.keyCode == 88 && v.ctrlKey === true) ||
            // Allow: home, end, left, right
            (v.keyCode >= 35 && v.keyCode <= 39)) {
            // let it happen, don't do anything
            return;
        }
        if (!me.charValidatorB_.get()(ch)) {
            v.preventDefault();
        }

    }, this.valueB_, this.immediateB_, this.converterB_, this.charValidatorB_));

    this.pasteHelper_.listen(this.scope_.getFrp().createCallback(function(v) {
        var bevent = v.getBrowserEvent();
        var ch = bevent.key !== undefined ? bevent.key : bevent.char;

        if (!me.charValidatorB_.get()(ch)) {
            var inputEl = v.target;
            var clip = v.getBrowserEvent().clipboardData;
            var txt = clip.getData('text/plain');

            var cleanTxt = '';
            for (var i = 0; i < txt.length; i++) {
                // if (charValidator(txt[i])) {
                 if (me.charValidatorB_.get()(txt[i])) {
                    cleanTxt += txt[i];
                }
            }

            // txt = txt.replace(/[^0-9.+]/g, 'F');
            if (cleanTxt != txt) {
                if (cleanTxt === '') {
                    v.preventDefault();
                }
                else {
                    var orig = inputEl.value;
                    var before = orig.substr(0, inputEl.selectionStart);
                    var after = orig.substr(inputEl.selectionEnd);
                    var maxLen = me.maxLengthB_.get();
                    if (maxLen !== undefined && maxLen > 0) {
                        var lengthRemaining = me.maxLengthB_.get() - (before + after).length;
                        cleanTxt = cleanTxt.substr(0, lengthRemaining);
                    }

                    var selPos = inputEl.selectionStart + cleanTxt.length;

                    inputEl.value = before + cleanTxt + after;

                    inputEl.selectionStart = selPos;
                    inputEl.selectionEnd = selPos;
                    me.updateElement_(me, v.target, me.immediateB_.get(), false);
                    v.preventDefault();
                }
            }
        }
    }, this.valueB_, this.converterB_, this.charValidatorB_, this.maxLengthB_, this.immediateB_));

    var tooltipB = frp.liftB(function(enabled, length, tooltip) {
         if (!enabled.val()) {
            return enabled;
        }
        if (tooltip !== recoil.ui.messages.BLANK) {
            if (tooltip === null) {
                return recoil.ui.BoolWithExplanation.TRUE;
            }
            return new recoil.ui.BoolWithExplanation(true, tooltip);
        }
        if (length !== undefined) {

            return new recoil.ui.BoolWithExplanation(true, recoil.ui.messages.MAX_LENGTH_0.resolve({len: length}));
        }
        return recoil.ui.BoolWithExplanation.TRUE;
    }, this.enabledB_, this.maxLengthB_, this.tooltipB_);
    this.enabledHelper_.attach(
        /** @type {!recoil.frp.Behaviour<!recoil.ui.BoolWithExplanation>} */ (tooltipB),
        this.helper_);
};


/**
 * Sets focus when element becomes visible
 */
recoil.ui.widgets.InputWidget.prototype.focus = function() {
    let me = this;
    let el = this.input_.getElement();

    let ob = new ResizeObserver(entries => {
        me.input_.focusAndSelect();
        ob.disconnect();
    });

    ob.observe(el);
};

/**
 *
 * @return {!recoil.frp.Behaviour<boolean>}
 */
recoil.ui.widgets.InputWidget.prototype.getFocus = function() {
    return this.focusB_;
};

/**
 * @private
 * @return {boolean}
 */
recoil.ui.widgets.InputWidget.prototype.changedActiveElement_ = function() {
    var a = document.activeElement;
    
    return a && a === this.input_.getElement() && a.value !== this.lastInputSet_;
};



/**
 * @private
 * @param {string} value
 */
recoil.ui.widgets.InputWidget.prototype.setInputValue_ = function(value) {

    var input = this.input_.getElement();
    
    var dir = input['selectionDirection'];
    var start = input.selectionStart;
    var end = input.selectionEnd;
   
    this.input_.setValue(value);
    this.lastInputSet_ = value;
    input.setSelectionRange(start, end, dir);
};

/**
 * @param {string} value
 */
recoil.ui.widgets.InputWidget.prototype.forceSetValue = function(value) {
    let me = this;
    me.input_.setValue(value);
    me.lastInputSet_ = value;
    me.helper_.accessTrans(function () {
        me.updateElement_(me, me.input_.getElement(), false, true);
    });

};
/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.InputWidget.prototype.updateState_ = function(helper) {

    var editable = this.editableB_.metaGet().good() || this.editableB_.get();
    this.input_.setEnabled(helper.isGood() && this.enabledB_.get().val());
    if (this.placeholderB_.metaGet().good()) {
        if (this.placeholderB_.get()) {
            this.input_.setLabel(this.placeholderB_.get());
        }
    }
    var el = this.input_.getElement();
    var maxLength = this.maxLengthB_.metaGet().good() ? this.maxLengthB_.get() : undefined;

    var displayLength = this.displayLengthB_.metaGet().good() ? this.displayLengthB_.get() : undefined;
    if (maxLength !== undefined) {
        el.maxLength = maxLength;
    } else if (el.maxLength !== undefined) {
        delete el.maxLength;
    }


    if (displayLength === undefined) {
        displayLength = maxLength;
    }

    if (this.spellcheckB_.metaGet().good()) {
        el.spellcheck = false;
    }

    this.curClasses_ = recoil.ui.ComponentWidgetHelper.updateClasses(this.input_.getElement(), this.classesB_, this.curClasses_);
    if (this.valueB_.metaGet().good() && this.converterB_.metaGet().good()) {
        var t = this.converterB_.get();

        var strVal = t.convert(this.valueB_.get());

        if (!this.changedActiveElement_()) {
            var me = this;
            if (strVal !== this.input_.getValue()) {
                if (!recoil.util.object.isEqual(this.lastValueB_, this.valueB_.metaGet())) {
                    this.setInputValue_(strVal);
                    this.updateElement_(this, me.input_.getElement(), false, true);
                } else if (!recoil.util.object.isEqual(this.lastConverter_, this.converterB_.metaGet())) {
                    this.setInputValue_(strVal);
                    this.updateElement_(this, me.input_.getElement(), false, true);
                }

            }
            else if (!recoil.util.object.isEqual(this.lastConverter_, this.converterB_.metaGet())) {
                this.updateElement_(this, me.input_.getElement(), false, true);

            }
        }
        else if (!recoil.util.object.isEqual(this.lastConverter_, this.converterB_.metaGet())) {
            if (recoil.util.object.isEqual(this.lastValueB_, this.valueB_.metaGet())) {
                this.setInputValue_(strVal);
            }
        }

        if (displayLength === undefined) {
            delete this.input_.getContentElement().style.width;
        }
        else {
            if (typeof(displayLength) === 'string') {
                this.input_.getContentElement().style.width = displayLength;
            }
            else {
                this.input_.getContentElement().style.width = displayLength + 'em';
            }
        }
    }
    else {
        this.setInputValue_(recoil.ui.messages.NOT_READY.toString());
    }
    this.lastValueB_ = this.valueB_.metaGet();
    this.lastConverter_ = this.converterB_.metaGet();

};


/**
 *
 * @param {!recoil.ui.WidgetScope} scope
 * @constructor
 */
recoil.ui.widgets.InputWidgetHelper = function(scope) {
    this.scope_ = scope;
};

/**
 *
 * @param {string} type
 */
recoil.ui.widgets.InputWidget.prototype.setType = function(type) {
    this.input_.getContentElement().type = type;
};
