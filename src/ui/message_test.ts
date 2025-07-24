goog.provide('recoil.ui.messageTest');


goog.require('goog.testing.jsunit');
goog.require('recoil.ui.message');

goog.setTestOnly('recoil.ui.messageTest');

function testResolve() {
    assertEquals('hello world', recoil.ui.message.getParamMsg('hello ', ['val']).resolve({val:'world'}).toString());
}

function testFormatter() {
    assertEquals('hello 2!', recoil.ui.message.getParamMsg('hello ', {'val': function (v) {return (v + 1) + '!';}}).resolve({val:1}).toString());
}


function testInvalid() {
    assertThrows(function () {
        recoil.ui.message.getParamMsg('hello ', ['val','v']);
    });

    assertThrows(function () {
        recoil.ui.message.getParamMsg('hello ', {'val':'v'});
    });

    assertThrows(function () {
        recoil.ui.message.getParamMsg('hello ', {'val':function (){}, v1:function (){}});
    });
}
