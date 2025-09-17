import {Widget} from "./widget.ts";
import {WidgetScope} from "./widgetscope.ts";
import {createDom, getElement, setElementShown} from "../dom/dom.ts";
import {TagName} from "../dom/tags.ts";
import {BoolWithExplanation} from "../booleanwithexplain.ts";
import {getGroup, StandardOptions, StandardOptionsType} from "../frp/util.ts";
import {WidgetHelper} from "../widgethelper.ts";
import { isEqual } from "../../util/object.ts";
import {AttachType} from "../../frp/struct.ts";
import {Behaviour} from "../../frp/frp.ts";
import {Label} from "./label.ts";
import {EventType} from "../dom/eventtype.ts";
import {EventHandler} from "../eventhelper.ts";
import {EnabledTooltipHelper} from "../tooltiphelper.ts";

export type RendererFn<Type> =  (obj:Type, valid:boolean, enabled:BoolWithExplanation)=>Element;

export class SelectorWidget<Type> extends Widget {

    private configB_?: Behaviour<{
        name: string,
        value: Type,
        list: Type[],
        enabledItems: BoolWithExplanation[],
        renderer: RendererFn<Type>,

    } & StandardOptionsType>
    private valueB_?: Behaviour<Type>;
    private readonly selected_: HTMLDivElement;
    private readonly options_: HTMLDivElement;
    private readonly helper_: WidgetHelper;
    private eventHandler_: EventHandler;
    private readonly  readonly_ : HTMLDivElement;
    private readonly enabledHelper_: EnabledTooltipHelper;

    constructor(scope: WidgetScope) {
        super(scope, createDom(TagName.DIV, {class: 'recoil-select'}));
        this.selected_ = createDom(TagName.DIV, {class: 'recoil-select-selected'});
        this.options_ = createDom(TagName.DIV, {class: 'recoil-select-options'});
        this.readonly_ = createDom(TagName.DIV, {class: 'recoil-select-readonly'});

        const frp = scope.getFrp();

        // todo test removing and then menu hide

        this.getElement().appendChild(this.readonly_);
        this.getElement().appendChild(this.selected_);
        this.getElement().appendChild(this.options_);

        this.selected_.addEventListener(EventType.CLICK, () => {
            this.options_.style.display = this.options_.style.display === "block" ? "none" : "block";
        });
        this.eventHandler_ = new EventHandler();
        this.helper_ = new WidgetHelper(scope, this.getElement(), this, this.updateState_, {detach:() => this.eventHandler_.unlisten(), attach:this.attachListeners_});
        this.enabledHelper_ = new EnabledTooltipHelper(scope, this.selected_);
    }

    private attachListeners_() {
        this.eventHandler_.listen(this.options_,EventType.CLICK, (e:MouseEvent) => {
            if (!e.target) {
                return;
            }

            const option = e.target.closest(".option");
            if (option) {
                this.selected.innerHTML = option.innerHTML; // copy arbitrary HTML
                selected.dataset.value = option.dataset.value;
                options.style.display = "none";
                console.log("Selected value:", option.dataset.value);
            }
        });
        this.eventHandler_.listen(document, EventType.CLICK, (e:MouseEvent) => {
            if (!select.contains(e.target)) {
                options.style.display = "none";
            }
        });

    }

    /**
     * this has to come before options
     *
     * @param {?} obj
     * @param {boolean} valid
     * @param {!recoil.ui.BoolWithExplanation} enabled
     * @return {!Element}
     * @constructor
     */
    static RENDERER<Type extends number | string>(obj: Type, valid: boolean, enabled: BoolWithExplanation): Element {
        if (typeof (obj) === 'number') {
            obj = '' + obj;
        }
        if (enabled && enabled.reason && enabled.reason()) {
            if (enabled.reason()!.toString().trim() !== '') {
                return createDom('div', {
                    disabled: true,
                    class: valid ? 'recoil-select-disabled' : 'recoil-error',
                    title: enabled.reason()!.toString()
                }, obj);
            }
        }

        return createDom(TagName.DIV, valid ? undefined : 'recoil-error', obj);

    }

