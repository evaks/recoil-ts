import {
    flatten,
    flattenMeta,
    get,
    getSubset,
    StructBehaviour,
    StructBehaviourOrType,
    StructType
} from "../../frp/struct";

import {Behaviour, Frp} from "../../frp/frp";
import struct from "../../frp/struct";

interface AttachableWidget {
    attachStruct(val: StructBehaviourOrType):void
}

type RemainingType = { [index: string]: (string | StructType) };


function forEachParam(args:(StructType|string)[], cb:(param:string, def:StructType) => void) {
    for (let name of args) {
        for (let func of makeFunctionParams(name)) {
            for(let param of func.params) {
                cb(param, func.def[param]);
            }
        }
    }
}
const DATA = Symbol("DATA");
export class BoundOptionsType {
    [index: string]: () => Behaviour<any>;
    [DATA]:{ optionsB: StructBehaviour, params: (string|StructType)[] };

    constructor(params:(string|StructType)[],optionsB: StructBehaviour) {
        this[DATA] = {optionsB,params};
    }

    /**
     * get all the fields specified fields as a struct, the main use
     * of this is to reduce amount of behaviours in the system as opposed to breaking up
     * each
     * @template T
     * @param {!Array} fields
     * @param {function(Object):T=} opt_lift lift function you could do this with a liftB however
     * since we are trying to reduce behaviours I have added it
     * @param {function(T):!Object=} opt_inv
     * @return {!recoil.frp.Behaviour<T>}
     */
    getGroup<T>(fields:string[], opt_lift?:(v:StructType) => T, opt_inv?: (v:T) => StructType): Behaviour<T> {
        let defs: StructType = {};
        const data = this[DATA];
        forEachParam(data.params, (param, def) =>{
            for (let field of fields) {
                if (param === field) {
                    defs[param] = def;
                }
            }
        });

        return getSubset(data.optionsB, defs, opt_lift, opt_inv);
    }

}

export class UnboundOptionsType {
    private setFunctions: Map<string, (...args: any[]) => UnboundOptionsType>;
    private struct_: StructType;

    [key: string]: any;

    constructor(remaining: RemainingType, struct: StructType, setFunctions: Map<string, (...args: any[]) => UnboundOptionsType>) {
        this.setFunctions = setFunctions;
        this.struct_ = struct;
        for (let [key, value] of setFunctions) {
            this[key] = value;
        }
    }

    struct(): StructType {
        checkRemaining(this.remaining);
        return this.struct_;
    }

    attach(widget: AttachableWidget) {
        checkRemaining(this.remaining);
        widget.attachStruct(this.struct_);
    }



}


export class OptionsType extends UnboundOptionsType {
    private args: (string | StructType)[];

    constructor(remaining: RemainingType, struct: StructType,
                setFunctions: Map<string, (...args: any[]) => UnboundOptionsType>,
                args: (string | StructType)[]) {
        super(remaining, struct, setFunctions);
        this.args = args;
    }

    /**
     *
     * @param {!recoil.frp.Frp} frp
     * @param {!recoil.frp.Behaviour<!Object>|!Object} val
     * @return {!Object<string,?>}
     */
    bind(frp: Frp, val:StructBehaviourOrType) {
        let optionsB = flatten(frp, val);
        optionsB.setName('bindOptionsB');
        let res = new BoundOptionsType(this.args, optionsB);

        forEachParam(this.args, (param, def)=> {
            res[param] = function () {
                return get(param, optionsB, def);
            };
        });
        return res;
    };

    /**
     * will just return behaviour will all the values
     *
     * @param {!recoil.frp.Frp} frp
     * @param {!recoil.frp.Behaviour<!Object>|!Object} val
     * @return {!recoil.frp.Behaviour<!Object>}
     */
    bindAll(frp: Frp, val: StructBehaviourOrType): Behaviour<StructType> {
        let optionsB = flatten(frp, val);
        return frp.liftBI((v) => {
            v = {...v};
            for (let name of this.args) {
                for (let func of makeFunctionParams(name)) {
                    for (let param of func.params) {
                        if (!v.hasOwnProperty(param)) {
                            v[param] = func.def[param];
                        }
                    }
                }
            }
            return v;
        }, (v: StructType) => {
            optionsB.set(v);
        }, optionsB);
    }

    /**
     *
     * @param {!recoil.frp.Frp} frp
     * @param {!recoil.frp.Behaviour<!Object>|!Object} val
     * @return {!Object}
     */
    bindKeepMeta(frp: Frp, val: StructBehaviourOrType): {[index:string]: (() => any)} {
        let optionsB = flattenMeta(frp, val);
        let res:{[index:string]: (() => any)} = {};
        for (let name of this.args) {

            for (let func of makeFunctionParams(name)) {
                for (let param of func.params) {
                    res[param] = function () {
                        return struct.getMeta(param, optionsB, func.def[param]);
                    }
                }
            }

        }
        return res;
    };

}

