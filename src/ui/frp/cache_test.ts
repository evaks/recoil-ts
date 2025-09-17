import assert from 'assert/strict';
import test from 'node:test';
import {BStatus, Frp} from "../../frp/frp.ts";
import {Cache} from "./cache.ts"

test("Cache", () => {
    let frp = new Frp();
    let b = frp.createNotReadyB();
    let c = frp.createNotReadyB();
    let cache = new Cache('v1');
    cache.clear();
    let cachedB = cache.get("key1", b);

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
    
    let cached1B = cache.get("key1", c);
    frp.attach(cached1B);
    assert.deepEqual({a:2}, cached1B.unsafeMetaGet().get());
    

//    assertObjectEquals({a:1}, cachedB.unsafeMetaGet().get());

    
    
});


