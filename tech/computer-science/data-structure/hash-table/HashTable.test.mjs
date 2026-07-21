import assert from "node:assert/strict";
import test from "node:test";

import { HashTable } from "./HashTable.mjs";

test("stores, finds, and removes colliding numeric keys", () => {
    const hashTable = new HashTable();

    hashTable.set(1, "first");
    hashTable.set(11, "second");
    hashTable.set(21, "third");

    assert.equal(hashTable.get(1), "first");
    assert.equal(hashTable.get(11), "second");
    assert.equal(hashTable.get(21), "third");
    assert.equal(hashTable.remove(11).data.value, "second");
    assert.equal(hashTable.get(11), null);
    assert.equal(hashTable.get(21), "third");
    assert.equal(hashTable.remove(999), null);
});

test("derives a stable bucket from the first string character", () => {
    const hashTable = new HashTable();

    assert.equal(hashTable.newHash("이운재"), 0);
    assert.equal(hashTable.newHash("최진철"), 2);
});

test("updates an existing key instead of adding a duplicate", () => {
    const hashTable = new HashTable();

    hashTable.set(1, "old");
    hashTable.set(1, "new");

    assert.equal(hashTable.get(1), "new");
    assert.equal(hashTable.arr[1].count, 1);
});

test("normalizes negative integer keys", () => {
    const hashTable = new HashTable();

    hashTable.set(-1, "negative");

    assert.equal(hashTable.hash(-1), 9);
    assert.equal(hashTable.get(-1), "negative");
    assert.equal(hashTable.remove(-1).data.value, "negative");
});

test("rejects non-integer numeric keys", () => {
    const hashTable = new HashTable();

    assert.throws(() => hashTable.set(1.5, "fraction"), TypeError);
    assert.throws(() => hashTable.set(Number.NaN, "nan"), TypeError);
});
