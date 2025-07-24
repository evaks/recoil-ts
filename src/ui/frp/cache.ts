import {Behaviour, BStatus} from "../../frp/frp";

/**
 * this uses local or session storage to cache values behaviours
 * locally
 *
 * @constructor
 * @param  version use this old values are lost if you upgrade
 * @param opt_local if true uses local storage else session storage
 */
export class Cache {
    private serializer: Serializer;
    private storage: Storage;
    private version:string;
    constructor(version:string, opt_serializer:Serializer = new Cache.DefaultSerializer(), opt_local?:boolean) {
        this.version = version;
        this.serializer = opt_serializer;
        this.storage = opt_local ? localStorage : sessionStorage;

    }
    /**
     * note this will clear all local / session storage according to the
     * type of this cache
     *
     */
    clear() {
        this.storage.clear();
    }

    /**
     * @template T
     * @param {string} key
     * @param {!recoil.frp.Behaviour<T>} sourceB
     * @param {T=} opt_def
     * @return {!recoil.frp.Behaviour<T>}
     */
    get<T>(key:string, sourceB:Behaviour<T>, opt_def?:T) {
        let frp = sourceB.frp();
        return frp.metaLiftBI<T,T,T,T>(
            (v) => {
                var k = this.version + ':' + key;
                if (v.ready()) {
                    if (v.good()) {
                        this.storage.setItem(k, this.serializer.serialize(v.get()));
                    }
                    return v;
                }
                if (this.storage.hasOwnProperty(k)) {
                    return new BStatus(this.serializer.deserialize(this.storage[k]));
                }
                if (opt_def !== undefined) {
                    return new BStatus(opt_def);
                }
                return BStatus.notReady();
            },
            function(v:BStatus<T>) {
                if (sourceB.good() || opt_def !== undefined) {
                    sourceB.set(v.get());
                }
            }, sourceB);
    }


    static DefaultSerializer = class DefaultSerializer implements Serializer {
        serialize(val: any): string {
           return JSON.stringify(val);
        }
        deserialize(val: string) {
           return JSON.stringify(val);
        }
    }

    static BigIntSerializer = class BigIntSerializer implements Serializer {
        serialize(val: any): string {
            if (typeof val === "bigint") {
                return JSON.stringify(val +'');
            }
            return JSON.stringify(val);
        }
        deserialize(valIn: string) {
            let val = JSON.parse(valIn);
            if (typeof(val) == 'string') {
                try {
                    return BigInt(val);
                }
                catch (e) {
                }
            }
            return val;

        }


    }

}

export interface Serializer {
    serialize(val: any): string;
    deserialize(val: string): any;
}

