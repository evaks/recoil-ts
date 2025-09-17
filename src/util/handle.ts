export class Handle<Type> {
    private value_: Type | undefined;

    constructor(opt_value?: Type) {
        this.value_ = opt_value;
    }

    set(value: Type) {
        this.value_ = value;
    }

    /**
     * @return {T}
     */
    get(): Type|undefined {
        return this.value_ as Type;
    }
}


