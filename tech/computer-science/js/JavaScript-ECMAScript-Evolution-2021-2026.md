---
tags: [cs, javascript, ecmascript, tc39, temporal, nodejs, typescript, compatibility]
status: done
verified_at: 2026-10-27
category: "CS - JavaScript"
aliases: ["ECMAScript Evolution 2021-2026", "ES2021~ES2026 변화", "ECMAScript 연도별 기능과 런타임 도입"]
---

# ECMAScript 2021~2026 변화와 런타임 도입 판단

ECMAScript는 Ecma TC39가 ECMA-262로 해마다 새 판을 내는 JavaScript 언어 명세다. 2021년 6월 12판(ES2021)부터 2026년 6월 17판(ES2026)까지 여섯 판이 나왔다. 판의 연도는 기능이 명세에 실린 시점일 뿐이고, 배포한 런타임에서 그 기능을 쓸 수 있는지는 별개의 질문이다. 도입은 제안 단계, 게시 연도, 실제 런타임 버전과 빌드 도구 설정을 각각 확인해 판단한다.

## 제안이 연도별 판에 들어가는 과정

| Stage | 목적 | 도입 판단에서의 의미 |
|---|---|---|
| 0 | 문제 영역 정의와 탐색 | 사용 대상이 아니다 |
| 1 | 해법 설계 | API 모양이 크게 바뀔 수 있다 |
| 2 | 해법 정교화 | 설계가 초안이라 크게 바뀔 수 있고 표준에 끝내 들어가지 않을 수도 있다 |
| 2.7 | 테스트와 검증 | 해법은 완성됐고 Test262 테스트를 작성하며 구현과 사용 피드백을 기다린다 |
| 3 | 구현 경험 축적, 웹 호환성과 통합 문제 발견 | 변경은 예상하지 않지만 웹 비호환이나 프로덕션 구현 피드백 때문에 바뀔 수 있다. 플래그 뒤에서만 출하하라는 조건이 붙기도 한다(예: Temporal의 Stage 3 조건) |
| 4 | 명세 초안 통합과 연도별 표준 수록 | finished proposals 목록에 오르고 게시 예정 연도가 붙는다 |

Stage 4에 들어가려면 다음 조건을 갖춰야 한다.

- Test262 승인 테스트를 통과하는 호환 구현 두 개
- 독립된 두 VM이 제공하는 수준의 상당한 출하 구현 현장 경험
- 통합 명세 텍스트를 담아 tc39/ecma262 또는 tc39/ecma402에 보낸 pull request
- 해당 편집자 그룹의 pull request 승인

Stage 4는 둘 이상의 엔진이 구현을 출하했다는 신호지만 내가 쓰는 런타임 버전에 들어 있다는 뜻은 아니다. 반대로 Temporal처럼 Stage 3 기간에 플래그 없이 출하된 기능도 있다.

연도별 판은 특정 시점의 스냅샷이다. 프로세스 문서의 일정에서는 2월 1일 후보 초안과 60일 opt-out 기간을 거쳐 3월 TC39 회의에서 Stage 4 제안을 반영하고 새 명세 버전을 `main`에서 분기한 뒤 Ecma 집행위원회와 총회 검토를 거친다. Ecma는 12판부터 17판까지 모두 그해 6월판으로 표기한다. finished proposals 표의 Expected Publication Year 열은 제안이 실릴 판의 예상 연도다. 2026년 1월 회의에서 Stage 4가 된 upsert는 ES2026 명세에 실렸고, 2026년 3월 회의에서 Stage 4가 된 Temporal은 2027로 표시된다.

## ES2021~ES2026 주요 기능

게시 연도는 finished proposals 목록을 따른다. 애플리케이션 코드에 자주 닿는 항목만 추린 표이며, 기능별 동작과 함정은 관련 문서에서 다룬다.

