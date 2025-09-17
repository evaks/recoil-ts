import {Widget} from "./widget";
import {WidgetScope} from "./widgetscope";
import {TagName} from "../dom/tags.ts";
import {createDom, createTextNode, removeChildren, setElementShown} from "../dom/dom";
import {WidgetHelper} from "../widgethelper.ts";
import {EventType} from "../dom/eventtype.ts";
import {EventHelper} from "../eventhelper.ts";
import {EnabledTooltipHelper} from "../tooltiphelper.ts";
import {userAgent} from "../dom/useragent.ts";
import {KeyCodes} from "../dom/keycodes.ts";
import {getGroup, StandardOptions, StandardOptionsType} from "../frp/util.ts";
import {AttachType, StructType} from "../../frp/struct.ts";
import {Behaviour, ErrorType} from "../../frp/frp.ts";
import {Message} from "../message.ts";
import {Messages} from "../messages.ts";
import {BoolWithExplanation} from "../booleanwithexplain.ts";
import classlist from "../dom/classlist.ts";

export type FormatterFn = (value: number | null | undefined) => string;
export type ValidatorFn = (value: string | null | number) => null | string | Message;
export type RangeList = [{ min: number, max: number }, ...{ min: number, max: number }[]];

const MAX = Number.MAX_SAFE_INTEGER || 9007199254740991;

export class NumberWidget extends Widget {
    private readonly errorDiv_: HTMLDivElement;
    private readonly number_: HTMLInputElement;
    private readonly readonly_: HTMLSpanElement;
    private readonly valueHelper_: WidgetHelper;
    private readonly errorHelper_: WidgetHelper;
    private readonly configHelper_: WidgetHelper;
    private readonly validatorHelper_: WidgetHelper;
    private readonly readonlyHelper_: WidgetHelper;
    private readonly enabledHelper_: EnabledTooltipHelper;
    private readonly keyUpHelper_: EventHelper<KeyboardEvent>;
    private readonly changeHelper_: EventHelper<KeyboardEvent>;
    private readonly keyPressHelper_: EventHelper<KeyboardEvent>;
    private configB_?: Behaviour<{
        min: number;
        max: number;
        step: number;
        immediate: boolean;
        editable: boolean;
        enabled: BoolWithExplanation;
        classes: string[],
        tooltip: Message | string;
        displayLength: number | null;
        allowNull: boolean;
        ranges: [{ min: number, max: number }, ...{ min: number, max: number }[]],
        validator: ValidatorFn,
    }>;
    private valueB_?: Behaviour<number | null>;
    private formatterB_?: Behaviour<FormatterFn>;
    private outErrorsB_?: Behaviour<ErrorType[]>;
    private lastKey_?: DOMHighResTimeStamp;
    private prev_?: number; // used for up/down arrows to skip if we have a step size of not 1, or ranges tos skip
    /**
     *   the last good value of the number field, when exiting we and the number is not valid we reset the field
     *   to this if not undefined
     */
    private lastGood_: string|undefined;
    private readonly keyFilter_: (e: KeyboardEvent) => void;
    private hasErrors_: boolean = false;

