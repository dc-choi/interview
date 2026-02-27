let user: object = {
    id: 1,
    name: "Alice",
};
// user.id = 2; // 오류 발생: 'id' 속성은 'object' 타입에 존재하지 않음
// object는 객체라는 의미로, 속성에 대한 타입을 명시하지 않음.

// 구조적 타입 시스템을 사용함. (프로퍼티를 기반으로 타입을 결정함.)
// 다른 언어는 명목적 타입 시스템을 사용함. (타입 이름을 기반으로 타입을 결정함.)
let user2: { id: number; name: string } = {
    id: 1,
    name: "Alice",
};
user2.id = 2; // 정상: 'id' 속성은 'number' 타입으로 정의됨

// 선택적 프로퍼티 (Optional Properties)
let user3: { id: number; name: string; age?: number } = {
    id: 1,
    name: "Alice",
    // age 속성은 선택적임. 정의하지 않아도 오류가 발생하지 않음.
};

// readonly
let config: { readonly apiKey: string; } = {
    apiKey: "12345",
};

// config.apiKey = "67890"; // 오류 발생: 'apiKey' 속성은 읽기 전용임