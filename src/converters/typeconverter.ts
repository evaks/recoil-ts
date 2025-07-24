import {Message} from "../ui/message";

export type UnconvertType<T> = {value: T, error?: never}| {value?: never, error: Message};
export interface TypeConverter<FROM,TO>{
    convert(val: FROM):TO;
    unconvert(val: TO):UnconvertType<FROM>;
}
