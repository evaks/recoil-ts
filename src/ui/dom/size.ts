export class Size {
    width:number;
    height:number;

    constructor(width:number, height:number) {
        this.width = width;
        this.height = height;

    }

    clone() {
        return new Size(this.width, this.height);
    }

    static equals(a:Size|null, b:Size|null) {
        if (a == b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.width == b.width && a.height == b.height;
    }
}