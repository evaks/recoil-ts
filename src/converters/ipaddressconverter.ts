goog.provide('recoil.converters.IPAddressConverter');

goog.require('recoil.converters.IPv4AddressConverter');
goog.require('recoil.converters.IPv6AddressConverter');
goog.require('recoil.converters.TypeConverter');
goog.require('recoil.types');
goog.require('recoil.types.IPAddress');
goog.require('recoil.types.IPAddressType');
goog.require('recoil.ui.message.Message');


/**
 *
 * @constructor
 * @implements {recoil.converters.TypeConverter<recoil.types.IPAddress, string>}
 */
recoil.converters.IPAddressConverter = function() {

};
/**
 *
 * @param {!string} c
 * @return {boolean}
 */
recoil.converters.IPAddressConverter.charValidator = recoil.converters.IPv6AddressConverter.charValidator;

/**
 * @param {recoil.types.IPAddress} val
 * @return {!string}
 */
recoil.converters.IPAddressConverter.prototype.convert = function(val) {

    var ret;
    if (val.type === recoil.types.IPAddressType.ipv4) {
        ret = new recoil.converters.IPv4AddressConverter();
        return ret.convert(val.value);


    } else {
        ret = new recoil.converters.IPv6AddressConverter(true, false, false);
        return ret.convert(val.value);
    }
};


/**
 * @param {string} val
 * @return {!{error : recoil.ui.message.Message, value : recoil.types.IPAddress?}}
 */
recoil.converters.IPAddressConverter.prototype.unconvert = function(val) {

    var converter;
    var res;
    if (val.indexOf(':') !== -1) {
        converter = new recoil.converters.IPv6AddressConverter(true, false, false);

        res = converter.unconvert(val);

        return res.error ? {error: res.error, value: null} : {
            error: null, value: {type: recoil.types.IPAddressType.ipv6, value: /** @type {!recoil.types.IPv6Address}*/ (res.value)}};

    } else {
        converter = new recoil.converters.IPv4AddressConverter();

        res = converter.unconvert(val);

        return res.error ? {error: res.error, value: null} : { error: null,
                value: {type: recoil.types.IPAddressType.ipv4, value: /** @type {!recoil.types.IPv4Address}*/ (res.value)}};

    }
};



