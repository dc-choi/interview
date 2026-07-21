import assert from "node:assert/strict";
import test from "node:test";

import { MyQueue } from "./Queue.mjs";

test("dequeues values in FIFO order", () => {
    const queue = new MyQueue();
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);

    assert.equal(queue.front().data, 1);
    assert.equal(queue.dequeue().data, 1);
    assert.equal(queue.dequeue().data, 2);
    assert.equal(queue.dequeue().data, 3);
    assert.equal(queue.dequeue(), null);
    assert.equal(queue.isEmpty(), true);
});
