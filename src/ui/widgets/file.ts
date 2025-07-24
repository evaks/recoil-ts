// contains a widget that does the rendering

goog.provide('recoil.ui.widgets.FileWidget');

goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.ui.Container');
goog.require('recoil.frp.Behaviour');
goog.require('recoil.frp.struct');
goog.require('recoil.ui.BoolWithExplanation');
goog.require('recoil.ui.ComponentWidgetHelper');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.WidgetHelper');
goog.require('recoil.ui.WidgetScope');
goog.require('recoil.ui.events');

/**
 * @param {?} x
 * @return {boolean}
 */
DataView.prototype.equals = function(x) {
  if (x.byteLength != this.byteLength) {
    return false;
  }
  for (var i = 0; i < x.byteLength; i++) {
    if (x.getInt8(i) != this.getInt8(i)) {
      return false;
    }
  }
  return true;
};

/**
 * @constructor
 * @param {!recoil.ui.WidgetScope} scope
 * @implements recoil.ui.Widget
 */
recoil.ui.widgets.FileWidget = function(scope) {


  this.scope_ = scope;
  var FORMATS = {
    'text': {
      start: function(reader, file) {
        reader.readAsText(file);
      },
      get: function(reader) {
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
  };
  this.container_ = goog.dom.createDom('input', {
    class: '',
    type: 'file'
  });
  this.component_ = recoil.ui.ComponentWidgetHelper.elementToNoFocusControl(this.container_);
  this.helper_ = new recoil.ui.ComponentWidgetHelper(scope, this.component_, this, this.updateState_);
  this.valueHelper_ = new recoil.ui.ComponentWidgetHelper(scope, this.component_, this, this.updateFile_);
  var me = this;
  var frp = scope.getFrp();
  var fileInput = this.container_;
  fileInput.addEventListener('change', function(e) {
    var file = fileInput.files[0];
    var textType = /text.*/;
    var raw = false;
    frp.accessTrans(function() {
      if (me.rawB_.get()) {
        raw = true;
        me.valueB_.set(file);
      }
    }, me.rawB_, me.valueB_);
    if (raw) {
      return;
    }

    var reader = new FileReader();

    var format;
    reader.onload = function(e) {
      if (me.valueB_) {
        frp.accessTrans(function() {
          me.valueB_.set(format.get(reader));
        }, me.valueB_);
      }
    };

    frp.accessTrans(function() {
      format = FORMATS[me.formatB_.get()];

      if (format) {
        try {
          format.start(reader, file);
        } catch (e) {
          me.valueB_.metaSet(recoil.frp.BStatus.notReady());
          console.log('caught');
        }
      }
    }, me.valueB_, me.formatB_);
  });
};

/**
 *
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.FileWidget.prototype.getComponent = function() {
  return this.component_;
};

/**
 * the behaviours that this widget can take
 *
 * action - the callback that gets executed when
 * text - the text to display on the button
 * enabled if the button is enambed
 */
recoil.ui.widgets.FileWidget.options = recoil.frp.Util.Options(
  'value', {
    raw: false, // don't load the file into memory, just make value the reference
    suffix: null,
    format: 'text' // if raw is false ensures return is Text
  }
);


/**
 * @param {!Object| !recoil.frp.Behaviour<Object>} value
 */
recoil.ui.widgets.FileWidget.prototype.attachStruct = function(value) {
  var frp = this.helper_.getFrp();
  var bound = recoil.ui.widgets.FileWidget.options.bindKeepMeta(frp, value);

  var BoolWithExplanation = recoil.ui.BoolWithExplanation;

  this.suffixB_ = bound.suffix();
  this.valueB_ = bound.value();
  this.rawB_ = bound.raw();
  this.formatB_ = bound.format();
  this.valueHelper_.attach(this.valueB_);
  this.helper_.attach(this.suffixB_, this.rawB_, this.formatB_);
};

/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.FileWidget.prototype.updateState_ = function(helper) {
  if (helper.isGood()) {
    this.container_.accept = this.suffixB_.get();
  }
};

/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.FileWidget.prototype.updateFile_ = function(helper) {
  if (!helper.isGood()) {
    this.container_.value = '';
  }
};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.FileWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;
