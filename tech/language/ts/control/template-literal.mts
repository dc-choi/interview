/**
 * 템플릿 리터럴 타입
 */

type Color = "red" | "blue" | "green";
type Animal = "cat" | "dog" | "pig" | "chicken" | "cow" | "sheep";

type Pet = `${Color}-${Animal}`; // 템플릿 리터럴 타입

const pet1: Pet = "red-cat"; // 유효
const pet2: Pet = "blue-dog"; // 유효
// const pet3: Pet = "yellow-bird"; // 오류: 'yellow-bird'는 'Pet' 타입에 할당할 수 없음