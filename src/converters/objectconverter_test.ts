import test from "node:test";
import assert from "node:assert"
import {ObjectConverter} from "./objectconvert";

test("objectconverter", () => {
    let testee = new ObjectConverter();
    assert.equal(testee.convert({a:1}), '{"a":1}');
    assert.deepEqual(testee.unconvert('{"a":1}')?.value, {a:1});
    assert.equal(testee.unconvert('some nonsense')?.error != null, true);

})