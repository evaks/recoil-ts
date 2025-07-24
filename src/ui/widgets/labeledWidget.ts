import {Widget} from "./widget";

/**
 * @extends recoil.ui.Widget
 * @interface
 */
export  interface LabeledWidget  {
    getLabel(): Widget;
}