    /**
     * list of functions available when creating a selectorWidget
     */
// recoil.ui.widgets.SelectorWidget.options =  recoil.util.Options('value' , {'!list': [1, 2, 3]}, {'renderer' : recoil.util.widgets.RENDERER},
//     { renderers :['button', 'menu']}, 'enabledItems');
    static options = StandardOptions({
        'name': '',
        'renderer': SelectorWidget.RENDERER,
        'enabledItems': [],
    }, 'value', 'list');


    /**
     * @param {!Object| !recoil.frp.Behaviour<Object>} options
     */
    attachStruct(options:AttachType<{
        name: string;
        renderer: RendererFn<Type>,
        enabledItems: BoolWithExplanation[] // matches list index
    } & StandardOptionsType>) {
        let frp = this.helper_.getFrp();
        let bound = SelectorWidget.options.bind(frp, options);

        // let optionsB = structs.flatten(frp, options);

        // let bound = recoil.ui.widgets.SelectorWidget.options.bind(optionsB);
        // this.nameB_ =  bound.name();

        this.configB_ = bound[getGroup]([
            bound.name, bound.editable, bound.enabled,
            bound.renderer,
            bound.list, bound.enabledItems,  bound.tooltip]);
        this.valueB_ = bound.value();

        this.helper_.attach(this.configB_, this.valueB_);
        const key = recoil.util.object.uniq();

        this.readOnlyWidget_.attachStruct(frp.liftB(
            function (val, renderer) {
                let formatter = function (v) {
                    try {
                        return renderer(v, true, false);
                    } catch (e) {
                        return '';
                    }
                };
                return {
                    name: val,
                    formatter: formatter
                };

            }, this.valueB_, this.rendererB_));

        let me = this;
        this.changeHelper_.listen(this.scope_.getFrp().createCallback(function (v) {

            let idx = v.target.getSelectedIndex();
            let list = me.listB_.get();
            if (idx < list.length) {
                me.valueB_.set(list[idx]);
            }

        }, this.valueB_, this.listB_));
        this.enabledHelper_.attach(
            /** @type {!recoil.frp.Behaviour<!recoil.ui.BoolWithExplanation>} */ (this.enabledB_),
            this.helper_);
    }

    /**
     * @template T
     * @param {function(T,boolean, recoil.ui.BoolWithExplanation) : string} renderer
     * @param {Object} val
     * @param {boolean} valid
     * @param {recoil.ui.BoolWithExplanation} enabled
     * @return {goog.ui.MenuItem}
     * @private
     */
    private static createMenuItem_<T>(renderer: RendererFn<T>, val:T, valid, enabled) {
        let item = new goog.ui.MenuItem(renderer(val, valid, enabled), {
            value: val,
            valid: valid,
            enabled: enabled,
            renderer: renderer
        });
        if (enabled && enabled.val && !enabled.val()) {
            item.setEnabled(false);
        }
        return item;
    };

    /**
     *
     * @param {recoil.ui.WidgetHelper} helper
     * @private
     */
    private updateState_(helper: WidgetHelper) {

        if (helper.isGood()) {
            // console.log('in selectWidget updateState');
            let list = this.listB_.get();
            let sel = this.selector_;
            let enabledItems = this.enabledItemsB_.get();
            //sel.setEnabled(this.enabledB_.get().val());
            sel.setVisible(this.editableB_.get());
            this.readOnlyWidget_.getComponent().setVisible(!this.editableB_.get());
            let renderer = this.rendererB_.get();


            for (let i = sel.getItemCount() - 1; i >= 0; i--) {
                sel.removeItemAt(i);
            }

            let found = -1;
            if (list) {
                for (let i = 0; i < list.length; i++) {
                    let val = list[i];
                    let enabled = enabledItems.length > i ? enabledItems[i] : BoolWithExplanation.TRUE;
                    sel.addItem(SelectorWidget.createMenuItem_(renderer, val, true, enabled));
                    if (isEqual(this.valueB_?.get(), val)) {
                        found = i;
                    }
                }
                if (found === -1) {
                    sel.addItem(SelectorWidget.createMenuItem_(renderer, this.valueB_.get(), false, BoolWithExplanation.FALSE));
                    found = list.length;
                }

                sel.setSelectedIndex(found);
            }
        }

    }
}
