import { DoublyLinkedList } from "../linkedList/DoublyLinkedList.mjs";

export class Deque {
    constructor() {
        this.list = new DoublyLinkedList();
    }

    print() {
        this.list.print();
    }

    addFirst(data) {
        this.list.insertAt(0, data);
    }

    removeFirst() {
        return this.list.deleteAt(0);
    }

    addLast(data) {
        this.list.insert(data);
    }

    removeLast() {
        return this.list.delete();
    }

    isEmpty() {
        return this.list.count === 0;
    }
}