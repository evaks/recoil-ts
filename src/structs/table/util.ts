/**
 * a class that given a table that has only has 1 integer primary key
 * will generate primary keys, not for a mutable table it does not check to
 * see if the table has changed, so all new keys should be added via this class
 * @constructor
 * @param {!recoil.structs.table.Table|!recoil.structs.table.MutableTable} table
 */
import {MutableTable, MutableTableRow, Table, TableInterface} from "./table";
import {AvlTree} from "../avltree";
import {ColumnKey} from "./columnkey";
import {compare} from "../../util/object";


export class UniqKeyGenerator {
    private usedPks_: AvlTree<number>;
    private curPk_: number;

    constructor(table: MutableTable | Table, opt_min:number = 0) {

        let primaryCols = table.getPrimaryColumns();
        if (primaryCols.length !== 1) {
            throw 'to generate pk you must have exactly 1 primary key';
        }
        let usedPks = new AvlTree<number>();
        let pos: number | undefined = 0;
        for (let {row, key} of table) {
            if (pos !== undefined) {
                let rowPos = row.pos();
                if (rowPos === undefined) {
                    pos = undefined;
                } else if (pos < rowPos) {
                    pos = rowPos + 1;
                }
            }
            if (typeof (key[0]) !== 'number') {
                throw new Error('cannot generate primary key on non number field');
            }
            usedPks.add(key[0]);
        }
        let curPk = opt_min;
        for (let val of usedPks) {
            if (curPk < val) {
                break;
            }
            if (curPk === val) {
                curPk++;
            }
        }
        this.usedPks_ = usedPks;
        this.curPk_ = curPk;
    }

    nextPk(): number {
        let res = this.curPk_;
        this.usedPks_.add(res);

        let curPk = this.curPk_ + 1;
        this.usedPks_.inOrderTraverse(function (val) {
            if (curPk < val) {
                return true;
            }
            if (curPk === val) {
                curPk++;
            }
            return false;
        }, curPk);

        this.curPk_ = curPk;
        return res;
    }
}


/**
 * a helper sets the list metadata of tables that have foreign keys that must be unique
 * @constructor
 * @param {!recoil.structs.table.Table|!recoil.structs.table.TableInterface} table
 * @param {!Array<{col:!recoil.structs.table.ColumnKey,options:Array}>} infos
 */

export type InfoType<T> = {col:ColumnKey<T>, options:T[]};

export class UniqueForeignKey {
    private infos_: InfoType<any>[];
    private optionsMap_: Map<ColumnKey<any>, any[]> = new Map();

    constructor(table: TableInterface, infos: InfoType<any>[]) {


        let freeMap = new Map<ColumnKey<any>, AvlTree<any>>();
        this.infos_ = infos;
        infos.forEach(function (info) {
            let free = new AvlTree(compare);
            freeMap.set(info.col, free);
            info.options.forEach(function (option) {
                free.add(option);
            });
        });

        for (let {row} of table) {
            for (let info of infos) {
                let free = freeMap.get(info.col);
                free?.remove(row.get(info.col));
            }
        }
        for (let info of infos) {
            let options = [];
            for (let opt of info.options) {
                let free = freeMap.get(info.col);
                if (free?.findFirst(opt)) {
                    options.push(opt);
                }
            }
            this.optionsMap_.set(info.col, options);
        }

    }

    /**
     * sets all the list metadata on a cells for the rows
     */
    setList(row: MutableTableRow): MutableTableRow {
        let me = this;
        for (let info of this.infos_) {
            let options = me.optionsMap_.get(info.col);
            row.addCellMeta(info.col, {list: [row.get(info.col)].concat(options)});
        }
        return row;
    }
}
