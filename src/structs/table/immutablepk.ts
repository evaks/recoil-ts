/**
 * this class provides a mechinim to take a table with multiple, mutable primary
 * keys and convert it to a table that has 1 unique number primary key that does not change
 * it does so by creating a mapping from the old primary key to the new,
 * there are cases where the inverse will not set source table when the user has changed the original primary
 * so that it is not unique, in that case the output table will remain, and the DUPLICATES column will contain a list
 * of output primary keys that match
 */
import {ColumnKey} from "./columnkey";
import {create, Inversable} from "./inversable";
import {Table, TableRow} from "./table";
import {AvlTree} from "../avltree";
import {compareKey} from "../../util/object";
import {Behaviour} from "../../frp/frp";

export class ImmutablePk implements Inversable<Table, { table:Table }>{
    private pk_: ColumnKey<any>;
    private origPk_: ColumnKey<any>;
    private pkMap_: AvlTree<any>;
    private newDups_: {row:TableRow, pos:number}[] = [];

    constructor(opt_dupsCol?:ColumnKey<number[]>) {
        this.pk_ = new ColumnKey('$immutable.key');
        this.origPk_ = new ColumnKey('$orig.key', undefined, undefined, /** @type {Array} */ (null));
        this.DUPLICATES = opt_dupsCol || new ColumnKey<number[]>('$duplicate', undefined, undefined, []);
        // a map from the primary key to the generated primary key
        this.pkMap_ = new AvlTree(compareKey);
    }

    /**
     * @return {recoil.structs.table.ImmutablePk}
     */
    clone() {
        let res = new ImmutablePk(this.DUPLICATES);
        res.pk_ = this.pk_;
        res.origPk_ = this.origPk_;
        return res;
    }

    DUPLICATES = new ColumnKey('$duplicate', undefined, undefined,[] as number[]);

    static createB(tableB: Behaviour<Table>, opt_dupsCol?: ColumnKey<number[]>) {
        return create(tableB.frp(), new ImmutablePk(opt_dupsCol), {table: tableB});
    }
    /**
     * @param {{table:!recoil.structs.table.Table}} params
     * @return {!recoil.structs.table.Table}
     */
    calculate(params:{table:Table}):Table {
        let res = params.table.createEmptyAddCols([this.pk_], [this.origPk_, this.DUPLICATES]);
        let unsetPos = 0;
        let pos = 0;
        let toRemove = new AvlTree(compareKey);
        let primaryColumns = params.table.getPrimaryColumns();
        let pkToRowId = new AvlTree<{key:any[], ids:number[]}, {key:any[]}>(compareKey);
        const getDups = (pk:any[], id:number):number[] => {
            let dups = (pkToRowId.findFirst({key: pk}) as {key:any[], ids:number[]}).ids;
            if (dups.length === 1) {
                return [];
            } else {
                dups =dups.filter(v => v != id);
            }
            return dups;
        };
        // calculate the max primary key
        let usedOutPk = new AvlTree<number>();
        for (let v of this.newDups_){
            let id = v.row.get(this.pk_);
            let pk = params.table.getRowKeys(v.row);
            usedOutPk.add(id);
            pkToRowId.safeFind({key: pk, ids: []}).ids.push(id);
        }

        for (let v of this.pkMap_){
            toRemove.add(v);
            usedOutPk.add(v.id);
        }

        let freePk:number = usedOutPk.getCount() > 0 ? usedOutPk.getMaximum() + 1 : 0;

        for (let {row:immutableRow, key} of params.table) {
            let existingMapping = this.pkMap_.findFirst({key: key});
            toRemove.remove({key: key});
            if (existingMapping) {
                if (existingMapping.newPk) {
                    pkToRowId.safeFind({key: existingMapping.newPk, ids: []}).ids.push(existingMapping.id);
                } else {
                    pkToRowId.safeFind({key: key, ids: []}).ids.push(existingMapping.id);
                }
            } else {
                let pk = freePk;
                pkToRowId.add({key: key, ids: [pk]});
                this.pkMap_.add({key: key, id: pk});
                freePk++;
            }

        }


        for (let {row:immutableRow, key} of params.table) {
            // add all the duplicates that do not exist in the source
            let dups;
            while (unsetPos < this.newDups_.length && this.newDups_[unsetPos].pos <= pos) {
                let newRow = this.newDups_[unsetPos++].row.unfreeze();
                newRow.set(this.DUPLICATES, getDups(params.table.getRowKeys(newRow), newRow.get(this.pk_)));
                res.addRow(newRow);
            }

            let existingMapping = this.pkMap_.findFirst({key: key});
            toRemove.remove({key: key});
            let row = immutableRow.unfreeze();
            row.setPos(pos++);
            row.set(this.origPk_, key);
            let outSrcPk = key;


            row.set(this.pk_, existingMapping.id);
            if (existingMapping.newPk) {
                outSrcPk = existingMapping.newPk;
                for (let i = 0; i < primaryColumns.length; i++) {
                    let col = primaryColumns[i];
                    row.set(col, existingMapping.newPk[i]);
                }
            }

            row.set(this.DUPLICATES, getDups(outSrcPk, existingMapping.id));
            res.addRow(row);

        }

        while (unsetPos < this.newDups_.length && this.newDups_[unsetPos].pos <= pos) {
            res.addRow(this.newDups_[unsetPos++].row);
        }

        // remove items that are not seen from pkMap

        for (let v of toRemove) {
            this.pkMap_.remove(v);
        }

        return res.freeze();

    }

    inverse(table:Table, sources:{ table:Table }):{table:Table} {
        let dest = sources.table.createEmpty();
        let pkMap = new AvlTree(compareKey);
        let primaryColumns = sources.table.getPrimaryColumns();
        let otherColumns = sources.table.getOtherColumns();
        let byKey = new AvlTree<{key:any[], rows:TableRow[]},{key:any[]}>(compareKey);
        // first check for duplicates in the primary keys
        for (let {row, key} of table) {
            let sourceKey:any[] = [];
            primaryColumns.forEach(function (col) {
                sourceKey.push(row.get(col));
            });

            let existing = byKey.findFirst({key: sourceKey});
            if (existing) {
                existing.rows.push(row);
            } else {
                byKey.add({key: sourceKey, rows: [row]});
            }
        }

        // we will add to an empty table that way we don't care about any loops
        // or updating the primary key to something that is temporarily a duplicate
        // only real duplicates are a problem
        let existingDups = {};
        let newDups:{row:TableRow, pos:number}[] = [];
        for (let val of byKey) {
            if (val.rows.length === 1) {
                dest.addRow(val.rows[0]);
                pkMap.add({key: val.key, id: val.rows[0].get(this.pk_)});
            } else {
                // we have duplicates there are 2 types
                // new rows and existing rows
                for (let row of val.rows) {
                    let origPk = row.get(this.origPk_);
                    if (origPk === null) {
                        newDups.push({pos: row.pos() as number, row: row});

                    } else {
                        // change everything appart from the key
                        let origRow = (sources.table.getRow(origPk) as TableRow).unfreeze();
                        for (let i = 0; i < otherColumns.length; i++) {
                            let col = otherColumns[i];
                            origRow.setCell(col, row.getCell(col) as any);
                        }
                        dest.addRow(origRow);
                        pkMap.add({key: origPk, id: row.get(this.pk_), newPk: val.key});
                    }
                }
            }
        }
        this.newDups_ = newDups;
        this.pkMap_ = pkMap;
        return {table: dest.freeze()};
    }
}
