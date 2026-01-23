import { LinkedList } from "../linkedList/LinkedList.mjs";
import { DoublyLinkedList } from "../linkedList/DoublyLinkedList.mjs";

export class MyStack {
    constructor() {
        this.list = new LinkedList();
    }

    push(data) {
        this.list.insertAt(0, data);
    }

    pop() {
        try {
            return this.list.deleteAt(0);
        } catch (e) {
            return null;
        }
    }

    peek() {
        return this.list.getNode(0);
    }

    isEmpty() {
        return this.list.count === 0;
    }
}

export class MyStack2 {
    constructor() {
        this.list = new DoublyLinkedList();
    }

    push(data) {
        this.list.insertAt(this.list.count, data);
    }

    pop() {
        try {
            return this.list.deleteAt(this.list.count - 1);
        } catch (e) {
            return null;
        }
    }

    peek() {
        return this.list.getNode(this.list.count - 1);
    }

    isEmpty() {
        return this.list.count === 0;
    }
}