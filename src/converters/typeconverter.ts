import {Message} from "../ui/message";

export type UnconvertType<T> = {value: T, error?: never, supported?:never, settable?:never}
    | {value?: never, error: Message, supported?:never, settable?:never}
    | {value?: never, error?: never, supported:false, settable?:never}
    | {value:T, error:Message, settable: true, supported?:never}
export type SupportedUnconvertType<T> = {value: T, error?: never,  supported?:never, settable?:never}| {value?: never, error: Message,  supported?:never, settable?:never};

export interface TypeConverter<FROM,TO>{
    convert(val: FROM):TO;
    unconvert(val: TO):UnconvertType<FROM>;
}
