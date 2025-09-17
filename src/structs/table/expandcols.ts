/**
 * @fileoverview
 * tables may contain sub tables, represented as objects which we may want to access as just a table,
 * this
 */

import {MutableTableRow, Table, TableRowInterface} from "./table";
import {ColumnKey} from "./columnkey";
import {StructType} from "../../frp/struct";
import {Inversable} from "./inversable";

/**
 * @interface
 */
interface ExpandColsDef {
    getSubRow(row:TableRowInterface):TableRowInterface;
    setSubRow(row:MutableTableRow, isNew:boolean):void;
    getColumns():{col:ColumnKey<any>,meta:StructType}[];
    getSrcCol():ColumnKey<any>;
}


/**
 * @implements {recoil.frp.Inversable<!recoil.structs.table.Table,
 {table:!recoil.structs.table.Table,expand:!Array<!recoil.structs.table.ExpandColsDef>},
 {table:!recoil.structs.table.Table}>}>}
 * @constructor
 */
class ExpandCols implements Inversable<Table, {table:Table, expand:ExpandColsDef[]}>{
    calculate(params: { table: Table; expand: ExpandColsDef[]; }): Table {
        let table = params.table;
        let expandInfos = params.expand;
        let extraCols:ColumnKey<any>[] = [];
        let extraMeta:StructType[] = [];
        for (let info of expandInfos) {
            info.getColumns().forEach(function(colInfo) {
                extraCols.push(colInfo.col);
                extraMeta.push(colInfo.meta);
            });
        }
        let res = table.createEmpty(undefined, extraCols);

        for (let i = 0; i < extraCols.length; i++) {
            res.setColumnMeta(extraCols[i], extraMeta[i]);
        }
        for (let {row,key:pk} of table) {
            let mrow = row.unfreeze();
            expandInfos.forEach(function(info) {
                mrow.addColumns(info.getSubRow(row));
            });
            res.addRow(mrow);
        }
        return res.freeze();
    }
    /**
     * for now, we do not handle adding new rows, that would be like adding a new
     * column, or adding new columns
     */
    inverse(table: Table, sources: { table: Table; expand: ExpandColsDef[]; }): { table: Table} {
        let dest = sources.table.createEmpty();
        let expandInfos = sources.expand;

        for (let {row,key:pk} of table){
            let mrow = row.unfreeze();
            let isNew = !sources.table.getRow(pk);
            expandInfos.forEach(function(info) {
                info.setSubRow(mrow, isNew);
            });
            dest.addRow(mrow);
        }
        return {table: dest.freeze()};
    }
}


class PresenceDef<T> implements ExpandColsDef {
    private col_;
    /**
     * @param check function to check outer object exists, the first parameter is the row that we are setting/getting the second is true if we are setting, this should return true or false, or null if we should set the container to null
     * @param  col
     * @param {function (!Object,!recoil.structs.table.ColumnKey,!recoil.db.ChangeSet.Path): !Object} metaGetter this extracts meta data from the cell meta for the subcell
     *  for example errors
     * @param {!Array<{col:!recoil.structs.table.ColumnKey,path:!recoil.db.ChangeSet.Path,defaultVal:*,meta:(!Object|undefined)}>} subcols
     */
    constructor(check:(row:TableRowInterface,setting:boolean), col:ColumnKey<T>, metaGetter:(meta:StructType, col:ColumnKey<T>, path: Path), subcols) {

        this.metaGetter_ = metaGetter || function(meta, col, path) {return {};};
        this.check_ = check;
        this.col_ = col;
        this.subcols_ = subcols;
    }

/**
 * @param {!recoil.structs.table.TableRowInterface} row
 * @return {!recoil.structs.table.TableRowInterface}
 */
recoil.structs.table.ExpandCols.PresenceDef.prototype.getSubRow = function(row) {
    let res = new recoil.structs.table.MutableTableRow();
    let exists = this.check_(row, false);
    let val = row.get(this.col_);
    let meta = row.getCellMeta(this.col_);
    let metaGetter = this.metaGetter_;
    let col = this.col_;
    this.subcols_.forEach(function(info) {
        let curVal = exists ? val : null;
        if (exists) {
            let parts = info.path.parts();
            for (let i = 0; i < parts.length; i++) {
                let part = parts[i];
                if (curVal) {
                    if (info.map && i === parts.length - 1) {
                        curVal = curVal[info.map.from];
                    }
                    else {
                        curVal = curVal[part];
                    }
                }
            }

            res.addCellMeta(info.col, metaGetter(meta, col, info.path));
        }


        res.set(info.col, curVal);
    });
    return res;
};

/**
 * @final
 */
recoil.structs.table.ExpandCols.UNCHANGED = new Object();
/**
 * @param {!recoil.structs.table.MutableTableRow} row
 * @param {boolean} isNew
 */
recoil.structs.table.ExpandCols.PresenceDef.prototype.setSubRow = function(row, isNew) {
    let exists = this.check_(row, true);
    let unChanged = exists === recoil.structs.table.ExpandCols.UNCHANGED && !isNew;
    if (unChanged && !row.get(this.col_)) {
        return;
    }

    let val = recoil.util.object.clone(row.get(this.col_) || {});
    if (exists) {
        this.subcols_.forEach(function(info) {
            let newVal = row.get(info.col);
            if (newVal === null && info.defaultVal !== undefined) {
                newVal = info.defaultVal;
            }
            let prevVal = val;
            let parts = info.path.parts();

            for (let i = 0; i < parts.length - 1; i++) {
                let next = prevVal[parts[i]];
                if (unChanged && !next) {
                    return; // don't set anything that we can't
                }
                prevVal[parts[i]] = next || {};
                prevVal = prevVal[parts[i]];
            }

            if (info.map) {
                prevVal[info.map.from] = newVal;
            }
            else {
                prevVal[parts[parts.length - 1]] = newVal;
            }
        });
        row.set(this.col_, val);
    }
    else if (exists === null) {
        row.set(this.col_, null);
    }

};
/**
 * @return {!Array<{col:!recoil.structs.table.ColumnKey,meta:!Object}>}
 */
recoil.structs.table.ExpandCols.PresenceDef.prototype.getColumns = function() {
    let res = [];
    this.subcols_.forEach(function(info) {
        res.push({col: info.col, meta: info.meta || {}});
    });
    return res;
};

/**
 * @return {!recoil.structs.table.ColumnKey}
 */
recoil.structs.table.ExpandCols.PresenceDef.prototype.getSrcCol = function() {
    return this.col_;
};
