import './style.css'
import './resources/css/all.css'
import './resources/css/checkbox.css'
import './resources/css/number.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.ts'
import {Tooltip} from "./ui/tooltip.ts";
import {MenuActionWidget, MenuBarWidget, MenuButtonWidget} from "./ui/widgets/menu.ts";
import {WidgetScope} from "./ui/widgets/widgetscope.ts";
import {Frp} from "./frp/frp.ts";
import {BoolWithExplanation} from "./ui/booleanwithexplain.ts";
import {NumberWidget} from "./ui/widgets/number.ts";
import {Checkbox} from "./ui/widgets/checkbox.ts";
import {createDom} from "./ui/dom/dom.ts";
import {Message} from "./ui/message.ts";
import {ButtonWidget} from "./ui/widgets/button.ts";
import {DateWidget} from "./ui/widgets/date.ts";
import {Label} from "./ui/widgets/label.ts";
import {TagName} from "./ui/dom/tags.ts";
import {DateTimeWidget} from "./ui/widgets/datetime.ts";


document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <div id="menuBar"></div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
    <p id="tooltip">
        this is some text that a tootip should apper on
    </p>
    <div id="totest"></div>
  </div>
`
let frp = new Frp();
let scope = new WidgetScope(frp);
let menuBar = new MenuBarWidget(scope);
let fileMenu = new MenuButtonWidget<string>(scope);
let openMenu = new MenuActionWidget(scope);
let closeMenu = new MenuActionWidget(scope);

(document.querySelector<HTMLDivElement>('#menuBar') as HTMLDivElement).appendChild(menuBar.getElement());

let toTest = document.querySelector<HTMLDivElement>('#totest')!;

let valB = frp.createB(2);

let numberWidget = new NumberWidget(scope);
let numberWidget2 = new NumberWidget(scope);
let checkWidget1 = new Checkbox(scope);
let checkWidget2 = new Checkbox(scope);
let checkEnabled = new Checkbox(scope);
let checkEditable = new Checkbox(scope);
let makeNull = new ButtonWidget(scope);
let dateWidget = new DateWidget(scope);
let dateTimeWidget = new DateTimeWidget(scope);
let dateLabelWidget = new Label<number|null>(scope);
let dateTimeLabelWidget = new Label<number|null>(scope);



numberWidget2.attachStruct({value:valB, min:10, max:100, step: 0.1});
toTest.appendChild(createDom("div", {}, makeNull.getElement()));
toTest.appendChild(createDom("div", {},createDom("span", {}, "Enabled", checkEnabled.getElement())));
toTest.appendChild(createDom("div", {},createDom("span", {}, "Editable", checkEditable.getElement())));

toTest.appendChild(createDom("div", {},createDom("span", {}, "Check", checkWidget1.getElement())));
toTest.appendChild(createDom("div", {},createDom("span", {}, "Check Dup", checkWidget2.getElement())));
toTest.appendChild(numberWidget.getElement());
toTest.appendChild(numberWidget2.getElement());
toTest.appendChild(dateWidget.getElement());
toTest.appendChild(dateLabelWidget.getElement());
toTest.appendChild(dateTimeWidget.getElement());
toTest.appendChild(dateTimeLabelWidget.getElement());

let doOpenB = frp.createCallback((e:Event) => {
    console.log("open", e);
});
let doCloseB = frp.createCallback((e:Event) => {
    console.log("close", e);
});
let dateB = frp.createB(DateWidget.fromDate(new Date(2025,1,1)))
let dateTimeB = frp.createB(new Date(2025,1,1).getTime())


let enabledInB = frp.createB(true);
let editableB = frp.createB(true);
let checkValB = frp.createB<boolean|null>(true);
let enabledB = frp.liftB((v:boolean) => {
    return new BoolWithExplanation(v, Message.toMessage(v? "should be enabled." : " should be disabled."));
}, enabledInB);

menuBar.attachStruct({menus: [fileMenu]});
fileMenu.attachStruct({name:"File", items: [openMenu, closeMenu], tooltip: "bob", enabled: enabledB});
openMenu.attachStruct({name:"Open", action: doOpenB});
closeMenu.attachStruct({name:"Close", action: doCloseB});
checkWidget1.attachStruct({value:checkValB, enabled: enabledB, editable: editableB});
checkWidget2.attachStruct({value:checkValB});
checkEditable.attachStruct({value:editableB});
checkEnabled.attachStruct({value:enabledInB});
makeNull.attachStruct({
    text: Message.toMessage("Make null"),
    value: frp.createCallback((e:Event) => {checkValB.set(null)},checkValB),
});
numberWidget.attachStruct({value:valB, enabled: enabledB, editable: editableB});
dateLabelWidget.attachStruct({
    value: dateB, formatter: (v:number|null):string => {
        return v === null ? 'null' : DateWidget.convertLocalDate(v)?.toString()
    },
    enabled: enabledB,
    tooltip: createDom(TagName.SPAN, {}, createDom("i", {class:'fa-regular fa-eye'}), "some text")
});
dateTimeLabelWidget.attachStruct({
    value: dateTimeB, formatter: (v:number|null):string => {
        return v === null ? 'null' : new Date(v).toString()
    },
});
dateWidget.attachStruct({value: dateB, editable:editableB, enabled: enabledB});
dateTimeWidget.attachStruct({value: dateTimeB, editable:editableB, enabled: enabledB});
let tooltip = new Tooltip(undefined, "some tooltip");
let totip = document.querySelector<HTMLParagraphElement>('#tooltip') as HTMLParagraphElement;
tooltip.attach(totip);





setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)