| 판 | 주요 기능 | 관련 문서 |
|---|---|---|
| ES2021 (12판) | `String.prototype.replaceAll`, `Promise.any`와 `AggregateError`, `WeakRef`와 `FinalizationRegistry`, 논리 할당 연산자(`&&=`, `??=` 등), 숫자 구분자 `1_000` | [[JavaScript-Numbers-Strings-and-Regular-Expressions\|replaceAll]], [[Promise-Async\|Promise.any]], [[JavaScript-Expressions-Control-Flow-and-Coercion\|논리 할당]] |
| ES2022 (13판) | public, private instance field와 static field, private method와 accessor, class static block, `#x in obj`, top-level `await`, `.at()`, `Object.hasOwn`, `Error`의 `cause`, RegExp `d` flag | [[JavaScript-Class-Semantics\|class 의미론]], [[JS-Access-Modifiers\|private 필드]], [[JavaScript-ES-Modules\|top-level await]] |
| ES2023 (14판) | `toSorted`, `toReversed`, `toSpliced`, `with`, `findLast`, `findLastIndex`, 대부분의 Symbol을 weak collection key로 허용, hashbang `#!` | [[JavaScript-Array-Mutation-Iteration-and-Sorting\|배열 변경과 정렬]], [[JavaScript-Keyed-Collections-and-Weak-References\|Symbol key 규칙]] |
| ES2024 (15판) | `Object.groupBy`, `Map.groupBy`, `Promise.withResolvers`, resizable `ArrayBuffer`와 growable `SharedArrayBuffer`, `ArrayBuffer` transfer, RegExp `v` flag, `Atomics.waitAsync`, `String.prototype.isWellFormed`, `toWellFormed` | [[JavaScript-Binary-Data-and-Workers\|binary data]], [[JavaScript-RegExp-Unicode-and-Matches\|정규표현식과 Unicode]] |
| ES2025 (16판) | iterator helper, `Set` 집합 메서드, import attributes와 JSON modules, `RegExp.escape`, RegExp modifiers, 중복 이름 capture group, `Promise.try`, `Float16Array`와 `Math.f16round` | [[JavaScript-Iterable-Functional-Pipelines\|iterator 파이프라인]], [[JavaScript-ES-Modules\|JSON import]], [[JavaScript-Keyed-Collections-and-Weak-References\|Set 메서드]] |
| ES2026 (17판) | `Array.fromAsync`, `Error.isError`, `Math.sumPrecise`, `Uint8Array` base64/hex 변환, `Iterator.concat`, `Map`/`WeakMap`의 `getOrInsert`와 `getOrInsertComputed`, `JSON.rawJSON`과 `JSON.isRawJSON` | [[JavaScript-Object-and-Array-Operations\|Array.fromAsync]], [[JavaScript-Expressions-Control-Flow-and-Coercion\|Error.isError]] |

Temporal, 명시적 리소스 관리(`using`, `DisposableStack`), `Atomics.pause` 등은 Stage 4를 통과했지만 게시 예정 연도가 2027이라 ES2026 판에는 없다. 런타임이 ES2026을 지원한다는 설명만으로 이 기능들의 제공 여부를 판단하지 않는다. 명시적 리소스 관리는 [[JavaScript-Resource-Management|명시적 리소스 해제]]에서 다룬다.

2026-10-27 확인한 finished proposals 목록에서 게시 예정 연도가 2027인 제안은 Temporal(2026-03 Stage 4), 명시적 리소스 관리, `Atomics.pause`, Joint Iteration(셋 다 2026-05-19 Stage 4), Iterator Chunking, Iterator Includes, Iterator Join(셋 다 2026-09-29 Stage 4)이다. ES2027 판은 2027년 3월 회의 전후에 내용이 확정되므로 이 목록은 그 사이에 늘어날 수 있다. iterator 관련 제안은 ES2025 iterator helper 위에 덧붙는 기능이라 런타임 지원도 기능별로 따로 확인한다.

