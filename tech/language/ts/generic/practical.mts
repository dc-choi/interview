/**
 * 응용 사례들
 */

// 여러 타입을 다루는 함수
const swap = <T, U>(first: T, second: U): [U, T] => {
    return [second, first];
};

const [num, str] = swap(1, "hello");
console.log(num.toUpperCase()); // 'hello' -> 'HELLO'
console.log(str.toFixed(2)); // 1 -> 1.00

// 배열의 첫 번째 요소 반환
const returnFirstValue = <T,>(arr: [T, ...unknown[]]): T => {
    return arr[0];
};

const firstValue = returnFirstValue([1, "a", true]);
const firstValue2 = returnFirstValue(["a", 1, true]);
const firstValue3 = returnFirstValue([true, 1, "a"]);
console.log(firstValue);
console.log(firstValue2);
console.log(firstValue3);

// length 프로퍼티가 있는 모든 타입에 대해 길이 반환
const getLength = <T extends { length: number }>(data: T): number => {
    return data.length;
};

console.log(getLength("hello")); // 5
console.log(getLength([1, 2, 3, 4, 5])); // 5

// 제네릭 인터페이스
interface KeyPair<K, V> {
    key: K;
    value: V;
}

let kp1: KeyPair<string, object> = { key: "one", value: { name: "Lee" } };
let kp2: KeyPair<boolean, string[]> = { key: true, value: ["Hello"] };

// 인덱스 시그니처에 제네릭 사용
interface MyMap<T> {
    [key: string]: T;
}

let numberMap: MyMap<number> = {
    one: 1,
    two: 2,
    three: 3
};

let stringMap: MyMap<string> = {
    name: "Lee",
    job: "developer"
};

let booleanMap: MyMap<boolean> = {
    done: true,
    loading: false
};

// 제네릭 타입 별칭
type MyMap2<VALUE> = {
    [key: string]: VALUE;
};

let numberMap2: MyMap2<number> = {
    one: 1,
    two: 2,
    three: 3
};