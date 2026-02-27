class Test {
    constructor(private readonly name: string) {}

    getName() {
        return this.name;
    }
}

// 프로토타입으로 변경되는 예시 (이렇게 변경됨.)
// function Test(name) {
//     this.name = name;  // 인스턴스 프로퍼티
// }
// Test.prototype.getName = function() {
//     return this.name;
// };

console.log(typeof Test); // function
console.log(Test.prototype); // 프로토타입 객체로 나옴 ({}로 나옴)

const obj = new Test("test");
// @ts-ignore
console.log(obj.__proto__); // 프로토타입 객체로 나옴 ({}로 나옴)

// @ts-ignore
console.log(obj.__proto__ === Test.prototype); // true