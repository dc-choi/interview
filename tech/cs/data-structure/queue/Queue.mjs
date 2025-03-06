import { DoublyLinkedList } from "../linkedList/DoublyLinkedList.mjs";

export class MyQueue {
    constructor() {
        this.list = new DoublyLinkedList();
    }

    enqueue(data) {
        this.list.insertAt(0, data);
    }

    dequeue() {
        try {
            return this.list.delete();
        } catch (e) {
            return null;
        }
    }

    front() {
        return this.list.tail;
    }

    isEmpty() {
        return this.list.count === 0;
    }
}