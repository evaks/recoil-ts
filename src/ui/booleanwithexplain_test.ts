import assert from "node:assert/strict"
import test from "node:test"

import {BoolWithExplanation} from "./booleanwithexplain";
import {Message} from "./message";
import {BStatus, Frp} from "../frp/frp";


test("createB", () => {
    let frp = new Frp();
    let trueMessage = Message.toMessage("mes true");
    let falseMessage = Message.toMessage("mes false");
    let trueMessageB = frp.createB(trueMessage);
    let falseMessageB = frp.createB(falseMessage);
    let valB = frp.createB(true);
    let boolOnlyB = BoolWithExplanation.createB(valB);
    let trueMsgOnlyB = BoolWithExplanation.createB(valB, trueMessage);
    let trueMsgOnly1B = BoolWithExplanation.createTrueB(valB, trueMessage);
    let falseMsgOnlyB = BoolWithExplanation.createB(valB, undefined, falseMessage);
    let falseMsgOnly1B = BoolWithExplanation.createFalseB(valB, falseMessage);
    let trueFalseMsgOnlyB = BoolWithExplanation.createB(valB, trueMessage, falseMessage);

    frp.tm().attach(
        boolOnlyB, falseMsgOnlyB, trueMsgOnlyB, trueMsgOnlyB, trueFalseMsgOnlyB, trueMsgOnly1B, falseMsgOnly1B
    );

    frp.accessTrans(() => {
        assert.equal(boolOnlyB.get().val(), true);
        assert.equal(boolOnlyB.get().reason(), null);

        for (let b of [trueMsgOnlyB, trueMsgOnly1B]) {
            assert.equal(b.get().val(), true);
            assert.equal(b.get().reason(), trueMessage);
        }

        for (let b of [falseMsgOnlyB, falseMsgOnly1B]) {
            assert.equal(b.get().val(), true);
            assert.equal(b.get().reason(), null);
        }

        assert.equal(trueFalseMsgOnlyB.get().val(), true);
        assert.equal(trueFalseMsgOnlyB.get().reason(), trueMessage);
        valB.set(false);
    }, valB, boolOnlyB, falseMsgOnlyB, trueMsgOnlyB, trueMsgOnlyB, trueFalseMsgOnlyB, trueMsgOnly1B, falseMsgOnly1B);


    frp.accessTrans(() => {
        assert.equal(boolOnlyB.get().val(), false);
        assert.equal(boolOnlyB.get().reason(), null);

        for (let b of [trueMsgOnlyB, trueMsgOnly1B]) {
            assert.equal(b.get().val(), false);
            assert.equal(b.get().reason(), null);
        }

        for (let b of [falseMsgOnlyB, falseMsgOnly1B]) {
            assert.equal(b.get().val(), false);
            assert.equal(b.get().reason(), falseMessage);
        }

        assert.equal(trueFalseMsgOnlyB.get().val(), false);
        assert.equal(trueFalseMsgOnlyB.get().reason(), falseMessage);

    }, valB, boolOnlyB, falseMsgOnlyB, trueMsgOnlyB, trueMsgOnlyB, trueFalseMsgOnlyB, trueMsgOnly1B, falseMsgOnly1B);

});

test("fromBool", () => {
    let frp = new Frp();
    let trueMessage = Message.toMessage("mes true");
    let falseMessage = Message.toMessage("mes false");
    let boolB = frp.createB(true);

    let testee1 = BoolWithExplanation.fromBool(frp, true);
    let testee2 = BoolWithExplanation.fromBool(frp, boolB);

    frp.tm().attach(testee1, testee2);

    frp.accessTrans(() => {
        assert.equal(testee1.get().val(), true);
        assert.equal(testee2.get().val(), true);

        testee1.set(new BoolWithExplanation(false));
        testee2.set(new BoolWithExplanation(false))
    }, testee1, testee2);

    frp.accessTrans(() => {
        assert.equal(testee1.get().val(), true);
        assert.equal(boolB.get(), false);
        assert.equal(testee2.get().val(), false);
        boolB.set(true);
    }, testee1, testee2, boolB);

    frp.accessTrans(() => {
        assert.equal(testee2.get().val(), true);
    }, testee1, testee2);


});
test("toBool", () => {
    let frp = new Frp();
    let trueMessage = Message.toMessage("mes true");
    let falseMessage = Message.toMessage("mes false");
    let boolExplB = frp.createB(new BoolWithExplanation(true, trueMessage, falseMessage));
    let testee1 = BoolWithExplanation.toBool(boolExplB);

    frp.tm().attach(testee1);

    frp.accessTrans(() => {
        assert.equal(testee1.get(), true);
        testee1.set(false);
    }, testee1);

    frp.accessTrans(() => {
        assert.equal(boolExplB.get().val(), false);
        assert.equal(testee1.get(), false);

        boolExplB.set(new BoolWithExplanation(false, trueMessage, falseMessage))
    }, testee1, boolExplB);


    frp.accessTrans(() => {
        assert.equal(boolExplB.get().val(), false);
        assert.equal(testee1.get(), false);
    }, testee1, boolExplB);
});

