goog.provide('recoil.ui.widgets.PasswordStrengthWidget');

goog.require('goog.events');
goog.require('goog.events.InputHandler');
goog.require('goog.ui.Component');
goog.require('recoil.frp.Util');
goog.require('recoil.ui.Widget');
goog.require('recoil.ui.widgets.InputWidget');

/**
 *
 * @param {!recoil.ui.WidgetScope} scope
 * @constructor
 * @implements {recoil.ui.Widget}
 */
recoil.ui.widgets.PasswordStrengthWidget = function(scope) {
    this.scope_ = scope;
    this.span_ = goog.dom.createDom('span', {});
    this.strength_ = goog.dom.createDom('div', {}, goog.string.Unicode.NBSP);
    this.container_ = goog.dom.createDom('div', {class: 'recoil-password-strength'}, this.strength_, this.span_);
    this.component_ = recoil.ui.ComponentWidgetHelper.elementToNoFocusControl(this.container_);
    this.helper_ = new recoil.ui.ComponentWidgetHelper(scope, this.component_, this, this.updateState_);
};

/**
 * @return {!goog.ui.Component}
 */
recoil.ui.widgets.PasswordStrengthWidget.prototype.getComponent = function() {
    return this.component_;
};

/**
 * attachable behaviours for widget
 */
recoil.ui.widgets.PasswordStrengthWidget.options = recoil.frp.Util.Options('value');

/**
 *
 * @param {!Object| !recoil.frp.Behaviour<Object>} options
 */
recoil.ui.widgets.PasswordStrengthWidget.prototype.attachStruct = function(options) {
    var bound = recoil.ui.widgets.PasswordStrengthWidget.options.bind(this.helper_.getFrp(), options);

    this.valueB_ = bound.value();
    this.helper_.attach(this.valueB_);

};

/**
 *
 * @param {?string} password
 * @return {number}
 * @private
 */
