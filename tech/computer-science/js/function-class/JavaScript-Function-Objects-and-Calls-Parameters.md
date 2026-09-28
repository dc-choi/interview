---
tags: [cs, javascript, function-object, arguments, parameter]
status: done
verified_at: 2026-09-27
category: "CS - JavaScript"
aliases: ["JavaScript Parameters and arguments", "JavaScript parameter와 arguments"]
---

# JavaScript parameter와 arguments

함수가 인자를 받는 두 경로인 parameter 목록과 `arguments` object의 규칙을 다룬다. function object의 구조와 호출 준비는 [[JavaScript-Function-Objects-and-Calls|Function Object와 호출 준비]]를 본다.

## arguments object

`arguments`는 Array가 아니다. mapped arguments object(arguments exotic object)는 non-strict이고 simple parameter list인 함수에서만 만들어지고, strict function(module code와 class body 포함)이나 rest, default, destructuring parameter가 있는 함수에서는 ordinary object인 unmapped arguments object가 만들어진다. mapped object에서만 실제로 전달된 인자의 index property와 parameter가 서로 연동된다. 둘 다 `[[Prototype]]`이 `Object.prototype`이라 Array method는 없지만 own `Symbol.iterator`가 있어 spread와 `for...of`로 순회할 수 있다.

- arrow function은 자체 `arguments` binding을 만들지 않는다.
- 함수 안의 `arguments` binding과 function object의 `fn.arguments`, `fn.caller`는 다르다. 명세가 정의하는 것은 get과 set 모두 `TypeError`를 던지는 `Function.prototype`의 `caller`, `arguments` accessor뿐이고, strict function, arrow, method, class, generator, async function과 bound function에는 같은 이름의 own property를 금지한다. non-strict 일반 함수에서의 동작은 구현 정의라 engine과 version마다 다르므로 호출자 정보가 필요하면 인자나 logging context로 명시적으로 넘긴다.
- `arguments.callee`는 mapped arguments object에서만 현재 함수를 값으로 가진다. unmapped arguments object의 `callee`는 get과 set 모두 `TypeError`를 던지는 accessor라 strict function뿐 아니라 rest, default, destructuring parameter가 있는 non-strict 함수에서도 읽으면 `TypeError`다. 명세상 대입도 setter가 `TypeError`를 던지지만 Node.js 26.7(V8)의 이런 non-strict 함수에서는 대입이 오류 없이 무시된다. 함수가 자기 자신을 참조해야 하면 [[JavaScript-Function-Objects-and-Calls#함수 정의 형태|기명 함수 표현식]]을 쓴다.

## parameter 목록

- rest parameter는 실제 Array이고 필요한 인자만 명시하므로 기본 선택이다.
- rest parameter는 하나만, 목록의 마지막에 둘 수 있고 default 값과 뒤따르는 trailing comma를 가질 수 없다. 어기면 parse 단계의 `SyntaxError`다. 같은 이름의 parameter와 non-simple parameter list 함수의 `"use strict"` 제약은 [[JavaScript-Lexical-Scope-and-Modern-Syntax#실행 환경과 strict mode|strict mode 규칙]]에서 다룬다.
- default와 rest parameter는 `length` 계산을 멈추게 한다. `(({ a }, b) => 0).length`는 2, `((a, b = 1, c) => 0).length`와 `((a, ...rest) => 0).length`는 1이다.
- default 값이나 computed key처럼 expression이 든 parameter 목록이 있으면 본문 선언은 parameter와 분리된 environment에 만들어져 parameter 식의 closure가 본문 `var`를 보지 못한다. destructuring만으로는 `length`나 environment가 달라지지 않지만 non-simple parameter list가 되어 arguments mapping과 `"use strict"` 제약에 영향을 준다.

argument 개수의 한계와 한계를 넘었을 때의 동작은 명세가 정하지 않아 engine마다 다르다. `Math.max(...values)`, `target.push(...rows)`, `fn.apply(null, list)`는 원소 수만큼 argument를 만들므로 수만 개를 넘는 입력에서 실패할 수 있다. Node.js 26.7 기본 설정에서는 원소 20만 개를 spread한 `Math.max`와 `push`, 같은 배열을 넘긴 `apply`가 재귀 없이도 `RangeError: Maximum call stack size exceeded`로 실패했다. 크기가 정해지지 않은 배열은 `reduce`나 `for...of`로 누적하고, 병합은 `concat`이나 청크 단위 처리로 바꾼다.

## 출처

- [ECMAScript Language Specification, arguments exotic objects](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arguments-exotic-objects)
- [ECMAScript Language Specification, CreateUnmappedArgumentsObject](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-createunmappedargumentsobject)
- [ECMAScript Language Specification, CreateMappedArgumentsObject](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-createmappedargumentsobject)
- [ECMAScript Language Specification, AddRestrictedFunctionProperties](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-addrestrictedfunctionproperties)
- [ECMAScript Language Specification, Forbidden Extensions](https://tc39.es/ecma262/multipage/error-handling-and-language-extensions.html#sec-forbidden-extensions)
- [ECMAScript Language Specification, Function Definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html)
- [ECMAScript Language Specification, FunctionDeclarationInstantiation](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-functiondeclarationinstantiation)
- [MDN, Function.prototype.caller](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/caller)
- [MDN, arguments.callee](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments/callee)
- [MDN, Rest parameters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters)
- [MDN, Function.prototype.apply()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply)
- [모던 자바스크립트 딥다이브 스터디 #2-2 (CH12 함수) — FE재남](https://www.youtube.com/watch?v=KiyJliK94fs)
- [모던 자바스크립트 딥다이브 스터디 #4-1 (CH 18 함수와 일급객체) — FE재남](https://www.youtube.com/watch?v=gAZX8ThQkUc)
- [모던 자바스크립트 딥다이브 스터디 #6-1 (CH 26 함수의 추가기능) — FE재남](https://www.youtube.com/watch?v=eeDbljgvCxg)
- [모던 자바스크립트 딥다이브 스터디 #10-1 (CH 40 이벤트) — FE재남](https://www.youtube.com/watch?v=vPeuNKiWPiA)
- [인프런, arguments/parameter](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26683)

## 관련 문서

- [[JavaScript-Function-Objects-and-Calls|Function Object와 호출 준비]]
- [[JavaScript-Lexical-Scope-and-Modern-Syntax|렉시컬 스코프와 모던 문법]]
- [[JavaScript-this-and-Function-Invocation|JavaScript this와 호출 방식]]
