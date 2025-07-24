// Copyright 2012 The Closure Library Authors. All Rights Reserved.
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
import {expect, test} from '@jest/globals';

import classlist from "./classlist";
import {TagName} from "./tags";


test("get", () => {
  let el = document.createElement(TagName.DIV);
  expect(classlist.get(el).length).toStrictEqual(0);
  el.className = 'C';
  expect(classlist.get(el)).toStrictEqual(['C']);
  el.className = 'C D';
  expect(classlist.get(el)).toStrictEqual(['C', 'D']);
  el.className = 'C\nD';
  expect(classlist.get(el)).toStrictEqual(['C', 'D']);
  el.className = ' C ';
  expect(classlist.get(el)).toStrictEqual(['C']);

})

test("ContainsWithNewlines", ()=> {

  let p1 = document.createElement("p");
  p1.setAttribute("class", "SOMECLASS OTHERCLASS");
  p1.id = "p1";
  let el = p1;

  expect( classlist.contains(el, 'SOMECLASS')).toBe(true);
  expect(classlist.contains(el, 'OTHERCLASS')).toBe(true);
  expect( classlist.contains(el, 'WEIRDCLASS')).toBe(false);
});

test("ContainsCaseSensitive", ()=>  {

  let p2 = document.createElement("p");
  p2.setAttribute("class", "camelCase");
  p2.id = "p2";
  let el = p2;
  expect( classlist.contains(el, 'camelcase')).toBe(false);
   expect( classlist.contains(el, 'CAMELCASE')).toBe(false);
  expect( classlist.contains(el, 'camelCase')).toBe(true);
});

test("AddNotAddingMultiples", ()=> {
  let el = document.createElement(TagName.DIV);
  classlist.add(el, 'A');
  expect(el.className).toBe('A');
  classlist.add(el, 'A');
  expect(el.className).toBe('A');
  classlist.add(el, 'B');
  expect(el.className).toBe('A B');
});

test("AddCaseSensitive", ()=> {
  let el = document.createElement(TagName.DIV);
  classlist.add(el, 'A');
  expect(classlist.contains(el, 'A')).toBe(true);
  expect(classlist.contains(el, 'a')).toBe(false);
  classlist.add(el, 'a');
  expect(classlist.contains(el, 'A')).toBe(true);
  expect(classlist.contains(el, 'a')).toBe(true);
  expect(el.className).toBe('A a');
});

test("AddAll", ()=> {
  let elem = document.createElement(TagName.DIV);
  elem.className = 'foo goog-bar';

  classlist.addAll(elem, ['goog-baz', 'foo']);
  expect(classlist.get(elem).length).toBe(3); 
  expect(classlist.contains(elem, 'foo')).toBe(true);
  expect(classlist.contains(elem, 'goog-bar')).toBe(true);
  expect(classlist.contains(elem, 'goog-baz'));
});

test("AddAllEmpty", ()=> {
  let classes = 'foo bar';
  let elem = document.createElement(TagName.DIV);
  elem.className = classes;

  classlist.addAll(elem, []);
  expect(elem.className).toBe(classes);
});

test("Remove", ()=> {
  let el = document.createElement(TagName.DIV);
  el.className = 'A B C';
  classlist.remove(el, 'B');
  expect(el.className).toBe('A C');
});

test("RemoveCaseSensitive", ()=> {
  let el = document.createElement(TagName.DIV);
  el.className = 'A B C';
  classlist.remove(el, 'b');
  expect(el.className).toBe('A B C');
});

test("RemoveAll", ()=> {
  let elem = document.createElement(TagName.DIV);
  elem.className = 'foo bar baz';

  classlist.removeAll(elem, ['bar', 'foo']);
  expect(classlist.contains(elem, 'foo')).toBe(false);
  expect(classlist.contains(elem, 'bar')).toBe(false);
  expect(classlist.contains(elem, 'baz')).toBe(true);
});

test("RemoveAllOne", ()=> {
  let elem = document.createElement(TagName.DIV);
  elem.className = 'foo bar baz';

  classlist.removeAll(elem, ['bar']);
  expect(classlist.contains(elem, 'bar')).toBe(false);
  expect(classlist.contains(elem, 'foo')).toBe(true);
  expect(classlist.contains(elem, 'baz')).toBe(true);
});

test("RemoveAllSomeNotPresent", ()=> {
  let elem = document.createElement(TagName.DIV);
  elem.className = 'foo bar baz';

  classlist.removeAll(elem, ['a', 'bar']);
  expect(classlist.contains(elem, 'foo')).toBe(true);
  expect(classlist.contains(elem, 'bar')).toBe(false);
  expect(classlist.contains(elem, 'baz')).toBe(true);
});

