---
tags: [cs, javascript, esm, module, browser]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["JavaScript ES Modules", "ECMAScript Modules"]
---

# JavaScript ES Modules

ECMAScript Module(ESM)은 파일 확장자 자체보다 import/export entry, module graph와 host loader가 함께 만드는 실행 단위다. browser와 Node.js는 같은 language syntax를 쓰지만 URL/package resolution과 loading policy는 다르다.

## module의 language semantics

- module code는 별도 lexical scope와 strict mode에서 실행된다.
- top-level `this`는 `undefined`다.
- static import/export는 parse/link 단계에서 module graph를 구성한다.
- imported binding은 snapshot copy가 아니라 exporter binding을 관찰하는 live binding이다.
- import binding은 importer가 재할당할 수 없다.
- 같은 module record는 host module map 안에서 한 번 평가되지만 URL/query/casing이나 loader context가 다르면 별개가 될 수 있다.

```ts
// counter.ts
export let count = 0;
export const increment = () => count++;

// consumer.ts
import { count, increment } from "./counter.js";
increment();
console.log(count); // live binding으로 1 관찰
```

export 값이 최초 import 때 복사되어 유지된다고 설명하면 live binding을 놓친다. 유지되는 것은 module instance/환경이며 exported binding의 현재 값은 바뀔 수 있다.

## named/default/namespace export

- module은 named export 여러 개와 default export 하나를 함께 가질 수 있다.
- default는 단일 export만 허용한다는 뜻이 아니라 특별한 export name이다.
- `import * as ns`는 module namespace object를 얻으며 일반 mutable plain object가 아니다.
- re-export와 `export *`에서 이름 충돌/ambiguous export를 확인한다.
- `as`는 local/export name을 바꾸며 원본 binding identity를 없애지 않는다.

## 순환 의존성과 평가 순서

static import는 source 위치에서 순차 실행되는 함수 호출이 아니다. graph 전체가 link된 뒤 dependency 순서와 strongly connected component 규칙에 따라 평가된다. cycle 자체가 항상 오류는 아니지만 초기화 전 lexical binding을 읽으면 TDZ 오류가 날 수 있다.

- module top level에서 dependency의 값에 즉시 의존하지 않는다.
- shared mutable singleton을 cycle 해결책으로 쓰지 않는다.
- interface/port 추출, dependency inversion 또는 dynamic import로 cycle을 끊을지 검토한다.
- top-level await가 포함되면 graph 평가가 async가 되어 downstream 시작 시점에 영향을 준다.

### top-level await와 비동기 평가

- 같은 specifier로 해석되는 module은 host module map에 한 번만 instantiate되고 한 번만 평가된다. 여러 번 import해도 평가는 1회이고 이후 import는 같은 namespace를 받는다.
- top-level `await`가 있는 module과 그것에 의존하는 module은 async module이 된다. 평가는 promise로 완료되고, 의존하는 module은 그 promise가 settle될 때까지 평가가 지연된다.
- 두 규칙이 만나는 지점이 구현 난도다. 첫 평가가 `await`에서 멈춘 사이 같은 module을 요청하는 import가 오면, loader는 그 요청을 진행 중인 평가의 완료에 연결해야 한다. 즉시 resolve하면 호출자는 초기화되지 않은 binding을 보고 TDZ 오류가 난다. 한 브라우저 엔진에서 같은 module을 동적 `import()`로 3회 동시에 호출했을 때 완료 순서가 뒤바뀌고 초기화 전 export에 접근하던 버그가 정확히 이 연결 누락이었고, 2016년부터 self-hosted JavaScript로 유지하던 module loader를 명세 의사코드를 그대로 옮기는 네이티브 구현으로 재작성해 고쳤다.
- 실무 신호: `import()`를 동시에 여러 번 호출하는 코드에서 accessed before initialization 류 오류가 간헐적으로 나면 module 평가 순서를 의심한다. 회피책은 진입점에서 한 번만 import해 promise를 공유하는 것이다.
- 명세 구현 검증의 일반 전술: 명세 스위트(test262)와 플랫폼 스위트(WPT)에 더해, module graph 구조를 무작위 생성하는 fuzzer와 다른 독립 엔진과의 출력 비교(차분 테스트)를 쓴다. 정답을 모르는 영역에서 차분 테스트가 오라클을 대신한다.

## browser loading

```html
<script type="module" src="/assets/main.js"></script>
```

- module script는 기본적으로 deferred하게 실행된다.
- cross-origin module fetch에는 CORS와 올바른 JavaScript MIME type이 필요하다.
- browser specifier는 URL resolution을 따르며 bare specifier는 import map/bundler 없이는 해석되지 않을 수 있다.
- 필요한 시점에 load하려면 `import(specifier)`를 사용하고 rejection을 처리한다.
- code splitting은 syntax만으로 보장되지 않으며 bundler graph/chunk 정책을 확인한다.

## Node.js/NestJS 경계

Node.js는 `package.json`의 `type`, `.mjs/.cjs`, package `exports/imports`와 extension resolution 규칙을 함께 본다. CommonJS의 value copy/cache 직관을 ESM live binding과 섞지 않는다. NestJS package/toolchain을 ESM으로 바꿀 때 decorator metadata, test runner, migration CLI와 third-party package 호환성을 함께 검증한다.

## 출처

- [ECMAScript Language Specification, scripts and modules](https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html)
- [HTML Standard, JavaScript module scripts](https://html.spec.whatwg.org/multipage/webappapis.html#integration-with-the-javascript-module-system)
- [Node.js, ECMAScript modules](https://nodejs.org/api/esm.html)
- [Fixing Top-Level Await in Safari — WebKit](https://webkit.org/blog/18227/fixing-top-level-await-in-safari/)
- [실행 환경](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48872), [module 개요](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48873), [scope/live binding/this](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=48874), [export/import 형태](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49428)

## 관련 문서

- [[Module-System-ESM|Node.js ESM]]
- [[Module-System-CommonJS|CommonJS]]
- [[NestJS-Circular-Dependency-ForwardRef-ModuleRef|NestJS 순환 의존성]]
- [[TS-JavaScript-Migration|TypeScript와 JavaScript migration]]
