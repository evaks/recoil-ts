import * as timers from "node:timers";

class MappingIterator<From, To> implements MapIterator<To> {
    private mapFn: (val: From) => To;
    private itr: MapIterator<From>;

    constructor(mapFn: (val: From) => To, itr:MapIterator<From>) {
        this.mapFn = mapFn;
        this.itr = itr;

    }
    private makeResult(result:IteratorResult<From, any> ): IteratorResult<To, any> {
        if (result.hasOwnProperty('value')) {
            return {
                done: result.done,
                value: result.done && result.value === undefined ?  undefined : this.mapFn(result.value)
            }  as IteratorResult<To, any>

        }
        return {done: result.done} as IteratorResult<To, any>;

    }
    next(...[value]: [] | [any]): IteratorResult<To, any> {
        return this.makeResult(this.itr.next(...[value]));

    }

    [Symbol.dispose]() {
        this.itr[Symbol.dispose]();
    }

    [Symbol.iterator](): MapIterator<To>;
    [Symbol.iterator](): IteratorObject<To, BuiltinIteratorReturn, unknown>;
    [Symbol.iterator](): any {
        return this;
    }
}

export class SerializedSet<K> implements Set<K> {
    private map : Map<string,K> = new Map<string,K>();
    private serializer: (k: K) => any;

    private static getKeyKey<K>(entry:K): [K,K] {
        return [entry,entry];
    }

    constructor(serializer:(k: K) => any) {
        this.serializer = serializer;
    }


    get [Symbol.toStringTag](): string {
        return this.map[Symbol.toStringTag];
    }
    get size(): number {
        return this.map.size;
    };

    [Symbol.iterator](): SetIterator<K> {
        return this.map.values()[Symbol.iterator]();
    }

    add(value: K): this {
        this.map.set(this.serializer(value), value);
        return this;
    }

    clear(): void {
        this.map.clear();
    }

    delete(value: K): boolean {
        return this.map.delete(this.serializer(value));
    }

    entries(): SetIterator<[K, K]> {
        return new MappingIterator<K, [K,K]>(SerializedSet.getKeyKey, this.map.values());
    }

    forEach(callbackfn: (value: K, value2: K, set: Set<K>) => void, thisArg?: any): void {
        if (thisArg !== undefined) {
            callbackfn = callbackfn.bind(thisArg);
        }
        this.map.forEach((value, key) => {
            callbackfn(value, value, this);
        }, thisArg);
    }

    has(value: K): boolean {
        return this.map.has(this.serializer(value));
    }

    keys(): SetIterator<K> {
        return this.map.values();
    }

    values(): SetIterator<K> {
        return this.map.values();
    }


}


export class SerializedMap<K, V> implements Map<K, V> {
    private map: Map<string, {key: K, value: V}> = new Map();
    private serilizer: (k: K) => string;

    private static getKey<K,V>(entry: {key: K, value: V}):K {
        return entry.key;
    }
    private static getValue<K,V>(entry: {key: K, value: V}):V {
        return entry.value;
    }
    private static getKeyValue<K,V>(entry: {key: K, value: V}):[K,V] {
        return [entry.key, entry.value];
    }
    constructor(serilizer: (k:K) => string) {
        this.serilizer = serilizer;
    }

    get [Symbol.toStringTag](): string {
        return this.map[Symbol.toStringTag] ;
    }
    get size(): number {
        return this.map.size;
    };



    clear(): void {
        this.map.clear()
    }
    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
        if (thisArg !== undefined) {
            callbackfn = callbackfn.bind(thisArg);
        }
        this.map.forEach((value, key, map) => {
            callbackfn(value.value, value.key, this)
        });
    }

    keys(): MapIterator<K> {
        return new MappingIterator<{key:K, value:V}, K>(SerializedMap.getKey, this.map.values())
    }
    values(): MapIterator<V> {
        return new MappingIterator<{key:K, value:V}, V>(SerializedMap.getValue, this.map.values())

    }


    get(key: K): V|undefined {
        return this.map.get(this.serilizer(key))?.value;
    }
    set(key: K, value: V) : this {
        this.map.set(this.serilizer(key), {key: key, value:value});
        return this;
    }
    has(key: K): boolean {
        return this.map.has(this.serilizer(key));
    }
    delete(key: K): boolean {
        return this.map.delete(this.serilizer(key));
    }
    entries(): MapIterator<[K, V]> {
        return new MappingIterator<{key:K, value:V}, [K,V]>(SerializedMap.getKeyValue, this.map.values())
    }

    [Symbol.iterator](): MapIterator<[K, V]> {
        return new MappingIterator<{key:K, value:V}, [K,V]>(SerializedMap.getKeyValue, this.map.values())
    }

}