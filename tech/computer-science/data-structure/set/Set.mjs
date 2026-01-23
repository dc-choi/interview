import { HashTable } from "../hashTable/HashTable.mjs";

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
        this.hashTable.arr.map((data) => {
            if (data.head !== null) {
                this.hashTable.remove(data.head.data.key);
            }
        });
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