recoil.ui.widgets.PasswordStrengthWidget.prototype.calcStrength_ = function(password) {
    password = password || '';
    var lenScore = password.length * 4;
    var numUpper = 0;
    var numLower = 0;
    var numNumeric = 0;
    var numSym = 0;
    var midNumSym = 0;
    var conUpper = 0;
    var conLower = 0;
    var conNumber = 0;
    var prev = null;
    var charMap = {};
    var alphas = 'abcdefghijklmnopqrstuvwxyz';
    var numerics = '01234567890';
    var symbols = ')!@#$%^&*()';
    var isLower = function(ch) {
        if (ch === null) {
            return false;
        }
        return ch === ch.toLowerCase() && ch !== ch.toUpperCase();
    };
    var isUpper = function(ch) {
        if (ch === null) {
            return false;
        }
        return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
    };

    var seqs = function(sequence, password) {
        var res = 0;
        for (var i = 0; i < sequence.length - 3; i++) {
            var fwd = sequence.substring(i, i + 3);
            var rev = fwd.split('').reverse().join('');
            if (password.indexOf(fwd) != -1 || password.indexOf(rev) != -1) {
                res++;
            }
        }
        return res;
    };
    var isNumber = function(ch) {
        return ch !== null && ch >= '0' && ch <= '9';
    };
    for (var i = 0; i < password.length; i++) {
        var ch = password[i];
        if (charMap[ch.toLowerCase()] == undefined) {
            charMap[ch.toLowerCase()] = [];
        }
        charMap[ch.toLowerCase()].push(i);
        var mid = i > 0 && i != password.length - 1 ? 1 : 0;
        if (isLower(ch)) {
            if (isLower(prev)) {
                conLower++;
            }
            numLower++;
        }
        else if (isUpper(ch)) {
            if (isUpper(prev)) {
                conUpper++;
            }
            numUpper++;
        }
        else if (isNumber(ch)) {
            if (isNumber(prev)) {
                conNumber++;
            }
            numNumeric++;
            midNumSym += mid;
        }
        else {
            midNumSym += mid;
            numSym++;
        }
        prev = ch;
    }

    var reasons = {};

    var lowerScore = numLower ? (password.length - numLower) * 2 : 0;
    var upperScore = numUpper ? (password.length - numUpper) * 2 : 0;

    reasons['length'] = lenScore;
    reasons['upper'] = upperScore;
    reasons['lower'] = lowerScore;
    reasons['numeric*4'] = numNumeric * 4;
    reasons['sym*6'] = numSym * 6;
    reasons['midNumSym*2'] = midNumSym * 2;

    if (numUpper + numLower === password.length) {
        reasons['only-chars'] = -password.length;
    }
    if (numNumeric === password.length) {
        reasons['only-num'] = -password.length;
    }

    reasons['consecutive-upper*2'] = -conUpper * 2;
    reasons['consecutive-lower*2'] = -conLower * 2;
    reasons['consecutive-number*2'] = -conNumber * 2;

    if ((numSym > 0 || numNumeric > 0) && numUpper > 0 && numLower > 0 && password.length > 0) {
        reasons['requirement-meet'] = 15;
    }

    var lowerPassword = password.toLowerCase();
    reasons['sequence-alpha*3'] = -seqs(alphas, lowerPassword) * 3;
    reasons['sequence-number*3'] = -seqs(numerics, lowerPassword) * 3;
    reasons['sequence-symbols*3'] = -seqs(symbols, lowerPassword) * 3;

    var repInc = 0;
    var repChar = 0;
    for (i = 0; i < password.length; i++) {
        var ch = password[i];
        /* Internal loop through password to check for repeat characters */
        var bCharExists = false;
        for (var j = 0; j < password.length; j++) {
            if (ch == password[j] && i != j) { /* repeat character exists */
                bCharExists = true;
                /*
                  Calculate icrement deduction based on proximity to identical characters
                  Deduction is incremented each time a new match is discovered
                  Deduction amount is based on total password length divided by the
                  difference of distance between currently selected match
                */
                repInc += Math.abs(password.length / (i - j));
            }
        }
        if (bCharExists) {
            repChar++;
            var unqChar = password.length - repChar;
            repInc = Math.ceil(repInc / Math.max(1, unqChar));
        }
    }
    reasons['repeat?'] = -repInc;
    var score = 0;
    for (var k in reasons) {
        score += reasons[k];
    }

    return Math.max(0, score);
};
/**
 *
 * @param {recoil.ui.WidgetHelper} helper
 * @private
 */
recoil.ui.widgets.PasswordStrengthWidget.prototype.updateState_ = function(helper) {
    if (this.text_) {
        goog.dom.removeNode(this.text_);
    }

    if (helper.isGood()) {
        var strength = this.calcStrength_(this.valueB_.get());
        this.strength_.style.cssText = 'width: ' + Math.min(100, strength) + '%';
        var levels = [
            {limit: 20, name: 'very-weak', text: 'Very Weak'},
            {limit: 40, name: 'weak', text: 'Weak'},
            {limit: 60, name: 'good', text: 'Good'},
            {limit: 80, name: 'strong', text: 'Strong'},
            {limit: null, name: 'very-strong', text: 'Very Strong'}
        ];
        var wasEnabled = false;
        var txt = levels[0].text;
        for (var i = 0; i < levels.length; i++) {
            var level = levels[i];
            var enabled = !wasEnabled && (level.limit === null || strength < level.limit);
            wasEnabled = wasEnabled || enabled;
            if (enabled) {
                txt = level.text;
            }
            goog.dom.classlist.enable(this.container_, level.name, enabled);
        }
        this.text_ = goog.dom.createTextNode(txt);

        this.span_.appendChild(this.text_);
    }

};

/**
 * all widgets should not allow themselves to be flatterned
 *
 * @type {!Object}
 */

recoil.ui.widgets.PasswordStrengthWidget.prototype.flatten = recoil.frp.struct.NO_FLATTEN;
