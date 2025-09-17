import assert from "assert/strict";
import test from "node:test";

import {getGroup, Options} from "./util.ts";
import {BStatus, Frp} from "../../frp/frp.ts";

import * as structs  from "../../frp/struct.ts";


test("GroupBind()", () => {

    const frp = new Frp();
    let testee = Options({'a' : 1, 'b': 2, c:3, d:4, e:2});
    let aB = frp.createB('a-');
    let bB = frp.createB('b-');
    let eB = frp.createB(3);
    let bound = testee.bind(frp, {a:aB, b: bB, e: eB});
    // should be bound bound.a etc we should fix this
    let groupB = bound[getGroup](['a', 'b', 'c', 'e'], function (x) {x.e = x.e + 1;return x;},  function (x) {x.e = x.e - 1;return x;});
    let group1B = bound[getGroup]([bound.a, bound.b, bound.c])


    frp.attach(groupB);
    frp.attach(group1B);
    assert.deepEqual({a:'a-',b:'b-', c: 3, e: 4},groupB.unsafeMetaGet().get());
    assert.deepEqual({a:'a-',b:'b-', c: 3},group1B.unsafeMetaGet().get());

    frp.accessTrans(function() {
        groupB.set({a:'a+', b:'b+', c:7, e: 10});
    }, groupB);

    frp.accessTrans(function() {
        assert.deepEqual({a:'a+',b:'b+', c: 3, e:10},groupB.get());
        assert.deepEqual('a+',aB.get());
        assert.deepEqual('b+',bB.get());
        assert.deepEqual(9,eB.get());
    }, groupB, aB, bB, eB);

});
test("bindAll", () => {
    let testee = Options('v', {def1 : 1, def2: 2});
    let frp = new Frp();

    let valB = testee.bindAll(frp, {v: 6, def1: 7});

    frp.attach(valB);

    assert.deepEqual(valB.unsafeMetaGet().get(),{v: 6, def1: 7, def2: 2});

});

test("bindWithStatusIfNotGood", () => {
    let testee = Options('v', {def1 : 1, def2: 2, def3:3});
    let frp = new Frp();
    let vB = frp.createNotReadyB();
    let def1B = frp.createMetaB(BStatus.errors(["error"]))
    let def3B = frp.createB(8);

    let bound = testee.bindWithStatusIfNotGood(frp, {v: vB, def1: def1B, def2: 5, def3:def3B});

    let out  = {
        v: bound.v(),
        def1: bound.def1(),
        def2: bound.def2(),
        def3: bound.def3(),
    };
    frp.attach(out.v);
    frp.attach(out.def1);
    frp.attach(out.def2);
    frp.attach(out.def3);

    assert.deepEqual(out.v.unsafeMetaGet(), BStatus.notReady());
    assert.deepEqual(out.def1.unsafeMetaGet(), BStatus.errors(["error"]));
    assert.deepEqual(out.def2.unsafeMetaGet().get(), 5);
    assert.deepEqual(out.def3.unsafeMetaGet().get(), 8);


    frp.accessTrans(() => {
        out.v.set(2);
    }, out.v);

    assert.deepEqual(vB.unsafeMetaGet().get(), 2);

});

test("OptionsMultiAttach", () => {

    let frp = new Frp();

    let testee = Options({'add' : {callback:undefined, text: 'Add'}});
    let cbB1 = frp.createB(1);
    let cbB2 = frp.createB(2);
    let val1 = testee.add({callback:cbB1}).struct();
    let val2 = testee.add({callback:cbB2}).struct();
    let addB1 = testee.bind(frp,val1).add();
    let addB2 = testee.bind(frp,val2).add();

    let ocbB1 = structs.get('callback', addB1);
    let ocbB2 = structs.get('callback', addB2);

    frp.attach(ocbB1);
    frp.attach(ocbB2);

    assert.equal(ocbB1.unsafeMetaGet().get(),1);
    assert.equal(ocbB2.unsafeMetaGet().get(),2);



});

test("Options", () => {

    let frp = new Frp();

    let testee = Options({'a' : 'xxx'}, 'b', {'d ( x ,y,z) ' : {x: 1, y : 2, z : 3}});

    let val = testee.a('xxx').b(1).d(3,4,5).struct();
    assert.deepEqual(val, {a: 'xxx', b : 1, d_x: 3, d_y : 4, d_z : 5 });

    val = testee.b(1).struct();
    assert.deepEqual(val, {b : 1});

    // let aB = testee.bind(frp, val).a();

    let bound = testee.bind(frp, val);
    let aB = bound.a();

    let bB = bound.b();
    frp.attach(aB);
    frp.attach(bB);

    assert.equal('xxx',aB.unsafeMetaGet().get());
    assert.equal(1,bB.unsafeMetaGet().get());

    aB = testee.bind (frp, {b : 1, d_x : 1, d_y : 2, d_z : 3}).a();
    frp.attach(aB);
    assert.equal('xxx',aB.unsafeMetaGet().get());

    aB = testee.bind (frp, frp.createB({b : 1})).a();
    frp.attach(aB);
    assert.equal('xxx',aB.unsafeMetaGet().get());

    aB = testee.bind (frp, {b : frp.createB(1)}).a();
    frp.attach(aB);
    assert.equal('xxx',aB.unsafeMetaGet().get());

    assert.throws(function () {
        testee.a('xxx').struct();
    }, (err:Error) => {
        assert.equal(err.message, "missing argument");
        return true;
    });


    testee = Options({'a' : 1, b: 2}, 'c');
    let strB =  testee.c(4).a(7).struct();
    bound = testee.bind(frp, strB);

    aB = bound.a();
    bB = bound.b();

    frp.attach(aB);
    frp.attach(bB);

    assert.equal(7, aB.unsafeMetaGet().get());
    assert.equal(2, bB.unsafeMetaGet().get());
    // let B = recoil.ui.widgets.SelectorWidget.options.name('fred').get();
});
