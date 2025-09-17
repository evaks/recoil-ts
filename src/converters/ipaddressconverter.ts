import {IPv6AddressConverter} from "./ipv6addressconverter";
import {IPAddress, IPAddressType} from "../types/types";
import {IPv4AddressConverter} from "./ipv4addressconverter";
import {TypeConverter, UnconvertType} from "./typeconverter";


class IPAddressConverter implements TypeConverter<IPAddress,string> {
    static charValidator = IPv6AddressConverter.charValidator;


    convert(val: IPAddress): string {

        if (val.type === IPAddressType.ipv4) {
            return new IPv4AddressConverter().convert(val.value);

        } else {
            return new IPv6AddressConverter(true, false, false).convert(val.value);
        }
    }

    unconvert(val: string): UnconvertType<IPAddress> {

        if (val.indexOf(':') !== -1) {
            let converter = new IPv6AddressConverter(true, false, false);

            let res = converter.unconvert(val);
            if (res.error) {
                return {error: res.error};
            }
            return  {
                value: {type: IPAddressType.ipv6, value: res.value},
            }
        } else {
            let converter = new IPv4AddressConverter();

            let res = converter.unconvert(val);

            return res.error ? {error: res.error} : {
                value: {type: IPAddressType.ipv4, value: res.value}
            };

        }
    }
}



