export class NotInDom extends Error {
    node: Node;
    constructor(node: Node) {
        super("NotInDom");
        this.node = node;
    }
}

export class LoopDetected extends Error {
    constructor() {
        super("Loop Detected");
    }
}

export class NotAttached extends Error {
    constructor() {
        super("Not Attached");
    }
}

export class NoAccessors extends Error {
    constructor() {
        super("No Accessors");
    }
}

export class NotInTransaction extends Error {
    constructor() {
        super("Not In Transaction");
    }
}

export class InvalidState extends Error {
    constructor() {
        super("Invalid State");
    }
}

