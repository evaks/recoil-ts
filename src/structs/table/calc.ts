import {ColumnKey} from "./columnkey";
import {StructType} from "../../frp/struct";
import {MutableTable, MutableTableRow, Table, TableCell, TableRow} from "./table";
import {addProps, isEqual} from "../../util/object";

export type CalcAddInfo = {key:ColumnKey<any>,meta?:StructType,pk?:boolean}
export type CalcAddInfos = CalcAddInfo[];
export type CalcRemoveInfos = ColumnKey<any>[];
export type CalcRowFunc = (r:MutableTableRow) => void;
export type CalcColMetaFunc = (t:Table, m:MutableTable)=> void;
export type CalcColMeta = CalcColMetaFunc|StructType;

/**
 * @constructor
 */
export class CalcTable {
    private readonly calculators_: {
        added: CalcAddInfos,
        removed: CalcRemoveInfos,
        calc: CalcRowFunc,
        inv: CalcRowFunc,
        colMeta: CalcColMetaFunc
    }[];
    private meta_: StructType;
    private origCol_: ColumnKey<TableRow | null>;
    private origOutCol_: ColumnKey<TableRow | null>;

    constructor() {
        this.calculators_ = [];
        this.meta_ = {};
        this.origCol_ = new ColumnKey<TableRow | null>('$orig', undefined, undefined, null);
        this.origOutCol_ = new ColumnKey<TableRow | null>('$orig-out', undefined, undefined, null);
    }


    /**
     * this will add meta to the table
     */
    addMeta(meta: StructType) {
        addProps(this.meta_, meta);
    }

    addRowCalc(addedColumns: CalcAddInfos, removedColumns: CalcRemoveInfos, calc: CalcRowFunc, opt_inverse?: CalcRowFunc, opt_colMeta?: CalcColMetaFunc) {
        opt_inverse = opt_inverse || (() => {
        });
        opt_colMeta = opt_colMeta || (() => {
        });
        this.calculators_.push({
            added: addedColumns,
            removed: removedColumns,
            calc: calc,
            inv: opt_inverse,
            colMeta: opt_colMeta
        });
    }

    replaceCol<N, O>(newCol: ColumnKey<N>, oldCol: ColumnKey<O>, calc: (v: O) => N, opt_inverse?: (v: N) => O, opt_colMeta?: CalcColMeta) {
        this.addRowCalc([{key: newCol}], [oldCol], this.valueToRowFunc_(oldCol, newCol, calc), this.valueToRowFunc_(newCol, oldCol, opt_inverse), this.colMetaFunc_(newCol, opt_colMeta));
    }

    /**
     * @template N,O
     * @param {!ColumnKey<N>} newCol
     * @param {!ColumnKey<O>} oldCol
     * @param {!function(O):N} calc
     * @param {!function(O):N=} opt_inverse
     * @param {!CalcColMeta=} opt_colMeta
     */
    addCol<N, O>(newCol: ColumnKey<N>, oldCol: ColumnKey<O>, calc:(v:O) => N, opt_inverse?:(v:N) => O, opt_colMeta?:CalcColMeta) {
        this.addRowCalc([{key: newCol}], [], this.valueToRowFunc_(oldCol, newCol, calc), this.valueToRowFunc_(newCol, oldCol, opt_inverse), this.colMetaFunc_(newCol, opt_colMeta));
    }


    /**
     * @param {!ColumnKey} col
     */
    removeCol(col:ColumnKey<any>) {
        this.addRowCalc([], [col],  ()=> undefined,  () => undefined);
    }
    private valueToRowFunc_<F,T>(fromCol:ColumnKey<F>, toCol:ColumnKey<T>, calc:((v:F)=> T) | undefined): (row:MutableTableRow) => void {
        return (row) => {
            if (calc) {
                row.set(toCol, calc(row.get(fromCol) as F));
            }
        };
    }

    private colMetaFunc_(col:ColumnKey<any>, meta?:CalcColMeta): CalcColMetaFunc {
        if (meta instanceof Function) {
            return meta;
        }

        return (from: Table, to: MutableTable) => {
            if (meta) {
                to.addColumnMeta(col, meta);
            }
        };
    }

