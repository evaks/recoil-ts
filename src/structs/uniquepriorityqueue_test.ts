import assert from 'assert/strict';
import test from 'node:test';

import {UniquePriorityQueue} from "./uniquepriorityqueue";

test("Ordering", () => {
    function comp(a:number, b: number) {
        return a - b;
    }
    let h = new UniquePriorityQueue<number>(comp);

    h.push(5);
    h.push(7);
    h.push(3);
    h.push(6);

    assert.equal(3, h.pop());
    assert.equal(5, h.pop());
    assert.equal(6, h.pop());
    assert.equal(7, h.pop());
    assert.equal(undefined, h.pop());
});

test("NoDup", ()=> {

    function comp(a:number, b:number) {
        return a - b;
    }
    let h = new UniquePriorityQueue<number>(comp);

    h.push(5);
    h.push(7);
    h.push(5);
    h.push(3);
    h.push(6);

    assert.equal(3, h.pop());
    assert.equal(5, h.pop());
    assert.equal(6, h.pop());
    assert.equal(7, h.pop());
    assert.equal(undefined, h.pop());

});
