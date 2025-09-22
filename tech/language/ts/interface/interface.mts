/**
 * 인터페이스
 *
 * 상호간에 약속된 규칙이라는 의미를 가지고 있다.
 *
 * 객체의 구조를 정의하는데 특화된 문법을 제공한다.
 *
 * 상속, 합성 등의 개념을 통해 재사용성을 높일 수 있다.
 */

interface Person {
    readonly name: string;
    age?: number;
    greet?(): void;
    say?(): void;
}

const person: Person = {
    name: "John",
    age: 30,
};
console.log(person);

const person2: Person = {
    name: "Jane",
    age: 25,
    greet() {
        console.log(`Hello, my name is ${this.name}`);
    },
    say() {
        console.log(`I am ${this.age} years old`);
    },
};
person2.greet();
person2.say();

// person.name = "John";