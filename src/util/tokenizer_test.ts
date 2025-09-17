import test from "node:test";
import {assertEquals, assertNull, assertObjectEquals} from "../test.ts";
import {ExpParser, Tokenizer} from "./tokenizer.ts";


test("Brackets", ()=> {

    
    let testee = new Tokenizer();

    assertObjectEquals([{type:'('},
			{type:')'}
                 ], testee.tokenize(' ()'));
});

test("Number", () => {
    
    let testee = new Tokenizer();
    assertObjectEquals([{type:'('},
                  {type:'num', value:'123.1'}
                 ], testee.tokenize(' (123.1'));

    assertObjectEquals([{type:'num', value:'123.1'},
			{type: '/'},
			{type: 'num', value: '60'}
                       ], testee.tokenize('123.1 / 60'));
    
    assertObjectEquals([{type:'('},
                  {type:'('},
                  {type:'num', value:'123.1'},
                  {type:'*'},
                  {type:'num', value:'2'},
                  {type:')'},
                  {type:'+'},
                  {type:'num', value:'13'},
                  {type:')'},
                 ], testee.tokenize(' ((123.1 * 2) + 13)'));
});

test("Invalid",()=> {
    
    let testee = new Tokenizer();
    assertNull(testee.tokenize(' @ (123.1'));

    assertNull(testee.tokenize('123.1.1'));
});

test("Identifiers", ()=> {
    
    let testee = new Tokenizer();
    assertObjectEquals([{type:'ident', value: 'xyz1'}],
		       testee.tokenize('xyz1'));
});


test("EvalPlus", () => {
    
    let testee = new ExpParser();
    assertEquals(2, testee.eval(' 1 + 1'));
});

test("EvalDiv", () => {
    
    let testee = new ExpParser();
    assertEquals(1, testee.eval(' 1 / 1'));
    assertEquals(1, testee.eval(' 11 % 10'));

});

test("EvalBracket", () => {
    
    let testee = new ExpParser();
    assertEquals(10, testee.eval('(2+3)*2'));
});


test("EvalCeil", () => {
    
    let testee = new ExpParser();
    assertEquals(-1, testee.eval('-ceil(1+ floor(0.95))'));
    assertEquals(1, testee.eval('ceil(1+ floor(0.95))'));
});


test("EvalUnaryNeg", () => {
    
    let testee = new ExpParser();
    assertEquals(2, testee.eval(' 1 + - + - + 1'));
});

test("EvalPow", () => {
    
    let testee = new ExpParser();
    assertEquals(0.125, testee.eval('2 ^ -3'));
    assertEquals(32, testee.eval('2 ^ 5'));
});

test("EvalFuncs", () => {

    let testee = new ExpParser();
    assertEquals(4, testee.eval('sqrt(16)'));
    assertEquals(3, testee.eval('root(27,3)'));
    assertEquals(1, testee.eval('min(4,3, 1)'));
    assertEquals(4, testee.eval('max(1,2,3,4)'));
});
