goog.provide('recoil.ui.columns.DateTime');
goog.provide('recoil.ui.widgets.DateTime');

goog.require('goog.date');
goog.require('goog.dom');
goog.require('goog.ui.Component');
goog.require('goog.ui.Container');
goog.require('goog.ui.DatePicker');
goog.require('recoil.ui.ComponentWidgetHelper');
goog.require('recoil.ui.EventHelper');
goog.require('recoil.ui.TooltipHelper');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.WidgetScope');
goog.require('recoil.ui.message.Message');
goog.require('recoil.ui.messages');
goog.require('recoil.ui.util');
goog.require('recoil.ui.widgets.table.Column');
/**
 *
 * @template T
 * @param {!recoil.ui.WidgetScope} scope
 * @implements {recoil.ui.Widget}
 * @constructor
 */
recoil.ui.widgets.DateTime = function(scope) {
    this.scope_ = scope;

    var cd = goog.dom.createDom;
    var frp = scope.getFrp();

    this.date_ = cd('input', {type: 'datetime-local'});
    this.readonly_ = cd('div', {});

    this.container_ = cd('div', {class: 'recoil-date-cont'}, this.date_, this.readonly_);
    this.component_ = recoil.ui.ComponentWidgetHelper.elementToNoFocusControl(this.container_);

    this.helper_ = new recoil.ui.ComponentWidgetHelper(scope, this.component_, this, this.updateState_);
//    this.changeHelper_ = new recoil.ui.EventHelper(scope  );
    this.tooltip_ = new recoil.ui.TooltipHelper(scope, this.component_, this.date_);
    this.rawValueB_ = frp.createB(null);
    var me = this;

    goog.events.listen(this.date_, goog.events.EventType.BLUR, function(e) {
        frp.accessTrans(function() {
            me.helper_.forceUpdate();
        }, me.valueB_, me.boundsB_);
    });
    goog.events.listen(this.date_, goog.events.EventType.CHANGE, function(e) {
        frp.accessTrans(function() {
            var dt = me.date_.value;
            var outDate = recoil.ui.widgets.DateTime.convertToExternal_(dt);
            var valid = me.isValid(me.boundsB_.get(), outDate);
            goog.dom.classlist.enable(me.date_, 'recoil-error', !valid);
            if (valid) {
                me.valueB_.set(outDate);
            }
        }, me.valueB_, me.boundsB_);
    });
};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */
recoil.ui.widgets.DateTime.prototype.flatten = recoil.frp.struct.NO_FLATTEN;

/**
 * @type {!recoil.frp.Util.OptionsType}
 */
recoil.ui.widgets.DateTime.options =
    recoil.ui.util.StandardOptions('value', {allowNone: false, min: null, max: null, step: 1});



/**
 * @param {!Object|!recoil.frp.Behaviour<Object>} options
 * @suppress {missingProperties}
 */
recoil.ui.widgets.DateTime.prototype.attachStruct = function(options) {
    var frp = this.helper_.getFrp();
    var bound = recoil.ui.widgets.DateTime.options.bind(frp, options);
    var me = this;


    this.valueB_ = bound.value();
    this.enabledB_ = bound.enabled();
    this.allowNoneB_ = bound.allowNone();
    this.boundsB_ = bound.getGroup([bound.min, bound.max, bound.step, bound.allowNone, bound.editable]);
    this.helper_.attach(this.valueB_, this.enabledB_, this.allowNoneB_, this.boundsB_);

    this.tooltip_.attach(this.enabledB_, this.helper_);
};