    private cellToRowFunc_<F, T>(fromCol: ColumnKey<F>, toCol: ColumnKey<T>, calc: (from: TableCell<F>) => TableCell<T>): (r: MutableTableRow) => void {
        return function (row: MutableTableRow) {
            if (calc) {
                row.setCell(toCol, calc(row.getCell(fromCol) as TableCell<F>));
            }
        };
    }

    private makeEmptyTable_(table: Table): MutableTable {
        let toMap = function (keys: ColumnKey<any>[]) {
            let res = new Map<ColumnKey<any>, any>();

            for (let c of keys) {
                res.set(c, c);
            }
            return res;
        };

        // work out the new columns
        let pks = table.getPrimaryColumns();
        let other = table.getOtherColumns();
        let pkMap = toMap(pks);
        let otherMap = toMap(other);
        let allPossible = pks.concat(other);
        for (let calc of this.calculators_) {

            for (let remove of calc.removed) {
                pkMap.delete(remove);
                otherMap.delete(remove);
            }
            for (let add of calc.added) {
                allPossible.push(add.key);
                if (add.pk) {
                    pkMap.set(add.key, add.key);
                } else {
                    otherMap.set(add.key, add.key);
                }
            }
        }


        let seen = new Set<ColumnKey<any>>();
        pks = allPossible.filter(function (col) {
            if (!pkMap.has(col) || seen.has(col)) {
                return false;
            }
            seen.add(col);
            return true;
        });

        other = allPossible.filter((col) => {
            if (!otherMap.has(col) || seen.has(col)) {
                return false;
            }
            seen.add(col);
            return true;
        }).concat([this.origCol_, this.origOutCol_]);


        let res = new MutableTable(pks, other);
        res.setMeta(table.getMeta());

        // copy over column meta data
        for (let col of table.getColumns()) {
            if (otherMap.has(col) || pkMap.has(col)) {
                res.setColumnMeta(col, table.getColumnMeta(col));
            }
        }

        for (let calc of this.calculators_) {

            for (let col of calc.added) {
                if (col.meta && (otherMap.has(col.key) || pkMap.has(col.key))) {
                    res.addColumnMeta(col.key, table.getColumnMeta(col.key));
                }
            }
        }
        return res;
    }

    /**
     * @param {!recoil.structs.table.Table} table
     * @return {!recoil.structs.table.Table}
     */
    calculate(table: Table): Table {
        let mtable = table.unfreeze();
        let res = this.makeEmptyTable_(table);
        // TODO allow calculation col meta data
        for (let calc of this.calculators_) {
            calc.colMeta(table, res);
        }

        for (let {row} of table) {
            let mutRow = new MutableTableRow(undefined, row);
            this.calculators_.forEach(function (calc) {
                calc.calc(mutRow);
            });
            mutRow.set(this.origOutCol_, mutRow.freeze());
            mutRow.set(this.origCol_, row);
            res.addRow(mutRow);
        }

        return res.freeze();

    }


    inverse(table: Table, orig: Table):Table {
        let res = orig.createEmpty();
        let me = this;

        for (let {row, key} of table) {
            let origRow = row.get(me.origCol_) as TableRow;
            let origOutRow = row.get(me.origOutCol_) as TableRow;
            let mutRow = new MutableTableRow(undefined, row);

            // put cell don't exist in new but do exist original
            for (let col of orig.getColumns()) {
                let newCell = mutRow.getCell(col);
                if (!newCell) {
                    let oldCell = origRow.getCell(col);
                    if (oldCell) {
                        mutRow.setCell(col, oldCell);
                    }
                }
            }


            me.calculators_.forEach(function (calc) {
                // check an output of this calculator has changed
                let changed = false;
                for (let i = 0; i < calc.added.length && !changed; i++) {
                    let col = calc.added[i].key;
                    let orig = origRow ? origOutRow.getCell(col) : null;
                    let cur = row.getCell(col);

                    if (cur &&
                        (!orig ||
                            !isEqual(orig.getValue(), cur.getValue()))) {
                        changed = true;
                    }
                }
                if (changed) {
                    calc.inv(mutRow);
                }
            });
            res.addRow(mutRow);
        }

        return res.freeze();

    }
}