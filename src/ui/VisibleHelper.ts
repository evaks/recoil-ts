import {WidgetScope} from "./widgets/widgetscope.ts";
import {WidgetHelper} from "./widgethelper.ts";
import {setElementShown} from "./dom/dom.ts";
import {Behaviour} from "../frp/frp.ts";

export class VisibleHelper {
    private readonly show_: Set<HTMLElement>;
    private readonly hide_: Set<HTMLElement>;
    private readonly notGood_: Set<HTMLElement>;
    private helper_: WidgetHelper;
    private visibleB_?: Behaviour<boolean>;

    constructor(widgetScope: WidgetScope, container: Element, showElements?: HTMLElement[], hideElements?: HTMLElement[], notGoodElements?: HTMLElement[]) {
        this.show_ = new Set(showElements || []);
        this.hide_ = new Set(hideElements || []);
        this.notGood_ = new Set(notGoodElements || []);

        const allElSets = [this.show_, this.hide_, this.notGood_]
        for (let els of allElSets) {
            for (let el of els) {
                setElementShown(el, false)
            }
        }

        this.helper_ = new WidgetHelper(
            widgetScope, container, this,
            (helper: WidgetHelper) => {
                let showList = this.notGood_;

                if (helper.isGood()) {
                    showList = this.visibleB_?.get() ? this.show_ : this.hide_;
                }
                for (let els of allElSets) {
                    for (let el of els) {
                        setElementShown(el, showList.has(el))
                    }
                }
            });
    }

    attach(visible: Behaviour<boolean>) {
        this.visibleB_ = visible;
        this.helper_.attach(this.visibleB_);
    }
}