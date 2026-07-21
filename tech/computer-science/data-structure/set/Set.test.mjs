import assert from "node:assert/strict";
import test from "node:test";

import { MySet } from "./Set.mjs";

test("stores unique values and removes them", () => {
    const set = new MySet();

    set.add(1);
    set.add(1);
    set.add(2);

    assert.equal(set.isContains(1), true);
    assert.equal(set.hashTable.arr[1].count, 1);
    set.remove(1);
    assert.equal(set.isContains(1), false);
    assert.equal(set.isContains(2), true);
});

test("clear removes every value from colliding buckets", () => {
    const set = new MySet();
    set.add(1);
    set.add(11);
    set.add(21);

    assert.equal(set.hashTable.arr[1].count, 3);
    set.clear();

    assert.equal(set.isEmpty(), true);
    assert.equal(set.isContains(1), false);
    assert.equal(set.isContains(11), false);
    assert.equal(set.isContains(21), false);
});
