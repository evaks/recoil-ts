import {Behaviour} from "../frp/frp";
import { WidgetHelper } from "./widgethelper";
import {WidgetScope} from "./widgets/widgetscope";
import * as classlist  from "./dom/classlist";
import {append, createDom, setProperties} from "./dom/dom";
import {TagName} from "./dom/tags";
import {EventType} from "./dom/eventType";
import {EventHelper, Unlistener} from "./eventhelper";
import {Message} from "./message";
import {DomObserver} from "./domobserver";
import {Tooltip} from "./tooltip";
/**
 * @constructor
 * @param {!recoil.ui.WidgetScope} scope gui scope
 */
class Html {
    private scope_: WidgetScope;

    constructor(scope: WidgetScope) {
        this.scope_ = scope;
    }

    classes(element: Element, classesB: Behaviour<string[]>):WidgetHelper {
        let helper = new WidgetHelper(this.scope_, element, null, ()=> {
            if (classesB.good()) {
                classlist.setAll(element, classesB.get());
            }
        });
        helper.attach(classesB);
        return helper;
    }

    enableClass(element: HTMLElement, cls: string, enabledB: Behaviour<boolean>):WidgetHelper {
        let helper = new WidgetHelper(this.scope_, element, null, function () {
            classlist.enable(element, cls, enabledB.good() && enabledB.get());
        });
        helper.attach(enabledB);
        return helper;
    }

    /**
     * @param {(Object|Array<string>|string)=} opt_options
     * @param {...(Object|string|Array|NodeList)} var_args Further DOM nodes or
     *     strings for text nodes. If one of the var_args is an array or NodeList,
     *     its elements will be added as childNodes instead.
     * @return {!Element}
     */
    createClassDiv(classesB:Behaviour<string[]>, opt_attributes?: (Object | string[] | string | null), ...var_args: (Object | string | any[] | null| NodeList)[]):Element
    {
        let div = createDom('div', opt_attributes, ...var_args);
        this.classes(div, classesB);
        return div;
    }

    appendDiv(parent:Node, opt_attributes?: (Object | string[] | string | null), ...var_args: (Object | string | any[] | null| NodeList)[]) :Element
    {
        let res = createDom(TagName.DIV, opt_attributes, ...var_args);
        append(parent, res);
        return res;
    }

    /**
     * @param {!Node} parent
     * @param {!recoil.frp.Behaviour<string>} classesB
     * @param {(Object|Array<string>|string)=} opt_options
     * @param {...(Object|string|Array|NodeList)} var_args Further DOM nodes or
     *     strings for text nodes. If one of the var_args is an array or NodeList,
     *     its elements will be added as childNodes instead.
     * @return {!Element}
     */
    appendClassDiv(parent:Node, classesB:Behaviour<string[]>,opt_attributes?: (Object | string[] | string | null), ...var_args: (Object | string | any[] | null| NodeList)[]):Element
    {
        let el = this.createClassDiv(classesB, opt_attributes, ...var_args);
        append(el, arguments);
        return el;
    }

    /**
     * WARNING do not use on any data that can be supplied by the user
     */
    innerHtml(element:Element, innerHtmlB:Behaviour<string>):WidgetHelper
    {
        let l:Unlistener|null = null;

        let helper = new WidgetHelper(this.scope_, element, null, function () {
            if (l) {
                l.unlisten();
                l = null;
            }
            if (innerHtmlB.good()) {
                element.innerHTML = innerHtmlB.get();
            } else if (innerHtmlB.metaGet().errors().length > 0) {
                let errors = innerHtmlB.metaGet().errors();
                l = EventHelper.listen(element,EventType.CLICK, function () {
                    for (let i = 0; i < errors.length; i++) {
                        console.error(errors[i]);
                    }
                });
                element.innerHTML = innerHtmlB.metaGet().errors().join(',');
            }
        });
        helper.attach(innerHtmlB);
        return helper;
    }

