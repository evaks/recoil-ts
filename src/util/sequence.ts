/**
 * a class to create a incrementing sequence
 * of strings
 */
export default class Sequence {
    private val : bigint = 1n;

    next() {
        return this.nextLong() + '';

    }
    /**
     * get the next value and increment the counter
     */

    nextLong() :bigint {
        var res = this.val;
        this.val++;
        return res;
    };

    reset() {
        this.val = 1n;
    }
    /**
     * marks a value as seen will not generate it again
     */

    seen(val: bigint | string) {
        if (typeof val === 'string') {
            val = BigInt(val)
        }

        if (this.val <= (val as bigint) ) {
            this.val = (val as bigint) + 1n;
        }
    }
}
