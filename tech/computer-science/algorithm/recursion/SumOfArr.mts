import { strict as assert } from 'node:assert';

// ponytail: 재귀 깊이는 호출 스택에 제한된다. 큰 배열에는 reduce 또는 반복문을 사용한다.
const sumOfArr = (arr: readonly number[]): number => {
  if (arr.length === 0) return 0;
  return arr[0] + sumOfArr(arr.slice(1));
};

assert.equal(sumOfArr([]), 0);
assert.equal(sumOfArr([1, 2, 3, 4, 5]), 15);

console.log(sumOfArr([1, 2, 3, 4, 5])); // 15
