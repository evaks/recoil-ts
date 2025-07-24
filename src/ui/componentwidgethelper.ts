/**
 * a utility class that is used to update widgets based on a behaviour each time the behaviour changes the callback
 * will be fired
 *
 * you may access the behaviour attached to the helper inside the callback
 *
 */
import {WidgetScope} from "./widgets/widgetscope";
import {DomObserver} from "./domobserver";
import {Behaviour, BehaviourList, BehaviourList1, BStatus, Frp} from "../frp/frp";
import * as classlist from "./dom/classlist";
import {append, createDom, createTextNode, removeChildren, removeNode, setProperties} from "./dom/dom";
import {Messages, Messages as messages} from "./messages";
import {BoolWithExplanation} from "./booleanwithexplain";
import {EventType} from "./dom/eventType";
import {Widget} from "./widgets/widget";
import {WidgetHelper} from "./widgethelper";
import {BehaviourOrType, StructBehaviourOrType} from "../frp/struct";
import {Message} from "./message";
import {Util} from "../frp/util";
import {TagName} from "./dom/tags";
import {CssHelper} from "./csshelper";

type BrowserEvent = KeyboardEvent|MouseEvent|SubmitEvent|InputEvent;

type OptionsType1 = {enabled: BehaviourOrType<BoolWithExplanation>};
type OptionsType2 = {
    message: BehaviourOrType<string|Element|Message>
    enabled?: BehaviourOrType<boolean|BoolWithExplanation>
};
type OptionsType = OptionsType1|OptionsType2;


export class Tooltip {
    private helper_: WidgetHelper;
    private scope_: WidgetScope;
    private messageB_?: Behaviour<string | Element | Message | undefined>;
    private enabledB_?: Behaviour<BoolWithExplanation | boolean | undefined>;
    private tooltip_:Element;

    constructor(scope: WidgetScope, anchor: Element, cssHelper:CssHelper = new CssHelper  ) {
        this.helper_ = new WidgetHelper(scope, anchor, this, this.update_, this.detach_);
        this.scope_ = scope;
        this.tooltip_ = createDom(TagName.DIV, cssHelper.className('recoil-tootip'));
    }

    private update_(helper: WidgetHelper) {
        let message = undefined;
        let enabled = false;
        removeChildren(this.tooltip_);

        if (this.enabledB_?.good()) {
            let val = this.enabledB_?.get();
            if (val instanceof BoolWithExplanation) {
                enabled = val.val();
                message = val.reason();
            } else if (typeof val === "boolean") {
                enabled = val;
            }
            else {
                enabled = this.messageB_?.good() || false;
            }
        }

        if (this.messageB_?.good()) {
            let val = this.messageB_?.get();

            if (typeof(val) === "string" || val instanceof Element) {
                append(this.tooltip_, val );
            }
            else if (val instanceof Message) {
                append(this.tooltip_, val.resolve().toString());
            }
        }
        // todo handle not ready and errors perhaps we will do it with a wrapper

    }

    private detach_() {
        removeNode(this.tooltip_);
    }

    attachStruct(data: OptionsType) {
        let util = new Util(this.scope_.getFrp());
        this.enabledB_ = util.toBehaviour(data.enabled);
        this.messageB_ = util.toBehaviour((data as OptionsType2)?.message);
        this.helper_.attach(this.enabledB_, this.messageB_);
    }
}


/**
 * This class will but the correct tooltip on the component
 * including not ready, and error messaged
 * @constructor
 * @param {!recoil.ui.WidgetScope} widgetScope gui scope
 * @param {!goog.ui.Component|!Element} component when this is no longer visible updates will longer fire and memory will be cleaned up
 * @param {Element=} opt_element
 * @param {function(boolean)=} opt_setEnabled alternate way of enabling
 */

export class TooltipHelper {
    private behaviours_: BehaviourList;
    private setEnabled_: ((enabled: boolean) => void) | undefined;
    private enabledB_: Behaviour<BoolWithExplanation>|null = null;
    private element_: Element;
    private helper_: WidgetHelper;
    private tooltip_: null;

    constructor(widgetScope:WidgetScope, element:Element, opt_setEnabled?:(enabled:boolean)=> void) {
        this.behaviours_ = [];
        this.setEnabled_ = opt_setEnabled;
        this.element_ = element;
        this.helper_ = new WidgetHelper(widgetScope, element, this, this.update_, this.detach_);
    }

    /**
     * @param {!recoil.frp.Behaviour<!recoil.ui.BoolWithExplanation>} enabledB
     * @param {...recoil.ui.ComponentWidgetHelper} var_helpers
     */

    attach(enabledB: Behaviour<BoolWithExplanation>, ...var_helpers: WidgetHelper[]) {

        this.enabledB_ = enabledB;
        this.behaviours_ = [enabledB];
        for (let helper of var_helpers) {
            for (let b of helper.behaviours) {
                this.behaviours_.push(b);
            }
        }
        this.helper_.attach.apply(this.helper_, this.behaviours_);

    }

    private update_(helper:WidgetHelper) {
        let tooltip = null;
        let enabled = false;
        if (!this.enabledB_) {
            return;
        }
        if (helper.isGood()) {
            var reason = this.enabledB_.get().reason();
            tooltip = reason === null ? null : reason.toString();
            enabled = this.enabledB_.get().val();

        } else {
            var errors = this.helper_.errors();
            if (errors.length > 0) {
                tooltip = Messages.join(errors).toString();
            }
            enabled = false;
        }
        if (tooltip && tooltip.trim() === '' || tooltip === undefined || tooltip === '') {
            tooltip = null;
        }


        if (this.tooltip_) {
            this.tooltip_.detach(this.element_);
            this.tooltip_.dispose();
        }
        if (tooltip === null) {
            this.tooltip_ = null;
        } else {
            this.tooltip_ = new Tooltip(this.element_, tooltip);
//        this.tooltip_.setEnabled(enabled);
        }
        if (this.setEnabled_) {
            this.setEnabled_(enabled);
        } else {
            setProperties(this.element_, {disabled: !enabled});
        }
    };


    private detach_() {
        if (this.tooltip_) {
            this.tooltip_.detach(this.element_ || (this.component_ instanceof Element ? this.component_ : this.component_.getElement()));
            this.tooltip_.dispose();
            this.tooltip_ = null;
        }
    }

}