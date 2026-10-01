/**
 * 선언 합침
 *
 * 보통 라이브러리의 모듈이나 타입 정의 파일에서 많이 사용됨
 */

interface User {
    name: string;
}

interface User {
    // name: number; // Error: 'name'을 다른 타입으로 재선언 불가 (같은 타입 재선언은 허용)
    age: number;
}

const user: User = {
    name: "Alice",
    age: 30,
};

console.log(user);