import {create, Inversable} from "./inversable";
import {MutableTable, MutableTableRow, Table, TableCell, TableRow} from "./table";
import {ColumnKey} from "./columnkey";
import {AvlTree} from "../avltree";
import {compare, compareKey, isEqual} from "../../util/object";
import {Behaviour} from "../../frp/frp";

export class Join implements Inversable<Table, {left:Table,right:Table}> {
    private keyGetter1_: (row: TableRow) => any;
    private keyGetter2_: (row: TableRow) => any;
    private table2Pks_: ColumnKey<any>[];
    private defaultRow_: TableRow | undefined;
    private outer_: boolean;

    /**
     * @param keyGetter1 gets the join key out of the left table
     * @param keyGetter2 gets the join key out of the right table
     * @param opt_table2Pks extra primay keys from right table
     this is nessecary the right table can result in more than 1 row for each left table row
     * @param opt_defaultRow a row containing the default values if right row
     *             does not exist, if this is supplied then it is assumed this is an outer join
     * @param opt_outer is this an outer join
     *
     * notes on outer joins:
     * when doing an inversable outer join you should be careful that you do not set all the right columns to
     * match the default row (all nulls if none specified) since this will delete the right row from the output
     * table, but only if the keys still match the left table
     *
     */
    constructor(
        keyGetter1: (row: TableRow) => any,
        keyGetter2: (row: TableRow) => any,
        opt_table2Pks?: ColumnKey<any>[], opt_defaultRow?: TableRow, opt_outer?: boolean) {
        this.keyGetter1_ = keyGetter1;
        this.keyGetter2_ = keyGetter2;
        this.table2Pks_ = opt_table2Pks || [];
        this.defaultRow_ = opt_defaultRow;
        this.outer_ = opt_defaultRow ? true : !!opt_outer;
    }
    private static makeMap_(table: Table, keyGetter: (row: TableRow) => any): AvlTree<{ key: any, rows: TableRow[] }, {
        key: any
    }> {
        let rightMap = new AvlTree<{ key: any, rows: TableRow[] }, { key: any }>(compareKey);
        for (let {row} of table) {
            let key = keyGetter(row);
            let existing = rightMap.findFirst({key: key});
            if (existing) {
                existing.rows.push(row);
            } else {
                rightMap.add({key: key, rows: [row]});
            }
        }
        return rightMap;
    }

    calculate(tables: { left: Table, right: Table }): Table {
        let rightMap = Join.makeMap_(tables.right, this.keyGetter2_);

        let src = [];
        let pks = tables.left.getPrimaryColumns().concat(this.table2Pks_);
        let otherColumns = tables.left.getColumns()
            .filter(function (value) {
                return pks.indexOf(value) < 0;
            });
        let seen = new Set<ColumnKey<any>>(tables.left.getColumns());
        for (let col of tables.right.getColumns()) {
            if (pks.indexOf(col) < 0) {
                if (!seen.has(col)) {
                    otherColumns.push(col);
                    seen.add(col);
                }
            }
        }

        let result = new MutableTable(pks, otherColumns);

        result.setMeta(tables.left.getMeta());
        result.addMeta(tables.right.getMeta());
        for (let col of tables.left.getColumns()) {
            result.setColumnMeta(col, tables.left.getColumnMeta(col));
        }

        for (let col of tables.right.getColumns()) {
            result.addColumnMeta(col, tables.right.getColumnMeta(col));
        }

        for (let {row} of tables.left) {
            let key = this.keyGetter1_(row);
            let foundOtherRows = rightMap.findFirst({key: key});

            if (foundOtherRows || this.outer_) {
                let otherRows: (TableRow | MutableTableRow | null | undefined)[] = foundOtherRows ? foundOtherRows.rows : [null];
                for (let otherRow of otherRows) {
                    let curRow = new MutableTableRow(undefined, row);
                    otherRow = otherRow ? otherRow : this.defaultRow_;
                    if (otherRow) {
                        curRow.addRowMeta(otherRow.getRowMeta());
                    }
                    for (let col of tables.right.getColumns()) {
                        let val = otherRow ? otherRow.getCell(col) : null;
                        if (otherRow) {
                            curRow.setCell(col, otherRow.getCell(col) as TableCell<any>);
                        } else {
                            curRow.set(col, null);
                        }
                    }

                    result.addRow(curRow);
                }
            }
        }

        return result.freeze();
    }

