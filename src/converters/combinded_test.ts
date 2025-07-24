import assert from "node:assert/strict";
import test from "node:test"
import {IPv4AddressConverter} from "./ipv4addressconverter";
import {And} from "./combined";
import {UnconvertType} from "./typeconverter";
import {Message} from "../ui/message";

test("and converter", () => {
    let testee = new And<number, string>({
        convert(val: number): string {
            return val.toString();
        },
        unconvert(val: string): UnconvertType<number> {
            try {
                return {value: parseInt(val)};
            }
            catch (e:any) {
                return {error:Message.toMessage(e.message)}
            }
        }
    }, {
        convert(val: number): string {
            return "this doesn't matter"
        },
        unconvert(val: string): UnconvertType<number> {
            if (val === "7") {
                return {error:Message.toMessage("7 not allowed")};
            }
            return {value: parseInt(val) + 1};
        }
    });

    assert.equal(testee.unconvert("1").value,1);
    assert.equal(testee.unconvert("1").error === undefined, true);
    assert.equal(testee.unconvert("7").error?.toString(), "7 not allowed");
});

test("Convert", ()=> {
    let testee = new IPv4AddressConverter();
    assert.equal(testee.convert([1,2,3,255]), "1.2.3.255");
});