import {BStatus, Frp} from "./frp";

import assert from "assert/strict";
import test from "node:test";
import {dateB, memoryB, memoryOnlyB, timeB, Util} from "./util";
import {StructType} from "./struct";
import {wait} from "../util/promises";

test("structLiftBI", () => {
    let frp = new Frp();

    let aB = frp.createB(1);
    let bB = frp.createB(2);
    let struct = {a:aB, b:bB, c: 1};
    let util = new Util(frp);
    let testee = util.structLiftBI((val: StructType) => {
        return {
            a: val.a + 1,
            b: val.b + 1,
            c: val.c + 1,
        }
    }, (val:StructType):StructType => {
        return {
            a: val.a - 1,
            b: val.b - 1,
            c: val.c - 1,
            d: 1
        }
    }, struct);

    frp.tm().attach(testee);

    frp.accessTrans(() => {
       assert.deepEqual(testee.get(), {a:2, b: 3, c: 2});
       testee.set({a: 4, b: 5, c: 6});
    }, testee);

    frp.accessTrans(() => {
        assert.deepEqual(testee.get(), {a:4, b: 5, c: 2});
        assert.equal(aB.get(), 3);
        assert.equal(bB.get(), 4);
        assert.equal(struct.c, 1);
    }, testee, aB, bB);


});

test("structLiftB", () => {
    let frp = new Frp();

    let aB = frp.createB(1);
    let bB = frp.createB(2);
    let util = new Util(frp);
    let testee = util.structLiftB((val: StructType) => {
        return {
            a: val.a + 1,
            b: val.b + 1,
            c: val.c + 1,
        }
    }, {a:aB, b:bB, c: 1});

    frp.tm().attach(testee);

    frp.accessTrans(() => {
        assert.deepEqual(testee.get(), {a:2, b: 3, c: 2});
    }, testee);

});

test("getDefault", () => {
    let frp = new Frp();
    let aB = frp.createB(undefined);
    let defB = frp.createB(7);
    let util = new Util(frp);

    let testee = util.getDefault(aB, defB);
    frp.tm().attach(testee);
    frp.accessTrans(() => {
        assert.equal(testee.get(), 7);
        testee.set(4);
    }, testee);

    frp.accessTrans(() => {
        assert.equal(testee.get(), 4);
        assert.equal(aB.get(), 4);
        assert.equal(defB.get(), 7);
        testee.set(undefined);
        defB.set(6);
    }, testee, aB, defB);

    frp.accessTrans(() => {
        assert.equal(testee.get(), 6);
    }, testee);
});
test("isAllGood", () => {
    let frp = new Frp();
    let b1 = frp.createB(1)
    let b2 = frp.createNotReadyB();

    let testee = Util.isAllGood(b1, b2);
    frp.attach(testee);
    frp.accessTrans(() => {
        assert.equal(testee.get(), false);
        b2.metaSet(BStatus.errors(["error"]))
    }, testee, b2);

    frp.accessTrans(() => {
        assert.equal(testee.get(), false);
        b2.set(2)
    }, testee, b2);

    frp.accessTrans(() => {
        assert.equal(testee.get(), true);
    }, testee, b2);
});

