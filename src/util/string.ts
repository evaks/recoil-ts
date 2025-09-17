export enum Unicode {
    NBSP= '\xa0',
}

const AMP_RE_ = /&/g;
const LT_RE_ = /</g;
const GT_RE_ = />/g;
const QUOT_RE_ = /"/g;
const SINGLE_QUOTE_RE_ = /'/g;
const NULL_RE_ = /\x00/g

const DETECT_DOUBLE_ESCAPING = false;

const E_RE_ = /e/g;


/**
 * Regular expression that matches any character that needs to be escaped.
 * @const {!RegExp}
 * @private
 */
const ALL_RE_ =
    (DETECT_DOUBLE_ESCAPING ? /[\x00&<>"'e]/ : /[\x00&<>"']/);


/**
 * Escapes double quote '"' and single quote '\'' characters in addition to
 * '&', '<', and '>' so that a string can be included in an HTML tag attribute
 * value within double or single quotes.
 *
 * It should be noted that > doesn't need to be escaped for the HTML or XML to
 * be valid, but it has been decided to escape it for consistency with other
 * implementations.
 *
 * With DETECT_DOUBLE_ESCAPING, this function escapes also the
 * lowercase letter "e".
 *
 * NOTE(user):
 * HtmlEscape is often called during the generation of large blocks of HTML.
 * Using statics for the regular expressions and strings is an optimization
 * that can more than half the amount of time IE spends in this function for
 * large apps, since strings and regexes both contribute to GC allocations.
 *
 * Testing for the presence of a character before escaping increases the number
 * of function calls, but actually provides a speed increase for the average
 * case -- since the average case often doesn't require the escaping of all 4
 * characters and indexOf() is much cheaper than replace().
 * The worst case does suffer slightly from the additional calls, therefore the
 * opt_isLikelyToContainHtmlChars option has been included for situations
 * where all 4 HTML entities are very likely to be present and need escaping.
 *
 * Some benchmarks (times tended to fluctuate +-0.05ms):
 *                                     FireFox                     IE6
 * (no chars / average (mix of cases) / all 4 chars)
 * no checks                     0.13 / 0.22 / 0.22         0.23 / 0.53 / 0.80
 * indexOf                       0.08 / 0.17 / 0.26         0.22 / 0.54 / 0.84
 * indexOf + re test             0.07 / 0.17 / 0.28         0.19 / 0.50 / 0.85
 *
 * An additional advantage of checking if replace actually needs to be called
 * is a reduction in the number of object allocations, so as the size of the
 * application grows the difference between the various methods would increase.
 *
 * @param {string} str string to be escaped.
 * @param {boolean=} opt_isLikelyToContainHtmlChars Don't perform a check to see
 *     if the character needs replacing - use this option if you expect each of
 *     the characters to appear often. Leave false if you expect few html
 *     characters to occur in your strings, such as if you are escaping HTML.
 * @return {string} An escaped copy of {@code str}.
 */
export function htmlEscape(str:string, opt_isLikelyToContainHtmlChars?:boolean) {

    if (opt_isLikelyToContainHtmlChars) {
        str = str.replace(AMP_RE_, '&amp;')
            .replace(LT_RE_, '&lt;')
            .replace(GT_RE_, '&gt;')
            .replace(QUOT_RE_, '&quot;')
            .replace(SINGLE_QUOTE_RE_, '&#39;')
            .replace(NULL_RE_, '&#0;');
        if (DETECT_DOUBLE_ESCAPING) {
            str = str.replace(E_RE_, '&#101;');
        }
        return str;

    } else {
        // quick test helps in the case when there are no chars to replace, in
        // worst case this makes barely a difference to the time taken
        if (!ALL_RE_.test(str)) return str;

        // str.indexOf is faster than regex.test in this case
        if (str.indexOf('&') != -1) {
            str = str.replace(AMP_RE_, '&amp;');
        }
        if (str.indexOf('<') != -1) {
            str = str.replace(LT_RE_, '&lt;');
        }
        if (str.indexOf('>') != -1) {
            str = str.replace(GT_RE_, '&gt;');
        }
        if (str.indexOf('"') != -1) {
            str = str.replace(QUOT_RE_, '&quot;');
        }
        if (str.indexOf('\'') != -1) {
            str = str.replace(SINGLE_QUOTE_RE_, '&#39;');
        }
        if (str.indexOf('\x00') != -1) {
            str = str.replace(NULL_RE_, '&#0;');
        }
        if (DETECT_DOUBLE_ESCAPING && str.indexOf('e') != -1) {
            str = str.replace(E_RE_, '&#101;');
        }
        return str;
    }
}

export function canonicalizeNewlines(str:string):string {
    return str.replace(/(\r\n|\r|\n)/g, '\n');
}

/**
 * Converts a string from selector-case to camelCase (e.g. from
 * "multi-part-string" to "multiPartString"), useful for converting
 * CSS selectors and HTML dataset keys to their equivalent JS properties.
 * @param {string} str The string in selector-case form.
 * @return {string} The string in camelCase form.
 */
export function toCamelCase (str:string):string {
    return String(str).replace(
        /\-([a-z])/g, function(all, match) { return match.toUpperCase(); });
}

/**
 * Converts a string into TitleCase. First character of the string is always
 * capitalized in addition to the first letter of every subsequent word.
 * Words are delimited by one or more whitespaces by default. Custom delimiters
 * can optionally be specified to replace the default, which doesn't preserve
 * whitespace delimiters and instead must be explicitly included if needed.
 *
 * Default delimiter => " ":
 *    toTitleCase('oneTwoThree')    => 'OneTwoThree'
 *    toTitleCase('one two three')  => 'One Two Three'
 *    toTitleCase('  one   two   ') => '  One   Two   '
 *    toTitleCase('one_two_three')  => 'One_two_three'
 *    toTitleCase('one-two-three')  => 'One-two-three'
 *
 * Custom delimiter => "_-.":
 *    toTitleCase('oneTwoThree', '_-.')       => 'OneTwoThree'
 *    toTitleCase('one two three', '_-.')     => 'One two three'
 *    toTitleCase('  one   two   ', '_-.')    => '  one   two   '
 *    toTitleCase('one_two_three', '_-.')     => 'One_Two_Three'
 *    toTitleCase('one-two-three', '_-.')     => 'One-Two-Three'
 *    toTitleCase('one...two...three', '_-.') => 'One...Two...Three'
 *    toTitleCase('one. two. three', '_-.')   => 'One. two. three'
 *    toTitleCase('one-two.three', '_-.')     => 'One-Two.Three'
 *
 * @param str String value in camelCase form.
 * @param opt_delimiters Custom delimiter character set used to
 *      distinguish words in the string value. Each character represents a
 *      single delimiter. When provided, default whitespace delimiter is
 *      overridden and must be explicitly included if needed.
 * @return String value in TitleCase form.
 */
export function toTitleCase (str:string, opt_delimiters?:string):string {
    var delimiters = typeof (opt_delimiters) === "string"  ?
        regExpEscape(opt_delimiters) :
        '\\s';

    // For IE8, we need to prevent using an empty character set. Otherwise,
    // incorrect matching will occur.
    delimiters = delimiters ? '|[' + delimiters + ']+' : '';

    let regexp = new RegExp('(^' + delimiters + ')([a-z])', 'g');
    return str.replace(
        regexp, (all:string, p1:string, p2:string)=> { return p1 + p2.toUpperCase(); });
}

/**
 * Escapes characters in the string that are not safe to use in a RegExp.
 * @param {*} s The string to escape. If not a string, it will be casted
 *     to one.
 * @return {string} A RegExp safe, escaped copy of {@code s}.
 */
export function regExpEscape(s:any):string {
    return String(s)
        .replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1')
        .replace(/\x08/g, '\\x08');
}
