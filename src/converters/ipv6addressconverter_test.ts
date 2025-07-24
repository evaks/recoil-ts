import {IPv6AddressConverter} from "./ipv6addressconverter";
import assert from "assert/strict";
import test from "node:test";

test("RemoveZeroSeq", () => {
    let testee = new IPv6AddressConverter(true, true, false);

    assert.equal(testee.convert([1, 0, 0, 0, 0, 2, 3, 4]),"1::2:3:4");
    assert.equal(testee.convert([0, 0, 0, 0, 2, 3, 4, 5]),"::2:3:4:5");
    assert.equal(testee.convert([0, 1, 1, 1, 2, 3, 4, 5]),"0:1:1:1:2:3:4:5");
    assert.equal(testee.convert([2, 3, 4, 5, 0, 0, 0, 0]),"2:3:4:5::");
    assert.equal(testee.convert([0, 0, 0, 0, 0, 0, 0, 0]),"::");
    assert.equal(testee.convert([1, 2, 3, 4, 5, 6, 7, 8]),"1:2:3:4:5:6:7:8");

});

test("Unconvert",() =>{
    let testee = new IPv6AddressConverter(true, true, false);

    assert.equal(testee.unconvert("1:2:3:4:5:6:7::8").error != null, true)
    assert.equal(testee.unconvert("::::").error != null, true)
    assert.equal(testee.unconvert("1.2.3.4").error != null, true)
    assert.equal(testee.unconvert(":").error != null, true)
    assert.equal(testee.unconvert("a").error != null, true)
    assert.equal(testee.unconvert("").error != null, true)
    assert.equal(testee.unconvert(":1,2,3,4,5,6,7").error != null, true)
    assert.equal(testee.unconvert(":1,2,3,4,5,6,7,8").error != null, true)
    assert.equal(testee.unconvert(":1,2,3,4,5,6,7,z").error != null, true)

    assert.deepEqual(testee.unconvert("::"),{value: [0, 0, 0, 0, 0, 0, 0, 0]});
    assert.deepEqual(testee.unconvert("1:2:3:4:5:6:7:8"),{value: [1, 2, 3, 4, 5, 6, 7, 8]});
    assert.deepEqual(testee.unconvert("1::2:3:4"),{value: [1, 0, 0, 0, 0, 2, 3, 4]});
    assert.deepEqual(testee.unconvert("::2:3:4"),{value: [0, 0, 0, 0, 0, 2, 3, 4]});
    assert.deepEqual(testee.unconvert("1:2:3:4::"),{value: [1, 2, 3, 4, 0, 0, 0, 0]});
    assert.deepEqual(testee.unconvert("1:2:3:4::7:8"),{value: [1, 2, 3, 4, 0, 0, 7, 8]});
    assert.deepEqual(testee.unconvert("0:0:3:4::"),{value: [0, 0, 3, 4, 0, 0, 0, 0]});
    assert.deepEqual(testee.unconvert("::1"),{value: [0, 0, 0, 0, 0, 0, 0, 1]});
    assert.deepEqual(testee.unconvert("1::1"),{value: [1, 0, 0, 0, 0, 0, 0, 1]});
    assert.deepEqual(testee.unconvert("1:2::1"),{value: [1, 2, 0, 0, 0, 0, 0, 1]});
    assert.deepEqual(testee.unconvert("1::"),{value: [1, 0, 0, 0, 0, 0, 0, 0]});
    assert.deepEqual(testee.unconvert("1:2:3:4:5:6:7::"),{value: [1, 2, 3, 4, 5, 6, 7, 0]});

    assert.equal(testee.unconvert("1:2:3:4:5:6:7::2::3").error != null, true)
    assert.equal(testee.unconvert("1::2::3").error != null, true)
    assert.equal(testee.unconvert("1h::").error != null, true);

    assert.deepEqual(testee.unconvert("1:2:3:4:5:6:1.2.3.4"), {
        value: [1, 2, 3, 4, 5, 6, 0x0102, 0x0304]
    });
    assert.deepEqual(testee.unconvert("::2:3:4:5:6:1.2.3.4"),{
        value: [0, 2, 3, 4, 5, 6, 0x0102, 0x0304]
    });
    assert.deepEqual(testee.unconvert("1:2:3:4::1.2.3.4"),{value: [1, 2, 3, 4, 0, 0, 0x0102, 0x0304]});

});

test("PadWithZeros", () => {
    let testee = new IPv6AddressConverter(true, false, false);

    assert.deepEqual(testee.convert([1, 0xab2, 0x13, 0xffff, 5, 6, 7, 8]),"0001:0ab2:0013:ffff:0005:0006:0007:0008");
});