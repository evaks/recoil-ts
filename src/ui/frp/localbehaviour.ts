import {Behaviour, Frp} from "../../frp/frp";
import {Serializer, Cache} from "./cache";
import {Util} from "../../frp/util";


export class LocalBehaviour {
    static items_  :{[index:string]:any} = {};
    private static readonly def_ = new Object;

    static create<T>(frp:Frp, version:string, key:string, defValB:T|Object, storage:Storage,  opt_serializer?:Serializer): Behaviour<T> {
        let k = 'recoil-ts.ui.frp.store' + version + ':' + key;
        let res = LocalBehaviour.items_[k];
        let util = new Util(frp);
        let defaultB = util.toBehaviour(defValB);

        let serializer = opt_serializer || new Cache.DefaultSerializer();
        if (res) {
            return res;
        }
        let storeB = frp.createB<string|null>(null);
        res = frp.liftBI(
            (store:T, defVal:T):T => {
            if (storage.hasOwnProperty(k)) {
                try {
                    return serializer.deserialize(storage[k]);
                } catch (e) {
                    return defVal;
                }
            }
            return defVal;
        }, function(val:T) {
            let sval = serializer.serialize(val);
            storage.setItem(k, sval);
            storeB.set(sval);
        }, storeB, defaultB);
    LocalBehaviour.items_[k] = res;
    return res;
}
    /**
     * creates a local session storage, this will use both session
     * local, session will override the local storage, but will write to both
     * this write to both, this is useful if you want to new tabs have information
     * of the old tab when opened but maintain its new copy
     *
     * @param frp the frp engine
     * @param version use this old values are lost if you upgrade
     * @param key the key to store this var under
     * @param {?} defVal
     * @param opt_serializer
     * @return
     */
    static createSessionLocal<T>(frp:Frp, version:string, key:string, defVal:T, opt_serializer:Serializer): Behaviour<T> {
        let def = LocalBehaviour.def_;
        let sessionB = LocalBehaviour.create<T>(frp, version, 'session.' + key, def, sessionStorage, opt_serializer);
        let localB = LocalBehaviour.create<T>(frp, version, 'local.' + key, def, localStorage, opt_serializer);


        return frp.liftBI(function(l, s):T {
            let val = s === def ? l : s;
            return val === def ? defVal : val;
        }, (v) => {
            localB.set(v);
            sessionB.set(v);
        }, localB, sessionB);
    }


    /**
     * creates a local storage, this is persisted even when browser is closed
     *
     * @param frp
     * @param version use this old values are lost if you upgrade
     * @param key the key to store this var under
     * @param defVal default value to set it to if not already present
     * @param opt_serializer how to convert the value so it can be stored/retrieved
     * @return
     */

    static createLocal <T>(frp:Frp, version:string, key:string, defVal:T, opt_serializer: Serializer) {
        return LocalBehaviour.create(frp, version, key, defVal, localStorage, opt_serializer);
    }

    /**
     * creates a session storage
     * @param frp
     * @param version use this old values are lost if you upgrade
     * @param key the key to store this var under
     * @param defVal default value to set it to if not already present
     * @param opt_serializer how to convert the value so it can be stored/retrieved
     * @return
     */
    createSession<T> (frp:Frp, version: string, key:string, defVal:T, opt_serializer?: Serializer): Behaviour<T> {
        return LocalBehaviour.create(frp, version, key, defVal, sessionStorage, opt_serializer);
    }



    /**
     * creates a local session storage, this will use both session
     * local, session will override the local storage, but will write to both
     * this writes to both, this is useful if you want to new tabs have information
     * of the old tab when opened but maintain its new copy
     *
     * @param frp
     * @param version use this old values are lost if you upgrade
     * @param key the key to store this var under
     * @param defVal
     * @return
     */
    static createSessionLocalBool(frp:Frp, version:string, key:string, defVal:boolean) {
        return LocalBehaviour.createSessionLocal(frp, version, key, defVal, new BoolSerializer());
    }
    /**
     * clears all local storage
     */

    static clear() {
        console.log('clearing storage');
        localStorage.clear();
        sessionStorage.clear();

    }
}

/**
 * @constructor
 */
class BoolSerializer implements Serializer {
    serialize = function(val:any) {
        return val ? 'true' : 'false';
    }
    deserialize(val:string) {
        return val === 'true';
    }
}