## Temporal의 상태와 런타임 지원

Temporal은 `Date`를 대체하도록 설계된 날짜와 시간 API로, time zone과 calendar 표현, wall-clock 변환과 산술을 내장한다. `Date`가 timezone을 저장하지 않아 생기는 문제는 [[JavaScript-Global-JSON-Date-and-Builtins#Date의 시간 모델|Date의 시간 모델]]에서 다룬다.

- 2021년 3월 TC39 회의에서 조건부로 Stage 3가 됐다. 이때 IETF의 문자열 문법 결론이 나기 전에는 구현이 플래그 없이 출하하지 않아야 한다는 조건을 붙였다. 시간대와 달력 주석을 담는 이 문법은 2024년 4월 RFC 9557로 게시됐다.
- 2026년 3월 회의에서 Stage 4가 됐다. 게시 예정 연도는 2027이며 명세 텍스트는 ECMA-262와 ECMA-402에 병합될 예정이다.

2026-10-21 기준 플래그 없이 Temporal을 제공하는 첫 버전은 다음과 같다.

| 런타임 | 첫 버전 | 확인 사항 |
|---|---|---|
| Firefox | 139 (2025-05-27) | 기본 활성화 |
| Chrome | 144 (2026-01-13) | Edge 등 Chromium 계열은 MDN 호환성 데이터에서 Chrome 값을 따른다 |
| Deno | 2.7 (2026-02-25) | `--unstable-temporal` 플래그가 더는 필요 없다 |
| Node.js | 26.0.0 (2026-05-05) | V8 14.6, 기본 활성화 |
| Safari | 정식 버전 없음 | macOS는 Technology Preview에만 있고 iOS Safari는 미지원 |

Safari 정식 버전이 지원하지 않아 MDN은 Temporal을 Baseline이 아닌 Limited availability로 표시한다.

Node.js에서는 다음을 확인한다.

- nodejs/Release 일정표에서 Node.js 26의 LTS 전환일은 2026-10-28이고 그 전까지는 Current다. Node.js 24는 2026-10-20부터 Maintenance LTS로 잡혀 있다. MDN 호환성 데이터는 Node.js의 Temporal 지원 시작을 26.0.0으로 기록하므로 26 미만(EOL된 25 포함)을 배포한다면 polyfill을 쓰거나 Temporal 의존 코드를 미룬다.
- 소스에서 빌드한 Node.js에는 Temporal이 빠질 수 있다. `configure.py`는 Temporal 옵션이 없으면 `cargo`와 `rustc`를 찾고, 둘 중 하나라도 없으면 경고만 출력한 채 Temporal 지원을 끈다. `--v8-enable-temporal-support`를 주면 툴체인이 없을 때 빌드가 실패하고, `--v8-disable-temporal-support`는 지원을 명시적으로 뺀다. 배포판 패키지나 직접 빌드한 이미지라면 실행 환경에서 `Temporal` 전역을 확인한다.
- 제안 저장소에 포함된 polyfill은 테스트용 비프로덕션 구현이므로 애플리케이션에 쓰지 않는다. 2026-10-21 기준 제안 저장소의 polyfill 표에서 `temporal-polyfill`은 stable 릴리스, `@js-temporal/polyfill`은 alpha 릴리스, `temporal-polyfill-lite`는 release candidate 단계다.

## Node.js와 TypeScript 백엔드의 도입 확인

1. **실제 배포 런타임**: 선언한 지원 범위나 로컬 개발 버전이 아니라 배포 이미지, 서버리스 런타임 설정과 CI에서 실제로 실행되는 `process.versions.node`와 `process.versions.v8`을 기준으로 삼는다. v8 값에는 Node.js 전용 접미사가 붙는다. 버전 선택은 [[TypeScript-Node|Node.js에서 TypeScript 개발과 실행]]을 따른다.
2. **기능별 지원 버전**: MDN 호환성 표의 Node.js 행과 부분 구현 주석까지 읽는다. `Error.isError`는 Node.js 24.0.0부터 있지만 24.3.0 전에는 `DOMException`에 `false`를 반환하는 부분 구현으로 기록돼 있다([[JavaScript-Expressions-Control-Flow-and-Coercion|오류 판별]]).
3. **Baseline과 서버 런타임**: Baseline은 Safari(macOS, iOS), Chrome(데스크톱, Android), Edge(데스크톱), Firefox(데스크톱, Android) 7개 브라우저의 지원만 본다. newly available은 각 브라우저의 최신 안정 버전에서 동작한다는 뜻이고, widely available은 2.5년 이상 일관되게 지원됐다는 뜻이다. Node.js 서버 코드에서는 Baseline 표시를 근거로 쓰지 않는다. `DisposableStack`은 Node.js 24.0.0, Chrome 134, Firefox 141부터 있지만 Safari가 Technology Preview에 머물러 Baseline이 아니다. 반대로 Baseline 기능이라도 오래된 Node.js major에는 없을 수 있다.
4. **TypeScript `target`과 `lib`**: 두 옵션의 차이는 [[option|TypeScript 컴파일러 옵션]]을 따른다. TypeScript 6.0.3과 2026-10-21 기준 최신 안정판 7.0.2의 연도별 lib는 `es2025`까지이고 `es2026`은 없다. 2026-10-20 공개된 7.1 Beta는 `es2026`을 `target`과 `lib` 값으로 추가했다. 두 안정판 모두 Temporal 선언은 `esnext.temporal`, 명시적 리소스 관리 선언은 `esnext.disposable`에 있으며 `esnext` 묶음은 명세 변화에 따라 내용이 바뀐다. `lib: ["esnext"]`를 쓰면 Node.js 24에 없는 `Temporal`도 타입 검사를 통과하므로, 가장 낮은 배포 런타임이 제공하는 범위에 맞추고 `esnext.*` 구성 요소는 런타임 보장이나 polyfill이 있을 때만 더한다.
5. **문법과 API 구분**: 새 내장 객체와 메서드는 polyfill로 보완할 수 있다. `using`이나 class field 같은 문법은 런타임 파서가 모르면 코드 파싱 단계에서 `SyntaxError`가 나므로 하위 문법으로 변환하거나 런타임을 올린다.
6. **시작 시점 검사**: 런타임별 차이가 큰 API는 요청을 받기 전에 존재를 확인하고, 없으면 polyfill을 로드하거나 바로 실패시킨다.

```js
// 배포 런타임에 Temporal이 없으면 요청을 받기 전에 실패시킨다
if (!("Temporal" in globalThis)) {
  throw new Error(
    `Temporal unavailable: node ${process.versions.node}, v8 ${process.versions.v8}`,
  );
}
```

## 트레이드오프

- **연도 고정 lib와 `esnext`**: 연도 고정은 배포 런타임과 맞추기 쉽다. `esnext`는 새 선언을 바로 쓰지만 TypeScript 버전마다 범위가 바뀌고 런타임 제공을 보장하지 않는다.
- **런타임 업그레이드와 polyfill**: 런타임을 올리면 네이티브 구현을 쓰지만 major 업그레이드의 호환성 검증이 필요하다. polyfill은 낮은 런타임에서도 표준 API 형태로 코드를 쓰게 해 주지만 네이티브 구현과의 차이와 이후 제거 작업을 관리해야 한다.
- **Stage 3 기능 선사용**: 런타임이 먼저 출하했더라도 Stage 4 전에는 웹 비호환이나 구현 피드백으로 의미가 바뀔 수 있다. 공개 API 계약이나 저장 데이터 형식에 닿는 코드는 Stage 4 여부와 대상 런타임 지원을 함께 확인한 뒤 쓴다.

## 출처

- [TC39, The TC39 Process](https://tc39.es/process-document/)
- [Finished Proposals — TC39](https://github.com/tc39/proposals/blob/main/finished-proposals.md)
- [finished-proposals.md 변경 이력 — TC39](https://github.com/tc39/proposals/commits/main/finished-proposals.md) — 2026-05-19, 2026-09-29 Stage 4 반영 커밋을 2026-10-27 대조
- [2026년 JavaScript 동향 — GeekNews](https://news.hada.io/topic?id=35745) — 단서. 원 자료인 NAVER D2 글은 본문을 열지 못해 반영하지 않았다
- [Ecma International, ECMA-262 17th edition (ECMAScript 2026)](https://ecma-international.org/publications-and-standards/standards/ecma-262/)
- [ECMAScript 2026 Language Specification](https://262.ecma-international.org/17.0/)
- [March 10, 2021 meeting notes, Temporal for Stage 3 — TC39](https://github.com/tc39/notes/blob/main/meetings/2021-03/mar-10.md#temporal-pt-2)
- [January 20, 2026 meeting notes, Upsert for Stage 4 — TC39](https://github.com/tc39/notes/blob/main/meetings/2026-01/january-20.md#upsert-for-stage-4)
- [March 11, 2026 meeting notes, Temporal for Stage 4 — TC39](https://github.com/tc39/notes/blob/main/meetings/2026-03/march-11.md#temporal-for-stage-4)
- [proposal-temporal — TC39](https://github.com/tc39/proposal-temporal), [IETF 표준화 추적 이슈 #1450](https://github.com/tc39/proposal-temporal/issues/1450)
- [IETF, RFC 9557](https://www.rfc-editor.org/rfc/rfc9557.html)
- [MDN, Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal), [Baseline (compatibility)](https://developer.mozilla.org/en-US/docs/Glossary/Baseline/Compatibility)
- [browser-compat-data, Temporal.json — MDN](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/Temporal.json), [DisposableStack.json](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/DisposableStack.json), [Error.json](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/Error.json)
- [Firefox 139 release notes for developers — MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/139)
- [Chrome 144 release notes — Chrome for Developers](https://developer.chrome.com/release-notes/144)
- [Deno 2.7 — Deno](https://deno.com/blog/v2.7)
- [Node.js 26.0.0 (Current) — Node.js](https://nodejs.org/blog/release/v26.0.0)
- [Release schedule, schedule.json — Node.js](https://github.com/nodejs/Release/blob/main/schedule.json)
- [Building Node.js with Temporal support, BUILDING.md — Node.js](https://github.com/nodejs/node/blob/v26.x/BUILDING.md)
- [Node.js, process.versions](https://nodejs.org/api/process.html#processversions)
- [Announcing TypeScript 6.0 — TypeScript](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- [TypeScript 7.0.2 — TypeScript](https://github.com/microsoft/TypeScript/releases/tag/v7.0.2)
- [Announcing TypeScript 7.1 Beta — TypeScript](https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/)
- [TypeScript, TSConfig Reference: target](https://www.typescriptlang.org/tsconfig/#target)
- [TypeScript 6.0.3 lib 목록, libs.json — TypeScript](https://github.com/microsoft/TypeScript/blob/v6.0.3/src/lib/libs.json)
- [TypeScript 7.0.2 lib과 target 값, enummaps.go — TypeScript](https://github.com/microsoft/typescript-go/blob/typescript/v7.0.2/internal/tsoptions/enummaps.go)

## 관련 문서

- [[JavaScript-Global-JSON-Date-and-Builtins|global object, JSON과 Date]]
- [[JavaScript-Resource-Management|명시적 리소스 해제]]
- [[JavaScript-Lexical-Scope-and-Modern-Syntax|렉시컬 스코프와 모던 문법]]
- [[option|TypeScript 컴파일러 옵션]]
- [[TypeScript-Node|Node.js에서 TypeScript 개발과 실행]]
