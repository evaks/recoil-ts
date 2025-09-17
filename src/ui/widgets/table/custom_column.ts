import {CellWidgetFactory, Column} from "./column";
import {ColumnKey} from "../../../structs/table/columnkey";
import {StructType} from "../../../frp/struct";

/**
 * @implements {recoil.ui.widgets.table.Column}
 * @template T
 * @constructor
 * @param {recoil.structs.table.ColumnKey} key
 * @param {string} name
 * @param {function(!recoil.ui.WidgetScope,!recoil.frp.Behaviour<recoil.structs.table.TableCell>): !recoil.ui.Widget} factory
 *
 */
export class CustomColumn implements Column {
    private readonly key_: ColumnKey<any>;
    private readonly factory_: CellWidgetFactory;
    private readonly name_: string;


    constructor(key: ColumnKey<any>, name: string, factory: CellWidgetFactory) {

        this.key_ = key;
        this.name_ = name;
        this.factory_ = factory;
    }

    /**
     * adds all the meta information that a column should need
     * this should at least include cellWidgetFactory
     * other metadata can include:
     *   headerDecorator
     *   cellDecorator
     * and anything else specific to this column such as options for a combo box
     *
     * @param {Object} curMeta
     * @return {Object}
     */
    getMeta(curMeta: StructType): StructType {
        return {
            name: this.name_,
            cellWidgetFactory: this.factory_
            , ...curMeta
        };

    }
    getKey ():ColumnKey<any> {
        return this.key_;
    }
}
