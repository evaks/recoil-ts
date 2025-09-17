
import {WidgetScope} from "./widgetscope.ts";
import {getGroup, StandardOptions} from "../frp/util.ts";
import {WidgetHelper} from "../widgethelper.ts";
import {Widget} from "./widget.ts";
import {createDom, isElement, setTextContent} from "../dom/dom.ts";
import classlist from "../dom/classlist.ts";
import {Behaviour} from "../../frp/frp.ts";
import {Message} from "../message.ts";
import {AttachType} from "../../frp/struct.ts";
import {BoolWithExplanation} from "../booleanwithexplain.ts";

export class ProgressWidget extends Widget {
    private progressDiv_:HTMLDivElement;
    private text_: HTMLDivElement;
    private helper_:WidgetHelper;
    private configB_?: Behaviour<{
        text:string|Message|Element,
        max:number,
        value:number,
    }>;

    constructor(scope: WidgetScope) {

        super(scope,createDom('div', {}, this.progressDiv_));

        this.progress_ = new goog.ui.ProgressBar();
        this.text_ = createDom('div', {class: 'recoil-progress-bar-text'});

        this.progressDiv_ = createDom(
            'div', {},
            createDom('div', {class: 'recoil-progress-bar-thumb'}),
            this.text_);
        this.progress_.decorate(this.progressDiv_);
        this.helper_ = new WidgetHelper(scope, this.progress_, this, this.updateState_);
    }
    
    private updateState_(helper:WidgetHelper) {
        if (helper.isGood() && this.configB_) {
            let max = this.configB_.get().max;
            let curVal = this.configB_.get().value;
            this.progress_.setMaximum(max);
            this.progress_.setValue(curVal);
            let val = this.configB_.get().text;

            classlist.enable(this.progressDiv_, 'recoil-progress-bar-done', curVal >= max);

            if (isElement(val)) {
                setTextContent(this.text_, '' /*this.textB_.get().innerText*/);
                this.text_.appendChild(val);
            } else {
                setTextContent(this.text_, String(val));
            }
        } else {
            classlist.enable(this.progressDiv_, 'progress-bar-done', false);
            setTextContent(this.text_, '');
            this.progress_.setValue(0);
            this.progress_.setMaximum(100);
        }
    }

    /**
     * attachable behaviours for widget
     */
    static options = StandardOptions(
        'max', 'value', {
            text: ''
        });

    /**
     *
     * @param {!Object| !recoil.frp.Behaviour<Object>} options
     */
    attachStruct(options:AttachType<
        { value:number, max: number, text?:string, enabled?: BoolWithExplanation }>) {
        let frp = this.helper_.getFrp();
        let bound = ProgressWidget.options.bind(frp, options);
        this.configB_ = bound[getGroup]([bound.max, bound.value, bound.text, bound.enabled]);
        this.helper_.attach(this.configB_);
    }
}

