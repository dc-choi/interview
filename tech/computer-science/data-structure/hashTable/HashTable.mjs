import { DoublyLinkedList } from "../linkedList/DoublyLinkedList.mjs";

class HashData {
    constructor(key, value) {
        this.key = key;
        this.value = value;
    }
}

export class HashTable {
    constructor() {
        this.arr = [];
        for (let i = 0; i < 10; i++) {
            this.arr.push(new DoublyLinkedList());
        }
    }

    hash(num) {
        return num % 10;
    }

    newHash(name) {
        return name.charCodeAt(0) % 10;
    }

    set(key, value) {
        this.arr[this.hash(key)].insert(new HashData(key, value));
    }

    get(key) {
        let current = this.arr[this.hash(key)].head;

        while (current !== null) {
            if (current.data.key === key) {
                return current.data.value;
            }
            current = current.next;
        }

        return null;
    }

    remove(key) {
        let list = this.arr[this.hash(key)];
        let current = list.head;
        let deletedIndex = 0;

        while (current !== null) {
            if (current.data.key === key) {
                return list.deleteAt(deletedIndex);
            }
            current = current.next;
            deletedIndex++;
        }

        return null;
    }
}