/**
 * 응용 사례들
 */

const swap = <T, U>(first: T, second: U): [U, T] => {
    return [second, first];
};

const [num, str] = swap(1, "hello");
console.log(num.toUpperCase()); // 'hello' -> 'HELLO'
console.log(str.toFixed(2)); // 1 -> 1.00

const returnFirstValue = <T,>(arr: [T, ...unknown[]]): T => {
    return arr[0];
};

const firstValue = returnFirstValue([1, "a", true]);
const firstValue2 = returnFirstValue(["a", 1, true]);
const firstValue3 = returnFirstValue([true, 1, "a"]);
console.log(firstValue);
console.log(firstValue2);
console.log(firstValue3);

const getLength = <T extends { length: number }>(data: T): number => {
    return data.length;
};

console.log(getLength("hello")); // 5
console.log(getLength([1, 2, 3, 4, 5])); // 5
