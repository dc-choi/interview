/**
 * keyof 연산자
 */

const person = {
    name: "Alice",
    age: 30,
};

type Person = typeof person;
// 뒤에 반드시 타입이 와야함.
// typeof가 나중에 선언되지만 먼저 연산됨.
type PersonKey = keyof Person;

const getProperty = (person: Person, key: PersonKey) => {
    return person[key];
};

const value = getProperty(person, "name");
console.log(value);