test("orB", () => {
    let frp = new Frp();
    let true1 = Message.toMessage("true1");
    let false1 = Message.toMessage("false1");
    let true2 = Message.toMessage("true2");
    let false2 = Message.toMessage("false2");
    let true3 = Message.toMessage("true3");
    let false3 = Message.toMessage("false3");
    let b1B = frp.createB(new BoolWithExplanation(true, true1, false1));
    let b2B = frp.createB(new BoolWithExplanation(true, true2, false2));
    let b3B = frp.createB(new BoolWithExplanation(true, true3, false3));
    let testeeB = BoolWithExplanation.orB(b1B, b2B, b3B)

    frp.tm().attach(testeeB);
    frp.accessTrans(() => {
        assert.equal(testeeB.get().val(), true);
        assert.equal(testeeB.get().reason()?.toString(), "true1 and true2 and true3");
        b2B.set(BoolWithExplanation.TRUE);

    }, testeeB, b2B);

    frp.accessTrans(() => {
        assert.equal(testeeB.get().val(), true);
        assert.equal(testeeB.get().reason()?.toString(), "true1 and true3");

        b2B.set(new BoolWithExplanation(false, true2, false2));
    }, testeeB, b2B);

    frp.accessTrans(() => {
        assert.equal(testeeB.get().val(), true);
        assert.equal(testeeB.get().reason()?.toString(), "true1 and true3");

        b1B.set(new BoolWithExplanation(false, true1, false1));
        b2B.set(new BoolWithExplanation(false, true2, false2));
        b3B.set(new BoolWithExplanation(false, true3, false3));
    }, testeeB, b1B, b2B, b3B);

    frp.accessTrans(() => {
        assert.equal(testeeB.get().val(), false);
        assert.equal(testeeB.get().reason()?.toString(), "false1 or false2 or false3");

        b1B.set(new BoolWithExplanation(false, true1, false1));
        b2B.set(new BoolWithExplanation(false, true2, false2));
        b3B.set(new BoolWithExplanation(false, true3, null));
    }, testeeB, b1B, b2B, b3B);

    frp.accessTrans(() => {
        assert.equal(testeeB.get().val(), false);
        assert.equal(testeeB.get().reason()?.toString(), "false1 or false2");
        b1B.set(new BoolWithExplanation(false));
        b2B.set(new BoolWithExplanation(false));
        b3B.set(new BoolWithExplanation(false));
    }, testeeB, b1B, b2B, b3B);


    frp.accessTrans(() => {
        assert.equal(testeeB.get().val(), false);
        assert.equal(testeeB.get().reason(), null);
    }, testeeB, b1B, b2B, b3B);
});

test("Not", () => {
    let frp = new Frp();
    let true1 = Message.toMessage("true1");
    let false1 = Message.toMessage("false1");

    let b1B = frp.createB(new BoolWithExplanation(true, true1, false1));

    let testee = BoolWithExplanation.notB(b1B);
    frp.tm().attach(testee);

    frp.accessTrans(() => {
        assert.equal(testee.get().val(), false);
        assert.equal(testee.get().reason()?.toString(), "true1");
        b1B.set(new BoolWithExplanation(false, true1, false1));
    }, testee, b1B)

    frp.accessTrans(() => {
        assert.equal(testee.get().val(), true);
        assert.equal(testee.get().reason()?.toString(), "false1");


        testee.set(new BoolWithExplanation(false, true1, false1));
    }, testee, b1B)

    frp.accessTrans(() => {
        assert.equal(testee.get().reason()?.toString(), "false1");
        assert.equal(b1B.get().val(), true);
        testee.set(new BoolWithExplanation(true, true1, false1));
    },testee, b1B);
    frp.accessTrans(() => {
        assert.equal(testee.get().reason()?.toString(), "true1");
        assert.equal(b1B.get().val(), false);
    },testee, b1B);

});
test("isAllGoodExplain", () => {
    let frp = new Frp();
    let in1 = frp.createMetaB<number>(BStatus.errors(["error1"]));
    let in2 = frp.createMetaB<number>(BStatus.errors(["error2", "error3"]));
    let in3 = frp.createMetaB<number>(BStatus.notReady());
    let in4 = frp.createMetaB<number>(BStatus.notReady());


    let testee = BoolWithExplanation.isAllGoodExplain(in1, in2, in3, in4);

    frp.tm().attach(testee);
    frp.accessTrans(() => {
        assert.equal(testee.get().val(), false);
        assert.equal(testee.get().reason()?.toString(), "error1 and error2 and error3 and Not ready");
        in1.set(1);
    },in1, in2, testee);

    frp.accessTrans(() => {
        assert.equal(testee.get().val(), false);
        assert.equal(testee.get().reason()?.toString(), "error2 and error3 and Not ready");
        in2.set(1);
    },in1, in2, testee);

    frp.accessTrans(() => {
        assert.equal(testee.get().val(), false);
        assert.equal(testee.get().reason()?.toString(), "Not ready");
        in3.set(1);
        in4.set(1);
    },in1, in2, in3, in4, testee);


    frp.accessTrans(() => {
        assert.equal(testee.get().val(), true);
        assert.equal(testee.get().reason(), null);
    },in1, in2, in3, in4, testee);

});

