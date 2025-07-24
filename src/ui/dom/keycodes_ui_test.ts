// Copyright 2010 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {KeyCodes} from "./keycodes";
import {expect} from "@jest/globals";
import {userAgent} from "./useragent";
import {PropertyReplacer} from "../../PropertyReplacer";
import {StructType} from "../../frp/struct";

let stubs: PropertyReplacer|undefined;

beforeEach(()=> {
    stubs = new PropertyReplacer();
});

afterEach(()=> {
    stubs?.reset();
});

test('TextModifyingKeys', () => {
    let specialTextModifiers = new Set([
        KeyCodes.BACKSPACE, KeyCodes.DELETE, KeyCodes.ENTER, KeyCodes.MAC_ENTER,
        KeyCodes.TAB, KeyCodes.WIN_IME]);

    if (!userAgent.GECKO) {
        // @ts-ignore
        specialTextModifiers[KeyCodes.WIN_KEY_FF_LINUX] = 1;
    }

    for (let keyId in KeyCodes) {
        let key = (KeyCodes as StructType)[keyId];
        if (typeof key !== "number") {
            // skip static methods
            continue;
        }

        let fakeEvent = createEventWithKeyCode(key);

        if (KeyCodes.isCharacterKey(key) || (key in specialTextModifiers)) {
            expect(KeyCodes.isTextModifyingKeyEvent(fakeEvent)).toBe(true);
        } else {
            expect(KeyCodes.isTextModifyingKeyEvent(fakeEvent)).toBe(false);
        }
    }

    for (let i = KeyCodes.FIRST_MEDIA_KEY; i <= KeyCodes.LAST_MEDIA_KEY; i++) {
        let fakeEvent = createEventWithKeyCode(i);
        expect(KeyCodes.isTextModifyingKeyEvent(fakeEvent)).toBe(false);
    }
});

test("KeyCodeZero", () =>{
    let zeroEvent = createEventWithKeyCode(0);
    expect(KeyCodes.isTextModifyingKeyEvent(zeroEvent)).toBe(!userAgent.GECKO);
    expect(KeyCodes.isCharacterKey(0)).toBe(
        userAgent.WEBKIT || userAgent.EDGE);
});

test('PhantomKey', () => {
    // KeyCode 255 deserves its own test to make sure this does not regress,
    // because it's so weird. See the comments in the KeyCode enum.
    let fakeEvent = createEventWithKeyCode(KeyCodes.PHANTOM);
    expect(KeyCodes.isTextModifyingKeyEvent(fakeEvent)).toBe(false);
    expect(KeyCodes.isCharacterKey(fakeEvent)).toBe(false);
});

test('NonUsKeyboards', () => {
    let fakeEvent = createEventWithKeyCode(1092 /* Russian a */);
    expect(KeyCodes.isTextModifyingKeyEvent(fakeEvent)).toBe(true);
});

function createEventWithKeyCode(i:number) {
    let fakeEvent = new KeyboardEvent('keydown', {keyCode: i});
    fakeEvent.keyCode = i;
    return fakeEvent;
}

test('NormalizeGeckoKeyCode', () => {
    stubs?.set(userAgent, 'GECKO', true);

    // Test Gecko-specific key codes.
    expect(KeyCodes.EQUALS).toBe(KeyCodes.normalizeGeckoKeyCode(KeyCodes.FF_EQUALS));
    expect(KeyCodes.EQUALS).toBe(KeyCodes.normalizeKeyCode(KeyCodes.FF_EQUALS));

    expect(KeyCodes.SEMICOLON).toBe(KeyCodes.normalizeGeckoKeyCode(KeyCodes.FF_SEMICOLON));
    expect(KeyCodes.SEMICOLON).toBe(KeyCodes.normalizeKeyCode(KeyCodes.FF_SEMICOLON));

    expect(KeyCodes.META).toBe(KeyCodes.normalizeGeckoKeyCode(KeyCodes.MAC_FF_META));
    expect(KeyCodes.META).toBe(KeyCodes.normalizeKeyCode(KeyCodes.MAC_FF_META));

    expect(KeyCodes.WIN_KEY).toBe(KeyCodes.normalizeGeckoKeyCode(KeyCodes.WIN_KEY_FF_LINUX));
    expect(KeyCodes.WIN_KEY).toBe(KeyCodes.normalizeKeyCode(KeyCodes.WIN_KEY_FF_LINUX));

    // Test general key codes.
    expect(KeyCodes.COMMA).toBe(KeyCodes.normalizeGeckoKeyCode(KeyCodes.COMMA));
    expect(KeyCodes.COMMA).toBe(KeyCodes.normalizeKeyCode(KeyCodes.COMMA));
});

test('NormalizeMacWebKitKeyCode', () => {
    stubs?.set(userAgent, 'GECKO', false);
    stubs?.set(userAgent, 'MAC', true);
    stubs?.set(userAgent, 'WEBKIT', true);

    // Test Mac WebKit specific key codes.
    expect(KeyCodes.META).toBe(KeyCodes.normalizeMacWebKitKeyCode(KeyCodes.MAC_WK_CMD_LEFT));
    expect(KeyCodes.META).toBe(KeyCodes.normalizeKeyCode(KeyCodes.MAC_WK_CMD_LEFT));

    expect(KeyCodes.META).toBe(KeyCodes.normalizeMacWebKitKeyCode(KeyCodes.MAC_WK_CMD_RIGHT));
    expect(KeyCodes.META).toBe(KeyCodes.normalizeKeyCode(KeyCodes.MAC_WK_CMD_RIGHT));

    // Test general key codes.
    expect(KeyCodes.COMMA).toBe(KeyCodes.normalizeMacWebKitKeyCode(KeyCodes.COMMA));
    expect(KeyCodes.normalizeKeyCode(KeyCodes.COMMA)).toBe(KeyCodes.COMMA);
});