    inverse(table: Table, sources: { left: Table, right: Table }): { left: Table, right: Table } {
        let leftRes = sources.left.createEmpty();
        let rightRes = sources.right.createEmpty();
        let me = this;


        let rightMap = Join.makeMap_(sources.right, me.keyGetter2_);
        let leftMap = Join.makeMap_(sources.left, me.keyGetter1_);
        // add items in left and right that are not in the other table
        [{tbl: sources.left, dest: leftRes, map: rightMap, getter: me.keyGetter1_},
            {tbl: sources.right, dest: rightRes, map: leftMap, getter: me.keyGetter2_}].forEach(
            (info) => {
                for (let {row} of info.tbl) {
                    if (!info.map.findFirst({key: info.getter(row)})) {
                        info.dest.addRow(row);
                    }
                }
            }
        );

        for (let {row} of table) {
            let leftRow = new MutableTableRow();
            let rightRow = new MutableTableRow();

            leftRes.getColumns().forEach(function (col) {
                let cell = row.getCell(col);
                if (cell) {
                    leftRow.setCell(col, cell);
                }
            });
            let existing = leftRes.getRow(leftRes.getRowKeys(leftRow));
            if (!existing) {
                leftRes.addRow(leftRow);
            } else if (!isEqual(existing, leftRow.freeze())) {
                console.error('dup', existing, leftRow.freeze());
                throw new Error('duplicate rows must be the same');
            }

            let matchesDefault = me.outer_;

            for (let col of rightRes.getColumns()) {
                let cell = row.getCell(col);
                if (cell) {
                    rightRow.setCell(col, cell);
                    let val = cell.getValue();
                    let defVal = me.defaultRow_ ? me.defaultRow_.get(col) : null;
                    if (!isEqual(val, defVal)) {
                        matchesDefault = false;
                    }
                }
            }

            // if the default key matches and the keys don't match
            if (matchesDefault && compare(
                me.keyGetter1_(leftRow.freeze()), me.keyGetter2_(rightRow.freeze())) !== 0) {
                continue;
            }

            existing = rightRes.getRow(rightRes.getRowKeys(rightRow));
            if (!existing) {
                rightRes.addRow(rightRow);
            } else if (!isEqual(existing, rightRow.freeze())) {
                console.error('dup', existing, rightRow.freeze());
                throw new Error('duplicate rows must be the same');
            }
        }

        return {left: leftRes.freeze(), right: rightRes.freeze()};
    }

    static createKeyJoin<T>(table1B: Behaviour<Table>, table2B: Behaviour<Table>, key1: ColumnKey<T>, opt_key2?: ColumnKey<T>): Behaviour<Table> {
        let keyGetter1 = (row: TableRow) => {
            return row.get(key1) as T;
        };
        let keyGetter2 = (row: TableRow) => {
            return row.get(opt_key2 || key1) as T;
        };
        let join = new Join(keyGetter1, keyGetter2);

        return create(table1B.frp(), join, {left: table1B, right: table2B});
    }


    /**
     * all rows will join with all other rows
     */
    createAllJoin(table1B: Behaviour<Table>, table2B: Behaviour<Table>): Behaviour<Table> {
        let keyGetter = function (row: TableRow) {
            return 1;
        };
        let join = new Join(keyGetter, keyGetter);

        return create(table1B.frp(), join, {left: table1B, right: table2B});
    }

    private static createMultiKeyJoin(table1B: Behaviour<Table>, table2B: Behaviour<Table>, keys1: ColumnKey<any>[], opt_keys2?: ColumnKey<any>[]) {
        let keyGetter1 = (row: TableRow): any[] => {
            let res = [];
            for (let key of keys1) {
                res.push(row.get(key));
            }
            return res;
        };
        let keyGetter2 = (row: TableRow): any[] => {
            let res:any[] = [];
            (opt_keys2 || keys1).forEach(function (key) {
                res.push(row.get(key));
            });
            return res;
        };
        let join = new Join(keyGetter1, keyGetter2);

        return create(table1B.frp(), join, {left: table1B, right: table2B});
    }
}
