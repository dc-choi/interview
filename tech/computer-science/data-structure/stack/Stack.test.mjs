import assert from "node:assert/strict";
import test from "node:test";

import { MyStack, MyStack2 } from "./Stack.mjs";

for (const Stack of [MyStack, MyStack2]) {
    test(`${Stack.name} pops values in LIFO order`, () => {
        const stack = new Stack();
        stack.push(1);
        stack.push(2);
        stack.push(3);

        assert.equal(stack.peek().data, 3);
        assert.equal(stack.pop().data, 3);
        assert.equal(stack.pop().data, 2);
        assert.equal(stack.pop().data, 1);
        assert.equal(stack.pop(), null);
        assert.equal(stack.isEmpty(), true);
    });
}
