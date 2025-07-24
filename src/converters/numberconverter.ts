/**
 * @constructor
 * @implements {recoil.converters.StringConverter<number>}
 */
import {StringConverter} from "./stringconverter";
import { UnconvertType } from "./typeconverter";
import {Messages} from "../ui/messages";

export class NullableIntToStringConverter implements StringConverter<number | null> {
    convert(val: number | null): string {
        if (val === null || val === undefined) {
            return '';
        }
        return '' + val;
    }
    unconvert(val: string): UnconvertType<number | null> {
        if (val === '') {
            return {value: null};
        }
        if (val.match(/^\d*$/)) {
            return {value: parseInt(val, 10)};
        }
        return {error: Messages.INVALID_VALUE};
    }
}
