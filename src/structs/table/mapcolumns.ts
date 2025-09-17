/**
 * allows columns to be renamed, it is useful to take one table
 * and make it look like another
 *
 * @implements {recoil.frp.Inversable<!recoil.structs.table.Table,
 !>},
 !{table:!recoil.structs.table.Table}>}>}
 * @constructor
 *
 */
import {Inversable} from "./inversable";
import {MutableTable, MutableTableRow, Table} from "./table";
import {ColumnKey} from "./columnkey";

export class MapColumns implements Inversable<Table,{table:Table, mappings : {from : ColumnKey<any>, to: ColumnKey<any>}[]}> {
    calculate(params: { table: Table; mappings: { from: ColumnKey<any>; to: ColumnKey<any>; }[]; }): Table {
        let toMap = new Map<ColumnKey<any>, ColumnKey<any>>();
        params.mappings.forEach(function(mapping) {
            toMap.set(mapping.from, mapping.to);
        });



        let toPks = params.table.getPrimaryColumns().map(col => toMap.get(col) || col);
        let toOthers = params.table.getOtherColumns().map(col => toMap.get(col) || col);

        let  result = new MutableTable(toPks, toOthers);

        result.setMeta(params.table.getMeta());
        params.table.getColumns().forEach(function(col) {
            let newCol = toMap.get(col) || col;
            result.setColumnMeta(newCol, params.table.getColumnMeta(col));
        });

        for (let {row} of params.table) {
            // the unused columns should just be removed automatically
            let  newRow = new MutableTableRow(undefined, row);

            for (let mapping of params.mappings) {
                let  cell = row.getCell(mapping.from);
                if (cell) {
                    newRow.setCell(mapping.to, cell);
                }
            }

            result.addRow(newRow);
        }
        return result.freeze();
    }
    inverse(table: Table, sources: { table: Table; mappings: { from: ColumnKey<any>; to: ColumnKey<any>; }[]; }): { table: Table} {
        let  result = sources.table.createEmpty();
        let  fromMap = new Map<ColumnKey<any>, ColumnKey<any>>();
        for (let mapping of sources.mappings) {
            fromMap.set(mapping.to, mapping.from);
        }


        result.setMeta(table.getMeta());
        for (let col of table.getColumns()) {
            let  newCol = fromMap.get(col) || col;
            result.setColumnMeta(newCol, table.getColumnMeta(col));
        }


        for (let {row} of table) {

            let  newRow = new MutableTableRow(undefined, row);

            sources.mappings.forEach(function(mapping) {
                let  cell = row.getCell(mapping.to);
                if (cell) {
                    newRow.setCell(mapping.from, cell);
                }
            });


            result.addRow(newRow);
        }

        return {table: result.freeze()};
    }
}
