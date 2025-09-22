/**
 * 제네릭
 */

const func = <T,>(value: T) => {
    return value;
};

let a = func('hello');
console.log(a.trim());

let b = func(123);
console.log(b.toFixed());

let c = func<[number, number]>([100, 100_000]);
console.log(c);