/**
 * 타입 단언
 */
var _a, _b;
var person = {};
person.name = "Alice";
person.age = 30;
console.log(person);
var dog = {
    name: "Buddy",
    breed: "Golden Retriever",
    color: "Golden"
};
console.log(dog);
// A as B
// A가 B의 슈퍼 타입이거나 서브타입이여야 함.
var num1 = 10; // 가능
var num2 = 10; // 가능
// let num3 = 10 as string; // 불가능
var num4 = 10; // 가능, 근데 이건 TS를 사용하는 의미가 없음.
var num5 = 10; // 가능
var cat = {
    name: "Kitty",
    breed: "Siamese",
    color: "Cream"
};
var post = {
    title: "TypeScript Tips",
    author: "John Doe"
};
var length = post.author.length; // author가 무조건 존재한다고 단언
var length2 = (_b = (_a = post.author) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0; // author가 없으면 0 => 이게 더 안전
console.log(length);
console.log(length2);
export {};
