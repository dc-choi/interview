/**
 * 타입 추론
 *
 * 타입을 명시하지 않아도 타입스크립트가 타입을 추론하는 기능
 */

let a = 1; // a: number
let b = "hello"; // b: string
let c = true; // c: boolean

let d = {
    id: 1,
    name: "TypeScript",
    nickname: "TypeScript",
    isGood: true
};

let { id, isGood, name, nickname } = d;
let [one, two, three] = [1, "hello", true];

let func = (msg = "hello") => {
    return msg; // 반환값에 따라 타입 추론
};

let e; // 암묵적으로 any로 추론됨.
e = 1;
e.toFixed();

e = "hello";
e.toUpperCase();
// e.toFixed(); // 런타임 오류

const str = "hello"; // str: "hello" (리터럴 타입)
const num = 1; // num: 1 (리터럴 타입)