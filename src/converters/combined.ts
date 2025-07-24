import {TypeConverter, UnconvertType} from "./typeconverter";


/**
 * this uses all the provided converters validate uncovert, if any fail
 * then the error is returned, note it is they do not fail then it assumed that any
 * converter will do
 */
export class And<From,To> implements TypeConverter<From, To> {
    private converters_: TypeConverter<From, To>[];
    constructor(converter: TypeConverter<From, To>, ...var_converters: TypeConverter<From, To>[]) {
        this.converters_ = [converter, ...var_converters];
    }

    convert(val: From): To {
        return this.converters_[0].convert(val);
    }

    unconvert(val: To): UnconvertType<From> {
        let res = this.converters_[0].unconvert(val);
        if (res.error) {
            return res;
        }

        for (var i = 0; i < this.converters_.length; i++) {
            let r = this.converters_[i].unconvert(val);
            if (r.error) {
                return r;
            }
        }
        return res;
    }

}
