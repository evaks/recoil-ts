import {FLATTEN, NO_FLATTEN} from "../../frp/struct";
import {WidgetScope} from "./widgetscope";
import {Behaviour} from "../../frp/frp";
import {TableCell} from "../../structs/table/table";

export abstract class Widget<T extends Element = Element> {
    readonly [FLATTEN] =  NO_FLATTEN;
    protected readonly  scope_: WidgetScope;
    protected readonly  element_: T;
    constructor(scope: WidgetScope, element:T) {
        this.scope_ = scope;
        this.element_ = element;
    }
    getElement():T {
        if (!this.element_) {
            throw new Error("No element found please set in constructor or override function.");
        }
        return this.element_;
    }
}

export abstract class CellWidget<T> extends Widget {
    constructor(scope: WidgetScope, opt_element:Element) {
        super(scope, opt_element);
    }
    abstract attachCell(cellB:Behaviour<TableCell<T>>):undefined;
}