    constructor(scope: WidgetScope) {
        let errorDiv = createDom(TagName.DIV, {class: 'recoil-error'});
        let number = createDom(TagName.INPUT, {
            title: userAgent.EDGE_OR_IE ? '' : ' ',
            class: 'recoil-number-input',
            step: 1,
            type: 'number',
            min: undefined,
            max: undefined,
        });

        super(scope, createDom('div', {}, errorDiv, number))
        this.errorDiv_ = errorDiv;
        this.number_ = number;
        this.readonly_ = createDom(TagName.SPAN);
        this.getElement().appendChild(this.readonly_);

        this.valueHelper_ = new WidgetHelper(scope, this.number_, this, this.updateValue_, {detach: this.detach_, attach: () => {}});
        this.configHelper_ = new WidgetHelper(scope, this.number_, this, this.updateConfig_);
        this.errorHelper_ = new WidgetHelper(scope, this.number_, this, () => {
        });
        this.validatorHelper_ = new WidgetHelper(scope, this.number_, this, this.updateValidator_);
        this.readonlyHelper_ = new WidgetHelper(scope, this.number_, this, this.updateReadonly_);
        this.changeHelper_ = new EventHelper(scope, this.number_, EventType.CHANGE);
        this.enabledHelper_ = new EnabledTooltipHelper(scope, this.getElement(), this.number_, [this.readonly_]);
        this.keyPressHelper_ = new EventHelper(scope, this.number_, EventType.KEYDOWN);
        this.keyUpHelper_ = new EventHelper(scope, this.number_, EventType.KEYUP);
        this.prev_ = undefined;
        this.lastKey_ = undefined;
        // we need this because some browsers don't filter keys
        this.keyFilter_ = (e: KeyboardEvent) => this.filterControlKeys(e);

        this.number_.addEventListener(EventType.KEYDOWN, this.keyFilter_);
        this.number_.addEventListener(EventType.BLUR, () => {
            // doesn't matter what it is since we came in with the value keep it on exit
            this.lastGood_ = this.number_.value;
        })
        this.number_.addEventListener(EventType.BLUR, () => {
            if (this.hasErrors_ && this.lastGood_ !== undefined) {
                this.number_.value = this.lastGood_;
                classlist.enable(this.number_, 'recoil-error', this.getErrors_(this.number_.value).length !== 0);
            }
        });
        let frp = scope.getFrp();
        const doChange = () => {
            if (!this.configB_) {
                return;
            }
            frp.accessTrans(() => {
                let val;
                if (!this.configB_) {
                    return;
                }
                const config = this.configB_.get()

                try {
                    val = parseFloat(this.number_.value);
                } catch (e) {
                    return;
                }
                let i = 0;
                for (; i < config.ranges.length; i++) {
                    let r = config.ranges[i];
                    if (val >= r.min && val <= r.max) {
                        this.prev_ = val;
                        return;
                    }
                    if (val < r.min) {
                        break;
                    }

                }
                if (this.lastKey_ !== undefined) {
                    let tdiff = window.performance.now() - this.lastKey_;
                    if (tdiff < 500) {
                        this.prev_ = val;
                        return;
                    }
                }
                if (this.getErrors_(this.number_.value).length === 0) {
                    this.lastGood_ = this.number_.value;
                }

                if (i >= config.ranges.length || i == 0 || this.prev_ === undefined) {
                    this.prev_ = val;
                    return;
                }
                let diff = Math.abs(this.prev_ - val);
                if (diff >= config.step * 2) {
                    this.prev_ = val;
                    return;
                }
                if (this.prev_ === val) {
                    return;
                }
                if (this.prev_ < val) {
                    val = config.ranges[i].min;
                } else {
                    val = config.ranges[i - 1].max;
                }
                this.number_.value = '' + val;
                this.prev_ = val;

            }, this.configB_);
        }
        this.number_.addEventListener(EventType.INPUT, doChange);

    }

    private static alwaysValidChars = new Set(['0','1','2', '3','4','5','6','7','8','9']);

