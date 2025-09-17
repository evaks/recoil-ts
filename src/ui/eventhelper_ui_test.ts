import {EventHelper} from "./eventhelper";
import {Frp} from "../frp/frp";
import {createDom} from "./dom/dom";
import {WidgetScope} from "./widgets/widgetscope";
import {EventType} from "./dom/eventtype.ts";

test("listen", () => {
    let frp = new Frp();
    let element = createDom("div") as HTMLDivElement;
    document.body.append(element);
    let scope = new WidgetScope(frp);
    let event1B = frp.createB<any,MouseEvent>(null)
    let event2B = frp.createB<any,MouseEvent>(null)

    let testee = new EventHelper(scope, element, EventType.CLICK);
    testee.listen(event1B);
    element.click();

    expect(frp.accessTrans(() => event1B.get(), event1B)).not.toBeNull();
    frp.accessTrans(() => event1B.set(null as any), event1B);
    testee.listen(event2B);

    element.click();
    expect(frp.accessTrans(() => event1B.get(), event1B)).toBeNull();
    expect(frp.accessTrans(() => event2B.get(), event2B)).not.toBeNull();

    frp.accessTrans(() => event2B.set(null as any), event2B);
    testee.unlisten();
    element.click();
    expect(frp.accessTrans(() => event1B.get(), event1B)).toBeNull();
    expect(frp.accessTrans(() => event2B.get(), event2B)).toBeNull();
});