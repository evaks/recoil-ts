import * as dom from "./dom/dom";
import {DomObserver} from "./domobserver";
import {expect} from "@jest/globals";


const observer = DomObserver.instance;


function makeListenerWaiter(observer: DomObserver, element: Element|Text, listener: (exits: boolean) => void): {wait: () => Promise<boolean>} {
    let resolvers: ((res: boolean) => void)[] = [];

    observer.listen(element, async (exists: boolean) => {
        listener(exists);
        let l = resolvers.pop();
        while (l) {
            l(exists);
            l = resolvers.pop();
        }
    });

    return {
        wait: () => new Promise((resolve:(value:boolean) => void) => resolvers.push(resolve)),
    };
}

test("TestDomListen", async () => {
    let body = document.body;
    let div1 = document.createElement('div');
    div1.id = 'div_1';
    let div2 = document.createElement('div');
    div2.id = 'div2_start';

    let element: Element|Text = document.createTextNode('xxx-');
    (element as any).id = 'element.xxx';
    let e2 = document.createElement('div');
    e2.appendChild(document.createTextNode('Fire Helper'));
    e2.id = 'e2';

    div1.appendChild(div2);
    div2.appendChild(element);
    body.appendChild(div1);
    body.appendChild(e2);

    let visible = false;
    let w1 = makeListenerWaiter(observer, element, (exists:boolean) => { visible = exists});

    expect(visible).toBe(true);


    dom.removeNode(div1);
    await Promise.all([w1.wait()])

    expect(visible).toBe(false);
    body.appendChild(div1);

    await w1.wait();
    expect(visible).toBe(true);
    div2 = document.createElement('div');
    div2.id = 'id_div2';
    body.appendChild(div2);
    body.removeChild(div1);
    div2.appendChild(div1);

    element = document.createElement('div');
    let visible_move;
    let w3 = makeListenerWaiter(observer, element, (exists:boolean) => {
        visible_move = exists;

    });

    body.appendChild(element);
    expect(visible_move).toBe(false);

    await w3.wait();

    expect(visible).toBe(true);
    expect(visible_move).toBe(true);

});
