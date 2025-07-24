import test from "node:test";
import assert from "node:assert";
import {
    DefaultStringConverter,
    MinLength,
    NullStringConverter,
    RegExpConverter,
    TrimStringConverter
} from "./stringconverter";
import {Message} from "../ui/message";
import {StructType} from "../frp/struct";
import {Messages} from "../ui/messages";


test("default converter", () => {
    let testee = new DefaultStringConverter();

    assert.equal("bob", testee.convert("bob"));
    assert.equal("", testee.convert(null as any));
    assert.equal("", testee.convert(undefined as any));

    assert.deepEqual({value: "bob"}, testee.unconvert("bob"))


});



test("null converter", () => {
    const wrongMsg = Message.toMessage("wrong");
    let testee = new NullStringConverter<StructType>({
       unconvert(val: string): { error: Message}|{ value: StructType } {
           if (val === "wrong") {
               return {error:wrongMsg}
           }
           return {value: {a: val}}
       },
       convert(val: StructType): string {
           return val.a;
       }
   });

   assert.equal(testee.convert({a: "x"}), "x");
   assert.equal(testee.convert(null), "");
   assert.deepEqual(testee.unconvert(""), {value: null});
   assert.deepEqual(testee.unconvert("y"), {value: {a:"y"}});
   assert.deepEqual(testee.unconvert("wrong"), {error:wrongMsg});


});

test("reg converter", () => {
    let testee = new RegExpConverter(/^[a-z]+$/);

    assert.equal(testee.convert("bob"), "bob");
    assert.deepEqual(testee.unconvert("bob"), {value: "bob"});
    assert.equal(testee.unconvert("Bob")?.error?.toString(), Messages.INVALID_VALUE_0.toString({val:"Bob"}));
});

test("min length converter", () => {
    let testee = new MinLength(3);

    assert.equal(testee.convert("bob"), "bob");
    assert.deepEqual(testee.unconvert("bob"), {value: "bob"});
    assert.equal(testee.unconvert("bo")?.error?.toString(), Messages.MUST_BE_AT_LEAST_0_CHARACTORS.toString({n: 3}));

});

test("trim converter", () => {
    let testee = new TrimStringConverter();

    assert.equal(testee.convert("bob"), "bob");
    assert.equal(testee.convert(" bob "), " bob ");
    assert.deepEqual(testee.unconvert("bob"), {value: "bob"});
    assert.deepEqual(testee.unconvert(" bob"), {value: "bob"});
    assert.deepEqual(testee.unconvert("bob "), {value: "bob"});

});