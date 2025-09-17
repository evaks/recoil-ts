import {Column, LabelType} from "./column.ts";
import { TableCell} from "../../../structs/table/table.ts";
import {ColumnKey} from "../../../structs/table/columnkey.ts";
import {BehaviourOrType, extend, StructType} from "../../../frp/struct.ts";
import {WidgetScope} from "../widgetscope.ts";
import {Behaviour} from "../../../frp/frp.ts";
import {Label} from "../label.ts";
import {TableCellHelper} from "../../../frp/table.ts";

export class LabelColumn<Type = string> implements Column {

    private readonly key_: ColumnKey<any>;
    private readonly name_: LabelType;
    private readonly options_: BehaviourOrType<StructType>;

    constructor(key: ColumnKey<Type>, name: LabelType, opt_meta: BehaviourOrType<StructType>) {
        this.key_ = key;
        this.name_ = name;
        this.options_ = opt_meta || {};
    }

    /**
     * adds all the meta information that a column should need
     * this should at least include cellWidgetFactory
     * other meta data can include:
     *   headerDecorator
     *   cellDecorator
     * and anything else specific to this column such as options for a combo box
     */
    getMeta(curMeta: StructType): StructType {
        return {
            name: this.name_,
            cellWidgetFactory: LabelColumn.defaultWidgetFactory_,
            ...this.options_, ...curMeta
        };
    }

    private static defaultWidgetFactory_<Type>(scope: WidgetScope, cellB: Behaviour<TableCell<Type>>):Label {
        let frp = scope.getFrp();
        let widget = new Label(scope);
        let value = TableCellHelper.getValue(frp, cellB);

        let metaData = TableCellHelper.getMeta(frp, cellB);
        widget.attachStruct(extend(frp, metaData, {name: value}) as Behaviour<any>);
        return widget;
    }
    static readonly meta = {cellWidgetFactory: LabelColumn.defaultWidgetFactory_};
    static readonly defaultWidgetFactory = LabelColumn.defaultWidgetFactory_;
    getKey(): ColumnKey<Type> {
        return this.key_;
    }
}
