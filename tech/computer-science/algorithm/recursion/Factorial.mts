import { strict as assert } from 'node:assert';

const factorial = (n: number): number => {
  if (!Number.isInteger(n) || n < 0 || n > 18) {
    throw new RangeError('n must be an integer from 0 through 18');
  }
  if (n <= 1) return 1;
  return n * factorial(n - 1);
};

assert.equal(factorial(0), 1);
assert.equal(factorial(5), 120);
assert.throws(() => factorial(-1), RangeError);
assert.throws(() => factorial(1.5), RangeError);
assert.throws(() => factorial(19), RangeError);

console.log(factorial(5)); // 120