    /**
     * @param {!Element} element
     * @param {!recoil.frp.Behaviour<string>} innerTextB
     * @return {!WidgetHelper}
     */
    innerText(element:HTMLElement, innerTextB:Behaviour<string>):WidgetHelper
    {
        let helper = new WidgetHelper(this.scope_, element, null, function () {
            if (innerTextB.good()) {
                element.innerText = innerTextB.get();
            } else if (innerTextB.metaGet().errors().length > 0) {
                element.innerText = innerTextB.metaGet().errors().join(',');
            }
        });
        helper.attach(innerTextB);
        return helper;
    }

    createInnerHtmlDiv(innerHtmlB:Behaviour<string>, opt_attributes?: (Object | string[] | string | null), ...var_args: (Object | string | any[] | null| NodeList)[]):Element
    {
        let div = createDom(TagName.DIV, opt_attributes, ...var_args);
        this.innerHtml(div, innerHtmlB);
        return div;
    }

    createInnerHtmlDom(type: TagName, innerHtmlB:Behaviour<string>, opt_attributes?: (Object | string[] | string | null), ...var_args: (Object | string | any[] | null| NodeList)[]):Element
    {
        let div = createDom(type, opt_attributes, ...var_args);
        this.innerHtml(div, innerHtmlB);
        return div;
    }


    /**
     * @param {!Node} parent
     * @param {!recoil.frp.Behaviour<?string>|!recoil.frp.Behaviour<string>} innerHtmlB
     * @param {(Object|Array<string>|string)=} opt_options
     * @param {...(Object|string|Array|NodeList)} var_args Further DOM nodes or
     *     strings for text nodes. If one of the var_args is an array or NodeList,
     *     its elements will be added as childNodes instead.
     * @return {!Element}
     */
    appendInnerHtmlDiv(parent:Node, innerHtmlB:Behaviour<string>,opt_attributes?: (Object | string[] | string | null), ...var_args: (Object | string | any[] | null| NodeList)[]):Element
    {
        let res = this.createInnerHtmlDiv(innerHtmlB, opt_attributes, ...var_args);
        append(parent, res);
        return res;
    }



    /**
     * sets the display to none/undefined depending on {@code showB}
     * @param {!Element} element
     * @param {!recoil.frp.Behaviour<boolean>} showB
     * @return {!WidgetHelper}
     */
    show(element:HTMLElement, showB:Behaviour<boolean>): WidgetHelper
    {
        let orig:string|undefined = element.style.display;
        orig = orig === 'none' ? undefined : orig;
        let helper = new WidgetHelper(this.scope_, element, null, function () {
            let show = showB.good() && showB.get();
            element.style.display = show ? orig  as string: 'none';
        });
        helper.attach(showB);

        return helper;
    }
    /**
     * sets the display to none/undefined depending on {@code showB}
     * @param {!Array<!Element>} elements
     * @param {!recoil.frp.Behaviour<boolean>} showB
     * @return {!WidgetHelper}
     */
    showElements(elements:Element[], showB: Behaviour<boolean>)
    {

        let origs:(string|undefined)[] = elements.map((element: Element): string => {
            return (element as HTMLElement).style.display;
        });
        origs = origs.map((orig: string|undefined)=> {
            return orig === 'none' ? undefined : orig;
        });
        let helper = new WidgetHelper(this.scope_, elements[0], null, function () {
            var show = showB.good() && showB.get();
            elements.forEach(function (element, idx) {
                (element as HTMLElement).style.display = show ? (origs[idx] ||'') : 'none';
            });
        });
        if (elements.length > 0) {
            helper.attach(showB);
        }

        return helper;
    }

