/**
 * @param {{value:string, fraction_digits:number}} val
 * @param {number} dps
 * @return {string}
 */
export function decimal64ToFixed(val:{value:string, fraction_digits: number}, dps: number) {
    let long = BigInt(val.value);
    if (long === 0n) {
        if (dps > 0) {
            return '0.' + '0'.repeat(dps);
        }
        return '0';
    }
    var abString = (long < 0 ? -long : long).toString();
    var sign = long < 0 ? '-' : '';
    if (val.fraction_digits < 0) {
        abString += '0'.repeat(val.fraction_digits);
        if (dps > 0) {
            return sign + abString + '.' + '0'.repeat(dps);
        }
        return sign + abString;
    }
    else {
        let beforeDp = abString.substring(0, Math.max(0, abString.length - val.fraction_digits));
        let afterDp = '0'.repeat(val.fraction_digits) + abString.substring(beforeDp.length);
        afterDp = afterDp.substring(afterDp.length - val.fraction_digits);

        if (beforeDp === '') {
            beforeDp = '0';
        }

        if (dps <= 0) {
            return sign + beforeDp;
        }
        afterDp = (afterDp + '0'.repeat(dps)).substring(0, dps);
        if (afterDp === '') {
            return sign + beforeDp;
        }
        else {
            return sign + beforeDp + '.' + afterDp;
        }
    }



}
