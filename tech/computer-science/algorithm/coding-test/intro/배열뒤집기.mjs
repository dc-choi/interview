import assert from 'node:assert/strict';

const solution = (numList) => numList.reverse();

assert.deepEqual(solution([1, 2, 3]), [3, 2, 1]);
