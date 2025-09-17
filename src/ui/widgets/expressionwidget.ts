import {Widget} from "./widget.ts";
import {WidgetScope} from "./widgetscope.ts";
import {InputWidget} from "./input.ts";
import {StandardOptions} from "../frp/util.ts";
import {StringConverter} from "../../converters/stringconverter.ts";
import {makeStructColumn} from "./table/column.ts";
import { UnconvertType } from "../../converters/typeconverter.ts";
import {Messages} from "../messages.ts";
import {extend} from "../../frp/struct.ts";

/**
 *
 * @param {!recoil.ui.WidgetScope} scope
 * @constructor
 * @implements {recoil.ui.Widget}
 */
export class ExprWidget extends Widget {
    private input_:InputWidget;

    constructor(scope: WidgetScope) {
        let input = new InputWidget(scope);
        super(scope, input.getElement())
        this.input_ = input;
        let frp = scope.getFrp();
        this.erroredB_ = frp.createB(false);

        this.containerDiv_ = goog.dom.createDom('div');


    }


    /**
     * attachable behaviours for widget
     */
    static options = StandardOptions('value', {
        decimalPlaces: null
    });

    /**
     *
     * @param {!Object| !recoil.frp.Behaviour<Object>} options
     */
    attachStruct(options) {
        let frp = this.scope_.getFrp();

        let bound = ExprWidget.options.bind(frp, options);

        let expConverterB = frp.liftB(function (dp) {
            return new ExprConverter(dp);
        }, bound.decimalPlaces());

        let defConverter = new ExprFocusStringConverter();

        let modOptions = extend(
            frp, options,
            {
                converter: Chooser.if(
                    this.input_.getFocus(), defConverter, expConverterB)
            });

        this.input_.attachStruct(modOptions);
    }
}

export class ExprConverter implements StringConverter<string> {
    private decimalPlaces_: number | undefined;

    constructor(decimalPlaces?: number) {
        this.decimalPlaces_ = decimalPlaces;
    }

    /**
     * @param {string} val
     * @return {string}
     */
    convert(val: string | undefined) {
        if (val == undefined) {
            return '';
        }
        let res = ExpParser.instance.eval(val);
        if (res == undefined) {
            return val;
        }

        return this.decimalPlaces_ == null ? res + '' : res.toFixed(this.decimalPlaces_) + '';
    }


    /**
     * @param {string} val
     * @return {{error : recoil.ui.message.Message, value : string, supported: (undefined|boolean), settable: (undefined|boolean)}}
     */
    unconvert(val: string | undefined) {
        let err = null;
        let res = recoil.util.ExpParser.instance.eval(val);
        if (res == undefined || isNaN(res)) {
            err = recoil.ui.messages.NOT_APPLICABLE.toString();
        }

        return {error: null, supported: false, value: val};
    }


}


/**
 * @constructor
 * @implements {recoil.converters.StringConverter<string>}
 */

export class ExprFocusStringConverter implements StringConverter<string> {
    convert(val: string): string {
        return val != undefined ? val : '';   }
    unconvert(val: string): UnconvertType<string> {
        let res = ExpParser.instance.eval(val);
        let err = null;

        if (res == null) {
            return {error:Messages.INVALID_EXPRESSION, value:val, settable:true};

        }
        return {value: val};
    }

}

/**
 * @implements {recoil.ui.widgets.table.Column}
 * @template T
 * @constructor
 * @param {!recoil.structs.table.ColumnKey} key
 * @param {!recoil.ui.message.Message|string} name
 * @param {Object=} opt_meta
 */
export const ExprColumns = makeStructColumn(ExprWidget);
