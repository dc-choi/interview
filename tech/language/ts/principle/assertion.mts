/**
 * 타입 단언
 */

type Person = {
  name: string;
  age: number;
};
let person = {} as Person;
person.name = "Alice";
person.age = 30;
console.log(person);

type Dog = {
  name: string;
  breed: string;
};
let dog = {
    name: "Buddy",
    breed: "Golden Retriever",
    color: "Golden"
} as Dog;
console.log(dog);

// A as B
// A가 B의 슈퍼 타입이거나 서브타입이여야 함.
let num1 = 10 as never; // 가능
let num2 = 10 as unknown; // 가능

// let num3 = 10 as string; // 불가능
let num4 = 10 as unknown as string; // 가능, 근데 이건 TS를 사용하는 의미가 없음.

let num5 = 10 as const; // 가능

let cat = {
    name: "Kitty",
    breed: "Siamese",
    color: "Cream"
} as const;

// const 또는 readonly 변수에 할당을 시도합니다
// cat.name = "Kitty";

type Post = {
    title: string;
    author?: string;
};
let post: Post = {
    title: "TypeScript Tips",
    author: "John Doe"
};
const length: number = post.author!.length; // author가 무조건 존재한다고 단언
const length2: number = post.author?.length ?? 0; // author가 없으면 0 => 이게 더 안전
console.log(length);
console.log(length2);