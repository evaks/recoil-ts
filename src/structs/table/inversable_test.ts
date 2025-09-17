import assert from "node:assert/strict";
import test from "node:test";
import {Frp} from "../../frp/frp";
import {create, Inversable} from "./inversable";

class TestInversable implements Inversable<number,  {x:number, y:number}> {
    calculate(params: { x: number; y: number }): number {
        return params.x + params.y;
    }

    inverse(val: number, sources: { x: number; y: number }): { x: number} {
        return {x: val - sources.y};
    }
}

test("inversable", t => {
    let frp = new Frp();
    let xB = frp.createB(1)
    let b1 = create<number, {x:number, y:number}>(frp, new TestInversable(), {x:1, y:2});
    let b2 = create<number, {x:number, y:number}>(frp, new TestInversable(), {x:xB, y:2});


    frp.attach(b1);
    frp.attach(b2);
    frp.accessTrans(() => {
        assert.equal(b1.get(), 3);
        assert.equal(b2.get(), 3);
        b1.set(4);
        b2.set(4);
        assert.equal(b1.get(), 4);
        assert.equal(b2.get(), 4);
    }, b1, b2);

    frp.accessTrans(() => {
        assert.equal(b1.get(), 3);
        assert.equal(b2.get(), 4);
        assert.equal(xB.get(), 2);
    }, b1, b2, xB);
})