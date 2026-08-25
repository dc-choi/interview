---
tags: [cs, javascript, expression, operator, coercion, control-flow]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["JavaScript Expressions and Control Flow", "JavaScript 표현식 연산자 제어 흐름"]
---

# JavaScript 표현식, 타입 변환과 제어 흐름

JavaScript 문법을 외우는 것보다 중요한 것은 어떤 expression이 어떤 값을 만들고, 그 전에 어떤 type conversion이 일어나며, 어느 statement가 다음 실행 위치를 바꾸는지 추적하는 일이다. 브라우저 기능을 조합하는 언어라는 강점도 이 실행 규칙 위에서만 안전하게 쓸 수 있다.

## 실행 환경과 코드 배치

- HTML의 classic external script에 `defer`를 지정하면 parsing을 막지 않고 문서 parsing 뒤, `DOMContentLoaded` 전에 문서 순서대로 실행한다. inline classic script의 `defer`는 효과가 없다.
- module script는 기본적으로 deferred하게 처리되지만 dependency graph와 top-level await 때문에 완료 시점을 classic script와 같다고 단정하지 않는다.
- JavaScript는 DOM, Canvas, SVG, WebSocket, device API 같은 host 기능을 제어한다. 언어 기능과 browser/Node.js가 제공하는 host API를 구분한다.
- `console.log`와 `debugger`는 관찰 도구다. production 동작이나 오류 처리 계약을 대신하지 않는다.

좋은 출발점은 기술 시연이 아니라 사용자 행위, 실패 조건과 관찰 가능한 결과를 먼저 정하는 것이다.

## 값, 타입과 선언

현재 ECMAScript의 primitive type은 Undefined, Null, Boolean, String, Symbol, Number, BigInt이고 나머지 language value는 Object다. 과거 ES5 목록만으로 현재 타입 체계를 설명하지 않는다.

```ts
typeof null; // "object", 역사적으로 남은 결과
typeof 1n;   // "bigint"
```

- 변수에는 값이 저장되고 동적 타입은 현재 값에 붙는다. 변수 자체가 영구적으로 Number나 String이 되는 것은 아니다.
- `undefined`는 미초기화/부재의 기본 신호로 자주 쓰이고 `null`은 보통 의도적인 빈 값을 표현하지만, 실제 의미는 API contract로 정한다.
- `const`는 binding 재할당을 막을 뿐 object 내부를 동결하지 않는다.
- 여러 선언을 한 문장에 몰아넣기보다 lifetime과 의미가 드러나게 분리한다.
- identifier와 주석은 코드가 무엇을 하는지 반복하기보다 domain 의도, 제약과 선택 이유를 남긴다.

선언별 scope, TDZ와 재선언 규칙은 [[Variable-Declarations|변수 선언]]에서 다룬다.

## expression과 연산 순서

Expression은 평가되어 값을 만든다. 연산자 우선순위만으로 코드를 해독하게 만들지 말고 경계가 중요한 곳은 괄호와 중간 변수를 쓴다. 할당은 오른쪽 값을 계산한 뒤 왼쪽 reference에 기록하며 복합 할당은 단순 텍스트 치환과 완전히 같지 않을 수 있다.

```ts
const total = quantity * unitPrice;
const label = "count: " + quantity;
```

- `+`는 primitive 변환 결과에 String이 있으면 연결하고, 그렇지 않으면 numeric addition을 한다.
- `-`, `*`, `/`, `%`, unary `+`는 numeric conversion을 수행한다. Number와 BigInt를 산술 연산에서 섞으면 일반적으로 `TypeError`다.
- `++value`는 갱신 뒤 값을, `value++`는 갱신 전 값을 expression 결과로 낸다. 복합 expression 안에서는 분리하는 편이 읽기 쉽다.
- 부동소수점 오차를 자릿수 곱셈 하나로 보편 해결하지 않는다. 금액/측정 domain의 표현과 rounding policy를 따로 둔다.

문자열끼리의 `<` 비교는 UTF-16 code unit sequence를 사전식으로 비교한다. 한쪽이라도 문자열이 아닌 일반 관계 비교는 primitive/numeric conversion 규칙이 개입하므로 locale 정렬에는 `Intl.Collator` 같은 목적별 API를 사용한다.

## 비교와 단축 평가

기본 선택은 type conversion이 없는 `===`/`!==`다. `==`/`!=`는 명세의 abstract equality conversion을 의도적으로 이용할 때만 계약과 test를 남긴다.

