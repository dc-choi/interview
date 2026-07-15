class Person {
    #firstName: string;
    #lastName: string;

    constructor(name: string) {
        [this.#firstName, this.#lastName] = name.split(' ');
    }

    get firstName() {
        return this.#firstName;
    }

    get lastName() {
        return this.#lastName;
    }
}

// 원래 의도
const person = new Person('John Doe');
console.log(person.firstName); // John
console.log(person.lastName); // Doe

// 책에서 말하는 ts의 구조적 특징으로 인해 오류 발생.
// TS2353: Object literal may only specify known properties, and name does not exist in type Person
// const wrong: Person = { name: 'John Doe' };

// 정말 구조적 타입 시스템을 사용하게 되는 경우 오류 발생.
// TS2739: Type {} is missing the following properties from type Person: #firstName, #lastName, firstName, lastName
// TS18016: Private identifiers are not allowed outside class bodies.
// const person2: Person = { #firstName: 'John', #lastName: 'Doe' };