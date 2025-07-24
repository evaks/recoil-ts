import {IPv4Address} from "../types/types";
import {TypeConverter, UnconvertType} from "./typeconverter";
import {Messages} from "../ui/messages";

export class IPv4AddressConverter implements TypeConverter<IPv4Address, string> {
    static readonly maxLength = 15

    convert(val: IPv4Address): string {

        return val.join(".");
    }

    unconvert(val: string): UnconvertType<IPv4Address> {
        let res: number[] = [];
        let parts: string[] = val.split('.');
        let num = 0;

        let partsLen = parts.length;

        for (var i = 0; i < partsLen; i++) {

            if (!parts[i].match(/^[0-9]*$/)) {
                return {error: Messages.INVALID_CHARACTER};
            }


            num = parseInt(parts[i], 10);
            if (partsLen !== 4 || isNaN(num) || num > 255 || num <= -1) {
                return {error: Messages.INVALID};
            } else {
                res.push(parseInt(parts[i], 10));
            }
        }

        return {value: res as any};
    }

    static charValidator(c: string): boolean {
        return (c >= '0' && c <= '9') || c === '.';
    }
}

