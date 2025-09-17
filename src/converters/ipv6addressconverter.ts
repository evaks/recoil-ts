import {SupportedUnconvertType, TypeConverter, UnconvertType} from "./typeconverter";
import {IPv6Address} from "../types/types";
import {Messages} from "../ui/messages";
import {IPv4AddressConverter} from "./ipv4addressconverter";

export class IPv6AddressConverter implements TypeConverter<IPv6Address, string> {
    private readonly removeZeroSeq_: boolean;
    private readonly stripLeadingZeros_: boolean;
    private readonly ipv4_: boolean;

    /**
     *
     * @param removeZeroSeq
     * @param stripLeadingZeros
     * @param ipV4 whether or not to display ipv4 segment to user
     */
    constructor(removeZeroSeq: boolean, stripLeadingZeros: boolean, ipV4: boolean) {
        this.removeZeroSeq_ = removeZeroSeq;
        this.stripLeadingZeros_ = stripLeadingZeros;
        this.ipv4_ = ipV4;
    }

    convert(val: IPv6Address): string {
        let parts = [];
        let maxLen = undefined;
        let maxLenStart = undefined;
        let curLen = 0;
        let curStart;

        for (let i = 0; i < val.length; i++) {
            let part = val[i].toString(16);


            if (!this.stripLeadingZeros_) {
                part = ('0000' + part).substring(part.length);
            }
            if (val[i] === 0) {
                if (curStart === undefined) {
                    curStart = i;
                    curLen = 1;
                }
                else {
                    curLen++;
                }
                if (maxLen === undefined || maxLen < curLen) {
                    maxLen = curLen;
                    maxLenStart = curStart;
                }
            }
            else {
                curStart = undefined;
            }
            parts.push(part);
        }

        let res = [];
        let i = 0;
        while (i < parts.length) {
            if (i === maxLenStart && this.removeZeroSeq_ && (maxLen as number) > 1) {
                res.push(i === 0 ? '::' : ':');
                i += maxLen as number;
            }
            else {
                res.push(i === 7 ? parts[i] : parts[i] + ':');
                i++;
            }
        }

        return res.join('');
    }
    unconvert(val: string): SupportedUnconvertType<IPv6Address> {
        // if more than 1 part is "" not at beginning or end then fail
        // if part "" at beginning or end then must be a blank
        // last part can be ipv4 address if so max parts is 7 else 8
        // number of parts is not max must contain a ::
        // each hex part has max 4 chars
        // all non ipv4 parts can only contain hex digits
        // ipv4 validation
        // must contain 4 parts seperated by . each with only base 10 digits
        // value of each part between (inclusive) 0 and 255
        let ret:number[] = [];

        let parts:string[] = val.split(':');
        let ipV4Parts:number[] = [];

        if (parts.length > 0) {
            if (parts[parts.length - 1].indexOf('.') !== -1) {
                let res = new IPv4AddressConverter().unconvert(parts[parts.length - 1]);
                if (res.error) {
                    return {error: res.error};
                }
                ipV4Parts = [res.value[0] << 8 | res.value[1], res.value[2] << 8 | res.value[3]];
            }

        }

        let requiredLen = ipV4Parts.length > 0 ? 6 : 8;
        if (ipV4Parts.length > 0) {
            parts.pop();
        }

        if (parts.length < 2) {
            return {error: Messages.INVALID_LENGTH};
        }

        let requiresBlank = false;
        if (parts[0] === '') {
            requiresBlank = true;
            parts.shift();
        }

        if (requiredLen === 8 && parts[parts.length - 1] === '') {
            requiresBlank = true;
            parts.pop();
        }

        let hasBlank = false;
        for (let i = 0; i < parts.length; i++) {
            let part = parts[i];

            if (part.length > 4) {
                return {error: Messages.INVALID_LENGTH};
            }

            if (!part.match(/^[a-fA-F0-9]*$/)) {
                return {error: Messages.INVALID_CHARACTER};
            }

            if (part === '' && hasBlank) {
                return {error: Messages.INVALID};
            }

            if (part === '') {
                hasBlank = true;
                ret.push(0);
                for (let j = parts.length; j < requiredLen; j++) {
                    ret.push(0);
                }
            }
            else {
                ret.push(parseInt(part, 16));
            }
        }
        if ((requiresBlank && !hasBlank) || requiredLen !== ret.length) {
            return {error: Messages.INVALID};
        }

        return {value: (ret.concat(ipV4Parts)) as IPv6Address};

    }

    static readonly maxLength = 45;

    static charValidator(c:string):boolean {
        return (c >= '0' && c <= '9') || c === ':' || c === '.' || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f');
    }
    
    charValidator = IPv6AddressConverter.charValidator;
}
