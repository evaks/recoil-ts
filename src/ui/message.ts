
type FormatFunc = (v:any)=> string;
type DataType = {[index:string]: any};
type MessageEncoding = string|[string]|DataType;
type RichTextFormatter = {join:(parts:any[]) => any,format: (v:string, x:any) => any}

/**
 * @constructor
 * @param {?string} format indicator of what the format should be if using format e.g. bold
 * @param {?string} name name of the parameter to be resolved
 * @param {string|recoil.ui.message.Message} message text or sub message to be displayed
 * @param {?function(?):string} formatter function to format the value to be displayed
 */
export class Part {

    private readonly name:string|null;
    private readonly message:Message|string|null;
    private readonly format:string|null;
    private readonly formatter:FormatFunc|null;

    constructor(format:string|null, name:string|null, message:string|Message|null, formatter: FormatFunc|null) {
        this.format = format;
        this.name = name;
        this.message = message;
        this.formatter = formatter;
    }

    isResolved():boolean {
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
    toRichText(formatter:RichTextFormatter):any {
        if (this.message instanceof Message) {
            return this.message.toRichText(formatter);
        }
        return formatter.format(this.format || '', this.toString());
    };

    toString() {
        return this[Symbol.toStringTag]();
    }
    [Symbol.toStringTag]():string {
        let val : Message | string | null = this.message;
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
    };


    resolve (data:DataType) : Part{
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
    };

}






export class Message{
    private readonly parts: Part[];

    constructor(...parts: (MessageEncoding|Part)[]) {
        let myParts: Part[] = [];
        for (let  i = 0; i < parts.length; i++) {
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
    isEmpty():boolean {
        for (let p of this.parts) {
            if (p.toString().trim().length > 0) {
                return false
            }
        }
        return true
    }

    /**
     * partially resolve a message some parameters may still be present, this will handle, messages inside messages
     *
     */
    resolve(data : {[index:string]: any} = {}) :Message {
        return new Message(...this.parts.map(v => v.resolve(data)));
    }

    static toMessage(message:Message|string) : Message {
        if (message instanceof Message) {
            return message;
        }

        return new Message(message);
    };

    static toString(message:Message|string|null|undefined) : string|null {
        if (message == null) {
            return null;
        }
        if (message instanceof Message) {
            return message.toString();
        }

        return message.trim().length === 0 ? null : message;

    }

    clone():Message{
        return this;
    };


    /**
     * like toString but with a : on the end (at least for english
     */

    toField(data?:{[index:string]:any}|undefined):string {
        return Message.FIELD.toString({'txt' : this.toString(data)});
    };

    /**
     * turn this message into a string if parameters are not assigned
     *       they will be enclosed in {$}
     */

    toString(data?: {[index:string]: any} | undefined):string {
        if (data) {
            return this.resolve(data).toString();
        }
        let res:string[] = [];
        for (let part of this.parts) {
            res.push(part.toString());
        }
        return res.join('');
    };

    /**
     * turn this message into some kind of data structure with formatting
     */

    toRichText(formatter:RichTextFormatter, data?:{[index:string]: any} | undefined):string {
        if (data) {
            return this.resolve(data).toRichText(formatter);
        }
        let res : string[]= [];
        for (let part of this.parts) {
            res.push(part.toRichText(formatter));
        }
        return formatter.join(res);
    };

    isResolved ():boolean {
        for (let part of this.parts) {
            if (!part.isResolved()) {
                return false;
            }
        }
        return true;
    };
    /**
     * returns a structure that can be used to messages with substitution
     * this allows parts that have formatting the object of type {value: ?, format: ?}
     */
    static getRichMsg(...args:(MessageEncoding|{format:string, name:string, value:any, formatter:any})[]) {
        let parts = [];
        for (let part of args) {
            if (part && part.hasOwnProperty('format')) {
                let p = part as {format:string, name:string, value:any, formatter:any}
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
    static getParamMsg(...parts:MessageEncoding[]) {
        return new Message(...parts);
    };

    static FIELD = Message.getParamMsg(['txt'], ':');



}


export interface MessageEnum<T> {
    resolve(v:T) :Message;
}


export class BasicMessageEnum<T> implements MessageEnum<T> {
    private map: Map<T,Message>;
    private unknown: {key:string,msg:Message};

    constructor(map:Map<T,Message>, unknown  :{key:string,msg:Message}) {
        this.map = map;
        this.unknown = unknown ;
    }
    resolve(val: T): Message {
        let mesg = this.map.get(val);
        if (mesg) {
            return mesg.resolve();
        }
        return this.unknown.msg.resolve({
            [this.unknown.key]:val
        });

    }
}