    /**
     * sets the disabled field, I have called it enabled because I don't like
     * negative logic in code
     */
    enabled(element:HTMLButtonElement|HTMLFieldSetElement|HTMLInputElement|HTMLOptionElement|HTMLOptGroupElement|HTMLTextAreaElement, enabledB:Behaviour<boolean>):WidgetHelper
    {
        let helper = new WidgetHelper(this.scope_, element, null, function () {
            let disabled = !(enabledB.good() && enabledB.get());
            element.disabled = disabled;
        });
        helper.attach(enabledB);
        return helper;
    }

    createShowDiv(showB:Behaviour<boolean>,opt_attributes?: (Object | string[] | string | null), ...var_args: (Object | string | any[] | null| NodeList)[]):Element
    {
        var div = this.createDom_(1, 'div', arguments);
        this.show(div, showB);
        return div;
    }


    appendShowDiv(parent, showB,  opt_attributes?: (Object | string[] | string | null), ...var_args: (Object | string | any[] | null| NodeList)[]):Element


{
        return this.append_(this.createShowDiv, arguments);
    }
    onClick(element, callbackB)
    {
        this.onEvent(element, goog.events.EventType.CLICK, callbackB);
    }


    /**
     * @param {!Element} element
     * @param {!recoil.frp.Behaviour<?>} callbackB
     */
    onDragStart(element, callbackB)
    {
        this.onEvent(element, EventType.DRAGSTART, callbackB);
    }

    onDrag(element:Element, callbackB)
    {
        this.onEvent(element, EventType.DRAG, callbackB);
    }
    onDragEnd(element:Element, callbackB)
    {
        this.onEvent(element, EventType.DRAGEND, callbackB);
    }


    onDragEnter(element:Element, callbackB)
    {
        this.onEvent(element, EventType.DRAGENTER, callbackB);
    }
    onDragOver(element:Element, callbackB:Behaviour<any>)
    {
        this.onEvent(element, EventType.DRAGOVER, callbackB);
    }

    onDragLeave(element:Element, callbackB:Behaviour<any>)
    {
        this.onEvent(element, EventType.DRAGLEAVE, callbackB);
    }

    onDrop(element:Element, callbackB:Behaviour<any>)
    {
        this.onEvent(element, EventType.DROP, callbackB);
    }

    onEvent(element:Element, event:EventType, callbackB:Behaviour<any>)
    {
        let helper = new WidgetHelper(this.scope_, element, this, function (helper) {

        });
        var frp = this.scope_.getFrp();
        element.addEventListener(event, (e:Event) => {
            // e.stopPropagation();
            // e.preventDefault();
            frp.accessTrans(() => {
                if (callbackB.good()) {
                    callbackB.set(e);
                }
            }, callbackB);
        });
        helper.attach(callbackB);

    }


    /**
     * @param {!Element} element
     * @param {string|!recoil.ui.message.Message} tooltip
     */
    static tooltip(element, tooltip:string|Message) {
        let component = null;
        DomObserver.instance.listen(element, (b:boolean)=> {
            if (b) {
                if (!component) {
                    component = new Tooltip(element, tooltip.toString());
                }
            } else {
                if (component) {
                    component.dispose();
                    component = null;
                }
            }
        });
    }

    /**
     * @param {!Element} element
     * @param {!recoil.frp.Behaviour<recoil.ui.message.Message>|recoil.ui.message.Message} tooltip
     */
    tooltip(element, tooltip)
    {
        var tooltipEl = null;
        var tooltipB = new recoil.frp.Util(this.scope_.getFrp()).toBehaviour(tooltip);
        var helper = new WidgetHelper(this.scope_, element, this, function (helper) {

            if (tooltipEl) {
                tooltipEl.dispose();
            }
            tooltipEl = null;
            if (tooltipB.good() && tooltipB.get()) {
                tooltipEl = new goog.ui.Tooltip(element, tooltip.toString());
            }

        }, function () {
            if (tooltipEl) {
                tooltipEl.dispose();
            }
            tooltipEl = null;
        });
        helper.attach(tooltipB);
    }
}
