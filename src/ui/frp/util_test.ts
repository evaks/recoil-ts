import assert from "assert/strict";
import test from "node:test";

import {Options} from "./util";
import {Frp} from "../../frp/frp";

const structs = require("../ui/frp/struct");


test("GroupBind()", () => {

    const frp = new Frp();
    let testee = Options({'a' : 1, 'b': 2, c:3, d:4, e:2});
    let aB = frp.createB('a-');
    let bB = frp.createB('b-');
    let eB = frp.createB(3);
    let bound = testee.bind(frp, {a:aB, b: bB, e: eB});
    let groupB = bound.getGroup([bound.a, bound.b, bound.c, bound.e], function (x) {x.e = x.e + 1;return x;},  function (x) {x.e = x.e - 1;return x;});


    frp.attach(groupB);
    assert.deepEqual({a:'a-',b:'b-', c: 3, e: 4},groupB.unsafeMetaGet().get());

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
    assert.fail("todo")
});

test("bindKeepMeta", () => {
    assert.fail("todo")
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
    }, "missing argument");


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
