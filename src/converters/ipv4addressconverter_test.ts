import assert from "node:assert/strict";
import test from "node:test"
import {IPv4AddressConverter} from "./ipv4addressconverter";

test("Unconvert", () => {
    let testee = new IPv4AddressConverter();

    assert.equal(testee.unconvert("1.2.3.4.5").error != null, true);
    assert.equal(testee.unconvert("1.2.3.4a").error != null, true);
    assert.equal(testee.unconvert("1.2.3").error != null,true);
    assert.equal(testee.unconvert("1.2.3.400").error != null, true);
    assert.equal(testee.unconvert("1.2.-3.400").error != null, true);
    assert.deepEqual(testee.unconvert("1.2.3.4"), {value: [1, 2, 3, 4]});
});

test("Convert", ()=> {
    let testee = new IPv4AddressConverter();
    assert.equal(testee.convert([1,2,3,255]), "1.2.3.255");
});