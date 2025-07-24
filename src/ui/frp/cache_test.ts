import assert from 'assert/strict';
import test from 'node:test';
import {BStatus, Frp} from "../../frp/frp";
import {Cache} from "./cache"

test("Cache", () => {
    var frp = new Frp();
    var b = frp.createNotReadyB();
    var c = frp.createNotReadyB();
    var cache = new Cache('v1');
    cache.clear();
    var cachedB = cache.get("key1", b);

    frp.attach(cachedB);
    assert.deepEqual(BStatus.notReady(), cachedB.unsafeMetaGet());
    frp.accessTrans(function () {
        b.set({a:1});
    },b );
    assert.deepEqual({a:1}, cachedB.unsafeMetaGet().get());
    frp.accessTrans(function () {
        cachedB.set({a:2});
    }, cachedB);
    assert.deepEqual({a:2}, cachedB.unsafeMetaGet().get());
    
    var cached1B = cache.get("key1", c);
    frp.attach(cached1B);
    assert.deepEqual({a:2}, cached1B.unsafeMetaGet().get());
    

//    assertObjectEquals({a:1}, cachedB.unsafeMetaGet().get());

    
    
});


