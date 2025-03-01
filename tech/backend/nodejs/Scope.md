### 스코프
JS 엔진이 식별자를 검색할 때 사용하는 규칙

- Lexical Scope
```
변수 및 함수, 블록 스코프를 어디에 작성하였는가에 따라 정해지는 것.

Lexical이라는 명칭이 붙은 이유는 JS 컴파일러가 소스코드를 토큰으로 쪼개서 의미를 부여하는 렉싱(Lexing) 단계에 해당 스코프가 확정되기 때문이다.

쉽게 말하면, 변수 및 함수, 블록이 어디에 써있는가를 보고 그 스코프를 판단하면 된다.
```

- Scope chain
```
현재 스코프에서 식별자를 검색할 때 상위 스코프를 연쇄적으로 찾아나가는 방식

다음과 같은 과정으로 스코프 체인을 검색한다.

1. 현재 실행 컨텍스트의 LexicalEnvironment의 EnvironmentRecord에서 식별자를 검색한다.

2. 없으면 outer 참조값으로 스코프 체인을 타고 올라가 상위 스코프의 EnvironmentRecord에서 식별자를 검색한다.

3. 이를 outer 참조값이 null일 때까지 계속하고, 찾지 못한다면 에러를 발생시킨다.
```

- Function Scope
```
함수 스코프에서는 변수가 함수 전체 범위에 걸쳐 유효함.

var 키워드로 선언된 변수는 함수 스코프를 따름.

함수 내에서 선언된 변수는 함수 외부에서 접근할 수 없음.

하지만, if, for 같은 블록 내부에서 선언된 변수도 블록 외부에서 접근 가능함.
```

- Block Scope
```
블록 스코프에서는 변수가 블록 내부에서만 유효함.

let과 const 키워드로 선언된 변수는 블록 스코프를 따름.

블록 외부에서 변수에 접근하려고 하면 ReferenceError가 발생함.
```