test("RemoveAllCaseSensitive", ()=> {
  let elem = document.createElement(TagName.DIV);
  elem.className = 'foo bar baz';

  classlist.removeAll(elem, ['BAR', 'foo']);
  expect(classlist.contains(elem, 'foo')).toBe(false);
  expect(classlist.contains(elem, 'bar')).toBe(true);
  expect(classlist.contains(elem, 'baz')).toBe(true);
});

test("Enable", ()=> {

  let p1 = document.createElement("p");
  p1.setAttribute("class", "SOMECLASS OTHERCLASS");
  p1.id = "p1";
  let el = p1;


  classlist.set(el, 'SOMECLASS FIRST');

  expect( classlist.contains(el, 'FIRST')).toBe(true);
  expect( classlist.contains(el, 'SOMECLASS')).toBe(true);

  classlist.enable(el, 'FIRST', false);

  expect( classlist.contains(el, 'FIRST')).toBe(false);
  expect( classlist.contains(el, 'SOMECLASS')).toBe(true);

  classlist.enable(el, 'FIRST', true);

  expect( classlist.contains(el, 'FIRST')).toBe(true);
  expect( classlist.contains(el, 'SOMECLASS')).toBe(true);
});

test("EnableNotAddingMultiples", ()=> {
  let el = document.createElement(TagName.DIV);
  classlist.enable(el, 'A', true);
  expect(el.className).toBe('A');
  classlist.enable(el, 'A', true);
  expect(el.className).toBe('A');
  classlist.enable(el, 'B', true);
  expect(el.className).toBe('A B');
});

test("EnableAllRemove", ()=> {
  let elem = document.createElement(TagName.DIV);
  elem.className = 'foo bar baz';

  // Test removing some classes (some not present).
  classlist.enableAll(elem, ['a', 'bar'], false);
  expect(classlist.contains(elem, 'foo')).toBe(true);
  expect(classlist.contains(elem, 'bar')).toBe(false);
  expect(classlist.contains(elem, 'baz')).toBe(true);
  expect(classlist.contains(elem, 'a')).toBe(false);
});

test("EnableAllAdd", ()=> {
  let elem = document.createElement(TagName.DIV);
  elem.className = 'foo bar';

  // Test adding some classes (some duplicate).
  classlist.enableAll(elem, ['a', 'bar', 'baz'], true);
  expect(classlist.contains(elem, 'foo')).toBe(true);
  expect(classlist.contains(elem, 'bar')).toBe(true);
  expect(classlist.contains(elem, 'baz')).toBe(true);
  expect(classlist.contains(elem, 'a')).toBe(true);
});

test("Swap", ()=> {

  let p1 = document.createElement("p");
  p1.setAttribute("class", "SOMECLASS OTHERCLASS");
  p1.id = "p1";
  let el = p1;

  classlist.set(el, 'SOMECLASS FIRST');

  expect(classlist.contains(el, 'FIRST')).toBe(true);
  expect(classlist.contains(el, 'SOMECLASS')).toBe(true);
  expect(classlist.contains(el, 'second')).toBe(false);

  classlist.swap(el, 'FIRST', 'second');

  expect( classlist.contains(el, 'FIRST')).toBe(false);
  expect( classlist.contains(el, 'SOMECLASS')).toBe(true);
  expect( classlist.contains(el, 'second')).toBe(true);

  classlist.swap(el, 'second', 'FIRST');

  expect( classlist.contains(el, 'FIRST')).toBe(true);
  expect( classlist.contains(el, 'SOMECLASS')).toBe(true);
  expect( classlist.contains(el, 'second')).toBe(false);
});

test("Toggle()", () => {

  let p1 = document.createElement("p");
  p1.setAttribute("class", "SOMECLASS OTHERCLASS");
  p1.id = "p1";
  let el = p1;


  classlist.set(el, 'SOMECLASS FIRST');

  expect( classlist.contains(el, 'FIRST')).toBe(true);
  expect( classlist.contains(el, 'SOMECLASS')).toBe(true);

  let ret = classlist.toggle(el, 'FIRST');

  expect( classlist.contains(el, 'FIRST')).toBe(false);
  expect( classlist.contains(el, 'SOMECLASS')).toBe(true);
  expect(ret).toBe(false);

  ret = classlist.toggle(el, 'FIRST');

  expect( classlist.contains(el, 'FIRST')).toBe(true);
  expect( classlist.contains(el, 'SOMECLASS')).toBe(true);
  expect( ret).toBe(true);
});

test("AddRemoveString()", () => {
  let el = document.createElement(TagName.DIV);
  el.className = 'A';

  classlist.addRemove(el, 'A', 'B');
  expect(el.className).toBe('B');

  classlist.addRemove(el, 'Z', 'C');
  expect(el.className).toBe('B C');

  classlist.addRemove(el, 'C', 'D');
  expect(el.className).toBe('B D');

  classlist.addRemove(el, 'D', 'B');
  expect(el.className).toBe('B');
});
