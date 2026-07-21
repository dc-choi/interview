import assert from "node:assert/strict";
import test from "node:test";

import { DoublyLinkedList } from "./DoublyLinkedList.mjs";

test("maintains head, tail, and neighbor links", () => {
    const list = new DoublyLinkedList();
    list.insert(1);
    list.insert(3);
    list.insertAt(1, 2);

    assert.equal(list.head.data, 1);
    assert.equal(list.tail.data, 3);
    assert.equal(list.getNode(1).prev.data, 1);
    assert.equal(list.getNode(1).next.data, 3);
    assert.equal(list.deleteAt(1).data, 2);
    assert.equal(list.head.next, list.tail);
    assert.equal(list.tail.prev, list.head);
    assert.equal(list.delete().data, 3);
    assert.equal(list.delete().data, 1);
    assert.equal(list.head, null);
    assert.equal(list.tail, null);
});

test("rejects invalid indexes", () => {
    const list = new DoublyLinkedList();

    assert.throws(() => list.getNode(0), /Index out of bounds/);
    assert.throws(() => list.deleteAt(0), /Index out of bounds/);
    assert.throws(() => list.insertAt(1, 1), /Index out of bounds/);
});
