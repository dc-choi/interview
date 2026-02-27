/**
 * 함수 타입 표현식
 */

type Operation = (...rests: number[]) => number;
const add: Operation = (...rests) => rests.reduce((acc, value) => acc + value, 0);
const subtract: Operation = (...rests) => rests.reduce((acc, value) => acc - value, 0);
const multiply: Operation = (...rests) => rests.reduce((acc, value) => acc * value, 1);
const divide: Operation = (...rests) => rests.reduce((acc, value) => acc / value, 1);

console.log(add(1, 2)); // 3
console.log(subtract(1, 2)); // -1
console.log(multiply(1, 2)); // 2
console.log(divide(1, 2)); // 0.5

/**
 * 호출 시그니처
 *
 * 이렇게 하는 이유는 함수도 객체이기 때문이다.
 */

type Operations = { (...rests: number[]): number; };
const add2: Operations = (...rests) => rests.reduce((acc, value) => acc + value, 0);
const subtract2: Operations = (...rests) => rests.reduce((acc, value) => acc - value, 0);
const multiply2: Operations = (...rests) => rests.reduce((acc, value) => acc * value, 1);
const divide2: Operations = (...rests) => rests.reduce((acc, value) => acc / value, 1);

console.log(add2(1, 2)); // 3
console.log(subtract2(1, 2)); // -1
console.log(multiply2(1, 2)); // 2
console.log(divide2(1, 2)); // 0.5