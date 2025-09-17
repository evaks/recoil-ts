import {extend, StructBehaviourOrType, StructType} from "../../../frp/struct";
import {WidgetScope} from "../widgetscope";
import {Behaviour} from "../../../frp/frp";
import {Widget} from "../widget";
import {Column} from "./column";
import {ColumnKey} from "../../../structs/table/columnkey";
import {Checkbox} from "../checkbox";
import {TableCell} from "../../../structs/table/table";
import {TableCellHelper} from "../../../frp/table";

/**
 *
 * @param {recoil.structs.table.ColumnKey} key
 * @param {string} name
 * @param {(recoil.frp.Behaviour<Object>|Object)=} opt_options
 * @implements {recoil.ui.widgets.table.Column}
 * @template T
 * @constructor
 */
export class BooleanColumn implements Column {
    private readonly key_: ColumnKey<boolean>;
    private readonly name_:string;
    private readonly options_:StructBehaviourOrType;

    constructor(key:ColumnKey<boolean>, name: string, opt_options: StructBehaviourOrType) {
        this.key_ = key;
        this.name_ = name;
        this.options_ = opt_options || {};
    }

    private static defaultWidgetFactory_(scope: WidgetScope, cellB: Behaviour<TableCell<boolean>>): Widget {
        let frp = scope.getFrp();
        let widget = new Checkbox(scope);
        let value = TableCellHelper.getValue(frp, cellB);
        let meta = TableCellHelper.getMeta(frp, cellB);
        widget.attachStruct(extend(frp, meta, {value: value}) as Behaviour<any>);
        return widget;
    }

    /**
     * adds all the meta information that a column should need
     * this should at least include cellWidgetFactory
     * other meta data can include:
     *   headerDecorator
     *   cellDecorator
     * and anything else specific to this column such as options for a combo box
     *
     * @param curMeta
     */
    getMeta(curMeta: StructType): StructType {
        return {
            name: this.name_,
            cellWidgetFactory: BooleanColumn.defaultWidgetFactory_,
            ...this.options_,
            ...curMeta
        };
    }

    /**
     * @return
     */
    getKey(): ColumnKey<boolean> {
        return this.key_;
    }
}