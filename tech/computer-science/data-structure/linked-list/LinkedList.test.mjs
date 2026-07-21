import assert from "node:assert/strict";
import test from "node:test";

import { LinkedList } from "./LinkedList.mjs";

test("inserts, reads, and deletes the requested node", () => {
    const list = new LinkedList();
    list.insert(1);
    list.insert(3);
    list.insertAt(1, 2);

    assert.equal(list.count, 3);
    assert.equal(list.getNode(1).data, 2);
    assert.equal(list.deleteAt(1).data, 2);
    assert.equal(list.getNode(1).data, 3);
    assert.equal(list.delete().data, 3);
    assert.equal(list.deleteAt(0).data, 1);
    assert.equal(list.count, 0);
});

test("rejects invalid indexes", () => {
    const list = new LinkedList();

    assert.throws(() => list.getNode(0), /Index out of bounds/);
    assert.throws(() => list.deleteAt(0), /Index out of bounds/);
    assert.throws(() => list.insertAt(1, 1), /Index out of bounds/);
});
