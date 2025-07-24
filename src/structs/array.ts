export function remove<T>(arr:T[], value:T) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === value) {
            arr.splice(i, 1);
        }
    }
}

export function findIndex<T>(
    arr: T[]| string,
    f : ((e:T, index: number, arr: any[]) => boolean)|((e:T, index: number, arr: string) => boolean),
    opt_obj:any = undefined) {
    let l = arr.length;  // must be fixed during loop... see docs
    let arr2 = typeof arr === 'string' ? arr.split('') : arr;
    for (var i = 0; i < l; i++) {
        if (i in arr2 && (f as any).call(opt_obj, arr2[i] as T, i, arr)) {
            return i;
        }
    }
    return -1;
}

export function removeAt<T>(arr:T[], i:number):boolean {
    return arr.slice(i, 1).length == 1;
}

export function removeIf<T>(arr: T[], f: (el: T, idx: number, arr:T[]) => boolean, opt_obj : any = undefined) {
    let i = findIndex(arr, f, opt_obj);
    if (i >= 0) {
        removeAt(arr, i);
        return true;
    }
    return false;
}