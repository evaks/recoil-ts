import {Table, TableRow} from "./table";
import {BehaviourOrType, StructType} from "../../frp/struct";
import {ColumnKey} from "./columnkey";
import {AvlTree} from "../avltree";
import {compare, compareKey, isEqual} from "../../util/object";
import {create, Inversable} from "./inversable";
import {Behaviour} from "../../frp/frp";
import {UniqKeyGenerator} from "./util";

export enum ChangeType {
    DELETE = 1, CHANGE = 2, ADD = 3, NONE = 0
}

export type ChangeColType = { type: ChangeType, changes: Map<ColumnKey<any>, any> }

/**
 * this class adds changed column to the table indicating it is changed
 * the inputs are
 * orig: is the original unchanged table, the primary keys are initially used to
 *       determine which keys match the others however if those primary keys change
 *       in table they will still map original primary keys
 * table: the table to add the change column to it must have a unique immutable primary key,
 *        but those keys do not have to match the orig, however all primary key columns must
 *        in orig must exist in table. Also, all the placed columns in table must exist orig.
 *        In order to add an immutable primary key to a table use recoil.structs.table.ImmutablePk
 * meta:  the metadata to add to the duplicates column
 * changeCol: the column key to use for the change column
 *
 * note any changes to cells (especially orig primary keys) should be done through the output, but removes and adds
 * should be done directly to table
 *
 */

export class ChangeCol implements Inversable<Table, {
    table: Table,
    orig: Table,
    meta: StructType,
    deleteMeta: StructType
}> {
    private readonly changeCol_: ColumnKey<ChangeColType>;
    private readonly origKeysCol_: ColumnKey<any[] | null>;
    private pkMap_ = new AvlTree<{ key: any[], orig: any[] }>(compareKey);
    private oldKeys_ = new AvlTree<any[]>(compare);

    constructor(changeCol: ColumnKey<{ type: ChangeType, changes: Map<ColumnKey<any>, any> }>) {
        this.changeCol_ = changeCol;
        this.origKeysCol_ = new ColumnKey('$orig.key');

    }


    /**
     * @param {{table:!recoil.structs.table.Table, meta:!Object, orig:?, deleteMeta:(undefined|Object)}} params
     * @return {!recoil.structs.table.Table}
     */
    calculate(params: { table: Table, orig: Table, meta: StructType, deleteMeta: StructType }): Table {
        let res = params.table.createEmptyAddCols(params.table.getPrimaryColumns(), [this.changeCol_, this.origKeysCol_]);
        res.setColumnMeta(this.changeCol_, params.meta);
        res.setMeta(params.table.getMeta());

        let pk = params.table.getPrimaryColumns()[0];
        let curRowMap = new AvlTree<{key:any[], row: TableRow}, {key:any[]}>(compareKey);
        let origKeys = new AvlTree<any[]>(compare);
        let keyGen = new UniqKeyGenerator(params.table);
        let pos = 0;
        let newRows = [];

        for (let {key} of params.orig) {
            origKeys.add(key);
        }

        // reset pkMap if the original primary keys have changed
        if (!isEqual(origKeys, this.oldKeys_)) {
            this.pkMap_ = new AvlTree<{ key: any[], orig: any[] }>(compareKey);
        }
        this.oldKeys_ = origKeys;
        // create a map from original to key to current row, and a list of new rows

        for (let {row, key: ids} of params.table) {
            let key = params.orig.getRowKeys(row);
            let origKey = this.pkMap_.findFirst({key: ids, orig: []});
            if (origKey) {
                key = origKey.orig;
            }

            curRowMap.add({key: key, row: row});
            if (!origKeys.findFirst(key)) {
                newRows.push(row);
            }
        }



        // we will put new rows on the end
        for (let {row: oldRow, key} of params.orig) {
            let curRow = curRowMap.findFirst({key: key});
            let newRow;
            if (curRow) {
                newRow = curRow.row.unfreeze();
                let changes = new Map<ColumnKey<any>, any>();
                let changed = false;
                for (let {key: col} of params.table.placedColumns()) {
                    let newVal = newRow.get(col);
                    let oldVal = oldRow.get(col);
                    let newMeta = params.table.getFullCellMeta(key, col);
                    if (!isEqual(newVal, oldVal) && newMeta.enabled !== false && newMeta.visible !== false) {
                        changes.set(col, oldVal);
                        changed = true;
                    }
                }
                newRow.set(this.origKeysCol_, key);
                newRow.set(this.changeCol_, {
                    changes: changes,

                    type: changed ? ChangeType.CHANGE :
                        ChangeType.NONE
                });
            } else {
                // pick a new primary key
                newRow = oldRow.unfreeze();
                newRow.set(pk, keyGen.nextPk());
                newRow.set(this.origKeysCol_, key);
                newRow.addRowMeta(params.deleteMeta);
                newRow.set(this.changeCol_, {changes: new Map(), type: ChangeType.DELETE});
            }
            newRow.setPos(pos++);
            res.addRow(newRow);
        }

        // new rows
        for (let row of newRows){
            let newRow = row.unfreeze();
            newRow.set(this.changeCol_, {changes: new Map<ColumnKey<any>, any>, type: ChangeType.ADD});
            newRow.setPos(pos++);
            newRow.set(this.origKeysCol_, null);
            res.addRow(newRow);
        }
        return res.freeze();
    };

    inverse(table: Table, sources: { table: Table, orig: Table, meta: StructType, deleteMeta: StructType }): {
        table: Table
    } {

        let dest = sources.table.createEmpty();
        let newPkMap = new AvlTree<{ key: any[], orig: any[] }>(compareKey);

        for (let {row, key} of table) {
            let change = row.get(this.changeCol_);

            if (change?.type === ChangeType.DELETE) {
                // do nothing row was deleted.
                // deleted rows cannot have there keys changed and are always the original

            } else {
                let oldKeys = row.get(this.origKeysCol_);

                if (oldKeys) {
                    let curKeys = sources.orig.getRowKeys(row);
                    if (!isEqual(curKeys, oldKeys)) {
                        newPkMap.add({key: key, orig: oldKeys});
                    }
                }
                dest.addRow(row);
            }
        }
        this.pkMap_ = newPkMap;
        return {table: dest.freeze()};
    }

    static createB(
        tableB: Behaviour<Table>,
        orig:BehaviourOrType<Table>, changeCol:ColumnKey<ChangeColType>, changeColMeta:BehaviourOrType<StructType>, deleteRowMeta:BehaviourOrType<StructType>) {
        return create(tableB.frp(), new ChangeCol(changeCol), {
            table: tableB,
            orig: orig,
            meta: changeColMeta,
            deleteMeta: deleteRowMeta
        });
    }
}
