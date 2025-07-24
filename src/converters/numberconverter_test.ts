import test from "node:test";
import assert from "node:assert"
import {ObjectConverter} from "./objectconvert";
import {NullableIntToStringConverter} from "./numberconverter";

test("numberconverter", () => {
    let testee = new NullableIntToStringConverter();
    assert.equal(testee.convert(null), '');
    assert.equal(testee.convert(56), '56');
    assert.deepEqual(testee.unconvert(''), {value:null});
    assert.deepEqual(testee.unconvert('71'), {value:71});
    assert.equal(testee.unconvert('some nonsense')?.error != null, true);

})