(function(){
    function r(e,n,t){
        function o(i,f){
            if(!n[i]){if(!e[i]){
                var c="function"==typeof require&&require;
                if(!f&&c)return c(i,!0);
                if(u)return u(i,!0);
                var a=new Error("Cannot find module '"+i+"'");
                throw a.code="MODULE_NOT_FOUND",a
            }
            var p=n[i]= {exports:{}};
                e[i][0].call(p.exports,function(r){
                    var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)
            }
            return n[i].exports
        }
        for(var u="function"==typeof require&&require,i=0;i<t.length;i++)
            o(t[i]);
        return o
    }
    return r
})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidState = exports.NotInTransaction = exports.NoAccessors = exports.NotAttached = exports.LoopDetected = exports.NotInDom = void 0;
class NotInDom extends Error {
    constructor(node) {
        super("NotInDom");
        this.node = node;
    }
}
exports.NotInDom = NotInDom;
class LoopDetected extends Error {
    constructor() {
        super("Loop Detected");
    }
}
exports.LoopDetected = LoopDetected;
class NotAttached extends Error {
    constructor() {
        super("Not Attached");
    }
}
exports.NotAttached = NotAttached;
class NoAccessors extends Error {
    constructor() {
        super("No Accessors");
    }
}
exports.NoAccessors = NoAccessors;
class NotInTransaction extends Error {
    constructor() {
        super("Not In Transaction");
    }
}
exports.NotInTransaction = NotInTransaction;
class InvalidState extends Error {
    constructor() {
        super("Invalid State");
    }
}
exports.InvalidState = InvalidState;

},{}],2:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Behaviour = exports.BStatus = exports.EStatus = exports.Frp = void 0;
exports.isStatus = isStatus;
const uniquepriorityqueue_1 = require("../structs/uniquepriorityqueue");
const sequence_1 = __importDefault(require("../util/sequence"));
const object_1 = require("../util/object");
const exception_1 = require("../exception/exception");
const serialized_collections_1 = require("../structs/serialized_collections");
const array_1 = require("../structs/array");
const goog_1 = require("../util/goog");
class BehaviourIdMap extends serialized_collections_1.SerializedMap {
    constructor() {
        super(BehaviourIdMap.serializer);
    }
}
BehaviourIdMap.serializer = (key) => key.join();
class BehaviourIdSet extends serialized_collections_1.SerializedSet {
    constructor() {
        super(BehaviourIdMap.serializer);
    }
}
BehaviourIdSet.serializer = (key) => key.join();
class TraverseDirection {
    constructor(name, calc, comparator) {
        this.calc_ = calc;
        this.comparator_ = comparator;
    }
    calculate(behaviour, providers, dependents, nextItr) {
        return this.calc_(behaviour, providers, dependents, nextItr);
    }
    heapComparator() {
        return this.comparator_;
    }
}
class Frp {
    constructor() {
        this.transactionManager_ = new TransactionManager(this);
    }
    tm() {
        return this.transactionManager_;
    }
    /**
     * mark the behaviour that it is being used it will now receive update notifications
     */
    attach(behaviour) {
        this.transactionManager_.attach(behaviour);
    }
    /**
     * mark the behaviour that it is no longer being used it will not receive update notifications
     *
     */
    detach(behaviour) {
        this.transactionManager_.detach(behaviour);
    }
    ;
    static compareSeq_(a, b) {
        let len = a.length > b.length ? b.length : a.length;
        for (let i = 0; i < len; i++) {
            let res = a[i] - b[i];
            if (res !== 0n) {
                return res < 0n ? -1 : 1;
            }
        }
        if (a.length > b.length) {
            return -1;
        }
        if (a.length < b.length) {
            return 1;
        }
        return 0;
    }
    /**
     * sets the debugger interface for the frp engine
     * @param {recoil.frp.Debugger} dbugger
     */
    setDebugger(dbugger) {
        this.transactionManager_.debugger_ = dbugger;
    }
    ;
    addTransactionWatcher(cb) {
        this.transactionManager_.watchers_.push(cb);
    }
    ;
    /**
     * @param cb called with true if started false if ended
     */
    removeTransactionWatcher(cb) {
        (0, array_1.removeIf)(this.transactionManager_.watchers_, function (v) {
            return v === cb;
        });
    }
    ;
    /**
     * for debugging, if the debugger has paused the execution this resumes
     * it
     */
    resume() {
        this.transactionManager_.resume();
    }
    ;
    /**
     * @template T

     */
    createB(initial) {
        let metaInitial = new BStatus(initial);
        let newB = new Behaviour(this, metaInitial, undefined, undefined, this.transactionManager_.nextIndex(), []);
        return newB.setName('createB');
    }
    /**
     * helper function to create a behaviour that is not ready
     */
    createNotReadyB() {
        let metaInitial = BStatus.notReady();
        return new Behaviour(this, metaInitial, undefined, undefined, this.transactionManager_.nextIndex(), []);
    }
    /**
     * create a generator event set this value to send values up the tree
     */
    createE() {
        let metaInitial = EStatus.notReady(true);
        return new Behaviour(this, metaInitial, undefined, undefined, this.transactionManager_.nextIndex(), []);
    }
    createMetaB(initial) {
        return new Behaviour(this, initial, undefined, undefined, this.transactionManager_.nextIndex(), []);
    }
    createConstB(initial) {
        let metaInitial = new BStatus(initial);
        return new Behaviour(this, metaInitial, () => metaInitial, Frp.nullInvFunc_, this.transactionManager_.nextIndex(), []);
    }
    ;
    /**
     * allows access to behaviours and also puts the callback in a transaction
     * Warning: DO NOT USE When you just need access to a behaviour, since you will not
     * receive updates from the behaviour.
     * It should only  be used when an event external to the frp system needs to update the
     * behaviours.
     * E.g: a user clicks on an element and you want to set a value based on the behaviour.
     *
     * @return {?}
     */
    accessTrans(callback, ...behaviours) {
        let res = undefined;
        const func = function () {
            try {
                for (let b of behaviours) {
                    b.accessors_++;
                }
                res = callback.apply(null);
            }
            finally {
                for (let b of behaviours) {
                    b.accessors_--;
                }
            }
            return res;
        };
        return this.transactionManager_.doTrans(func);
    }
    /**
     * like access Trans however creates a function to this useful
     * for things like putting it in a callback
     *
     * @return {function(...)}
     */
    accessTransFunc(callback, ...var_behaviours) {
        let me = this;
        return (...curArgs) => {
            // this is so we can get the arguments into the inner function
            let func = () => {
                return callback.apply(me, curArgs);
            };
            return me.accessTrans.apply(this, [func, ...var_behaviours]);
        };
    }
    ;
    static access(callback, ...var_behaviours) {
        for (let i = 0; i < var_behaviours.length; i++) {
            if (!(var_behaviours[i] instanceof Behaviour)) {
                throw 'All arguments must be a behaviour';
            }
        }
        try {
            for (let i = 0; i < var_behaviours.length; i++) {
                var_behaviours[i].accessors_++;
            }
            callback();
        }
        finally {
            for (let i = 0; i < var_behaviours.length; i++) {
                var_behaviours[i].accessors_--;
            }
        }
    }
    /**
     * converts a behaviour that has a behaviour as its value, into a behaviour with the value of the inner behaviour
     * e.g. Behaviour<Behaviour<1>> -> Behaviour<1>
     * this is useful when you don't know what the inner behaviour is until some other behaviour(s) are updated
     * @template T
     * @return {T}
     */
    switchB(Bb) {
        let me = this;
        // the function is important here it lets us access behaviour we are setting
        let res1 = this.metaLiftBI(function () {
            let switchB = this;
            let metaBb = Bb.metaGet();
            let res = new BStatus(null);
            res.merge(metaBb);
            let b = null;
            me.transactionManager_.nestIds(Bb, () => {
                if (metaBb.value_ === null || !metaBb.good()) {
                    me.transactionManager_.updateProviders_(switchB, Bb);
                }
                else {
                    me.transactionManager_.updateProviders_(switchB, Bb, metaBb.get());
                    res.merge(metaBb);
                }
                b = metaBb.get();
            });
            if (b !== null && b !== undefined) {
                Frp.access(() => {
                    res.merge(b.metaGet());
                    res.set(b.get());
                }, b);
                return res;
            }
            return res;
        }, (val) => {
            // should not be able to do a switch b on an event
            let metaBb = Bb.metaGet();
            if (metaBb.value_ instanceof Behaviour) {
                metaBb.value_.metaSet(val);
            }
        }, Bb).setName('switchB');
        res1.isSwitch = true;
        return res1;
    }
    /**
     * calls function, arguments and return value should contain meta information
     */
    metaLiftB(func, ...var_args) {
        return this.metaLiftBI(func, undefined, ...var_args);
    }
    /**
     * similar to liftB however will be notified if object is changed back
     * to itself
     */
    observeB(func, ...var_args) {
        let res = this.metaLiftBI(func, undefined, ...var_args);
        res.notifyReset_ = true;
        return res;
    }
    ;
    metaLiftStatusI(func, invFunc, ...providers) {
        if (!(func instanceof Function)) {
            throw 'func must be function';
        }
        if (invFunc != undefined && !(invFunc instanceof Function)) {
            throw 'invFunc arg must be function';
        }
        if (providers.length == 0) {
            throw 'you must have at least 1 provider';
        }
        return new Behaviour(this, BStatus.notReady(), func, invFunc, this.transactionManager_.nextIndex(), providers).nameFunc(func, invFunc).setName('metaLiftStatusI');
    }
    /**
     * calls function, arguments and return value should contain meta information
     *
     *
     */
    metaLiftBI(func, invFunc, ...providers) {
        return this.metaLiftStatusI(func, invFunc, ...providers).setName('metaLiftBI');
    }
    /**
     * calls function, arguments and return value should contain meta information
     *
     */
    metaLiftEI(func, invFunc, ...providers) {
        return new Behaviour(this, EStatus.notReady(false), func, invFunc, this.transactionManager_.nextIndex(), providers);
    }
    /**
     * utility function lift without inverse
     * @param func gets called when provider behaviours change, arguments are the values of the behaviours provided in args
     * @param args behaviours used in calculating the value of func
     * @return a behaviour that contains the value that func calculates
     */
    liftB(func, ...args) {
        return this.liftBI(func, undefined, ...args);
    }
    /**
     * utilty to return a behaviour that acts like an event, the difference between events and behaviours
     * is that events are arrays of values that have happened in the transaction phase and get cleared after that
     *
     * @param func used to calculate the event that is returned
     * @param args inputs into the event
     */
    liftE(func, ...args) {
        return this.liftEI(func, undefined, ...args);
    }
    static nullFunc_() {
        return null;
    }
    /**
     * @private
     */
    static nullInvFunc_() {
    }
    ;
    /**
     *
     * Creates callback, this is basically a behaviour with only an inverse
     * the calculate function always returns true
     */
    createCallback(func, ...dependants) {
        let inv = function (arg, ...args) {
            return func.apply(this, [arg, ...args]);
        };
        return this.liftBI(Frp.nullFunc_, inv, ...dependants);
    }
    /**
     *
     * Creates callback, this is basically a behaviour with only an inverse
     * the calculate function always returns true, this differs from createCallback in that
     * the providers don't have to be good for it to be good
     */
    createGoodCallback(func, ...dependants) {
        // todo as any
        let inv = function (value, ...args) {
            return func.apply(this, [value, ...args]);
        };
        let b = this.metaLiftBI(() => new BStatus(true), inv, ...dependants);
        b.type = 'callback';
        return b;
    }
    /**
     * takes input behaviours and makes a new behaviour
     */
    liftBI(func, invFunc, ...behaviours) {
        return this.liftBI_(this.metaLiftBI, (() => new BStatus(null)), func, invFunc, ...behaviours);
    }
    /**
     * like liftBI except returns a Status, this is useful for calculation
     * errors, inputs are still guaranteed to be good
     */
    statusLiftBI(func, invFunc, ...var_args) {
        return this.liftBI_(this.metaLiftBI, null, func, invFunc, ...var_args);
    }
    ;
    /**
     * takes input behaviours and makes a new behaviour that stores an event
     */
    liftEI(func, invFunc, ...var_args) {
        // todo remove any
        return this.liftBI_(this.metaLiftBI, () => new EStatus(false), func, invFunc, ...var_args);
    }
    /**
     * creates an event from a behaviour, each time the behaviour changes
     * an event gets generated
     */
    changesE(valB) {
        return this.liftE(function (val) {
            return [val];
        }, valB);
    }
    ;
    mergeError(args, opt_result) {
        let metaResult = opt_result || new BStatus(null);
        let metaResultB = null;
        for (let i = 0; i < args.length; i++) {
            let metaArgVal = args[i];
            metaResult.merge(metaArgVal);
            if (metaArgVal instanceof BStatus) {
                if (metaResultB === null) {
                    metaResultB = new BStatus(null);
                }
                metaResultB.merge(metaArgVal);
            }
        }
        return metaResult;
    }
    /**
     * converts a value to a behaviour, if the value is already a behaviour
     * does nothing
     *
     */
    toBehaviour(value, opt_default) {
        if (value instanceof Behaviour) {
            return value;
        }
        else {
            if (opt_default !== undefined && value === undefined) {
                return this.createConstB(opt_default);
            }
            return this.createConstB(value);
        }
    }
    /**
     * func will fire if all dependant behaviours are good
     * or there is 1 ready event
     * @template RT
     * @private
     * @param liftFunc function to call every event or behaviour
     * @param statusFactory function to create an empty status
     * @param func
     * @param invFunc
     * @param var_args
     * @return behaviour that is calculated with func and reversed with invFunc
     */
    //metaLiftBI<T>(func: (this: Behaviour<T>, ...args: []) => BStatus<T>,
    //                   invFunc?: (v: BStatus<T>) => void,
    //                   ...providers: Behaviour<any>[]): Behaviour<T>
    /*
        private liftBI_<T, InvType, OutType, CalcType>(
            liftFunc: (func: (this: Behaviour<T,InvType, T>, ...args: []) => BStatus<CalcType>,
                       invFunc?: (v: BStatus<InvType>) => void,
                       ...providers: Behaviour<any>[])=> Behaviour<T>,
            statusFactory: null,
            func:((...args:any[])=> Status<any,T>), // this should return a status if statusFactory is null
            invFunc:((v:T, ...args:Behaviour<any>[])=> void)|undefined,
            ...var_args: Behaviour<any>[]):Behaviour<T, InvType, T>;
        private liftBI_<T, InvType, OutType, CalcType>(
            liftFunc: (func: (this: Behaviour<T, InvType, OutType, CalcType>, ...args: []) => BStatus<T,OutType>,
                       invFunc?: StatusFactoryFunc<T,InvType>,
                       ...providers: Behaviour<any>[])=> Behaviour<T, InvType, OutType, CalcType>,
            statusFactory: StatusFactoryFunc<T,OutType>,
            func:((...args:any[])=> CalcType), // this should return a status if statusFactory is null
            invFunc:InvAllStatusFunctionType<T,InvType>|undefined,
            ...var_args: Behaviour<any>[]):Behaviour<T, InvType, OutType, CalcType>;*/
    liftBI_(liftFunc, statusFactory, func, // this should return a status if statusFactory is null
    invFunc, ...var_args) {
        const outerArgs = [liftFunc, statusFactory, func, invFunc, ...var_args];
        const wrappedFunc = function () {
            let args = [];
            let metaResult = (statusFactory === null ? new BStatus(null) : statusFactory());
            let metaResultB = null; // the result of all the behaviours
            let eventReady = false;
            for (let i = 4; i < outerArgs.length; i++) {
                let metaArg = outerArgs[i];
                let metaArgVal = metaArg.metaGet();
                metaResult.merge(metaArgVal);
                if (metaArgVal instanceof BStatus) {
                    if (metaResultB === null) {
                        metaResultB = new BStatus(null);
                    }
                    metaResultB.merge(metaArgVal);
                }
                else {
                    eventReady = eventReady || metaArgVal.ready();
                }
                args.push(metaArg.get());
            }
            // fires if all provider behaviours a good
            // or we have an event that is ready, note this means
            if ((metaResultB !== null && metaResultB.good()) || eventReady) {
                try {
                    let result = func.apply(this, args);
                    if (statusFactory === null) {
                        // if status factory null then we expect the result a status object
                        metaResult = result;
                    }
                    else {
                        metaResult.set_(result);
                    }
                }
                catch (error) {
                    metaResult.addError(error);
                }
            }
            return metaResult;
        };
        let wrappedFuncInv = undefined;
        if (invFunc !== undefined) {
            wrappedFuncInv = function (val) {
                let args = [val.get()];
                for (let i = 4; i < outerArgs.length; i++) {
                    args.push(outerArgs[i]);
                }
                // todo remove any
                invFunc.apply(this, args);
            };
        }
        let newArgs = [wrappedFunc, wrappedFuncInv];
        for (let i = 4; i < outerArgs.length; i++) {
            newArgs.push(outerArgs[i]);
        }
        return liftFunc.apply(this, newArgs).nameFunc(func, invFunc);
    }
}
exports.Frp = Frp;
function isStatus(b) {
    return b instanceof BStatus || b instanceof EStatus;
}
/**
 * provides the status of the event, e.g. is it ready, or an error has occurred
 * events are cleared every pass off of the transaction, up or down
 * events are different than behaviours the contain a queue of values
 * @template T
 * @param generator if true this is only clears after up event
 * @constructor
 *
 */
class EStatus {
    constructor(generator, opt_values = []) {
        this.generator_ = generator;
        this.errors_ = [];
        this.values_ = opt_values;
    }
    /**
     */
    errors() {
        return this.errors_;
    }
    /**
     * events always good
     * @return {boolean}
     */
    good() {
        return true;
    }
    ;
    /**
     * creates a not ready event
     * if  generator is true this is only clears after up event
     */
    static notReady(generator) {
        return new EStatus(generator);
    }
    addError(error) {
        this.errors_.push(error);
    }
    ready() {
        return true;
    }
    get() {
        return this.values_;
    }
    ;
    addValue(value) {
        let values = [...this.values_];
        values.push(value);
        return new EStatus(this.generator_, values);
    }
    ;
    set(value) {
        this.values_.push(value);
        return this;
    }
    set_(value) {
        for (let i = 0; i < value.length; i++) {
            this.values_.push(value[i]);
        }
    }
    /**
     * combine this error and another to get a result
     */
    merge(other) {
        this.errors_.concat(other.errors());
    }
    clear_(dir) {
        if (dir === Direction.UP || !this.generator_) {
            this.errors_ = [];
            this.values_ = [];
        }
    }
    ;
}
exports.EStatus = EStatus;
/**
 *
 * provides the status of the behaviour, e.g. is it ready, or an error occurred
 *
 * outtype is the type we return for get
 */
class BStatus {
    constructor(initial) {
        this.errors_ = [];
        this.ready_ = true;
        this.value_ = initial;
    }
    ;
    static notReady() {
        let res = new BStatus(undefined);
        res.ready_ = false;
        return res;
    }
    static errors(errors) {
        let res = new BStatus(undefined);
        res.ready_ = true;
        res.errors_ = errors;
        return res;
    }
    /**
     * combine this error and another to get a result
     *
     */
    merge(other) {
        if (!other || !other.errors) {
            console.log('merging with non error');
        }
        if (!(other.errors instanceof Function)) {
            console.log('merging with non-status');
        }
        this.errors_ = this.errors_.concat(other.errors());
        this.ready_ = this.ready_ && ((other instanceof EStatus) || other.ready());
    }
    ;
    /**
     * set the value of the status
     */
    set(val) {
        this.value_ = val;
        return this;
    }
    ;
    set_(val) {
        this.value_ = val;
    }
    ;
    get() {
        return this.value_;
    }
    ;
    ready() {
        return this.ready_;
    }
    good() {
        return this.ready_ && this.errors_.length === 0;
    }
    errors() {
        return this.errors_;
    }
    addError(error) {
        this.errors_.push(error);
    }
}
exports.BStatus = BStatus;
/**
 *
 * CalcType is the type of the calculation of the calc function this can be different the type of the behaviour if it an
 *  event since that should be an array of T
 * OutType is the type get returns this can be an array of T if it is an event
 * @template T
 */
class Behaviour {
    constructor(frp, value, calc = undefined, inverse = undefined, sequence, providers) {
        this.accessors_ = 0;
        this.refListeners_ = [];
        this.frp_ = frp;
        this.notifyReset_ = false; // notify any dependants if this changes back to the value it was after a set
        let myValue = value;
        if (value === undefined) {
            console.log('SETTING UNDEFINED 3');
        }
        this.val_ = value;
        this.calc_ = calc || function () {
            return myValue;
        };
        if (!(this.calc_ instanceof Function)) {
            throw new Error('calc not function');
        }
        this.inv_ = inverse || function (newVal) {
            myValue = newVal;
        };
        if (!(this.inv_ instanceof Function)) {
            throw new Error('inverse not function');
        }
        // we have called set on this behaviour and we need to recalculate
        // all our dependants (maybe)
        this.dirtyUp_ = false;
        // this is value that was calculated before we set the new value
        this.dirtyUpOldValue_ = null;
        // we have set the value via metaSet and we need to inverse calculate
        this.dirtyDown_ = false;
        this.refs_ = {};
        this.seq_ = sequence;
        this.origSeq_ = this.seq_;
        if (providers) {
            providers.forEach(function (p) {
                if (!(p instanceof Behaviour)) {
                    throw new Error('provider not a behaviour');
                }
            });
        }
        this.refListeners_ = [];
        this.providers_ = providers || [];
        //    this.quickLoopCheck_();
        //    this.checkProvidersBefore_();
    }
    /**
     * the resulting behaviour will ignore all set
     */
    noInverseB() {
        return this.frp_.liftB(v => v, this);
    }
    ;
    /**
     * used for debugger gets the dependants of this behaviour
     */
    getDependants() {
        return this.frp_.tm().dependencyMap_.get(this.seq_) || [];
    }
    /**
     * allows naming of behaviours for debugging
     */
    setName(name) {
        this.name_ = name;
        return this;
    }
    /**
     * allows naming of behaviours for debugging
     */
    getName() {
        return this.name_ || '';
    }
    /**
     * for debugging this keeps track of the original functions
     * @template T
     */
    nameFunc(calc, inv) {
        this.srcCalc_ = calc;
        this.srcInv_ = inv;
        return this;
    }
    good() {
        return this.metaGet().good();
    }
    ;
    /**
     *  this is unique cannot be cloned
     */
    clone() {
        return this;
    }
    loopCheck(path) {
        if (path.has(this) !== undefined) {
            throw new exception_1.LoopDetected();
        }
        path = new Set(path);
        path.add(this);
        for (let prov of this.providers_) {
            prov.loopCheck(path);
        }
    }
    /**
     * utility function to ensures all our providers are before us
     * this is not called but may be useful for debugging purposes in the future
     */
    checkProvidersBefore_() {
        let comp = Direction.UP.heapComparator();
        for (let i = 0; i < this.providers_.length; i++) {
            let prov = this.providers_[i];
            if (comp(this, prov) <= 0) {
                throw new Error('provider not before');
            }
        }
    }
    ;
    /**
     * loopCheck is a bit slow when it comes to large amounts of
     * items this is a quicker version that assumes all the providers
     * do not have any loops so the only loop that can be introduced must point to source
     */
    quickLoopCheck_() {
        let stack = [];
        let seen = new BehaviourIdSet();
        for (let i = 0; i < this.providers_.length; i++) {
            stack.push(this.providers_[i]);
        }
        while (stack.length > 0) {
            let cur = stack.pop();
            if (cur === this) {
                throw new exception_1.LoopDetected();
            }
            if (seen.has(cur.seq_)) {
                continue;
            }
            seen.add(cur.seq_);
            for (let p of cur.providers_) {
                stack.push(p);
            }
        }
    }
    /**
     * deprecated this since we can just use a map behaviours now
     */
    getUniqId() {
        return this.origSeq_.join('.');
    }
    ;
    /**
     * a utility function to print out an frp node when it changes
     * @template T
     */
    debug(name) {
        let behaviour = this;
        let getDebug = (metaV) => {
            if (metaV.good()) {
                let val = metaV.get();
                if (val && val.toDebugObj) {
                    return val.toDebugObj();
                }
                else {
                    return val;
                }
            }
            return metaV;
        };
        return behaviour.frp().metaLiftStatusI(() => {
            if (behaviour.metaGet().good()) {
                console.log(name, 'calc', getDebug(behaviour.metaGet()));
            }
            else {
                console.log(name, 'calc (not good)', behaviour.metaGet());
            }
            return behaviour.metaGet();
        }, function (val) {
            console.log(name, 'inv', getDebug(val));
            behaviour.metaSet(val);
        }, behaviour).setName(name + 'metaLiftBI');
    }
    /**
     * return the associated frp engine
     */
    frp() {
        return this.frp_;
    }
    /**
     * this adds a listener when the that behaviours come in and out of use
     * it calls the callback with true when it goes into use and false when it stops being used
     *
     */
    refListen(callback) {
        this.refListeners_.push(callback);
    }
    getTm_() {
        return this.frp_.transactionManager_;
    }
    ;
    /**
     * @private
     * @param {boolean} hasRef
     */
    fireRefListeners_(hasRef) {
        let tm = this.getTm_();
        if (tm && tm.todoRefs_) {
            let myTodo = tm.todoRefs_.get(this.origSeq_);
            if (myTodo) {
                myTodo.end = hasRef;
            }
            else {
                tm.todoRefs_.set(this.origSeq_, { b: this, start: hasRef, end: hasRef });
            }
            return;
        }
        // since we can't get rid of a
        let len = this.refListeners_.length;
        for (let l of this.refListeners_) {
            // only fire if hasRef === this.hasRef()
            // if we commiting a transaction then we should really schedule this
            // do this by putting it in a map and firing at the end if  hasRef === this.hasRef()
            // also stop this from being re-entrant
            l(hasRef);
        }
        if (len !== this.refListeners_.length) {
            console.error('ref length changed');
        }
    }
    /**
     * increases the reference count
     * @return {boolean} true if count was zero
     *
     */
    addRefs_(manager, dependant, added) {
        if (dependant) {
            manager.addProvidersToDependencyMap(dependant, this);
        }
        let hadRefs = this.hasRefs();
        manager.watching_++;
        let curRefs = this.refs_[manager.id_];
        if (curRefs === undefined) {
            added.set(this.seq_, this);
            this.refs_[manager.id_] = {
                manager: manager,
                count: 1
            };
            for (let i = 0; i < this.providers_.length; i++) {
                this.providers_[i].addRefs_(manager, this, added);
            }
            if (!hadRefs) {
                this.fireRefListeners_(true);
            }
            return true;
        }
        else {
            this.refs_[manager.id_].count++;
            if (!hadRefs) {
                this.fireRefListeners_(true);
            }
            return false;
        }
    }
    /**
     * decreases the reference count
     * @return true if count was zero
     */
    removeRefs_(manager, dependant, removed) {
        if (dependant) {
            manager.removeProvidersFromDependencyMap(dependant, this);
        }
        let curRefs = this.refs_[manager.id_];
        manager.watching_--;
        if (curRefs === undefined || curRefs.count < 1) {
            (0, goog_1.assert)(false, 'Behaviour ' + this.origSeq_ + ' removing reference when not referenced');
        }
        else if (curRefs.count === 1) {
            delete this.refs_[manager.id_];
            removed.set(this.seq_, this);
            for (let i = 0; i < this.providers_.length; i++) {
                this.providers_[i].removeRefs_(manager, this, removed);
            }
            if (!this.hasRefs()) {
                this.fireRefListeners_(false);
            }
            return true;
        }
        else {
            this.refs_[manager.id_].count--;
            return false;
        }
    }
    /**
     * increases the reference count
     * @param manager the current transaction manager to add a ref for
     * @param  count this can add more than 1 used internally
     * @return  true if count was zero
     *
     */
    addRef(manager, count = 1) {
        let hadRefs = this.hasRefs();
        manager.watching_ += count;
        let curRefs = this.refs_[manager.id_];
        if (curRefs === undefined) {
            this.refs_[manager.id_] = {
                manager: manager,
                count: count
            };
            if (!hadRefs) {
                this.fireRefListeners_(true);
            }
            return true;
        }
        else {
            this.refs_[manager.id_].count += count;
            if (!hadRefs) {
                this.fireRefListeners_(true);
            }
            return false;
        }
    }
    /**
     * @return {boolean}
     *
     */
    hasRefs() {
        for (let prop in this.refs_) {
            if (this.refs_.hasOwnProperty(prop)) {
                return true;
            }
        }
        return false;
    }
    ;
    /**
     * gets the reference count for the transaction manager
     *
     */
    getRefs(manager) {
        const curRefs = this.refs_[manager.id_];
        if (curRefs === undefined) {
            return 0;
        }
        return curRefs.count;
    }
    /**
     * gets the reference count for the transaction manager
     *
     */
    forEachManager_(callback) {
        for (let idx in this.refs_) {
            callback(this.refs_[idx].manager);
        }
    }
    unsafeMetaGet() {
        return this.val_;
    }
    /**
     * @return {T}
     */
    get() {
        let meta = this.metaGet();
        if (meta instanceof BStatus || meta instanceof EStatus) {
            return meta.get();
        }
        // should not happen
        return null;
    }
    metaGet() {
        let hasTm = this.hasRefs();
        let hasProviders = this.providers_.length > 0;
        if (!hasTm && hasProviders) {
            // if it has providers then it is not ok to set it with no
            // transaction manager attached
            throw new exception_1.NotAttached();
        }
        if (this.accessors_ === 0) {
            // if providers are feeding into me then it is NOT ok just to set the value
            throw new exception_1.NoAccessors();
        }
        return this.val_;
    }
    metaSet(value) {
        let hasTm = this.hasRefs();
        let hasProviders = this.providers_.length > 0;
        if (!value) {
            throw new Error('value must be of type status');
        }
        if (!hasTm && hasProviders) {
            // if it has providers then it is not ok to set it with no
            // transaction manager attached
            throw new exception_1.NotAttached();
        }
        if (hasProviders && this.accessors_ === 0) {
            // if providers are feeding into me then it is NOT ok just to set the value
            throw new exception_1.NoAccessors();
        }
        if (hasTm) {
            let hasTransaction = false;
            this.forEachManager_(function (manager) {
                hasTransaction = hasTransaction || manager.level_ > 0;
            });
            if (!hasTransaction) {
                throw new exception_1.NotInTransaction();
            }
        }
        let me = this;
        if (!(0, object_1.isEqual)(value, me.val_)) {
            if (hasTm) {
                if (!this.dirtyUp_) {
                    this.dirtyUp_ = true;
                    this.dirtyUpOldValue_ = this.val_;
                }
                me.dirtyDown_ = true;
                if (value === undefined) {
                    console.error('SETTING UNDEFINED');
                }
                me.val_ = value;
                me.forEachManager_(function (manager) {
                    manager.addPending_(Direction.UP, me);
                    manager.addPending_(Direction.DOWN, me);
                });
            }
            else {
                // we don't have a transaction we are simple
                // and nobody is listening so just set my value
                // and calculate down
                if (value === undefined) {
                    console.error('SETTING UNDEFINED');
                }
                me.val_ = value;
                if (value instanceof BStatus) {
                    // events don't do this they get cleared anyway
                    // so if you are not in a transaction leave it
                    me.inv_(value);
                }
            }
        }
    }
    /**
     * used to debug setting
     */
    debugSet(v) {
        this.debugSet_ = v;
        return this;
    }
    set(value) {
        if (this.debugSet_) {
            console.log('setting', value);
        }
        if (this.val_ instanceof EStatus) {
            this.metaSet(this.val_.addValue(value));
        }
        else {
            this.metaSet(new BStatus(value));
        }
    }
    /**
     * a function to get dirty down providers, this is useful inorder to see what values have been set
     * in a callback
     */
    static getDirtyDown(dependants) {
        let res = new Set();
        for (let dep of dependants) {
            if (dep.dirtyDown_) {
                res.add(dep);
            }
        }
        return res;
    }
    /**
     * make an array of all providers of behaviour
     */
    static visit(behaviour, opt_stopSwitch = false) {
        let toDo = [{
                b: behaviour,
                path: {}
            }];
        let visited = new BehaviourIdMap();
        while (toDo.length > 0) {
            let cur = toDo.pop();
            if (cur.b === null) {
                console.log('behaviour is: ', cur.b);
            }
            if (visited.has(cur.b.seq_)) {
                continue;
            }
            visited.set(cur.b.seq_, cur.b);
            for (let prov = 0; prov < cur.b.providers_.length; prov++) {
                let provObj = cur.b.providers_[prov];
                // loop check seems to take a long time we shouldn't need it since
                // the constructor of the behaviour checks anyway
                //            if (cur.path[provObj.seqStr_] !== undefined) {
                //                throw new recoil.exception.LoopDetected();
                //            }
                //            let newPath = [...cur.path];
                //          newPath[provObj.seqStr_] = provObj;
                toDo.push({
                    b: provObj
                    //            path: newPath
                });
            }
        }
        return visited;
    }
    static upFunction(behaviour, providers, dependents, nextItr) {
        let oldVal = behaviour.val_;
        let getDirty = Behaviour.getDirtyDown;
        let params = [];
        // TODO put a loop around this so we get all events, take care if we clear the events
        // other behaviours may not get the events so we have to probably queue them unless
        // we consider an event as always a seqenence of events, then the lift just has to deal
        // with them this may allow more power to the function, alternatively events could just have
        // a sequence associated with them you only get one at a time, but this could be dealt with
        // outside the engine xxx
        providers.forEach(function (b) {
            params.push(b.metaGet());
        });
        let oldDirty = getDirty(behaviour.providers_);
        let newVal;
        if (behaviour.dirtyDown_) {
            // do nothing here. Calculating here is pointless since we need to recalc anyway
            // but ensure we calculate it next phase,
            // we have to temporarily set value back
            newVal = behaviour.val_;
            nextItr.push({ behaviour: behaviour, force: true });
            if (behaviour.dirtyUp_) {
                return [];
            }
        }
        else {
            newVal = behaviour.calc_.apply(behaviour, params);
            if (!newVal) {
                console.log('ERROR newVal should be status');
                behaviour.calc_.apply(behaviour, params);
            }
        }
        let newDirty = getDirty(behaviour.providers_);
        for (let prov of newDirty) {
            if (!oldDirty.has(prov)) {
                nextItr.push({ behaviour: prov, force: false });
            }
        }
        let res = [];
        if (behaviour.dirtyUp_ && (0, object_1.isEqual)(behaviour.dirtyUpOldValue_, newVal)) {
            if (behaviour.dirtyUpOldValue_ === undefined) {
                console.error('SETTING UNDEFINED 2');
            }
            if (dependents) {
                for (let i = 0; i < dependents.length; i++) {
                    let d = dependents[i];
                    if (d.notifyReset_) {
                        res.push(d);
                    }
                }
            }
            behaviour.val_ = behaviour.dirtyUpOldValue_ || BStatus.notReady();
        }
        else if (behaviour.dirtyUp_ || !(0, object_1.isEqual)(oldVal, newVal)) {
            if (newVal === undefined) {
                console.error('SETTING UNDEFINED 2');
            }
            behaviour.val_ = newVal;
            res = dependents;
        }
        behaviour.dirtyUpOldValue_ = null;
        behaviour.dirtyUp_ = false;
        return res;
    }
    static compareUpSeq(a, b) {
        return Frp.compareSeq_(a.seq_, b.seq_);
    }
    static compareDownSeq(a, b) {
        return Frp.compareSeq_(b.seq_, a.seq_);
    }
    static downFunction(behaviour, providers, dependants, nextItr) {
        const getDirty = Behaviour.getDirtyDown;
        let changedDirty = [];
        if (behaviour.dirtyDown_) {
            let oldDirty = getDirty(behaviour.providers_);
            let args = [behaviour.val_];
            for (let i = 0; i < behaviour.providers_.length; i++) {
                args.push(behaviour.providers_[i]);
            }
            try {
                behaviour.inv_.apply(behaviour, args);
            }
            catch (e) {
                console.error('error setting', e);
            }
            let newDirty = getDirty(behaviour.providers_);
            for (let prov of newDirty) {
                if (!oldDirty.has(prov)) {
                    changedDirty.push(prov);
                }
            }
            behaviour.dirtyDown_ = false;
        }
        return changedDirty;
    }
}
exports.Behaviour = Behaviour;
class TransactionManager {
    constructor(frp) {
        this.providers_ = [];
        this.level_ = 0;
        this.watching_ = 0;
        this.watchers_ = [];
        this.pending_ = [new uniquepriorityqueue_1.UniquePriorityQueue(Direction.UP.heapComparator()),
            new uniquepriorityqueue_1.UniquePriorityQueue(Direction.DOWN.heapComparator())];
        this.dependencyMap_ = new BehaviourIdMap();
        this.curIndex_ = new sequence_1.default();
        this.curIndexPrefix_ = [[]];
        this.curIndexLock_ = 0;
        this.id_ = TransactionManager.nextId_.next();
        this.frp_ = frp;
    }
    /**
     * used by debugger, returns all pending behaviours in the up direction
     *
     */
    getPendingUp() {
        return this.getPending_(Direction.UP).asArray();
    }
    ;
    /**
     * used by debugger, returns all pending behaviours in the down direction
     *
     */
    getPendingDown() {
        return this.getPending_(Direction.DOWN).asArray();
    }
    /**
     * for debug purposes returns the number of items we are watching
     */
    watching() {
        return this.watching_;
    }
    /**
     * this makes all ids generated sub ids of the current one I think this is wrong really we need it to be children of the
     * behaviour that depends on it TODO
     *
     * behaviour the parent behaviour all generated sequences will be less than this
     */
    nestIds(behaviour, callback) {
        let res;
        try {
            this.curIndexPrefix_.push(behaviour.seq_);
            res = callback();
        }
        finally {
            this.curIndexPrefix_.pop();
        }
        return res;
    }
    /**
     * stops new ids from being created, this will stop new behaviours from being created in inappropriate places such as
     * inverse functions
     *
     */
    lockIds_(callback) {
        try {
            this.curIndexLock_++;
            return callback();
        }
        finally {
            this.curIndexLock_--;
        }
    }
    /**
     * resumes the transaction after it has been paused by the debugger
     */
    resume() {
        if (this.debugState_) {
            this.debugPaused_ = false;
            let pending = this.debugState_.pendingTrans;
            this.debugState_.pendingTrans = [];
            if (this.transDone_()) {
                this.level_--;
                this.notifyWatchers_(false);
                for (let i = 0; i < pending.length; i++) {
                    this.doTrans(pending[i]);
                }
            }
            else {
                for (let i = 0; i < pending.length; i++) {
                    pending[i]();
                }
            }
        }
    }
    /**
     * notify the transaction watcher if a transaction is about to start

     */
    notifyWatchers_(start) {
        if (this.level_ === 0) {
            try {
                this.watchers_.forEach(function (cb) {
                    cb(start);
                });
            }
            catch (e) {
                console.error(e);
            }
        }
    }
    /**
     * to a transaction nothing should fire until we exit out the top level
     *
     * @param {function()} callback
     * @return {?}
     */
    doTrans(callback) {
        if (this.debugState_) {
            this.debugState_.pendingTrans.push(callback);
            return undefined;
        }
        this.notifyWatchers_(true);
        this.level_++;
        let res = undefined;
        try {
            res = callback();
        }
        finally {
            let decrement = true;
            try {
                if (this.level_ === 1) {
                    decrement = this.transDone_();
                }
            }
            finally {
                if (decrement) {
                    this.level_--;
                    this.notifyWatchers_(false);
                }
            }
        }
        return res;
    }
    /**
     * returns true if we should continue
     * finishes of the transaction if it at level 1, it performs behaviour tree traversal
     */
    transDone_() {
        let seen = true;
        while (seen) {
            seen = false;
            this.todoRefs_ = this.debugState_ ? this.debugState_.todoRefs_ : new BehaviourIdMap();
            let todo;
            try {
                this.propagateAll_();
            }
            finally {
                if (this.debugState_) {
                    this.debugState_.todo = this.todoRefs_;
                    this.todoRefs_ = undefined;
                    return false;
                }
                todo = this.todoRefs_;
                this.todoRefs_ = undefined;
            }
            if (todo) {
                for (let [_, ref] of todo) {
                    seen = true;
                    if (ref.start === ref.end) {
                        try {
                            ref.b.fireRefListeners_(ref.start);
                        }
                        catch (e) {
                            console.error(e);
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * generates the next index for behaviours
     */
    nextIndex() {
        let res = [...this.curIndexPrefix_[this.curIndexPrefix_.length - 1]];
        res.push(this.curIndex_.nextLong());
        return res;
    }
    ;
    getPending_(direction) {
        return this.pending_[Direction.UP === direction ? 0 : 1];
    }
    ;
    addPending_(direction, behaviour, opt_propogate = false) {
        this.getPending_(direction).push(behaviour);
        if (this.level_ === 0 && opt_propogate) {
            this.propagateAll_();
        }
    }
    ;
    /**
     * propagate the changes through the FRP tree, until no more changes
     *
     */
    propagateAll_() {
        let pendingDown = this.getPending_(Direction.DOWN);
        let pendingUp = this.getPending_(Direction.UP);
        let wasUp = false;
        let wasDown = false;
        while ((!pendingUp.isEmpty() || !pendingDown.isEmpty() || this.debugState_) && !this.debugPaused_) {
            if ((!pendingDown.isEmpty() && !wasDown && !this.debugState_) || (this.debugState_ && this.debugState_.dir === Direction.DOWN)) {
                this.propagate_(Direction.DOWN);
                wasUp = false;
                wasDown = true;
                continue;
            }
            if ((!pendingUp.isEmpty() && !wasUp && !this.debugState_) || (this.debugState_ && this.debugState_.dir === Direction.UP)) {
                this.propagate_(Direction.UP);
                wasUp = true;
                wasDown = false;
                continue;
            }
            wasUp = false;
            wasDown = false;
        }
    }
    /**
     * propagate the changes through the FRP tree, the direction is if it is going up or down
     *
     */
    propagate_(dir) {
        let pendingHeap = this.getPending_(dir);
        let nextPending = this.debugState_ ? this.debugState_.nextPending : new uniquepriorityqueue_1.UniquePriorityQueue(dir.heapComparator());
        let visited = this.debugState_ ? this.debugState_.visited : new Set();
        let cur = this.debugState_ ? this.debugState_.cur : pendingHeap.pop();
        let prev = null;
        let me = this;
        let heapComparator = dir.heapComparator();
        while (cur !== undefined) {
            // calculate changed something
            let deps;
            let getDeps;
            let nextItr = [];
            let args;
            if (this.debugState_) {
                getDeps = this.debugState_.getDeps;
                nextItr = this.debugState_.nextItr;
                args = this.debugState_.args;
                delete this.debugState_;
                this.debugPaused_ = false;
                this.debugState_ = null;
            }
            else {
                const ccur = cur;
                let accessFunc = () => {
                    if (dir === Direction.UP) {
                        deps = me.nestIds(ccur, () => dir.calculate(ccur, ccur.providers_, me.dependencyMap_.get(ccur.seq_), nextItr));
                    }
                    else {
                        deps = me.lockIds_(() => dir.calculate(ccur, ccur.providers_, me.dependencyMap_.get(ccur.seq_), nextItr));
                    }
                };
                args = [accessFunc, cur];
                for (let i = 0; i < cur.providers_.length; i++) {
                    args.push(cur.providers_[i]);
                }
                if (this.debugger_ && !this.debugger_.preVisit(cur, dir === Direction.UP)) {
                    this.debugPaused_ = true;
                    this.debugState_ = {
                        args: args,
                        visited: visited,
                        dir: dir,
                        cur: cur,
                        nextItr: nextItr,
                        nextPending: nextPending,
                        // we need this because the deps comes from a different function invocation
                        getDeps: function () {
                            return deps;
                        },
                        pendingTrans: []
                    };
                    return;
                }
                getDeps = null;
            }
            try {
                Frp.access.apply(this, args);
                if (getDeps) {
                    deps = getDeps();
                }
            }
            finally {
                if (this.debugger_) {
                    this.debugger_.postVisit(cur);
                }
            }
            let delayed = false;
            for (let i = 0; i < nextItr.length && !delayed; i++) {
                delayed = nextItr[i].force && nextItr[i].behaviour === cur;
            }
            if (!delayed) {
                visited.add(cur);
            }
            if (deps) {
                for (let dep of deps) {
                    pendingHeap.push(dep);
                }
            }
            for (let it of nextItr) {
                let next = pendingHeap.remove(it.behaviour);
                if (next) {
                    nextPending.push(next);
                }
                else if (it.force) {
                    nextPending.push(it.behaviour);
                }
            }
            prev = cur;
            cur = pendingHeap.pop();
        }
        // put this on for later
        cur = nextPending.pop();
        while (cur !== undefined) {
            pendingHeap.push(cur);
            cur = nextPending.pop();
        }
        this.clearEvents_(dir, visited);
    }
    ;
    /**
     * clear all event data after a pass
     */
    clearEvents_(dir, visited) {
        for (let b of visited) {
            let meta = b.unsafeMetaGet();
            if (meta instanceof EStatus) {
                meta.clear_(dir);
            }
        }
    }
    /**

     * helper function to add the inverse mapping provider to list of dependants
     */
    addProvidersToDependencyMap(b, opt_provider = undefined) {
        let me = this;
        let doAdd = (prov) => {
            let deps = me.dependencyMap_.get(prov.seq_);
            if (deps === undefined) {
                deps = [b];
                me.dependencyMap_.set(prov.seq_, deps);
            }
            else {
                if (deps.indexOf(b) === -1) {
                    deps.push(b);
                }
            }
        };
        if (opt_provider) {
            doAdd(opt_provider);
        }
        else {
            b.providers_.forEach(doAdd);
        }
    }
    ;
    /**
     * helper function to remove the inverse mapping provider to list of dependants
     */
    removeProvidersFromDependencyMap(b, opt_provider = null) {
        const doRemove = (prov) => {
            let deps = this.dependencyMap_.get(prov.seq_);
            if (deps !== undefined) {
                // TODO what about the same provider twice? i think it ok
                // because we always use visited so we only ever count
                // each child once
                for (let i = 0; i < deps.length; i++) {
                    if (deps[i] === b) {
                        deps.splice(i, 1);
                        break;
                    }
                }
                if (deps.length === 0) {
                    this.dependencyMap_.delete(prov.seq_);
                }
            }
        };
        if (opt_provider) {
            doRemove(opt_provider);
        }
        else {
            b.providers_.forEach(doRemove);
        }
    }
    /**
     * mark the behaviour that it is being used it will now receive update notifications
     *
     */
    attach(...behaviours) {
        for (let behaviour of behaviours) {
            if (!(behaviour instanceof Behaviour)) {
                throw 'you can only attach to a behaviour';
            }
            // if this is a keyed behaviour that is not already in the attached
            // behaviours and there already exists a behaviour TODO what if we attached
            // but not at the top level
            let newStuff = this.getPending_(Direction.UP);
            this.doTrans(() => {
                let added = new BehaviourIdMap();
                behaviour.addRefs_(this, null, added);
                for (let [id, b] of added) {
                    newStuff.push(b);
                }
            });
        }
    }
    /**
     * update the dependence of the behaviour
     */
    updateProviders_(dependant, ...var_providers) {
        let oldProviders = [...dependant.providers_];
        dependant.providers_ = [...var_providers];
        dependant.providers_.forEach(function (v) {
            if (!(v instanceof Behaviour)) {
                throw new Error('provider not a behaviour in switch for ' + dependant.origSeq_);
            }
        });
        let oldProvMap = new BehaviourIdMap();
        let newProvMap = new BehaviourIdMap();
        let removed = new BehaviourIdMap();
        let added = new BehaviourIdMap();
        if (dependant.hasRefs()) {
            for (let p of oldProviders) {
                oldProvMap.set(p.seq_, p);
            }
            for (let p of dependant.providers_) {
                newProvMap.set(p.seq_, p);
            }
            for (let [seq, b] of oldProvMap) {
                if (!newProvMap.has(seq)) {
                    b.removeRefs_(this, dependant, removed);
                }
            }
            for (let [seq, b] of newProvMap) {
                if (!oldProvMap.has(seq)) {
                    b.addRefs_(this, dependant, added);
                }
            }
        }
        for (let [idx, rem] of removed) {
            let add = added.get(idx);
            if (!added.has(idx)) {
                this.removePending_(rem);
            }
        }
        let pending = this.getPending_(Direction.UP);
        for (let [idx, add] of added) {
            let rem = removed.get(idx);
            if (!rem) {
                pending.push(add);
            }
        }
        // if the providers have changed then we need to recalculate the dependant
        // even just the order
        if (oldProviders.length !== dependant.providers_.length) {
            pending.push(dependant);
        }
        else {
            for (let i = 0; i < oldProviders.length; i++) {
                if (oldProviders[i] !== dependant.providers_[i]) {
                    pending.push(dependant);
                    break;
                }
            }
        }
        this.ensureProvidersBefore_(dependant, new BehaviourIdSet());
        // dependant.checkProvidersBefore_();
        dependant.quickLoopCheck_();
    }
    /**
     * make sure that all providers and providers of those providers have a lower
     * sequence number than b, this will also re-queue and update the dependency map
     * of all providers that have changed
     *
     **/
    ensureProvidersBefore_(b, visited) {
        let curSeq = b.seq_;
        if (visited.has(b.seq_)) {
            return;
        }
        visited.add(b.seq_);
        for (let i = 0; i < b.providers_.length; i++) {
            let p = b.providers_[i];
            if (Frp.compareSeq_(b.seq_, p.seq_) < 0) {
                // not consistent renumber the provider
                visited.add(p.seq_);
                this.changeSequence_(b, p);
                this.ensureProvidersBefore_(p, visited);
            }
        }
    }
    /**
     * changes the sequence number provider to be less than the sequence number of b
     */
    changeSequence_(b, provider) {
        let newSeq = this.nestIds(b, () => this.nextIndex());
        let oldSeq = provider.seq_;
        let up = this.getPending_(Direction.UP);
        let down = this.getPending_(Direction.DOWN);
        // remove this provider if it has pending changes because they will be out of order
        let hadUp = up.remove(provider);
        let hadDown = down.remove(provider);
        // change the provider
        provider.seq_ = newSeq;
        // update the dependency map
        let oldEntry = this.dependencyMap_.get(oldSeq);
        if (oldEntry) {
            this.dependencyMap_.delete(oldSeq);
            this.dependencyMap_.set(provider.seq_, oldEntry);
        }
        // put pending changes back with new sequence number
        if (hadUp) {
            up.push(provider);
        }
        if (hadDown) {
            down.push(provider);
        }
    }
    removePending_(behaviour) {
        const up = this.getPending_(Direction.UP);
        const down = this.getPending_(Direction.DOWN);
        up.remove(behaviour);
        down.remove(behaviour);
    }
    ;
    /**
     * mark the behaviour that it is no longer being used it will no longer recieve update notifications
     *
     */
    detach(behaviour) {
        this.doTrans(() => {
            let removed = new BehaviourIdMap();
            behaviour.removeRefs_(this, null, removed);
            for (let [idx, b] of removed) {
                // this may not account for 2 thing in the tree pointing to the
                // same thing
                b.dirtyDown_ = false;
                this.removePending_(b);
            }
        });
        //    console.log('Detach Watching = ', this.watching_);
    }
}
TransactionManager.nextId_ = new sequence_1.default();
class Direction {
}
/**
 * Up is from providers to behaviour
 *
 * @final
 */
Direction.UP = new TraverseDirection('up', Behaviour.upFunction, Behaviour.compareUpSeq);
/**
 * Down is from behaviour to providers
 *
 * @final
 */
Direction.DOWN = new TraverseDirection('down', Behaviour.downFunction, Behaviour.compareDownSeq);

},{"../exception/exception":1,"../structs/array":3,"../structs/serialized_collections":5,"../structs/uniquepriorityqueue":6,"../util/goog":29,"../util/object":30,"../util/sequence":31}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = remove;
exports.findIndex = findIndex;
exports.removeAt = removeAt;
exports.removeIf = removeIf;
function remove(arr, value) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === value) {
            arr.splice(i, 1);
        }
    }
}
function findIndex(arr, f, opt_obj = undefined) {
    let l = arr.length; // must be fixed during loop... see docs
    let arr2 = typeof arr === 'string' ? arr.split('') : arr;
    for (var i = 0; i < l; i++) {
        if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
            return i;
        }
    }
    return -1;
}
function removeAt(arr, i) {
    return arr.slice(i, 1).length == 1;
}
function removeIf(arr, f, opt_obj = undefined) {
    let i = findIndex(arr, f, opt_obj);
    if (i >= 0) {
        removeAt(arr, i);
        return true;
    }
    return false;
}

},{}],4:[function(require,module,exports){
"use strict";
// Copyright 2007 The Closure Library Authors. All Rights Reserved.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvlTree = void 0;
/**
 * @fileoverview Datastructure: AvlTree.
 *
 *
 * This file provides the implementation of an AVL-Tree datastructure. The tree
 * maintains a set of unique values in a sorted order. The values can be
 * accessed efficiently in their sorted order since the tree enforces an O(logn)
 * maximum height. See http://en.wikipedia.org/wiki/Avl_tree for more detail.
 *
 * The big-O notation for all operations are below:
 * <pre>
 *   Method                 big-O
 * ----------------------------------------------------------------------------
 * - add                    O(logn)
 * - remove                 O(logn)
 * - clear                  O(1)
 * - contains               O(logn)
 * - indexOf                O(logn)
 * - getCount               O(1)
 * - getMinimum             O(1), or O(logn) when optional root is specified
 * - getMaximum             O(1), or O(logn) when optional root is specified
 * - getHeight              O(1)
 * - getValues              O(n)
 * - inOrderTraverse        O(logn + k), where k is number of traversed nodes
 * - reverseOrderTraverse   O(logn + k), where k is number of traversed nodes
 * </pre>
 */
const object_1 = require("../util/object");
/**
 * String comparison function used to compare values in the tree. This function
 * is used by default if no comparator is specified in the tree's constructor.
 *
 * @param {T} a The first value.
 * @param {T} b The second value.
 * @return {number} -1 if a < b, 1 if a > b, 0 if a = b.
 * @template T
 * @const
 */
const DEFAULT_COMPARATOR = function (a, b) {
    if (String(a) < String(b)) {
        return -1;
    }
    else if (String(a) > String(b)) {
        return 1;
    }
    return 0;
};
class Node {
    /**
     * Constructs an AVL-Tree node with the specified value. If no parent is
     * specified, the node's parent is assumed to be null. The node's height
     * defaults to 1 and its children default to null.
     *
     */
    constructor(value, opt_parent = null) {
        this.value = value;
        this.parent = opt_parent;
        this.count = 1;
        this.left = null;
        this.right = null;
        this.height = 1;
    }
    isRightChild() {
        return !!this.parent && this.parent.right == this;
    }
    isLeftChild() {
        return !!this.parent && this.parent.left == this;
    }
    /**
     * Helper method to fix the height of this node (e.g. after children have
     * changed).
     */
    fixHeight() {
        this.height = Math.max(this.left ? this.left.height : 0, this.right ? this.right.height : 0) +
            1;
    }
}
;
class AvlTreeIterator {
    constructor(startNode, endNode) {
        this.node = startNode;
        this.prev = startNode && startNode.left ? startNode.left : startNode;
        this.endNode = endNode;
        this.seenEnd = false;
    }
    next() {
        while (this.node != null && !this.seenEnd) {
            this.seenEnd = this.seenEnd || this.endNode === this.node;
            if (this.node.left != null && this.node.left != this.prev && this.node.right != this.prev) {
                this.node = this.node.left;
            }
            else {
                let ret = null;
                if (this.node.right != this.prev) {
                    ret = {
                        done: false,
                        value: this.node.value
                    };
                }
                let temp = this.node;
                this.node =
                    this.node.right != null && this.node.right != this.prev ? this.node.right : this.node.parent;
                this.prev = temp;
                if (ret) {
                    return ret;
                }
            }
        }
        return {
            done: true
        };
    }
    [Symbol.iterator]() {
        return this;
    }
}
/**
 * Constructs an AVL-Tree, which uses the specified comparator to order its
 * values. The values can be accessed efficiently in their sorted order since
 * the tree enforces a O(logn) maximum height.
 *
 */
class AvlTree {
    constructor(opt_comparator, initialValues) {
        this.minNode_ = null;
        this.maxNode_ = null;
        this.comparator_ = opt_comparator || DEFAULT_COMPARATOR;
        this.root_ = null;
        if (initialValues !== undefined) {
            for (let v of initialValues) {
                this.add(v);
            }
        }
    }
    comparator() {
        return this.comparator_;
    }
    findLastNode(value) {
        if (value === undefined) {
            return null;
        }
        let endNode = null;
        this.traverse_(node => {
            let retNode = null;
            let comparison = this.comparator_(node.value, value);
            if (comparison > 0) {
                retNode = node.left;
            }
            else if (comparison < 0) {
                retNode = node.right;
                endNode = node;
            }
            else {
                endNode = node;
            }
            return retNode; // If null, we'll stop traversing the tree
        });
        return endNode;
    }
    from(startValue) {
        return this.range(startValue);
    }
    // returns an iterator
    range(startValue, endValue) {
        let startNode = null;
        if (this.root_ !== null && startValue !== undefined) {
            this.traverse_(node => {
                let retNode = null;
                let comparison = this.comparator_(node.value, startValue);
                if (comparison > 0) {
                    retNode = node.left;
                    startNode = node;
                }
                else if (comparison < 0) {
                    retNode = node.right;
                }
                else {
                    startNode = node;
                }
                return retNode; // If null, we'll stop traversing the tree
            });
        }
        else if (this.root_ !== null) {
            startNode = this.getMinNode_();
        }
        return new AvlTreeIterator(startNode, this.findLastNode(endValue));
    }
    [Symbol.iterator]() {
        return new AvlTreeIterator(this.getMinNode_(), null);
    }
    findFirst(value) {
        let found = null;
        this.inOrderTraverse((travNode) => {
            if (this.comparator_(travNode, value) === 0) {
                found = travNode;
            }
            return true;
        }, value);
        return found;
    }
    static height(node) {
        return node ? node.height : 0;
    }
    balanceFactor(node) {
        if (node) {
            let lh = node.left ? node.left.height : 0;
            let rh = node.right ? node.right.height : 0;
            return lh - rh;
        }
        return 0;
    }
    balance_(node) {
        let bf = this.balanceFactor(node);
        if (bf > 1) {
            if (this.balanceFactor(node.left) < 0) {
                this.leftRotate_(node.left);
            }
            return this.rightRotate_(node);
        }
        else if (bf < -1) {
            if (this.balanceFactor(node.right) > 0) {
                this.rightRotate_(node.right);
            }
            return this.leftRotate_(node);
        }
        return node;
    }
    /**
     * Recursively find the correct place to add the given value to the tree.
     *
     * @param {T} value
     * @param {!Node<T>} currentNode
     * @return {boolean}
     */
    addInternal_(value, currentNode) {
        let comparison = this.comparator_(value, currentNode.value);
        let added = false;
        if (comparison > 0) {
            if (currentNode.right) {
                added = this.addInternal_(value, currentNode.right);
            }
            else {
                currentNode.right = new Node(value, currentNode);
                added = true;
                if (currentNode == this.maxNode_) {
                    this.maxNode_ = currentNode.right;
                }
            }
        }
        else if (comparison < 0) {
            if (currentNode.left) {
                added = this.addInternal_(value, currentNode.left);
            }
            else {
                currentNode.left = new Node(value, currentNode);
                added = true;
                if (currentNode == this.minNode_) {
                    this.minNode_ = currentNode.left;
                }
            }
        }
        if (added) {
            currentNode.count++;
            currentNode.height =
                Math.max(AvlTree.height(currentNode.left), AvlTree.height(currentNode.right)) + 1;
            this.balance_(currentNode);
        }
        return added;
    }
    /**
     * Inserts a node into the tree with the specified value if the tree does
     * not already contain a node with the specified value. If the value is
     * inserted, the tree is balanced to enforce the AVL-Tree height property.
     *
     */
    add(value) {
        // If the tree is empty, create a root node with the specified value
        if (!this.root_) {
            this.root_ = new Node(value);
            this.minNode_ = this.root_;
            this.maxNode_ = this.root_;
            return true;
        }
        return this.addInternal_(value, this.root_);
    }
    static count(node) {
        return node ? node.count : 0;
    }
    /**
     * @return {{value: (T|null), root: ?Node<T>}} The value that was removed or
     *     null if nothing was removed in addition to the root of the modified
     *     subtree.
     */
    removeInternal_(value, currentNode) {
        if (!currentNode) {
            return { value: null, root: null };
        }
        let comparison = this.comparator_(currentNode.value, value);
        if (comparison > 0) {
            let removeResult = this.removeInternal_(value, currentNode.left);
            currentNode.left = removeResult.root;
            value = removeResult.value;
        }
        else if (comparison < 0) {
            let removeResult = this.removeInternal_(value, currentNode.right);
            currentNode.right = removeResult.root;
            value = removeResult.value;
        }
        else {
            value = currentNode.value;
            if (!currentNode.left || !currentNode.right) {
                // Zero or one children.
                let replacement = currentNode.left ? currentNode.left : currentNode.right;
                if (!replacement) {
                    if (this.maxNode_ == currentNode) {
                        this.maxNode_ = currentNode.parent;
                    }
                    if (this.minNode_ == currentNode) {
                        this.minNode_ = currentNode.parent;
                    }
                    return { value: value, root: null };
                }
                if (this.maxNode_ == currentNode) {
                    this.maxNode_ = replacement;
                }
                if (this.minNode_ == currentNode) {
                    this.minNode_ = replacement;
                }
                replacement.parent = currentNode.parent;
                currentNode = replacement;
            }
            else {
                value = currentNode.value;
                let nextInOrder = currentNode.right;
                // Two children. Note this cannot be the max or min value. Find the next
                // in order replacement (the left most child of the current node's right
                // child).
                this.traverse_(node => {
                    if (node.left) {
                        nextInOrder = node.left;
                        return nextInOrder;
                    }
                    return null;
                }, currentNode.right);
                currentNode.value = nextInOrder.value;
                let removeResult = this.removeInternal_(
                /** @type {?} */ nextInOrder.value, currentNode.right);
                currentNode.right = removeResult.root;
            }
        }
        currentNode.count = AvlTree.count(currentNode.left) + AvlTree.count(currentNode.right) + 1;
        currentNode.height =
            Math.max(AvlTree.height(currentNode.left), AvlTree.height(currentNode.right)) + 1;
        return { root: this.balance_(currentNode), value: value };
    }
    /**
     * Removes a node from the tree with the specified value if the tree contains a
     * node with this value. If a node is removed the tree is balanced to enforce
     * the AVL-Tree height property. The value of the removed node is returned.
     *
     * @param value Value to find and remove from the tree.
     * @return The value of the removed node or null if the value was not in
     *     the tree.
     * @override
     */
    remove(value) {
        let result = this.removeInternal_(value, this.root_);
        this.root_ = result.root;
        return result.value;
    }
    /**
     * Removes all nodes from the tree.
     */
    clear() {
        this.root_ = null;
        this.minNode_ = null;
        this.maxNode_ = null;
    }
    /**
     * Returns true if the tree contains a node with the specified value, false
     * otherwise.
     *
     * @param {T} value Value to find in the tree.
     * @return {boolean} Whether the tree contains a node with the specified value.
     * @override
     */
    contains(value) {
        // Assume the value is not in the tree and set this value if it is found
        let isContained = false;
        // Depth traverse the tree and set isContained if we find the node
        this.traverse_((node) => {
            let retNode = null;
            let comparison = this.comparator_(node.value, value);
            if (comparison > 0) {
                retNode = node.left;
            }
            else if (comparison < 0) {
                retNode = node.right;
            }
            else {
                isContained = true;
            }
            return retNode; // If null, we'll stop traversing the tree
        });
        // Return true if the value is contained in the tree, false otherwise
        return isContained;
    }
    /**
     * Returns the index (in an in-order traversal) of the node in the tree with
     * the specified value. For example, the minimum value in the tree will
     * return an index of 0 and the maximum will return an index of n - 1 (where
     * n is the number of nodes in the tree).  If the value is not found then -1
     * is returned.
     *
     * @param {T} value Value in the tree whose in-order index is returned.
     * @return {number} The in-order index of the given value in the
     *     tree or -1 if the value is not found.
     */
    indexOf(value) {
        // Assume the value is not in the tree and set this value if it is found
        let retIndex = -1;
        let currIndex = 0;
        // Depth traverse the tree and set retIndex if we find the node
        this.traverse_(node => {
            let comparison = this.comparator_(node.value, value);
            if (comparison > 0) {
                // The value is less than this node, so recurse into the left subtree.
                return node.left;
            }
            if (node.left) {
                // The value is greater than all of the nodes in the left subtree.
                currIndex += node.left.count;
            }
            if (comparison < 0) {
                // The value is also greater than this node.
                currIndex++;
                // Recurse into the right subtree.
                return node.right;
            }
            // We found the node, so stop traversing the tree.
            retIndex = currIndex;
            return null;
        });
        // Return index if the value is contained in the tree, -1 otherwise
        return retIndex;
    }
    /**
     * Returns the number of values stored in the tree.
     *
     * @return {number} The number of values stored in the tree.
     * @override
     */
    getCount() {
        return this.root_ ? this.root_.count : 0;
    }
    /**
     * Returns a k-th smallest value, based on the comparator, where 0 <= k <
     * this.getCount().
     * @param {number} k The number k.
     * @return {T} The k-th smallest value.
     */
    getKthValue(k) {
        if (k < 0 || k >= this.getCount()) {
            return null;
        }
        return this.getKthNode_(k).value;
    }
    /**
     * Returns the value u, such that u is contained in the tree and u < v, for all
     * values v in the tree where v != u.
     *
     * @return {T} The minimum value contained in the tree.
     */
    getMinimum() {
        let minNode = this.minNode_;
        this.getMinNode_();
        if (minNode == null) {
            throw new Error('AvlTree Empty');
        }
        return minNode.value;
    }
    ;
    /**
     * Returns the value u, such that u is contained in the tree and u > v, for all
     * values v in the tree where v != u.
     *
     * @return {T} The maximum value contained in the tree.
     */
    getMaximum() {
        let maxNode = this.maxNode_;
        this.getMaxNode_();
        if (maxNode == null) {
            throw new Error('AvlTree Empty');
        }
        return maxNode.value;
    }
    ;
    /**
     * Returns the height of the tree (the maximum depth). This height should
     * always be <= 1.4405*(Math.log(n+2)/Math.log(2))-1.3277, where n is the
     * number of nodes in the tree.
     *
     * @return {number} The height of the tree.
     */
    getHeight() {
        return this.root_ ? this.root_.height : 0;
    }
    ;
    /**
     * Inserts the values stored in the tree into a new Array and returns the Array.
     *
     * @return {!Array<T>} An array containing all of the trees values in sorted
     *     order.
     */
    getValues() {
        let ret = [];
        this.inOrderTraverse(function (value) { ret.push(value); });
        return ret;
    }
    ;
    /**
     * Performs an in-order traversal of the tree and calls `func` with each
     * traversed node, optionally starting from the smallest node with a value >= to
     * the specified start value. The traversal ends after traversing the tree's
     * maximum node or when `func` returns a value that evaluates to true.
     *
     * @param {Function} func Function to call on each traversed node.
     * @param {T=} opt_startValue If specified, traversal will begin on the node
     *     with the smallest value >= opt_startValue.
     */
    inOrderTraverse(func, opt_startValue) {
        // If our tree is empty, return immediately
        if (!this.root_) {
            return;
        }
        // Depth traverse the tree to find node to begin in-order traversal from
        /** @type {undefined|!Node} */
        let startNode;
        if (opt_startValue !== undefined) {
            this.traverse_(node => {
                let retNode = null;
                let comparison = this.comparator_(node.value, opt_startValue);
                if (comparison > 0) {
                    retNode = node.left;
                    startNode = node;
                }
                else if (comparison < 0) {
                    retNode = node.right;
                }
                else {
                    startNode = node;
                }
                return retNode; // If null, we'll stop traversing the tree
            });
            if (!startNode) {
                return;
            }
        }
        else {
            startNode = /** @type {!Node} */ (this.getMinNode_());
        }
        // Traverse the tree and call func on each traversed node's value
        let node = startNode;
        let prev = node.left ? node.left : node;
        while (node != null) {
            if (node.left != null && node.left != prev && node.right != prev) {
                node = node.left;
            }
            else {
                if (node.right != prev) {
                    if (func(node.value)) {
                        return;
                    }
                }
                let temp = node;
                node =
                    (node.right != null && node.right != prev ? node.right : node.parent);
                prev = temp;
            }
        }
    }
    /**
     * Performs a reverse-order traversal of the tree and calls `func` with
     * each traversed node, optionally starting from the largest node with a value
     * <= to the specified start value. The traversal ends after traversing the
     * tree's minimum node or when func returns a value that evaluates to true.
     *
     * @param func Function to call on each traversed node.
     * @param {T=} opt_startValue If specified, traversal will begin on the node
     *     with the largest value <= opt_startValue.
     */
    reverseOrderTraverse(func, opt_startValue) {
        // If our tree is empty, return immediately
        if (!this.root_) {
            return;
        }
        // Depth traverse the tree to find node to begin reverse-order traversal from
        let startNode;
        if (opt_startValue !== undefined) {
            this.traverse_((node) => {
                let retNode = null;
                let comparison = this.comparator_(node.value, opt_startValue);
                if (comparison > 0) {
                    retNode = node.left;
                }
                else if (comparison < 0) {
                    retNode = node.right;
                    startNode = node;
                }
                else {
                    startNode = node;
                }
                return retNode; // If null, we'll stop traversing the tree
            });
            if (!startNode) {
                return;
            }
        }
        else {
            startNode = this.getMaxNode_();
        }
        // Traverse the tree and call func on each traversed node's value
        let node = startNode, prev = startNode.right ? startNode.right : startNode;
        while (node != null) {
            if (node.right != null && node.right != prev && node.left != prev) {
                node = node.right;
            }
            else {
                if (node.left != prev) {
                    if (func(node.value)) {
                        return;
                    }
                }
                let temp = node;
                node = node.left != null && node.left != prev ? node.left : node.parent;
                prev = temp;
            }
        }
    }
    /**
     * Performs a traversal defined by the supplied `traversalFunc`. The first
     * call to `traversalFunc` is passed the root or the optionally specified
     * startNode. After that, calls `traversalFunc` with the node returned
     * by the previous call to `traversalFunc` until `traversalFunc`
     * returns null or the optionally specified endNode. The first call to
     * traversalFunc is passed the root or the optionally specified startNode.
     *
     * @param {function(
     *     this:AvlTree<T>,
     *     !Node<T>):?Node<T>} traversalFunc
     * Function used to traverse the tree.
     * @param {Node<T>=} opt_startNode The node at which the
     *     traversal begins.
     * @param {Node<T>=} opt_endNode The node at which the
     *     traversal ends.
     */
    traverse_(traversalFunc, opt_startNode, opt_endNode) {
        let node = opt_startNode ? opt_startNode : this.root_;
        let endNode = opt_endNode ? opt_endNode : null;
        while (node && node != endNode) {
            node = traversalFunc.call(this, node);
        }
    }
    /**
     * Performs a left tree rotation on the specified node.
     *
     * @param {!Node<T>} node Pivot node to rotate from.
     * @return {!Node<T>} New root of the sub tree.
     */
    leftRotate_(node) {
        // Re-assign parent-child references for the parent of the node being removed
        if (node.isLeftChild()) {
            node.parent.left = node.right;
            node.right.parent = node.parent;
        }
        else if (node.isRightChild()) {
            node.parent.right = node.right;
            node.right.parent = node.parent;
        }
        else {
            this.root_ = node.right;
            this.root_.parent = null;
        }
        // Re-assign parent-child references for the child of the node being removed
        let temp = node.right;
        node.right = node.right.left;
        if (node.right != null)
            node.right.parent = node;
        temp.left = node;
        node.parent = temp;
        // Update counts.
        temp.count = node.count;
        node.count -= (temp.right ? temp.right.count : 0) + 1;
        node.fixHeight();
        temp.fixHeight();
        return temp;
    }
    /**
     * Performs a right tree rotation on the specified node.
     *
     * @param {!Node<T>} node Pivot node to rotate from.
     * @return {!Node<T>} New root of the sub tree.
     */
    rightRotate_(node) {
        // Re-assign parent-child references for the parent of the node being removed
        if (node.isLeftChild()) {
            node.parent.left = node.left;
            node.left.parent = node.parent;
        }
        else if (node.isRightChild()) {
            node.parent.right = node.left;
            node.left.parent = node.parent;
        }
        else {
            this.root_ = node.left;
            this.root_.parent = null;
        }
        // Re-assign parent-child references for the child of the node being removed
        let temp = node.left;
        node.left = node.left.right;
        if (node.left != null)
            node.left.parent = node;
        temp.right = node;
        node.parent = temp;
        // Update counts.
        temp.count = node.count;
        node.count -= (temp.left ? temp.left.count : 0) + 1;
        node.fixHeight();
        temp.fixHeight();
        return temp;
    }
    /**
     * Returns the node in the tree that has k nodes before it in an in-order
     * traversal, optionally rooted at `opt_rootNode`.
     *
     * @param {number} k The number of nodes before the node to be returned in an
     *     in-order traversal, where 0 <= k < root.count.
     * @param {Node<T>=} opt_rootNode Optional root node.
     * @return {Node<T>} The node at the specified index.
     */
    getKthNode_(k, opt_rootNode) {
        let root = opt_rootNode || this.root_;
        let numNodesInLeftSubtree = root.left ? root.left.count : 0;
        if (k < numNodesInLeftSubtree) {
            return this.getKthNode_(k, root.left);
        }
        else if (k == numNodesInLeftSubtree) {
            return root;
        }
        else {
            return this.getKthNode_(k - numNodesInLeftSubtree - 1, root.right);
        }
    }
    /**
     * Returns the node with the smallest value in tree, optionally rooted at
     * `opt_rootNode`.
     *
     * @param {Node<T>=} opt_rootNode Optional root node.
     * @return {Node<T>} The node with the smallest value in
     *     the tree.
     */
    getMinNode_(opt_rootNode) {
        if (!opt_rootNode) {
            return this.minNode_;
        }
        let minNode = opt_rootNode;
        this.traverse_(function (node) {
            let retNode = null;
            if (node.left) {
                minNode = node.left;
                retNode = node.left;
            }
            return retNode; // If null, we'll stop traversing the tree
        }, opt_rootNode);
        return minNode;
    }
    ;
    /**
     * Returns the node with the largest value in tree, optionally rooted at
     * opt_rootNode.
     *
     * @param {Node<T>=} opt_rootNode Optional root node.
     * @return {Node<T>} The node with the largest value in
     *     the tree.
     */
    getMaxNode_(opt_rootNode) {
        if (!opt_rootNode) {
            return this.maxNode_;
        }
        let maxNode = opt_rootNode;
        this.traverse_(function (node) {
            let retNode = null;
            if (node.right) {
                maxNode = node.right;
                retNode = node.right;
            }
            return retNode; // If null, we'll stop traversing the tree
        }, opt_rootNode);
        return maxNode;
    }
    static fromList(list, opt_compareFn) {
        var res = new AvlTree(opt_compareFn || object_1.compare);
        list.forEach(function (v) {
            res.add(v);
        });
        return res;
    }
    toList() {
        return [...this];
    }
    /**
     * find a value in the map, if it is not present add it
     * @param val
     */
    safeFind(val) {
        let res = this.findFirst(val);
        if (res === null) {
            this.add(val);
            return val;
        }
        return res;
    }
    clone(opt_used = new WeakMap()) {
        let me = opt_used.get(this);
        if (me) {
            return me;
        }
        let result = new AvlTree(this.comparator_);
        opt_used.set(this, result);
        this.inOrderTraverse(function (el) {
            result.add((0, object_1.clone)(el, opt_used));
        });
        return result;
    }
}
exports.AvlTree = AvlTree;
(0, object_1.registerCompare)(AvlTree, (x, y, ignore, xPath, yPath) => {
    let count = y.getCount();
    if (x.getCount() != count) {
        return x.getCount() - count;
    }
    let itX = x[Symbol.iterator]();
    let itY = y[Symbol.iterator]();
    let xItVal = itX.next();
    let yItVal = itY.next();
    while (!xItVal.done && !yItVal.done) {
        let res = (0, object_1.compare)(xItVal.value, yItVal.value, new Set(), xPath, yPath);
        if (res !== 0) {
            return res;
        }
        xItVal = itX.next();
        yItVal = itY.next();
    }
    return 0;
});

},{"../util/object":30}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerializedMap = exports.SerializedSet = void 0;
class MappingIterator {
    constructor(mapFn, itr) {
        this.mapFn = mapFn;
        this.itr = itr;
    }
    makeResult(result) {
        if (result.hasOwnProperty('value')) {
            return {
                done: result.done,
                value: result.done && result.value === undefined ? undefined : this.mapFn(result.value)
            };
        }
        return { done: result.done };
    }
    next(...[value]) {
        return this.makeResult(this.itr.next(...[value]));
    }
    [Symbol.dispose]() {
        this.itr[Symbol.dispose]();
    }
    [Symbol.iterator]() {
        return this;
    }
}
class SerializedSet {
    static getKeyKey(entry) {
        return [entry, entry];
    }
    constructor(serializer) {
        this.map = new Map();
        this.serializer = serializer;
    }
    get [Symbol.toStringTag]() {
        return this.map[Symbol.toStringTag];
    }
    get size() {
        return this.map.size;
    }
    ;
    [Symbol.iterator]() {
        return this.map.values()[Symbol.iterator]();
    }
    add(value) {
        this.map.set(this.serializer(value), value);
        return this;
    }
    clear() {
        this.map.clear();
    }
    delete(value) {
        return this.map.delete(this.serializer(value));
    }
    entries() {
        return new MappingIterator(SerializedSet.getKeyKey, this.map.values());
    }
    forEach(callbackfn, thisArg) {
        if (thisArg !== undefined) {
            callbackfn = callbackfn.bind(thisArg);
        }
        this.map.forEach((value, key) => {
            callbackfn(value, value, this);
        }, thisArg);
    }
    has(value) {
        return this.map.has(this.serializer(value));
    }
    keys() {
        return this.map.values();
    }
    values() {
        return this.map.values();
    }
}
exports.SerializedSet = SerializedSet;
class SerializedMap {
    static getKey(entry) {
        return entry.key;
    }
    static getValue(entry) {
        return entry.value;
    }
    static getKeyValue(entry) {
        return [entry.key, entry.value];
    }
    constructor(serilizer) {
        this.map = new Map();
        this.serilizer = serilizer;
    }
    get [Symbol.toStringTag]() {
        return this.map[Symbol.toStringTag];
    }
    get size() {
        return this.map.size;
    }
    ;
    clear() {
        this.map.clear();
    }
    forEach(callbackfn, thisArg) {
        if (thisArg !== undefined) {
            callbackfn = callbackfn.bind(thisArg);
        }
        this.map.forEach((value, key, map) => {
            callbackfn(value.value, value.key, this);
        });
    }
    keys() {
        return new MappingIterator(SerializedMap.getKey, this.map.values());
    }
    values() {
        return new MappingIterator(SerializedMap.getValue, this.map.values());
    }
    get(key) {
        return this.map.get(this.serilizer(key))?.value;
    }
    set(key, value) {
        this.map.set(this.serilizer(key), { key: key, value: value });
        return this;
    }
    has(key) {
        return this.map.has(this.serilizer(key));
    }
    delete(key) {
        return this.map.delete(this.serilizer(key));
    }
    entries() {
        return new MappingIterator(SerializedMap.getKeyValue, this.map.values());
    }
    [Symbol.iterator]() {
        return new MappingIterator(SerializedMap.getKeyValue, this.map.values());
    }
}
exports.SerializedMap = SerializedMap;

},{}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniquePriorityQueue = void 0;
const avltree_1 = require("./avltree");
/**
 * Constructs a Priority Queue that if an item with the same priority is already in the queue is added then nothing is
 * done
 *
 */
class UniquePriorityQueue {
    constructor(comparator) {
        this.tree = new avltree_1.AvlTree(comparator);
    }
    /**
     * add a value to the queue unless it already exists
     *
     * return Whether value was inserted into the tree.
     */
    push(value) {
        if (this.tree.contains(value)) {
            return false;
        }
        return this.tree.add(value);
    }
    /**
     * remove an item from the queue, specified item
     */
    remove(val) {
        return this.tree.remove(val);
    }
    ;
    /**
     * remove an item from the queue, returns undefined if empty
     */
    pop() {
        if (this.tree.getCount() === 0) {
            return undefined;
        }
        var val = this.tree.getMinimum();
        this.tree.remove(val);
        return val;
    }
    /**
     * return if the queue is empty
     *
     */
    isEmpty() {
        return this.tree.getCount() === 0;
    }
    /**
     * make queue as an array
     */
    asArray() {
        return [...this.tree];
    }
}
exports.UniquePriorityQueue = UniquePriorityQueue;

},{"./avltree":4}],7:[function(require,module,exports){
"use strict";
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Box = void 0;
const coordinate_1 = require("./coordinate");
class Box {
    /**
     * Class for representing a box. A box is specified as a top, right, bottom,
     * and left. A box is useful for representing margins and padding.
     *
     * This class assumes 'screen coordinates': larger Y coordinates are further
     * from the top of the screen.
     *
     * @param {number} top Top.
     * @param {number} right Right.
     * @param {number} bottom Bottom.
     * @param {number} left Left.
     * @struct
     * @constructor
     */
    constructor(top, right, bottom, left) {
        /**
         * Top
         * @type {number}
         */
        this.top = top;
        /**
         * Right
         * @type {number}
         */
        this.right = right;
        /**
         * Bottom
         * @type {number}
         */
        this.bottom = bottom;
        /**
         * Left
         * @type {number}
         */
        this.left = left;
    }
    /**
     * Creates a Box by bounding a collection of goog.math.Coordinate objects
     * remaining     *     the box.
     * @return A Box containing all the specified Coordinates.
     */
    static boundingBox(first, ...remaining) {
        let box = new Box(first.y, first.x, first.y, first.x);
        for (let c of remaining) {
            box.expandToIncludeCoordinate(c);
        }
        return box;
    }
    /**
     * @return {number} width The width of this Box.
     */
    get width() {
        return this.right - this.left;
    }
    /**
     * @return  height The height of this Box.
     */
    get height() {
        return this.bottom - this.top;
    }
    /**
     * Creates a copy of the box with the same dimensions.
     * @return A clone of this Box.
     */
    clone() {
        return new Box(this.top, this.right, this.bottom, this.left);
    }
    /**
     * Returns whether the box contains a coordinate or another box.
     *
     * @param other A Coordinate or a Box.
     * @return Whether the box contains the coordinate or other box.
     */
    contains(other) {
        return Box.contains(this, other);
    }
    /**
     * Expands box with the given margins.
     *
     * @param top Top margin or box with all margins.
     * @param opt_right Right margin.
     * @param opt_bottom Bottom margin.
     * @param opt_left Left margin.
     * @return A reference to this Box.
     */
    expand(top, opt_right, opt_bottom, opt_left) {
        if (typeof top !== "number") {
            this.top -= top.top;
            this.right += top.right;
            this.bottom += top.bottom;
            this.left -= top.left;
        }
        else {
            this.top -= top;
            this.right += opt_right || 0;
            this.bottom += opt_bottom || 0;
            this.left -= opt_left || 0;
        }
        return this;
    }
    /**
     * Expand this box to include another box.
     * NOTE(user): This is used in code that needs to be very fast, please don't
     * add functionality to this function at the expense of speed (variable
     * arguments, accepting multiple argument types, etc.).
     * @param box The box to include in this one.
     */
    expandToInclude(box) {
        this.left = Math.min(this.left, box.left);
        this.top = Math.min(this.top, box.top);
        this.right = Math.max(this.right, box.right);
        this.bottom = Math.max(this.bottom, box.bottom);
    }
    /**
     * Expand this box to include the coordinate.
     * @param {!goog.math.Coordinate} coord The coordinate to be included
     *     inside the box.
     */
    expandToIncludeCoordinate(coord) {
        this.top = Math.min(this.top, coord.y);
        this.right = Math.max(this.right, coord.x);
        this.bottom = Math.max(this.bottom, coord.y);
        this.left = Math.min(this.left, coord.x);
    }
    /**
     * Compares boxes for equality.
     * @param a A Box.
     * @param b A Box.
     * @return {boolean} True iff the boxes are equal, or if both are null.
     */
    static equals(a, b) {
        if (a == b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.top == b.top && a.right == b.right && a.bottom == b.bottom &&
            a.left == b.left;
    }
    /**
     * Returns whether a box contains a coordinate or another box.
     *
     * @param box A Box.
     * @param {goog.math.Coordinate|Box} other A Coordinate or a Box.
     * @return {boolean} Whether the box contains the coordinate or other box.
     */
    static contains(box, other) {
        if (!box || !other) {
            return false;
        }
        if (other instanceof Box) {
            return other.left >= box.left && other.right <= box.right &&
                other.top >= box.top && other.bottom <= box.bottom;
        }
        // other is a Coordinate.
        return other.x >= box.left && other.x <= box.right && other.y >= box.top &&
            other.y <= box.bottom;
    }
    /**
     * Returns the relative x position of a coordinate compared to a box.  Returns
     * zero if the coordinate is inside the box.
     *
     * @param box A Box.
     * @param coord A Coordinate.
     * @return {number} The x position of {@code coord} relative to the nearest
     *     side of {@code box}, or zero if {@code coord} is inside {@code box}.
     */
    static relativePositionX(box, coord) {
        if (coord.x < box.left) {
            return coord.x - box.left;
        }
        else if (coord.x > box.right) {
            return coord.x - box.right;
        }
        return 0;
    }
    /**
     * Returns the relative y position of a coordinate compared to a box.  Returns
     * zero if the coordinate is inside the box.
     *
     * @param box A Box.
     * @param coord A Coordinate.
     * @return The y position of {@code coord} relative to the nearest
     *     side of {@code box}, or zero if {@code coord} is inside {@code box}.
     */
    static relativePositionY(box, coord) {
        if (coord.y < box.top) {
            return coord.y - box.top;
        }
        else if (coord.y > box.bottom) {
            return coord.y - box.bottom;
        }
        return 0;
    }
    /**
     * Returns the distance between a coordinate and the nearest corner/side of a
     * box. Returns zero if the coordinate is inside the box.
     *
     * @param box A Box.
     * @param coord A Coordinate.
     * @return The distance between {@code coord} and the nearest
     *     corner/side of {@code box}, or zero if {@code coord} is inside
     *     {@code box}.
     */
    static distance(box, coord) {
        let x = Box.relativePositionX(box, coord);
        let y = Box.relativePositionY(box, coord);
        return Math.sqrt(x * x + y * y);
    }
    /**
     * Returns whether two boxes intersect.
     *
     * @param a A Box.
     * @param b A second Box.
     * @return {boolean} Whether the boxes intersect.
     */
    static intersects(a, b) {
        return (a.left <= b.right && b.left <= a.right && a.top <= b.bottom &&
            b.top <= a.bottom);
    }
    /**
     * Returns whether two boxes would intersect with additional padding.
     *
     * @param a A Box.
     * @param b A second Box.
     * @param {number} padding The additional padding.
     * @return {boolean} Whether the boxes intersect.
     */
    static intersectsWithPadding(a, b, padding) {
        return (a.left <= b.right + padding && b.left <= a.right + padding &&
            a.top <= b.bottom + padding && b.top <= a.bottom + padding);
    }
    /**
     * Rounds the fields to the next larger integer values.
     */
    ceil() {
        this.top = Math.ceil(this.top);
        this.right = Math.ceil(this.right);
        this.bottom = Math.ceil(this.bottom);
        this.left = Math.ceil(this.left);
        return this;
    }
    /**
     * Rounds the fields to the next smaller integer values.
     *
     * @return This box with floored fields.
     */
    floor() {
        this.top = Math.floor(this.top);
        this.right = Math.floor(this.right);
        this.bottom = Math.floor(this.bottom);
        this.left = Math.floor(this.left);
        return this;
    }
    /**
     * Rounds the fields to nearest integer values.
     *
     * @return This box with rounded fields.
     */
    round() {
        this.top = Math.round(this.top);
        this.right = Math.round(this.right);
        this.bottom = Math.round(this.bottom);
        this.left = Math.round(this.left);
        return this;
    }
    /**
     * Translates this box by the given offsets. If a {@code goog.math.Coordinate}
     * is given, then the left and right values are translated by the coordinate's
     * x value and the top and bottom values are translated by the coordinate's y
     * value.  Otherwise, {@code tx} and {@code opt_ty} are used to translate the x
     * and y dimension values.
     *
     * @param tx The value to translate the x
     *     dimension values by or the coordinate to translate this box by.
     * @param opt_ty The value to translate y dimension values by.
     * @return This box after translating.
     */
    translate(tx, opt_ty) {
        if (tx instanceof coordinate_1.Coordinate) {
            this.left += tx.x;
            this.right += tx.x;
            this.top += tx.y;
            this.bottom += tx.y;
        }
        else {
            this.left += tx;
            this.right += tx;
            this.top += opt_ty || 0;
            this.bottom += opt_ty || 0;
        }
        return this;
    }
    /**
     * Scales this coordinate by the given scale factors. The x and y dimension
     * values are scaled by {@code sx} and {@code opt_sy} respectively.
     * If {@code opt_sy} is not given, then {@code sx} is used for both x and y.
     *
     * @param sx The scale factor to use for the x dimension.
     * @param opt_sy The scale factor to use for the y dimension.
     * @return This box after scaling.
     */
    scale(sx, opt_sy) {
        let sy = opt_sy != undefined ? opt_sy : sx;
        this.left *= sx;
        this.right *= sx;
        this.top *= sy;
        this.bottom *= sy;
        return this;
    }
}
exports.Box = Box;

},{"./coordinate":9}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = get;
exports.setAll = setAll;
exports.set = set;
exports.contains = contains;
exports.add = add;
exports.addAll = addAll;
exports.remove = remove;
exports.removeAll = removeAll;
exports.enable = enable;
exports.enableAll = enableAll;
exports.swap = swap;
exports.toggle = toggle;
exports.addRemove = addRemove;
/**
 * Gets an array-like object of class names on an element.
 */
function get(element) {
    if (element.classList) {
        return [...element.classList];
    }
    let className = element.className;
    return className.match(/\S+/g) || [];
}
/**
 * Sets the entire class name of an element.
 * @param element DOM node to set class of.
 * @param className Class name(s) to apply to element.
 */
function setAll(element, classes) {
    element.className = classes.join(" ");
}
/**
 * Sets the entire class name of an element.
 * @param element DOM node to set class of.
 * @param className Class name(s) to apply to element.
 */
function set(element, className) {
    element.className = className;
}
/**
 * Returns true if an element has a class.  This method may throw a DOM
 * exception for an invalid or empty class name if DOMTokenList is used.
 * @param element DOM node to test.
 * @param className Class name to test for.
 * @return Whether element has the class.
 */
function contains(element, className) {
    return get(element).includes(className);
}
/**
 * Adds a class to an element.  Does not add multiples of class names.  This
 * method may throw a DOM exception for an invalid or empty class name if
 * DOMTokenList is used.
 * @param element DOM node to add class to.
 * @param className Class name to add.
 */
function add(element, className) {
    if (element.classList) {
        element.classList.add(className);
        return;
    }
    if (!contains(element, className)) {
        // Ensure we add a space if this is not the first class name added.
        element.className +=
            element.className.length > 0 ? (' ' + className) : className;
    }
}
/**
 * Convenience method to add a number of class names at once.
 * @param element The element to which to add classes.
 * @param classesToAdd An array-like object
 * containing a collection of class names to add to the element.
 * This method may throw a DOM exception if classesToAdd contains invalid
 * or empty class names.
 */
function addAll(element, classesToAdd) {
    if (element.classList) {
        for (let className of classesToAdd) {
            add(element, className);
        }
        return;
    }
    let classMap = new Set();
    // Get all current class names into a map.
    for (let className of get(element)) {
        classMap.add(className);
    }
    // Add new class names to the map.
    for (let className of classesToAdd) {
        classMap.add(className);
    }
    // Flatten the keys of the map into the className.
    element.className = '';
    for (let className in classMap) {
        element.className +=
            element.className.length > 0 ? (' ' + className) : className;
    }
}
/**
 * Removes a class from an element.  This method may throw a DOM exception
 * for an invalid or empty class name if DOMTokenList is used.
 * @param element DOM node to remove class from.
 * @param className Class name to remove.
 */
function remove(element, className) {
    if (element.classList) {
        element.classList.remove(className);
        return;
    }
    if (contains(element, className)) {
        // Filter out the class name.
        element.className = get(element).filter(c => c != className).join(' ');
    }
}
/**
 * Removes a set of classes from an element.  Prefer this call to
 * repeatedly calling {@code remove} if you want to remove
 * a large set of class names at once.
 * @param element The element from which to remove classes.
 * @param classesToRemove An array-like object
 * containing a collection of class names to remove from the element.
 * This method may throw a DOM exception if classesToRemove contains invalid
 * or empty class names.
 */
function removeAll(element, classesToRemove) {
    if (element.classList) {
        for (let className of classesToRemove) {
            remove(element, className);
        }
        return;
    }
    // Filter out those classes in classesToRemove.
    element.className = get(element).filter(className => !classesToRemove.includes(className)).join(' ');
}
/**
 * Adds or removes a class depending on the enabled argument.  This method
 * may throw a DOM exception for an invalid or empty class name if DOMTokenList
 * is used.
 * @param element DOM node to add or remove the class on.
 * @param className Class name to add or remove.
 * @param enabled Whether to add or remove the class (true adds,
 *     false removes).
 */
function enable(element, className, enabled) {
    if (enabled) {
        add(element, className);
    }
    else {
        remove(element, className);
    }
}
/**
 * Adds or removes a set of classes depending on the enabled argument.  This
 * method may throw a DOM exception for an invalid or empty class name if
 * DOMTokenList is used.
 * @param element DOM node to add or remove the class on.
 * @param classesToEnable An array-like object
 *     containing a collection of class names to add or remove from the element.
 * @param enabled Whether to add or remove the classes (true adds,
 *     false removes).
 */
function enableAll(element, classesToEnable, enabled) {
    let f = enabled ? addAll : removeAll;
    f(element, classesToEnable);
}
/**
 * Switches a class on an element from one to another without disturbing other
 * classes. If the fromClass isn't removed, the toClass won't be added.  This
 * method may throw a DOM exception if the class names are empty or invalid.
 * @param element DOM node to swap classes on.
 * @param fromClass Class to remove.
 * @param toClass Class to add.
 * @return Whether classes were switched.
 */
function swap(element, fromClass, toClass) {
    if (contains(element, fromClass)) {
        remove(element, fromClass);
        add(element, toClass);
        return true;
    }
    return false;
}
/**
 * Removes a class if an element has it, and adds it the element doesn't have
 * it.  Won't affect other classes on the node.  This method may throw a DOM
 * exception if the class name is empty or invalid.
 * @param element DOM node to toggle class on.
 * @param className Class to toggle.
 * @return True if class was added, false if it was removed
 *     (in other words, whether element has the class after this function has
 *     been called).
 */
function toggle(element, className) {
    let add = !contains(element, className);
    enable(element, className, add);
    return add;
}
/**
 * Adds and removes a class of an element.  Unlike
 * {@link swap}, this method adds the classToAdd regardless
 * of whether the classToRemove was present and had been removed.  This method
 * may throw a DOM exception if the class names are empty or invalid.
 *
 * @param element DOM node to swap classes on.
 * @param classToRemove Class to remove.
 * @param classToAdd Class to add.
 */
function addRemove(element, classToRemove, classToAdd) {
    remove(element, classToRemove);
    add(element, classToAdd);
}
const exportsFns = {
    set, get,
    enable, enableAll, remove, removeAll, add, addAll, contains,
    toggle,
    addRemove, swap,
};
exports.default = exportsFns;

},{}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Coordinate = void 0;
const goog_1 = require("../../util/goog");
class Coordinate {
    constructor(opt_x = 0, opt_y = 0) {
        this.x = opt_x;
        this.y = opt_y;
    }
    clone() {
        return new Coordinate(this.x, this.y);
    }
    /**
     * Returns the distance between two coordinates.
     * @param a A Coordinate.
     * @param b A Coordinate.
     * @return The distance between {@code a} and {@code b}.
     */
    static distance(a, b) {
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    /**
     * Returns the magnitude of a coordinate.
     * @param a A Coordinate.
     * @return The distance between the origin and {@code a}.
     */
    static magnitude(a) {
        return Math.sqrt(a.x * a.x + a.y * a.y);
    }
    ;
    /**
     * Returns the squared distance between two coordinates. Squared distances can
     * be used for comparisons when the actual value is not required.
     *
     * Performance note: eliminating the square root is an optimization often used
     * in lower-level languages, but the speed difference is not nearly as
     * pronounced in JavaScript (only a few percent.)
     *
     * @param a A Coordinate.
     * @param b A Coordinate.
     * @return The squared distance between {@code a} and {@code b}.
     */
    static squaredDistance(a, b) {
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        return dx * dx + dy * dy;
    }
    ;
    /**
     * Returns the difference between two coordinates as a new
     * @param a A Coordinate.
     * @param b A Coordinate.
     * @return A Coordinate representing the difference
     *     between {@code a} and {@code b}.
     */
    static difference(a, b) {
        return new Coordinate(a.x - b.x, a.y - b.y);
    }
    ;
    /**
     * Returns the sum of two coordinates as a new Coordinate.
     * @param a A Coordinate.
     * @param b A Coordinate.
     * @return A Coordinate representing the sum of the two
     *     coordinates.
     */
    static sum(a, b) {
        return new Coordinate(a.x + b.x, a.y + b.y);
    }
    ;
    /**
     * Rounds the x and y fields to the next larger integer values.
     * @return This coordinate with ceil'd fields.
     */
    ceil() {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        return this;
    }
    ;
    /**
     * Rounds the x and y fields to the next smaller integer values.
     * @return This coordinate with floored fields.
     */
    floor() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    }
    ;
    /**
     * Rounds the x and y fields to the nearest integer values.
     * @return This coordinate with rounded fields.
     */
    round() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    }
    ;
    /**
     * Translates this box by the given offsets. If a {@code Coordinate}
     * is given, then the x and y values are translated by the coordinate's x and y.
     * Otherwise, x and y are translated by {@code tx} and {@code opt_ty}
     * respectively.
     * @param tx The value to translate x by or the
     *     the coordinate to translate this coordinate by.
     * @param opt_ty The value to translate y by.
     * @return This coordinate after translating.
     */
    translate(tx, opt_ty) {
        if (tx instanceof Coordinate) {
            this.x += tx.x;
            this.y += tx.y;
        }
        else {
            this.x += tx;
            this.y += opt_ty || 0;
        }
        return this;
    }
    ;
    /**
     * Scales this coordinate by the given scale factors. The x and y values are
     * scaled by {@code sx} and {@code opt_sy} respectively.  If {@code opt_sy}
     * is not given, then {@code sx} is used for both x and y.
     * @param sx The scale factor to use for the x dimension.
     * @param sy The scale factor to use for the y dimension.
     * @return This coordinate after scaling.
     */
    scale(sx, sy = sx) {
        this.x *= sx;
        this.y *= sy;
        return this;
    }
    ;
    /**
     * Rotates this coordinate clockwise about the origin (or, optionally, the given
     * center) by the given angle, in radians.
     * @param {number} radians The angle by which to rotate this coordinate
     *     clockwise about the given center, in radians.
     * @param center The center of rotation. Defaults
     *     to (0, 0) if not given.
     */
    rotateRadians(radians, center = new Coordinate(0, 0)) {
        let x = this.x;
        let y = this.y;
        let cos = Math.cos(radians);
        let sin = Math.sin(radians);
        this.x = (x - center.x) * cos - (y - center.y) * sin + center.x;
        this.y = (x - center.x) * sin + (y - center.y) * cos + center.y;
    }
    ;
    /**
     * Rotates this coordinate clockwise about the origin (or, optionally, the given
     * center) by the given angle, in degrees.
     * @param degrees The angle by which to rotate this coordinate
     *     clockwise about the given center, in degrees.
     * @param opt_center The center of rotation. Defaults
     *     to (0, 0) if not given.
     */
    rotateDegrees(degrees, opt_center) {
        this.rotateRadians((0, goog_1.toRadians)(degrees), opt_center);
    }
}
exports.Coordinate = Coordinate;

},{"../../util/goog":29}],10:[function(require,module,exports){
"use strict";
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomHelper = void 0;
exports.getDomHelper = getDomHelper;
exports.getDocument = getDocument;
exports.getElement = getElement;
exports.getRequiredElement = getRequiredElement;
exports.getClientViewportElement = getClientViewportElement;
exports.getComputedStyle = getComputedStyle;
exports.getComputedPosition = getComputedPosition;
exports.getOffsetParent = getOffsetParent;
exports.getPageOffset = getPageOffset;
exports.getClientLeftTop = getClientLeftTop;
exports.getVisibleRectForElement = getVisibleRectForElement;
exports.getElementsByTagNameAndClass = getElementsByTagNameAndClass;
exports.getElementsByClass = getElementsByClass;
exports.getElementByClass = getElementByClass;
exports.getRequiredElementByClass = getRequiredElementByClass;
exports.setProperties = setProperties;
exports.getPageScroll = getPageScroll;
exports.getDocumentScroll = getDocumentScroll;
exports.getDocumentScrollElement = getDocumentScrollElement;
exports.getWindow = getWindow;
exports.createDom = createDom;
exports.createElement = createElement;
exports.createTextNode = createTextNode;
exports.createTable = createTable;
exports.isCss1CompatMode = isCss1CompatMode;
exports.canHaveChildren = canHaveChildren;
exports.appendChild = appendChild;
exports.append = append;
exports.removeChildren = removeChildren;
exports.insertSiblingBefore = insertSiblingBefore;
exports.insertSiblingAfter = insertSiblingAfter;
exports.insertChildAt = insertChildAt;
exports.removeNode = removeNode;
exports.replaceNode = replaceNode;
exports.getChildren = getChildren;
exports.getFirstElementChild = getFirstElementChild;
exports.getLastElementChild = getLastElementChild;
exports.getNextElementSibling = getNextElementSibling;
exports.getPreviousElementSibling = getPreviousElementSibling;
exports.getNextNode = getNextNode;
exports.getPreviousNode = getPreviousNode;
exports.isNodeLike = isNodeLike;
exports.isElement = isElement;
exports.isWindow = isWindow;
exports.getParentElement = getParentElement;
exports.contains = contains;
exports.compareNodeOrder = compareNodeOrder;
exports.findCommonAncestor = findCommonAncestor;
exports.getOwnerDocument = getOwnerDocument;
exports.getFrameContentDocument = getFrameContentDocument;
exports.getFrameContentWindow = getFrameContentWindow;
exports.setTextContent = setTextContent;
exports.getOuterHtml = getOuterHtml;
exports.findNode = findNode;
exports.findNodes = findNodes;
exports.isFocusableTabIndex = isFocusableTabIndex;
exports.setFocusableTabIndex = setFocusableTabIndex;
exports.isFocusable = isFocusable;
exports.getTextContent = getTextContent;
exports.getRawTextContent = getRawTextContent;
exports.getNodeTextLength = getNodeTextLength;
exports.getNodeTextOffset = getNodeTextOffset;
exports.getNodeAtOffset = getNodeAtOffset;
exports.isNodeList = isNodeList;
exports.getAncestorByTagNameAndClass = getAncestorByTagNameAndClass;
exports.getAncestorByClass = getAncestorByClass;
exports.getAncestor = getAncestor;
exports.getActiveElement = getActiveElement;
exports.getPixelRatio = getPixelRatio;
exports.getViewportSize = getViewportSize;
exports.setPosition = setPosition;
exports.getSize = getSize;
exports.getBounds = getBounds;
exports.isRightToLeft = isRightToLeft;
exports.setBorderBoxSize = setBorderBoxSize;
exports.translateRectForAnotherFrame = translateRectForAnotherFrame;
exports.getFramedPageOffset = getFramedPageOffset;
exports.getScrollLeft = getScrollLeft;
exports.getComputedOverflowX = getComputedOverflowX;
exports.setElementShown = setElementShown;
exports.getViewportPageOffset = getViewportPageOffset;
exports.getCssName = getCssName;
/**
 * @define Whether we know at compile time that the browser is in
 * quirks mode.
 */
const tags_1 = require("./tags");
const nodetype_1 = require("./nodetype");
const goog_1 = require("../../util/goog");
const classlist_1 = __importStar(require("./classlist"));
const useragent_1 = require("./useragent");
const size_1 = require("./size");
const coordinate_1 = require("./coordinate");
const string_1 = require("../../util/string");
const goog_2 = require("../../util/goog");
const box_1 = require("./box");
const rect_1 = require("./rect");
/**
 * Gets the DomHelper object for the document where the element resides.
 * @param opt_element If present, gets the DomHelper for this
 *     element.
 * @return The DomHelper.
 */
function getDomHelper(opt_element) {
    return opt_element ?
        new DomHelper(getOwnerDocument(opt_element)) :
        (defaultDomHelper_ ||
            (defaultDomHelper_ = new DomHelper()));
}
/**
 * Cached default DOM helper.
 * @type {!DomHelper|undefined}
 * @private
 */
let defaultDomHelper_;
/**
 * Gets the document object being used by the dom library.
 * @return Document object.
 */
function getDocument() {
    return document;
}
/**
 * Gets an element from the current document by element id.
 *
 * If an Element is passed in, it is returned.
 *
 * @param element Element ID or a DOM node.
 * @return The element with the given ID, or the node passed in.
 */
function getElement(element) {
    return getElementHelper_(document, element);
}
/**
 * Gets an element by id from the given document (if present).
 * If an element is given, it is returned.
 * @param doc
 * @param element Element ID or a DOM node.
 * @return The resulting element.
 * @private
 */
function getElementHelper_(doc, element) {
    return (0, goog_1.isString)(element) ? doc.getElementById(element) : element;
}
/**
 * Gets an element by id, asserting that the element is found.
 *
 * This is used when an element is expected to exist, and should fail with
 * an assertion error if it does not (if assertions are enabled).
 *
 * @param id Element ID.
 * @return The element with the given ID, if it exists.
 */
function getRequiredElement(id) {
    if (id instanceof Element) {
        return id;
    }
    return getRequiredElementHelper_(document, id);
}
/**
 * Returns the viewport element for a particular document
 * @param opt_node DOM node (Document is OK) to get the viewport element of.
 * @return document.documentElement or document.body.
 */
function getClientViewportElement(opt_node) {
    let doc;
    if (opt_node) {
        doc = getOwnerDocument(opt_node);
    }
    else {
        doc = getDocument();
    }
    // In old IE versions the document.body represented the viewport
    if (useragent_1.userAgent.IE && !useragent_1.userAgent.isDocumentModeOrHigher(9) &&
        !getDomHelper(doc).isCss1CompatMode()) {
        return doc.body;
    }
    return doc.documentElement;
}
function getComputedStyle(element, property) {
    let doc = getOwnerDocument(element);
    if (doc.defaultView && doc.defaultView.getComputedStyle) {
        let styles = doc.defaultView.getComputedStyle(element, null);
        if (styles) {
            // element.style[..] is undefined for browser specific styles
            // as 'filter'.
            return styles[property] || styles.getPropertyValue(property) || '';
        }
    }
    return '';
}
/**
 * Cross-browser pseudo get computed style. It returns the computed style where
 * available. If not available it tries the cascaded style value (IE
 * currentStyle) and in worst case the inline style value.  It shouldn't be
 * called directly, see http://wiki/Main/ComputedStyleVsCascadedStyle for
 * discussion.
 *
 * @param element Element to get style of.
 * @param style Property to get (must be camelCase, not css-style.).
 * @return Style value.
 */
function getStyle_(element, style) {
    return getComputedStyle(element, style) ||
        getCascadedStyle(element, style) ||
        (element.style && element.style[style]);
}
/**
 * Retrieves the computed value of the position CSS attribute.
 * @param element The element to get the position of.
 * @return  Position value.
 */
function getComputedPosition(element) {
    return getStyle_(element, 'position');
}
/**
 * Gets the cascaded style value of a node, or null if the value cannot be
 * computed (only Internet Explorer can do this).
 *
 * @param element Element to get style of.
 * @param style Property to get (camel-case).
 * @return Style value.
 */
function getCascadedStyle(element, style) {
    return element.currentStyle ? element.currentStyle[style] : null;
}
/**
 * Returns the first parent that could affect the position of a given element.
 * @param element The element to get the offset parent for.
 * @return The first offset parent or null if one cannot be found.
 */
function getOffsetParent(element) {
    // element.offsetParent does the right thing in IE7 and below.  In other
    // browsers it only includes elements with position absolute, relative or
    // fixed, not elements with overflow set to auto or scroll.
    if (useragent_1.userAgent.IE && !useragent_1.userAgent.isDocumentModeOrHigher(8)) {
        return element.offsetParent;
    }
    let doc = getOwnerDocument(element);
    let positionStyle = getStyle_(element, 'position');
    let skipStatic = positionStyle == 'fixed' || positionStyle == 'absolute';
    for (let parent = element.parentNode; parent && parent != doc; parent = parent.parentNode) {
        // Skip shadowDOM roots.
        if (parent.nodeType == nodetype_1.NodeType.DOCUMENT_FRAGMENT && parent.host) {
            parent = parent.host;
        }
        positionStyle =
            getStyle_(parent, 'position');
        skipStatic = skipStatic && positionStyle == 'static' &&
            parent != doc.documentElement && parent != doc.body;
        if (!skipStatic &&
            (parent.scrollWidth > parent.clientWidth ||
                parent.scrollHeight > parent.clientHeight ||
                positionStyle == 'fixed' || positionStyle == 'absolute' ||
                positionStyle == 'relative')) {
            return parent;
        }
    }
    return null;
}
/**
 * Returns a Coordinate object relative to the top-left of the HTML document.
 * Implemented as a single function to save having to do two recursive loops in
 * opera and safari just to get both coordinates.  If you just want one value do
 * use goog.style.getPageOffsetLeft() and goog.style.getPageOffsetTop(), but
 * note if you call both those methods the tree will be analysed twice.
 *
 * @param el Element to get the page offset for.
 * @return The page offset.
 */
function getPageOffset(el) {
    let doc = getOwnerDocument(el);
    // TODO(gboyer): Update the jsdoc in a way that doesn't break the universe.
    // NOTE(arv): If element is hidden (display none or disconnected or any the
    // ancestors are hidden) we get (0,0) by default but we still do the
    // accumulation of scroll position.
    // TODO(arv): Should we check if the node is disconnected and in that case
    //            return (0,0)?
    let pos = new coordinate_1.Coordinate(0, 0);
    let viewportElement = getClientViewportElement(doc);
    if (el == viewportElement) {
        // viewport is always at 0,0 as that defined the coordinate system for this
        // function - this avoids special case checks in the code below
        return pos;
    }
    let box = getBoundingClientRect_(el);
    // Must add the scroll coordinates in to get the absolute page offset
    // of element since getBoundingClientRect returns relative coordinates to
    // the viewport.
    let scrollCoord = getDomHelper(doc).getDocumentScroll();
    pos.x = box.left + scrollCoord.x;
    pos.y = box.top + scrollCoord.y;
    return pos;
}
/**
 * Gets the client rectangle of the DOM element.
 *
 * getBoundingClientRect is part of a new CSS object model draft (with a
 * long-time presence in IE), replacing the error-prone parent offset
 * computation and the now-deprecated Gecko getBoxObjectFor.
 *
 * This utility patches common browser bugs in getBoundingClientRect. It
 * will fail if getBoundingClientRect is unsupported.
 *
 * If the element is not in the DOM, the result is undefined, and an error may
 * be thrown depending on user agent.
 *
 * @param el The element whose bounding rectangle is being queried.
 * @return A native bounding rectangle with numerical left, top,
 *     right, and bottom.  Reported by Firefox to be of object type ClientRect.
 * @private
 */
function getBoundingClientRect_(el) {
    let rect;
    try {
        rect = { ...el.getBoundingClientRect() };
    }
    catch (e) {
        // In IE < 9, calling getBoundingClientRect on an orphan element raises an
        // "Unspecified Error". All other browsers return zeros.
        return { 'left': 0, 'top': 0, 'right': 0, 'bottom': 0 };
    }
    // Patch the result in IE only, so that this function can be inlined if
    // compiled for non-IE.
    if (useragent_1.userAgent.IE && el.ownerDocument.body) {
        // In IE, most of the time, 2 extra pixels are added to the top and left
        // due to the implicit 2-pixel inset border.  In IE6/7 quirks mode and
        // IE6 standards mode, this border can be overridden by setting the
        // document element's border to zero -- thus, we cannot rely on the
        // offset always being 2 pixels.
        // In quirks mode, the offset can be determined by querying the body's
        // clientLeft/clientTop, but in standards mode, it is found by querying
        // the document element's clientLeft/clientTop.  Since we already called
        // getBoundingClientRect we have already forced a reflow, so it is not
        // too expensive just to query them all.
        // See: http://msdn.microsoft.com/en-us/library/ms536433(VS.85).aspx
        let doc = el.ownerDocument;
        rect.left -= doc.documentElement.clientLeft + doc.body.clientLeft;
        rect.top -= doc.documentElement.clientTop + doc.body.clientTop;
    }
    return rect;
}
/**
 * Returns clientLeft (width of the left border and, if the directionality is
 * right to left, the vertical scrollbar) and clientTop as a coordinate object.
 *
 * @param el Element to get clientLeft for.
 * @return Client left and top.
 */
function getClientLeftTop(el) {
    return new coordinate_1.Coordinate(el.clientLeft, el.clientTop);
}
/**
 * Calculates and returns the visible rectangle for a given element. Returns a
 * box describing the visible portion of the nearest scrollable offset ancestor.
 * Coordinates are given relative to the document.
 *
 * @param element Element to get the visible rect for.
 * @return Bounding elementBox describing the visible rect or
 *     null if scrollable ancestor isn't inside the visible viewport.
 */
function getVisibleRectForElement(element) {
    let visibleRect = new box_1.Box(0, Infinity, Infinity, 0);
    let dom = getDomHelper(element);
    let body = dom.getDocument().body;
    let documentElement = dom.getDocument().documentElement;
    let scrollEl = dom.getDocumentScrollElement();
    // Determine the size of the visible rect by climbing the dom accounting for
    // all scrollable containers.
    for (let el = element; el = getOffsetParent(el);) {
        // clientWidth is zero for inline block elements in IE.
        // on WEBKIT, body element can have clientHeight = 0 and scrollHeight > 0
        if ((!useragent_1.userAgent.IE || el.clientWidth != 0) &&
            (!useragent_1.userAgent.WEBKIT || el.clientHeight != 0 || el != body) &&
            // body may have overflow set on it, yet we still get the entire
            // viewport. In some browsers, el.offsetParent may be
            // document.documentElement, so check for that too.
            (el != body && el != documentElement &&
                getStyle_(el, 'overflow') != 'visible')) {
            let pos = getPageOffset(el);
            let client = getClientLeftTop(el);
            pos.x += client.x;
            pos.y += client.y;
            visibleRect.top = Math.max(visibleRect.top, pos.y);
            visibleRect.right = Math.min(visibleRect.right, pos.x + el.clientWidth);
            visibleRect.bottom =
                Math.min(visibleRect.bottom, pos.y + el.clientHeight);
            visibleRect.left = Math.max(visibleRect.left, pos.x);
        }
    }
    // Clip by window's viewport.
    let scrollX = scrollEl.scrollLeft, scrollY = scrollEl.scrollTop;
    visibleRect.left = Math.max(visibleRect.left, scrollX);
    visibleRect.top = Math.max(visibleRect.top, scrollY);
    let winSize = dom.getViewportSize();
    visibleRect.right = Math.min(visibleRect.right, scrollX + winSize.width);
    visibleRect.bottom = Math.min(visibleRect.bottom, scrollY + winSize.height);
    return (visibleRect.top >= 0 && visibleRect.left >= 0
        && visibleRect.bottom > visibleRect.top &&
        visibleRect.right > visibleRect.left ?
        visibleRect : null);
}
/**
 * Helper function for getRequiredElementHelper functions, both static and
 * on DomHelper.  Asserts the element with the given id exists.
 * @param doc
 * @param id
 * @return The element with the given ID, if it exists.
 * @private
 */
function getRequiredElementHelper_(doc, id) {
    // To prevent users passing in Elements as is permitted in getelementElement().
    (0, goog_2.assert)(typeof id === 'string');
    let element = getElementHelper_(doc, id);
    (0, goog_2.assert)(element instanceof Element, 'No element found with id: ' + id);
    return element;
}
/**
 * Looks up elements by both tag and class name, using browser native functions
 * ({@code querySelectorAll}, {@code getElementsByTagName} or
 * {@code getElementsByClassName}) where possible. This function
 * is a useful, if limited, way of collecting a list of DOM elements
 * with certain characteristics.  {@code query} offers a
 * more powerful and general solution which allows matching on CSS3
 * selector expressions, but at increased cost in code size. If all you
 * need is particular tags belonging to a single class, this function
 * is fast and sleek.
 *
 * Note that tag names are case sensitive in the SVG namespace, and this
 * function converts opt_tag to uppercase for comparisons. For queries in the
 * SVG namespace you should use querySelector or querySelectorAll instead.
 * https://bugzilla.mozilla.org/show_bug.cgi?id=963870
 * https://bugs.webkit.org/show_bug.cgi?id=83438
 *
 * @see {query}
 *
 * @param opt_tag Element tag name.
 * @param opt_class Optional class name.
 * @param opt_el Optional element to look in.
 * @return list of elements (only a length
 */
function getElementsByTagNameAndClass(opt_tag, opt_class, opt_el) {
    return getElementsByTagNameAndClass_(document, opt_tag, opt_class, opt_el);
}
function toArray(arrayLike) {
    let res = [];
    if (arrayLike) {
        for (let i = 0; i < arrayLike.length; i++) {
            res.push(arrayLike[i]);
        }
    }
    return res;
}
/**
 * Returns a static, array-like list of the elements with the provided
 * className.
 * @see {query}
 * @param className the name of the class to look for.
 * @param opt_el element to look in.
 * @return The items found with the class name provided.
 */
function getElementsByClass(className, opt_el) {
    let parent = opt_el || document;
    if (canUseQuerySelector_(parent)) {
        return toArray(parent.querySelectorAll('.' + className));
    }
    return getElementsByTagNameAndClass_(document, '*', className, opt_el);
}
/**
 * Returns the first element with the provided className.
 * @see {query}
 * @param className the name of the class to look for.
 * @param opt_el Optional element to look in.
 * @return The first item with the class name provided.
 */
function getElementByClass(className, opt_el) {
    let parent = opt_el || document;
    let retVal = null;
    if (parent.getElementsByClassName) {
        retVal = parent.getElementsByClassName(className)[0];
    }
    else if (canUseQuerySelector_(parent)) {
        retVal = parent.querySelector('.' + className);
    }
    else {
        retVal = getElementsByTagNameAndClass_(document, '*', className, opt_el)[0];
    }
    return retVal || null;
}
/**
 * Ensures an element with the given className exists, and then returns the
 * first element with the provided className.
 * @see {query}
 * @param className the name of the class to look for.
 * @param opt_root Optional element or document to look
 *     in.
 * @return The first item with the class name provided.
 * @throws Thrown if no element is found.
 */
function getRequiredElementByClass(className, opt_root) {
    let retValue = getElementByClass(className, opt_root);
    (0, goog_2.assert)(retValue, 'No element found with className: ' + className);
    return retValue;
}
/**
 * Prefer the standardized (http://www.w3.org/TR/selectors-api/), native and
 * fast W3C Selectors API.
 * @param parent The parent document object.
 * @return whether or not we can use parent.querySelector* APIs.
 * @private
 */
function canUseQuerySelector_(parent) {
    return !!(parent.querySelectorAll && parent.querySelector);
}
/**
 * Helper for {@code getElementsByTagNameAndClass}.
 * @param doc The document to get the elements in.
 * @param opt_tag Element tag name.
 * @param opt_class Optional class name.
 * @param opt_el Optional element to look in.
 * @return list of elements
 */
function getElementsByTagNameAndClass_(doc, opt_tag, opt_class, opt_el) {
    let parent = opt_el || doc;
    let tagName = (opt_tag && opt_tag != '*') ? opt_tag.toLowerCase() : '';
    if (canUseQuerySelector_(parent) && (tagName || opt_class)) {
        let query = tagName + (opt_class ? '.' + opt_class : '');
        return toArray(parent.querySelectorAll(query));
    }
    // Use the native getElementsByClassName if available, under the assumption
    // that even when the tag name is specified, there will be fewer elements to
    // filter through when going by class than by tag name
    if (opt_class && parent.getElementsByClassName) {
        let els = parent.getElementsByClassName(opt_class);
        if (tagName) {
            return toArray(els).filter((el) => tagName == el.nodeName);
        }
        else {
            return toArray(els);
        }
    }
    let els = parent.getElementsByTagName(tagName || '*');
    if (opt_class) {
        return toArray(els).filter((el) => (0, classlist_1.contains)(el, opt_class));
    }
    else {
        return toArray(els);
    }
}
/**
 * Sets multiple properties on a node.
 * @param element DOM node to set properties on.
 * @param properties Hash of property:value pairs.
 */
function setProperties(element, properties) {
    for (let key in properties) {
        let val = properties[key];
        if (key == 'style') {
            element.style.cssText = val;
        }
        else if (key == 'class') {
            element.className = val;
        }
        else if (key == 'for') {
            element.htmlFor = val;
        }
        else if (DIRECT_ATTRIBUTE_MAP_.hasOwnProperty(key)) {
            element.setAttribute(DIRECT_ATTRIBUTE_MAP_[key], val);
        }
        else if (key.startsWith('aria-') ||
            key.startsWith('data-')) {
            element.setAttribute(key, val);
        }
        else {
            element[key] = val;
        }
    }
}
/**
 * Map of attributes that should be set using
 * element.setAttribute(key, val) instead of element[key] = val.  Used
 * by setProperties.
 *
 */
const DIRECT_ATTRIBUTE_MAP_ = {
    'cellpadding': 'cellPadding',
    'cellspacing': 'cellSpacing',
    'colspan': 'colSpan',
    'frameborder': 'frameBorder',
    'height': 'height',
    'maxlength': 'maxLength',
    'nonce': 'nonce',
    'role': 'role',
    'rowspan': 'rowSpan',
    'type': 'type',
    'usemap': 'useMap',
    'valign': 'vAlign',
    'width': 'width'
};
/**
 * Gets the page scroll distance as a coordinate object.
 *
 * @param opt_window Optional window element to test.
 * @return Object with values 'x' and 'y'.
 * @deprecated Use {@link getDocumentScroll} instead.
 */
function getPageScroll(opt_window) {
    return getDomHelper(opt_window).getDocumentScroll();
}
/**
 * Gets the document scroll distance as a coordinate object.
 *
 * @return Object with values 'x' and 'y'.
 */
function getDocumentScroll() {
    return getDocumentScroll_(document);
}
/**
 * Helper for {@code getDocumentScroll}.
 *
 * @param doc The document to get the scroll for.
 * @return Object with values 'x' and 'y'.
 * @private
 */
function getDocumentScroll_(doc) {
    let el = getDocumentScrollElement_(doc);
    let win = getWindow_(doc);
    if (useragent_1.userAgent.IE && useragent_1.userAgent.isVersionOrHigher('10') &&
        win.pageYOffset != el.scrollTop) {
        // The keyboard on IE10 touch devices shifts the page using the pageYOffset
        // without modifying scrollTop. For this case, we want the body scroll
        // offsets.
        return new coordinate_1.Coordinate(el.scrollLeft, el.scrollTop);
    }
    return new coordinate_1.Coordinate(win.pageXOffset || el.scrollLeft, win.pageYOffset || el.scrollTop);
}
/**
 * Gets the document scroll element.
 * @return Scrolling element.
 */
function getDocumentScrollElement() {
    return getDocumentScrollElement_(document);
}
/**
 * Helper for {@code getDocumentScrollElement}.
 * @param doc The document to get the scroll element for.
 * @return  Scrolling element.
 * @private
 */
function getDocumentScrollElement_(doc) {
    // Old WebKit needs body.scrollLeft in both quirks mode and strict mode. We
    // also default to the documentElement if the document does not have a body
    // (e.g. a SVG document).
    // Uses http://dev.w3.org/csswg/cssom-view/#dom-document-scrollingelement to
    // avoid trying to guess about browser behavior from the UA string.
    if (doc.scrollingElement) {
        return doc.scrollingElement;
    }
    if (!useragent_1.userAgent.WEBKIT && isCss1CompatMode_(doc)) {
        return doc.documentElement;
    }
    return doc.body || doc.documentElement;
}
/**
 * Gets the window object associated with the given document.
 *
 * @param opt_doc  Document object to get window for.
 * @return The window associated with the given document.
 */
function getWindow(opt_doc) {
    // TODO(arv): This should not take an argument.
    return opt_doc ? getWindow_(opt_doc) : window;
}
/**
 * Helper for {@code getWindow}.
 *
 * @param doc  Document object to get window for.
 * @return The window associated with the given document.
 * @private
 */
function getWindow_(doc) {
    return doc.parentWindow || doc.defaultView;
}
/**
 * Returns a dom node with a set of attributes.  This function accepts varargs
 * for subsequent nodes to be added.  Subsequent nodes will be added to the
 * first node as childNodes.
 *
 * So:
 * <code>createDom('div', null, createDom('p'), createDom('p'));</code>
 * would return a div with two child paragraphs
 *
 * @param tagName Tag to create.
 * @param opt_attributes If object, then a map
 *     of name-value pairs for attributes. If a string, then this is the
 *     className of the new element. If an array, the elements will be joined
 *     together as the className of the new element.
 * @param var_args Further DOM nodes or
 *     strings for text nodes. If one of the var_args is an array or NodeList,
 *     its elements will be added as childNodes instead.
 * @return Reference to a DOM node.
 */
function createDom(tagName, opt_attributes, ...var_args) {
    return createDom_(document, ...[tagName, opt_attributes, ...var_args]);
}
/**
 * Helper for {@code createDom}.
 * @param doc The document to create the DOM in.
 * @param args Argument object passed from the callers. See {@code createDom} for details.
 * @return Reference to a DOM node.
 * @private
 */
function createDom_(doc, ...args) {
    let tagName = args[0];
    let attributes = args[1];
    // Internet Explorer is dumb:
    // name: https://msdn.microsoft.com/en-us/library/ms534184(v=vs.85).aspx
    // type: https://msdn.microsoft.com/en-us/library/ms534700(v=vs.85).aspx
    // Also does not allow setting of 'type' attribute on 'input' or 'button'.
    if (!useragent_1.userAgent.CAN_ADD_NAME_OR_TYPE_ATTRIBUTES && attributes &&
        (attributes.name || attributes.type)) {
        let tagNameArr = ['<', tagName];
        if (attributes.name) {
            tagNameArr.push(' name="', (0, string_1.htmlEscape)(attributes.name), '"');
        }
        if (attributes.type) {
            tagNameArr.push(' type="', (0, string_1.htmlEscape)(attributes.type), '"');
            // Clone attributes map to remove 'type' without mutating the input.
            let clone = { ...attributes };
            // JSCompiler can't see how goog.object.extend added this property,
            // because it was essentially added by reflection.
            // So it needs to be quoted.
            delete clone['type'];
            attributes = clone;
        }
        tagNameArr.push('>');
        tagName = tagNameArr.join('');
    }
    let element = doc.createElement(tagName);
    if (attributes) {
        if ((0, goog_1.isString)(attributes)) {
            element.className = attributes;
        }
        else if ((0, goog_1.isArray)(attributes)) {
            element.className = attributes.join(' ');
        }
        else {
            setProperties(element, attributes);
        }
    }
    if (args.length > 2) {
        append_(doc, element, args, 2);
    }
    return element;
}
/**
 * Appends a node with text or other nodes.
 * @param doc The document to create new nodes in.
 * @param parent The node to append nodes to.
 * @param args The values to add. See {@code append}.
 * @param startIndex The index of the array to start from.
 */
function append_(doc, parent, args, startIndex) {
    function childHandler(child) {
        // TODO(user): More coercion, ala MochiKit?
        if (child) {
            parent.appendChild(((0, goog_1.isString)(child) ? doc.createTextNode(child) : child));
        }
    }
    for (let i = startIndex; i < args.length; i++) {
        let arg = args[i];
        // TODO(attila): Fix isArrayLike to return false for a text node.
        if (isArrayLike(arg) && !isNodeLike(arg)) {
            // If the argument is a node list, not a real array, use a clone,
            // because forEach can't be used to mutate a NodeList.
            for (let p of toArray(arg)) {
                childHandler(p);
            }
        }
        else {
            childHandler(arg);
        }
    }
}
/**
 * Returns true if the object looks like an array. To qualify as array like
 * the value needs to be either a NodeList or an object with a Number length
 * property. As a special case, a function value is not array like, because its
 * length property is fixed to correspond to the number of expected arguments.
 * @param val Variable to test.
 * @return Whether variable is an array.
 */
function isArrayLike(val) {
    let type = (0, goog_1.typeOf)(val);
    // We do not use goog.isObject here in order to exclude function values.
    return type == 'array' || type == 'object' && typeof val.length == 'number';
}
/**
 * Creates a new element.
 * @param name Tag name.
 * @return The new element.
 */
function createElement(name) {
    return document.createElement(name);
}
/**
 * Creates a new text node.
 * @param content Content.
 * @return The new text node.
 */
function createTextNode(content) {
    return document.createTextNode(String(content));
}
/**
 * Create a table.
 * @param rows The number of rows in the table.  Must be >= 1.
 * @param columns The number of columns in the table.  Must be >= 1.
 * @param opt_fillWithNbsp If true, fills table entries with
 *     {@code Unicode.NBSP} characters.
 * @return The created table.
 */
function createTable(rows, columns, opt_fillWithNbsp) {
    // TODO(user): Return HTMLTableElement, also in prototype function.
    // Callers need to be updated to e.g. not assign numbers to table.cellSpacing.
    return createTable_(document, rows, columns, !!opt_fillWithNbsp);
}
/**
 * Create a table.
 * @param doc Document object to use to create the table.
 * @param rows The number of rows in the table.  Must be >= 1.
 * @param columns The number of columns in the table.  Must be >= 1.
 * @param fillWithNbsp If true, fills table entries with
 *     {@code goog.string.Unicode.NBSP} characters.
 * @return The created table.
 * @private
 */
function createTable_(doc, rows, columns, fillWithNbsp) {
    let table = doc.createElement(tags_1.TagName.TABLE);
    let tbody = table.appendChild(doc.createElement(tags_1.TagName.TBODY));
    for (let i = 0; i < rows; i++) {
        let tr = doc.createElement(tags_1.TagName.TR);
        for (let j = 0; j < columns; j++) {
            let td = doc.createElement(tags_1.TagName.TD);
            // IE <= 9 will create a text node if we set text content to the empty
            // string, so we avoid doing it unless necessary. This ensures that the
            // same DOM tree is returned on all browsers.
            if (fillWithNbsp) {
                setTextContent(td, string_1.Unicode.NBSP);
            }
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    return table;
}
/**
 * Helper for {@code safeHtmlToNode_}.
 * @param doc The document.
 * @param tempDiv The input node.
 * @return The resulting node.
 * @private
 */
function childrenToNode_(doc, tempDiv) {
    let tempDivEl = tempDiv;
    if (tempDivEl.childNodes.length == 1) {
        return tempDivEl.removeChild(tempDivEl.firstChild);
    }
    else {
        let fragment = doc.createDocumentFragment();
        while (tempDivEl.firstChild) {
            fragment.appendChild(tempDivEl.firstChild);
        }
        return fragment;
    }
}
/**
 * Returns true if the browser is in "CSS1-compatible" (standards-compliant)
 * mode, false otherwise.
 * @return True if in CSS1-compatible mode.
 */
function isCss1CompatMode() {
    return isCss1CompatMode_(document);
}
/**
 * Returns true if the browser is in "CSS1-compatible" (standards-compliant)
 * mode, false otherwise.
 * @param doc The document to check.
 * @return True if in CSS1-compatible mode.
 * @private
 */
function isCss1CompatMode_(doc) {
    return doc.compatMode == 'CSS1Compat';
}
/**
 * Determines if the given node can contain children, intended to be used for
 * HTML generation.
 *
 * IE natively supports node.canHaveChildren but has inconsistent behavior.
 * Prior to IE8 the base tag allows children and in IE9 all nodes return true
 * for canHaveChildren.
 *
 * In practice all non-IE browsers allow you to add children to any node, but
 * the behavior is inconsistent:
 *
 * <pre>
 *   let a = document.createElement(TagName.BR);
 *   a.appendChild(document.createTextNode('foo'));
 *   a.appendChild(document.createTextNode('bar'));
 *   console.log(a.childNodes.length);  // 2
 *   console.log(a.innerHTML);  // Chrome: "", IE9: "foobar", FF3.5: "foobar"
 * </pre>
 *
 * For more information, see:
 * http://dev.w3.org/html5/markup/syntax.html#syntax-elements
 *
 * TODO(user): Rename shouldAllowChildren() ?
 *
 * @param node The node to check.
 * @return Whether the node can contain children.
 */
function canHaveChildren(node) {
    if (node.nodeType != nodetype_1.NodeType.ELEMENT) {
        return false;
    }
    switch (node.tagName) {
        case tags_1.TagName.APPLET:
        case tags_1.TagName.AREA:
        case tags_1.TagName.BASE:
        case tags_1.TagName.BR:
        case tags_1.TagName.COL:
        case tags_1.TagName.COMMAND:
        case tags_1.TagName.EMBED:
        case tags_1.TagName.FRAME:
        case tags_1.TagName.HR:
        case tags_1.TagName.IMG:
        case tags_1.TagName.INPUT:
        case tags_1.TagName.IFRAME:
        case tags_1.TagName.ISINDEX:
        case tags_1.TagName.KEYGEN:
        case tags_1.TagName.LINK:
        case tags_1.TagName.NOFRAMES:
        case tags_1.TagName.NOSCRIPT:
        case tags_1.TagName.META:
        case tags_1.TagName.OBJECT:
        case tags_1.TagName.PARAM:
        case tags_1.TagName.SCRIPT:
        case tags_1.TagName.SOURCE:
        case tags_1.TagName.STYLE:
        case tags_1.TagName.TRACK:
        case tags_1.TagName.WBR:
            return false;
    }
    return true;
}
/**
 * Appends a child to a node.
 * @param parent Parent.
 * @param child Child.
 */
function appendChild(parent, child) {
    parent.appendChild(child);
}
/**
 * Appends a node with text or other nodes.
 * @param parent The node to append nodes to.
 * @param var_args The things to append to the node.
 *     If this is a Node it is appended as is.
 *     If this is a string then a text node is appended.
 *     If this is an array like object then fields 0 to length - 1 are appended.
 */
function append(parent, ...var_args) {
    append_(getOwnerDocument(parent), parent, var_args, 0);
}
/**
 * Removes all the child nodes on a DOM node.
 * @param node Node to remove children from.
 */
function removeChildren(node) {
    // Note: Iterations over live collections can be slow, this is the fastest
    // we could find. The double parenthesis are used to prevent JsCompiler and
    // strict warnings.
    let child;
    while ((child = node.firstChild)) {
        node.removeChild(child);
    }
}
/**
 * Inserts a new node before an existing reference node (i.e. as the previous
 * sibling). If the reference node has no parent, then does nothing.
 * @param newNode Node to insert.
 * @param refNode Reference node to insert before.
 */
function insertSiblingBefore(newNode, refNode) {
    if (refNode.parentNode) {
        refNode.parentNode?.insertBefore(newNode, refNode);
    }
}
/**
 * Inserts a new node after an existing reference node (i.e. as the next
 * sibling). If the reference node has no parent, then does nothing.
 * @param newNode Node to insert.
 * @param refNode Reference node to insert after.
 */
function insertSiblingAfter(newNode, refNode) {
    if (refNode.parentNode) {
        refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
    }
}
/**
 * Insert a child at a given index. If index is larger than the number of child
 * nodes that the parent currently has, the node is inserted as the last child
 * node.
 * @param parent The element into which to insert the child.
 * @param child The element to insert.
 * @param index The index at which to insert the new child node. Must
 *     not be negative.
 */
function insertChildAt(parent, child, index) {
    // Note that if the second argument is null, insertBefore
    // will append the child at the end of the list of children.
    parent.insertBefore(child, parent.childNodes[index] || null);
}
/**
 * Removes a node from its parent.
 * @param node The node to remove.
 * @return The node removed if removed; else, null.
 */
function removeNode(node) {
    return node && node.parentNode ? node.parentNode.removeChild(node) : null;
}
;
/**
 * Replaces a node in the DOM tree. Will do nothing if {@code oldNode} has no
 * parent.
 * @param newNode Node to insert.
 * @param oldNode Node to replace.
 */
function replaceNode(newNode, oldNode) {
    let parent = oldNode.parentNode;
    if (parent) {
        parent.replaceChild(newNode, oldNode);
    }
}
/**
 * Returns an array containing just the element children of the given element.
 * @param element The element whose element children we want.
 * @return An array or array-like list
 *     of just the element children of the given element.
 */
function getChildren(element) {
    // We check if the children attribute is supported for child elements
    // since IE8 misuses the attribute by also including comments.
    if (useragent_1.userAgent.CAN_USE_CHILDREN_ATTRIBUTE &&
        element.children != undefined) {
        return toArray(element.children);
    }
    // Fall back to manually filtering the element's child nodes.
    return toArray(element.childNodes).filter((node) => {
        return node.nodeType == nodetype_1.NodeType.ELEMENT;
    });
}
/**
 * Returns the first child node that is an element.
 * @param node The node to get the first child element of.
 * @return The first child node of {@code node} that is an element.
 */
function getFirstElementChild(node) {
    if (node.firstElementChild != undefined) {
        return (node.firstElementChild);
    }
    return getNextElementNode_(node.firstChild, true);
}
/**
 * Returns the last child node that is an element.
 * @param node The node to get the last child element of.
 * @return The last child node of {@code node} that is an element.
 */
function getLastElementChild(node) {
    if (node.lastElementChild != undefined) {
        return node.lastElementChild;
    }
    return getNextElementNode_(node.lastChild, false);
}
/**
 * Returns the first next sibling that is an element.
 * @param node The node to get the next sibling element of.
 * @return The next sibling of {@code node} that is an element.
 */
function getNextElementSibling(node) {
    if (node.nextElementSibling) {
        return node.nextElementSibling;
    }
    return getNextElementNode_(node.nextSibling, true);
}
/**
 * Returns the first previous sibling that is an element.
 * @param node The node to get the previous sibling element of.
 * @return The first previous sibling of {@code node} that is
 *     an element.
 */
function getPreviousElementSibling(node) {
    if (node.previousElementSibling != undefined) {
        return node.previousElementSibling;
    }
    return getNextElementNode_(node.previousSibling, false);
}
/**
 * Returns the first node that is an element in the specified direction,
 * starting with {@code node}.
 * @param node The node to get the next element from.
 * @param forward Whether to look forwards or backwards.
 * @return  The first element.
 * @private
 */
function getNextElementNode_(node, forward) {
    while (node && node.nodeType != nodetype_1.NodeType.ELEMENT) {
        node = (forward ? node.nextSibling : node.previousSibling);
    }
    return node;
}
/**
 * Returns the next node in source order from the given node.
 * @param node The node.
 * @return The next node in the DOM tree, or null if this was the last
 *     node.
 */
function getNextNode(node) {
    if (!node) {
        return null;
    }
    let nodeEl = node;
    if (nodeEl.firstChild) {
        return nodeEl.firstChild;
    }
    while (nodeEl && !nodeEl.nextSibling) {
        nodeEl = nodeEl.parentNode;
    }
    return nodeEl ? nodeEl.nextSibling : null;
}
/**
 * Returns the previous node in source order from the given node.
 * @param node The node.
 * @return The previous node in the DOM tree, or null if this was the
 *     first node.
 */
function getPreviousNode(node) {
    if (!node) {
        return null;
    }
    if (!node.previousSibling) {
        return node.parentNode;
    }
    node = node.previousSibling;
    while (node && node.lastChild) {
        node = node.lastChild;
    }
    return node;
}
/**
 * Whether the object looks like a DOM node.
 * @param obj The object being tested for node likeness.
 * @return Whether the object looks like a DOM node.
 */
function isNodeLike(obj) {
    return (0, goog_1.isObject)(obj) && obj.nodeType > 0;
}
/**
 * Whether the object looks like an Element.
 * @param obj The object being tested for Element likeness.
 * @return Whether the object looks like an Element.
 */
function isElement(obj) {
    return (0, goog_1.isObject)(obj) && obj.nodeType == nodetype_1.NodeType.ELEMENT;
}
/**
 * Returns true if the specified value is a Window object. This includes the
 * global window for HTML pages, and iframe windows.
 * @param obj Variable to test.
 * @return Whether the variable is a window.
 */
function isWindow(obj) {
    return (0, goog_1.isObject)(obj) && obj['window'] == obj;
}
/**
 * Returns an element's parent, if it's an Element.
 * @param element The DOM element.
 * @return The parent, or null if not an Element.
 */
function getParentElement(element) {
    let parent;
    if (useragent_1.userAgent.CAN_USE_PARENT_ELEMENT_PROPERTY) {
        let isIe9 = useragent_1.userAgent.IE && useragent_1.userAgent.isVersionOrHigher('9') &&
            !useragent_1.userAgent.isVersionOrHigher('10');
        // SVG elements in IE9 can't use the parentElement property.
        // goog.global['SVGElement'] is not defined in IE9 quirks mode.
        if (!(isIe9 && window['SVGElement'] &&
            element instanceof window['SVGElement'])) {
            parent = element.parentElement;
            if (parent) {
                return parent;
            }
        }
    }
    parent = element.parentNode;
    return isElement(parent) ? parent : null;
}
/**
 * Whether a node contains another node.
 * @param parent The node that should contain the other node.
 * @param descendant The node to test presence of.
 * @return Whether the parent node contains the descendent node.
 */
function contains(parent, descendant) {
    if (!parent || !descendant) {
        return false;
    }
    // We use browser specific methods for this if available since it is faster
    // that way.
    // IE DOM
    if (parent.contains && descendant.nodeType == nodetype_1.NodeType.ELEMENT) {
        return parent == descendant || parent.contains(descendant);
    }
    // W3C DOM Level 3
    if (typeof parent.compareDocumentPosition != 'undefined') {
        return parent == descendant ||
            Boolean(parent.compareDocumentPosition(descendant) & 16);
    }
    // W3C DOM Level 1
    while (descendant && parent != descendant) {
        descendant = descendant.parentNode;
    }
    return descendant == parent;
}
/**
 * Compares the document order of two nodes, returning 0 if they are the same
 * node, a negative number if node1 is before node2, and a positive number if
 * node2 is before node1.  Note that we compare the order the tags appear in the
 * document so in the tree <b><i>text</i></b> the B node is considered to be
 * before the I node.
 *
 * @param node1 The first node to compare.
 * @param node2 The second node to compare.
 * @return 0 if the nodes are the same node, a negative number if node1
 *     is before node2, and a positive number if node2 is before node1.
 */
function compareNodeOrder(node1, node2) {
    // Fall out quickly for equality.
    if (node1 == node2) {
        return 0;
    }
    // Use compareDocumentPosition where available
    if (node1.compareDocumentPosition) {
        // 4 is the bitmask for FOLLOWS.
        return node1.compareDocumentPosition(node2) & 2 ? 1 : -1;
    }
    // Special case for document nodes on IE 7 and 8.
    if (useragent_1.userAgent.IE && !useragent_1.userAgent.isDocumentModeOrHigher(9)) {
        if (node1.nodeType == nodetype_1.NodeType.DOCUMENT) {
            return -1;
        }
        if (node2.nodeType == nodetype_1.NodeType.DOCUMENT) {
            return 1;
        }
    }
    // Process in IE using sourceIndex - we check to see if the first node has
    // a source index or if its parent has one.
    if ('sourceIndex' in node1 ||
        (node1.parentNode && 'sourceIndex' in node1.parentNode)) {
        let isElement1 = node1.nodeType == nodetype_1.NodeType.ELEMENT;
        let isElement2 = node2.nodeType == nodetype_1.NodeType.ELEMENT;
        if (isElement1 && isElement2) {
            return node1.sourceIndex - node2.sourceIndex;
        }
        else {
            let parent1 = node1.parentNode;
            let parent2 = node2.parentNode;
            if (parent1 == parent2) {
                return compareSiblingOrder_(node1, node2);
            }
            if (!isElement1 && contains(parent1, node2)) {
                return -1 * compareParentsDescendantNodeIe_(node1, node2);
            }
            if (!isElement2 && contains(parent2, node1)) {
                return compareParentsDescendantNodeIe_(node2, node1);
            }
            return (isElement1 ? node1.sourceIndex : parent1.sourceIndex) -
                (isElement2 ? node2.sourceIndex : parent2.sourceIndex);
        }
    }
    // For Safari, we compare ranges.
    let doc = getOwnerDocument(node1);
    let range1, range2;
    range1 = doc.createRange();
    range1.selectNode(node1);
    range1.collapse(true);
    range2 = doc.createRange();
    range2.selectNode(node2);
    range2.collapse(true);
    return range1.compareBoundaryPoints(window['Range'].START_TO_END, range2);
}
/**
 * Utility function to compare the position of two nodes, when
 * {@code textNode}'s parent is an ancestor of {@code node}.  If this entry
 * condition is not met, this function will attempt to reference a null object.
 * @param textNode The textNode to compare.
 * @param node The node to compare.
 * @return -1 if node is before textNode, +1 otherwise.
 * @private
 */
function compareParentsDescendantNodeIe_(textNode, node) {
    let parent = textNode.parentNode;
    if (parent == node) {
        // If textNode is a child of node, then node comes first.
        return -1;
    }
    let sibling = node;
    while (sibling && sibling.parentNode != parent) {
        sibling = sibling.parentNode;
    }
    return compareSiblingOrder_(sibling, textNode);
}
/**
 * Utility function to compare the position of two nodes known to be non-equal
 * siblings.
 * @param node1 The first node to compare.
 * @param node2 The second node to compare.
 * @return -1 if node1 is before node2, +1 otherwise.
 * @private
 */
function compareSiblingOrder_(node1, node2) {
    let s = node2;
    while (s && (s = s.previousSibling)) {
        if (s == node1) {
            // We just found node1 before node2.
            return -1;
        }
    }
    // Since we didn't find it, node1 must be after node2.
    return 1;
}
/**
 * Find the deepest common ancestor of the given nodes.
 * @param var_args The nodes to find a common ancestor of.
 * @return The common ancestor of the nodes, or null if there is none.
 *     null will only be returned if two or more of the nodes are from different
 *     documents.
 */
function findCommonAncestor(...var_args) {
    let i, count = var_args.length;
    if (!count) {
        return null;
    }
    else if (count == 1) {
        return var_args[0];
    }
    let paths = [];
    let minLength = Infinity;
    for (i = 0; i < count; i++) {
        // Compute the list of ancestors.
        let ancestors = [];
        let node = var_args[i];
        while (node) {
            ancestors.unshift(node);
            node = node.parentNode;
        }
        // Save the list for comparison.
        paths.push(ancestors);
        minLength = Math.min(minLength, ancestors.length);
    }
    let output = null;
    for (i = 0; i < minLength; i++) {
        let first = paths[0][i];
        for (let j = 1; j < count; j++) {
            if (first != paths[j][i]) {
                return output;
            }
        }
        output = first;
    }
    return output;
}
/**
 * Returns the owner document for a node.
 * @param node The node to get the document for.
 * @return The document owning the node.
 */
function getOwnerDocument(node) {
    // TODO(nnaze): Update param signature to be non-nullable.
    console.assert(node, 'Node cannot be null or undefined.');
    return node.nodeType == nodetype_1.NodeType.DOCUMENT ? node : node.ownerDocument ||
        node.document;
}
/**
 * Cross-browser function for getting the document element of a frame or iframe.
 * @param frame Frame element.
 * @return {!Document} The frame content document.
 */
function getFrameContentDocument(frame) {
    return frame.contentDocument ||
        frame.contentWindow.document;
}
/**
 * Cross-browser function for getting the window of a frame or iframe.
 * @param frame Frame element.
 * @return {Window} The window associated with the given frame, or null if none
 *     exists.
 */
function getFrameContentWindow(frame) {
    try {
        return frame.contentWindow ||
            (frame.contentDocument ? getWindow(frame.contentDocument) :
                null);
    }
    catch (e) {
        // NOTE(user): In IE8, checking the contentWindow or contentDocument
        // properties will throw a "Unspecified Error" exception if the iframe is
        // not inserted in the DOM. If we get this we can be sure that no window
        // exists, so return null.
    }
    return null;
}
/**
 * Sets the text content of a node, with cross-browser support.
 * @param {Node} node The node to change the text content of.
 * @param {string|number} text The value that should replace the node's content.
 */
function setTextContent(node, text) {
    console.assert(node != null, 'setTextContent expects a non-null value for node');
    let nodeEl = node;
    if ('textContent' in node) {
        nodeEl.textContent = typeof text === 'number' ? String(text) : text;
    }
    else if (nodeEl.nodeType == nodetype_1.NodeType.TEXT) {
        nodeEl.data = text;
    }
    else if (nodeEl.firstChild && nodeEl.firstChild.nodeType == nodetype_1.NodeType.TEXT) {
        // If the first child is a text node we just change its data and remove the
        // rest of the children.
        while (nodeEl.lastChild != nodeEl.firstChild) {
            nodeEl.removeChild(nodeEl.lastChild);
        }
        nodeEl.firstChild.data = text;
    }
    else {
        removeChildren(node);
        let doc = getOwnerDocument(node);
        nodeEl.appendChild(doc.createTextNode(String(text)));
    }
}
/**
 * Gets the outerHTML of a node, which islike innerHTML, except that it
 * actually contains the HTML of the node itself.
 * @param element The element to get the HTML of.
 * @return The outerHTML of the given element.
 */
function getOuterHtml(element) {
    console.assert(element !== null, 'getOuterHtml expects a non-null value for element');
    // IE, Opera and WebKit all have outerHTML.
    if ('outerHTML' in element) {
        return element.outerHTML;
    }
    else {
        let doc = getOwnerDocument(element);
        let div = doc.createElement(tags_1.TagName.DIV);
        div.appendChild(element.cloneNode(true));
        return div.innerHTML;
    }
}
/**
 * Finds the first descendant node that matches the filter function, using
 * a depth first search. This function offers the most general purpose way
 * of finding a matching element. You may also wish to consider
 * {@code query} which can express many matching criteria using
 * CSS selector expressions. These expressions often result in a more
 * compact representation of the desired result.
 * @see query
 *
 * @param {Node} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @return {Node|undefined} The found node or undefined if none is found.
 */
function findNode(root, p) {
    let rv = [];
    let found = findNodes_(root, p, rv, true);
    return found ? rv[0] : undefined;
}
/**
 * Finds all the descendant nodes that match the filter function, using a
 * a depth first search. This function offers the most general-purpose way
 * of finding a set of matching elements. You may also wish to consider
 * {@code query} which can express many matching criteria using
 * CSS selector expressions. These expressions often result in a more
 * compact representation of the desired result.

 * @param root The root of the tree to search.
 * @param p The filter function.
 * @return The found nodes or an empty array if none are found.
 */
function findNodes(root, p) {
    let rv = [];
    findNodes_(root, p, rv, false);
    return rv;
}
/**
 * Finds the first or all the descendant nodes that match the filter function,
 * using a depth first search.
 * @param root The root of the tree to search.
 * @param p The filter function.
 * @param rv The found nodes are added to this array.
 * @param findOne If true we exit after the first found node.
 * @return Whether the search is complete or not. True in case findOne
 *     is true and the node is found. False otherwise.
 * @private
 */
function findNodes_(root, p, rv, findOne) {
    if (root != null) {
        let child = root.firstChild;
        while (child) {
            if (p(child)) {
                rv.push(child);
                if (findOne) {
                    return true;
                }
            }
            if (findNodes_(child, p, rv, findOne)) {
                return true;
            }
            child = child.nextSibling;
        }
    }
    return false;
}
/**
 * Map of tags whose content to ignore when calculating text length.
 * @private {!Object<string, number>}
 * @const
 */
const TAGS_TO_IGNORE_ = {
    'SCRIPT': 1,
    'STYLE': 1,
    'HEAD': 1,
    'IFRAME': 1,
    'OBJECT': 1
};
/**
 * Map of tags which have predefined values with regard to whitespace.
 * @private {!Object<string, string>}
 * @const
 */
const PREDEFINED_TAG_VALUES_ = {
    'IMG': ' ',
    'BR': '\n'
};
/**
 * Returns true if the element has a tab index that allows it to receive
 * keyboard focus (tabIndex >= 0), false otherwise.  Note that some elements
 * natively support keyboard focus, even if they have no tab index.
 * @param element Element to check.
 * @return Whether the element has a tab index that allows keyboard
 *     focus.
 */
function isFocusableTabIndex(element) {
    return hasSpecifiedTabIndex_(element) &&
        isTabIndexFocusable_(element);
}
/**
 * Enables or disables keyboard focus support on the element via its tab index.
 * Only elements for which {@link isFocusableTabIndex} returns true
 * (or elements that natively support keyboard focus, like form elements) can
 * receive keyboard focus.  See http://go/tabindex for more info.
 * @param element Element whose tab index is to be changed.
 * @param enable Whether to set or remove a tab index on the element
 *     that supports keyboard focus.
 */
function setFocusableTabIndex(element, enable) {
    if (enable) {
        element.tabIndex = 0;
    }
    else {
        // Set tabIndex to -1 first, then remove it. This is a workaround for
        // Safari (confirmed in version 4 on Windows). When removing the attribute
        // without setting it to -1 first, the element remains keyboard focusable
        // despite not having a tabIndex attribute anymore.
        element.tabIndex = -1;
        element.removeAttribute('tabIndex'); // Must be camelCase!
    }
}
/**
 * Returns true if the element can be focused, i.e. it has a tab index that
 * allows it to receive keyboard focus (tabIndex >= 0), or it is an element
 * that natively supports keyboard focus.
 * @param element Element to check.
 * @return Whether the element allows keyboard focus.
 */
function isFocusable(element) {
    let focusable;
    // Some elements can have unspecified tab index and still receive focus.
    if (nativelySupportsFocus_(element)) {
        // Make sure the element is not disabled ...
        focusable = !element.disabled &&
            // ... and if a tab index is specified, it allows focus.
            (!hasSpecifiedTabIndex_(element) ||
                isTabIndexFocusable_(element));
    }
    else {
        focusable = isFocusableTabIndex(element);
    }
    // IE requires elements to be visible in order to focus them.
    return focusable && useragent_1.userAgent.IE ?
        hasNonZeroBoundingRect_(element) :
        focusable;
}
/**
 * Returns true if the element has a specified tab index.
 * @param element Element to check.
 * @return Whether the element has a specified tab index.
 * @private
 */
function hasSpecifiedTabIndex_(element) {
    // IE returns 0 for an unset tabIndex, so we must use getAttributeNode(),
    // which returns an object with a 'specified' property if tabIndex is
    // specified.  This works on other browsers, too.
    let attrNode = element.getAttributeNode('tabindex'); // Must be lowercase!
    return attrNode != null && attrNode.specified;
}
/**
 * Returns true if the element's tab index allows the element to be focused.
 * @param element Element to check.
 * @return Whether the element's tab index allows focus.
 * @private
 */
function isTabIndexFocusable_(element) {
    let index = element.tabIndex;
    // NOTE: IE9 puts tabIndex in 16-bit int, e.g. -2 is 65534.
    return typeof index === 'number' && index >= 0 && index < 32768;
}
/**
 * Returns true if the element is focusable even when tabIndex is not set.
 * @param element Element to check.
 * @return Whether the element natively supports focus.
 * @private
 */
function nativelySupportsFocus_(element) {
    return element.tagName == tags_1.TagName.A ||
        element.tagName == tags_1.TagName.INPUT ||
        element.tagName == tags_1.TagName.TEXTAREA ||
        element.tagName == tags_1.TagName.SELECT ||
        element.tagName == tags_1.TagName.BUTTON;
}
/**
 * Returns true if the element has a bounding rectangle that would be visible
 * (i.e. its width and height are greater than zero).
 * @param element Element to check.
 * @return Whether the element has a non-zero bounding rectangle.
 * @private
 */
function hasNonZeroBoundingRect_(element) {
    let rect;
    if ((0, goog_1.typeOf)(element['getBoundingClientRect']) != 'function' ||
        // In IE, getBoundingClientRect throws on detached nodes.
        (useragent_1.userAgent.IE && element.parentElement == null)) {
        rect = { 'height': element.offsetHeight, 'width': element.offsetWidth };
    }
    else {
        rect = element.getBoundingClientRect();
    }
    return rect != null && rect.height > 0 && rect.width > 0;
}
/**
 * Returns the text content of the current node, without markup and invisible
 * symbols. New lines are stripped and whitespace is collapsed,
 * such that each character would be visible.
 *
 * In browsers that support it, innerText is used.  Other browsers attempt to
 * simulate it via node traversal.  Line breaks are canonicalized in IE.
 *
 * @param node The node from which we are getting content.
 * @return The text content.
 */
function getTextContent(node) {
    let textContent;
    // Note(arv): IE9, Opera, and Safari 3 support innerText but they include
    // text nodes in script tags. So we revert to use a user agent test here.
    if (useragent_1.userAgent.CAN_USE_INNER_TEXT && node !== null &&
        ('innerText' in node)) {
        textContent = (0, string_1.canonicalizeNewlines)(node.innerText);
        // Unfortunately .innerText() returns text with &shy; symbols
        // We need to filter it out and then remove duplicate whitespaces
    }
    else {
        let buf = [];
        getTextContent_(node, buf, true);
        textContent = buf.join('');
    }
    // Strip &shy; entities. goog.format.insertWordBreaks inserts them in Opera.
    textContent = textContent.replace(/ \xAD /g, ' ').replace(/\xAD/g, '');
    // Strip &#8203; entities. goog.format.insertWordBreaks inserts them in IE8.
    textContent = textContent.replace(/\u200B/g, '');
    // Skip this replacement on old browsers with working innerText, which
    // automatically turns &nbsp; into ' ' and / +/ into ' ' when reading
    // innerText.
    if (!useragent_1.userAgent.CAN_USE_INNER_TEXT) {
        textContent = textContent.replace(/ +/g, ' ');
    }
    if (textContent != ' ') {
        textContent = textContent.replace(/^\s*/, '');
    }
    return textContent;
}
/**
 * Returns the text content of the current node, without markup.
 *
 * Unlike {@code getTextContent} this method does not collapse whitespaces
 * or normalize lines breaks.
 *
 * @param node The node from which we are getting content.
 * @return The raw text content.
 */
function getRawTextContent(node) {
    let buf = [];
    getTextContent_(node, buf, false);
    return buf.join('');
}
/**
 * Recursive support function for text content retrieval.
 *
 * @param node The node from which we are getting content.
 * @param buf string buffer.
 * @param normalizeWhitespace Whether to normalize whitespace.
 * @private
 */
function getTextContent_(node, buf, normalizeWhitespace) {
    const nodeEl = node;
    if (nodeEl.nodeName in TAGS_TO_IGNORE_) {
        // ignore certain tags
    }
    else if (nodeEl.nodeType == nodetype_1.NodeType.TEXT) {
        if (normalizeWhitespace) {
            buf.push(String(nodeEl.nodeValue).replace(/(\r\n|\r|\n)/g, ''));
        }
        else {
            buf.push(nodeEl.nodeValue);
        }
    }
    else if (nodeEl.nodeName in PREDEFINED_TAG_VALUES_) {
        buf.push(PREDEFINED_TAG_VALUES_[nodeEl.nodeName]);
    }
    else {
        let child = nodeEl.firstChild;
        while (child) {
            getTextContent_(child, buf, normalizeWhitespace);
            child = child.nextSibling;
        }
    }
}
/**
 * Returns the text length of the text contained in a node, without markup. This
 * is equivalent to the selection length if the node was selected, or the number
 * of cursor movements to traverse the node. Images & BRs take one space.  New
 * lines are ignored.
 *
 * @param node The node whose text content length is being calculated.
 * @return The length of {@code node}'s text content.
 */
function getNodeTextLength(node) {
    return getTextContent(node).length;
}
/**
 * Returns the text offset of a node relative to one of its ancestors. The text
 * length is the same as the length calculated by getNodeTextLength.
 *
 * @param node The node whose offset is being calculated.
 * @param opt_offsetParent The node relative to which the offset will
 *     be calculated. Defaults to the node's owner document's body.
 * @return The text offset.
 */
function getNodeTextOffset(node, opt_offsetParent) {
    let root = opt_offsetParent || getOwnerDocument(node).body;
    let buf = [];
    while (node && node != root) {
        let cur = node;
        while (cur = (cur.previousSibling)) {
            buf.unshift(getTextContent(cur));
        }
        node = node.parentNode;
    }
    // Trim left to deal with FF cases when there might be line breaks and empty
    // nodes at the front of the text
    return buf.join('').trimStart().replace(/ +/g, ' ').length;
}
/**
 * Returns the node at a given offset in a parent node.  If an object is
 * provided for the optional third parameter, the node and the remainder of the
 * offset will stored as properties of this object.
 * @param parent The parent node.
 * @param offset The offset into the parent node.
 * @param opt_result Object to be used to store the return value. The
 *     return value will be stored in the form {node: Node, remainder: number}
 *     if this object is provided.
 * @return The node at the given offset.
 */
function getNodeAtOffset(parent, offset, opt_result) {
    let stack = [parent], pos = 0;
    let cur = null;
    while (stack.length > 0 && pos < offset) {
        cur = stack.pop();
        if (cur.nodeName in TAGS_TO_IGNORE_) {
            // ignore certain tags
        }
        else if (cur.nodeType == nodetype_1.NodeType.TEXT) {
            let text = cur.nodeValue.replace(/(\r\n|\r|\n)/g, '').replace(/ +/g, ' ');
            pos += text.length;
        }
        else if (cur.nodeName in PREDEFINED_TAG_VALUES_) {
            pos += PREDEFINED_TAG_VALUES_[cur.nodeName].length;
        }
        else {
            for (let i = cur.childNodes.length - 1; i >= 0; i--) {
                stack.push(cur.childNodes[i]);
            }
        }
    }
    if (opt_result) {
        opt_result.remainder = cur && cur.nodeValue ? cur.nodeValue.length + offset - pos - 1 : 0;
        opt_result.node = cur;
    }
    return cur;
}
/**
 * Returns true if the object is a {@code NodeList}.  To qualify as a NodeList,
 * the object must have a numeric length property and an item function (which
 * has type 'string' on IE for some reason).
 * @param val Object to test.
 * @return Whether the object is a NodeList.
 */
function isNodeList(val) {
    // TODO(attila): Now the isNodeList is part of goog.dom we can use
    // goog.userAgent to make this simpler.
    // A NodeList must have a length property of type 'number' on all platforms.
    if (val && typeof val.length == 'number') {
        // A NodeList is an object everywhere except Safari, where it's a function.
        if ((0, goog_1.isObject)(val)) {
            // A NodeList must have an item function (on non-IE platforms) or an item
            // property of type 'string' (on IE).
            return typeof val.item == 'function' || typeof val.item == 'string';
        }
        else if ((0, goog_1.typeOf)(val) == 'function') {
            // On Safari, a NodeList is a function with an item property that is also
            // a function.
            return typeof val.item == 'function';
        }
    }
    // Not a NodeList.
    return false;
}
/**
 * Walks up the DOM hierarchy returning the first ancestor that has the passed
 * tag name and/or class name. If the passed element matches the specified
 * criteria, the element itself is returned.
 * @param element The DOM node to start with.
 * @param opt_tag The tag name to match (or
 *     null/undefined to match only based on class name).
 * @param opt_class The class name to match (or null/undefined to
 *     match only based on tag name).
 * @param opt_maxSearchSteps Maximum number of levels to search up the
 *     dom.
 * @return The first ancestor that matches the passed criteria, or
 *     null if no match is found.
 */
function getAncestorByTagNameAndClass(element, opt_tag, opt_class, opt_maxSearchSteps) {
    if (!opt_tag && !opt_class) {
        return null;
    }
    let tagName = opt_tag ? opt_tag.toUpperCase() : null;
    return (getAncestor(element, (node) => {
        return (!tagName || node.nodeName == tagName) &&
            (!opt_class ||
                typeof (node.className) == "string" && classlist_1.default.contains(node, opt_class));
    }, true, opt_maxSearchSteps));
}
/**
 * Walks up the DOM hierarchy returning the first ancestor that has the passed
 * class name. If the passed element matches the specified criteria, the
 * element itself is returned.
 * @param element The DOM node to start with.
 * @param className The class name to match.
 * @param opt_maxSearchSteps Maximum number of levels to search up the
 *     dom.
 * @return The first ancestor that matches the passed criteria, or
 *     null if none match.
 */
function getAncestorByClass(element, className, opt_maxSearchSteps) {
    return getAncestorByTagNameAndClass(element, undefined, className, opt_maxSearchSteps);
}
/**
 * Walks up the DOM hierarchy returning the first ancestor that passes the
 * matcher function.
 * @param element The DOM node to start with.
 * @param matcher A function that returns true if the
 *     passed node matches the desired criteria.
 * @param opt_includeNode If true, the node itself is included in
 *     the search (the first call to the matcher will pass startElement as
 *     the node to test).
 * @param opt_maxSearchSteps Maximum number of levels to search up the
 *     dom.
 * @return DOM node that matched the matcher, or null if there was
 *     no match.
 */
function getAncestor(element, matcher, opt_includeNode, opt_maxSearchSteps) {
    if (!opt_includeNode) {
        element = element.parentNode;
    }
    let steps = 0;
    while (element &&
        (opt_maxSearchSteps == null || steps <= opt_maxSearchSteps)) {
        console.assert(element.name != 'parentNode');
        if (matcher(element)) {
            return element;
        }
        element = element.parentNode;
        steps++;
    }
    // Reached the root of the DOM without a match
    return null;
}
/**
 * Determines the active element in the given document.
 * @param doc The document to look in.
 * @return The active element.
 */
function getActiveElement(doc) {
    try {
        return doc && doc.activeElement;
    }
    catch (e) {
        // NOTE(nicksantos): Sometimes, evaluating document.activeElement in IE
        // throws an exception. I'm not 100% sure why, but I suspect it chokes
        // on document.activeElement if the activeElement has been recently
        // removed from the DOM by a JS operation.
        //
        // We assume that an exception here simply means
        // "there is no active element."
    }
    return null;
}
/**
 * Gives the current devicePixelRatio.
 *
 * By default, this is the value of window.devicePixelRatio (which should be
 * preferred if present).
 *
 * If window.devicePixelRatio is not present, the ratio is calculated with
 * window.matchMedia, if present. Otherwise, gives 1.0.
 *
 * Some browsers (including Chrome) consider the browser zoom level in the pixel
 * ratio, so the value may change across multiple calls.
 *
 * @return The number of actual pixels per virtual pixel.
 */
function getPixelRatio(opt_window) {
    let win = opt_window ? opt_window : getWindow();
    if (win.devicePixelRatio != undefined) {
        return win.devicePixelRatio;
    }
    else if (win.matchMedia) {
        return matchesPixelRatio_(.75, win) ||
            matchesPixelRatio_(1.5, win) || matchesPixelRatio_(2, win) ||
            matchesPixelRatio_(3, win) || 1;
    }
    return 1;
}
/**
 * Calculates a mediaQuery to check if the current device supports the
 * given actual to virtual pixel ratio.
 * @param pixelRatio The ratio of actual pixels to virtual pixels.
 * @param opt_win
 * @return pixelRatio if applicable, otherwise 0.
 *
 */
function matchesPixelRatio_(pixelRatio, opt_win) {
    let win = opt_win || getWindow();
    let query = ('(-webkit-min-device-pixel-ratio: ' + pixelRatio + '),' +
        '(min--moz-device-pixel-ratio: ' + pixelRatio + '),' +
        '(min-resolution: ' + pixelRatio + 'dppx)');
    return win.matchMedia(query).matches ? pixelRatio : 0;
}
/**
 * Create an instance of a DOM helper with a new document object.
 * @param opt_document Document object to associate with this
 *     DOM helper.
 * @constructor
 */
class DomHelper {
    constructor(opt_document) {
        /**
         * Returns an element's parent, if it's an Element.
         * @param element The DOM element.
         * @return The parent, or null if not an Element.
         */
        this.getParentElement = getParentElement;
        /**
         * Whether a node contains another node.
         * @param parent The node that should contain the other node.
         * @param descendant The node to test presence of.
         * @return Whether the parent node contains the descendent node.
         */
        this.contains = contains;
        /**
         * Compares the document order of two nodes, returning 0 if they are the same
         * node, a negative number if node1 is before node2, and a positive number if
         * node2 is before node1.  Note that we compare the order the tags appear in the
         * document so in the tree <b><i>text</i></b> the B node is considered to be
         * before the I node.
         *
         * @param node1 The first node to compare.
         * @param node2 The second node to compare.
         * @return 0 if the nodes are the same node, a negative number if node1
         *     is before node2, and a positive number if node2 is before node1.
         */
        this.compareNodeOrder = compareNodeOrder;
        /**
         * Find the deepest common ancestor of the given nodes.
         * @param var_args The nodes to find a common ancestor of.
         * @return The common ancestor of the nodes, or null if there is none.
         *     null will only be returned if two or more of the nodes are from different
         *     documents.
         */
        this.findCommonAncestor = findCommonAncestor;
        /**
         * Returns the owner document for a node.
         * @param node The node to get the document for.
         * @return The document owning the node.
         */
        this.getOwnerDocument = getOwnerDocument;
        /**
         * Cross browser function for getting the document element of an iframe.
         * @param iframe Iframe element.
         * @return The frame content document.
         */
        this.getFrameContentDocument = getFrameContentDocument;
        /**
         * Enables or disables keyboard focus support on the element via its tab index.
         * Only elements for which {@link isFocusableTabIndex} returns true
         * (or elements that natively support keyboard focus, like form elements) can
         * receive keyboard focus.  See http://go/tabindex for more info.
         * @param element Element whose tab index is to be changed.
         * @param enable Whether to set or remove a tab index on the element
         *     that supports keyboard focus.
         */
        this.setFocusableTabIndex = setFocusableTabIndex;
        /**
         * Returns the text contents of the current node, without markup. New lines are
         * stripped and whitespace is collapsed, such that each character would be
         * visible.
         *
         * In browsers that support it, innerText is used.  Other browsers attempt to
         * simulate it via node traversal.  Line breaks are canonicalized in IE.
         *
         * @param node The node from which we are getting content.
         * @return The text content.
         */
        this.getTextContent = getTextContent;
        /**
         * Walks up the DOM hierarchy returning the first ancestor that has the passed
         * tag name and/or class name. If the passed element matches the specified
         * criteria, the element itself is returned.
         * @param element The DOM node to start with.
         * @param opt_tag The tag name to match (or
         *     null/undefined to match only based on class name).
         * @param opt_class The class name to match (or null/undefined to
         *     match only based on tag name).
         * @param opt_maxSearchSteps Maximum number of levels to search up the
         *     dom.
         * @return The first ancestor that matches the passed criteria, or
         *     null if no match is found.
         */
        this.getAncestorByTagNameAndClass = getAncestorByTagNameAndClass;
        /**
         * Walks up the DOM hierarchy returning the first ancestor that has the passed
         * class name. If the passed element matches the specified criteria, the
         * element itself is returned.
         * @param element The DOM node to start with.
         * @param class The class name to match.
         * @param opt_maxSearchSteps Maximum number of levels to search up the
         *     dom.
         * @return The first ancestor that matches the passed criteria, or
         *     null if none match.
         */
        this.getAncestorByClass = getAncestorByClass;
        /**
         * Walks up the DOM hierarchy returning the first ancestor that passes the
         * matcher function.
         * @param element The DOM node to start with.
         * @param matcher A function that returns true if the
         *     passed node matches the desired criteria.
         * @param opt_includeNode If true, the node itself is included in
         *     the search (the first call to the matcher will pass startElement as
         *     the node to test).
         * @param opt_maxSearchSteps Maximum number of levels to search up the
         *     dom.
         * @return DOM node that matched the matcher, or null if there was
         *     no match.
         */
        this.getAncestor = getAncestor;
        this.document_ = opt_document || document;
    }
    /**
     * Gets the dom helper object for the document where the element resides.
     * @param opt_node If present, gets the DomHelper for this node.
     * @return The DomHelper.
     */
    getDomHelper(node) {
        return getDomHelper(node);
    }
    /**
     * Sets the document object.
     * @param document Document object.
     */
    setDocument(document) {
        this.document_ = document;
    }
    /**
     * Gets the dimensions of the viewport.
     * @param opt_window Optional window element to test. Defaults to
     *     the window of the Dom Helper.
     * @return Object with values 'width' and 'height'.
     */
    getViewportSize(opt_window) {
        // TODO(arv): This should not take an argument. That breaks the rule of a
        // a DomHelper representing a single frame/window/document.
        return getViewportSize(opt_window || this.getWindow());
    }
    /**
     * Gets the document object being used by the dom library.
     * @return Document object.
     */
    getDocument() {
        return this.document_;
    }
    /**
     * Alias for {@code getElementById}. If a DOM node is passed in then we just
     * return that.
     * @param element Element ID or a DOM node.
     * @return The element with the given ID, or the node passed in.
     */
    getElement(element) {
        return getElementHelper_(this.document_, element);
    }
    /**
     * Gets an element by id, asserting that the element is found.
     *
     * This is used when an element is expected to exist, and should fail with
     * an assertion error if it does not (if assertions are enabled).
     *
     * @param id Element ID.
     * @return The element with the given ID, if it exists.
     */
    getRequiredElement(id) {
        return getRequiredElementHelper_(this.document_, id);
    }
    /**
     * Looks up elements by both tag and class name, using browser native functions
     * ({@code querySelectorAll}, or
     * {@code getElementsByClassName}) where possible. The returned array is a live
     * NodeList or a static list depending on the code path taken.
     *
     * @see query
     *
     * @param opt_tag Element tag name or * for all tags.
     * @param opt_class Optional class name.
     * @param opt_el Optional element to look in.
     * @return Array-like list of elements (only a length
     *     property and numerical indices are guaranteed to exist).
     */
    getElementsByTagNameAndClass(opt_tag, opt_class, opt_el) {
        return getElementsByTagNameAndClass_(this.document_, opt_tag, opt_class, opt_el);
    }
    /**
     * Returns an array of all the elements with the provided className.
     * @see {query}
     * @param className the name of the class to look for.
     * @param opt_el Optional element to look in.
     * @return The items found with the class name provided.
     */
    getElementsByClass(className, opt_el) {
        let doc = opt_el || this.document_;
        return getElementsByClass(className, doc);
    }
    /**
     * Returns the first element we find matching the provided class name.
     * @see {query}
     * @param className the name of the class to look for.
     * @param opt_el Optional element to look in.
     * @return The first item found with the class name provided.
     */
    getElementByClass(className, opt_el) {
        let doc = opt_el || this.document_;
        return getElementByClass(className, doc);
    }
    /**
     * Ensures an element with the given className exists, and then returns the
     * first element with the provided className.
     * @see {query}
     * @param className the name of the class to look for.
     * @param opt_root Optional element or document to look
     *     in.
     * @return The first item found with the class name provided.
     * @throws Thrown if no element is found.
     */
    getRequiredElementByClass(className, opt_root) {
        let root = opt_root || this.document_;
        return getRequiredElementByClass(className, root);
    }
    /**
     * Sets a number of properties on a node.
     * @param element DOM node to set properties on.
     * @param properties Hash of property:value pairs.
     */
    setProperties(element, properties) {
        setProperties(element, properties);
    }
    /**
     * Appends a child to a node.
     * @param parent Parent.
     * @param child Child.
     */
    appendChild(parent, child) {
        appendChild(parent, child);
    }
    /**
     * Appends a node with text or other nodes.
     * @param parent The node to append nodes to.
     * @param var_args The things to append to the node.
     *     If this is a Node it is appended as is.
     *     If this is a string then a text node is appended.
     *     If this is an array like object then fields 0 to length - 1 are appended.
     */
    append(parent, ...var_args) {
        append(parent, ...var_args);
    }
    /**
     * Determines if the given node can contain children, intended to be used for
     * HTML generation.
     *
     * @param node The node to check.
     * @return Whether the node can contain children.
     */
    canHaveChildren(node) {
        return canHaveChildren(node);
    }
    /**
     * Removes all the child nodes on a DOM node.
     * @param node Node to remove children from.
     */
    removeChildren(node) {
        removeChildren(node);
    }
    /**
     * Inserts a new node before an existing reference node (i.e., as the previous
     * sibling). If the reference node has no parent, then does nothing.
     * @param newNode Node to insert.
     * @param refNode Reference node to insert before.
     */
    insertSiblingBefore(newNode, refNode) {
        insertSiblingBefore(newNode, refNode);
    }
    /**
     * Inserts a new node after an existing reference node (i.e., as the next
     * sibling). If the reference node has no parent, then does nothing.
     * @param newNode Node to insert.
     * @param refNode Reference node to insert after.
     */
    insertSiblingAfter(newNode, refNode) {
        insertSiblingAfter(newNode, refNode);
    }
    /**
     * Insert a child at a given index. If index is larger than the number of child
     * nodes that the parent currently has, the node is inserted as the last child
     * node.
     * @param parent The element into which to insert the child.
     * @param child The element to insert.
     * @param index The index at which to insert the new child node. Must
     *     not be negative.
     */
    insertChildAt(parent, child, index) {
        insertChildAt(parent, child, index);
    }
    /**
     * Removes a node from its parent.
     * @param node The node to remove.
     * @return The node removed if removed; else, null.
     */
    removeNode(node) {
        return removeNode(node);
    }
    /**
     * Replaces a node in the DOM tree. Will do nothing if {@code oldNode} has no
     * parent.
     * @param newNode Node to insert.
     * @param oldNode Node to replace.
     */
    replaceNode(newNode, oldNode) {
        replaceNode(newNode, oldNode);
    }
    /**
     * Returns an array containing just the element children of the given element.
     * @param element The element whose element children we want.
     * @return An array or array-like list
     *     of just the element children of the given element.
     */
    getChildren(element) {
        return getChildren(element);
    }
    /**
     * Returns the first child node that is an element.
     * @param node The node to get the first child element of.
     * @return The first child node of {@code node} that is an element.
     */
    getFirstElementChild(node) {
        return getFirstElementChild(node);
    }
    /**
     * Returns the last child node that is an element.
     * @param node The node to get the last child element of.
     * @return that is an element.
     */
    getLastElementChild(node) {
        return getLastElementChild(node);
    }
    /**
     * Returns the first next sibling that is an element.
     * @param node The node to get the next sibling element of.
     * @return The next sibling of {@code node} that is an element.
     */
    getNextElementSibling(node) {
        return getNextElementSibling(node);
    }
    /**
     * Returns the first previous sibling that is an element.
     * @param node The node to get the previous sibling element of.
     * @return The first previous sibling of {@code node} that is
     *     an element.
     */
    getPreviousElementSibling(node) {
        return getPreviousElementSibling(node);
    }
    /**
     * Returns the next node in source order from the given node.
     * @param node The node.
     * @return The next node in the DOM tree, or null if this was the last
     *     node.
     */
    getNextNode(node) {
        return getNextNode(node);
    }
    /**
     * Returns the previous node in source order from the given node.
     * @param node The node.
     * @return The previous node in the DOM tree, or null if this was the
     *     first node.
     */
    getPreviousNode(node) {
        return getPreviousNode(node);
    }
    /**
     * Whether the object looks like a DOM node.
     * @param obj The object being tested for node likeness.
     * @return Whether the object looks like a DOM node.
     */
    isNodeLike(obj) {
        return isNodeLike(obj);
    }
    /**
     * Whether the object looks like an Element.
     * @param obj The object being tested for Element likeness.
     * @return Whether the object looks like an Element.
     */
    isElement(obj) {
        return isElement(obj);
    }
    /**
     * Returns true if the specified value is a Window object. This includes the
     * global window for HTML pages, and iframe windows.
     * @param obj Variable to test.
     * @return Whether the variable is a window.
     */
    isWindow(obj) {
        return isWindow(obj);
    }
    /**
     * Cross browser function for getting the window of a frame or iframe.
     * @param frame Frame element.
     * @return The window associated with the given frame.
     */
    getFrameContentWindow(frame) {
        return getFrameContentWindow(frame);
    }
    /**
     * Sets the text content of a node, with cross-browser support.
     * @param node The node to change the text content of.
     * @param text The value that should replace the node's content.
     */
    setTextContent(node, text) {
        setTextContent(node, text);
    }
    /**
     * Gets the outerHTML of a node, which islike innerHTML, except that it
     * actually contains the HTML of the node itself.
     * @param element The element to get the HTML of.
     * @return The outerHTML of the given element.
     */
    getOuterHtml(element) {
        return getOuterHtml(element);
    }
    /**
     * Finds the first descendant node that matches the filter function. This does
     * a depth first search.
     * @param root The root of the tree to search.
     * @param p The filter function.
     * @return The found node or undefined if none is found.
     */
    findNode(root, p) {
        return findNode(root, p);
    }
    /**
     * Finds all the descendant nodes that matches the filter function. This does a
     * depth first search.
     * @param root The root of the tree to search.
     * @param p The filter function.
     * @return The found nodes or an empty array if none are found.
     */
    findNodes(root, p) {
        return findNodes(root, p);
    }
    /**
     * Returns true if the element has a tab index that allows it to receive
     * keyboard focus (tabIndex >= 0), false otherwise.  Note that some elements
     * natively support keyboard focus, even if they have no tab index.
     * @param element Element to check.
     * @return Whether the element has a tab index that allows keyboard
     *     focus.
     */
    isFocusableTabIndex(element) {
        return isFocusableTabIndex(element);
    }
    /**
     * Returns true if the element can be focused, i.e. it has a tab index that
     * allows it to receive keyboard focus (tabIndex >= 0), or it is an element
     * that natively supports keyboard focus.
     * @param element Element to check.
     * @return Whether the element allows keyboard focus.
     */
    isFocusable(element) {
        return isFocusable(element);
    }
    /**
     * Returns the text length of the text contained in a node, without markup. This
     * is equivalent to the selection length if the node was selected, or the number
     * of cursor movements to traverse the node. Images & BRs take one space.  New
     * lines are ignored.
     *
     * @param node The node whose text content length is being calculated.
     * @return The length of {@code node}'s text content.
     */
    getNodeTextLength(node) {
        return getNodeTextLength(node);
    }
    /**
     * Returns the text offset of a node relative to one of its ancestors. The text
     * length is the same as the length calculated by
     * {@code getNodeTextLength}.
     *
     * @param node The node whose offset is being calculated.
     * @param opt_offsetParent Defaults to the node's owner document's body.
     * @return The text offset.
     */
    getNodeTextOffset(node, opt_offsetParent) {
        return getNodeTextOffset(node, opt_offsetParent);
    }
    /**
     * Returns the node at a given offset in a parent node.  If an object is
     * provided for the optional third parameter, the node and the remainder of the
     * offset will stored as properties of this object.
     * @param parent The parent node.
     * @param offset The offset into the parent node.
     * @param opt_result Object to be used to store the return value. The
     *     return value will be stored in the form {node: Node, remainder: number}
     *     if this object is provided.
     * @return The node at the given offset.
     */
    getNodeAtOffset(parent, offset, opt_result) {
        return getNodeAtOffset(parent, offset, opt_result);
    }
    /**
     * Returns true if the object is a {@code NodeList}.  To qualify as a NodeList,
     * the object must have a numeric length property and an item function (which
     * has type 'string' on IE for some reason).
     * @param val Object to test.
     * @return Whether the object is a NodeList.
     */
    isNodeList(val) {
        return isNodeList(val);
    }
    /**
     * Returns a dom node with a set of attributes.  This function accepts varargs
     * for subsequent nodes to be added.  Subsequent nodes will be added to the
     * first node as childNodes.
     *
     * So:
     * <code>createDom('div', null, createDom('p'), createDom('p'));</code>
     * would return a div with two child paragraphs
     *
     * An easy way to move all child nodes of an existing element to a new parent
     * element is:
     * <code>createDom('div', null, oldElement.childNodes);</code>
     * which will remove all child nodes from the old element and add them as
     * child nodes of the new DIV.
     *
     * @param  tagName Tag to create.
     * @param opt_attributes If object, then a map of name-value
     *     pairs for attributes. If a string, then this is the className of the new
     *     element.
     * @param var_args Further DOM nodes or
     *     strings for text nodes. If one of the var_args is an array or
     *     NodeList, its elements will be added as childNodes instead.
     * @return Reference to a DOM node.
     */
    createDom(tagName, opt_attributes, ...var_args) {
        return createDom_(this.document_, tagName, opt_attributes, ...var_args);
    }
    /**
     * Creates a new element.
     * @param name Tag name.
     * @return The new element.
     */
    createElement(name) {
        return this.document_.createElement(name);
    }
    /**
     * Creates a new text node.
     * @param content Content.
     * @return The new text node.
     */
    createTextNode(content) {
        return this.document_.createTextNode(String(content));
    }
    /**
     * Create a table.
     * @param rows The number of rows in the table.  Must be >= 1.
     * @param columns The number of columns in the table.  Must be >= 1.
     * @param opt_fillWithNbsp If true, fills table entries with
     *     characters.
     * @return The created table.
     */
    createTable(rows, columns, opt_fillWithNbsp) {
        return createTable_(this.document_, rows, columns, !!opt_fillWithNbsp);
    }
    /**
     * Returns true if the browser is in "CSS1-compatible" (standards-compliant)
     * mode, false otherwise.
     * @return True if in CSS1-compatible mode.
     */
    isCss1CompatMode() {
        return isCss1CompatMode_(this.document_);
    }
    /**
     * Gets the window object associated with the document.
     * @return The window associated with the given document.
     */
    getWindow() {
        return getWindow_(this.document_);
    }
    /**
     * Gets the document scroll element.
     * @return Scrolling element.
     */
    getDocumentScrollElement() {
        return getDocumentScrollElement_(this.document_);
    }
    /**
     * Gets the document scroll distance as a coordinate object.
     * @return Object with properties 'x' and 'y'.
     */
    getDocumentScroll() {
        return getDocumentScroll_(this.document_);
    }
    /**
     * Determines the active element in the given document.
     * @param opt_doc The document to look in.
     * @return The active element.
     */
    getActiveElement(opt_doc) {
        return getActiveElement(opt_doc || this.document_);
    }
}
exports.DomHelper = DomHelper;
/**
 * Gets the dimensions of the viewport.
 *
 * Gecko Standards mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Width of viewport including scrollbar.
 * body.clientWidth   Width of body element.
 *
 * docEl.clientHeight Height of viewport excluding scrollbar.
 * win.innerHeight    Height of viewport including scrollbar.
 * body.clientHeight  Height of document.
 *
 * Gecko Backwards compatible mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Width of viewport including scrollbar.
 * body.clientWidth   Width of viewport excluding scrollbar.
 *
 * docEl.clientHeight Height of document.
 * win.innerHeight    Height of viewport including scrollbar.
 * body.clientHeight  Height of viewport excluding scrollbar.
 *
 * IE6/7 Standards mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Undefined.
 * body.clientWidth   Width of body element.
 *
 * docEl.clientHeight Height of viewport excluding scrollbar.
 * win.innerHeight    Undefined.
 * body.clientHeight  Height of document element.
 *
 * IE5 + IE6/7 Backwards compatible mode:
 * docEl.clientWidth  0.
 * win.innerWidth     Undefined.
 * body.clientWidth   Width of viewport excluding scrollbar.
 *
 * docEl.clientHeight 0.
 * win.innerHeight    Undefined.
 * body.clientHeight  Height of viewport excluding scrollbar.
 *
 * Opera 9 Standards and backwards compatible mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Width of viewport including scrollbar.
 * body.clientWidth   Width of viewport excluding scrollbar.
 *
 * docEl.clientHeight Height of document.
 * win.innerHeight    Height of viewport including scrollbar.
 * body.clientHeight  Height of viewport excluding scrollbar.
 *
 * WebKit:
 * Safari 2
 * docEl.clientHeight Same as scrollHeight.
 * docEl.clientWidth  Same as innerWidth.
 * win.innerWidth     Width of viewport excluding scrollbar.
 * win.innerHeight    Height of the viewport including scrollbar.
 * frame.innerHeight  Height of the viewport exluding scrollbar.
 *
 * Safari 3 (tested in 522)
 *
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * docEl.clientHeight Height of viewport excluding scrollbar in strict mode.
 * body.clientHeight  Height of viewport excluding scrollbar in quirks mode.
 *
 * @param opt_window Optional window element to test.
 * @return Object with values 'width' and 'height'.
 */
function getViewportSize(opt_window) {
    // TODO(arv): This should not take an argument
    return getViewportSize_(opt_window || window);
}
/**
 * Helper for {@code getViewportSize}.
 * @param win The window to get the view port size for.
 * @return Object with values 'width' and 'height'.
 * @private
 */
function getViewportSize_(win) {
    let doc = win.document;
    let el = isCss1CompatMode_(doc) ? doc.documentElement : doc.body;
    return new size_1.Size(el.clientWidth, el.clientHeight);
}
/**
 * Sets the top/left values of an element.  If no unit is specified in the
 * argument then it will add px. The second argument is required if the first
 * argument is a string or number and is ignored if the first argument
 * is a coordinate.
 * @param el Element to move.
 * @param arg1 Left position or coordinate.
 * @param opt_arg2 Top position.
 */
function setPosition(el, arg1, opt_arg2) {
    let x, y;
    if (arg1 instanceof coordinate_1.Coordinate) {
        x = arg1.x;
        y = arg1.y;
    }
    else {
        x = arg1;
        y = opt_arg2;
    }
    el.style.left = getPixelStyleValue_(x, false);
    el.style.top = getPixelStyleValue_(y, false);
}
/**
 * Helper function to create a string to be set into a pixel-value style
 * property of an element. Can round to the nearest integer value.
 *
 * @param value The style value to be used. If a number,
 *     'px' will be appended, otherwise the value will be applied directly.
 * @param round Whether to round the nearest integer (if property
 *     is a number).
 * @return The string value for the property.
 * @private
 */
function getPixelStyleValue_(value, round) {
    if (typeof value == 'number') {
        value = (round ? Math.round(value) : value) + 'px';
    }
    return value;
}
/**
 * Gets the height and width of an element, even if its display is none.
 *
 * Specifically, this returns the height and width of the border box,
 * irrespective of the box model in effect.
 *
 * Note that this function does not take CSS transforms into account. Please see
 * {@code goog.style.getTransformedSize}.
 * @param element Element to get size of.
 * @return Object with width/height properties.
 */
function getSize(element) {
    return evaluateWithTemporaryDisplay_(getSizeWithDisplay_, element);
}
/**
 * Call {@code fn} on {@code element} such that {@code element}'s dimensions are
 * accurate when it's passed to {@code fn}.
 * @param fn Function to call with {@code element} as
 *     an argument after temporarily changing {@code element}'s display such
 *     that its dimensions are accurate.
 * @param element Element (which may have display none) to use as
 *     argument to {@code fn}.
 * @return Value returned by calling {@code fn} with {@code element}.
 * @template T
 * @private
 */
function evaluateWithTemporaryDisplay_(fn, element) {
    if (getStyle_(element, 'display') != 'none') {
        return fn(element);
    }
    let style = element.style;
    let originalDisplay = style.display;
    let originalVisibility = style.visibility;
    let originalPosition = style.position;
    style.visibility = 'hidden';
    style.position = 'absolute';
    style.display = 'inline';
    let retVal = fn(element);
    style.display = originalDisplay;
    style.position = originalPosition;
    style.visibility = originalVisibility;
    return retVal;
}
/**
 * Gets the height and width of an element when the display is not none.
 * @param element Element to get size of.
 * @return Object with width/height properties.
 */
function getSizeWithDisplay_(element) {
    let offsetWidth = element.offsetWidth;
    let offsetHeight = element.offsetHeight;
    let webkitOffsetsZero = useragent_1.userAgent.WEBKIT && !offsetWidth && !offsetHeight;
    if ((offsetWidth == undefined || webkitOffsetsZero) &&
        element.getBoundingClientRect !== undefined) {
        // Fall back to calling getBoundingClientRect when offsetWidth or
        // offsetHeight are not defined, or when they are zero in WebKit browsers.
        // This makes sure that we return for the correct size for SVG elements, but
        // will still return 0 on Webkit prior to 534.8, see
        // http://trac.webkit.org/changeset/67252.
        let clientRect = getBoundingClientRect_(element);
        return new size_1.Size(clientRect.right - clientRect.left, clientRect.bottom - clientRect.top);
    }
    return new size_1.Size(offsetWidth, offsetHeight);
}
/**
 * Returns a bounding rectangle for a given element in page space.
 * @param element Element to get bounds of. Must not be display none.
 * @return Bounding rectangle for the element.
 */
function getBounds(element) {
    let o = getPageOffset(element);
    let s = getSize(element);
    return new rect_1.Rect(o.x, o.y, s.width, s.height);
}
/**
 * Returns true if the element is using right to left (rtl) direction.
 * @param el  The element to test.
 * @return True for right to left, false for left to right.
 */
function isRightToLeft(el) {
    return 'rtl' == getStyle_(el, 'direction');
}
/**
 * Sets the border box size of an element. This is potentially expensive in IE
 * if the document is CSS1Compat mode
 * @param element  The element to set the size on.
 * @param size  The new size.
 */
function setBorderBoxSize(element, size) {
    setBorderBoxSize_(element, size, 'border-box');
}
function setBorderBoxSize_(element, size, boxSizing) {
    let style = element.style;
    if (useragent_1.userAgent.GECKO) {
        style.MozBoxSizing = boxSizing;
    }
    else if (useragent_1.userAgent.WEBKIT) {
        style.WebkitBoxSizing = boxSizing;
    }
    else {
        // Includes IE8 and Opera 9.50+
        style.boxSizing = boxSizing;
    }
    // Setting this to a negative value will throw an exception on IE
    // (and doesn't do anything different than setting it to 0).
    style.width = Math.max(size.width, 0) + 'px';
    style.height = Math.max(size.height, 0) + 'px';
}
/**
 * Translates the specified rect relative to origBase page, for newBase page.
 * If origBase and newBase are the same, this function does nothing.
 *
 * @param rect The source rectangle relative to origBase page,
 *     and it will have the translated result.
 * @param origBase The DomHelper for the input rectangle.
 * @param newBase The DomHelper for the resultant
 *     coordinate.  This must be a DOM for an ancestor frame of origBase
 *     or the same as origBase.
 */
function translateRectForAnotherFrame(rect, origBase, newBase) {
    if (origBase.getDocument() != newBase.getDocument()) {
        let body = origBase.getDocument().body;
        let pos = getFramedPageOffset(body, newBase.getWindow());
        // Adjust Body's margin.
        pos = coordinate_1.Coordinate.difference(pos, getPageOffset(body));
        if (useragent_1.userAgent.IE && !useragent_1.userAgent.isDocumentModeOrHigher(9) &&
            !origBase.isCss1CompatMode()) {
            pos = coordinate_1.Coordinate.difference(pos, origBase.getDocumentScroll());
        }
        rect.left += pos.x;
        rect.top += pos.y;
    }
}
/**
 * Returns a Coordinate object relative to the top-left of an HTML document
 * in an ancestor frame of this element. Used for measuring the position of
 * an element inside a frame relative to a containing frame.
 *
 * @param el Element to get the page offset for.
 * @param relativeWin The window to measure relative to. If relativeWin
 *     is not in the ancestor frame chain of the element, we measure relative to
 *     the top-most window.
 * @return The page offset.
 */
function getFramedPageOffset(el, relativeWin) {
    let position = new coordinate_1.Coordinate(0, 0);
    // Iterate up the ancestor frame chain, keeping track of the current window
    // and the current element in that window.
    let currentWin = getWindow(getOwnerDocument(el));
    // MS Edge throws when accessing "parent" if el's containing iframe has been
    // deleted.
    if (!canAccessProperty(currentWin, 'parent')) {
        return position;
    }
    let currentEl = el;
    do {
        // if we're at the top window, we want to get the page offset.
        // if we're at an inner frame, we only want to get the window position
        // so that we can determine the actual page offset in the context of
        // the outer window.
        let offset = currentWin == relativeWin ?
            getPageOffset(currentEl) :
            getClientPositionForElement_(currentEl);
        position.x += offset.x;
        position.y += offset.y;
    } while (currentWin && currentWin != relativeWin &&
        currentWin != currentWin.parent &&
        (currentEl = currentWin.frameElement) &&
        (currentWin = currentWin.parent));
    return position;
}
function canAccessProperty(obj, prop) {
    try {
        let val = obj[prop];
        return !!val || true;
    }
    catch (e) {
    }
    return false;
}
/**
 * Returns the position of the event or the element's border box relative to
 * the client viewport.
 * @param el Element whose position to get.
 * @return The position.
 * @private
 */
function getClientPositionForElement_(el) {
    let box = getBoundingClientRect_(el);
    return new coordinate_1.Coordinate(box.left, box.top);
}
/**
 * Returns the normalized scrollLeft position for a scrolled element.
 * @param element The scrolled element.
 * @return The number of pixels the element is scrolled. 0 indicates
 *     that the element is not scrolled at all (which, in general, is the
 *     left-most position in ltr and the right-most position in rtl).
 */
function getScrollLeft(element) {
    let isRtl = isRightToLeft(element);
    if (isRtl && useragent_1.userAgent.GECKO) {
        // ScrollLeft starts at 0 and then goes negative as the element is scrolled
        // towards the left.
        return -element.scrollLeft;
    }
    else if (isRtl &&
        !(useragent_1.userAgent.EDGE_OR_IE && useragent_1.userAgent.isVersionOrHigher('8'))) {
        // ScrollLeft starts at the maximum positive value and decreases towards
        // 0 as the element is scrolled towards the left. However, for overflow
        // visible, there is no scrollLeft and the value always stays correctly at 0
        let overflowX = getComputedOverflowX(element);
        if (overflowX == 'visible') {
            return element.scrollLeft;
        }
        else {
            return element.scrollWidth - element.clientWidth - element.scrollLeft;
        }
    }
    // ScrollLeft behavior is identical in rtl and ltr, it starts at 0 and
    // increases as the element is scrolled away from the start.
    return element.scrollLeft;
}
/**
 * Retrieves the computed value of the overflow-x CSS attribute.
 * @param element The element to get the overflow-x of.
 * @return The computed string value of the overflow-x attribute.
 */
function getComputedOverflowX(element) {
    return getStyle_(element, 'overflowX');
}
/**
 * Shows or hides an element from the page. Hiding the element is done by
 * setting the display property to "none", removing the element from the
 * rendering hierarchy so it takes up no space. To show the element, the default
 * inherited display property is restored (defined either in stylesheets or by
 * the browser's default style rules).
 *
 * Caveat 1: if the inherited display property for the element is set to "none"
 * by the stylesheets, that is the property that will be restored by a call to
 * setElementShown(), effectively toggling the display between "none" and
 * "none".
 *
 * Caveat 2: if the element display style is set inline (by setting either
 * element.style.display or a style attribute in the HTML), a call to
 * setElementShown will clear that setting and defer to the inherited style in
 * the stylesheet.
 * @param el Element to show or hide.
 * @param isShown True to render the element in its default style,
 *     false to disable rendering the element.
 */
function setElementShown(el, isShown) {
    el.style.display = isShown ? '' : 'none';
}
/**
 * Calculates the viewport coordinates relative to the page/document
 * containing the node. The viewport may be the browser viewport for
 * non-iframe document, or the iframe container for iframe'd document.
 * @param doc The document to use as the reference point.
 * @return The page offset of the viewport.
 */
function getViewportPageOffset(doc) {
    let body = doc.body;
    let documentElement = doc.documentElement;
    let scrollLeft = body.scrollLeft || documentElement.scrollLeft;
    let scrollTop = body.scrollTop || documentElement.scrollTop;
    return new coordinate_1.Coordinate(scrollLeft, scrollTop);
}
function getCssName(base, name) {
    if (base == undefined) {
        return 'recoil-' + base;
    }
    if (typeof base === 'string') {
        return base + name;
    }
    return base.good() ? base.get() + name : 'recoil-' + name;
}

},{"../../util/goog":29,"../../util/string":32,"./box":7,"./classlist":8,"./coordinate":9,"./nodetype":12,"./rect":13,"./size":14,"./tags":15,"./useragent":16}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = void 0;
var EventType;
(function (EventType) {
    EventType["CLICK"] = "click";
    EventType["RIGHTCLICK"] = "rightclick";
    EventType["DBLCLICK"] = "dblclick";
    EventType["MOUSEDOWN"] = "mousedown";
    EventType["MOUSEUP"] = "mouseup";
    EventType["MOUSEOVER"] = "mouseover";
    EventType["MOUSEOUT"] = "mouseout";
    EventType["MOUSEMOVE"] = "mousemove";
    EventType["MOUSEENTER"] = "mouseenter";
    EventType["MOUSELEAVE"] = "mouseleave";
    // Select start is non-standard.
    // See http=//msdn.microsoft.com/en-us/library/ie/ms536969(v=vs.85).aspx.
    EventType["SELECTSTART"] = "selectstart";
    // Wheel events
    // http=//www.w3.org/TR/DOM-Level-3-Events/#events-wheelevents
    EventType["WHEEL"] = "wheel";
    // Key events
    EventType["KEYPRESS"] = "keypress";
    EventType["KEYDOWN"] = "keydown";
    EventType["KEYUP"] = "keyup";
    // Focus
    EventType["BLUR"] = "blur";
    EventType["FOCUS"] = "focus";
    EventType["DEACTIVATE"] = "deactivate";
    // NOTE= The following two events are not stable in cross-browser usage.
    //     WebKit and Opera implement DOMFocusIn/Out.
    //     IE implements focusin/out.
    //     Gecko implements neither see bug at
    //     https=//bugzilla.mozilla.org/show_bug.cgi?id=396927.
    // The DOM Events Level 3 Draft deprecates DOMFocusIn in favor of focusin=
    //     http=//dev.w3.org/2006/webapi/DOM-Level-3-Events/html/DOM3-Events.html
    // You can use FOCUS in Capture phase until implementations converge.
    EventType["FOCUSIN"] = "focusin";
    EventType["FOCUSOUT"] = "focusout";
    // Forms
    EventType["CHANGE"] = "change";
    EventType["RESET"] = "reset";
    EventType["SELECT"] = "select";
    EventType["SUBMIT"] = "submit";
    EventType["INPUT"] = "input";
    EventType["PROPERTYCHANGE"] = "propertychange";
    // Drag and drop
    EventType["DRAGSTART"] = "dragstart";
    EventType["DRAG"] = "drag";
    EventType["DRAGENTER"] = "dragenter";
    EventType["DRAGOVER"] = "dragover";
    EventType["DRAGLEAVE"] = "dragleave";
    EventType["DROP"] = "drop";
    EventType["DRAGEND"] = "dragend";
    // Touch events
    // Note that other touch events exist, but we should follow the W3C list here.
    // http=//www.w3.org/TR/touch-events/#list-of-touchevent-types
    EventType["TOUCHSTART"] = "touchstart";
    EventType["TOUCHMOVE"] = "touchmove";
    EventType["TOUCHEND"] = "touchend";
    EventType["TOUCHCANCEL"] = "touchcancel";
    // Misc
    EventType["BEFOREUNLOAD"] = "beforeunload";
    EventType["CONSOLEMESSAGE"] = "consolemessage";
    EventType["CONTEXTMENU"] = "contextmenu";
    EventType["DOMCONTENTLOADED"] = "DOMContentLoaded";
    EventType["ERROR"] = "error";
    EventType["HELP"] = "help";
    EventType["LOAD"] = "load";
    EventType["LOSECAPTURE"] = "losecapture";
    EventType["ORIENTATIONCHANGE"] = "orientationchange";
    EventType["READYSTATECHANGE"] = "readystatechange";
    EventType["RESIZE"] = "resize";
    EventType["SCROLL"] = "scroll";
    EventType["UNLOAD"] = "unload";
    // HTML 5 History events
    // See http=//www.w3.org/TR/html5/browsers.html#event-definitions-0
    EventType["HASHCHANGE"] = "hashchange";
    EventType["PAGEHIDE"] = "pagehide";
    EventType["PAGESHOW"] = "pageshow";
    EventType["POPSTATE"] = "popstate";
    // Copy and Paste
    // Support is limited. Make sure it works on your favorite browser
    // before using.
    // http=//www.quirksmode.org/dom/events/cutcopypaste.html
    EventType["COPY"] = "copy";
    EventType["PASTE"] = "paste";
    EventType["CUT"] = "cut";
    EventType["BEFORECOPY"] = "beforecopy";
    EventType["BEFORECUT"] = "beforecut";
    EventType["BEFOREPASTE"] = "beforepaste";
    // HTML5 online/offline events.
    // http=//www.w3.org/TR/offline-webapps/#related
    EventType["ONLINE"] = "online";
    EventType["OFFLINE"] = "offline";
    // HTML 5 worker events
    EventType["MESSAGE"] = "message";
    EventType["CONNECT"] = "connect";
    // W3C Pointer Events
    // http=//www.w3.org/TR/pointerevents/
    EventType["POINTERDOWN"] = "pointerdown";
    EventType["POINTERUP"] = "pointerup";
    EventType["POINTERCANCEL"] = "pointercancel";
    EventType["POINTERMOVE"] = "pointermove";
    EventType["POINTEROVER"] = "pointerover";
    EventType["POINTEROUT"] = "pointerout";
    EventType["POINTERENTER"] = "pointerenter";
    EventType["POINTERLEAVE"] = "pointerleave";
    EventType["GOTPOINTERCAPTURE"] = "gotpointercapture";
    EventType["LOSTPOINTERCAPTURE"] = "lostpointercapture";
    // Native IMEs/input tools events.
    EventType["TEXT"] = "text";
    EventType["TEXTINPUT"] = "textInput";
    EventType["COMPOSITIONSTART"] = "compositionstart";
    EventType["COMPOSITIONUPDATE"] = "compositionupdate";
    EventType["COMPOSITIONEND"] = "compositionend";
    // Webview tag events
    EventType["EXIT"] = "exit";
    EventType["LOADABORT"] = "loadabort";
    EventType["LOADCOMMIT"] = "loadcommit";
    EventType["LOADREDIRECT"] = "loadredirect";
    EventType["LOADSTART"] = "loadstart";
    EventType["LOADSTOP"] = "loadstop";
    EventType["RESPONSIVE"] = "responsive";
    EventType["SIZECHANGED"] = "sizechanged";
    EventType["UNRESPONSIVE"] = "unresponsive";
    EventType["VISIBILITYCHANGE"] = "visibilitychange";
    // LocalStorage event.
    EventType["STORAGE"] = "storage";
    // DOM Level 2 mutation events (deprecated).
    EventType["DOMSUBTREEMODIFIED"] = "DOMSubtreeModified";
    EventType["DOMNODEINSERTED"] = "DOMNodeInserted";
    EventType["DOMNODEREMOVED"] = "DOMNodeRemoved";
    EventType["DOMNODEREMOVEDFROMDOCUMENT"] = "DOMNodeRemovedFromDocument";
    EventType["DOMNODEINSERTEDINTODOCUMENT"] = "DOMNodeInsertedIntoDocument";
    EventType["DOMATTRMODIFIED"] = "DOMAttrModified";
    EventType["DOMCHARACTERDATAMODIFIED"] = "DOMCharacterDataModified";
    // Print events.
    EventType["BEFOREPRINT"] = "beforeprint";
    EventType["AFTERPRINT"] = "afterprint";
})(EventType || (exports.EventType = EventType = {}));

},{}],12:[function(require,module,exports){
"use strict";
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http=//www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeType = void 0;
/**
 * Constants for the nodeType attribute in the Node interface.
 *
 * These constants match those specified in the Node interface. These are
 * usually present on the Node object in recent browsers, but not in older
 * browsers (specifically, early IEs) and thus are given here.
 *
 * In some browsers (early IEs), these are not defined on the Node object,
 * so they are provided here.
 *
 * See http=//www.w3.org/TR/DOM-Level-2-Core/core.html#ID-1950641247
 * @enum {number}
 */
var NodeType;
(function (NodeType) {
    NodeType[NodeType["ELEMENT"] = 1] = "ELEMENT";
    NodeType[NodeType["ATTRIBUTE"] = 2] = "ATTRIBUTE";
    NodeType[NodeType["TEXT"] = 3] = "TEXT";
    NodeType[NodeType["CDATA_SECTION"] = 4] = "CDATA_SECTION";
    NodeType[NodeType["ENTITY_REFERENCE"] = 5] = "ENTITY_REFERENCE";
    NodeType[NodeType["ENTITY"] = 6] = "ENTITY";
    NodeType[NodeType["PROCESSING_INSTRUCTION"] = 7] = "PROCESSING_INSTRUCTION";
    NodeType[NodeType["COMMENT"] = 8] = "COMMENT";
    NodeType[NodeType["DOCUMENT"] = 9] = "DOCUMENT";
    NodeType[NodeType["DOCUMENT_TYPE"] = 10] = "DOCUMENT_TYPE";
    NodeType[NodeType["DOCUMENT_FRAGMENT"] = 11] = "DOCUMENT_FRAGMENT";
    NodeType[NodeType["NOTATION"] = 12] = "NOTATION";
})(NodeType || (exports.NodeType = NodeType = {}));

},{}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rect = void 0;
const size_1 = require("./size");
const coordinate_1 = require("./coordinate");
class Rect {
    constructor(x, y, w, h) {
        this.left = x;
        this.top = y;
        this.width = w;
        this.height = h;
    }
    getSize() {
        return new size_1.Size(this.width, this.height);
    }
    static createFromBox(box) {
        return new Rect(box.left, box.top, box.right - box.left, box.bottom - box.top);
    }
    /**
     * Computes the intersection of this rectangle and the rectangle parameter.  If
     * there is no intersection, returns false and leaves this rectangle as is.
     * @param rect A Rectangle.
     * @return True iff this rectangle intersects with the parameter.
     */
    intersection(rect) {
        let x0 = Math.max(this.left, rect.left);
        let x1 = Math.min(this.left + this.width, rect.left + rect.width);
        if (x0 <= x1) {
            let y0 = Math.max(this.top, rect.top);
            let y1 = Math.min(this.top + this.height, rect.top + rect.height);
            if (y0 <= y1) {
                this.left = x0;
                this.top = y0;
                this.width = x1 - x0;
                this.height = y1 - y0;
                return true;
            }
        }
        return false;
    }
    getTopLeft() {
        return new coordinate_1.Coordinate(this.left, this.top);
    }
}
exports.Rect = Rect;

},{"./coordinate":9,"./size":14}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Size = void 0;
class Size {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
    clone() {
        return new Size(this.width, this.height);
    }
    static equals(a, b) {
        if (a == b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.width == b.width && a.height == b.height;
    }
}
exports.Size = Size;

},{}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagName = void 0;
var TagName;
(function (TagName) {
    TagName["A"] = "A";
    TagName["ABBR"] = "ABBR";
    TagName["ACRONYM"] = "ACRONYM";
    TagName["ADDRESS"] = "ADDRESS";
    TagName["APPLET"] = "APPLET";
    TagName["AREA"] = "AREA";
    TagName["ARTICLE"] = "ARTICLE";
    TagName["ASIDE"] = "ASIDE";
    TagName["AUDIO"] = "AUDIO";
    TagName["B"] = "B";
    TagName["BASE"] = "BASE";
    TagName["BASEFONT"] = "BASEFONT";
    TagName["BDI"] = "BDI";
    TagName["BDO"] = "BDO";
    TagName["BIG"] = "BIG";
    TagName["BLOCKQUOTE"] = "BLOCKQUOTE";
    TagName["BODY"] = "BODY";
    TagName["BR"] = "BR";
    TagName["BUTTON"] = "BUTTON";
    TagName["CANVAS"] = "CANVAS";
    TagName["CAPTION"] = "CAPTION";
    TagName["CENTER"] = "CENTER";
    TagName["CITE"] = "CITE";
    TagName["CODE"] = "CODE";
    TagName["COL"] = "COL";
    TagName["COLGROUP"] = "COLGROUP";
    TagName["COMMAND"] = "COMMAND";
    TagName["DATA"] = "DATA";
    TagName["DATALIST"] = "DATALIST";
    TagName["DD"] = "DD";
    TagName["DEL"] = "DEL";
    TagName["DETAILS"] = "DETAILS";
    TagName["DFN"] = "DFN";
    TagName["DIALOG"] = "DIALOG";
    TagName["DIR"] = "DIR";
    TagName["DIV"] = "DIV";
    TagName["DL"] = "DL";
    TagName["DT"] = "DT";
    TagName["EM"] = "EM";
    TagName["EMBED"] = "EMBED";
    TagName["FIELDSET"] = "FIELDSET";
    TagName["FIGCAPTION"] = "FIGCAPTION";
    TagName["FIGURE"] = "FIGURE";
    TagName["FONT"] = "FONT";
    TagName["FOOTER"] = "FOOTER";
    TagName["FORM"] = "FORM";
    TagName["FRAME"] = "FRAME";
    TagName["FRAMESET"] = "FRAMESET";
    TagName["H1"] = "H1";
    TagName["H2"] = "H2";
    TagName["H3"] = "H3";
    TagName["H4"] = "H4";
    TagName["H5"] = "H5";
    TagName["H6"] = "H6";
    TagName["HEAD"] = "HEAD";
    TagName["HEADER"] = "HEADER";
    TagName["HGROUP"] = "HGROUP";
    TagName["HR"] = "HR";
    TagName["HTML"] = "HTML";
    TagName["I"] = "I";
    TagName["IFRAME"] = "IFRAME";
    TagName["IMG"] = "IMG";
    TagName["INPUT"] = "INPUT";
    TagName["INS"] = "INS";
    TagName["ISINDEX"] = "ISINDEX";
    TagName["KBD"] = "KBD";
    TagName["KEYGEN"] = "KEYGEN";
    TagName["LABEL"] = "LABEL";
    TagName["LEGEND"] = "LEGEND";
    TagName["LI"] = "LI";
    TagName["LINK"] = "LINK";
    TagName["MAP"] = "MAP";
    TagName["MARK"] = "MARK";
    TagName["MATH"] = "MATH";
    TagName["MENU"] = "MENU";
    TagName["META"] = "META";
    TagName["METER"] = "METER";
    TagName["NAV"] = "NAV";
    TagName["NOFRAMES"] = "NOFRAMES";
    TagName["NOSCRIPT"] = "NOSCRIPT";
    TagName["OBJECT"] = "OBJECT";
    TagName["OL"] = "OL";
    TagName["OPTGROUP"] = "OPTGROUP";
    TagName["OPTION"] = "OPTION";
    TagName["OUTPUT"] = "OUTPUT";
    TagName["P"] = "P";
    TagName["PARAM"] = "PARAM";
    TagName["PRE"] = "PRE";
    TagName["PROGRESS"] = "PROGRESS";
    TagName["Q"] = "Q";
    TagName["RP"] = "RP";
    TagName["RT"] = "RT";
    TagName["RUBY"] = "RUBY";
    TagName["S"] = "S";
    TagName["SAMP"] = "SAMP";
    TagName["SCRIPT"] = "SCRIPT";
    TagName["SECTION"] = "SECTION";
    TagName["SELECT"] = "SELECT";
    TagName["SMALL"] = "SMALL";
    TagName["SOURCE"] = "SOURCE";
    TagName["SPAN"] = "SPAN";
    TagName["STRIKE"] = "STRIKE";
    TagName["STRONG"] = "STRONG";
    TagName["STYLE"] = "STYLE";
    TagName["SUB"] = "SUB";
    TagName["SUMMARY"] = "SUMMARY";
    TagName["SUP"] = "SUP";
    TagName["SVG"] = "SVG";
    TagName["TABLE"] = "TABLE";
    TagName["TBODY"] = "TBODY";
    TagName["TD"] = "TD";
    TagName["TEMPLATE"] = "TEMPLATE";
    TagName["TEXTAREA"] = "TEXTAREA";
    TagName["TFOOT"] = "TFOOT";
    TagName["TH"] = "TH";
    TagName["THEAD"] = "THEAD";
    TagName["TIME"] = "TIME";
    TagName["TITLE"] = "TITLE";
    TagName["TR"] = "TR";
    TagName["TRACK"] = "TRACK";
    TagName["TT"] = "TT";
    TagName["U"] = "U";
    TagName["UL"] = "UL";
    TagName["VAR"] = "VAR";
    TagName["VIDEO"] = "VIDEO";
    TagName["WBR"] = "WBR";
})(TagName || (exports.TagName = TagName = {}));

},{}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userAgent = void 0;
class UserAgent {
    constructor() {
        this.IE = UserAgent.matchUserAgent('Trident') ||
            UserAgent.matchUserAgent('MSIE');
        this.EDGE = UserAgent.matchUserAgent('Edge');
        this.WEBKIT = UserAgent.matchUserAgentIgnoreCase('WebKit') &&
            !this.EDGE;
        this.OPERA = UserAgent.matchUserAgent('Opera');
        this.GECKO = UserAgent.matchUserAgent('Gecko') &&
            !this.WEBKIT &&
            !this.IE &&
            !this.EDGE;
        this.VERSION = this.determineVersion_();
        this.CAN_ADD_NAME_OR_TYPE_ATTRIBUTES = !this.IE || this.isDocumentModeOrHigher(9);
        this.DOCUMENT_MODE =
            (() => {
                let mode = this.getDocumentMode_();
                if (!document || !this.IE) {
                    return undefined;
                }
                return mode || (document['compatMode'] == 'CSS1Compat' ?
                    parseInt(this.VERSION, 10) : 5);
            })();
        this.CAN_USE_CHILDREN_ATTRIBUTE = !this.GECKO && !this.IE ||
            this.IE && this.isDocumentModeOrHigher(9) ||
            this.GECKO && this.isVersionOrHigher('1.9.1');
        this.CAN_USE_PARENT_ELEMENT_PROPERTY = this.IE || this.OPERA || this.WEBKIT;
        this.CAN_USE_INNER_TEXT = (this.IE && !this.isVersionOrHigher('9'));
        this.MAC = UserAgent.matchUserAgent('Macintosh');
        this.EDGE_OR_IE = this.IE || this.EDGE;
    }
    static getUserAgent() {
        if (navigator) {
            let userAgent = navigator.userAgent;
            if (userAgent) {
                return userAgent;
            }
        }
        return '';
    }
    static matchUserAgent(str) {
        let userAgent = UserAgent.getUserAgent();
        return userAgent.indexOf(str) != -1;
    }
    isDocumentModeOrHigher(documentMode) {
        return Number(this.DOCUMENT_MODE) >= documentMode;
    }
    /**
     * @param {string} str
     * @return {boolean} Whether the user agent contains the given string.
     */
    static matchUserAgentIgnoreCase(str) {
        let userAgent = UserAgent.getUserAgent();
        return userAgent.toLowerCase().indexOf(str.toLowerCase()) != -1;
    }
    ;
    isVersionOrHigher(version) {
        return UserAgent.compareVersions(this.VERSION, version) >= 0;
    }
    getVersionRegexResult_() {
        let userAgent = UserAgent.getUserAgent();
        if (this.GECKO) {
            return /rv:([^);]+)(\)|;)/.exec(userAgent);
        }
        if (this.EDGE) {
            return /Edge\/([\d.]+)/.exec(userAgent);
        }
        if (this.IE) {
            return /\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(userAgent);
        }
        if (this.WEBKIT) {
            // WebKit/125.4
            return /WebKit\/(\S+)/.exec(userAgent);
        }
        if (this.OPERA) {
            // If none of the above browsers were detected but the browser is Opera, the
            // only string that is of interest is 'Version/<number>'.
            return /(?:Version)[ \/]?(\S+)/.exec(userAgent);
        }
        return undefined;
    }
    getDocumentMode_() {
        // NOTE(user): goog.userAgent may be used in context where there is no DOM.
        let doc = document;
        return doc ? doc['documentMode'] : undefined;
    }
    determineVersion_() {
        // All browsers have different ways to detect the version and they all have
        // different naming schemes.
        // version is a string rather than a number because it may contain 'b', 'a',
        // and so on.
        let version = '';
        let arr = this.getVersionRegexResult_();
        if (arr) {
            version = arr ? arr[1] : '';
        }
        if (this.IE) {
            // IE9 can be in document mode 9 but be reporting an inconsistent user agent
            // version.  If it is identifying as a version lower than 9 we take the
            // documentMode as the version instead.  IE8 has similar behavior.
            // It is recommended to set the X-UA-Compatible header to ensure that IE9
            // uses documentMode 9.
            let docMode = this.getDocumentMode_();
            if (docMode != null && docMode > parseFloat(version)) {
                return String(docMode);
            }
        }
        return version;
    }
    /**
     * Compares two version numbers.
     *
     * @param version1 Version of first item.
     * @param version2 Version of second item.
     *
     * @return  1 if {@code version1} is higher.
     *                   0 if arguments are equal.
     *                  -1 if {@code version2} is higher.
     */
    static compareVersions(version1, version2) {
        let order = 0;
        // Trim leading and trailing whitespace and split the versions into
        // subversions.
        let v1Subs = String(version1).trim().split('.');
        let v2Subs = String(version2).trim().split('.');
        let subCount = Math.max(v1Subs.length, v2Subs.length);
        // Iterate over the subversions, as long as they appear to be equivalent.
        for (let subIdx = 0; order == 0 && subIdx < subCount; subIdx++) {
            let v1Sub = v1Subs[subIdx] || '';
            let v2Sub = v2Subs[subIdx] || '';
            // Split the subversions into pairs of numbers and qualifiers (like 'b').
            // Two different RegExp objects are needed because they are both using
            // the 'g' flag.
            let v1CompParser = new RegExp('(\\d*)(\\D*)', 'g');
            let v2CompParser = new RegExp('(\\d*)(\\D*)', 'g');
            do {
                let v1Comp = v1CompParser.exec(v1Sub) || ['', '', ''];
                let v2Comp = v2CompParser.exec(v2Sub) || ['', '', ''];
                // Break if there are no more matches.
                if (v1Comp[0].length == 0 && v2Comp[0].length == 0) {
                    break;
                }
                // Parse the numeric part of the subversion. A missing number is
                // equivalent to 0.
                let v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
                let v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);
                // Compare the subversion components. The number has the highest
                // precedence. Next, if the numbers are equal, a subversion without any
                // qualifier is always higher than a subversion with any qualifier. Next,
                // the qualifiers are compared as strings.
                order = UserAgent.compareElements_(v1CompNum, v2CompNum) ||
                    UserAgent.compareElements_(v1Comp[2].length == 0, v2Comp[2].length == 0) ||
                    UserAgent.compareElements_(v1Comp[2], v2Comp[2]);
                // Stop as soon as an inequality is discovered.
            } while (order == 0);
        }
        return order;
    }
    static compareElements_(left, right) {
        if (left < right) {
            return -1;
        }
        else if (left > right) {
            return 1;
        }
        return 0;
    }
}
exports.userAgent = new UserAgent();

},{}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHandler = exports.EventHelper = void 0;
const dom_1 = require("./dom/dom");
const widgethelper_1 = require("./widgethelper");
/**
 * a class used to help with firing events to behaviours, so you can listen to them directly
 * without having to always wrap them in access transaction
 */
class EventHelper {
    /**
     *
     * @param scope
     * @param element
     * @param type Event type or array of event types.
     * @param opt_capt Whether to fire in capture phase (defaults to false).
     * @param opt_long if the event may take a long time this will crate a busy cursor so that the user is informed
     */
    constructor(scope, element, type, opt_capt, opt_long) {
        this.listener_ = null;
        this.types_ = (type instanceof Array ? typeof type : [type]);
        this.capt_ = !!opt_capt;
        this.helper_ = new widgethelper_1.WidgetHelper(scope, element, null, () => {
        });
        this.element_ = element;
        let cb = (e) => {
            if (this.listener_) {
                this.listener_.frp().accessTrans(() => {
                    // sometimes events fire when before it is on the screen
                    if (this.helper_.isAttached()) {
                        this.listener_?.set(e);
                    }
                }, this.listener_);
            }
        };
        this.func_ = opt_long ? EventHelper.makeLong(cb) : cb;
    }
    /**
     * unlistens to all the existingListeners and adds newListeners to the list
     *
     * @param existingListeners
     * @param newListeners
     */
    static reregister(existingListeners, ...newListeners) {
        let l = existingListeners.pop();
        while (l) {
            l.unlisten();
        }
        for (let l of newListeners) {
            existingListeners.push(l);
        }
    }
    /**
     * @param callback the behaviour to set with the event
     **/
    listen(callback) {
        this.helper_.attach(callback);
        if (this.listener_ === null) {
            this.listener_ = callback;
            for (let type of this.types_) {
                this.element_.addEventListener(type, this.func_, { capture: this.capt_ });
            }
        }
        else {
            this.listener_ = callback;
        }
        this.listener_.setName('EventHelperB');
    }
    unlisten() {
        this.helper_.detach();
        if (this.listener_ !== null) {
            this.listener_ = null;
            for (let type of this.types_) {
                this.element_.removeEventListener(type, this.func_, { capture: this.capt_ });
            }
        }
    }
    /**
     * turn a cb into a long callback that will change the cursor into a spinning
     * cursor
     * @param {function(?)} cb
     * @return {function(?)}
     */
    static makeLong(cb) {
        return (e) => {
            let doit = function () {
                try {
                    cb(e);
                }
                finally {
                    EventHelper.longListen_.busy--;
                    if (EventHelper.longListen_.busy === 0) {
                        (0, dom_1.removeNode)(EventHelper.longListen_.style);
                    }
                }
            };
            EventHelper.longListen_.busy++;
            if (EventHelper.longListen_.busy === 1) {
                (0, dom_1.append)(document.head, EventHelper.longListen_.style);
                // this is odd but calculating the cursor seems to make the cursor update
                // most of the time before the timeout happens, so the user can see a spinning cursor
                // the "if (... || true)" is there because simply getting a variable is funny code
                if (window.getComputedStyle(document.body).cursor || true) {
                    setTimeout(doit, 20);
                }
            }
            else {
                doit();
            }
        };
    }
    /**
     * like addEventListener but return an object so that we can unlisten
     */
    static listen(el, type, callback, options) {
        let listening = false;
        const listenFn = () => {
            if (!listening) {
                listening = true;
                el.addEventListener(type, callback, options);
            }
        };
        listenFn();
        return {
            listen: listenFn,
            unlisten: () => {
                if (listening) {
                    listening = false;
                    el.removeEventListener(type, callback, options);
                }
            }
        };
    }
    static listenAll(el, types, callback, options) {
        let listeners = [];
        for (let type of types) {
            listeners.push(EventHelper.listen(el, type, callback, options));
        }
        return {
            listen: () => listeners.forEach(l => l.listen()),
            unlisten: () => listeners.forEach(l => l.unlisten()),
        };
    }
}
exports.EventHelper = EventHelper;
EventHelper.EL_CHANGE = 'el-change';
EventHelper.longListen_ = { busy: 0, style: (0, dom_1.createDom)('style', {}, '* {cursor:  wait !important}') };
class EventHandler {
    constructor() {
        this.listeners_ = new Set();
    }
    listen(el, type, callback, options) {
        this.listeners_.add(EventHelper.listen(el, type, callback, options));
    }
    static wrap(callback, test, scope) {
        if (typeof callback === 'function') {
            return (evt) => {
                if (test()) {
                    callback.apply(scope, evt);
                }
            };
        }
        else {
            return {
                handleEvent(object) {
                    if (test()) {
                        callback.handleEvent(object);
                    }
                }
            };
        }
    }
    listenOnce(el, type, callback, options, scope) {
        let fired = false;
        let unlisten = EventHelper.listen(el, type, EventHandler.wrap(callback, () => {
            let fire = !fired;
            fired = true;
            this.listeners_.delete(unlisten);
            unlisten.unlisten();
            return fire;
        }, scope), options);
        this.listeners_.add(unlisten);
    }
    unlisten() {
        let listeners = [...this.listeners_];
        this.listeners_.clear();
        for (let l of listeners) {
            l.unlisten();
        }
    }
}
exports.EventHandler = EventHandler;

},{"./dom/dom":10,"./widgethelper":28}],18:[function(require,module,exports){
"use strict";
// Copyright 2011 The Closure Library Authors. All Rights Reserved.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = void 0;
/**
 * Transition event types.
 */
var EventType;
(function (EventType) {
    /** Dispatched when played for the first time OR when it is resumed. */
    EventType["PLAY"] = "play";
    /** Dispatched only when the animation starts from the beginning. */
    EventType["BEGIN"] = "begin";
    /** Dispatched only when animation is restarted after a pause. */
    EventType["RESUME"] = "resume";
    /**
     * Dispatched when animation comes to the end of its duration OR stop
     * is called.
     */
    EventType["END"] = "end";
    /** Dispatched only when stop is called. */
    EventType["STOP"] = "stop";
    /** Dispatched only when animation comes to its end naturally. */
    EventType["FINISH"] = "finish";
    /** Dispatched when an animation is paused. */
    EventType["PAUSE"] = "pause";
})(EventType || (exports.EventType = EventType = {}));

},{}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicMessageEnum = exports.Message = exports.Part = void 0;
/**
 * @constructor
 * @param {?string} format indicator of what the format should be if using format e.g. bold
 * @param {?string} name name of the parameter to be resolved
 * @param {string|recoil.ui.message.Message} message text or sub message to be displayed
 * @param {?function(?):string} formatter function to format the value to be displayed
 */
class Part {
    constructor(format, name, message, formatter) {
        this.format = format;
        this.name = name;
        this.message = message;
        this.formatter = formatter;
    }
    isResolved() {
        if (this.name) {
            return false;
        }
        if (this.message instanceof Message) {
            return this.message.isResolved();
        }
        return true;
    }
    /**
     * @param {!recoil.ui.message.Message.RichTextFormatter} formatter
     * @return {?}
     */
    toRichText(formatter) {
        if (this.message instanceof Message) {
            return this.message.toRichText(formatter);
        }
        return formatter.format(this.format || '', this.toString());
    }
    ;
    toString() {
        return this[Symbol.toStringTag]();
    }
    [Symbol.toStringTag]() {
        let val = this.message;
        if (this.message instanceof Message) {
            if (!this.message.isResolved()) {
                return this.message.toString();
            }
            val = this.message.toString();
        }
        if (this.name) {
            return '{$' + this.name + '}';
        }
        return val + '';
    }
    ;
    resolve(data) {
        if (this.message instanceof Message) {
            let message = this.message.resolve(data);
            return new Part(this.format, null, message, this.formatter);
        }
        if (this.name === null) {
            return this; // already resolved
        }
        if (data.hasOwnProperty(this.name)) {
            let val = data[this.name];
            if (val instanceof Message) {
                return new Part(this.format, null, val.resolve(data), this.formatter);
            }
            return new Part(this.format, null, this.formatter ? this.formatter(val) : val, null);
        }
        // can't resolve the data is not there
        return this;
    }
    ;
}
exports.Part = Part;
class Message {
    constructor(...parts) {
        let myParts = [];
        for (let i = 0; i < parts.length; i++) {
            let part = parts[i];
            if (part instanceof Part) {
                myParts.push(part);
            }
            else if (part instanceof Array) {
                if (part.length !== 1) {
                    throw 'Parameter ' + i + ' of ' + parts + ' must be of length 1';
                }
                myParts.push(new Part(null, part[0], null, null));
            }
            else if (part instanceof Object) {
                let keys = Object.keys(part);
                if (keys.length !== 1) {
                    throw 'Parameter ' + i + ' of ' + parts + ' must be an object with 1 entry';
                }
                if (!(part[keys[0]] instanceof Function)) {
                    throw 'Parameter ' + i + ' of ' + parts + ' must be an object with formatter function';
                }
                myParts.push(new Part(null, keys[0], null, part[keys[0]]));
            }
            else {
                myParts.push(new Part(null, null, part, null));
            }
        }
        this.parts = myParts;
    }
    /**
     * partially resolve a message some parameters may still be present, this will handle, messages inside messages
     *
     */
    resolve(data = {}) {
        return new Message(...this.parts.map(v => v.resolve(data)));
    }
    static toMessage(message) {
        if (message instanceof Message) {
            return message;
        }
        return new Message(message);
    }
    ;
    clone() {
        return this;
    }
    ;
    /**
     * like toString but with a : on the end (at least for english
     */
    toField(data) {
        return Message.FIELD.toString({ 'txt': this.toString(data) });
    }
    ;
    /**
     * turn this message into a string if parameters are not assigned
     *       they will be enclosed in {$}
     */
    toString(data) {
        if (data) {
            return this.resolve(data).toString();
        }
        let res = [];
        for (let part of this.parts) {
            res.push(part.toString());
        }
        return res.join('');
    }
    ;
    /**
     * turn this message into some kind of data structure with formatting
     */
    toRichText(formatter, data) {
        if (data) {
            return this.resolve(data).toRichText(formatter);
        }
        let res = [];
        for (let part of this.parts) {
            res.push(part.toRichText(formatter));
        }
        return formatter.join(res);
    }
    ;
    isResolved() {
        for (let part of this.parts) {
            if (!part.isResolved()) {
                return false;
            }
        }
        return true;
    }
    ;
    /**
     * returns a structure that can be used to messages with substitution
     * this allows parts that have formatting the object of type {value: ?, format: ?}
     */
    static getRichMsg(...args) {
        let parts = [];
        for (let part of args) {
            if (part && part.hasOwnProperty('format')) {
                let p = part;
                parts.push(new Part(p.format, p.name || null, p.value === undefined ? null : p.value, p.formatter || null));
            }
            else {
                parts.push(part);
            }
        }
        return new Message(parts);
    }
    /**
     * returns a structure that can be used to messages with substitution
     */
    static getParamMsg(...parts) {
        return new Message(...parts);
    }
    ;
}
exports.Message = Message;
Message.FIELD = Message.getParamMsg(['txt'], ':');
class BasicMessageEnum {
    constructor(map, unknown) {
        this.map = map;
        this.unknown = unknown;
    }
    resolve(val) {
        let mesg = this.map.get(val);
        if (mesg) {
            return mesg.resolve();
        }
        return this.unknown.msg.resolve({
            [this.unknown.key]: val
        });
    }
}
exports.BasicMessageEnum = BasicMessageEnum;

},{}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Messages = void 0;
const message_1 = require("./message");
class Messages {
    /**
     * combines multiple messages, this logic may need to be changed for different languages
     */
    static join(messages, joiner = Messages.AND) {
        let first = new message_1.Message('');
        let i = 0;
        for (let msg of messages) {
            if (msg && msg.toString() !== '') {
                first = msg;
                break;
            }
            i++;
        }
        i++;
        for (; i < messages.length; i++) {
            let second = messages[i];
            if (second && second.toString() !== '') {
                first = joiner.resolve({ first: first, second: second });
            }
        }
        return first;
    }
    ;
}
exports.Messages = Messages;
Messages.AND = message_1.Message.getParamMsg(['first'], ' and ', ['second']);
Messages.OR = message_1.Message.getParamMsg(['first'], ' or ', ['second']);
Messages.FIELD = message_1.Message.FIELD;
Messages.NOT_APPLICABLE = message_1.Message.getParamMsg('N/A');
Messages.PAGE_X_OF_Y = message_1.Message.getParamMsg('Page ', ['x'], ' of ', ['y']);
Messages.NOT_READY = message_1.Message.getParamMsg('Not ready');
Messages.VALID = message_1.Message.getParamMsg('Valid');
Messages.INVALID = message_1.Message.getParamMsg('Invalid');
Messages.INVALID_VALUE_0 = message_1.Message.getParamMsg('Invalid value ', ['val']);
Messages.NONE = message_1.Message.getParamMsg('None');
Messages.NUMBER_NOT_IN_RANGE = message_1.Message.getParamMsg('Must be between ', ['min'], ' and ', ['max']);
Messages.NUMBER_NOT_IN_RANGE_STEP = message_1.Message.getParamMsg('Must be between ', ['min'], ' and ', ['max'], ', step size ', ['step']);
Messages.MUST_BE_RANGE_STEP = message_1.Message.getParamMsg('Must be between ', ['ranges'], ', step size ', ['step']);
Messages.MUST_BE_RANGE = message_1.Message.getParamMsg('Must be between ', ['ranges']);
Messages.MUST_BE = message_1.Message.getParamMsg('Must be ', ['ranges']);
Messages.MUST_BE_STEP = message_1.Message.getParamMsg('Must be ', ['ranges'], ', step size ', ['step']);
Messages.MUST_BE_DISTINCT = message_1.Message.getParamMsg('Must be of value: ', ['mesg']);
Messages.NO_VALID_RANGES = message_1.Message.getParamMsg('No Valid Ranges. ', ['mesg']);
Messages.MIN_MAX = message_1.Message.getParamMsg('Min: ', ['min'], ', Max: ', ['max']);
Messages.MIN_MAX_RANGES = message_1.Message.getParamMsg('In: ', ['ranges']);
Messages.MIN_MAX_STEP = message_1.Message.getParamMsg('Min: ', ['min'], ', Max: ', ['max'], ', Step: ', ['step']);
Messages.MIN_TO_MAX = message_1.Message.getParamMsg(['min'], ' to ', ['max']);
Messages.MIN_MAX_RANGES_STEP = message_1.Message.getParamMsg('In: ', ['ranges'], ', Step: ', ['step']);
Messages.INVALID_VALUE = message_1.Message.getParamMsg('Invalid Value');
Messages.__UNKNOWN_VAL = message_1.Message.getParamMsg('?');
Messages.UNKNOWN_VAL = message_1.Message.getParamMsg('Unknown ', ['val']);
Messages.INVALID_CHARACTER = message_1.Message.getParamMsg('Invalid Character');
Messages.MUST_BE_AT_LEAST_0_CHARACTORS = message_1.Message.getParamMsg('Must be at least ', ['n'], ' character long.');
Messages.MAX_LENGTH_0 = message_1.Message.getParamMsg('Maximum Length ', ['len'], '.');
Messages.INVALID_LENGTH = message_1.Message.getParamMsg('Invalid Length');
Messages.BLANK = message_1.Message.getParamMsg('');
Messages.NOT_SPECIFIED = message_1.Message.getParamMsg('Not Specified');
Messages.INVALID_EXPRESSION = message_1.Message.getParamMsg('Invalid Expression');
Messages.NEXT = message_1.Message.getParamMsg('Next');
Messages.PREVIOUS = message_1.Message.getParamMsg('Previous');
Messages.FINISH = message_1.Message.getParamMsg('Finish');
Messages.TRAFFIC_CLASS = message_1.Message.getParamMsg('Traffic Class');
Messages.UNCHANGED = message_1.Message.getParamMsg('unchanged');
Messages.DEFAULT = message_1.Message.getParamMsg('Default');

},{"./message":19}],21:[function(require,module,exports){
"use strict";
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Popup = void 0;
const popupbase_1 = require("./popupbase");
const positioning_1 = require("./positioning/positioning");
const box_1 = require("./dom/box");
const dom_1 = require("./dom/dom");
class Popup extends popupbase_1.PopupBase {
    constructor(element, opt_position) {
        super(element);
        this.margin_ = null;
        this.popupCorner_ = positioning_1.Corner.TOP_START;
        this.position_ = opt_position || undefined;
    }
    /**
     * Returns the corner of the popup to used in the positioning algorithm.
     *
     * @return The popup corner used for positioning.
     */
    getPinnedCorner() {
        return this.popupCorner_;
    }
    /**
     * Sets the corner of the popup to used in the positioning algorithm.
     *
     * @param  corner The popup corner used for
     *     positioning.
     */
    setPinnedCorner(corner) {
        this.popupCorner_ = corner;
        if (this.isVisible()) {
            this.reposition();
        }
    }
    /**
     * @return The position helper object associated with the popup.
     */
    getPosition() {
        return this.position_ || null;
    }
    /**
     * Sets the position helper object associated with the popup.
     *
     * @param position A position helper object.
     */
    setPosition(position) {
        this.position_ = position || undefined;
        if (this.isVisible()) {
            this.reposition();
        }
    }
    /**
     * Returns the margin to place around the popup.
     *
     * @return The margin.
     */
    getMargin() {
        return this.margin_ || null;
    }
    setMargin(arg1, opt_arg2, opt_arg3, opt_arg4) {
        if (arg1 == null || arg1 instanceof box_1.Box) {
            this.margin_ = arg1;
        }
        else {
            this.margin_ = new box_1.Box(arg1, opt_arg2, opt_arg3, opt_arg4);
        }
        if (this.isVisible()) {
            this.reposition();
        }
    }
    /**
     * Repositions the popup according to the current state.
     * @override
     */
    reposition() {
        if (!this.position_) {
            return;
        }
        let hideForPositioning = !this.isVisible() &&
            this.getType() != popupbase_1.Type.MOVE_OFFSCREEN;
        let el = this.getElement();
        if (hideForPositioning) {
            el.style.visibility = 'hidden';
            (0, dom_1.setElementShown)(el, true);
        }
        this.position_.reposition(el, this.popupCorner_, this.margin_);
        if (hideForPositioning) {
            // NOTE(eae): The visibility property is reset to 'visible' by the show_
            // method in PopupBase. Resetting it here causes flickering in some
            // situations, even if set to visible after the display property has been
            // set to none by the call below.
            (0, dom_1.setElementShown)(el, false);
        }
    }
}
exports.Popup = Popup;

},{"./dom/box":7,"./dom/dom":10,"./popupbase":22,"./positioning/positioning":25}],22:[function(require,module,exports){
"use strict";
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopupBase = exports.BrowserEvent = exports.Type = void 0;
const dom_1 = require("./dom/dom");
const tags_1 = require("./dom/tags");
const useragent_1 = require("./dom/useragent");
const eventType_1 = require("./dom/eventType");
const transition_1 = require("./fx/transition");
const eventhelper_1 = require("./eventhelper");
var Type;
(function (Type) {
    Type["TOGGLE_DISPLAY"] = "toggle_display";
    Type["MOVE_OFFSCREEN"] = "move_offscreen";
})(Type || (exports.Type = Type = {}));
class BrowserEvent {
    constructor(type, curTarget, src) {
        this.NONE = 0;
        this.CAPTURING_PHASE = 1;
        this.AT_TARGET = 2;
        this.BUBBLING_PHASE = 3;
        this.bubbles = src.bubbles;
        this.cancelBubble = src.cancelBubble;
        this.cancelable = src.cancelable;
        this.composed = src.composed;
        this.target = src.target;
        this.timeStamp = src.timeStamp;
        this.currentTarget = curTarget;
        this.defaultPrevented = src.defaultPrevented;
        this.eventPhase = 0;
        this.isTrusted = src.isTrusted;
        this.returnValue = src.returnValue;
        this.srcElement = src.srcElement;
        this.type = type;
    }
    composedPath() {
        throw new Error("Method not implemented.");
    }
    initEvent(type, bubbles, cancelable) {
        throw new Error("Method not implemented.");
    }
    preventDefault() {
        throw new Error("Method not implemented.");
    }
    stopImmediatePropagation() {
        throw new Error("Method not implemented.");
    }
    stopPropagation() {
        throw new Error("Method not implemented.");
    }
}
exports.BrowserEvent = BrowserEvent;
/**
 * Constants for event type fired by Popup
 */
var EventType;
(function (EventType) {
    EventType["BEFORE_SHOW"] = "beforeshow";
    EventType["SHOW"] = "show";
    EventType["BEFORE_HIDE"] = "beforehide";
    EventType["HIDE"] = "hide";
})(EventType || (EventType = {}));
/**
 * The PopupBase class provides functionality for showing and hiding a generic
 * container element. It also provides the option for hiding the popup element
 * if the user clicks outside the popup or the popup loses focus.
 *
 * @constructor
 * @extends {goog.events.EventTarget}
 * @param {Element=} opt_element A DOM element for the popup.
 * @param {goog.ui.PopupBase.Type=} opt_type Type of popup.
 */
class PopupBase extends EventTarget {
    constructor(element, opt_type) {
        super();
        this.autoHide_ = true;
        this.autoHidePartners_ = new Set();
        this.autoHideRegion_ = null;
        this.isVisible_ = false;
        this.handler_ = new eventhelper_1.EventHandler();
        /**
         * Whether the popup should hide itself asynchrously. This was added because
         * there are cases where hiding the element in mouse down handler in IE can
         * cause textinputs to get into a bad state if the element that had focus is
         * hidden.
         */
        this.shouldHideAsync_ = false;
        /**
         * The time when the popup was last shown.
         */
        this.lastShowTime_ = -1;
        /**
         * The time when the popup was last hidden.
         */
        this.lastHideTime_ = -1;
        /**
         * Whether to hide when the escape key is pressed.
         */
        this.hideOnEscape_ = false;
        /**
         * Whether to enable cross-iframe dismissal.
         */
        this.enableCrossIframeDismissal_ = true;
        /**
         * The type of popup
         */
        this.type_ = Type.TOGGLE_DISPLAY;
        this.element_ = element;
        if (opt_type) {
            this.setType(opt_type);
        }
    }
    getType() {
        return this.type_;
    }
    ;
    /**
     * Specifies the type of popup to use.
     *
     * @param type Type of popup.
     */
    setType(type) {
        this.type_ = type;
    }
    ;
    /**
     * Returns whether the popup should hide itself asynchronously using a timeout
     * instead of synchronously.
     * @return {boolean} Whether to hide async.
     */
    shouldHideAsync() {
        return this.shouldHideAsync_;
    }
    /**
     * Sets whether the popup should hide itself asynchronously using a timeout
     * instead of synchronously.
     * @param {boolean} b Whether to hide async.
     */
    setShouldHideAsync(b) {
        this.shouldHideAsync_ = b;
    }
    /**
     * Returns the dom element that should be used for the popup.
     *
     * @return {Element} The popup element.
     */
    getElement() {
        return this.element_;
    }
    /**
     * Returns whether the Popup dismisses itself when the user clicks outside of
     * it.
     * @return {boolean} Whether the Popup autohides on an external click.
     */
    getAutoHide() {
        return this.autoHide_;
    }
    /**
     * Sets whether the Popup dismisses itself when the user clicks outside of it.
     * @param {boolean} autoHide Whether to autohide on an external click.
     */
    setAutoHide(autoHide) {
        this.ensureNotVisible_();
        this.autoHide_ = autoHide;
    }
    /**
     * Mouse events that occur within an autoHide partner will not hide a popup
     * set to autoHide.
     * @param partner The auto hide partner element.
     */
    addAutoHidePartner(partner) {
        this.autoHidePartners_.add(partner);
    }
    /**
     * Removes a previously registered auto hide partner.
     * @param {!Element} partner The auto hide partner element.
     */
    removeAutoHidePartner(partner) {
        this.autoHidePartners_.delete(partner);
    }
    /**
     * @return {boolean} Whether the Popup autohides on the escape key.
     */
    getHideOnEscape() {
        return this.hideOnEscape_;
    }
    /**
     * Sets whether the Popup dismisses itself on the escape key.
     * @param {boolean} hideOnEscape Whether to autohide on the escape key.
     */
    setHideOnEscape(hideOnEscape) {
        this.ensureNotVisible_();
        this.hideOnEscape_ = hideOnEscape;
    }
    /**
     * @return {boolean} Whether cross iframe dismissal is enabled.
     */
    getEnableCrossIframeDismissal() {
        return this.enableCrossIframeDismissal_;
    }
    ;
    /**
     * Sets whether clicks in other iframes should dismiss this popup.  In some
     * cases it should be disabled, because it can cause spurious
     * @param {boolean} enable Whether to enable cross iframe dismissal.
     */
    setEnableCrossIframeDismissal(enable) {
        this.enableCrossIframeDismissal_ = enable;
    }
    /**
     * Returns the region inside which the Popup dismisses itself when the user
     * clicks, or null if it's the entire document.
     * @return {Element} The DOM element for autohide, or null if it hasn't been
     *     set.
     */
    getAutoHideRegion() {
        return this.autoHideRegion_;
    }
    /**
     * Sets the region inside which the Popup dismisses itself when the user
     * clicks.
     * @param {Element} element The DOM element for autohide.
     */
    setAutoHideRegion(element) {
        this.autoHideRegion_ = element;
    }
    /**
     * Returns the time when the popup was last shown.
     *
     * @return {number} time in ms since epoch when the popup was last shown, or
     * -1 if the popup was never shown.
     */
    getLastShowTime() {
        return this.lastShowTime_;
    }
    /**
     * Returns the time when the popup was last hidden.
     *
     * @return {number} time in ms since epoch when the popup was last hidden, or
     * -1 if the popup was never hidden or is currently showing.
     */
    getLastHideTime() {
        return this.lastHideTime_;
    }
    /**
     * Helper to throw exception if the popup is showing.
     * @private
     */
    ensureNotVisible_() {
        if (this.isVisible_) {
            throw Error('Can not change this state of the popup while showing.');
        }
    }
    /**
     * Returns whether the popup is currently visible.
     *
     * @return {boolean} whether the popup is currently visible.
     */
    isVisible() {
        return this.isVisible_;
    }
    /**
     * Returns whether the popup is currently visible or was visible within about
     * 150 ms ago. This is used by clients to handle a very specific, but common,
     * popup scenario. The button that launches the popup should close the popup
     * on mouse down if the popup is alrady open. The problem is that the popup
     * closes itself during the capture phase of the mouse down and thus the button
     * thinks it's hidden and this should show it again. This method provides a
     * good heuristic for clients. Typically in their event handler they will have
     * code that is:
     *
     * if (menu.isOrWasRecentlyVisible()) {
     *   menu.setVisible(false);
     * } else {
     *   ... // code to position menu and initialize other state
     *   menu.setVisible(true);
     * }
     * @return {boolean} Whether the popup is currently visible or was visible
     *     within about 150 ms ago.
     */
    isOrWasRecentlyVisible() {
        return this.isVisible_ ||
            (new Date().getTime() - this.lastHideTime_ < PopupBase.DEBOUNCE_DELAY_MS);
    }
    /**
     * Sets whether the popup should be visible. After this method
     * returns, isVisible() will always return the new state, even if
     * there is a transition.
     *
     * @param {boolean} visible Desired visibility state.
     */
    setVisible(visible) {
        // Make sure that any currently running transition is stopped.
        if (this.showTransition_)
            this.showTransition_.stop();
        if (this.hideTransition_)
            this.hideTransition_.stop();
        if (visible) {
            this.show_();
        }
        else {
            this.hide_();
        }
    }
    ;
    /**
     * Does the work to show the popup.
     * @private
     */
    show_() {
        // Ignore call if we are already showing.
        if (this.isVisible_) {
            return;
        }
        // Give derived classes and handlers a chance to customize popup.
        if (!this.onBeforeShow()) {
            return;
        }
        // Allow callers to set the element in the BEFORE_SHOW event.
        if (!this.element_) {
            throw Error('Caller must call setElement before trying to show the popup');
        }
        // Call reposition after onBeforeShow, as it may change the style and/or
        // content of the popup and thereby affecting the size which is used for the
        // viewport calculation.
        this.reposition();
        var doc = (0, dom_1.getOwnerDocument)(this.element_);
        if (this.hideOnEscape_) {
            // Handle the escape keys.  Listen in the capture phase so that we can
            // stop the escape key from propagating to other elements.  For example,
            // if there is a popup within a dialog box, we want the popup to be
            // dismissed first, rather than the dialog.
            this.handler_.listen(doc, eventType_1.EventType.KEYDOWN, this.onDocumentKeyDown_.bind(this), true);
        }
        // Set up event handlers.
        if (this.autoHide_) {
            // Even if the popup is not in the focused document, we want to
            // close it on mousedowns in the document it's in.
            this.handler_.listen(doc, eventType_1.EventType.MOUSEDOWN, this.onDocumentMouseDown_.bind(this), true);
            if (useragent_1.userAgent.IE) {
                // We want to know about deactivates/mousedowns on the document with focus
                // The top-level document won't get a deactivate event if the focus is
                // in an iframe and the deactivate fires within that iframe.
                // The active element in the top-level document will remain the iframe
                // itself.
                var activeElement;
                /** @preserveTry */
                try {
                    activeElement = doc.activeElement;
                }
                catch (e) {
                    // There is an IE browser bug which can cause just the reading of
                    // document.activeElement to throw an Unspecified Error.  This
                    // may have to do with loading a popup within a hidden iframe.
                }
                while (activeElement &&
                    activeElement.nodeName == tags_1.TagName.IFRAME) {
                    /** @preserveTry */
                    try {
                        var tempDoc = (0, dom_1.getFrameContentDocument)(activeElement);
                    }
                    catch (e) {
                        // The frame is on a different domain that its parent document
                        // This way, we grab the lowest-level document object we can get
                        // a handle on given cross-domain security.
                        break;
                    }
                    doc = tempDoc;
                    activeElement = doc.activeElement;
                }
                // Handle mousedowns in the focused document in case the user clicks
                // on the activeElement (in which case the popup should hide).
                this.handler_.listen(doc, eventType_1.EventType.MOUSEDOWN, this.onDocumentMouseDown_, true);
                // If the active element inside the focused document changes, then
                // we probably need to hide the popup.
                this.handler_.listen(doc, eventType_1.EventType.DEACTIVATE, this.onDocumentBlur_);
            }
            else {
                this.handler_.listen(doc, eventType_1.EventType.BLUR, this.onDocumentBlur_);
            }
        }
        // Make the popup visible.
        if (this.type_ == Type.TOGGLE_DISPLAY) {
            this.showPopupElement();
        }
        else if (this.type_ == Type.MOVE_OFFSCREEN) {
            this.reposition();
        }
        this.isVisible_ = true;
        this.lastShowTime_ = new Date().getTime();
        this.lastHideTime_ = -1;
        // If there is transition to play, we play it and fire SHOW event after
        // the transition is over.
        if (this.showTransition_) {
            this.handler_.listenOnce(this.showTransition_, transition_1.EventType.END, this.onShow, false, this);
            this.showTransition_.play();
        }
        else {
            // Notify derived classes and handlers.
            this.onShow();
        }
    }
    ;
    /**
     * Hides the popup. This call is idempotent.
     *
     * @param {?Node=} opt_target Target of the event causing the hide.
     * @return {boolean} Whether the popup was hidden and not cancelled.
     * @private
     */
    hide_(opt_target) {
        // Give derived classes and handlers a chance to cancel hiding.
        if (!this.isVisible_ || !this.onBeforeHide(opt_target)) {
            return false;
        }
        // Remove any listeners we attached when showing the popup.
        if (this.handler_) {
            this.handler_.unlisten();
        }
        // Set visibility to hidden even if there is a transition.
        this.isVisible_ = false;
        this.lastHideTime_ = new Date().getTime();
        // If there is transition to play, we play it and only hide the element
        // (and fire HIDE event) after the transition is over.
        if (this.hideTransition_) {
            new eventhelper_1.EventHandler().listenOnce(this.hideTransition_, transition_1.EventType.END, () => this.continueHidingPopup_(opt_target), false, this);
            this.hideTransition_.play();
        }
        else {
            this.continueHidingPopup_(opt_target);
        }
        return true;
    }
    ;
    /**
     * Continues hiding the popup. This is a continuation from hide_. It is
     * a separate method so that we can add a transition before hiding.
     * @param opt_target Target of the event causing the hide.
     * @private
     */
    continueHidingPopup_(opt_target) {
        // Hide the popup.
        if (this.type_ == Type.TOGGLE_DISPLAY) {
            if (this.shouldHideAsync_) {
                setTimeout(this.hidePopupElement.bind(this), 0);
            }
            else {
                this.hidePopupElement();
            }
        }
        else if (this.type_ == Type.MOVE_OFFSCREEN) {
            this.moveOffscreen_();
        }
        // Notify derived classes and handlers.
        this.onHide(opt_target);
    }
    ;
    /**
     * Shows the popup element.
     * @protected
     */
    showPopupElement() {
        this.element_.style.visibility = 'visible';
        (0, dom_1.setElementShown)(this.element_, true);
    }
    /**
     * Hides the popup element.
     * @protected
     */
    hidePopupElement() {
        this.element_.style.visibility = 'hidden';
        (0, dom_1.setElementShown)(this.element_, false);
    }
    /**
     * Hides the popup by moving it offscreen.
     *
     * @private
     */
    moveOffscreen_() {
        this.element_.style.top = '-10000px';
    }
    ;
    /**
     * Called before the popup is shown. Derived classes can override to hook this
     * event but should make sure to call the parent class method.
     *
     * @return If anyone called preventDefault on the event object (or
     *     if any of the handlers returns false this will also return false.
     */
    onBeforeShow() {
        return this.dispatchEvent(new Event(EventType.BEFORE_SHOW));
    }
    ;
    /**
     * Called after the popup is shown. Derived classes can override to hook this
     * event but should make sure to call the parent class method.
     * @protected
     */
    onShow() {
        this.dispatchEvent(new Event(EventType.SHOW));
    }
    ;
    /**
     * Called before the popup is hidden. Derived classes can override to hook this
     * event but should make sure to call the parent class method.
     *
     * @param {?Node=} opt_target Target of the event causing the hide.
     * @return {boolean} If anyone called preventDefault on the event object (or
     *     if any of the handlers returns false this will also return false.
     * @protected
     */
    onBeforeHide(opt_srcEvent) {
        if (opt_srcEvent) {
            return this.dispatchEvent(new BrowserEvent(EventType.BEFORE_HIDE, this, opt_srcEvent));
        }
        else {
            return this.dispatchEvent(new Event(EventType.BEFORE_HIDE));
        }
    }
    /**
     * Called after the popup is hidden. Derived classes can override to hook this
     * event but should make sure to call the parent class method.
     * @param {?Node=} opt_target Target of the event causing the hide.
     * @protected
     */
    onHide(opt_srcEvent) {
        if (opt_srcEvent) {
            this.dispatchEvent(new BrowserEvent(EventType.HIDE, this, opt_srcEvent));
        }
        else {
            this.dispatchEvent(new Event(EventType.HIDE));
        }
    }
    /**
     * Mouse down handler for the document on capture phase. Used to hide the
     * popup for auto-hide mode.
     *
     * @param {goog.events.BrowserEvent} e The event object.
     * @private
     */
    onDocumentMouseDown_(e) {
        let target = e.target;
        if (!(0, dom_1.contains)(this.element_, target) &&
            !this.isOrWithinAutoHidePartner_(target) &&
            this.isWithinAutoHideRegion_(target) && !this.shouldDebounce_()) {
            // Mouse click was outside popup and partners, so hide.
            this.hide_(e);
        }
    }
    ;
    /**
     * Handles key-downs on the document to handle the escape key.
     *
     * @param {goog.events.BrowserEvent} e The event object.
     * @private
     */
    onDocumentKeyDown_(e) {
        if (e.key == "Escape") {
            if (this.hide_(e)) {
                // Eat the escape key, but only if this popup was actually closed.
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }
    ;
    /**
     * Deactivate handler(IE) and blur handler (other browsers) for document.
     * Used to hide the popup for auto-hide mode.
     *
     * @param e The event object.
     * @private
     */
    onDocumentBlur_(e) {
        if (!this.enableCrossIframeDismissal_) {
            return;
        }
        let doc = (0, dom_1.getOwnerDocument)(this.element_);
        // Ignore blur events if the active element is still inside the popup or if
        // there is no longer an active element.  For example, a widget like a
        // goog.ui.Button might programatically blur itself before losing tabIndex.
        if (typeof document.activeElement != 'undefined') {
            var activeElement = doc.activeElement;
            if (!activeElement || (0, dom_1.contains)(this.element_, activeElement) ||
                activeElement.tagName == tags_1.TagName.BODY) {
                return;
            }
            // Ignore blur events not for the document itself in non-IE browsers.
        }
        else if (e.target != doc) {
            return;
        }
        // Debounce the initial focus move.
        if (this.shouldDebounce_()) {
            return;
        }
        this.hide_();
    }
    /**
     * @param {Node} element The element to inspect.
     * @return {boolean} Returns true if the given element is one of the auto hide
     *     partners or is a child of an auto hide partner.
     * @private
     */
    isOrWithinAutoHidePartner_(element) {
        for (let partner of this.autoHidePartners_) {
            if (element === partner || (0, dom_1.contains)(partner, element)) {
                return true;
            }
        }
        return false;
    }
    /**
     * @param {Node} element The element to inspect.
     * @return {boolean} Returns true if the element is contained within
     *     the autohide region. If unset, the autohide region is the entire
     *     entire document.
     * @private
     */
    isWithinAutoHideRegion_(element) {
        return this.autoHideRegion_ ?
            (0, dom_1.contains)(this.autoHideRegion_, element) :
            true;
    }
    /**
     * @return Whether the time since last show is less than the debounce delay.
     */
    shouldDebounce_() {
        return new Date().getTime() - this.lastShowTime_ < PopupBase.DEBOUNCE_DELAY_MS;
    }
    disposeInternal() {
        this.handler_.unlisten();
        this.autoHidePartners_.clear();
    }
}
exports.PopupBase = PopupBase;
/**
 * A time in ms used to debounce events that happen right after each other.
 *
 * A note about why this is necessary. There are two cases to consider.
 * First case, a popup will usually see a focus event right after it's launched
 * because it's typical for it to be launched in a mouse-down event which will
 * then move focus to the launching button. We don't want to think this is a
 * separate user action moving focus. Second case, a user clicks on the
 * launcher button to close the menu. In that case, we'll close the menu in the
 * focus event and then show it again because of the mouse down event, even
 * though the intention is to just close the menu. This workaround appears to
 * be the least intrusive fix.
 */
PopupBase.DEBOUNCE_DELAY_MS = 150;

},{"./dom/dom":10,"./dom/eventType":11,"./dom/tags":15,"./dom/useragent":16,"./eventhelper":17,"./fx/transition":18}],23:[function(require,module,exports){
"use strict";
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractPosition = void 0;
/**
 * Abstract position object. Encapsulates position and overflow handling.
 *
 * @constructor
 */
class AbstractPosition {
}
exports.AbstractPosition = AbstractPosition;

},{}],24:[function(require,module,exports){
"use strict";
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnchoredPosition = void 0;
const positioning_1 = require("./positioning");
const abstractposition_1 = require("./abstractposition");
class AnchoredPosition extends abstractposition_1.AbstractPosition {
    /**
     * Encapsulates a popup position where the popup is anchored at a corner of
     * an element.
     *
     * When using AnchoredPosition, it is recommended that the popup element
     * specified in the Popup constructor or Popup.setElement be absolutely
     * positioned.
     *
     * @param anchorElement Element the movable element should be
     *     anchored against.
     * @param corner Corner of anchored element the
     *     movable element should be positioned at.
     * @param opt_overflow Overflow handling mode. Defaults to IGNORE if
     *     not specified. Bitmap, {@see goog.positioning.Overflow}.
     */
    constructor(anchorElement, corner, opt_overflow) {
        super();
        this.element = anchorElement;
        this.corner = corner;
        this.overflow_ = opt_overflow;
    }
    /**
     * Repositions the movable element.
     *
     * @param movableElement Element to position.
     * @param movableCorner Corner of the movable element
     *     that should be positioned adjacent to the anchored element.
     * @param opt_margin A margin specifin pixels.
     * @param opt_preferredSize PreferredSize of the
     *     movableElement (unused in this class).
     * @override
     */
    reposition(movableElement, movableCorner, opt_margin, opt_preferredSize) {
        (0, positioning_1.positionAtAnchor)(this.element, this.corner, movableElement, movableCorner, undefined, opt_margin, this.overflow_);
    }
}
exports.AnchoredPosition = AnchoredPosition;

},{"./abstractposition":23,"./positioning":25}],25:[function(require,module,exports){
"use strict";
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverflowStatus = exports.Overflow = exports.Corner = exports.CornerBit = void 0;
exports.positionAtAnchor = positionAtAnchor;
exports.getOffsetParentPageOffset = getOffsetParentPageOffset;
exports.positionAtCoordinate = positionAtCoordinate;
exports.getPositionAtCoordinate = getPositionAtCoordinate;
exports.flipCornerHorizontal = flipCornerHorizontal;
exports.flipCornerVertical = flipCornerVertical;
exports.flipCorner = flipCorner;
/**
 * @fileoverview Common positioning code.
 *
 * @author eae@google.com (Emil A Eklund)
 */
const coordinate_1 = require("../dom/coordinate");
const size_1 = require("../dom/size");
const dom_1 = require("../dom/dom");
const tags_1 = require("../dom/tags");
const rect_1 = require("../dom/rect");
/**
 * Enum for bits in the {@see Corner} bitmap.
 */
var CornerBit;
(function (CornerBit) {
    CornerBit[CornerBit["BOTTOM"] = 1] = "BOTTOM";
    CornerBit[CornerBit["CENTER"] = 2] = "CENTER";
    CornerBit[CornerBit["RIGHT"] = 4] = "RIGHT";
    CornerBit[CornerBit["FLIP_RTL"] = 8] = "FLIP_RTL";
})(CornerBit || (exports.CornerBit = CornerBit = {}));
/**
 * Enum for representing an element corner for positioning the popup.
 *
 * The START constants map to LEFT if element directionality is left
 * to right and RIGHT if the directionality is right to left.
 * Likewise, END maps to RIGHT or LEFT depending on the directionality.
 *
 * @enum {number}
 */
var Corner;
(function (Corner) {
    Corner[Corner["TOP_LEFT"] = 0] = "TOP_LEFT";
    Corner[Corner["TOP_RIGHT"] = 4] = "TOP_RIGHT";
    Corner[Corner["BOTTOM_LEFT"] = 1] = "BOTTOM_LEFT";
    Corner[Corner["BOTTOM_RIGHT"] = 5] = "BOTTOM_RIGHT";
    Corner[Corner["TOP_START"] = 8] = "TOP_START";
    Corner[Corner["TOP_END"] = 12] = "TOP_END";
    Corner[Corner["BOTTOM_START"] = 9] = "BOTTOM_START";
    Corner[Corner["BOTTOM_END"] = 13] = "BOTTOM_END";
    Corner[Corner["TOP_CENTER"] = 2] = "TOP_CENTER";
    Corner[Corner["BOTTOM_CENTER"] = 3] = "BOTTOM_CENTER";
})(Corner || (exports.Corner = Corner = {}));
/**
 * Enum for representing position handling in cases where the element would be
 * positioned outside the viewport.
 *
 * @enum {number}
 */
var Overflow;
(function (Overflow) {
    /** Ignore overflow */
    Overflow[Overflow["IGNORE"] = 0] = "IGNORE";
    /** Try to fit horizontally in the viewport at all costs. */
    Overflow[Overflow["ADJUST_X"] = 1] = "ADJUST_X";
    /** If the element can't fit horizontally, report positioning failure. */
    Overflow[Overflow["FAIL_X"] = 2] = "FAIL_X";
    /** Try to fit vertically in the viewport at all costs. */
    Overflow[Overflow["ADJUST_Y"] = 4] = "ADJUST_Y";
    /** If the element can't fit vertically, report positioning failure. */
    Overflow[Overflow["FAIL_Y"] = 8] = "FAIL_Y";
    /** Resize the element's width to fit in the viewport. */
    Overflow[Overflow["RESIZE_WIDTH"] = 16] = "RESIZE_WIDTH";
    /** Resize the element's height to fit in the viewport. */
    Overflow[Overflow["RESIZE_HEIGHT"] = 32] = "RESIZE_HEIGHT";
    /**
     * If the anchor goes off-screen in the x-direction, position the movable
     * element off-screen. Otherwise, try to fit horizontally in the viewport.
     */
    Overflow[Overflow["ADJUST_X_EXCEPT_OFFSCREEN"] = 65] = "ADJUST_X_EXCEPT_OFFSCREEN";
    /**
     * If the anchor goes off-screen in the y-direction, position the movable
     * element off-screen. Otherwise, try to fit vertically in the viewport.
     */
    Overflow[Overflow["ADJUST_Y_EXCEPT_OFFSCREEN"] = 132] = "ADJUST_Y_EXCEPT_OFFSCREEN";
})(Overflow || (exports.Overflow = Overflow = {}));
/**
 * Enum for representing the outcome of a positioning call.
 *
 * @enum {number}
 */
var OverflowStatus;
(function (OverflowStatus) {
    OverflowStatus[OverflowStatus["NONE"] = 0] = "NONE";
    OverflowStatus[OverflowStatus["ADJUSTED_X"] = 1] = "ADJUSTED_X";
    OverflowStatus[OverflowStatus["ADJUSTED_Y"] = 2] = "ADJUSTED_Y";
    OverflowStatus[OverflowStatus["WIDTH_ADJUSTED"] = 4] = "WIDTH_ADJUSTED";
    OverflowStatus[OverflowStatus["HEIGHT_ADJUSTED"] = 8] = "HEIGHT_ADJUSTED";
    OverflowStatus[OverflowStatus["FAILED_LEFT"] = 16] = "FAILED_LEFT";
    OverflowStatus[OverflowStatus["FAILED_RIGHT"] = 32] = "FAILED_RIGHT";
    OverflowStatus[OverflowStatus["FAILED_TOP"] = 64] = "FAILED_TOP";
    OverflowStatus[OverflowStatus["FAILED_BOTTOM"] = 128] = "FAILED_BOTTOM";
    OverflowStatus[OverflowStatus["FAILED_OUTSIDE_VIEWPORT"] = 256] = "FAILED_OUTSIDE_VIEWPORT";
    OverflowStatus[OverflowStatus["FAILED"] = 496] = "FAILED";
    OverflowStatus[OverflowStatus["FAILED_HORIZONTAL"] = 48] = "FAILED_HORIZONTAL";
    OverflowStatus[OverflowStatus["FAILED_VERTICAL"] = 192] = "FAILED_VERTICAL";
})(OverflowStatus || (exports.OverflowStatus = OverflowStatus = {}));
/**
 * Positions a movable element relative to an anchor element. The caller
 * specifies the corners that should touch. This functions then moves the
 * movable element accordingly.
 *
 * @param anchorElement The element that is the anchor for where
 *    the movable element should position itself.
 * @param anchorElementCorner The corner of the
 *     anchorElement for positioning the movable element.
 * @param movableElement The element to move.
 * @param movableElementCorner The corner of the
 *     movableElement that that should be positioned adjacent to the anchor
 *     element.
 * @param opt_offset An offset specified in pixels.
 *    After the normal positioning algorithm is applied, the offset is then
 *    applied. Positive coordinates move the popup closer to the center of the
 *    anchor element. Negative coordinates move the popup away from the center
 *    of the anchor element.
 * @param opt_margin A margin specified in pixels.
 *    After the normal positioning algorithm is applied and any offset, the
 *    margin is then applied. Positive coordinates move the popup away from the
 *    spot it was positioned towards its center. Negative coordinates move it
 *    towards the spot it was positioned away from its center.
 * @param {?number=} opt_overflow Overflow handling mode. Defaults to IGNORE if
 *     not specified. Bitmap, {@see Overflow}.
 * @param opt_preferredSize The preferred size of the
 *     movableElement.
 * @param opt_viewport Box object describing the dimensions of
 *     the viewport. The viewport is specified relative to offsetParent of
 *     {@code movableElement}. In other words, the viewport can be thought of as
 *     describing a "position: absolute" element contained in the offsetParent.
 *     It defaults to visible area of nearest scrollable ancestor of
 *     {@code movableElement} (see {@code getVisibleRectForElement}).
 * @return Status bitmap,
 *     {@see OverflowStatus}.
 */
function positionAtAnchor(anchorElement, anchorElementCorner, movableElement, movableElementCorner, opt_offset, opt_margin, opt_overflow, opt_preferredSize, opt_viewport) {
    let movableParentTopLeft = getOffsetParentPageOffset(movableElement);
    // Get the visible part of the anchor element.  anchorRect is
    // relative to anchorElement's page.
    let anchorRect = getVisiblePart_(anchorElement);
    // Translate anchorRect to be relative to movableElement's page.
    (0, dom_1.translateRectForAnotherFrame)(anchorRect, (0, dom_1.getDomHelper)(anchorElement), (0, dom_1.getDomHelper)(movableElement));
    // Offset based on which corner of the element we want to position against.
    let corner = getEffectiveCorner(anchorElement, anchorElementCorner);
    let offsetLeft = anchorRect.left;
    if (corner & CornerBit.RIGHT) {
        offsetLeft += anchorRect.width;
    }
    else if (corner & CornerBit.CENTER) {
        offsetLeft += anchorRect.width / 2;
    }
    // absolutePos is a candidate position relative to the
    // movableElement's window.
    let absolutePos = new coordinate_1.Coordinate(offsetLeft, anchorRect.top +
        (corner & CornerBit.BOTTOM ? anchorRect.height : 0));
    // Translate absolutePos to be relative to the offsetParent.
    absolutePos =
        coordinate_1.Coordinate.difference(absolutePos, movableParentTopLeft);
    // Apply offset, if specified
    if (opt_offset) {
        absolutePos.x +=
            (corner & CornerBit.RIGHT ? -1 : 1) * opt_offset.x;
        absolutePos.y +=
            (corner & CornerBit.BOTTOM ? -1 : 1) * opt_offset.y;
    }
    // Determine dimension of viewport.
    let viewport;
    if (opt_overflow) {
        if (opt_viewport) {
            viewport = opt_viewport;
        }
        else {
            viewport = (0, dom_1.getVisibleRectForElement)(movableElement);
            if (viewport) {
                viewport.top -= movableParentTopLeft.y;
                viewport.right -= movableParentTopLeft.x;
                viewport.bottom -= movableParentTopLeft.y;
                viewport.left -= movableParentTopLeft.x;
            }
        }
    }
    return positionAtCoordinate(absolutePos, movableElement, movableElementCorner, opt_margin, viewport || undefined, opt_overflow, opt_preferredSize);
}
/**
 * Calculates the page offset of the given element's
 * offsetParent. This value can be used to translate any x- and
 * y-offset relative to the page to an offset relative to the
 * offsetParent, which can then be used directly with as position
 * coordinate for {@code positionWithCoordinate}.
 * @param movableElement The element to calculate.
 * @return The page offset, may be (0, 0).
 */
function getOffsetParentPageOffset(movableElement) {
    // Ignore offset for the BODY element unless its position is non-static.
    // For cases where the offset parent is HTML rather than the BODY (such as in
    // IE strict mode) there's no need to get the position of the BODY as it
    // doesn't affect the page offset.
    let movableParentTopLeft;
    let parent = movableElement.offsetParent;
    if (parent) {
        let isBody = parent.tagName == tags_1.TagName.HTML ||
            parent.tagName == tags_1.TagName.BODY;
        if (!isBody || (0, dom_1.getComputedPosition)(parent) != 'static') {
            // Get the top-left corner of the parent, in page coordinates.
            movableParentTopLeft = (0, dom_1.getPageOffset)(parent);
            if (!isBody) {
                movableParentTopLeft = coordinate_1.Coordinate.difference(movableParentTopLeft, new coordinate_1.Coordinate((0, dom_1.getScrollLeft)(parent), parent.scrollTop));
            }
        }
    }
    return movableParentTopLeft || new coordinate_1.Coordinate();
}
/**
 * Returns intersection of the specified element and getVisibleRectForElement for it.
 *
 * @param el The target element.
 * @return Intersection of getVisibleRectForElement
 *     and the current bounding rectangle of the element.  If the
 *     intersection is empty, returns the bounding rectangle.
 */
function getVisiblePart_(el) {
    let rect = (0, dom_1.getBounds)(el);
    let visibleBox = (0, dom_1.getVisibleRectForElement)(el);
    if (visibleBox) {
        rect.intersection(rect_1.Rect.createFromBox(visibleBox));
    }
    return rect;
}
/**
 * Positions the specified corner of the movable element at the
 * specified coordinate.
 *
 * @param absolutePos The coordinate to position the
 *     element at.
 * @param {Element} movableElement The element to be positioned.
 * @param movableElementCorner The corner of the
 *     movableElement that that should be positioned.
 * @param opt_margin A margin specified in pixels.
 *    After the normal positioning algorithm is applied and any offset, the
 *    margin is then applied. Positive coordinates move the popup away from the
 *    spot it was positioned towards its center. Negative coordinates move it
 *    towards the spot it was positioned away from its center.
 * @param opt_viewport Box object describing the dimensions of
 *     the viewport. Required if opt_overflow is specified.
 * @param opt_overflow Overflow handling mode. Defaults to IGNORE if
 *     not specified, {@see Overflow}.
 * @param  opt_preferredSize The preferred size of the
 *     movableElement. Defaults to the current size.
 * @return {OverflowStatus} Status bitmap.
 */
function positionAtCoordinate(absolutePos, movableElement, movableElementCorner, opt_margin, opt_viewport, opt_overflow, opt_preferredSize) {
    absolutePos = absolutePos.clone();
    // Offset based on attached corner and desired margin.
    let corner = getEffectiveCorner(movableElement, movableElementCorner);
    let elementSize = (0, dom_1.getSize)(movableElement);
    let size = opt_preferredSize ? opt_preferredSize.clone() : elementSize.clone();
    let positionResult = getPositionAtCoordinate(absolutePos, size, corner, opt_margin, opt_viewport, opt_overflow);
    if (positionResult.status & OverflowStatus.FAILED) {
        return positionResult.status;
    }
    (0, dom_1.setPosition)(movableElement, positionResult.rect.getTopLeft());
    size = positionResult.rect.getSize();
    if (!size_1.Size.equals(elementSize, size)) {
        (0, dom_1.setBorderBoxSize)(movableElement, size);
    }
    return positionResult.status;
}
/**
 * Computes the position for an element to be placed on-screen at the
 * specified coordinates. Returns an object containing both the resulting
 * rectangle, and the overflow status bitmap.
 *
 * @param absolutePos The coordinate to position the
 *     element at.
 * @param elementSize The size of the element to be
 *     positioned.
 * @param elementCorner The corner of the
 *     movableElement that that should be positioned.
 * @param opt_margin A margin specified in pixels.
 *    After the normal positioning algorithm is applied and any offset, the
 *    margin is then applied. Positive coordinates move the popup away from the
 *    spot it was positioned towards its center. Negative coordinates move it
 *    towards the spot it was positioned away from its center.
 * @param opt_viewport Box object describing the dimensions of
 *     the viewport. Required if opt_overflow is specified.
 * @param opt_overflow Overflow handling mode. Defaults to IGNORE
 *     if not specified, {@see Overflow}.
 * @return Object containing the computed position and status bitmap.
 */
function getPositionAtCoordinate(absolutePos, elementSize, elementCorner, opt_margin, opt_viewport, opt_overflow) {
    absolutePos = absolutePos.clone();
    elementSize = elementSize.clone();
    let status = OverflowStatus.NONE;
    if (opt_margin || elementCorner != Corner.TOP_LEFT) {
        if (elementCorner & CornerBit.RIGHT) {
            absolutePos.x -= elementSize.width + (opt_margin ? opt_margin.right : 0);
        }
        else if (elementCorner & CornerBit.CENTER) {
            absolutePos.x -= elementSize.width / 2;
        }
        else if (opt_margin) {
            absolutePos.x += opt_margin.left;
        }
        if (elementCorner & CornerBit.BOTTOM) {
            absolutePos.y -=
                elementSize.height + (opt_margin ? opt_margin.bottom : 0);
        }
        else if (opt_margin) {
            absolutePos.y += opt_margin.top;
        }
    }
    // Adjust position to fit inside viewport.
    if (opt_overflow) {
        status = opt_viewport ?
            adjustForViewport_(absolutePos, elementSize, opt_viewport, opt_overflow) :
            OverflowStatus.FAILED_OUTSIDE_VIEWPORT;
    }
    let rect = new rect_1.Rect(0, 0, 0, 0);
    rect.left = absolutePos.x;
    rect.top = absolutePos.y;
    rect.width = elementSize.width;
    rect.height = elementSize.height;
    return { rect: rect, status: status };
}
/**
 * Adjusts the position and/or size of an element, identified by its position
 * and size, to fit inside the viewport. If the position or size of the element
 * is adjusted the pos or size objects, respectively, are modified.
 *
 * @param pos Position of element, updated if the
 *     position is adjusted.
 * @param size Size of element, updated if the size is
 *     adjusted.
 * @param viewport Bounding box describing the viewport.
 * @param overflow Overflow handling mode,
 *     {@see Overflow}.
 * @return Status bitmap,
 *     {@see OverflowStatus}.
 * @private
 */
function adjustForViewport_(pos, size, viewport, overflow) {
    let status = OverflowStatus.NONE;
    let ADJUST_X_EXCEPT_OFFSCREEN = Overflow.ADJUST_X_EXCEPT_OFFSCREEN;
    let ADJUST_Y_EXCEPT_OFFSCREEN = Overflow.ADJUST_Y_EXCEPT_OFFSCREEN;
    if ((overflow & ADJUST_X_EXCEPT_OFFSCREEN) == ADJUST_X_EXCEPT_OFFSCREEN &&
        (pos.x < viewport.left || pos.x >= viewport.right)) {
        overflow &= ~Overflow.ADJUST_X;
    }
    if ((overflow & ADJUST_Y_EXCEPT_OFFSCREEN) == ADJUST_Y_EXCEPT_OFFSCREEN &&
        (pos.y < viewport.top || pos.y >= viewport.bottom)) {
        overflow &= ~Overflow.ADJUST_Y;
    }
    // Left edge outside viewport, try to move it.
    if (pos.x < viewport.left && overflow & Overflow.ADJUST_X) {
        pos.x = viewport.left;
        status |= OverflowStatus.ADJUSTED_X;
    }
    // Ensure object is inside the viewport width if required.
    if (overflow & Overflow.RESIZE_WIDTH) {
        // Move left edge inside viewport.
        let originalX = pos.x;
        if (pos.x < viewport.left) {
            pos.x = viewport.left;
            status |= OverflowStatus.WIDTH_ADJUSTED;
        }
        // Shrink width to inside right of viewport.
        if (pos.x + size.width > viewport.right) {
            // Set the width to be either the new maximum width within the viewport
            // or the width originally within the viewport, whichever is less.
            size.width = Math.min(viewport.right - pos.x, originalX + size.width - viewport.left);
            size.width = Math.max(size.width, 0);
            status |= OverflowStatus.WIDTH_ADJUSTED;
        }
    }
    // Right edge outside viewport, try to move it.
    if (pos.x + size.width > viewport.right &&
        overflow & Overflow.ADJUST_X) {
        pos.x = Math.max(viewport.right - size.width, viewport.left);
        status |= OverflowStatus.ADJUSTED_X;
    }
    // Left or right edge still outside viewport, fail if the FAIL_X option was
    // specified, ignore it otherwise.
    if (overflow & Overflow.FAIL_X) {
        status |=
            (pos.x < viewport.left ? OverflowStatus.FAILED_LEFT :
                0) |
                (pos.x + size.width > viewport.right ?
                    OverflowStatus.FAILED_RIGHT :
                    0);
    }
    // Top edge outside viewport, try to move it.
    if (pos.y < viewport.top && overflow & Overflow.ADJUST_Y) {
        pos.y = viewport.top;
        status |= OverflowStatus.ADJUSTED_Y;
    }
    // Ensure object is inside the viewport height if required.
    if (overflow & Overflow.RESIZE_HEIGHT) {
        // Move top edge inside viewport.
        let originalY = pos.y;
        if (pos.y < viewport.top) {
            pos.y = viewport.top;
            status |= OverflowStatus.HEIGHT_ADJUSTED;
        }
        // Shrink height to inside bottom of viewport.
        if (pos.y + size.height > viewport.bottom) {
            // Set the height to be either the new maximum height within the viewport
            // or the height originally within the viewport, whichever is less.
            size.height = Math.min(viewport.bottom - pos.y, originalY + size.height - viewport.top);
            size.height = Math.max(size.height, 0);
            status |= OverflowStatus.HEIGHT_ADJUSTED;
        }
    }
    // Bottom edge outside viewport, try to move it.
    if (pos.y + size.height > viewport.bottom &&
        overflow & Overflow.ADJUST_Y) {
        pos.y = Math.max(viewport.bottom - size.height, viewport.top);
        status |= OverflowStatus.ADJUSTED_Y;
    }
    // Top or bottom edge still outside viewport, fail if the FAIL_Y option was
    // specified, ignore it otherwise.
    if (overflow & Overflow.FAIL_Y) {
        status |=
            (pos.y < viewport.top ? OverflowStatus.FAILED_TOP :
                0) |
                (pos.y + size.height > viewport.bottom ?
                    OverflowStatus.FAILED_BOTTOM :
                    0);
    }
    return status;
}
/**
 * Returns an absolute corner (top/bottom left/right) given an absolute
 * or relative (top/bottom start/end) corner and the direction of an element.
 * Absolute corners remain unchanged.
 * @param {Element} element DOM element to test for RTL direction.
 * @param corner The popup corner used for
 *     positioning.
 * @return Effective corner.
 */
function getEffectiveCorner(element, corner) {
    return ((corner & CornerBit.FLIP_RTL &&
        (0, dom_1.isRightToLeft)(element) ?
        corner ^ CornerBit.RIGHT :
        corner) &
        ~CornerBit.FLIP_RTL);
}
/**
 * Returns the corner opposite the given one horizontally.
 * @param corner The popup corner used to flip.
 * @return The opposite corner horizontally.
 */
function flipCornerHorizontal(corner) {
    return (corner ^ CornerBit.RIGHT);
}
/**
 * Returns the corner opposite the given one vertically.
 * @param corner The popup corner used to flip.
 * @return The opposite corner vertically.
 */
function flipCornerVertical(corner) {
    return (corner ^ CornerBit.BOTTOM);
}
/**
 * Returns the corner opposite the given one horizontally and vertically.
 * @param corner The popup corner used to flip.
 * @return The opposite corner horizontally and
 *     vertically.
 */
function flipCorner(corner) {
    return (corner ^ CornerBit.BOTTOM ^
        CornerBit.RIGHT);
}

},{"../dom/coordinate":9,"../dom/dom":10,"../dom/rect":13,"../dom/size":14,"../dom/tags":15}],26:[function(require,module,exports){
"use strict";
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewPortPosition = void 0;
/**
 * @fileoverview Client positioning class.
 *
 * @author eae@google.com (Emil A Eklund)
 */
const abstractposition_1 = require("./abstractposition");
const coordinate_1 = require("../dom/coordinate");
const positioning_1 = require("./positioning");
const dom_1 = require("../dom/dom");
/**
 * Encapsulates a popup position where the popup is positioned according to
 * coordinates relative to the  element's viewport (page). This calculates the
 * correct position to use even if the element is relatively positioned to some
 * other element.
 *
 * @param {number|goog.math.Coordinate} arg1 Left position or coordinate.
 * @param {number=} opt_arg2 Top position.
 * @constructor
 * @extends {goog.positioning.AbstractPosition}
 */
class ViewPortPosition extends abstractposition_1.AbstractPosition {
    constructor(arg1, opt_arg2) {
        super();
        this.coordinate = arg1 instanceof coordinate_1.Coordinate ?
            arg1 :
            new coordinate_1.Coordinate(arg1, opt_arg2);
    }
    /**
     * Repositions the popup according to the current state
     *
     * @param element The DOM element of the popup.
     * @param popupCorner The corner of the popup
     *     element that that should be positioned adjacent to the anchorElement.
     * @param opt_margin A margin specified in pixels.
     * @param opt_preferredSize Preferred size of the element.
     */
    reposition(element, popupCorner, opt_margin, opt_preferredSize) {
        (0, positioning_1.positionAtAnchor)((0, dom_1.getClientViewportElement)(element), positioning_1.Corner.TOP_LEFT, element, popupCorner, this.coordinate, opt_margin, undefined, opt_preferredSize);
    }
}
exports.ViewPortPosition = ViewPortPosition;

},{"../dom/coordinate":9,"../dom/dom":10,"./abstractposition":23,"./positioning":25}],27:[function(require,module,exports){
"use strict";
// Copyright 2007 The Closure Library Authors. All Rights Reserved.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tooltip = void 0;
/**
 * @fileoverview Tooltip widget implementation.
 *
 * @author eae@google.com (Emil A Eklund)
 * @see ../demos/tooltip.html
 */
const dom_1 = require("./dom/dom");
const eventType_1 = require("./dom/eventType");
const tags_1 = require("./dom/tags");
const eventhelper_1 = require("./eventhelper");
const box_1 = require("./dom/box");
const anchoredposition_1 = require("./positioning/anchoredposition");
const positioning_1 = require("./positioning/positioning");
const coordinate_1 = require("./dom/coordinate");
const classlist_1 = require("./dom/classlist");
const viewportposition_1 = require("./positioning/viewportposition");
const popup_1 = require("./popup");
/**
 * Possible states for the tooltip to be in.
 * @enum {number}
 */
var State;
(function (State) {
    State[State["INACTIVE"] = 0] = "INACTIVE";
    State[State["WAITING_TO_SHOW"] = 1] = "WAITING_TO_SHOW";
    State[State["SHOWING"] = 2] = "SHOWING";
    State[State["WAITING_TO_HIDE"] = 3] = "WAITING_TO_HIDE";
    State[State["UPDATING"] = 4] = "UPDATING"; // waiting to show new hovercard while old one still showing.
})(State || (State = {}));
/**
 * Popup activation types. Used to select a positioning strategy.
 * @enum {number}
 */
var Activation;
(function (Activation) {
    Activation[Activation["CURSOR"] = 0] = "CURSOR";
    Activation[Activation["FOCUS"] = 1] = "FOCUS";
})(Activation || (Activation = {}));
class Tooltip extends popup_1.Popup {
    /**
     * Tooltip widget. Can be attached to one or more elements and is shown, with a
     * slight delay, when the the cursor is over the element or the element gains
     * focus.
     *
     * @param  opt_el Element to display tooltip for, either
     *     element reference or string id.
     * @param opt_str Text message to display in tooltip.
     * @param opt_domHelper Optional DOM helper.
     */
    constructor(opt_el, opt_str, opt_domHelper) {
        let dom = opt_domHelper || (0, dom_1.getDomHelper)(opt_el ? (0, dom_1.getElement)(opt_el) : null);
        super(dom.createDom(tags_1.TagName.DIV, { 'style': 'position:absolute;display:none;' }));
        this.focusListeners_ = [];
        /**
         * CSS class name for tooltip.
         */
        this.className = 'recoil-tooltip';
        /**
         * Active element reference. Used by the delayed show functionality to keep
         * track of the element the mouse is over or the element with focus.
         */
        this.activeEl_ = null;
        /**
         * Delay in milliseconds since the last mouseover or mousemove before the
         * tooltip is displayed for an element.
         */
        this.showDelayMs_ = 500;
        /**
         * Delay in milliseconds before tooltips are hidden.
         */
        this.hideDelayMs_ = 0;
        /**
         * If this tooltip's element contains another tooltip that becomes active, this
         * property identifies that tooltip so that we can check if this tooltip should
         * not be hidden because the nested tooltip is active.
         */
        this.childTooltip_ = null;
        /**
         * Element that triggered the tooltip.  Note that if a second element triggers
         * this tooltip, anchor becomes that second element, even if its show is
         * cancelled and the original tooltip survives.
         *
         * @type {Element|undefined}
         * @protected
         */
        this.anchor = null;
        this.attachedElements_ = new Map();
        this.elementMouseListeners_ = [];
        /**
         * If this tooltip is inside another tooltip's element, then it may have
         * prevented that tooltip from hiding.  When this tooltip hides, we'll need
         * to check if the parent should be hidden as well.
         */
        this.parentTooltip_ = null;
        this.dom_ = dom;
        /**
         * Cursor position relative to the page.
         * @type {!Coordinate}
         * @protected
         */
        this.cursorPosition = new coordinate_1.Coordinate(1, 1);
        /**
         * Elements this widget is attached to.
         * @type {goog.structs.Set}
         * @private
         */
        // Attach to element, if specified
        if (opt_el) {
            this.attach(opt_el);
        }
        // Set message, if specified.
        (0, dom_1.removeChildren)(this.element_);
        if (opt_str != null) {
            this.element_.appendChild((0, dom_1.createTextNode)(opt_str));
        }
    }
    setClasses(classes) {
        (0, classlist_1.setAll)(this.element_, classes);
    }
    /**
     * Returns the dom helper that is being used on this component.
     * @return The dom helper used on this component.
     */
    getDomHelper() {
        return this.dom_;
    }
    /**
     * @return Active tooltip in a child element, or null if none.
     * @protected
     */
    getChildTooltip() {
        return this.childTooltip_;
    }
    /**
     * Handler for mouse out and blur events.
     */
    handleMouseOutAndBlur(event) {
        let el = this.getAnchorFromElement(event.target);
        let elTo = this.getAnchorFromElement((event.relatedTarget));
        if (el == elTo) {
            // We haven't really left the anchor, just moved from one child to
            // another.
            return;
        }
        if (el == this.activeEl_) {
            this.activeEl_ = null;
        }
        this.clearShowTimer();
        this.seenInteraction_ = false;
        if (this.isVisible() &&
            (!event.relatedTarget ||
                !(0, dom_1.contains)(this.element_, event.relatedTarget))) {
            this.startHideTimer();
        }
        else {
            this.anchor = null;
        }
    }
    /**
     * Attach to element. Tooltip will be displayed when the cursor is over the
     * element or when the element has been active for a few milliseconds.
     *
     * @param elOrId Element to display tooltip for, either element
     *                            reference or string id.
     */
    attach(elOrId) {
        let el = (0, dom_1.getRequiredElement)(elOrId);
        let listeners = this.attachedElements_.get(el) || [];
        this.attachedElements_.set(el, listeners);
        eventhelper_1.EventHelper.reregister(listeners, eventhelper_1.EventHelper.listen(el, eventType_1.EventType.MOUSEOVER, this.handleMouseOver.bind(this), false), eventhelper_1.EventHelper.listen(el, eventType_1.EventType.MOUSEOUT, this.handleMouseOutAndBlur.bind(this), false), eventhelper_1.EventHelper.listen(el, eventType_1.EventType.MOUSEMOVE, this.handleMouseMove.bind(this), false), eventhelper_1.EventHelper.listen(el, eventType_1.EventType.FOCUS, this.handleFocus.bind(this), false), eventhelper_1.EventHelper.listen(el, eventType_1.EventType.BLUR, this.handleMouseOutAndBlur.bind(this), false));
    }
    /**
     * Detach from element(s).
     *
     * @param {Element|string=} opt_el Element to detach from, either element
     *                                reference or string id. If no element is
     *                                specified all are detached.
     */
    detach(opt_el) {
        if (opt_el) {
            let el = (0, dom_1.getElement)(opt_el);
            if (el) {
                this.detachElement_(el);
                this.attachedElements_.delete(el);
            }
        }
        else {
            for (let el of this.attachedElements_.keys()) {
                this.detachElement_(el);
            }
            this.attachedElements_.clear();
        }
    }
    /**
     * Handler for mouse over events.
     *
     * @param event Event object.
     */
    handleMouseOver(event) {
        let el = this.getAnchorFromElement(event.target);
        this.activeEl_ = el;
        this.clearHideTimer();
        if (el != this.anchor) {
            this.anchor = el;
            this.startShowTimer(el);
            this.checkForParentTooltip_();
            this.saveCursorPosition_(event);
        }
    }
    /**
     * Detach from element.
     *
     * @param el Element to detach from.
     */
    detachElement_(el) {
        let listeners = this.attachedElements_.get(el);
        if (listeners) {
            eventhelper_1.EventHelper.reregister(listeners);
        }
    }
    /**
     * Sets delay in milliseconds before tooltip is displayed for an element.
     *
     * @param {number} delay The delay in milliseconds.
     */
    setShowDelayMs(delay) {
        this.showDelayMs_ = delay;
    }
    /**
     * @return {number} The delay in milliseconds before tooltip is displayed for an
     *     element.
     */
    getShowDelayMs() {
        return this.showDelayMs_;
    }
    /**
     * Sets delay in milliseconds before tooltip is hidden once the cursor leavs
     * the element.
     *
     * @param {number} delay The delay in milliseconds.
     */
    setHideDelayMs(delay) {
        this.hideDelayMs_ = delay;
    }
    /**
     * @return The delay in milliseconds before tooltip is hidden once the
     *     cursor leaves the element.
     */
    getHideDelayMs() {
        return this.hideDelayMs_;
    }
    setContext(value) {
        if (typeof value == "string") {
            (0, dom_1.setTextContent)(this.element_, value);
        }
        else {
            (0, dom_1.removeChildren)(this.element_);
            (0, dom_1.append)(this.element_, value);
        }
    }
    /**
     * Sets tooltip element.
     *
     */
    setElement(el) {
        (0, dom_1.removeChildren)(this.element_);
        this.element_.appendChild(el);
    }
    /**
     * Handler for keyboard focus events of elements inside the tooltip's content
     * element. This should only be invoked if this.getElement() != null.
     * @private
     */
    registerContentFocusEvents_() {
        this.focusListeners_.map(v => v.unlisten);
        this.focusListeners_ = [
            eventhelper_1.EventHelper.listen(this.element_, eventType_1.EventType.FOCUSIN, this.clearHideTimer.bind(this)),
            eventhelper_1.EventHelper.listen(this.element_, eventType_1.EventType.FOCUSOUT, this.startHideTimer.bind(this))
        ];
    }
    /**
     * @return The tooltip message as plain text.
     */
    getText() {
        return (0, dom_1.getTextContent)(this.element_);
    }
    /**
     * @return Current state of tooltip.
     */
    getState() {
        return this.showTimer ?
            (this.isVisible() ? State.UPDATING : State.WAITING_TO_SHOW) :
            this.hideTimer ? State.WAITING_TO_HIDE :
                this.isVisible() ? State.SHOWING : State.INACTIVE;
    }
    /**
     * Sets whether tooltip requires the mouse to have moved or the anchor receive
     * focus before the tooltip will be shown.
     * @param requireInteraction Whether tooltip should require some user
     *     interaction before showing tooltip.
     */
    setRequireInteraction(requireInteraction) {
        this.requireInteraction_ = requireInteraction;
    }
    /**
     * Returns true if the coord is in the tooltip.
     * @param coord Coordinate being tested.
     * @return Whether the coord is in the tooltip.
     */
    isCoordinateInTooltip(coord) {
        // Check if coord is inside the tooltip
        if (!this.isVisible()) {
            return false;
        }
        let offset = (0, dom_1.getPageOffset)(this.element_);
        let size = (0, dom_1.getSize)(this.element_);
        return offset.x <= coord.x && coord.x <= offset.x + size.width &&
            offset.y <= coord.y && coord.y <= offset.y + size.height;
    }
    /**
     * Called before the popup is shown.
     *
     * @return  Whether tooltip should be shown.
     */
    onBeforeShow() {
        if (!super.onBeforeShow()) {
            return false;
        }
        // Hide all open tooltips except if this tooltip is triggered by an element
        // inside another tooltip.
        if (this.anchor) {
            for (let tt of Tooltip.activeInstances_) {
                if (!(0, dom_1.contains)(tt.element_, this.anchor)) {
                    tt.setVisible(false);
                }
            }
        }
        Tooltip.activeInstances_.add(this);
        let element = this.element_;
        element.className = this.className;
        this.clearHideTimer();
        // Register event handlers for tooltip. Used to prevent the tooltip from
        // closing if the cursor is over the tooltip rather then the element that
        // triggered it.
        eventhelper_1.EventHelper.reregister(this.elementMouseListeners_, eventhelper_1.EventHelper.listen(this.element_, eventType_1.EventType.MOUSEOVER, this.handleTooltipMouseOver.bind(this), false), eventhelper_1.EventHelper.listen(this.element_, eventType_1.EventType.MOUSEOUT, this.handleTooltipMouseOut.bind(this), false));
        this.clearShowTimer();
        return true;
    }
    onHide() {
        Tooltip.activeInstances_.delete(this);
        // Hide all open tooltips triggered by an element inside this tooltip.
        let element = this.element_;
        for (let tt of Tooltip.activeInstances_) {
            if (tt.anchor && (0, dom_1.contains)(element, tt.anchor)) {
                tt.setVisible(false);
            }
        }
        // If this tooltip is inside another tooltip, start hide timer for that
        // tooltip in case this tooltip was the only reason it was still showing.
        if (this.parentTooltip_) {
            this.parentTooltip_.startHideTimer();
        }
        eventhelper_1.EventHelper.reregister(this.elementMouseListeners_);
        this.anchor = null;
        // If we are still waiting to show a different hovercard, don't abort it
        // because you think you haven't seen a mouse move:
        if (this.getState() == State.INACTIVE) {
            this.seenInteraction_ = false;
        }
    }
    /**
     * Called by timer from mouse over handler. Shows tooltip if cursor is still
     * over the same element.
     *
     * @param {Element} el Element to show tooltip for.
     * @param {AbstractPosition=} opt_pos Position to display popup
     *     at.
     */
    maybeShow(el, opt_pos) {
        // Assert that the mouse is still over the same element, and that we have not
        // detached from the anchor in the meantime.
        if (this.anchor == el && this.anchor && this.attachedElements_.has(this.anchor)) {
            if (this.seenInteraction_ || !this.requireInteraction_) {
                // If it is currently showing, then hide it, and abort if it doesn't hide.
                this.setVisible(false);
                if (!this.isVisible()) {
                    this.positionAndShow_(el, opt_pos);
                }
            }
            else {
                this.anchor = null;
            }
        }
        this.showTimer = undefined;
    }
    ;
    /**
     * @return {goog.structs.Set} Elements this widget is attached to.
     * @protected
     */
    getElements() {
        return new Set(this.attachedElements_.keys());
    }
    /**
     * @return Active element reference.
     */
    getActiveElement() {
        return this.activeEl_;
    }
    setActiveElement(activeEl) {
        this.activeEl_ = activeEl;
    }
    /**
     * Sets the position helper object associated with the popup.
     *
     * @param position A position helper object.
     */
    setPosition(position) {
        this.position_ = position || undefined;
        if (this.isVisible()) {
            this.reposition();
        }
    }
    /**
     * Shows tooltip for a specific element.
     *
     * @param el Element to show tooltip for.
     * @param opt_pos Position to display popup
     *     at.
     */
    showForElement(el, opt_pos) {
        this.attach(el);
        this.activeEl_ = el;
        this.positionAndShow_(el, opt_pos);
    }
    /**
     * Sets tooltip position and shows it.
     *
     * @param el Element to show tooltip for.
     * @param opt_pos Position to display popup at.
     */
    positionAndShow_(el, opt_pos) {
        this.anchor = el;
        this.setPosition(opt_pos ||
            this.getPositioningStrategy(Activation.CURSOR));
        this.setVisible(true);
    }
    ;
    /**
     * Called by timer from mouse out handler. Hides tooltip if cursor is still
     * outside element and tooltip, or if a child of tooltip has the focus.
     * @param el Tooltip's anchor when hide timer was started.
     */
    maybeHide(el) {
        this.hideTimer = undefined;
        if (el == this.anchor) {
            let dom = this.getDomHelper();
            let focusedEl = dom.getActiveElement();
            // If the tooltip content is focused, then don't hide the tooltip.
            let tooltipContentFocused = focusedEl && this.getElement() &&
                dom.contains(this.getElement(), focusedEl);
            if ((this.activeEl_ == null ||
                (this.activeEl_ != this.getElement() &&
                    !this.attachedElements_.has(this.activeEl_))) &&
                !tooltipContentFocused && !this.hasActiveChild()) {
                this.setVisible(false);
            }
        }
    }
    /**
     * @return Whether tooltip element contains an active child tooltip,
     *     and should thus not be hidden.  When the child tooltip is hidden, it
     *     will check if the parent should be hidden, too.
     */
    hasActiveChild() {
        return !!(this.childTooltip_ && this.childTooltip_.activeEl_);
    }
    /**
     * Saves the current mouse cursor position to {@code this.cursorPosition}.
     * @param event MOUSEOVER or MOUSEMOVE event.
     */
    saveCursorPosition_(event) {
        let scroll = this.dom_.getDocumentScroll();
        this.cursorPosition.x = event.clientX + scroll.x;
        this.cursorPosition.y = event.clientY + scroll.y;
    }
    /**
     * Find anchor containing the given element, if any.
     *
     * @param el Element that triggered event.
     * @return Element in elements_ array that contains given element,
     *     or null if not found.
     * @protected
     */
    getAnchorFromElement(el) {
        // FireFox has a bug where mouse events relating to <input> elements are
        // sometimes duplicated (often in FF2, rarely in FF3): once for the
        // <input> element and once for a magic hidden <div> element.  Javascript
        // code does not have sufficient permissions to read properties on that
        // magic element and thus will throw an error in this call to
        // getAnchorFromElement_().  In that case we swallow the error.
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=330961
        try {
            while (el && !this.attachedElements_.has(el)) {
                el = (el.parentNode);
            }
            return el;
        }
        catch (e) {
            return null;
        }
    }
    /**
     * Handler for mouse move events.
     *
     * @param event MOUSEMOVE event.
     * @protected
     */
    handleMouseMove(event) {
        this.saveCursorPosition_(event);
        this.seenInteraction_ = true;
    }
    ;
    /**
     * Handler for focus events.
     *
     * @param event Event object.
     * @protected
     */
    handleFocus(event) {
        let el = this.getAnchorFromElement(event.target);
        this.activeEl_ = el;
        this.seenInteraction_ = true;
        if (this.anchor != el) {
            this.anchor = el;
            let pos = this.getPositioningStrategy(Activation.FOCUS);
            this.clearHideTimer();
            if (el) {
                this.startShowTimer(el, pos);
            }
            this.checkForParentTooltip_();
        }
    }
    ;
    /**
     * Return a Position instance for repositioning the tooltip. Override in
     * subclasses to customize the way repositioning is done.
     *
     * @param activationType Information about what
     *    kind of event caused the popup to be shown.
     * @return The position object used
     *    to position the tooltip.
     */
    getPositioningStrategy(activationType) {
        if (activationType == Activation.CURSOR || this.activeEl_ === null) {
            let coord = this.cursorPosition.clone();
            return new CursorTooltipPosition(coord);
        }
        return new ElementTooltipPosition(this.activeEl_);
    }
    /**
     * Looks for an active tooltip whose element contains this tooltip's anchor.
     * This allows us to prevent hides until they are really necessary.
     *
     * @private
     */
    checkForParentTooltip_() {
        if (this.anchor) {
            for (let tt of Tooltip.activeInstances_) {
                if ((0, dom_1.contains)(tt.element_, this.anchor)) {
                    tt.childTooltip_ = this;
                    this.parentTooltip_ = tt;
                }
            }
        }
    }
    /**
     * Handler for mouse over events for the tooltip element.
     *
     * @param event Event object.
     * @protected
     */
    handleTooltipMouseOver(event) {
        let element = this.element_;
        if (this.activeEl_ != element) {
            this.clearHideTimer();
            this.activeEl_ = element;
        }
    }
    /**
     * Handler for mouse out events for the tooltip element.
     *
     * @param event Event object.
     * @protected
     */
    handleTooltipMouseOut(event) {
        let element = this.getElement();
        if (this.activeEl_ == element &&
            (!event.relatedTarget ||
                !(0, dom_1.contains)(element, event.relatedTarget))) {
            this.activeEl_ = null;
            this.startHideTimer();
        }
    }
    /**
     * Helper method, starts timer that calls maybeShow. Parameters are passed to
     * the maybeShow method.
     *
     * @param el Element to show tooltip for.
     * @param opt_pos Position to display popup
     *     atg.
     * @protected
     */
    startShowTimer(el, opt_pos) {
        if (!this.showTimer) {
            this.showTimer = setTimeout(() => this.maybeShow(el, opt_pos), this.showDelayMs_);
        }
    }
    /**
     * Helper method called to clear the show timer.
     */
    clearShowTimer() {
        if (this.showTimer) {
            clearTimeout(this.showTimer);
            this.showTimer = undefined;
        }
    }
    /**
     * Helper method called to start the close timer.
     * @protected
     */
    startHideTimer() {
        if (this.getState() == State.SHOWING) {
            this.hideTimer = setTimeout(() => this.maybeHide(this.anchor), this.getHideDelayMs());
        }
    }
    /**
     * Helper method called to clear the close timer.
     * @protected
     */
    clearHideTimer() {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = undefined;
        }
    }
    /** @override */
    disposeInternal() {
        this.setVisible(false);
        this.clearShowTimer();
        this.detach();
        (0, dom_1.removeNode)(this.element_);
        this.activeEl_ = null;
    }
}
exports.Tooltip = Tooltip;
/**
 * List of active (open) tooltip widgets. Used to prevent multiple tooltips
 * from appearing at once.
 */
Tooltip.activeInstances_ = new Set();
class CursorTooltipPosition extends viewportposition_1.ViewPortPosition {
    /**
     * Popup position implementation that positions the popup (the tooltip in this
     * case) based on the cursor position. It's positioned below the cursor to the
     * right if there's enough room to fit all of it inside the Viewport, otherwise
     * it's displayed as far right as possible either above or below the element.
     *
     * Used to position tooltips triggered by the cursor.
     *
     * @param arg1 Left position or coordinate.
     * @param opt_arg2 Top position.
     * @final
     */
    constructor(arg1, opt_arg2) {
        super(arg1, opt_arg2);
    }
    /**
     * Repositions the popup based on cursor position.
     *
     * @param element The DOM element of the popup.
     * @param popupCorner The corner of the popup element
     *     that that should be positioned adjacent to the anchorElement.
     * @param opt_margin A margin specified in pixels.
     * @override
     */
    reposition(element, popupCorner, opt_margin) {
        let viewportElt = (0, dom_1.getClientViewportElement)(element);
        let viewport = (0, dom_1.getVisibleRectForElement)(viewportElt);
        let margin = opt_margin ?
            new box_1.Box(opt_margin.top + 10, opt_margin.right, opt_margin.bottom, opt_margin.left + 10) :
            new box_1.Box(10, 0, 0, 10);
        if ((0, positioning_1.positionAtCoordinate)(this.coordinate, element, positioning_1.Corner.TOP_START, margin, viewport, positioning_1.Overflow.ADJUST_X |
            positioning_1.Overflow.FAIL_Y) &
            positioning_1.OverflowStatus.FAILED) {
            (0, positioning_1.positionAtCoordinate)(this.coordinate, element, positioning_1.Corner.TOP_START, margin, viewport, positioning_1.Overflow.ADJUST_X |
                positioning_1.Overflow.ADJUST_Y);
        }
    }
}
/**
 * Popup position implementation that positions the popup (the tooltip in this
 * case) based on the element position. It's positioned below the element to the
 * right if there's enough room to fit all of it inside the Viewport, otherwise
 * it's displayed as far right as possible either above or below the element.
 *
 * Used to position tooltips triggered by focus changes.
 *
 * @param {Element} element The element to anchor the popup at.
 * @constructor
 * @extends {AnchoredPosition}
 */
class ElementTooltipPosition extends anchoredposition_1.AnchoredPosition {
    constructor(element) {
        super(element, positioning_1.Corner.BOTTOM_RIGHT);
    }
    /**
     * Repositions the popup based on element position.
     *
     * @param {Element} element The DOM element of the popup.
     * @param {Corner} popupCorner The corner of the popup element
     *     that should be positioned adjacent to the anchorElement.
     * @param {Box=} opt_margin A margin specified in pixels.
     * @override
     */
    reposition(element, popupCorner, opt_margin) {
        let offset = new coordinate_1.Coordinate(10, 0);
        if ((0, positioning_1.positionAtAnchor)(this.element, this.corner, element, popupCorner, offset, opt_margin, positioning_1.Overflow.ADJUST_X |
            positioning_1.Overflow.FAIL_Y) &
            positioning_1.OverflowStatus.FAILED) {
            (0, positioning_1.positionAtAnchor)(this.element, positioning_1.Corner.TOP_RIGHT, element, positioning_1.Corner.BOTTOM_LEFT, offset, opt_margin, positioning_1.Overflow.ADJUST_X |
                positioning_1.Overflow.ADJUST_Y);
        }
    }
}

},{"./dom/box":7,"./dom/classlist":8,"./dom/coordinate":9,"./dom/dom":10,"./dom/eventType":11,"./dom/tags":15,"./eventhelper":17,"./popup":21,"./positioning/anchoredposition":24,"./positioning/positioning":25,"./positioning/viewportposition":26}],28:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WidgetHelper = void 0;
const frp_1 = require("../frp/frp");
const classlist = __importStar(require("./dom/classlist"));
const dom_1 = require("./dom/dom");
const messages_1 = require("./messages");
class WidgetHelper {
    constructor(widgetScope, element, obj, callback, opt_detachCallback) {
        this.behaviours_ = [];
        this.attachedBehaviour_ = null;
        this.isAttached_ = false;
        this.observer_ = widgetScope.getObserver();
        this.frp_ = widgetScope.getFrp();
        this.element_ = element;
        this.detachCallback_ = () => {
            if (opt_detachCallback) {
                opt_detachCallback.apply(obj, []);
            }
        };
        this.debug_ = null;
        if (!(callback instanceof Function)) {
            throw new Error('callback not a function');
        }
        this.listenFunc_ = (visible) => {
            if (this.debug_) {
                console.log('VISIBLE', this.debug_, visible);
            }
            if (!this.attachedBehaviour_) {
                return;
            }
            if (visible != this.isAttached_) {
                this.isAttached_ = visible;
                if (visible) {
                    this.frp_.attach(this.attachedBehaviour_);
                }
                else {
                    this.detachCallback_();
                    this.frp_.detach(this.attachedBehaviour_);
                }
            }
        };
        this.callback_ = () => {
            if (this.element_ !== null) {
                try {
                    callback.apply(obj, [this, ...this.behaviours_]);
                }
                catch (e) {
                    console.error(e);
                }
            }
            return new frp_1.BStatus(null);
        };
    }
    get behaviours() {
        return this.behaviours_;
    }
    /**
     * updates the classes on an elemnt it will remove all old classes that are in cur classes but not
     * in classesB
     * @param element the element to update the class list for
     * @param classesB the behaviour that stores the classes in
     * @param curClasses
     * @return the new classes
     */
    static updateClasses(element, classesB, curClasses) {
        let newClasses = classesB && classesB.metaGet().good() ? classesB.get() : [];
        for (let cls of newClasses) {
            if (curClasses.indexOf(cls) === -1) {
                classlist.add(element, cls);
            }
        }
        for (let cls of curClasses) {
            if (newClasses.indexOf(cls) === -1) {
                classlist.remove(element, cls);
            }
        }
        return newClasses;
    }
    getFrp() {
        return this.frp_;
    }
    /**
     * @param debug the tag to print when debugging
     */
    debug(debug) {
        this.debug_ = debug;
    }
    /**
     * @return {boolean}
     */
    isAttached() {
        return this.isAttached_;
    }
    /**
     * @param node at text node that will contain the message
     */
    setMessage(node) {
        (0, dom_1.removeChildren)(node);
        classlist.removeAll(node, ['recoil-error', 'recoil-info']);
        if (!this.isGood()) {
            let errors = this.errors();
            if (errors.length > 0) {
                (0, dom_1.append)(node, (0, dom_1.createTextNode)(messages_1.Messages.join(errors).toString()));
                classlist.add(node, 'recoil-error');
            }
            else {
                classlist.add(node, 'recoil-notready');
                (0, dom_1.append)(node, (0, dom_1.createTextNode)(messages_1.Messages.NOT_READY.toString()));
            }
        }
    }
    ;
    /**
     * removes all children
     */
    clearContainer() {
        (0, dom_1.removeChildren)(this.element_);
    }
    /**
     * @return {boolean} is the value good
     */
    isGood() {
        for (let b of this.behaviours_) {
            if (!b.hasRefs()) {
                return false;
            }
            if (b.metaGet() !== null && !b.metaGet().good()) {
                return false;
            }
        }
        return true;
    }
    /**
     * @return {!Array<*>} an array of errors
     */
    errors() {
        let result = [];
        for (let key = 0; key < this.behaviours_.length; key++) {
            let b = this.behaviours_[key];
            if (!b.hasRefs()) {
                continue;
            }
            let meta = b.metaGet();
            if (meta !== null) {
                let errors = meta.errors();
                for (let i = 0; i < errors.length; i++) {
                    let error = errors[i];
                    if (result.indexOf(error) === -1) {
                        result.push(error);
                    }
                }
            }
        }
        return result;
    }
    /**
     * force the change to fire
     */
    forceUpdate() {
        // if there are no behaviours then no need to fire since they don't change
        if (this.behaviours_.length !== 0) {
            frp_1.Frp.access(this.detachCallback_, ...this.behaviours_);
        }
    }
    /**
     * like frp access trans but will do attached behaviours and only if they are good
     * @param {function():?} cb
     * @param {?=} opt_def
     * @return {?}
     */
    accessTrans(cb, opt_def) {
        if (!this.isAttached_) {
            return opt_def;
        }
        return this.frp_.accessTrans(() => {
            if (this.isGood()) {
                return cb();
            }
            else {
                return opt_def;
            }
        }, ...this.behaviours_);
    }
    /**
     * starts listen these behaviours and stops listening to any other behaviours it used to listen too
     *
     * @param var_behaviour
     *
     */
    attach(...var_behaviour) {
        let newBehaviours = [];
        let same = var_behaviour.length === this.behaviours_.length;
        for (let i = 0; i < var_behaviour.length; i++) {
            newBehaviours.push(var_behaviour[i]);
            same = same && var_behaviour[i] === this.behaviours_[i];
        }
        if (same) {
            return;
        }
        let hadBehaviour = this.behaviours_.length !== 0;
        if (hadBehaviour) {
            if (this.isAttached_) {
                if (this.attachedBehaviour_) {
                    this.frp_.detach(this.attachedBehaviour_);
                }
                this.detachCallback_();
            }
        }
        this.behaviours_ = newBehaviours;
        if (this.behaviours_.length === 0) {
            this.attachedBehaviour_ = null;
        }
        else {
            this.attachedBehaviour_ = this.frp_.observeB(this.callback_, ...this.behaviours_).setName('AttachedB in helper');
        }
        if (hadBehaviour) {
            if (this.isAttached_ && this.attachedBehaviour_) {
                this.frp_.attach(this.attachedBehaviour_);
            }
            else if (this.behaviours_.length === 0) {
                this.observer_.unlisten(this.element_, this.listenFunc_);
            }
        }
        else {
            this.isAttached_ = false;
            if (this.behaviours_.length > 0) {
                this.observer_.listen(this.element_, this.listenFunc_);
            }
        }
    }
    detach() {
        this.attach();
    }
}
exports.WidgetHelper = WidgetHelper;

},{"../frp/frp":2,"./dom/classlist":8,"./dom/dom":10,"./messages":20}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeOf = typeOf;
exports.isObject = isObject;
exports.isString = isString;
exports.isArray = isArray;
exports.assert = assert;
exports.toRadians = toRadians;
/**
 * This is a "fixed" version of the typeof operator.  It differs from the typeof
 * operator in such a way that null returns 'null' and arrays return 'array'.
 * @param {?} value The value to get the type of.
 * @return {string} The name of the type.
 */
function typeOf(value) {
    var s = typeof value;
    if (s == 'object') {
        if (value) {
            // Check these first, so we can avoid calling Object.prototype.toString if
            // possible.
            //
            // IE improperly marshals typeof across execution contexts, but a
            // cross-context object will still return false for "instanceof Object".
            if (value instanceof Array) {
                return 'array';
            }
            else if (value instanceof Object) {
                return s;
            }
            // HACK: In order to use an Object prototype method on the arbitrary
            //   value, the compiler requires the value be cast to type Object,
            //   even though the ECMA spec explicitly allows it.
            var className = Object.prototype.toString.call(
            /** @type {!Object} */ (value));
            // In Firefox 3.6, attempting to access iframe window objects' length
            // property throws an NS_ERROR_FAILURE, so we need to special-case it
            // here.
            if (className == '[object Window]') {
                return 'object';
            }
            // We cannot always use constructor == Array or instanceof Array because
            // different frames have different Array objects. In IE6, if the iframe
            // where the array was created is destroyed, the array loses its
            // prototype. Then dereferencing val.splice here throws an exception, so
            // we can't use goog.isFunction. Calling typeof directly returns 'unknown'
            // so that will work. In this case, this function will return false and
            // most array functions will still work because the array is still
            // array-like (supports length and []) even though it has lost its
            // prototype.
            // Mark Miller noticed that Object.prototype.toString
            // allows access to the unforgeable [[Class]] property.
            //  15.2.4.2 Object.prototype.toString ( )
            //  When the toString method is called, the following steps are taken:
            //      1. Get the [[Class]] property of this object.
            //      2. Compute a string value by concatenating the three strings
            //         "[object ", Result(1), and "]".
            //      3. Return Result(2).
            // and this behavior survives the destruction of the execution context.
            if ((className == '[object Array]' ||
                // In IE all non value types are wrapped as objects across window
                // boundaries (not iframe though) so we have to do object detection
                // for this edge case.
                typeof value.length == 'number' &&
                    typeof value.splice != 'undefined' &&
                    typeof value.propertyIsEnumerable != 'undefined' &&
                    !value.propertyIsEnumerable('splice'))) {
                return 'array';
            }
            // HACK: There is still an array case that fails.
            //     function ArrayImpostor() {}
            //     ArrayImpostor.prototype = [];
            //     var impostor = new ArrayImpostor;
            // this can be fixed by getting rid of the fast path
            // (value instanceof Array) and solely relying on
            // (value && Object.prototype.toString.vall(value) === '[object Array]')
            // but that would require many more function calls and is not warranted
            // unless closure code is receiving objects from untrusted sources.
            // IE in cross-window calls does not correctly marshal the function type
            // (it appears just as an object) so we cannot use just typeof val ==
            // 'function'. However, if the object has a call property, it is a
            // function.
            if ((className == '[object Function]' ||
                typeof value.call != 'undefined' &&
                    typeof value.propertyIsEnumerable != 'undefined' &&
                    !value.propertyIsEnumerable('call'))) {
                return 'function';
            }
        }
        else {
            return 'null';
        }
    }
    else if (s == 'function' && typeof value.call == 'undefined') {
        // In Safari typeof nodeList returns 'function', and on Firefox typeof
        // behaves similarly for HTML{Applet,Embed,Object}, Elements and RegExps. We
        // would like to return object for those and we can detect an invalid
        // function by making sure that the function object has a call method.
        return 'object';
    }
    return s;
}
function isObject(val) {
    let type = typeOf(val);
    return type == 'object' && val != null || type == 'function';
    // return Object(val) === val also works, but is slower, especially if val is
    // not an object.
}
function isString(val) {
    return typeof val === 'string';
}
function isArray(val) {
    return typeOf(val) == 'array';
}
function assert(val, msg) {
    if (!val) {
        throw Error(msg);
    }
}
function toRadians(angleDegrees) {
    return angleDegrees * Math.PI / 180;
}

},{}],30:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultCompare = defaultCompare;
exports.safeFreeze = safeFreeze;
exports.compareAll = compareAll;
exports.compareKey = compareKey;
exports.uniq = uniq;
exports.compare3 = compare3;
exports.compare = compare;
exports.isEqual = isEqual;
exports.toString = toString;
exports.isContainerEqual = isContainerEqual;
exports.registerCompare = registerCompare;
exports.addProps = addProps;
exports.removeUndefined = removeUndefined;
exports.getByParts = getByParts;
exports.clone = clone;
exports.constant = constant;
const sequence_1 = __importDefault(require("./sequence"));
function defaultCompare(a, b) {
    return a > b ? 1 : a < b ? -1 : 0;
}
/**
 * @template T
 * @param {T} value
 * @return {T}
 */
function safeFreeze(value) {
    if (value instanceof Object) {
        if (Object.isFrozen && !Object.isFrozen(value)) {
            var result = Object.create(value);
            Object.freeze(result);
            return result;
        }
    }
    return value;
}
/**
 * calls compare on all arguments, returns the first non-zero result
 *
 */
function compareAll(values) {
    for (let i = 0; i < values.length; i++) {
        let res = compare(values[i].x, values[i].y);
        if (res !== 0) {
            return res;
        }
    }
    return 0;
}
/**
 * a generic compare function that compares only the key
 * field in the object
 *
 * @param {{key}} a
 * @param {{key}} b
 * @return {number}
 */
function compareKey(a, b) {
    return compare(a.key, b.key);
}
/**
 * a unique object that cloning or equal ensures
 * @private
 * @constructor
 */
class UniqObject_ {
    constructor() {
        this.id_ = UniqObject_.seq_.nextLong();
    }
    clone() {
        return this;
    }
    equal(that) {
        return this === that;
    }
}
UniqObject_.seq_ = new sequence_1.default();
function uniq() {
    return new UniqObject_();
}
function compare3(a, b, cmp) {
    for (let i = 0; i < a.length && i < b.length; i++) {
        let res = cmp(a[i], b[i]);
        if (res !== 0) {
            return res;
        }
    }
    return a.length - b.length;
}
/**
 *
 * A negative number, zero, or a positive number as the first
 *     argument is less than, equal to, or greater than the second,
 *     respectively.
 */
function compare(a, b, ignore = new Set(), aPath = new Set(), bPath = new Set()) {
    // check for loops
    const aIndex = setIndexOf(a, aPath);
    const bIndex = setIndexOf(b, bPath);
    if (aIndex !== -1 || bIndex !== -1) {
        if (aIndex === bIndex) {
            return 0;
        }
        if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
        }
        return aIndex === -1 ? 1 : -1;
    }
    if (a === b) {
        return 0;
    }
    if (a === undefined) {
        return -1;
    }
    if (b === undefined) {
        return 1;
    }
    if (a === null) {
        return -1;
    }
    if (b === null) {
        return 1;
    }
    var res;
    if (a.compare !== undefined && a.compare instanceof Function) {
        res = a.compare(b);
        if (res !== undefined) {
            return res;
        }
    }
    if (b.compare !== undefined && b.compare instanceof Function) {
        res = b.compare(a);
        if (res !== undefined) {
            return -res;
        }
    }
    let aInfo = COMPARE_MAP.get(a.__proto__);
    let bInfo = COMPARE_MAP.get(b.__proto__);
    if (aInfo || bInfo) {
        if (aInfo && !bInfo) {
            return -1;
        }
        if (!aInfo && bInfo) {
            return 1;
        }
        if (aInfo !== bInfo) {
            return mapIndexOf(a.__proto__, COMPARE_MAP) - mapIndexOf(b.__proto__, COMPARE_MAP);
        }
        // @ts-ignore
        // aInfo cannot be undefined
        return aInfo.compare(a, b, ignore, aPath, bPath);
    }
    // if 1 and only 1 of a and b is an array
    if ((a instanceof Array) != (b instanceof Array)) {
        if (a instanceof Array) {
            return 1;
        }
        return -1;
    }
    let newAPath = new Set([...aPath, a]);
    let newBPath = new Set([...bPath, b]);
    if (a instanceof Array) {
        return compare3(a, b, (x, y) => compare(x, y, ignore, newAPath, newBPath));
    }
    if (a instanceof Object && b instanceof Object) {
        let aKeys = [];
        let bKeys = [];
        for (var k in a) {
            if (a.hasOwnProperty(k)) {
                aKeys.push(k);
            }
        }
        for (let k in b) {
            if (b.hasOwnProperty(k)) {
                bKeys.push(k);
            }
        }
        aKeys.sort();
        bKeys.sort();
        res = compare3(aKeys, bKeys, (x, y) => x.localeCompare(y));
        if (res !== 0) {
            return res;
        }
        let skiped = false;
        for (let i = 0; i < aKeys.length; i++) {
            let k = aKeys[i];
            res = compare(a[k], b[k], ignore, newAPath, newBPath);
            if (res === undefined) {
                skiped = true;
                continue;
            }
            if (res !== 0) {
                return res;
            }
        }
        return (skiped ? undefined : 0);
    }
    if (a instanceof Object) {
        return -1;
    }
    if (b instanceof Object) {
        return 1;
    }
    if (typeof (a) === typeof (b)) {
        return defaultCompare(a, b);
    }
    return defaultCompare(typeof (a), typeof (b));
}
/**
 * compares 2 objects
 *
 * @return {boolean}
 */
function isEqual(a, b, ignore = new Set(), aPath = new Set(), bPath = new Set()) {
    return isEqualRec(a, b, ignore, aPath, bPath);
}
/**
 * converts value to a string dealing with loops
 */
function toString(obj, opt_path = []) {
    const func1 = {}.toString;
    const func2 = [].toString;
    const toStringRec = function (o, path) {
        let index = path.indexOf(o);
        if (index !== -1) {
            return '<loop{' + index + '}>';
        }
        if (o.toString !== undefined && o.toString !== func1 && o.toString !== func2 && o.toString instanceof Function) {
            try {
                return o.toString(path);
            }
            catch (e) {
                return '' + o;
            }
        }
        if (o instanceof Array) {
            var ares = [];
            path.push(o);
            for (var i = 0; i < o.length; i++) {
                ares.push(toStringRec(o[i], path));
            }
            path.pop();
            return '[' + ares.join(',') + ']';
        }
        if (o instanceof Object) {
            var ores = [];
            path.push(o);
            for (var k in o) {
                if (o.hasOwnProperty(k)) {
                    ores.push(k + ':' + toStringRec(o[k], path));
                }
            }
            path.pop();
            return '{' + ores.join(',') + '}';
        }
        return '' + o;
    };
    return toStringRec(obj, opt_path || []);
}
/**
 * use this for equals utility if you are a container, it will stop loops
 * @param {*} a
 * @param {*} b
 * @param {!Array<Object>} aPath
 * @param {!Array<Object>} bPath
 * @param {!Array<string>} debugPath
 * @param {!Object} ignore
 * @return {boolean}
 */
function isContainerEqual(a, b, ignore = new Set(), aPath = new Set, bPath = new Set()) {
    return isEqualRec(a, b, ignore, aPath, bPath);
}
function mapIndexOf(val, aMap) {
    let i = -1;
    for (let [k, mVal] of aMap) {
        i++;
        if (k === val) {
            return i;
        }
    }
    return -1;
}
function setIndexOf(val, aSet) {
    let i = -1;
    for (let v of aSet) {
        i++;
        if (v === val) {
            return i;
        }
    }
    return -1;
}
const COMPARE_MAP = new Map();
function registerCompare(cls, compare, equal = null) {
    COMPARE_MAP.set(cls.prototype, {
        equal: equal || ((x, y, ignore = new Set(), xPath = new Set(), yPath = new Set()) => compare(x, y, ignore, xPath, yPath) === 0),
        compare: compare
    });
}
function compareSet(a, b, ignore, aPath, bPath) {
    if (a.size != b.size) {
        return a.size - b.size;
    }
    let newAPath = new Set([...aPath, a]);
    let newBPath = new Set([...bPath, b]);
    let aList = [...a].sort((x, y) => compare(x, y, ignore, newAPath, newBPath));
    let bList = [...b].sort((x, y) => compare(x, y, ignore, newAPath, newBPath));
    return compare3(aList, bList, (a, b) => compare(a, b, ignore, newAPath, newBPath));
}
registerCompare(Date, (x, y) => x.getTime() - y.getTime(), (x, y) => x.getTime() === y.getTime());
registerCompare(Set, compareSet);
registerCompare(Map, (a, b, ignore, aPath, bPath) => {
    if (a.size != b.size) {
        return a.size - b.size;
    }
    let newAPath = new Set(aPath);
    let newBPath = new Set(bPath);
    newAPath.add(a);
    newBPath.add(b);
    let keySetA = new Set();
    let keySetB = new Set();
    for (const [key, aValue] of a) {
        if (!b.has(key)) {
            keySetA.add(key);
        }
    }
    for (const [key, aValue] of a) {
        if (!a.has(key)) {
            keySetB.add(key);
        }
    }
    if (keySetA.size != 0) {
        return compareSet(keySetA, keySetB, aPath, bPath, ignore);
    }
    for (const [key, aValue] of a) {
        // I think we don't need to do anything special with key because
        // we define the lookup as same value zero equality otherwize we couldn't use a map
        let bValue = b.get(key);
        let res = compare(aValue, bValue, ignore, aPath, bPath);
        if (res !== 0) {
            return res;
        }
    }
    return 0;
});
function isEqualRec(a, b, ignore, aPath, bPath) {
    // check for loops
    const aLoop = aPath.has(a);
    const bLoop = bPath.has(b);
    if (aLoop != bLoop) {
        return false;
    }
    if (aLoop) {
        return setIndexOf(a, aPath) == setIndexOf(b, bPath);
    }
    if (a === b) {
        return true;
    }
    if (a === undefined || b === undefined || a === null || b === null) {
        return false;
    }
    if (a.equals instanceof Function) {
        return a.equals(b, ignore, aPath, bPath);
    }
    if (b.equals instanceof Function) {
        return b.equals(a, ignore, bPath, aPath);
    }
    if (a instanceof Function || b instanceof Function) {
        return false;
    }
    if ((a instanceof Array) != (b instanceof Array)) {
        return false;
    }
    if (typeof (a) == 'number' && typeof (b) == 'number') {
        return (isNaN(a) && isNaN(b)) || a === b;
    }
    let aInfo = COMPARE_MAP.get(a.__proto__);
    let bInfo = COMPARE_MAP.get(b.__proto__);
    if (aInfo || bInfo) {
        // not strictly necessary but the compiler complains
        if (aInfo && bInfo) {
            return aInfo === bInfo && aInfo.equal(a, b, ignore, aPath, bPath);
        }
        return false;
    }
    if (a instanceof Array || b instanceof Array) {
        if (!(a instanceof Array) || !(b instanceof Array) || a.length !== b.length) {
            return false;
        }
        let newAPath = new Set(aPath);
        let newBPath = new Set(bPath);
        newAPath.add(a);
        newBPath.add(b);
        for (let i = 0; i < a.length; i++) {
            if (!isEqualRec(a[i], b[i], ignore, newAPath, newBPath)) {
                return false;
            }
        }
        return true;
    }
    if (a instanceof Object && b instanceof Object) {
        if (b instanceof Object) {
            let newAPath = new Set(aPath);
            let newBPath = new Set(bPath);
            newAPath.add(a);
            newBPath.add(b);
            for (let k in a) {
                if (ignore.has(k)) {
                    continue;
                }
                if (!(k in b) || !isEqualRec(a[k], b[k], ignore, newAPath, newBPath)) {
                    return false;
                }
            }
            for (let k in b) {
                if (ignore.has(k)) {
                    continue;
                }
                if (!(k in a)) {
                    return false;
                }
            }
            return true;
        }
    }
    return false;
}
/**
 * @param {!Object} source
 * @param {...!Object} var_args
 */
function addProps(src, ...args) {
    for (let arg of args) {
        for (let prop in arg) {
            if (arg.hasOwnProperty(prop)) {
                src[prop] = arg[prop];
            }
        }
    }
}
/**
 * @param {Object} obj
 * @return {Object}
 */
function removeUndefined(obj) {
    for (let k in obj) {
        if (obj[k] === undefined) {
            delete obj[k];
        }
    }
    return obj;
}
function getByParts(obj, parts) {
    let cur = obj;
    for (var i = 1; i < arguments.length; i++) {
        if (!(cur instanceof Object)) {
            return undefined;
        }
        cur = cur[arguments[i]];
    }
    return cur;
}
function clone(obj, opt_used = new WeakMap()) {
    return cloneRec_(obj, opt_used);
}
/**
 * @template T
 * @private
 * @param {T} obj the object to clone
 * @param {!WeakMap} used
 * @return {T}
 */
function cloneRec_(obj, used = new WeakMap()) {
    if (obj && typeof obj == 'object') {
        var me = used.get(obj);
        if (me) {
            return me;
        }
        if (obj.clone instanceof Function) {
            return obj.clone(used);
        }
        var clone = obj instanceof Array ? [] : Object.create(Object.getPrototypeOf(obj));
        used.set(obj, clone);
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                clone[key] = cloneRec_(obj[key], used);
            }
        }
        return clone;
    }
    return obj;
}
/**
 * make an object a constant, this means clone and equal only compare pointers
 * @template T
 * @param {!T} obj
 * @return {!T}
 */
function constant(obj) {
    obj.clone = function () {
        return obj;
    };
    obj.equals = function (that) {
        return obj === that;
    };
    return obj;
}

},{"./sequence":31}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * a class to create a incrementing sequence
 * of strings
 */
class Sequence {
    constructor() {
        this.val = 1n;
    }
    next() {
        return this.nextLong() + '';
    }
    /**
     * get the next value and increment the counter
     */
    nextLong() {
        var res = this.val;
        this.val++;
        return res;
    }
    ;
    reset() {
        this.val = 1n;
    }
    /**
     * marks a value as seen will not generate it again
     */
    seen(val) {
        if (typeof val === 'string') {
            val = BigInt(val);
        }
        if (this.val <= val) {
            this.val = val + 1n;
        }
    }
}
exports.default = Sequence;

},{}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Unicode = void 0;
exports.htmlEscape = htmlEscape;
exports.canonicalizeNewlines = canonicalizeNewlines;
var Unicode;
(function (Unicode) {
    Unicode["NBSP"] = "\u00A0";
})(Unicode || (exports.Unicode = Unicode = {}));
const AMP_RE_ = /&/g;
const LT_RE_ = /</g;
const GT_RE_ = />/g;
const QUOT_RE_ = /"/g;
const SINGLE_QUOTE_RE_ = /'/g;
const NULL_RE_ = /\x00/g;
const DETECT_DOUBLE_ESCAPING = false;
const E_RE_ = /e/g;
/**
 * Regular expression that matches any character that needs to be escaped.
 * @const {!RegExp}
 * @private
 */
const ALL_RE_ = (DETECT_DOUBLE_ESCAPING ? /[\x00&<>"'e]/ : /[\x00&<>"']/);
/**
 * Escapes double quote '"' and single quote '\'' characters in addition to
 * '&', '<', and '>' so that a string can be included in an HTML tag attribute
 * value within double or single quotes.
 *
 * It should be noted that > doesn't need to be escaped for the HTML or XML to
 * be valid, but it has been decided to escape it for consistency with other
 * implementations.
 *
 * With DETECT_DOUBLE_ESCAPING, this function escapes also the
 * lowercase letter "e".
 *
 * NOTE(user):
 * HtmlEscape is often called during the generation of large blocks of HTML.
 * Using statics for the regular expressions and strings is an optimization
 * that can more than half the amount of time IE spends in this function for
 * large apps, since strings and regexes both contribute to GC allocations.
 *
 * Testing for the presence of a character before escaping increases the number
 * of function calls, but actually provides a speed increase for the average
 * case -- since the average case often doesn't require the escaping of all 4
 * characters and indexOf() is much cheaper than replace().
 * The worst case does suffer slightly from the additional calls, therefore the
 * opt_isLikelyToContainHtmlChars option has been included for situations
 * where all 4 HTML entities are very likely to be present and need escaping.
 *
 * Some benchmarks (times tended to fluctuate +-0.05ms):
 *                                     FireFox                     IE6
 * (no chars / average (mix of cases) / all 4 chars)
 * no checks                     0.13 / 0.22 / 0.22         0.23 / 0.53 / 0.80
 * indexOf                       0.08 / 0.17 / 0.26         0.22 / 0.54 / 0.84
 * indexOf + re test             0.07 / 0.17 / 0.28         0.19 / 0.50 / 0.85
 *
 * An additional advantage of checking if replace actually needs to be called
 * is a reduction in the number of object allocations, so as the size of the
 * application grows the difference between the various methods would increase.
 *
 * @param {string} str string to be escaped.
 * @param {boolean=} opt_isLikelyToContainHtmlChars Don't perform a check to see
 *     if the character needs replacing - use this option if you expect each of
 *     the characters to appear often. Leave false if you expect few html
 *     characters to occur in your strings, such as if you are escaping HTML.
 * @return {string} An escaped copy of {@code str}.
 */
function htmlEscape(str, opt_isLikelyToContainHtmlChars) {
    if (opt_isLikelyToContainHtmlChars) {
        str = str.replace(AMP_RE_, '&amp;')
            .replace(LT_RE_, '&lt;')
            .replace(GT_RE_, '&gt;')
            .replace(QUOT_RE_, '&quot;')
            .replace(SINGLE_QUOTE_RE_, '&#39;')
            .replace(NULL_RE_, '&#0;');
        if (DETECT_DOUBLE_ESCAPING) {
            str = str.replace(E_RE_, '&#101;');
        }
        return str;
    }
    else {
        // quick test helps in the case when there are no chars to replace, in
        // worst case this makes barely a difference to the time taken
        if (!ALL_RE_.test(str))
            return str;
        // str.indexOf is faster than regex.test in this case
        if (str.indexOf('&') != -1) {
            str = str.replace(AMP_RE_, '&amp;');
        }
        if (str.indexOf('<') != -1) {
            str = str.replace(LT_RE_, '&lt;');
        }
        if (str.indexOf('>') != -1) {
            str = str.replace(GT_RE_, '&gt;');
        }
        if (str.indexOf('"') != -1) {
            str = str.replace(QUOT_RE_, '&quot;');
        }
        if (str.indexOf('\'') != -1) {
            str = str.replace(SINGLE_QUOTE_RE_, '&#39;');
        }
        if (str.indexOf('\x00') != -1) {
            str = str.replace(NULL_RE_, '&#0;');
        }
        if (DETECT_DOUBLE_ESCAPING && str.indexOf('e') != -1) {
            str = str.replace(E_RE_, '&#101;');
        }
        return str;
    }
}
function canonicalizeNewlines(str) {
    return str.replace(/(\r\n|\r|\n)/g, '\n');
}

},{}]},{},[27]);
