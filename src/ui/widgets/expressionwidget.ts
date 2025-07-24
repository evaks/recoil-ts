goog.provide('recoil.ui.columns.Expr');
goog.provide('recoil.ui.widgets.ExprWidget');

goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.events');
goog.require('goog.events.InputHandler');
goog.require('goog.events.KeyCodes');
goog.require('goog.ui.Component');
goog.require('recoil.converters.DefaultStringConverter');
goog.require('recoil.frp.Chooser');
goog.require('recoil.frp.Util');
goog.require('recoil.frp.struct');
goog.require('recoil.ui.BoolWithExplanation');
goog.require('recoil.ui.ComponentWidgetHelper');
goog.require('recoil.ui.TooltipHelper');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.util');
goog.require('recoil.ui.widgets.InputWidget');
goog.require('recoil.ui.widgets.LabelWidget');
goog.require('recoil.util.ExpParser');


/**
 *
 * @param {!recoil.ui.WidgetScope} scope
 * @constructor
 * @implements {recoil.ui.Widget}
 */
recoil.ui.widgets.ExprWidget = function(scope) {
    this.scope_ = scope;
    var frp = scope.getFrp();
    this.input_ = new recoil.ui.widgets.InputWidget(scope);
    this.erroredB_ = frp.createB(false);

    this.containerDiv_ = goog.dom.createDom('div');

};

/**
 * all widgets should not allow themselves to be flatterned
 *
 */
recoil.ui.widgets.ExprWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;

/**
 *
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.ExprWidget.prototype.getComponent = function() {
    return this.input_.getComponent();
};

/**
 * attachable behaviours for widget
 */
recoil.ui.widgets.ExprWidget.options = recoil.ui.util.StandardOptions('value', {
    decimalPlaces: null
});

/**
 * @constructor
 * @param {number=} decimalPlaces
 * @implements {recoil.converters.StringConverter<string>}
 */
recoil.ui.widgets.ExprConverter = function(decimalPlaces) {
    this.decimalPlaces_ = decimalPlaces;
};

/**
 * @param {string} val
 * @return {string}
 */
recoil.ui.widgets.ExprConverter.prototype.convert = function(val) {
    if (val == undefined) {
        return '';
    }
    var res = recoil.util.ExpParser.instance.eval(val);
    if (res == undefined) {
        return val;
    }

    return this.decimalPlaces_ == null ? res + '' : res.toFixed(this.decimalPlaces_) + '';
};

/**
 * @param {string} val
 * @return {{error : recoil.ui.message.Message, value : string, supported: (undefined|boolean), settable: (undefined|boolean)}}
 */
recoil.ui.widgets.ExprConverter.prototype.unconvert = function(val) {
    var err = null;
    var res = recoil.util.ExpParser.instance.eval(val);
    if (res == undefined || isNaN(res)) {
        err = recoil.ui.messages.NOT_APPLICABLE.toString();
    }

    return {error: null, supported: false, value: val};
};


/**
 *
 * @param {!Object| !recoil.frp.Behaviour<Object>} options
 */
recoil.ui.widgets.ExprWidget.prototype.attachStruct = function(options) {
    var frp = this.scope_.getFrp();
    var util = new recoil.frp.Util(frp);
    var me = this;
    var optionsB = recoil.frp.struct.flatten(frp, options);

    var bound = recoil.ui.widgets.ExprWidget.options.bind(frp, options);

    var expConverterB = frp.liftB(function(dp) {
         return new recoil.ui.widgets.ExprConverter(dp);
    }, bound.decimalPlaces());

    var defConverter = new recoil.ui.widgets.ExprFocusStringConverter();

    var modOptions = recoil.frp.struct.extend(
        frp, options,
        {
            converter: recoil.frp.Chooser.if(
                this.input_.getFocus(), defConverter, expConverterB)});

    this.input_.attachStruct(modOptions);
};


/**
 * @constructor
 * @implements {recoil.converters.StringConverter<string>}
 */

recoil.ui.widgets.ExprFocusStringConverter = function() {

};
/**
 * @param {string} val
 * @return {string}
 */
recoil.ui.widgets.ExprFocusStringConverter.prototype.convert = function(val) {
    return val != undefined ? val : '';
};

/**
 * @param {string} val
 * @return {{error : recoil.ui.message.Message, value : string, supported: (undefined|boolean), settable: (undefined|boolean)}}
 */
recoil.ui.widgets.ExprFocusStringConverter.prototype.unconvert = function(val) {

    var res = recoil.util.ExpParser.instance.eval(val);
    var err = null;

    if (res == null) {
        err = recoil.ui.messages.INVALID_EXPRESSION;
    }
    return {error: err, value: val, settable: true};
};

/**
 * @implements {recoil.ui.widgets.table.Column}
 * @template T
 * @constructor
 * @param {!recoil.structs.table.ColumnKey} key
 * @param {!recoil.ui.message.Message|string} name
 * @param {Object=} opt_meta
 */
recoil.ui.columns.Expr = recoil.ui.widgets.table.makeStructColumn(recoil.ui.widgets.ExprWidget);