function checkRemaining(remaining: any) {
    for (var i in remaining) {
        if (!(remaining[i] instanceof Object)) {
            throw 'missing argument';
        }
    }

}

function mkSetFunc(inStruct: StructType, inRemaining: RemainingType, name:any, params:string[]): ((...args: any[]) => UnboundOptionsType) {
    return (...var_vals: any[]): UnboundOptionsType => {
        let struct = {...inStruct};
        let remaining = {...inRemaining};

        delete remaining[name];

        if (name instanceof Object) {
            for (var n in name) {
                struct[n] = var_vals;
            }
        } else {
            if (var_vals.length !== params.length) {
                throw 'Invalid number of arguments';
            }
            for (let i = 0; i < var_vals.length; i++) {
                struct[params[i]] = var_vals[i];
            }
        }
        let getFunctions = new Map<string, (...args: any[]) => UnboundOptionsType>();

        for (let name1 in remaining) {
            makeFunctionParams(remaining[name1]).forEach(function (func) {
                getFunctions.set(func.name, mkSetFunc(struct, remaining, func.name, func.params));
            });
        }
        return new UnboundOptionsType(remaining, struct, getFunctions);
    };
}

/**
 * This is a utility that creates an object that will do some checking on structs
 * passed to widgets in the widgets create a constant like so:
 *
 * var options = recoil.frp.Util.Options('a', {b : 'def1', c: 'def'}, 'x(a,b)');
 *
 * when using it to create the structure do the following
 * var struct = options.a(1).x(2,4).b('fish');
 *
 * the values passed can be normal values or behaviours.
 *
 * then either do
 *
 * struct.attach(widget) or struct.attachStruct(struct.struct()) to attach the data
 *
 * in the widget to access the values do the following
 *
 * var bound = options.bind(struct);
 *
 * the to access the behaviours, that will have defaults populated do:
 *
 * var valB = bound.a(); to access a
 *
 * the following describes the format the var_options parameter, their can be any number of them
 * and as long as the names don't clash it should work
 *
 * all identifiers should be valid javascript identifies for ease of use
 *
 * there are 3 types of values that var_options can have:
 *
 * 1. simple string e.g. 'value', this means the user must specify the item as no default is provided
 * 2. function e.g. 'render(button, menu)' this requires the user of the widget to provide all the parameters
 *             this is useful when groups of parameters must be specified together.
 *             The values can be accessed inside the widget in this example by bound.render_button and bound.render_menu
 * 3. An object, this provides a mechanism for specifying defaults, the keys can be like 1 and 2 and the default values are
 *               the values, you can either specify multiple keys in 1 object or multiple object parameters.
 *               To specify defaults of functions (type 2) the default should be an object with fields matching the parameters
 *
 * @param {...(string|!Object)} var_options
 * @return {!recoil.frp.Util.OptionsType} this has dynamic fields based on the parameters, and struct, attach, and bind function
 *
 */

export function Options(...options: (string | StructType)[]) : OptionsType {
    let remaining: RemainingType = {};
    let k = 0;

    let getFunctions = new Map<string, (...args: any[]) => UnboundOptionsType>();


    let setFuctions = new Map<string, any>();
    for (let option of options) {
        for (let func of makeFunctionParams(options)) {
            remaining[func.name] = option;
        }
    }
    // this has to be in a different loop because we need to make a clone
    // of remaining, if we do it first the clone will not be correct

    for (let option of options) {
        for (let func of makeFunctionParams(options)) {
            getFunctions.set(func.name, mkSetFunc({}, remaining, func.name, func.params));
        }
    }

    return new OptionsType({}, remaining, setFuctions, options);
}

type ParamInfo = { name: string, params: string[], def: StructType };

/**
 * @param name
 * @param opt_defVal
 * @return
 */
function makeFunctionParams(name: StructType | string, opt_defVal?: any): ParamInfo[] {
    if (name instanceof Object) {
        let objRes = [];
        for (let n in name) {
            for (let p of makeFunctionParams(n, name[n])) {
                objRes.push(p);
            }
        }
        return objRes;
    }


    let defMap: StructType = {};
    name = name.trim();

    let startIndex = name.indexOf('(');
    if (startIndex !== -1 || name.endsWith(')')) {

        let prefix = name.substring(0, startIndex).trim();
        let params = name.substring(startIndex + 1, name.length - 1);
        let paramArr = params.split(',');
        let res = [];
        for (let p of paramArr) {
            p = p.trim();
            res.push(prefix + '_' + p);
            if (opt_defVal) {
                if (!opt_defVal.hasOwnProperty(p)) {
                    throw 'you must specify ' + p;
                }
                defMap[prefix + '_' + p] = opt_defVal[p];
            }
        }
        return [{name: prefix, params: res, def: defMap}];
    } else {
        if (opt_defVal !== undefined) {
            defMap[name] = opt_defVal;
        }
        return [{name: name, params: [name], def: defMap}];
    }
}
