import {Widget} from "./widget.ts";
import {WidgetScope} from "./widgetscope.ts";
import {Options} from "../frp/util.ts";
import {WidgetHelper} from "../widgethelper.ts";
import {createDom, createTextNode, removeNode} from "../dom/dom.ts";
import {Unicode} from "../../util/string.ts";
import {TagName} from "../dom/tags.ts";
import {Behaviour} from "../../frp/frp.ts";
import classlist from "../dom/classlist.ts";
import {AttachType} from "../../frp/struct.ts";

class PasswordStrengthWidget extends Widget {
    private span_: HTMLSpanElement;
    private strength_: HTMLDivElement;
    private helper_: WidgetHelper;
    private valueB_?: Behaviour<string>;
    private text_?: Text;
    
    constructor(scope: WidgetScope) {
        let span = createDom(TagName.SPAN, {});
        let strength = createDom(TagName.DIV, {}, Unicode.NBSP);
        super(scope, createDom(TagName.DIV, {class: 'recoil-password-strength'}, strength, span));
        this.span_ = span;
        this.strength_ = strength;
        this.helper_ = new WidgetHelper(scope, this.getElement(), this, this.updateState_);
    }

    /**
     * attachable behaviours for widget
     */
    static options = Options('value');

    attachStruct(options:AttachType<{ value:string }>) {
        let bound = PasswordStrengthWidget.options.bind(this.helper_.getFrp(), options);
        this.valueB_ = bound.value();
        this.helper_.attach(this.valueB_);

    }

    static isLower(ch:string|null):boolean  {
        if (ch === null) {
            return false;
        }
        return ch === ch.toLowerCase() && ch !== ch.toUpperCase();
    };
    static isUpper(ch:string|null):boolean {
        if (ch === null) {
            return false;
        }
        return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
    };

    static seqs  (sequence:string, password:string):number{
        let res = 0;
        for (let i = 0; i < sequence.length - 3; i++) {
            let fwd = sequence.substring(i, i + 3);
            let rev = fwd.split('').reverse().join('');
            if (password.indexOf(fwd) != -1 || password.indexOf(rev) != -1) {
                res++;
            }
        }
        return res;
    }
    static isNumber (ch:string|null):boolean {
        return ch !== null && ch >= '0' && ch <= '9';
    }

    private calcStrength_(password: string | undefined): number {
        password = password || '';
        let lenScore = password.length * 4;
        let numUpper = 0;
        let numLower = 0;
        let numNumeric = 0;
        let numSym = 0;
        let midNumSym = 0;
        let conUpper = 0;
        let conLower = 0;
        let conNumber = 0;
        let prev:string|null = null;
        let charMap:Record<string, number[]> = {};
        let alphas = 'abcdefghijklmnopqrstuvwxyz';
        let numerics = '01234567890';
        let symbols = ')!@#$%^&*()';

        const isNumber = PasswordStrengthWidget.isNumber;
        const isUpper = PasswordStrengthWidget.isUpper;

        for (let i = 0; i < password.length; i++) {
            let ch = password[i];
            if (charMap[ch.toLowerCase()] == undefined) {
                charMap[ch.toLowerCase()] = [];
            }
            charMap[ch.toLowerCase()].push(i);
            let mid = i > 0 && i != password.length - 1 ? 1 : 0;
            if (PasswordStrengthWidget.isLower(ch)) {
                if (PasswordStrengthWidget.isLower(prev)) {
                    conLower++;
                }
                numLower++;
            } else if (isUpper(ch)) {
                if (isUpper(prev)) {
                    conUpper++;
                }
                numUpper++;
            } else if (isNumber(ch)) {
                if (isNumber(prev)) {
                    conNumber++;
                }
                numNumeric++;
                midNumSym += mid;
            } else {
                midNumSym += mid;
                numSym++;
            }
            prev = ch;
        }

        let reasons = new Map<string,number>();

        let lowerScore = numLower ? (password.length - numLower) * 2 : 0;
        let upperScore = numUpper ? (password.length - numUpper) * 2 : 0;

        reasons.set('length',lenScore);
        reasons.set('upper',upperScore);
        reasons.set('lower',lowerScore);
        reasons.set('numeric*4',numNumeric * 4);
        reasons.set('sym*6',numSym * 6);
        reasons.set('midNumSym*2',midNumSym * 2);

        if (numUpper + numLower === password.length) {
            reasons.set('only-chars',-password.length);
        }
        if (numNumeric === password.length) {
            reasons.set('only-num',-password.length);
        }

        reasons.set('consecutive-upper*2',-conUpper * 2);
        reasons.set('consecutive-lower*2',-conLower * 2);
        reasons.set('consecutive-number*2',-conNumber * 2);

        if ((numSym > 0 || numNumeric > 0) && numUpper > 0 && numLower > 0 && password.length > 0) {
            reasons.set('requirement-meet',15);
        }

        let lowerPassword = password.toLowerCase();
        const seqs = PasswordStrengthWidget.seqs;
        reasons.set('sequence-alpha*3',-seqs(alphas, lowerPassword) * 3);
        reasons.set('sequence-number*3',-seqs(numerics, lowerPassword) * 3);
        reasons.set('sequence-symbols*3',-seqs(symbols, lowerPassword) * 3);

        let repInc = 0;
        let repChar = 0;
        for (let i = 0; i < password.length; i++) {
            let ch = password[i];
            /* Internal loop through password to check for repeat characters */
            let bCharExists = false;
            for (let j = 0; j < password.length; j++) {
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
                let unqChar = password.length - repChar;
                repInc = Math.ceil(repInc / Math.max(1, unqChar));
            }
        }
        reasons.set('repeat?', -repInc);
        let score = 0;
        for (let [_, score]  of reasons) {
            score += score;
        }

        return Math.max(0, score);
    }

    private updateState_(helper: WidgetHelper) {
        if (this.text_) {
            removeNode(this.text_);
        }

        if (helper.isGood()) {
            let strength = this.calcStrength_(this.valueB_!.get());
            this.strength_.style.cssText = 'width: ' + Math.min(100, strength) + '%';
            let levels = [
                {limit: 20, name: 'very-weak', text: 'Very Weak'},
                {limit: 40, name: 'weak', text: 'Weak'},
                {limit: 60, name: 'good', text: 'Good'},
                {limit: 80, name: 'strong', text: 'Strong'},
                {limit: null, name: 'very-strong', text: 'Very Strong'}
            ];
            let wasEnabled = false;
            let txt = levels[0].text;
            for (let i = 0; i < levels.length; i++) {
                let level = levels[i];
                let enabled:boolean = !wasEnabled && (level.limit === null || strength < level.limit);
                wasEnabled = wasEnabled || enabled;
                if (enabled) {
                    txt = level.text;
                }
                classlist.enable(this.getElement() as HTMLElement, level.name, enabled);
            }
            this.text_ = createTextNode(txt);

            this.span_.appendChild(this.text_);
        }

    }
}