    private handlePaste_(e: ClipboardEvent) {
        if (!this.configB_ || !this.valueB_ || !this.outErrorsB_) {
            e.preventDefault();
            return;
        }
        this.scope_.getFrp().accessTrans(() => {
            let txt = e.clipboardData?.getData('text/plain') || '';
            let cleanTxt = '';
            let validChars = new Set();
            const config = this.configB_!.get();

            if (NumberWidget.getDp_(config.min) > 0  || NumberWidget.getDp_(config.max) > 0 || NumberWidget.getDp_(config.step) > 0) {
                validChars.add('.');
            }
            if (config.min < 0) {
                validChars.add('-');
            }
            for (let c of txt) {
                if (NumberWidget.alwaysValidChars.has(c) || validChars.has(c)) {
                    cleanTxt += c;
                }
            }

            if (cleanTxt.length == 0) {
                e.preventDefault();
                return;
            }
            if (cleanTxt != txt || true) {
                if (cleanTxt === '') {
                    e.preventDefault();
                } else {
                    let inputEl = this.number_;
                    if (inputEl.selectionEnd == null || inputEl.selectionEnd == null) {
                        e.preventDefault();
                        return;
                    }

                    let orig = inputEl.value;
                    let before = orig.substring(0, inputEl.selectionStart || 0);
                    let after = orig.substring(inputEl.selectionEnd);
                    let maxLen = Math.max(NumberWidget.lenWithDp(config.min, config.step), NumberWidget.lenWithDp(config.max, config.step));
                    if (maxLen !== undefined && maxLen > 0) {
                        let lengthRemaining = maxLen - (before + after).length;
                        cleanTxt = cleanTxt.substring(0, lengthRemaining);
                    }

                    let selPos = (inputEl.selectionStart || 0) + cleanTxt.length;

                    inputEl.value = before + cleanTxt + after;

                    inputEl.selectionStart = selPos;
                    inputEl.selectionEnd = selPos;

                    this.setInputValue();
                    e.preventDefault();
                }

            }

        }, this.configB_, this.valueB_, this.outErrorsB_);


    }

