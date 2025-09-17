type TokenizerInfo ={ type:string, value?:string}
type ParserFn = (level:number, pos: {v:number},tokens:TokenizerInfo[]) => number|null;
type CustomFn = { func: (...args:(number|null)[])=>number, min:number, max?:number};

export class Tokenizer {
    private readonly basic_ = new Set<string>();
    private readonly whitespace_: RegExp;
    private readonly regs_: { reg: RegExp, type: string }[];

    constructor() {
        let syms = '()*+-,%/^';
        this.regs_ = [{reg: /^\d+(\.\d+)?/, type: 'num'},
            {reg: /^[a-z_A-Z][a-zA-Z_0-9]*/, type: 'ident'}];
        this.whitespace_ = /^\s/;

        for (let i = 0; i < syms.length; i++) {
            this.basic_.add(syms[i]);
        }

    }

    tokenize(val: string): TokenizerInfo[] | null {

        let res: TokenizerInfo[] = [];

        for (let i = 0; i < val.length;) {
            let ch = val[i];

            if (this.basic_.has(ch)) {
                res.push({'type': ch});
                i++;
            } else {
                let remaining = val.substring(i);
                let whiteSpaceMatch = this.whitespace_.exec(remaining);
                if (whiteSpaceMatch && whiteSpaceMatch[0].length > 0) {
                    i += whiteSpaceMatch[0].length;
                } else {
                    let matchFound = false;
                    for (let j = 0; j < this.regs_.length; j++) {
                        let expr = this.regs_[j].reg;

                        let match = expr.exec(remaining);
                        if (match && match[0].length > 0) {
                            matchFound = true;
                            res.push({type: this.regs_[j].type, value: match[0]});
                            i += match[0].length;
                            break;
                        }
                    }
                    if (!matchFound) {
                        i++;
                        return null;
                    }
                }
            }


        }
        return res;
    }
}

export class ExpParser {
    private tokenizer_: Tokenizer;

    private static functions_:Record<string,CustomFn> = {
        'ceil': {func: Math.ceil, min: 1} as CustomFn,
        'floor': {func: Math.floor, min: 1} as CustomFn,
        'round': {func: Math.round, min: 1} as CustomFn,
        'sqrt': {func: Math.sqrt, min: 1} as CustomFn,
        'root': {func: (v:number, root:number) => Math.pow(v,1/root), min: 2} as CustomFn,
        'min': {func: Math.min, min: 1, max: -1} as CustomFn,
        'max': {func: Math.max, min: 1, max: -1} as CustomFn,

    }

    // this is in reverse order of precedence
    static parsers_: [ParserFn, ...ParserFn[]] = (() => {
        let parsers: ParserFn[] = [];
        parsers.push(ExpParser.parseBinary_(parsers, '+', (x, y) => {
            return x + y;
        }));
        parsers.push(ExpParser.parseBinary_(parsers, '-', (x, y) => {
            return x - y;
        }));
        parsers.push(ExpParser.parseBinary_(parsers, '*', (x, y) => {
            return x * y;
        }));
        parsers.push(ExpParser.parseBinary_(parsers, '/',  (x, y) => {
            return x / y;
        }));
        parsers.push(ExpParser.parseBinary_(parsers, '%',  (x, y) => {
            return x % y;
        }));
        parsers.push(ExpParser.parseBinary_(parsers, '^', (x, y)=> {
            return Math.pow(x, y);
        }));
        parsers.push(ExpParser.parseUnary_(parsers, {
            '+': (x) =>{
                return x;
            },
            '-': (x)=> {
                return -x;
            }
        }));
        parsers.push(ExpParser.parseFunction_(parsers, ExpParser.functions_));
        parsers.push(ExpParser.parseBracket_(parsers));
        parsers.push(ExpParser.parseNumber_(parsers));

        return parsers as [ParserFn, ...ParserFn[]];
    })();

    constructor() {
        this.tokenizer_ = new Tokenizer();
    }


    eval(exp: string) {
        try {
            let tokens = this.tokenizer_.tokenize(exp);
            if (tokens === null) {
                return null;
            }
            let pos = {v: 0};

            let res = ExpParser.parsers_[0](0, pos, tokens);

            if (pos.v !== tokens.length) {
                return null;
            }
            return res;
        } catch (e) {
            return null;
        }
    }


    private static parseBracket_(parsers: ParserFn[]): ParserFn {
        return (level: number, pos, tokens) => {
            let cur = tokens[pos.v];
            if (!cur) {
                return null;
            }
            if (cur.type === '(') {
                pos.v++;
                let res = parsers[0](0, pos, tokens);
                cur = tokens[pos.v];
                if (!cur || cur.type !== ')') {
                    return null;
                }
                pos.v++;
                return res;
            }
            return parsers[level + 1](level + 1, pos, tokens);
        };
    }

    private static parseNumber_(_parsers: ParserFn[]): ParserFn {
        return (_level, pos, tokens) => {
            let cur = tokens[pos.v];
            if (!cur || cur.type !== 'num') {
                return null;
            }
            pos.v++;
            return parseFloat(cur.value!);
        };
    }

    /**
     * @param parsers list of parsers in reverse precedence order
     * @param op
     * @param func
     */
    private static parseBinary_(parsers: ParserFn[], op: string, func: (x: number, y: number) => number): ParserFn {

        return  (level, pos, tokens)=> {
            let val = parsers[level + 1](level + 1, pos, tokens);

            if (val === null) {
                return null;
            }
            let cur = tokens[pos.v];
            while (cur && cur.type === op) {
                pos.v++;
                let next = parsers[level + 1](level + 1, pos, tokens);
                if (next === null) {
                    return null;
                }
                val = func(val, next);
                cur = tokens[pos.v];
            }
            return val;
        };
    }

    private static parseUnary_(parsers:ParserFn[], funcs:Record<string, (x:number) => number>) : ParserFn {
        return (level:number, pos, tokens)=> {

            let cur = tokens[pos.v];

            let ops : ((x:number)=> number)[] = [];
            while (cur && funcs[cur.type]) {
                ops.push(funcs[cur.type]);
                pos.v++;
                cur = tokens[pos.v];
            }
            let val:number|null = parsers[level + 1](level + 1, pos, tokens);
            if (val === null) {
                return null;
            }

            for (let i = ops.length - 1; i >= 0; i--) {
                val = ops[i](val);
            }

            return val;
        };
    }

    private static parseFunction_(parsers: ParserFn[], funcs:Record<string, CustomFn >):ParserFn {
        return (level, pos, tokens)=> {

            if (tokens[pos.v].type === 'ident') {
                let funcInfo = funcs[tokens[pos.v].value || ''];

                if (funcInfo) {
                    pos.v++;
                    if (tokens[pos.v].type !== '(') {
                        return null;
                    }

                    pos.v++;
                    let vals:(number|null)[] = [];
                    let i = 0;
                    while (i < funcInfo.min) {
                        vals.push(parsers[0](0, pos, tokens));
                        i++;
                        if (i < funcInfo.min) {
                            if (tokens[pos.v].type !== ',') {
                                return null;
                            }
                            pos.v++;
                        }
                    }

                    while ((funcInfo.max === -1 || (funcInfo.max && i < funcInfo.max)) && tokens[pos.v].type === ',') {
                        pos.v++;
                        vals.push(parsers[0](0, pos, tokens));
                    }

                    if (tokens[pos.v].type !== ')') {
                        return null;
                    }
                    pos.v++;
                    return funcInfo.func.apply(null, vals);
                } else {
                    return null;
                }
            } else {
                return parsers[level + 1](level + 1, pos, tokens);
            }
        };
    }
}
