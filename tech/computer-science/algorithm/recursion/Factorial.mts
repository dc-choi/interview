import { throws } from 'node:assert';

const factorial = (n: number): number => {
  if (!Number.isInteger(n) || n < 0 || n > 18) {
    throw new RangeError('n must be an integer from 0 through 18');
  }
  if (n <= 1) return 1;
  return n * factorial(n - 1);
};

throws(() => factorial(-1), RangeError);
console.log(factorial(0)); // 1
