// unknown
// 모든 타입을 허용하지 않는 타입임.
// 특정 변수의 타입을 우리가 확실히 모를 때 사용함.
// 타입 정제와 타입 좁히기를 통해서 사용함.

let unknownVariable: unknown = 1;
console.log(unknownVariable);

unknownVariable = "test";
console.log(unknownVariable);

unknownVariable = true;
console.log(unknownVariable);