/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.DateTime.prototype.updateState_ = function(helper) {
    if (helper.isGood()) {
        var set = function(el, prop, v) {
            if (v == null) {
                if (el.hasAttribute(prop)) {
                    el.removeAttribute(prop);
                }
            }
            else {
                if (el.getAttribute(prop) !== v) {
                    el.setAttribute(prop, v);
                }
            }
        };
        var value = this.valueB_.get();
        var toSet = this.convertToInternal_(value);
        if (recoil.ui.widgets.DateTime.convertToExternal_(this.date_.value) !== value) {
            this.date_.value = toSet;
        }

        set(this.date_, 'min', this.convertToInternal_(this.boundsB_.get().min));
        set(this.date_, 'max', this.convertToInternal_(this.boundsB_.get().max));
        if (this.date_.step != Math.round(this.boundsB_.get().step / 1000)) {
            this.date_.step = Math.round(this.boundsB_.get().step / 1000);
        }
        var valid = this.isValid(this.boundsB_.get(), this.valueB_.get());
        goog.dom.classlist.enable(this.date_, 'recoil-error', !valid);

        goog.style.setElementShown(this.date_, this.boundsB_.get().editable);
        goog.style.setElementShown(this.readonly_, !this.boundsB_.get().editable);
        if (toSet != null) {
            var dt = new Date(value);
            this.readonly_.innerText = dt.toDateString() + ' ' + dt.toLocaleTimeString();
        }
        else {
            this.readonly_.innerText = '';
        }
    }

};

/**
 * @param {{allowNone:boolean, min: ?number, max: ?number}} bounds
 * @param {?number} value
 * @return {boolean}
 */
recoil.ui.widgets.DateTime.prototype.isValid = function(bounds, value) {
    if (value === null) {
        return bounds.allowNone;
    }


    if (bounds.min === null) {
        return bounds.max === null ? true : value <= bounds.max;
    }
    if (bounds.min > bounds.value) {
        return false;
    }
    if (bounds.max !== null && bounds.max < bounds.value) {
        return false;
    }

    if (bounds.step === 1000) {
        return true;
    }

    var diff = Math.round(value - bounds.min);

    return Math.abs(diff) % bounds.step === 0;

};

/**
 * @private
 * @param {string} date
 * @return {?number}
 */
recoil.ui.widgets.DateTime.convertToExternal_ = function(date) {
    var dt = date + '';
    if (date == null || dt === '') {
        return null;
    }

    var dateTimeParts = date.split('T');
    var dateParts = dateTimeParts[0].split('-');
    var timeParts = dateTimeParts[0].split(':');
    var secondParts = (timeParts.length > 2 ? timeParts[2] : '00').split('.');
    if (secondParts.length < 2) {
        secondParts.push('000');
    }

    var pi = function(v) {
        return parseInt(v, 10);
    };
    return new Date(pi(dateTimeParts[0]), pi(dateTimeParts[1]) - 1, pi(dateTimeParts[2]), pi(timeParts[0]), pi(timeParts[1]), pi(secondParts[0]), pi(secondParts[1])).getTime();
};

/**
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.DateTime.prototype.getComponent = function() {
    return this.component_;
};


/**
 * @private
 * @param {?number} date
 * @return {string}
 */
recoil.ui.widgets.DateTime.prototype.convertToInternal_ = function(date) {
    return recoil.ui.widgets.DateTime.convertToInternal_(date);
};

/**
 * @private
 * @param {?number} date
 * @return {string}
 */
recoil.ui.widgets.DateTime.convertToInternal_ = function(date) {
    if (date == undefined) {
        return '';
    }
    var d = new Date(date);
    var pn = goog.string.padNumber;

    return pn(d.getFullYear(), 4) + '-' + pn(d.getMonth() + 1, 2) + '-' + pn(d.getDate(), 2) + 'T' + pn(d.getHours(), 2) + ':' + pn(d.getMinutes(), 2) + ':' + pn(d.getSeconds(), 2);

};

/**
 * @implements {recoil.ui.widgets.table.Column}
 * @template T
 * @constructor
 * @param {!recoil.structs.table.ColumnKey} key
 * @param {!recoil.ui.message.Message|string} name
 * @param {Object=} opt_meta
 */
recoil.ui.columns.DateTime = recoil.ui.widgets.table.makeStructColumn(recoil.ui.widgets.DateTime);