```ts
const name = input.name ?? "anonymous";
const canRead = authenticated && hasPermission;
```

- `&&`와 `||`는 Boolean이 아니라 선택된 operand 값을 반환하고 단축 평가한다.
- `??`는 `null`/`undefined`만 부재로 본다. `0`, `false`, `""`를 유효 값으로 보존한다.
- `!value`는 Boolean conversion 뒤 반전하며 `!!value`는 명시적인 Boolean 변환이지만 `Boolean(value)`가 더 읽기 쉬울 때도 있다.
- conditional operator는 값 선택에 적합하다. 중첩해 복잡한 control flow를 숨기지 않는다.

## statement와 ASI

문장은 실행 단위이고 block은 여러 문장을 묶는다. 자동 세미콜론 삽입(ASI)은 모든 줄바꿈에 세미콜론을 넣는 기능이 아니다. grammar가 계속될 수 있는지와 restricted production 규칙에 따라 삽입된다.

```ts
function load() {
  return {
    ok: true,
  };
}
```

`return`, `throw`, `break`, `continue`의 제한된 줄바꿈과 postfix `++`/`--`, `(`, `[`, template 시작 경계를 특히 주의한다. formatter/linter와 일관된 semicolon policy를 쓰되 ASI 의미 자체는 이해한다.

## 분기, 반복과 예외

- `if`/`while`/`for` 조건은 Boolean conversion을 거친다. 무한 반복에는 종료/취소/상한을 설계한다.
- `do...while`은 body를 최소 한 번 실행한다.
- `break`는 가장 가까운 loop/switch를 끝내고 `continue`는 현재 iteration의 나머지를 건너뛴다. labeled statement는 가능하지만 복잡도를 높인다.
- `switch`는 case 비교에 strict equality 의미를 쓰며 `break`가 없으면 다음 case로 fall-through한다. 의도한 fall-through는 표시한다.
- `throw`에는 `Error` 또는 domain error를 사용해 stack/cause와 분류를 보존한다.
- `finally`는 정상/예외/return 경로 모두에서 실행되지만 여기서 `return`/`throw`하면 앞선 결과를 덮을 수 있다.

strict mode는 silent error 일부를 예외로 바꾸고 오래된 동작을 제한한다. ECMAScript module과 class body는 자동 strict이므로 script의 `"use strict"`와 적용 범위를 구분한다.

## 백엔드 적용

- DTO에서 `undefined`(미제공), `null`(명시적 비움), falsy 값 `0`/`false`/`""`를 한 조건으로 합치지 않는다.
- 외부 문자열을 암묵 변환에 맡기지 말고 parse, validation, range check를 분리한다.
- `catch`에서 모든 오류를 성공값으로 바꾸지 말고 변환 가능한 domain error와 재시도 불가능한 programmer error를 구분한다.
- loop에서 외부 I/O를 무제한 병렬화하거나 영원히 재시도하지 않는다. timeout, cancellation, concurrency limit를 계약에 넣는다.

## 출처

- [ECMAScript Language Specification, types](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html), [expressions](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html), [statements](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html)
- 강의 범위: [웹/Ajax](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24491), [그래프/Canvas](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24539), [device/ML](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24540), [기술 통합](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24570), [학습 범위](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24571)
- 기본 문법: [환경/script](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24573), [문장](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24574), [변수](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24575), [주석](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24576), [console](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24577), [숫자](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24578), [상수/진수](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24579), [data type](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24582), [Number/String](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24583), [Undefined/Null](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24584), [Boolean/Object](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24585)
- 연산자: [expression](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24594), [할당/평가 순서](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24595), [더하기](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24596), [numeric conversion](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24597), [산술](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24598), [단항](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24599), [증감/NOT](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24600), [Unicode/UTF](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24601), [관계](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24602), [동등/일치](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24603), [논리/그룹](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24604), [조건/우선순위](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24605)
- 문장: [ASI/block](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24610), [if/debugger](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24611), [while/do-while](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24612), [for](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24613), [break/continue](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24614), [switch](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24615), [try/throw](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24616), [strict mode](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24617)

## 관련 문서

- [[Variable-Declarations|var, let, const]]
- [[JavaScript-Numbers-Strings-and-Regular-Expressions|숫자와 문자열]]
- [[Error-Handling|Node.js 오류 처리]]
- [[Promise-Async|Promise와 비동기 흐름]]
