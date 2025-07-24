import {AvlTree} from "./avltree";


/**
 * Constructs a Priority Queue that if an item with the same priority is already in the queue is added then nothing is
 * done
 *
 */

export class UniquePriorityQueue<T> {
	private tree: AvlTree<T>;
	constructor(comparator: (x: T, y: T) => number) {
		this.tree = new AvlTree<T>(comparator);
	}

	/**
	 * add a value to the queue unless it already exists
	 *
	 * return Whether value was inserted into the tree.
	 */
	
	push(value : T) : boolean {
		if (this.tree.contains(value)) {
			return false;
		}
		return this.tree.add(value);
	}


	/**
	 * remove an item from the queue, specified item
	 */
	
	remove (val:T):T| null {
		return this.tree.remove(val);
	};

	/**
	 * remove an item from the queue, returns undefined if empty
	 */
	
	pop() :T|undefined {
		if (this.tree.getCount() === 0) {
			return undefined;
		}
		var val = this.tree.getMinimum();
		
		this.tree.remove(val);
		return val;
	}
	
	/**
	 * return if the queue is empty
	 *
	 */

	isEmpty() : boolean {
		return this.tree.getCount() === 0;
	}
	

	/**
	 * make queue as an array
	 */

	asArray(): T[] {
		return [...this.tree];
	}
}