test("lastGood", () => {
    let frp = new Frp();
    let b = frp.createNotReadyB();

    let testee = Util.lastGood(b);

    frp.tm().attach(testee);

    frp.accessTrans(() => {
        assert.equal(testee.metaGet().ready(), false);
        b.set(1);
    }, testee, b);

    frp.accessTrans(() => {
        assert.equal(testee.metaGet().ready(), true);
        assert.equal(testee.get(), 1)
        b.set(2);
    }, testee, b);

    frp.accessTrans(() => {
        assert.equal(testee.metaGet().ready(), true);
        assert.equal(testee.get(), 2)
        b.metaSet(BStatus.errors(["error"]));
    }, testee, b);

    frp.accessTrans(() => {
        assert.equal(testee.metaGet().ready(), true);
        assert.equal(testee.get(), 2)
        b.metaSet(BStatus.notReady());
    }, testee, b);

    frp.accessTrans(() => {
        assert.equal(testee.metaGet().ready(), true);
        assert.equal(testee.get(), 2)
        b.set(3);
    }, testee, b);

    frp.accessTrans(() => {
        assert.equal(testee.metaGet().ready(), true);
        assert.equal(testee.get(), 3)
    }, testee, b);

});
test("defaultValue", () => {
    let frp = new Frp();
    let b = frp.createB(8);
    let testee = Util.defaultValue(b)

    frp.tm().attach(testee);

    frp.accessTrans(() => {
        assert.equal(testee.get(), 8);
        testee.set(10);
    }, testee, b);
    frp.accessTrans(() => {
        assert.equal(testee.get(), 10);
        assert.equal(b.get(), 8);
    }, testee, b);

});
test("calm", async () => {
    let frp = new Frp();

    let b = frp.createB(1);

    let delay = 100;
    let invokes = 0;
    let testee = frp.liftB(v => {
        invokes++
        return v;
    }, Util.calm(b, delay));

    let lastTime = new Date().getTime();
    frp.attach(testee);
    frp.accessTrans(() => {
       assert.equal(testee.get(), 1);
       b.set(2);
    }, testee, b);


    // this test is a bit flaky since it depends on time it takes to fire if the delay is to long it should fire
    // but we can't be guaranteed that since it may longer to fire

    frp.accessTrans(() => {
        let diff = new Date().getTime() - lastTime;
        if (diff < delay) {
            assert.equal(testee.get(), 1);
            assert.equal(invokes, 1);
        }
        b.set(3);
    }, testee, b);

    frp.accessTrans(() => {
        let diff = new Date().getTime() - lastTime;
        if (diff < delay) {
            assert.equal(testee.get(), 1);
            assert.equal(invokes, 1);
        }
        b.set(3);
    }, testee, b);

    let maxTries = 10;
    while(maxTries > 0 && frp.accessTrans(() => testee.get()  != 3, testee )) {
        await wait(delay);
        maxTries --;
    }
    assert.equal(maxTries > 0, true);
});
test("liftMemberFunc", () => {
    let frp = new Frp();

    let stringB = frp.createB("hello world");
    let endB = frp.createB(5);

    let subB = Util.liftMemberFunc(String.prototype.substring, stringB, 1, endB);

    frp.attach(subB);

    frp.accessTrans(() => {
        assert.equal(subB.get(), "ello");
        endB.set(3);
    }, subB, endB)

    frp.accessTrans(() => {
        assert.equal(subB.get(), "el");
    }, subB, endB)

});
test("timeB", async () => {
    let frp = new Frp();
    let testee = timeB(frp);
    let testee2 = timeB(frp);
    frp.attach(testee);

    assert.equal(testee, testee2);

    assert.equal(testee.getRefs(frp.tm()),1);
    frp.attach(testee2);
    assert.equal(testee.getRefs(frp.tm()),2);

    frp.accessTrans(() => {
        let now = new Date().getTime();
        // should
        let v = testee.get();
        // with 2 seconds should be fine
        assert.equal(v <= now && v >= now - 2000, true);

    }, testee);

    await wait(3000);

    frp.accessTrans(() => {
        let now = new Date().getTime();
        // should
        let v = testee.get();
        // with 2 seconds should be fine
        assert.equal(v <= now && v >= now - 2000, true);

    }, testee);

    frp.detach(testee2);
    frp.detach(testee);
    assert.equal(testee.getRefs(frp.tm()),0);

});

test("dateB", () => {
    // in order to test this would need to take a day
    let frp = new Frp();
    let testee = dateB(frp);
    let testee2 = dateB(frp);
    frp.attach(testee);

    assert.equal(testee, testee2);

    assert.equal(testee.getRefs(frp.tm()),1);
    frp.attach(testee2);
    assert.equal(testee.getRefs(frp.tm()),2);

    frp.accessTrans(() => {
        let dt = new Date();
        let now = new Date(dt.getTime()).setHours(0,0,0,0)
        // should
        let v = testee.get();
        // this could fail if run at midnight so deal with it I would rather not get false negatives

        if (dt.getHours() != 0 || dt.getMinutes() != 0 || dt.getSeconds() > 2) {
            assert.equal(v, now);
        }
    }, testee);

    frp.detach(testee2);
    frp.detach(testee);
    assert.equal(testee.getRefs(frp.tm()),0);
});

test("memoryB", () => {
    let frp = new Frp();
    let memB = frp.createB(22);
    let b1 = frp.createB(1);
    let testee = memoryB(b1, memB);

    frp.attach(testee);

    frp.accessTrans(() => {
        assert.equal(testee.get(), 1)
        assert.equal(b1.get(),1);
        assert.equal(memB.get(),22);

        testee.set(10);
    }, testee, b1, memB);

    frp.accessTrans(() => {
        assert.equal(testee.get(), 10);
        assert.equal(b1.get(),10);
        assert.equal(memB.get(),10);
    }, testee, b1, memB);

});

test("memoryOnlyB", () => {
    let frp = new Frp();
    let b1 = frp.createB(1);
    let testee = memoryOnlyB(b1);

    frp.attach(testee);

    frp.accessTrans(() => {
        assert.equal(testee.get(), 1)
        assert.equal(b1.get(),1);
        testee.set(10);
    }, testee, b1);

    frp.accessTrans(() => {
        assert.equal(testee.get(), 10);
        assert.equal(b1.get(),1);
    }, testee, b1);
});
