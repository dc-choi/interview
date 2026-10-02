---
tags: [cs, javascript, expression, operator, coercion, control-flow]
status: done
verified_at: 2026-09-28
category: "CS - JavaScript"
aliases: ["JavaScript Expressions and Control Flow", "JavaScript 표현식 연산자 제어 흐름"]
---

# JavaScript 표현식, 타입 변환과 제어 흐름

JavaScript 문법을 외우기보다 어떤 expression이 어떤 값을 만들고 그 전에 어떤 type conversion이 일어나며 어느 statement가 다음 실행 위치를 바꾸는지 추적하는 게 중요하다. 브라우저 기능을 조합하는 언어라는 강점도 이 실행 규칙 위에서만 안전하게 쓸 수 있다.

## 실행 환경과 코드 배치

- HTML의 classic external script에 `defer`를 지정하면 parsing을 막지 않고 문서 parsing 뒤, `DOMContentLoaded` 전에 문서 순서대로 실행한다. inline classic script의 `defer`는 효과가 없다.
- parser가 만난 classic script 중 `async`, `defer`가 없는 external script는 가져와 실행할 때까지, inline script는 `async`, `defer`와 관계없이 실행하는 동안 HTML parsing을 멈춘다. 둘 다 앞서 parser가 만든 스타일시트 중 `media`가 현재 환경과 맞는 것이 아직 로드 중이면 그 로드가 끝날 때까지 실행을 미루고 그동안 parsing도 멈춘다([[Browser-Main-Thread#렌더링 차단과 변경 비용|렌더링 차단]]). 이때 script 뒤쪽 element는 아직 DOM에 없어 `document.getElementById`가 `null`을 반환하고 곧바로 property에 접근하면 `TypeError`가 나므로 `defer`나 module script를 쓰거나 script를 참조 대상 element 뒤에 둔다.
- external classic script의 `async`는 parsing과 병렬로 가져오되 도착하는 즉시 실행해 그동안 parsing을 멈추고, parsing이 끝나기 전에 실행될 수 있으며 여러 `async` script의 실행 순서도 보장하지 않는다. 다른 script나 완성된 DOM에 의존하지 않는 독립 script에만 쓰고, inline classic script의 `async`도 효과가 없다.
- module script는 기본적으로 deferred하게 처리되지만 dependency graph와 top-level await 때문에 완료 시점을 classic script와 같다고 단정하지 않는다. module script에는 `defer`가 효과가 없고, `async`는 inline module script에도 지정할 수 있다.
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
- 이항 `-`, `*`, `/`, `%`는 numeric conversion(ToNumeric)을 수행해 BigInt끼리는 BigInt 연산을 하고, Number와 BigInt를 섞으면 `TypeError`다. unary `+`는 number conversion(ToNumber)만 수행하므로 `+1n`도 `TypeError`다.
- `%`는 나머지 연산자이고 결과 부호는 왼쪽 피연산자(피제수)를 따른다. `-7 % 3`은 -1이므로 음수가 올 수 있는 값의 홀수 판별은 `n % 2 === 1` 대신 `n % 2 !== 0`으로, 0 이상의 bucket/순환 index는 `((n % size) + size) % size`로 구한다.
- `++value`는 갱신 뒤 값을, `value++`는 갱신 전 값을 expression 결과로 낸다. 복합 expression 안에서는 분리하는 편이 읽기 쉽다.
- `=` 할당도 expression이고 결과는 할당한 오른쪽 값이다. `=`는 오른쪽 결합이라 `a = b = 0`은 `a = (b = 0)`으로 평가된다. 복합 할당은 연산 결과를, `&&=`, `||=`, `??=`는 단축되면 왼쪽 값을 낸다. 선언문의 `=`는 할당 연산자가 아니라 initializer이므로 `const a = b = 0`은 `a`만 선언하고 `b`에는 할당만 한다. `b`가 같은 scope나 바깥 scope에 이미 선언돼 있으면 그 binding에 할당하고(`const`면 `TypeError`, 아직 TDZ면 `ReferenceError`), 없으면 sloppy mode에서는 global object property가 생기며 strict mode에서는 `ReferenceError`다.
- `if (x = y)`는 문법 오류가 아니라 할당한 값을 Boolean 변환하는 조건이다. 비교로 오해받지 않게 할당을 조건 밖으로 뺀다.
- 부동소수점 오차를 자릿수 곱셈 하나로 보편 해결하지 않는다. 금액/측정 domain의 표현과 rounding policy를 따로 둔다.

산술(단항 `+`, `-` 포함), binary `+`, 관계 비교, `==`와 문자열 변환처럼 primitive가 필요한 연산에 object가 들어오면 먼저 ToPrimitive로 primitive가 된다. `===`, `!`, 조건식, `&&`/`||`/`??`는 ToPrimitive를 호출하지 않는다(object는 `===`에서 identity로 비교되고 Boolean 변환에서 true다. 브라우저의 legacy `document.all`은 예외로 Boolean 변환에서 false다). `Symbol.toPrimitive` method가 있으면 그 결과를 쓰고, 없으면 number hint와 hint 없는 변환(binary `+`, `==`)은 `valueOf`, `toString` 순서로, string hint(template literal, `String()`)는 `toString`, `valueOf` 순서로 호출해 처음 나온 primitive를 쓴다. 일반 object와 array의 `valueOf`는 자기 자신을 반환하므로 결국 `toString` 결과가 쓰인다.

```js
+[];     // 0, [] → "" → 0
+[7];    // 7, [7] → "7" → 7
+[1, 2]; // NaN, "1,2"는 숫자 형식이 아니다
[] + {}; // "[object Object]"
```

Date는 hint 없는 변환을 string hint처럼 처리하므로 `date + 1`은 문자열 연결이 되고 `date - 0`은 epoch millisecond 숫자가 된다. Date 산술에는 `date.getTime()`처럼 숫자 변환을 명시한다.

문자열끼리의 `<` 비교는 UTF-16 code unit sequence를 사전식으로 비교한다. 한쪽이라도 문자열이 아닌 일반 관계 비교는 primitive/numeric conversion 규칙이 개입하므로 locale 정렬에는 `Intl.Collator` 같은 목적별 API를 사용한다.

## 비교와 단축 평가

기본 선택은 type conversion이 없는 `===`/`!==`다. `==`/`!=`는 명세의 abstract equality conversion을 의도적으로 이용할 때만 계약과 test를 남긴다.

`==`의 변환 방향은 명세의 IsLooselyEqual이 정한다. 두 타입이 같으면 `===`와 같게 비교하고, 다를 때만 다음 규칙으로 한쪽을 바꿔 다시 비교한다.

- `null`과 `undefined`는 서로끼리만 느슨하게 같다(브라우저의 legacy `document.all`은 예외). `null == 0`과 `undefined == false`는 false이므로 `value == null`은 두 값만 함께 거른다.
- Number와 String이면 String을 Number로 바꾼다. `0 == ""`는 true다.
- Boolean은 상대가 Boolean이 아니면 먼저 1 또는 0이 된다. `true == "1"`은 true지만 `"true" == true`와 `2 == true`는 false이므로 truthy 검사를 `== true`로 쓰지 않는다.
- Object와 String, Number, BigInt, Symbol이면 Object를 ToPrimitive로 바꾼다. Boolean은 앞 규칙대로 먼저 숫자가 되고, `null`과 `undefined`는 변환 없이 false다. `[] == false`는 `[] == 0`, `"" == 0`을 거쳐 true다.

```ts
const name = input.name ?? "anonymous";
const canRead = authenticated && hasPermission;
```

- `&&`와 `||`는 Boolean이 아니라 선택된 operand 값을 반환하고 단축 평가한다.
- `??`는 `null`/`undefined`만 부재로 본다. `0`, `false`, `""`를 유효 값으로 보존한다. 괄호 없이 `&&`/`||`와 섞으면 SyntaxError이므로 `(a || b) ?? c`처럼 묶는다.
- optional chaining `a?.b`도 `a`가 `null`/`undefined`일 때만 멈추고 `undefined`를 낸다. `""?.length`는 0이지만 `a && a.b` guard는 falsy 값 자체를 반환한다.
- 단축은 이어진 chain 전체에 적용되어 `a?.b.c`는 `a`가 nullish면 `.c`를 평가하지 않는다. `a.b`가 nullish인 경우는 막지 않으므로 `.c`에서 `TypeError`다. `a`가 nullish여도 `(a?.b).c`처럼 괄호로 chain을 끊으면 단축이 `.c`까지 이어지지 않아 `TypeError`다.
- `obj.method?.()`는 method가 nullish일 때만 호출을 건너뛰고 함수가 아닌 값이면 `TypeError`다. `obj`도 nullish일 수 있으면 `obj?.method?.()`로 쓴다. optional chain은 할당 대상이 될 수 없다.
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

expression statement는 `{`, `function`, `class`, `async function`, `let [`로 시작할 수 없으므로 문장 시작의 `{`는 block으로 해석된다. `{ foo: 1 }`만 쓴 문장은 object literal이 아니라 label `foo`와 expression `1`을 담은 block이다. 선언 없는 object destructuring 할당을 `({ a, b } = obj);`처럼 괄호로 감싸는 이유도 같고, semicolon을 생략하는 style에서는 앞 줄과 이어지지 않게 `;`를 앞에 둔다. arrow function concise body의 object literal 괄호 규칙은 [[JavaScript-Lexical-Scope-and-Modern-Syntax#arrow function의 lexical binding|arrow function]]에서 다룬다.

## 분기, 반복과 예외

- `if`/`while`/`for` 조건은 Boolean conversion을 거친다. 무한 반복에는 종료/취소/상한을 설계한다.
- `do...while`은 body를 최소 한 번 실행한다.
- `break`는 가장 가까운 loop/switch를 끝내고 `continue`는 현재 iteration의 나머지를 건너뛴다. labeled statement는 가능하지만 복잡도를 높인다.
- `switch`는 case 비교에 strict equality 의미를 쓰며 `break`가 없으면 다음 case로 fall-through한다. 의도한 fall-through는 표시한다.
- `throw`에는 `Error` 또는 domain error를 사용해 stack/cause와 분류를 보존한다.
- `finally`는 정상/예외/return 경로 모두에서 실행되지만 여기서 `return`/`throw`하면 앞선 결과를 덮을 수 있다.

`new Error(message, { cause })`는 `message`와 `cause`를 instance의 non-enumerable own property로 만들고 `name`은 `Error.prototype.name`(초기값 `"Error"`)에서 상속하며, `toString()`은 `name: message` 형식을 반환한다. `stack`은 ECMA-262에 없는 비표준 property라 주요 엔진이 제공해도 문자열 형식이 엔진마다 다르므로 디버깅과 로그에만 쓰고 파싱해 분기하지 않는다. `JSON.stringify`는 replacer 배열이 없으면 enumerable own property만 직렬화하고 Node.js 26.7에서는 `stack`도 non-enumerable이다. 그래서 `new Error(message, { cause })`로만 만든 오류는 `JSON.stringify(error)`가 `"{}"`, `{ ...error }`가 빈 object가 되고, constructor에서 `this.name`이나 `this.code`를 할당한 custom error와 `errno`, `code`, `syscall`이 붙는 Node.js system error도 자기 enumerable field만 남은 채 `message`, `stack`, `cause`가 빠진다. 구조화 로그에는 logger의 error serializer를 쓰거나 `name`, `message`, `stack`, `cause`를 명시적으로 꺼낸다.

`TypeError` 같은 NativeError와 `AggregateError`도 `Error.prototype`을 상속하지만 realm(iframe, `vm` context)마다 `Error` constructor가 달라 다른 realm에서 만든 오류는 `instanceof Error`가 false다. ES2026(ECMA-262 17판, 2026년 6월)에 포함된 `Error.isError()`는 `[[ErrorData]]` internal slot으로 판별해 realm과 무관하게 동작한다. MDN 기준 Baseline이 아니어서 브라우저 대상 코드는 지원 여부를 확인한다. Node.js는 V8 13.6을 탑재한 24.0.0부터 제공하지만 24.3.0 전에는 `DOMException`(reason 없이 abort한 signal과 `AbortSignal.timeout()`의 reason 포함)에 false를 반환하므로 24.3.0 이상을 기준으로 삼는다.

strict mode는 silent error 일부를 예외로 바꾸고 오래된 동작을 제한한다. ECMAScript module과 class body는 자동 strict이므로 script의 `"use strict"`와 적용 범위를 구분한다.

## 백엔드 적용

- DTO에서 `undefined`(미제공), `null`(명시적 비움), falsy 값 `0`/`false`/`""`를 한 조건으로 합치지 않는다.
- optional chain이 단축되면 결과는 `null`이 아니라 `undefined`이고 object의 `undefined` field는 `JSON.stringify`에서 빠진다([[JS-Value-vs-Reference#JSON 직렬화 주의|JSON 직렬화]]). chain이 끝까지 평가되면 property의 실제 값(`null` 포함)이 나오므로 `deletedAt: user?.deletedAt`은 `user`가 있고 값이 `null`이면 `null`로 남지만, `user`가 nullish이거나 `user`에 `deletedAt`이 없으면(`undefined`) field째 빠진다. 응답 계약이 명시적 `null`을 요구하면 `?? null`로 맞춘다.
- 외부 문자열을 암묵 변환에 맡기지 말고 parse, validation, range check를 분리한다.
- `Number()`와 unary `+`는 빈 문자열, 공백만 있는 문자열, `null`, `false`, `[]`를 0으로, `undefined`를 NaN으로 바꾼다. `Number.isNaN(Number(input))`만으로는 비어 있는 query 값과 실제 0을 구분하지 못하므로 빈 값 여부와 숫자 형식을 먼저 검증한다.
- `catch`에서 모든 오류를 성공값으로 바꾸지 말고 변환 가능한 domain error와 재시도 불가능한 programmer error를 구분한다.
- loop에서 외부 I/O를 무제한 병렬화하거나 영원히 재시도하지 않는다. timeout, cancellation, concurrency limit를 계약에 넣는다.

## 연산과 반복의 경계값

Number에서 1/0은 Infinity, 1/-0은 -Infinity, 0/0과 5%0은 NaN이다. Infinity-Infinity와 Infinity*0도 NaN이며 finite 입력에서 시작해도 결과를 검증해야 한다. BigInt의 0 나누기는 RangeError라 Number의 예외 없는 결과와 구분한다. 단순 비교 `n !== NaN`은 검사로 동작하지 않는다.

결합 방향은 묶는 방법이고 side effect의 평가 순서와 다르다. 복합 할당은 왼쪽 reference를 먼저 구한 뒤 오른쪽을 평가하므로 setter/index 식을 두 번 실행하는 텍스트 치환이 아니다. postfix 증가도 문장 끝에 늦게 실행하지 않고 그 expression 평가 중 증가하며 이전 값을 결과로 낸다. comma 연산자는 왼쪽 effect 뒤 오른쪽 값을 반환하지만 선언 목록/인자 구분 comma는 이 연산자가 아니다.

for의 continue는 update 식으로, while의 continue는 조건식으로 이동한다. for에서 조건 생략은 true로 취급한다. switch의 default는 일치하는 case가 없을 때 시작점이고, 뒤 case로 fall-through할 수 있다. 언어 값의 type과 명세의 Reference/Completion/Environment Record 같은 설명용 type을 구분하며 latter를 application 객체나 엔진 layout으로 취급하지 않는다.

DOM 조작은 보통 DOMContentLoaded면 충분하며 image 같은 load 지연 자원까지 필요한 경우 window load를 쓴다. 늦게 등록하는 코드는 document.readyState가 loading일 때만 DOMContentLoaded를 기다리고 아니면 바로 초기화해 event를 놓치지 않는다. script loading의 defer/async/module 조건은 앞 절과 함께 판단한다.

## 조건부 할당과 평가 횟수

`x ||= y`, `x &&= y`, `x ??= y`는 왼쪽 reference를 한 번 평가하고 조건이 맞을 때만 오른쪽 평가와 할당을 수행한다. `obj.value = obj.value || fallback`처럼 매번 setter를 호출하는 코드와 다르다. getter/setter, DOM property나 계산한 index에 부수 효과가 있을 때 이 차이를 확인한다. optional chaining은 선언되지 않은 root identifier의 `ReferenceError`를 막지 않는다.

## 출처

- [Logical assignment — V8](https://v8.dev/features/logical-assignment)
- [Nullish coalescing — V8](https://v8.dev/features/nullish-coalescing)
- [Optional chaining — V8](https://v8.dev/features/optional-chaining)

- 인프런 보충 강의: [텍스트 노드](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102171), [이미지 노드](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102172), [innerHTML vs innerText](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102173), [실전예제 - 작은 이미지 클릭시 큰 이미지로 변경하기(1)](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102179), [실전예제 - 작은 이미지 클릭시 큰 이미지로 변경하기(3)](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102181), [이벤트 위임과 활용(2) - event.target vs event.currentTarget](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102192)

- [ECMAScript Language Specification, types](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html), [expressions](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html), [statements](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html)
- [ECMAScript Language Specification, ToPrimitive](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-toprimitive), [ToNumber](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-tonumber), [IsLooselyEqual](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-islooselyequal), [IsStrictlyEqual](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-isstrictlyequal), [ToBoolean](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-toboolean), [Date toPrimitive](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date.prototype-%25symbol.toprimitive%25)
- [MDN, Optional chaining (?.)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining), [Nullish coalescing (??)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing), [Remainder (%)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder), [Assignment (=)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Assignment), [Destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring)
- [HTML Living Standard, The script element](https://html.spec.whatwg.org/multipage/scripting.html#the-script-element), [MDN, script element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script)
- [ECMAScript Language Specification, Error objects](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-error-objects), [Error.isError](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-error.iserror), [SerializeJSONObject](https://tc39.es/ecma262/multipage/structured-data.html#sec-serializejsonobject)
- [Ecma International, ECMA-262 17th edition (ECMAScript 2026)](https://ecma-international.org/publications-and-standards/standards/ecma-262/), [ECMAScript 2026, Error.isError](https://tc39.es/ecma262/2026/#sec-error.iserror)
- [MDN, Error.prototype.stack](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/stack), [Error.isError()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/isError)
- [Node.js 24.0.0 (Current) — Node.js Blog](https://nodejs.org/en/blog/release/v24.0.0)
- [Node.js 24.3.0 (Current) — Node.js Blog](https://nodejs.org/en/blog/release/v24.3.0)
- [모던 자바스크립트 딥다이브 스터디 #1-1 (CH4, 5) — FE재남](https://www.youtube.com/watch?v=3ZP3VPlrr0U)
- [모던 자바스크립트 딥다이브 스터디 #1-2 (CH6, 7) — FE재남](https://www.youtube.com/watch?v=rPVrtODy9P0)
- [모던 자바스크립트 딥다이브 스터디 #1-3 (CH8, 9) — FE재남](https://www.youtube.com/watch?v=JFJiz7cOF78)
- [모던 자바스크립트 딥다이브 스터디 #8-1 (CH 38 브라우저의 렌더링 과정) — FE재남](https://www.youtube.com/watch?v=lO6gsAQWfjM)
- [모던 자바스크립트 딥다이브 스터디 #11-2 (CH 47, 48) (END) — FE재남](https://www.youtube.com/watch?v=FRLJdYtMNJU)
- 강의 범위: [웹/Ajax](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24491), [그래프/Canvas](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24539), [device/ML](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24540), [기술 통합](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24570), [학습 범위](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24571)
- 기본 문법: [환경/script](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24573), [문장](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24574), [변수](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24575), [주석](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24576), [console](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24577), [숫자](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24578), [상수/진수](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24579), [data type](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24582), [Number/String](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24583), [Undefined/Null](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24584), [Boolean/Object](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24585)
- 연산자: [expression](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24594), [할당/평가 순서](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24595), [더하기](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24596), [numeric conversion](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24597), [산술](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24598), [단항](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24599), [증감/NOT](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24600), [Unicode/UTF](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24601), [관계](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24602), [동등/일치](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24603), [논리/그룹](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24604), [조건/우선순위](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24605)
- 문장: [ASI/block](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24610), [if/debugger](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24611), [while/do-while](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24612), [for](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24613), [break/continue](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24614), [switch](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24615), [try/throw](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24616), [strict mode](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24617)

## 관련 문서

- [[Variable-Declarations|var, let, const]]
- [[JavaScript-Numbers-Strings-and-Regular-Expressions|숫자와 문자열]]
- [[Error-Handling|Node.js 오류 처리]]
- [[Promise-Async|Promise와 비동기 흐름]]
