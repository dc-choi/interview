class DoublyNode {
    constructor(data, next = null, prev = null) {
        this.data = data;
        this.next = next;
        this.prev = prev;
    }
}

export class DoublyLinkedList {
    constructor() {
        this.head = null;
        this.tail = null;
        this.count = 0;
    }

    insertAt(index, data) {
        const newNode = new DoublyNode(data);

        if (index < 0 || index > this.count) {
            throw new Error('Index out of bounds');
        }

        if (index === 0) {
            newNode.next = this.head;
            if (this.head !== null) this.head.prev = newNode;
            this.head = newNode;
        } else if(index === this.count) {
            newNode.next = null;
            newNode.prev = this.tail;
            this.tail.next = newNode;
        } else {
            let current = this.head;
            for (let i = 0; i < index - 1; i++) {
                current = current.next;
            }
            newNode.next = current.next;
            newNode.prev = current;
            current.next = newNode;
            newNode.next.prev = newNode;
        }

        if (newNode.next === null) this.tail = newNode;

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

        console.log(result.join(' <=> '));
    }

    clearAll() {
        this.head = null;
        this.tail = null;
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
            if (this.head.next === null) {
                this.head = null;
                this.tail = null;
            } else {
                this.head = this.head.next;
                this.head.prev = null;
            }
        } else if (index === this.count - 1) {
            deletedNode = this.tail;
            this.tail.prev.next = null;
            this.tail = this.tail.prev;
        } else {
            for (let i = 0; i < index - 1; i++) {
                current = current.next;
            }
            deletedNode = current.next;
            current.next = current.next.next;
            current.next.prev = current;
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