import {StructType} from "../../frp/struct";
import {Behaviour} from "../../frp/frp";

interface AttachableWidget<T extends StructType> {
    getElement() : HTMLElement;
    attachStruct(value: Behaviour<T>| T) : void;
}

