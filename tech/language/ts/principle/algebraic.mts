/**
 * 대수타입
 *
 * 여러개의 타입을 합성해서 새롭게 만들어낸 타입
 *
 * Union, Intersection
 */

// Union
let union: string | number | boolean;
union = "hello";
console.log(union);
union = 123;
console.log(union);
union = true;
console.log(union);

let arr : (string | number | boolean)[];
arr = ["hello", 123, true];
console.log(arr);

type Person = {
    name: string;
    age: number;
};

type Developer = {
    name: string;
    skills: string[]
};

// | 연산자로 두 타입을 합성
type Union = Person | Developer;

let me: Union = {
    name: "홍길동",
    age: 30,
    skills: ["TypeScript"],
};
console.log(me);

// 타입의 집합을 고민했을 때 아무 곳에서도 속하지 않아 오류 발생.
// let you: Developer = {
//     name: "김철수",
// };
// console.log(you);

// Intersection
type Animal = {
    name: string;
    breed: string;
};

type Intersection = Animal & Person;

let intersection: Intersection = {
    name: "뽀삐",
    breed: "진돗개",
    age: 3,
};
console.log(intersection);