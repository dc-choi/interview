// enum 타입
// enum은 TypeScript에서 열거형을 정의하는 데 사용됩니다.
// 열거형은 관련된 상수 집합을 정의하는 데 유용합니다.
// enum은 컴파일 후에도 사라지지 않음. 즉시 실행 함수로 변경됨.

// 기본적으로 enum은 숫자 값을 가집니다.
enum Role {
    ADMIN, // 10을 추가하면 밑에서부터는 11, 12, 13, ...이 됩니다.
    USER,
    GUEST,
}

// enum은 문자열 값으로도 정의할 수 있습니다.
enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}