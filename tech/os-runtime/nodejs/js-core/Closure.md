---
tags: [runtime, nodejs, javascript, closure, recursion, iife]
status: done
category: "OS & Runtime"
aliases: ["Closure", "JavaScript Closure", "JavaScript 클로저"]
verified_at: 2026-08-04
---

# JavaScript Closure, 재귀와 IIFE

closure는 function이 자신이 정의된 lexical environment의 binding을 이후 호출에서도 참조할 수 있는 성질이다. 익명 함수나 반환된 함수에만 생기는 별도 object가 아니라 JavaScript function 의미의 일부다.

## binding을 기억한다

```ts
function makeCounter() {
  let count = 0;
  return () => ++count;
}

const next = makeCounter();
next(); // 1
next(); // 2
```

inner function의 `[[Environment]]`가 outer environment와 연결되고 identifier resolution이 `count` binding을 찾는다. 생성 시점의 숫자 snapshot을 복사하는 것이 아니라 같은 mutable binding을 공유하므로 다른 closure가 수정하면 최신 값을 본다.

engine은 관찰 가능한 의미만 유지하면 environment를 최적화할 수 있다. closure가 항상 전체 stack frame을 그대로 heap에 복사한다고 단정하지 않는다.

## 캡슐화와 한계

closure는 module-local state, factory와 callback dependency를 감추는 데 유용하다. 그러나 function/reference를 잘못 노출하면 state도 간접 변경될 수 있으므로 security boundary 자체는 아니다. class private field, module boundary와 authorization을 목적에 맞게 쓴다.

## lifetime과 memory

closure가 environment binding을 참조하는 동안 관련 value가 reachable할 수 있다. 큰 request/body/cache를 불필요하게 capture하면 수명이 늘어난다.

- 필요한 primitive/작은 value만 local binding으로 capture한다.
- listener/timer/subscription을 해제한다.
- closure가 담긴 queue/cache의 bound와 TTL을 둔다.
- heap snapshot의 retaining path로 실제 reference를 확인한다.

closure가 있다는 사실 자체는 leak이 아니다. 더 이상 필요 없는데 reachable한 reference가 계속 남는 것이 leak이다.

## 재귀 함수

재귀는 자기 자신 또는 cycle을 통해 다시 호출하는 control flow다. base case, progress, maximum depth와 cycle detection이 필요하다. ECMAScript에 proper tail call 의미가 있어도 모든 주요 runtime이 일반 최적화를 제공한다고 가정하지 말고 깊은 입력에는 explicit stack/iteration을 검토한다.

object를 재귀 순회할 때 property를 하나씩 옮긴다고 자동 deep clone이 되지 않는다. descriptor/prototype/symbol/cycle/built-in type 계약은 [[JavaScript-Object-and-Array-Operations|Object와 Array 연산]]에서 정한다.

## IIFE의 의미

```ts
(() => {
  const privateValue = 1;
  initialize(privateValue);
})();
```

IIFE는 function expression을 작성한 뒤 call expression `()`로 즉시 호출하는 pattern이다. engine이 IIFE를 발견해 자동 실행하는 별도 mechanism은 아니다. 과거에는 global pollution을 줄이는 module pattern으로 중요했지만 현재는 ESM/block scope가 더 명시적인 기본이다. 일회 초기화/async scope가 정말 필요할 때만 사용한다.

## NestJS 적용

- singleton provider에서 request-specific closure를 오래 보관하지 않는다.
- retry/callback closure가 stale configuration이나 mutable entity를 붙잡는지 확인한다.
- factory closure로 dependency를 숨기기보다 DI token/interface가 수명과 test boundary를 더 잘 드러내는지 비교한다.
- recursion으로 nested DTO/tree를 처리할 때 depth/size 제한을 둔다.

## 출처

- [ECMAScript Language Specification, ECMAScript Function Objects](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ecmascript-function-objects)
- [ECMAScript Language Specification, Environment Records](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-environment-records)
- [재귀/참조 공유](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26717), [IIFE](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26718), [closure lookup](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26720), [closure와 익명 함수](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26721)

## 관련 문서

- [[Scope|JavaScript 스코프]]
- [[Execution-Context|JavaScript 실행 컨텍스트]]
- [[Call-Stack-Heap|Call Stack과 Heap]]
- [[JS-Function-Forms|JavaScript 함수 형태]]
- [[JavaScript-Object-and-Array-Operations|Object와 Array 연산]]
