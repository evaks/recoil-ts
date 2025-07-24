/**
 * a simple widget to provide just text no formatting
 *
 */
import {Widget} from "./widget";
import {Message} from "../message";
import {WidgetScope} from "./widgetscope";
import {Behaviour} from "../../frp/frp";
import {BoolWithExplanation} from "../booleanwithexplain";
import {WidgetHelper} from "../widgethelper";
import {createDom, createTextNode, isCss1CompatMode, removeChildren} from "../dom/dom";
import {Options} from "../frp/util";
import {TagName} from "../dom/tags";
import {BehaviourOrType, StructBehaviourOrType} from "../../frp/struct";
import {Tooltip} from "../tooltip";

export type ValueType = string|Message|Node;
export type FormatterFn = (value: ValueType)=>string|Node;

export class Label extends Widget {
    private curClasses_: string[] = [];
    private scope_:WidgetScope;
    private label_: HTMLElement;
    private helper_: WidgetHelper;
    private valueB_?: Behaviour<ValueType>;
    private enabledB_?: Behaviour<BoolWithExplanation>;
    private classesB_?:Behaviour<string[]>;
    private formatterB_?: Behaviour<FormatterFn>;
    private tooltip_: Tooltip|null;
    private tooltipVal_: ValueType|null;

    constructor(scope: WidgetScope) {
        super();
        this.scope_ = scope;
        this.tooltip_ = null;
        this.tooltipVal_ = null;

        this.label_ = createDom(TagName.DIV) as HTMLElement;
        this.helper_ = new WidgetHelper(scope, this.label_, this, this.updateState_,  ()=> {
            this.resetTooltip_(null);
        });

        this.curClasses_ = [];
    }


    static defaultFormatter_(value: ValueType):string|Node {
        if (typeof value === "string") {
            return value;
        } else if (value instanceof Message) {
            return value.toString();
        } else if (value instanceof Node) {
            return value;
        } else {
            return 'ERROR: not string but ' + typeof (value) + ': ' + value;
        }

    }

    /**
     * list of functions available when creating a selectorWidget
     */

    static readonly options = Options('value',
        {
            'enabled': BoolWithExplanation.TRUE,
            'formatter': Label.defaultFormatter_,
            'classes': []
        });

    private updateState_(helper: WidgetHelper) {
        this.curClasses_ = WidgetHelper.updateClasses(this.label_, this.classesB_, this.curClasses_);
        removeChildren(this.label_);
        let tooltip = null;


        if (helper.isGood()) {
            let val = this.valueB_?.get() as ValueType;
            let content = this.formatterB_.get()(val);
            try {
                tooltip = this.enabledB_?.get().reason();
                if (tooltip) {
                    tooltip = tooltip.toString();
                }
            } catch (e) {
            }

            if (content instanceof Node) {
                this.label_.appendChild(content);
            } else if (typeof content === "string") {
                this.label_.appendChild(createTextNode(content));
            } else {
                this.label_.appendChild(createTextNode(content + ''));
            }


        } else {
            this.label_.appendChild(createTextNode('??'));
        }
        this.resetTooltip_(tooltip);
    }

    attachStruct(value:BehaviourOrType<{
        value: ValueType;
        enabled: BoolWithExplanation,
        formatter: FormatterFn;
        classes: string[],
    }|{
        value: BehaviourOrType<ValueType>,
        enabled: BehaviourOrType<BoolWithExplanation>,
        formatter: BehaviourOrType<FormatterFn>,
        classes: BehaviourOrType<string[]>
    }>) {
        let frp = this.helper_.getFrp();
        let bound = Label.options.bind(frp, value);

        this.valueB_ = bound.value();
        this.enabledB_ = bound.enabled();r
        this.formatterB_ = bound.formatter();
        this.classesB_ = bound.classes();
        this.helper_.attach(this.valueB_, this.enabledB_, this.formatterB_, this.classesB_);
    }


    /**
     *  @param {?} tooltip
     */
    private resetTooltip_(tooltip: ValueType| null) {
        if (typeof (tooltip) === 'string') {
            tooltip = tooltip.trim();
            if (tooltip == '') {
                tooltip = null;
            }
        }
        if (!tooltip || tooltip != this.tooltipVal_) {
            if (this.tooltip_) {
                this.tooltip_.detach(this.label_);
                this.tooltip_.dispose();
                this.tooltip_ = null;
            }
            if (tooltip != null) {
                this.tooltip_ = new Tooltip(this.label_, tooltip);
                this.tooltipVal_ = tooltip;
            } else {
                this.tooltipVal_ = null;
            }
        }

    }
}



export class LabelWidgetHelper {
    private scope_: WidgetScope;
    constructor(scope: WidgetScope) {
        this.scope_ = scope;
    }
    static createAndAttach(name:string|Behaviour<string>, enabled:BoolWithExplanation|Behaviour<BoolWithExplanation>) {
        var label = new LabelWidget(this.scope_);
        label.attach(name, enabled);
        return label;
    }
}