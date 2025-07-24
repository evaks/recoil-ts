class UserAgent {

    readonly IE: boolean;
    readonly GECKO: boolean;
    readonly WEBKIT: boolean;
    readonly EDGE: boolean;
    readonly OPERA: boolean;

    readonly VERSION: string;
    readonly CAN_ADD_NAME_OR_TYPE_ATTRIBUTES:boolean;
    readonly DOCUMENT_MODE: any
    readonly CAN_USE_CHILDREN_ATTRIBUTE:boolean;
    readonly CAN_USE_PARENT_ELEMENT_PROPERTY:boolean;
    readonly CAN_USE_INNER_TEXT:boolean;
    readonly MAC:boolean;
    readonly EDGE_OR_IE: boolean;

    constructor() {
        this.IE = UserAgent.matchUserAgent('Trident') ||
            UserAgent.matchUserAgent('MSIE');
        this.EDGE = UserAgent.matchUserAgent('Edge');
        this.WEBKIT = UserAgent.matchUserAgentIgnoreCase('WebKit') &&
            !this.EDGE;
        this.OPERA = UserAgent.matchUserAgent('Opera');
        this.GECKO = UserAgent.matchUserAgent('Gecko') &&
            !this.WEBKIT &&
            !this.IE &&
            !this.EDGE;
        this.VERSION = this.determineVersion_();
        this.CAN_ADD_NAME_OR_TYPE_ATTRIBUTES = !this.IE || this.isDocumentModeOrHigher(9);
        this.DOCUMENT_MODE =
            (() => {

            let mode = this.getDocumentMode_();
            if (!document || !this.IE) {
                return undefined;
            }
            return mode || (document['compatMode'] == 'CSS1Compat' ?
                parseInt(this.VERSION, 10) : 5);
        })();
        this.CAN_USE_CHILDREN_ATTRIBUTE = !this.GECKO && !this.IE ||
            this.IE && this.isDocumentModeOrHigher(9) ||
            this.GECKO && this.isVersionOrHigher('1.9.1');
        this.CAN_USE_PARENT_ELEMENT_PROPERTY = this.IE || this.OPERA || this.WEBKIT;
        this.CAN_USE_INNER_TEXT = (this.IE && !this.isVersionOrHigher('9'));
        this.MAC = UserAgent.matchUserAgent('Macintosh');
        this.EDGE_OR_IE = this.IE || this.EDGE;
    }

    private static getUserAgent(): string {
        if (navigator) {
            let userAgent = navigator.userAgent;
            if (userAgent) {
                return userAgent;
            }
        }
        return '';
    }

    private static matchUserAgent(str: string) {
        let userAgent = UserAgent.getUserAgent();
        return userAgent.indexOf(str) != -1;
    }

    isDocumentModeOrHigher(documentMode:number) {
        return Number(this.DOCUMENT_MODE) >= documentMode;
    }

    /**
     * @param {string} str
     * @return {boolean} Whether the user agent contains the given string.
     */
    private static matchUserAgentIgnoreCase(str: string): boolean {
        let userAgent = UserAgent.getUserAgent();
        return userAgent.toLowerCase().indexOf(str.toLowerCase()) != -1;
    };

    isVersionOrHigher(version: string | number): boolean {
        return UserAgent.compareVersions(this.VERSION, version) >= 0
    }

    private getVersionRegexResult_() {
        let userAgent = UserAgent.getUserAgent();
        if (this.GECKO) {
            return /rv:([^);]+)(\)|;)/.exec(userAgent);
        }
        if (this.EDGE) {
            return /Edge\/([\d.]+)/.exec(userAgent);
        }
        if (this.IE) {
            return /\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(userAgent);
        }
        if (this.WEBKIT) {
            // WebKit/125.4
            return /WebKit\/(\S+)/.exec(userAgent);
        }
        if (this.OPERA) {
            // If none of the above browsers were detected but the browser is Opera, the
            // only string that is of interest is 'Version/<number>'.
            return /(?:Version)[ \/]?(\S+)/.exec(userAgent);
        }
        return undefined;
    }

    private getDocumentMode_():number|undefined {
        // NOTE(user): goog.userAgent may be used in context where there is no DOM.
        let doc = document;
        return doc ? (doc as any)['documentMode'] : undefined;
    }

    private determineVersion_(): string {
        // All browsers have different ways to detect the version and they all have
        // different naming schemes.
        // version is a string rather than a number because it may contain 'b', 'a',
        // and so on.
        let version = '';
        let arr = this.getVersionRegexResult_();
        if (arr) {
            version = arr ? arr[1] : '';
        }

        if (this.IE) {
            // IE9 can be in document mode 9 but be reporting an inconsistent user agent
            // version.  If it is identifying as a version lower than 9 we take the
            // documentMode as the version instead.  IE8 has similar behavior.
            // It is recommended to set the X-UA-Compatible header to ensure that IE9
            // uses documentMode 9.
            let docMode = this.getDocumentMode_();
            if (docMode != null && docMode > parseFloat(version)) {
                return String(docMode);
            }
        }
        return version;
    }

    /**
     * Compares two version numbers.
     *
     * @param version1 Version of first item.
     * @param version2 Version of second item.
     *
     * @return  1 if {@code version1} is higher.
     *                   0 if arguments are equal.
     *                  -1 if {@code version2} is higher.
     */
    public static compareVersions(version1: string|number, version2: string|number):number {
        let order = 0;
        // Trim leading and trailing whitespace and split the versions into
        // subversions.
        let v1Subs = String(version1).trim().split('.');
        let v2Subs = String(version2).trim().split('.');
        let subCount = Math.max(v1Subs.length, v2Subs.length);

        // Iterate over the subversions, as long as they appear to be equivalent.
        for (let subIdx = 0; order == 0 && subIdx < subCount; subIdx++) {
            let v1Sub = v1Subs[subIdx] || '';
            let v2Sub = v2Subs[subIdx] || '';

            // Split the subversions into pairs of numbers and qualifiers (like 'b').
            // Two different RegExp objects are needed because they are both using
            // the 'g' flag.
            let v1CompParser = new RegExp('(\\d*)(\\D*)', 'g');
            let v2CompParser = new RegExp('(\\d*)(\\D*)', 'g');
            do {
                let v1Comp = v1CompParser.exec(v1Sub) || ['', '', ''];
                let v2Comp = v2CompParser.exec(v2Sub) || ['', '', ''];
                // Break if there are no more matches.
                if (v1Comp[0].length == 0 && v2Comp[0].length == 0) {
                    break;
                }

                // Parse the numeric part of the subversion. A missing number is
                // equivalent to 0.
                let v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
                let v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);

                // Compare the subversion components. The number has the highest
                // precedence. Next, if the numbers are equal, a subversion without any
                // qualifier is always higher than a subversion with any qualifier. Next,
                // the qualifiers are compared as strings.
                order = UserAgent.compareElements_(v1CompNum, v2CompNum) ||
                    UserAgent.compareElements_(
                        v1Comp[2].length == 0, v2Comp[2].length == 0) ||
                    UserAgent.compareElements_(v1Comp[2], v2Comp[2]);
                // Stop as soon as an inequality is discovered.
            } while (order == 0);
        }

        return order;
    }

    private static compareElements_<T extends string|number|boolean>(left:T, right:T):number {
        if (left < right) {
            return -1;
        } else if (left > right) {
            return 1;
        }
        return 0;
    }
}

export let userAgent = new UserAgent();

