import assert from 'assert/strict';
import test from 'node:test';


import {decimal64ToFixed} from './number'

test("to fixed", () => {
    var toFixed = decimal64ToFixed;
    assert.equal('0', toFixed({value: '0', fraction_digits: 2}, 0));
    assert.equal('0.0000000000', toFixed({value: '0', fraction_digits: 2}, 10));
    assert.equal('1.2300000000', toFixed({value: '123', fraction_digits: 2}, 10));
    assert.equal('-1.2300000000', toFixed({value: '-123', fraction_digits: 2}, 10));

    assert.equal('9.12', toFixed({value: '912345', fraction_digits: 5}, 2));
    assert.equal('0.12', toFixed({value: '12345', fraction_digits: 5}, 2));
    assert.equal('0.01', toFixed({value: '1234', fraction_digits: 5}, 2));
    assert.equal('0.00', toFixed({value: '12', fraction_digits: 5}, 2));
});
