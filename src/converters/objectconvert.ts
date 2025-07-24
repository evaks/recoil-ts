import {StructType} from "../frp/struct";
import {StringConverter} from "./stringconverter";
import { UnconvertType } from "./typeconverter";
import {Message} from "../ui/message";

/**
 * this is really for debugging just convert to json, note will
 * not handle loops
 */
export class ObjectConverter implements StringConverter<StructType> {
    convert(val: StructType): string {
        return JSON.stringify(val);
    }
    unconvert(val: string): UnconvertType<StructType> {
        try {
            return {value: val === '' ? null : JSON.parse(val)};
        }
        catch (e) {
            return {error: Message.getParamMsg('' + e)};
        }
    }
}