    /**
     * if not immediate we need to put data back before we detach
     */
    detach_() {
        if (!this.valueB_ || !this.configB_) {
            return;
        }
        let frp = this.valueHelper_.getFrp();
        frp.accessTrans(() => {

            if (this.valueB_?.good() && this.configB_?.good()) {
                try {
                    let element = this.number_;
                    if (this.getErrors_(element.value).length === 0) {
                        let val = element.value === '' ? null : parseFloat(element.value);
                        this.valueB_.set(val);
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        }, this.valueB_, this.configB_);
    }

    filterControlKeys(e: KeyboardEvent) {
        if (!KeyCodes.isTextModifyingKeyEvent(e)) {
            return false;
        }
        this.lastKey_ = window.performance.now();
        let charInfo = this.scope_.getFrp().accessTrans(() => {
            if (!this.configB_ || !this.configB_.good()) {
                return {hasNeg: true, hasDp: true};
            }
            let config = this.configB_.get();
            let hasDp = NumberWidget.getDp_(config.min) > 0 || NumberWidget.getDp_(config.step) > 0 || NumberWidget.getDp_(config.step) > 0;
            let hasNeg = config.min < 0;
            return {hasDp, hasNeg};
        }, this.configB_!);

        // Allow: backspace, delete, tab, escape, enter
        if (["F5", "Delete", "ArrowDown","ArrowUp", "Tab", "Backspace", "Escape", "Enter"].includes(e.key) ||
            (["a", "c", "x", "v"].includes(e.key) && e.ctrlKey === true) ||
            (["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key))) {
            // let it happen, don't do anything
            return false;
        }


        // Ensure that it is a number and stop the keypress
        if (!charInfo.hasDp && e.key === '.') {
            e.preventDefault();
        } else if (!charInfo.hasNeg && e.key === '-') {
            e.preventDefault();
        } else if (!(/^[0-9.\-]$/.test(e.key))) {
            e.preventDefault();
        }
    }

    setRanges(ranges: [{ min: number, max: number }, ...{ min: number, max: number }[]]) {
        this.number_.min = String(ranges[0].min);
        this.number_.max = String(ranges[ranges.length - 1].max);
    }


    /**
     * the behaviours that this widget can take
     *
     * all standard options
     * value - number the number to edit
     * min - number the minimum value
     * max - number the maximum value
     * ranges - use to specify multiple ranges will override min/max each entry is an object {min:?,max:?}
     * step - step size of the number
     * validator - a function that takes a number and returns a message if it is invalid, else null
     *
     */
    static options = StandardOptions(
        'value',
        {
            min: 0,
            max: MAX,
            displayLength: null,
            step: 1,
            allowNull: false,
            ranges: [],
            outErrors: [],
            validator: () => {
                return null;
            },
            readonlyFormatter: null,
            classes: [],
            immediate: false
        }
    );

    /**
     * gets the maxiumn string length of value given the step size
     *
     * @param value
     * @param step
     * @private
     */
    private static lenWithDp(value: number, step:number):number {
        let valDp = NumberWidget.getDp_(value);
        let stepDp = NumberWidget.getDp_(step);

        if (stepDp > valDp) {
            // will we need to add a decimal point to
            let diff = stepDp - valDp;
            return String(value).length + (valDp > 0 ? diff : diff + 1);
        }
        else {
            return String(value).length
        }
    }
    /**
     * @return the number of decimal point this number has
     *
     */

    private static getDp_(num: number) {
        if (isNaN(num)) {
            return 0;
        }
        let str = num + '';
        let idx = str.indexOf('.');
        if (idx === -1) {
            return 0;
        }
        return str.length - 1 - idx;
    }

    /**
     * calculates the width of the number field based on the numbers that can go
     * into it
     */

    private calcWidth_(width: number, val: number, step: number): number | null {
        const editable = this.configB_?.good() && this.configB_.get().editable || false;

        let formatter = this.formatterB_?.metaGet().good() ?
            this.formatterB_.metaGet().get() : (v: any) => {
                return '' + v;
            };

        let str = editable ? '' + val : formatter(val);
        let stepStr = '' + step;


        if (!editable || stepStr.indexOf('.') == -1) {
            return Math.max(width, str.length);
        } else {
            let dps = stepStr.length - stepStr.indexOf('.') - 1;
            let strPointIdx = str.indexOf('.');
            if (strPointIdx != -1) {
                let strDps = str.length - strPointIdx - 1;
                dps = Math.max(dps, strDps);
                str = str.substring(0, strPointIdx);
            }
            str += '.' + ''.padEnd(dps, '0');
            return Math.max(width, str.length);
        }
    }

    attachStruct(options: AttachType<{
        value: number
        min?: number,
        max?: number,
        step?: number,
        allowNull?: boolean,
        ranges?: [{ min: number, max: number }, ...{ min: number, max: number }[]],
        outErrors?: ErrorType[],
        classes?: string[],
    } & StandardOptionsType>) {
        let frp = this.scope_.getFrp();
        let bound = NumberWidget.options.bind(frp, options);
        this.valueB_ = bound.value();
        this.configB_ = bound[getGroup](
            [bound.min, bound.max, bound.step, bound.ranges, bound.immediate, bound.displayLength,
                bound.editable, bound.enabled, bound.tooltip, bound.classes,
                bound.allowNull, bound.validator],
            (obj: StructType) => {
                let min: number = obj.min;
                let max: number = obj.max;
                let step: number = obj.step;
                let ranges: RangeList = [{min: min, max: max}];

                if (obj.ranges.length > 0) {
                    min = obj.ranges[0].min;
                    max = obj.ranges[0].max;
                    ranges = obj.ranges;
                    for (let r of obj.ranges) {
                        min = Math.min(min, r.min);
                        max = Math.max(max, r.max);
                    }
                }
                return {
                    min: min, max: max, step: step, ranges: ranges,
                    immediate: obj.immediate,
                    displayLength: obj.diplayLength as number | null,
                    editable: obj.editable,
                    allowNull: obj.allowNull,
                    enabled: obj.enabled,
                    tooltip: obj.tooltip,
                    classes: obj.classes,
                    validator: obj.validator,
                };
            });
        this.outErrorsB_ = bound.outErrors();
        this.hasErrors_ = false;

        this.formatterB_ = frp.liftB((_range: any, fmt: FormatterFn): FormatterFn => {
            let config = this.configB_?.get()!;
            if (fmt) {
                return fmt;
            }

            let dp = Math.max(
                NumberWidget.getDp_(config.min),
                NumberWidget.getDp_(config.step));
            return (v: number | null | undefined) => {
                if (v === null || v === undefined) {
                    return '';
                }
                if (isNaN(v)) {
                    return Messages.NOT_APPLICABLE.toString();
                }
                return v.toLocaleString(undefined, {minimumFractionDigits: dp});
            };
        }, this.configB_, bound.readonlyFormatter());

        this.errorHelper_.attach(this.outErrorsB_, this.configB_);
        this.validatorHelper_.attach(this.configB_);
        this.valueHelper_.attach(this.valueB_);

        this.configHelper_.attach(this.configB_, this.formatterB_);
        this.readonlyHelper_.attach(this.configB_, this.formatterB_, this.valueB_);
        this.keyPressHelper_.listen(this.scope_.getFrp().createCallback((v) => {
            if (v.key === "Escape") {
                this.updateValue_(this.valueHelper_);
            }
        }, this.valueB_, this.outErrorsB_, this.configB_));

        this.keyUpHelper_.listen(this.scope_.getFrp().createCallback((v: KeyboardEvent) => {
            if (v.key !== "Escape" && this.configB_?.get().immediate) {
                this.setInputValue();
            }
        }, this.valueB_, this.outErrorsB_, this.configB_));

        this.changeHelper_.listen(this.scope_.getFrp().createCallback((v)=> {
            this.setInputValue();
        }, this.valueB_, this.outErrorsB_, this.configB_));

        let toolTipB = frp.liftB(NumberWidget.makeEnabledWithRangeTooltip, this.configB_);
        this.enabledHelper_.attach(toolTipB, this.valueHelper_, this.configHelper_);
    }

    private setInputValue() {
        let inputEl = this.number_;
        if (!this.outErrorsB_ || !this.configB_ || !this.valueB_) {
            return;
        }
        const config = this.configB_.get()!;

        if (this.getErrors_(this.number_.value).length === 0) {
            let val = inputEl.value === '' ? null : parseFloat(inputEl.value);
            let error = config.validator(val);
            if (error) {
                this.updateErrors_(inputEl, this.outErrorsB_!);
            } else {
                this.valueB_.set(val);
                this.updateErrors_(inputEl, this.outErrorsB_!);
            }
        } else {
            this.updateErrors_(inputEl, this.outErrorsB_);
        }
    }
    private static makeEnabledWithRangeTooltip(config: {
        enabled: BoolWithExplanation
        ranges: RangeList,
        min: number, max: number,
        step: number,
        tooltip: Message | string,
    }): { enabled: BoolWithExplanation, tooltip: Message } {
        const enabled = config.enabled;
        const tooltip = Message.toMessage(config.tooltip);

        if (!enabled.val()) {
            return {enabled, tooltip};
        }
        let reason = enabled.reason();
        // if enabled overrides this just use that
        if (reason && reason.toString() !== '') {
            return {enabled, tooltip};
        }
        if (config.ranges.length !== 1) {
            let rangeMessages: Message[] = [];
            config.ranges.forEach(function (range) {
                if (range.min === range.max) {
                    rangeMessages.push(Message.getParamMsg(['distinctValue']).resolve({'distinctValue': range.min}));
                } else {
                    if (range.max == MAX) {
                        rangeMessages.push(Messages.MIN_0.resolve({min: range.min}));
                    } else {
                        rangeMessages.push(Messages.MIN_TO_MAX.resolve({min: range.min, max: range.max}));
                    }
                }
            });
            let info = {
                'ranges': Messages.join(rangeMessages, Messages.OR),
                step: config.step
            };
            let message = config.step == 1 ? Messages.MIN_MAX_RANGES.resolve(info)
                : Messages.MIN_MAX_RANGES_STEP.resolve(info);
            return {enabled: new BoolWithExplanation(true, message), tooltip};
        } else {
            let info = {'min': config.min, max: config.max, step: config.step};
            let message: Message;
            if (config.max == MAX) {
                message = config.step == 1 ? Messages.MIN_0.resolve(info)
                    : Messages.MIN_STEP.resolve(info);

            } else {
                message = config.step == 1 ? Messages.MIN_MAX.resolve(info)
                    : Messages.MIN_MAX_STEP.resolve(info);
            }
            return {enabled: new BoolWithExplanation(true, message), tooltip};
        }

    }

    private updateReadonly_(helper: WidgetHelper) {
        removeChildren(this.readonly_);
        if (helper.isGood()) {
            const config = this.configB_!.get()
            this.readonly_.appendChild(createTextNode(this.formatterB_!.get()(this.valueB_?.get())));
            classlist.setAll(this.readonly_, ['recoil-number', ...config.classes])
        }
    }


    private updateValidator_() {

        if (!this.outErrorsB_ || !this.configB_ || !this.valueB_) {
            return;
        }
        if (this.updateErrors_(this.number_, this.outErrorsB_)) {
            if (true) {
                return;
            }/*
            this.scope_.getFrp().accessTrans(() => {
                if (this.valueB_?.hasRefs() && this.valueB_.good()) {
                    let element = this.number_;
                    let val = element.value == '' ? null : parseFloat(element.value);
                    this.valueB_.set(val);
                }
                return true;
            }, this.valueB_);*/
        }
    }
    private getErrors_(value:string): Message[] {
        if (!this.configB_?.hasRefs()) {
            return [];
        }
        return this.scope_.getFrp().accessTrans(():Message[] => {
            if (!this.configB_?.good()) {
                return [];
            }
            const config = this.configB_!.get();
            let allowNull = config.allowNull;
            let manualValid = true;

            let validatorError = config.validator(value);

            let num: number;
            if (value === '') {
                return allowNull ? [Messages.CANNOT_BE_EMPTY] : [];
            } else {
                try {
                    let v = parseFloat(value);
                    num = v;
                    // run to get the range that v applies for
                    let curRange = undefined;
                    for (let r of config.ranges) {
                        if (v >= r.min && v <= r.max) {
                            curRange = r;
                        }
                    }

                    if (curRange === undefined) {
                        manualValid = false;
                    } else {
                        v = v - curRange.min;
                        let dps =  Math.max(
                            NumberWidget.getDp_(curRange.min),
                            NumberWidget.getDp_(config.step));
                        let mul = Math.pow(10,dps);
                        let step = Math.floor(mul * config.step);
                        v = Math.floor(v * mul);
                        manualValid = (v % step) === 0;
                        let pointIdx = value.indexOf(".");
                        if (manualValid && pointIdx !== -1) {

                            // 0.1
                            manualValid = (value.length - pointIdx - 1) <= dps;
                        }
                    }


                } catch (e: any) {
                    return [Message.toMessage(e.message)];
                }

                if (manualValid) {
                    return validatorError ? [Message.toMessage(validatorError)] : [];
                }
            }
            let ranges = config.ranges;
            let errors: ErrorType[] = validatorError ? [validatorError] : [];
            let hasValid = false;
            for (let range of ranges) {
                if (range.min <= range.max) {
                    hasValid = true;
                }
                if (range.min === range.max) {
                    errors.push(Message.getParamMsg(['distinctValue']).resolve({'distinctValue': range.min}));
                } else {
                    errors.push(Messages.MIN_TO_MAX.resolve({'min': range.min, 'max': range.max}));
                }
            }
            let msg = Messages.join(errors, Messages.OR);
            if (config.step === 1) {
                msg = Messages.MUST_BE.resolve({'ranges': msg});
            } else {
                msg = Messages.MUST_BE_RANGE_STEP.resolve({
                    'ranges': msg,
                    step: config.step
                });
            }
            if (!hasValid) {
                msg = Messages.NO_VALID_RANGES.resolve({'mesg': msg});
            }
            return [msg];

        }, this.configB_);
    }

    private updateErrors_(el: HTMLInputElement, errorsB: Behaviour<ErrorType[]>):
        boolean {

        if (!this.configB_?.hasRefs() || !this.valueB_) {
            return false;
        }
        let res = this.scope_.getFrp().accessTrans(() => {

            // if it's not editable, and we are loaded then set the errors to empty
            // non-editable values can't have errors
            if (this.configB_?.good() && !this.configB_.get().editable) {
                errorsB.set([]);
                return true;
            }
            if (this.configB_?.good() && !this.configB_.get().enabled.val()) {
                if (this.valueB_?.good()) {
                    this.setValue(this.valueB_.get());
                }
                errorsB.set([]);
                return true;
            }


            let errors = this.getErrors_(this.number_.value);

            errorsB.set(errors)

            return  errors.length === 0;
        }, errorsB, this.configB_, this.valueB_);

        classlist.enable(el, 'recoil-error', !res);
        this.hasErrors_ = !res;
        return res;
    }

    private setValue(value: number|null) {
        if (value != null) {
            this.prev_ = value;
        }
        if (value === null) {
            console.log("setting null")
        }
        let display = value === null ? '' : String(value);
        if (this.getErrors_(display).length === 0) {
            classlist.enable(this.number_, 'recoil-error', true);
            this.lastGood_ = display;
        }
        else {
            classlist.enable(this.number_, 'recoil-error', false);
        }
        this.number_.value = display;
    }
    private updateValue_(helper: WidgetHelper) {
        if (helper.isGood() && this.valueB_ && this.configB_ && this.outErrorsB_) {
            this.scope_.getFrp().accessTrans(() => {
                this.setValue(this.valueB_!.get());
                this.updateErrors_(this.number_, this.outErrorsB_!);
            }, this.valueB_, this.configB_, this.outErrorsB_)

        }
        let errors = helper.isGood() ? [] : helper.errors();
        setElementShown(this.errorDiv_, errors.length > 0);
        removeChildren(this.errorDiv_);

        for (let error of errors) {
            let div = createDom(TagName.DIV, {class: 'error'}, createTextNode(error.toString()));
            div.onclick = function () {
                console.error('Error was', error);
            }
            this.errorDiv_.appendChild(div);
        }
    }

    private updateConfig_(helper: WidgetHelper) {
        setElementShown(this.number_, false);
        setElementShown(this.readonly_, false);
        if (!helper.isGood() || !this.configB_) {
            // todo show an error if things are bad
            return;
        }

        const config = this.configB_?.get();

        setElementShown(this.number_, config.editable);
        setElementShown(this.readonly_, !config.editable);

        let displayLen = this.configB_?.good() ? this.configB_.get().displayLength : null;


        // the longest on could be either the max or the min (negative numbers)
        let width = this.calcWidth_(0, config.min, config?.step);
        width = this.calcWidth_(width || 0, config.max, config.step);
        this.setRanges(config.ranges);
        this.number_.step = String(config.step)

        if (displayLen === -1 || width === null) {
            this.number_.style.width = '';
            this.readonly_.style.width = '';
        } else if (displayLen) {
            this.number_.style.width = (displayLen + 2) + 'ch';
            this.readonly_.style.width = displayLen + 'em';
        } else {
            this.number_.style.width = (width + 3) + 'ch';
            this.readonly_.style.width = (width) + 'em';
        }
        let hadErrors = this.hasErrors_;
        this.updateErrors_(this.number_, this.outErrorsB_!);
        if (hadErrors && !this.hasErrors_) {

            let frp = this.valueHelper_.getFrp();
            frp.accessTrans(() => {

                if (this.valueB_?.good()) {
                    try {
                        let element = this.number_;
                        let val = element.value === '' ? null : parseFloat(element.value);
                        this.valueB_.set(val);
                    } catch (e) {
                        console.error(e);
                    }
                }
            }, this.valueB_!);
        }
    }
}
