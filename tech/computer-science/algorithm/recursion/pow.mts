import { strict as assert } from 'node:assert';

const pow = (x: number, n: number): number => {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new RangeError('n must be a non-negative safe integer');
  }
  if (n === 0) return 1;

  const half = pow(x, Math.floor(n / 2));
  return n % 2 === 0 ? half * half : half * half * x;
};

assert.equal(pow(2, 0), 1);
assert.equal(pow(2, 5), 32);
assert.throws(() => pow(2, -1), RangeError);
assert.throws(() => pow(2, 0.5), RangeError);

console.log(pow(2, 5)); // 32