test("And", () => {
    let x = new BoolWithExplanation(true, Message.toMessage('msg1'));
    let y = new BoolWithExplanation(true, Message.toMessage('msg2'));
    let z = new BoolWithExplanation(true, Message.toMessage('msg3'));

    let res = x.and(y, z);

    assert.equal(true, res.val());
    assert.equal("msg1 and msg2 and msg3", (res.reason() as Message).toString());

    z = new BoolWithExplanation(false, Message.toMessage('msg3'));

    res = x.and(y, z);
    assert.equal(false, res.val());
    assert.equal("msg3", (res.reason() as Message).toString());

    res = res.not();
    assert.equal(true, res.val());
    assert.equal("msg3", (res.reason() as Message).toString());

    y = new BoolWithExplanation(false, Message.toMessage('msg2'));

    res = x.and(y, z);
    assert.equal(false, res.val());
    assert.equal("msg2 and msg3", (res.reason() as Message).toString());

    z = new BoolWithExplanation(true, Message.toMessage(''));
    y = new BoolWithExplanation(true, Message.toMessage('msg2'));

    res = x.and(y, z);
    assert.equal(true, res.val());
    assert.equal("msg1 and msg2", (res.reason() as Message).toString());

    z = new BoolWithExplanation(true);

    res = x.and(y, z);
    assert.equal(true, res.val());
    assert.equal("msg1 and msg2", (res.reason() as Message).toString());


});

test("Or", () => {
    let x = new BoolWithExplanation(true, Message.toMessage('msg1'));
    let y = new BoolWithExplanation(true, Message.toMessage('msg2'));
    let z = new BoolWithExplanation(true, Message.toMessage('msg3'));

    let res = x.or(y, z);
    assert.equal(true, res.val());
    assert.equal("msg1 and msg2 and msg3", (res.reason() as Message).toString());

    z = new BoolWithExplanation(false, Message.toMessage('msg3'));

    res = x.or(y, z);
    assert.equal(true, res.val());
    assert.equal("msg1 and msg2", res.reason()?.toString());

    res = res.not();
    assert.equal(false, res.val());
    assert.equal("msg1 and msg2", (res.reason() as Message).toString());

    y = new BoolWithExplanation(false, Message.toMessage('msg2'));

    res = x.or(y, z);
    assert.equal(true, res.val());
    assert.equal("msg1", (res.reason() as Message).toString());

    z = new BoolWithExplanation(true, Message.toMessage(''));
    y = new BoolWithExplanation(true, Message.toMessage('msg3'));

    res = x.or(y, z);
    assert.equal(true, res.val());
    assert.equal("msg1 and msg3", (res.reason() as Message).toString());

    z = new BoolWithExplanation(true);

    res = x.or(y, z);
    assert.equal(true, res.val(), "x z");
    assert.equal("msg1 and msg3", (res.reason() as Message).toString());

    x = new BoolWithExplanation(false, Message.toMessage('msg1'));
    y = new BoolWithExplanation(false, Message.toMessage('msg2'));
    z = new BoolWithExplanation(false, Message.toMessage('msg3'));

    res = x.or(y, z);
    assert.equal(false, res.val(), "x y z");
    assert.equal("msg1 or msg2 or msg3", (res.reason() as Message).toString());

});


