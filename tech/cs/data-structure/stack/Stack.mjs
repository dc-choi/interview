import { LinkedList } from "../linkedList/LinkedList.mjs";

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