goog.provide('recoil.ui.columns.Date2');
/**
 * Radio button widget
 * the inputs are value and a selected value
 *
 */
goog.provide('recoil.ui.widgets.DateWidget2');

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
recoil.ui.widgets.DateWidget2 = function(scope) {
    this.scope_ = scope;

    var cd = goog.dom.createDom;
    var frp = scope.getFrp();

    this.date_ = cd('input', {type: 'date'});
    this.readonly_ = cd('div', {});

    this.container_ = cd('div', {class: 'budget-date-cont'}, this.date_, this.readonly_);
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
/*            if (false) {
                return;
            }
*/
            var dt = me.date_.value;
            var outDate = dt === '' ? null : parseInt(dt.replace(/-/g, ''), 10);
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
recoil.ui.widgets.DateWidget2.prototype.flatten = recoil.frp.struct.NO_FLATTEN;

/**
 * @type {!recoil.frp.Util.OptionsType}
 */
recoil.ui.widgets.DateWidget2.options =
    recoil.ui.util.StandardOptions('value', {allowNone: false, min: null, max: null, step: 1});


/**
 * we allow null dates since some date
 * @param {!recoil.frp.Behaviour<goog.date.Date>|goog.date.Date} value the widget that will be displayed in the popup
 * @suppress {missingProperties}
 */

recoil.ui.widgets.DateWidget2.prototype.attach = function(value)  {
    recoil.ui.widgets.DateWidget2.options.value(value).attach(this);
};


/**
 * @param {!Object|!recoil.frp.Behaviour<Object>} options
 * @suppress {missingProperties}
 */
recoil.ui.widgets.DateWidget2.prototype.attachStruct = function(options) {
    var frp = this.helper_.getFrp();
    var bound = recoil.ui.widgets.DateWidget2.options.bind(frp, options);
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
recoil.ui.widgets.DateWidget2.prototype.updateState_ = function(helper) {
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
        goog.style.setElementShown(this.date_, this.boundsB_.get().editable);
        goog.style.setElementShown(this.readonly_, !this.boundsB_.get().editable);

        var toSet = this.convertDateToElType(this.valueB_.get());
        if (this.date_.value !== toSet) {
            this.date_.value = toSet;

        }

        if (toSet == null) {
            this.readonly_.innerText = '';
        }
        else {
            this.readonly_.innerText = recoil.ui.widgets.DateWidget2.convertLocaleDate(this.valueB_.get()).toDateString();
        }

        set(this.date_, 'min', this.convertDateToElType(this.boundsB_.get().min));
        set(this.date_, 'max', this.convertDateToElType(this.boundsB_.get().max));
        if (this.date_.step != this.boundsB_.get().step) {
            this.date_.step = this.boundsB_.get().step;
        }
        var valid = this.isValid(this.boundsB_.get(), this.valueB_.get());
        goog.dom.classlist.enable(this.date_, 'recoil-error', !valid);

    }

};

/**
 * @param {{allowNone:boolean, min: ?number, max: ?number}} bounds
 * @param {?number} value
 * @return {boolean}
 */
recoil.ui.widgets.DateWidget2.prototype.isValid = function(bounds, value) {
    if (value === null) {
        return bounds.allowNone;
    }

    var toDate = function(value) {
        return new Date(Math.floor(value / 10000), Math.floor((value % 10000) / 100) - 1, value % 100, 0, 0, 0, 0);
    };

    if (bounds.min === null) {
        return bounds.max === null ? true : value <= bounds.max;
    }
    if (bounds.min > bounds.value) {
        return false;
    }
    if (bounds.max !== null && bounds.max < bounds.value) {
        return false;
    }

    if (bounds.step === 1) {
        return true;
    }

    var diff = Math.round((toDate(value).getTime() - toDate(bounds.min).getTime()) / (24 * 3600000));

    return Math.abs(diff) % bounds.step === 0;

    // todo add the multiple is right
//    return true;
};

/**
 * @param {?number} date
 * @return {?string}
 */
recoil.ui.widgets.DateWidget2.prototype.convertDateToElType = function(date) {
    var pad = function(num, amount) {
        var str = '' + num;
        if (str.length < amount) {
            return '0'.repeat(amount - str.length) + num;
        }
        return str;
    };
    var dt = date + '';
    if (date === null || dt === '') {
        return null;
    }
    var year = Math.floor(date / 10000);
    return pad(year, 4) + '-' + pad(Math.floor(date / 100) % 100, 2) + '-' + pad(date % 100, 2);
};

/**
 * @param {?number} date
 * @return {?Date}
 */
recoil.ui.widgets.DateWidget2.convertLocaleDate = function(date) {
    var dt = date + '';
    if (date === null || dt === '') {
        return null;
    }
    return new Date(Math.floor(date / 10000), Math.floor((date % 10000) / 100) - 1, date % 100);
};

/**
 * @param {?number} date
 * @return {?Date}
 */
recoil.ui.widgets.DateWidget2.prototype.convertLocaleDate = function(date) {
    return recoil.ui.widgets.DateWidget2.convertLocaleDate(date);
};


/**
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.DateWidget2.prototype.getComponent = function() {
    return this.component_;
};


/**
 * @param {?} d
 * @return {?}
 */
recoil.ui.widgets.DateWidget2.convertDateToLocal = function(d) {
    return d.getFullYear() * 10000 + 100 * (d.getMonth() + 1) + d.getDate();

};

/**
 * @implements {recoil.ui.widgets.table.Column}
 * @template T
 * @constructor
 * @param {!recoil.structs.table.ColumnKey} key
 * @param {!recoil.ui.message.Message|string} name
 * @param {Object=} opt_meta
 */
recoil.ui.columns.Date2 = recoil.ui.widgets.table.makeStructColumn(recoil.ui.widgets.DateWidget2);
