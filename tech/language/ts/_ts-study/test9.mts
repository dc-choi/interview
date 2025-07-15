/**
 * 결론적으로 깊은 복사는 타입만으로는 불가능.
 */

const original = { a: 1, b: { c: 2 } };
const copied = structuredClone(original); // 값 관점에서 복사.

type Original = typeof original;

type DeepCopy<T> = T extends Function
    ? T
    : T extends Array<infer U>
        ? DeepCopy<U>[]
        : T extends object
            ? { [K in keyof T]: DeepCopy<T[K]> }
            : T;

type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

const copied2: DeepCopy<Original> = original; // 타입 관점에서 복사

const copied3: DeepReadonly<Original> = structuredClone(original);

copied.a = 5;
copied.b.c = 5;

copied2.a = 2;
copied2.b.c = 3;

// TS2540: Cannot assign to a because it is a read-only property.
// copied3.a = 2;
// copied3.b.c = 3;

console.log(original); // { a: 1, b: { c: 2 } }
console.log(copied); // { a: 2, b: { c: 3 } }
console.log(copied2); // { a: 2, b: { c: 3 } }
console.log(copied3); // { a: 2, b: { c: 3 } }