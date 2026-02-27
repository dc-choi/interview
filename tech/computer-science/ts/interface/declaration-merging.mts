/**
 * 선언 합침
 *
 * 보통 라이브러리의 모듈이나 타입 정의 파일에서 많이 사용됨
 */

interface User {
    name: string;
}

interface User {
    // name: number; // Error: 'name' 중복 선언 불가
    age: number;
}

const user: User = {
    name: "Alice",
    age: 30,
};

console.log(user);