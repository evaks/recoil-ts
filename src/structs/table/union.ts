/**
 * allows columns to be renamed, it is useful to take one table
 * and make it look like another
 */
import {create, Inversable} from "./inversable";
import {MutableTable, Table, TableCell, TableRow} from "./table";
import {ColumnKey} from "./columnkey";
import {compareKey} from "../../util/object";
import {AvlTree} from "../avltree";
import {Behaviour} from "../../frp/frp";


export class Union implements Inversable<Table, { table1: Table, table2: Table }> {
    private primaryKey_: ColumnKey<any> | null;
    private uniq_: boolean;
    private concatPk_: string[] | undefined;
    private srcCol_: ColumnKey<number[]|null>;

    /**
     * @param uniqPk if this is true we will use the primary key of table1, otherwize an integer primary key will be generated
     *                         if this is true an error will be thrown if the union doesn't have a uniq primay key
     * @param uniq   this will remove duplicate rows if true
     * @param opt_srcCol supply column for src, allows adding
     * @param opt_concatPk if exists overrides uniqPk and will concat the associated index to the pk to make the key uniqu
     *                                      this only works if you have 1 string primary key that cannot end with the concatination
     */
    constructor(uniqPk: boolean, uniq: boolean, opt_srcCol?: ColumnKey<number[]|null>, opt_concatPk?: string[]) {
        this.primaryKey_ = uniqPk || opt_concatPk ? null : new ColumnKey('$id');
        this.uniq_ = uniq;
        this.concatPk_ = opt_concatPk;
        this.srcCol_ = opt_srcCol || new ColumnKey<number[]|null>('$src', undefined, undefined, null);
    }

    /**
     * @return every value in the row
     */
    private getRowValues_(table: Table, row: TableRow): any[] {
        let rowValues:any[] = [];
        for (let col of table.getColumns()){
            rowValues.push(row.get(col));
        }
        return rowValues;
    }

    calculate(params: { table1: Table, table2: Table }): Table {
        let tables = [params.table1, params.table2];

        let pks = this.primaryKey_ ? [this.primaryKey_] : tables[0].getPrimaryColumns();
        let other = this.primaryKey_ ? tables[0].getPrimaryColumns().concat(tables[0].getOtherColumns()) : tables[0].getOtherColumns();
        other = other.concat(this.srcCol_);
        let result = new MutableTable(pks, other);

        let seen = new AvlTree(compareKey);
        let removeDups = this.uniq_;
        let pos = 0;

        if (this.concatPk_ && pks.length > 1) {
            throw new Error('you can only have one pk to use concat pks');
        }

        for (let i = 0; i < tables.length; i++) {
            let table = tables[i];
            let pkConcat = this.concatPk_ ? this.concatPk_[i] : null;
            result.addMeta(table.getMeta());

            for (let col of table.getColumns()){
                result.addColumnMeta(col, table.getColumnMeta(col));
            }
            for (let {row, key} of table) {
                if (removeDups) {
                    let rowValues = this.getRowValues_(table, row);
                    let existing = seen.findFirst({key: rowValues});
                    if (existing) {
                        result.set(key,this.srcCol_, (result.get(key, this.srcCol_) || []).concat([i]));
                        continue;
                    }
                    seen.add({key: rowValues, row: row});
                }
                let newRow = row.setCell(this.srcCol_, new TableCell([i]));
                if (this.primaryKey_) {
                    newRow = newRow.setCell(this.primaryKey_, new TableCell(pos));
                } else if (this.concatPk_) {

                    newRow = newRow.set(pks[0], key[0] + this.concatPk_[i]);
                }
                result.addRow(newRow);
                pos++;
            }
        }
        return result.freeze();
    }

    /**
     * @param {!Table} table
     * @param {{table1:!Table, table2:!Table}} sources
     * @return {{table1:!Table, table2:!Table}}
     */
    inverse(table: Table, sources: { table1: Table, table2: Table }): { table1: Table, table2: Table } {
        let tables = [sources.table1.createEmpty(), sources.table2.createEmpty()];
        let keyCol = this.concatPk_ ? tables[0].getPrimaryColumns()[0] : null;
        for (let {row} of table) {
            let srcs = row.get(this.srcCol_) || [];
            for (let src of srcs) {
                if (src >= 0 && src < tables.length) {
                    let concatLen = this.concatPk_ ? this.concatPk_[src].length : 0;
                    if (keyCol) {
                        let key = row.get(keyCol);
                        let newKey = key.substr(0, key.length - concatLen);
                        row = row.set(keyCol, newKey);
                    }
                    tables[src].addRow(row);
                } else {
                    throw 'Unknown destination';
                }
            }
        }
        return {table1: tables[0].freeze(), table2: tables[1].freeze()};
    }


    /**
     * @param table1B
     * @param table2B
     * @param uniqPk if this is true we will use the primary key of table1, otherwize an integer primary key will be generated
     *                         if this is true an error will be thrown if the union doesn't have a uniq primay key
     * @param uniq   this will remove duplicate rows if true
     * @param opt_srcCol supply column for src, allows adding
     * @param opt_concatPk if exists overrides uniqPk and will concat the associated index to the pk to make the key uniqu
     *                                      this only works if you have 1 string primary key that cannot end with the concatination
     */

    static createB(table1B: Behaviour<Table>, table2B: Behaviour<Table>, uniqPk: boolean, uniq: boolean, opt_srcCol?: ColumnKey<number[]|null>, opt_concatPk?:string[]):Behaviour<Table> {
        return create(table1B.frp(), new Union(uniqPk, uniq, opt_srcCol, opt_concatPk),
            {table1: table1B, table2: table2B});
    }
}
