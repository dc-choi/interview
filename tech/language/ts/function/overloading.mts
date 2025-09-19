/**
 * 함수 오버로딩
 *
 * 하나의 함수를 매개변수의 개수나 타입에 따라 여러가지 버전으로 정의하는 것
 *
 * 화살표 함수는 이게 불가능...!
 */

// 오버로드 시그니처
function func(x: number): void;
function func(x: number, y: number, z: number): void;

// 구현 시그니처
function func(x: number, y?: number, z?: number) {
    if (y === undefined && z === undefined) {
        console.log(`매개변수 1개: ${x}`);
    } else if (y !== undefined && z !== undefined) {
        console.log(`매개변수 3개: ${x}, ${y}, ${z}`);
    }
}

// func(); // error
func(1);
// func(1, 2); // error
func(1, 2, 3);