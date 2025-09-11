/**
 * 타입스크립트는 집합이다.
 *
 * 타입 호환성: 어떤 타입을 다른 타입으로 취급해도 괜찮은지 판단하는 것.
 * 대부분의 상황에서 다운캐스트는 불가능하고 업캐스트는 가능하다.
 */

// 기본 타입간의 호환성
let num: number = 1;
let num2 = 2;
let num3: number;

num3 = num;
num3 = num2;

console.log(num3);

// 객체 타입간의 호환성
// 어떤 객체타입을 다른 객체타입으로 취급해도 괜찮은가?
// 구조적 타이핑으로 인해 객체의 속성들이 호환되면 호환된다.
// 업캐스트: 속성이 더 적은 타입 <- 속성이 더 많은 타입
// 다운캐스트: 속성이 더 많은 타입 <- 속성이 더 적은 타입

// 슈퍼타입
type Animal = {
  name: string;
  age: number;
};

// 서브타입
type Dog = {
  name: string;
  age: number;
  breed: string;
};

let animal: Animal = {
  name: "기린",
  age: 3,
};

let dog: Dog = {
  name: "뽀삐",
  age: 2,
  breed: "진돗개",
};

console.log(animal);

animal = dog;
// dog = animal; // 오류

console.log(animal);
console.log(dog);

// 슈퍼타입
type Book = {
    title: string;
    price: number;
};

// 서브타입
type ProgrammingBook = {
    title: string;
    price: number;
    skill: string;
};

let book: Book = {
    title: "JavaScript",
    price: 25000,
    // skill: "JavaScript" // 초과 프로퍼티 검사
};

let pBook: ProgrammingBook = {
    title: "TypeScript",
    price: 30000,
    skill: "TypeScript"
};

const func = (b: Book) => {
    console.log(b);
};

func(book);
func(pBook); // 업캐스트
func({ title: "TypeScript", price: 30000 });
// func({ title: "TypeScript", price: 30000, skill: "TypeScript" }); // 초과 프로퍼티 검사
