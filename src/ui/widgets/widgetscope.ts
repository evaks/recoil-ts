import {Frp} from "../../frp/frp";

import {DomObserver} from "../domobserver";

export class WidgetScope {
    private frp: Frp;
    private observer: DomObserver;

    constructor(frp: Frp, observer: DomObserver = DomObserver.instance) {
        this.frp = frp;
        this.observer = observer;
        this.observer.setTransactionFunc(function (callback) {
            frp.tm().doTrans(callback);
        });

    }

    getFrp():Frp {
        return this.frp;
    }

    getObserver(): DomObserver {
        return this.observer;
    }

}
