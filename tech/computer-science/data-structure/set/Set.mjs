import { HashTable } from "../hash-table/HashTable.mjs";

export class MySet {
    constructor() {
        this.hashTable = new HashTable();
    }

    add(data) {
        if (this.hashTable.get(data) === null) {
            this.hashTable.set(data, data);
        }
    }

    isContains(data) {
        return this.hashTable.get(data) !== null;
    }

    remove(data) {
        if (this.hashTable.get(data) !== null) {
            this.hashTable.remove(data);
        }
    }

    clear() {
        for (const bucket of this.hashTable.arr) {
            bucket.clearAll();
        }
    }

    isEmpty() {
        let empty = true;

        this.hashTable.arr.some((data) => {
            if (data.count > 0) {
                empty = false;
                return true;
            }
        });

        return empty;
    }

    print() {
        this.hashTable.arr.map((data) => {
            let current = data.head;

            while (current !== null) {
                console.log(current.data.key);
                current = current.next;
            }
        });
    }
}
