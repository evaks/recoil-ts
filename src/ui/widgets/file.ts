/**
 * @param {?} x
 * @return {boolean}
 */
import { createDom } from "../dom/dom.ts";
import {Widget} from "./widget.ts";
import {WidgetScope} from "./widgetscope.ts";
import {WidgetHelper} from "../widgethelper.ts";
import {BStatus} from "../../frp/frp.ts";
import {registerCompare} from "../../util/object.ts";
import {Options} from "../frp/util.ts";
import {AttachType} from "../../frp/struct.ts";

registerCompare(DataView, (x:DataView,y: DataView)=> {
  if (x.byteLength != y.byteLength) {
    return x.byteLength - y.byteLength;
  }
  for (let i = 0; i < x.byteLength; i++) {
    if (x.getInt8(i) != y.getInt8(i)) {
      return x.getInt8(i) - y.getInt8(i);
    }
  }
  return 0;
});

export class FileWidget extends Widget<HTMLInputElement> {
  private readonly helper_: WidgetHelper;
  private readonly valueHelper_: WidgetHelper;

  constructor(scope:WidgetScope) {
    super(scope, createDom('input', {
      class: '',
      type: 'file'
    }));


    this.helper_ = new WidgetHelper(scope, this.getElement(), this, this.updateState_);
    this.valueHelper_ = new WidgetHelper(scope, this.getElement(), this, this.updateFile_);
    let frp = scope.getFrp();
    let fileInput = this.container_;
    fileInput.addEventListener('change', (e:Event)=> {
      let file = fileInput.files[0];
      let textType = /text.*/;
      let raw = false;
      frp.accessTrans(function() {
        if (this.rawB_.get()) {
          raw = true;
          this.valueB_.set(file);
        }
      }, this.rawB_, this.valueB_);
      if (raw) {
        return;
      }

      let reader = new FileReader();

      let format;
      reader.onload = function(e) {
        if (this.valueB_) {
          frp.accessTrans(function() {
            this.valueB_.set(format.get(reader));
          }, this.valueB_);
        }
      };

      frp.accessTrans(()=> {
        format = FileWidget.FORMATS[this.formatB_.get()];

        if (format) {
          try {
            format.start(reader, file);
          } catch (e) {
            this.valueB_.metaSet(BStatus.notReady());
            console.log('caught');
          }
        }
      }, this.valueB_, this.formatB_);
    });
  }

  static readonly FORMATS:Record<string, {start: (reader:FileReader, file: Blob) => void, get: (reader:FileReader) => any}> = {
    'text': {
      start: (reader:FileReader, file:Blob)=> {
        reader.readAsText(file);
      },
      get: (reader) => {
        return reader.result;
      }
    },
    'view': {
      start: function(reader, file) {
        reader.readAsArrayBuffer(file);
      },
      get: function(reader) {
        return new DataView(reader.result);
      }
    }
  }

  /**
   * the behaviours that this widget can take
   *
   * value - the callback that gets executed when
   * text - the text to display on the button
   * enabled if the button is enambed
   */
  static options = Options(
      'value', {
        raw: false, // don't load the file into memory, just make value the reference
        suffix: null,
        format: 'text' // if raw is false ensures return is Text
      }
  );


  attachStruct(value:AttachType<any>) {
    let frp = this.helper_.getFrp();
    let bound = FileWidget.options.bindKeepMeta(frp, value);

    this.suffixB_ = bound.suffix();
    this.valueB_ = bound.value();
    this.rawB_ = bound.raw();
    this.formatB_ = bound.format();
    this.valueHelper_.attach(this.valueB_);
    this.helper_.attach(this.suffixB_, this.rawB_, this.formatB_);
  }

  private updateState_(helper:WidgetHelper) {
    if (helper.isGood()) {
      this.getElement().accept = this.suffixB_.get();
    }
  }

  private updateFile_(helper:WidgetHelper) {
    if (!helper.isGood()) {
      this.container_.value = '';
    }
  }
}





