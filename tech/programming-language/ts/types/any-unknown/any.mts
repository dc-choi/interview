// any
// 모든 타입을 허용하는 타입임.
// 타입스크립트에서는 사용을 지양해야함.

let anyVariable: any = 1;
console.log(anyVariable);

anyVariable = "test";
console.log(anyVariable);

anyVariable = true;
console.log(anyVariable);
