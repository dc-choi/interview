let numArr: number[] = [1, 2, 3, 4, 5];
let strArr: string[] = ["one", "two", "three"];

let boolArr: Array<boolean> = [true, false, true]; // 제네릭을 사용함.

// 배열에 들어가는 요소들의 타입이 다양한 경우
let mixedArr: (string | number | boolean)[] = [1, "two", true];

// 다차원 배열의 타입을 정의하는 방법
let doubleArr: number[][] = [
  [1, 2, 3],
  [4, 5, 6],
];

// 튜플
// 길이와 타입이 고정된 배열
// 튜플은 각 요소의 타입과 길이를 명시적으로 정의해서 개발자의 의도를 명확히 할 수 있음.
let tuple1: [number, number] = [1, 2];
tuple1[0] = 3; // 첫 번째 요소는 number 타입이므로 변경 가능
// tuple1[1] = "four"; // 두 번째 요소는 number 타입이므로 오류 발생
// tuple1[2] = 1; // 세 번째 요소는 길이 제한 오류 발생

let tuple2: [string, number, boolean] = ["one", 1, true];

// 튜플은 기본적으로 JS로 동작해서 주의해서 사용해야 함.
tuple2.push("two");
tuple2.pop();
tuple2.pop();
tuple2.pop();