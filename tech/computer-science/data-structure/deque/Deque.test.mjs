import assert from "node:assert/strict";
import test from "node:test";

import { Deque } from "./Deque.mjs";

test("adds and removes values from both ends", () => {
    const deque = new Deque();

    deque.addFirst(2);
    deque.addFirst(1);
    deque.addLast(3);

    assert.equal(deque.removeFirst().data, 1);
    assert.equal(deque.removeLast().data, 3);
    assert.equal(deque.removeFirst().data, 2);
    assert.equal(deque.isEmpty(), true);
});

test("rejects removal from an empty deque", () => {
    const deque = new Deque();

    assert.throws(() => deque.removeFirst(), /Index out of bounds/);
    assert.throws(() => deque.removeLast(), /Index out of bounds/);
});
