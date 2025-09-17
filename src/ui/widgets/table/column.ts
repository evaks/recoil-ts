import {extend, StructType} from "../../../frp/struct";
import {ColumnKey} from "../../../structs/table/columnkey";
import {CellWidget, Widget} from "../widget";
import {TableCell} from "../../../structs/table/table";
import {WidgetScope} from "../widgetscope";
import {AttachableWidget} from "../../frp/util";
import {Message} from "../../message";
import {Behaviour} from "../../../frp/frp";
import {TableCellHelper} from "../../../frp/table";

export type CellWidgetFactory = (scope: WidgetScope, cellB:Behaviour<TableCell<any>>) => AttachableWidget;
export type WidgetConstructorType = {new (scope:WidgetScope, opts?:StructType):AttachableWidget};
export type CellWidgetConstructorType<T> = {new (scope:WidgetScope, opts?:StructType):CellWidget<T>};
export type ColumnConstructorType = {new (column: ColumnKey<any>, name: string | Message | Element, opt_meta?: StructType):Column};
export type LabelType = string|Message|Node;
/**
 * @interface
 * @template T
 */
export interface Column {

    /**
     * adds all the meta information that a column should need
     * this should at least include cellWidgetFactory
     * other meta data can include:
     *   headerDecorator
     *   cellDecorator
     * and anything else specific to this column such as options for a combo box
     *
     */
    getMeta(curMeta: StructType): StructType;

    /**
     * @return {recoil.structs.table.ColumnKey}
     */
    getKey(): ColumnKey<any>;

}
/**
 * a utility to make a column that attaches to a widget
 * that has the interface of
 * create = new Widget(scope)
 * attachStruct = function ({value:*,...})
 * @template T
 * @param {function (new:recoil.ui.Widget,T,?):undefined} widgetCons
 * @param {?=} opt_options
 * @return {function(!recoil.structs.table.ColumnKey,(string|!recoil.ui.message.Message|!Element),Object=)}
 */
export function makeStructColumn(widgetCons: WidgetConstructorType, opt_options?:StructType): ColumnConstructorType  {
    const factory = (scope:WidgetScope, cellB:Behaviour<TableCell<any>>) => {
        let frp = scope.getFrp();
        let widget = new widgetCons(scope, opt_options);
        let value = TableCellHelper.getValue(frp, cellB);


        let metaData = TableCellHelper.getMeta(frp, cellB);
        widget.attachStruct(extend(frp, metaData, {value: value}));
        return widget;
    };
    const res = class  implements Column{

        private key_: ColumnKey<any>;
        private name_: string | Message | Element;
        private meta_: StructType;

        constructor(column: ColumnKey<any>, name: string | Message | Element, opt_meta?: StructType) {
            this.key_ = column;
            this.name_ = name;
            this.meta_ = opt_meta || {};
        }

        getMeta(curMeta: StructType): StructType {
            let meta = {
                name: this.name_,
                cellWidgetFactory: factory
            };
            return {...meta, ...this.meta_, ...curMeta};
        }


        /**
         * @return {recoil.structs.table.ColumnKey}
         */
        getKey() {
            return this.key_;
        }
    }

    return res;
}


/**
 * a utility to make a column that attaches to a widget
 * that has the interface of
 * create = new Widget(scope)
 * attachStruct = function ({value:*,...})
 * @template T
 * @param {function (new:recoil.ui.CellWidget,T,?):undefined} widgetCons
 * @param {?=} opt_extra
 * @return {function(!recoil.structs.table.ColumnKey,string)}
 */
 export function makeCellColumn<T> (widgetCons:CellWidgetConstructorType<T>, opt_extra?:any):ColumnConstructorType {
    let factory = function(scope:WidgetScope, cellB:Behaviour<TableCell<any>>) {
        let frp = scope.getFrp();
        let widget = new widgetCons(scope, opt_extra);
        let newCellB = frp.liftBI<TableCell<T>>(
            function(v) {
                return v;
            },
            (v:TableCell<T>)=> {
                let meta = {...cellB.get().getMeta(), ...v.getMeta()};

                let res = new TableCell(v.getValue(), meta);
                cellB.set(res);
            }, cellB);
        widget.attachCell(newCellB);
        return widget;
    };
    /**
     * @constructor
     * @param {!recoil.structs.table.ColumnKey} column
     * @param {string} name
     * @param {Object=} opt_meta
     * @implements {recoil.ui.widgets.table.Column}
     */
    let res = class implements Column {
        private key_: ColumnKey<T>;
        private name_: string | Message | Element;
        private meta_: StructType;

        constructor(column: ColumnKey<T>, name: string | Message | Element, opt_meta?: StructType) {

            this.key_ = column;
            this.name_ = name;
            this.meta_ = opt_meta || {};
        }


        getMeta(curMeta: StructType) {
            let meta = {
                name: this.name_,
                cellWidgetFactory: factory,
                ...this.meta_,
                ...curMeta
            };
            return meta;
        }
        getKey(): ColumnKey<T> {
            return this.key_;
        }
    }
    return res;
}
