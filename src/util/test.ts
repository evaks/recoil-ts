export function makeListenerWaiter<T extends Function>(listener:T): {listener:T, wait: () => Promise<void>} {
    let resolvers: (() => void)[] = [];

    let wrappedListener = function(this:any,...args:any[]){
        let res = listener.apply(this, args);
        let l = resolvers.pop();
        while (l) {
            l()
            l = resolvers.pop();

        }
    } as unknown as T;
    return {
        listener: wrappedListener,
        wait: () => new Promise((resolve:() => void) => resolvers.push(resolve)),
    };
}