class Node {
    constructor(data, next = null) {
        this.data = data;
        this.next = next;
    }
}

export class LinkedList {
    constructor() {
        this.head = null;
        this.count = 0;
    }

    insertAt(index, data) {
        const newNode = new Node(data);

        if (index < 0 || index > this.count) {
            throw new Error('Index out of bounds');
        }

        if (index === 0) {
            newNode.next = this.head;
            this.head = newNode;
        } else {
            let current = this.head;

            for (let i = 0; i < index - 1; i++) {
                current = current.next;
            }

            newNode.next = current.next;
            current.next = newNode;
        }

        this.count++;
    }

    insert(data) {
        this.insertAt(this.count, data);
    }

    print() {
        let current = this.head;
        let result = [];

        while (current) {
            result.push(current.data);
            current = current.next;
        }

        console.log(result.join(' => '));
    }

    clearAll() {
        this.head = null;
        this.count = 0;
    }

    deleteAt(index) {
        if (index < 0 || index >= this.count) {
            throw new Error('Index out of bounds');
        }

        let current = this.head;
        let deletedNode;

        if (index === 0) {
            deletedNode = this.head;
            this.head = this.head.next;
        } else {
            for (let i = 0; i < index - 1; i++) {
                current = current.next;
            }
            deletedNode = current;
            current.next = current.next.next;
        }

        this.count--;

        return deletedNode;
    }

    delete() {
        return this.deleteAt(this.count - 1);
    }

    getNode(index) {
        if (index < 0 || index >= this.count) {
            throw new Error('Index out of bounds');
        }

        let current = this.head;

        for (let i = 0; i < index; i++) {
            current = current.next;
        }

        return current;
    }
}