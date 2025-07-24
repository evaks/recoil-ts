export class CssHelper {
    private readonly prefix_: string;
    constructor(prefix:string ='') {
        this.prefix_ = prefix;
    }

    className(name:string): string {
       return this.prefix_  + name;
    }

}