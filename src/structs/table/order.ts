/**
 * a utility to remember the order of a table
 */
import {MutableTable, MutableTableRow, TableRow, TableRowInterface} from "./table";
import {ColumnKey} from "./columnkey";
import {AvlTree} from "../avltree";


export class Order {
    private todo_:MutableTableRow[] = [];
    private pos_ = 0;
    private order_= new AvlTree<{keys: any[], pos: number}, {keys:any}>();
    private keys_:ColumnKey<any>[] = [];
    /**
     * call this before adding rows in order to previously added state
     */
    start() {
        this.todo_ = [];
        this.pos_ = 0;
    }
    addRow(row:MutableTableRow|TableRow) {
        this.todo_.push('unfreeze' in row  ? row.unfreeze() : row);
    }
    rememberStart(keys:ColumnKey<any>[]) {
        this.keys_ = keys;
        this.pos_ = 0;
        const comparator= (a:{keys:any[]}, b:{keys:any[]}) => {
            for (let i = 0; i < keys.length; i++) {
                let col = keys[i];
                let res = col.valCompare(a.keys[i], b.keys[i]);
                if (res !== 0) {
                    return res;
                }
            }
            return 0;
        };

        this.order_ = new AvlTree(comparator);
    }
    private getKeys_(row:TableRowInterface):any[] {
        return this.keys_.map(function(k) {return row.get(k);});
    }
    remember(row:TableRowInterface) {
        this.order_.add({keys: this.getKeys_(row), pos: this.pos_++});
    }

    /**
     * adds the rows in order to the table
     */
    apply (table:MutableTable) {
        let notFoundPos = this.order_ ? this.order_.getCount() : 0;
        for (let r of this.todo_) {
            let entry = this.order_.findFirst({keys: this.getKeys_(r)});
            if (entry) {
                r.setPos(entry.pos);
            }
            else {
                r.setPos(notFoundPos++);
            }
            table.addRow(r);
        }
        this.todo_ = [];
    }

}




