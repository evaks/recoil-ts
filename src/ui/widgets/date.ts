import { Widget } from "./widget";
import { WidgetScope } from "./widgetscope";
import {createDom, setAtrribute, setElementShown} from "../dom/dom.ts";
import {TagName} from "../dom/tags.ts";
import {WidgetHelper} from "../widgethelper.ts";
import {EnabledTooltipHelper} from "../tooltiphelper.ts";
import {EventHelper} from "../eventhelper.ts";
import {EventType} from "../dom/eventtype.ts";
import { enable } from "../dom/classlist.ts";
import {getStandardOptionsGroup, StandardOptions, StandardOptionsType} from "../frp/util.ts";
import {AttachType} from "../../frp/struct.ts";
import {Behaviour} from "../../frp/frp.ts";
import {BoolWithExplanation} from "../booleanwithexplain.ts";
import {Message} from "../message.ts";
import {makeStructColumn} from "./table/column.ts";

export class DateWidget extends Widget {
    private readonly date_: HTMLInputElement;
    private readonly readonly_: HTMLSpanElement;
    private readonly helper_: WidgetHelper;
    private configB_?: Behaviour<{
        min: number | null,
        max: number | null; step: number; allowNone: boolean,
        enabled: BoolWithExplanation;
        editable: boolean;
        tooltip: Message | string
    }>;
    private tooltipHelper_: EnabledTooltipHelper;

    private valueB_?: Behaviour<number | null>;

    constructor(scope: WidgetScope) {
        super(scope, createDom('div', {class: 'recoil-date-cont'}));
        this.date_ = createDom(TagName.INPUT, {type: 'date'});
        this.readonly_ = createDom(TagName.SPAN, {});
        this.getElement().appendChild(this.date_);
        this.getElement().appendChild(this.readonly_);
        this.helper_ = new WidgetHelper(scope, this.getElement(), this, this.updateState_);
        this.tooltipHelper_ = new EnabledTooltipHelper(scope, this.getElement(), this.date_, [this.readonly_]);
        const frp = scope.getFrp();

        EventHelper.listen(this.date_, EventType.BLUR, () => {
            this.helper_.forceUpdate();
        });
        EventHelper.listen(this.date_, EventType.CHANGE, () => {
            if (!this.valueB_ || !this.configB_) {
                return;
            }
            frp.accessTrans(() => {
                if (!this.configB_) {
                    return;
                }
                let dt = this.date_.value;
                let outDate = dt === '' ? null : parseInt(dt.replace(/-/g, ''), 10);
                let valid = DateWidget.isValid(this.configB_.get(), outDate);
                enable(this.date_, 'recoil-error', !valid);
                if (valid && this.valueB_) {
                    this.valueB_.set(outDate);
                }
            }, this.valueB_, this.configB_);
        });
    }

    static options = StandardOptions('value', {allowNone: false, min: null, max: null, step: 1});

    /**
     *
     * @param options the value is in YYYYMMDD format use fromDate to convert
     */
    attachStruct(options: AttachType<{
        value: number
    } & StandardOptionsType>) {
        let frp = this.helper_.getFrp();
        let bound = DateWidget.options.bind(frp, options);


        this.valueB_ = bound.value();
        this.configB_ = getStandardOptionsGroup<{
            min: number | null,
            max: number | null,
            step: number,
            allowNone: boolean
        }>(bound, [bound.min, bound.max, bound.step, bound.allowNone]);
        this.helper_.attach(this.valueB_, this.configB_);

        this.tooltipHelper_.attach(this.configB_, this.helper_);
    }

    private updateState_ (helper:WidgetHelper) {
        if (helper.isGood() && this.configB_ && this.valueB_) {
            setElementShown(this.date_, this.configB_.get().editable);
            setElementShown(this.readonly_, !this.configB_.get().editable);

            let toSet = DateWidget.convertDateToElType(this.valueB_!.get());
            if (this.date_.value !== toSet) {
                this.date_.value = toSet || '';

            }

            if (toSet == null) {
                this.readonly_.innerText = '';
            } else {
                this.readonly_.innerText = DateWidget.convertLocalDate(this.valueB_!.get()!)!.toDateString();
            }

            setAtrribute(this.date_, 'min', DateWidget.convertDateToElType(this.configB_.get().min));
            setAtrribute(this.date_, 'max', DateWidget.convertDateToElType(this.configB_.get().max));
            if (this.configB_ && this.date_.step != String(this.configB_?.get().step)) {
                this.date_.step = String(this.configB_.get().step);
            }
            let valid = DateWidget.isValid(this.configB_.get(), this.valueB_.get());
            enable(this.date_, 'recoil-error', !valid);

        }

    }

    private static toDate_(value: number): Date {
        return new Date(Math.floor(value / 10000), Math.floor((value % 10000) / 100) - 1, value % 100, 0, 0, 0, 0);
    }

    static isValid(bounds: {
        allowNone: boolean,
        min: number | null,
        max: number | null,
        step: number
    }, value: number | null) {
        if (value === null) {
            return bounds.allowNone;
        }


        if (bounds.min === null) {
            return bounds.max === null ? true : value <= bounds.max;
        }
        if (bounds.min > value) {
            return false;
        }
        if (bounds.max !== null && bounds.max < value) {
            return false;
        }

        if (bounds.step === 1) {
            return true;
        }

        let diff = Math.round((DateWidget.toDate_(value).getTime() - DateWidget.toDate_(bounds.min).getTime()) / (24 * 3600000));

        return Math.abs(diff) % bounds.step === 0;

    }

    private static pad_(num: number, amount: number): string {
        return ('' + num).padStart(amount, '0');
    }

    static convertDateToElType(date: number | null): string | null {
        let dt = date + '';
        if (date === null || dt === '') {
            return null;
        }
        let year = Math.floor(date / 10000);
        return DateWidget.pad_(year, 4) + '-' + DateWidget.pad_(Math.floor(date / 100) % 100, 2) + '-' + DateWidget.pad_(date % 100, 2);
    }
    static convertLocalDate (date: null): null;
    static convertLocalDate (date: number): Date;
    static convertLocalDate (date: number|null): Date | null {
        let dt = date + '';
        if (date === null || dt === '') {
            return null;
        }
        return new Date(Math.floor(date / 10000), Math.floor((date % 10000) / 100) - 1, date % 100);
    }
    static fromDate (date:null): null;
    static fromDate (date:Date): number;
    static fromDate (date:Date|null): number| null{
        if (date === null) {
            return null;
        }
        return this.convertDateToLocal(date);
    }

    static convertDateToLocal(d: null): null;
    static convertDateToLocal(d: Date): number;
    static convertDateToLocal(d: Date|null): number|null {
        if (d === null) {
            return null;
        }
        return d.getFullYear() * 10000 + 100 * (d.getMonth() + 1) + d.getDate();

    }
}

export const DateColumn = makeStructColumn(DateWidget);
