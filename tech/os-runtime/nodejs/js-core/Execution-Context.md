---
tags: [runtime, nodejs, javascript, execution-context, lexical-environment]
status: done
category: "OS & Runtime"
aliases: ["Execution Context", "JavaScript 실행 컨텍스트"]
verified_at: 2026-08-04
---

# JavaScript 실행 컨텍스트와 환경 레코드

실행 컨텍스트는 ECMAScript 명세가 실행 중인 code의 상태를 표현하는 장치다. V8의 실제 stack frame/object layout과 일대일로 같은 구현 자료구조라고 단정하지 않는다. 명세 모델은 observable behavior를 설명하고 engine은 같은 결과를 내는 범위에서 최적화할 수 있다.

## ES3/ES5 설명을 읽는 법

오래된 자료의 Activation Object, Variable Object, scope chain과 ES5의 Lexical Environment는 시대별 명세 표현이다. ES5가 JavaScript를 dynamic scope에서 lexical scope로 바꿨거나 새 모델 자체가 성능을 높였다고 설명하면 부정확하다. JavaScript의 identifier resolution은 본래 lexical structure를 중심으로 했고 명세 모델이 더 정교해진 것이다.

## 현재 실행 컨텍스트의 주요 상태

현재 명세의 execution context에는 code 평가 상태와 함께 다음 같은 field가 있다.

- `Function`: function code라면 실행 중인 function object
- `Realm`: intrinsic/global environment를 소유한 Realm
- `ScriptOrModule`: 어떤 script/module에서 시작했는지
- `LexicalEnvironment`: 현재 lexical declaration을 찾는 Environment Record
- `VariableEnvironment`: `var`/function declaration instantiation에 사용하는 Environment Record
- `PrivateEnvironment`: class private name resolution 환경

`this`는 과거 도식처럼 항상 독립적인 실행 컨텍스트 세 번째 상자에 저장된다고 보지 않는다. 현재 명세에서는 function/global/module Environment Record의 `HasThisBinding`/`GetThisBinding` 같은 operation과 function의 `[[ThisMode]]`가 의미를 결정한다.

## Lexical Environment와 Environment Record

Environment Record는 identifier binding을 만들고 초기화하고 읽고 쓰는 명세 타입이다. 각 environment는 outer environment reference를 통해 lexical parent로 이어진다.

- Declarative Environment Record: 문법 선언 기반 binding
- Function Environment Record: parameter, `this`, `super`, `new.target` 관련 binding
- Module Environment Record: import/export를 포함한 module binding
- Object Environment Record: object property를 binding처럼 노출
- Global Environment Record: object record와 declarative record를 함께 사용

global environment가 object record 하나뿐이라는 오래된 단순화는 `let`/`const`/class와 module을 설명하지 못한다. classic script의 `var`/function과 lexical declaration은 같은 global scope에서도 다른 record에 들어갈 수 있다.

## 선언 준비와 code 평가

engine이 모든 code를 단순히 3단계로 한 번 scan한다고 외우지 않는다. Script/Module/Function마다 declaration instantiation algorithm이 다르고 binding 종류에 따라 생성/초기화 시점이 다르다.

- function declaration은 해당 scope의 instantiation 중 function object로 초기화될 수 있다.
- `var` binding은 보통 `undefined`로 초기화된 뒤 assignment가 실행된다.
- `let`/`const`/class binding은 만들어져도 선언 평가 전까지 uninitialized TDZ다.
- import binding은 module linking/evaluation 규칙과 live binding을 따른다.
- `eval`, `with`, Annex B와 duplicate declaration 규칙은 별도 algorithm을 가진다.

따라서 함수 선언문 먼저, 변수 선언 다음, code 실행이라는 요약은 일부 단순 function/script 예제의 직관일 뿐 모든 ECMAScript code에 대한 실행 algorithm은 아니다.

## global, browser와 Node.js

- browser classic script, browser module, Node.js CommonJS와 Node.js ESM은 top-level scope가 다르다.
- `globalThis`는 global object에 접근하는 표준 이름이지만 모든 top-level binding이 그 property가 되는 것은 아니다.
- CommonJS는 file을 wrapper function으로 실행하고 ESM은 module environment/import graph를 사용한다.
- 여러 classic script의 global collision 설명을 module code에 그대로 적용하지 않는다.

## 호출 스택과 async 경계

실행 컨텍스트는 stack처럼 push/pop되며 현재 실행 중 context가 running execution context다. 이것은 단일 thread이기 때문에만 가능한 구조가 아니다. 각 ECMAScript agent는 자신의 execution context stack을 가지며 host는 여러 agent/worker를 가질 수 있다.

Promise handler, timer와 I/O callback은 현재 synchronous stack이 끝난 뒤 host/event loop 규칙으로 새 job/callback에서 실행된다. async stack trace는 engine이 연결한 debugging metadata일 수 있고 실제 synchronous call stack이 계속 남아 있다는 뜻은 아니다.

## parameter와 arguments

actual argument는 formal parameter에 위치 기준으로 연결되고 부족한 parameter는 `undefined`, 남는 값은 parameter binding 없이도 `arguments`/rest에서 접근할 수 있다. 하지만 parameter default/destructuring/rest, strict mode와 simple parameter list 여부에 따라 별도 parameter environment와 `arguments` 의미가 달라진다.

non-strict simple parameter list에서는 mapped arguments exotic object가 parameter와 일부 aliasing할 수 있다. strict/non-simple parameter list에서는 이 직관이 달라지므로 rest parameter를 우선한다.

## backend에서 보는 이유

- closure가 request/tenant object를 오래 붙잡는 원인을 lexical environment reference로 추적한다.
- callback에서 `this`를 잃는 문제와 variable lookup 문제를 분리한다.
- synchronous stack, microtask, timer/I/O callback 경계를 구분해 error propagation을 설계한다.
- `eval`/dynamic Function을 최적화 문제가 아니라 injection/CSP/security boundary까지 포함해 피한다.

## 출처

- [ECMAScript Language Specification, execution contexts](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-execution-contexts)
- [ECMAScript Language Specification, Environment Records](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-environment-records)
- [Node.js CommonJS module wrapper](https://nodejs.org/api/modules.html#the-module-wrapper)
- 역사/범위: [ES3/ES5 model](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26661), [엔진 키워드](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26662), [context 도식](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26663), [identifier resolution](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26664), [scope chain](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26665), [lexical/dynamic environment](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26666), [Node.js 관점](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26667), [과정 범위](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26669)
- execution context: [상태](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26690), [lexical/variable environment](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26691), [실행 과정](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26692), [Environment Record](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26693), [this binding](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26694), [call stack](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26695), [parameter mapping](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26696), [할당 규칙](https://www.inflearn.com/courses/lecture?courseId=324398&unitId=26697)

## 관련 문서

- [[Scope|JavaScript 스코프]]
- [[Closure|JavaScript 클로저]]
- [[Call-Stack-Heap|Call Stack과 Heap]]
- [[Event-Loop|Node.js Event Loop]]
- [[JavaScript-this-and-Function-Invocation|JavaScript this와 호출 방식]]
