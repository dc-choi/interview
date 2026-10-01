---
tags: [runtime, nodejs]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["Test Runner Basics", "테스트 러너 기본"]
---

# 테스트 러너 기본

Node.js v18+에서 제공하는 내장 테스트 모듈. 외부 프레임워크(Jest, Mocha 등) 없이 테스트를 작성하고 실행할 수 있다.

## 기본 사용법

### 실행
```bash
node --test                         # 모든 테스트 파일 자동 탐색
node --test "test/**/*.test.js"     # 글로브 패턴으로 지정 (v21+)
node --test --watch                 # 파일 변경 시 자동 재실행
```

### 테스트 파일 탐색 규칙
```
자동 탐색 대상:
- **/*.test.{js,mjs,cjs,ts,mts,cts}
- **/*-test.{js,mjs,cjs,ts,mts,cts}
- **/*_test.{js,mjs,cjs,ts,mts,cts}
- **/test-*.{js,mjs,cjs,ts,mts,cts}
- **/test.{js,mjs,cjs,ts,mts,cts}
- **/test/**/*.{js,mjs,cjs,ts,mts,cts}
```

TypeScript 확장자는 type stripping을 비활성화하는 `--no-strip-types`를 주면 기본 탐색에서 제외된다. Node.js v22에서는 flag 이름이 `--no-experimental-strip-types`다.

### describe/it (BDD 스타일)
```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Array', () => {
  it('should return -1 when value is not present', () => {
    assert.equal([1, 2, 3].indexOf(4), -1);
  });

  it('should return the index when value is present', () => {
    assert.equal([1, 2, 3].indexOf(2), 1);
  });
});
```

`node:assert/strict`에서는 `equal`, `deepEqual` 같은 비엄격 메서드도 `strictEqual`, `deepStrictEqual`처럼 동작한다. `strictEqual`은 `Object.is()`로 비교하므로 `1`과 `'1'`을 다르게 본다.

### test() (TAP 스타일)
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('addition', () => {
  assert.equal(1 + 2, 3);
});

test('async operation', async () => {
  const result = await fetchData();
  assert.ok(result);
});
```

## 테스트 작성 패턴

### 동적 테스트 케이스 (v18+)
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

const userAgents = [
  { os: 'Windows', ua: 'Mozilla/5.0 (Windows NT 10.0)' },
  { os: 'Mac', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' },
];

test('Detect OS via user-agent', async t => {
  for (const { os, ua } of userAgents) {
    await t.test(ua, () => {
      assert.equal(detectOsInUserAgent(ua), os);
    });
  }
});
```

suite 밖의 parent test는 끝나지 않은 subtest를 기다리지 않으므로 `t.test()`가 반환한 Promise를 반드시 기다린다.

### 스냅샷 테스팅 (v22.13.0+/v23.4.0+)
```bash
node --test                          # 스냅샷 비교 실행
node --test --test-update-snapshots  # 스냅샷 갱신
```
```js
import { test, snapshot } from 'node:test';

snapshot.setResolveSnapshotPath((testPath) => {
  return testPath + '.snapshot';
});

test('snapshot test', (t) => {
  const result = generateOutput();
  t.assert.snapshot(result);  // node:assert가 아닌 테스트 컨텍스트에서 사용
});
```

### 훅 (Hooks)
```js
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';

describe('Database', () => {
  before(() => { /* 테스트 스위트 시작 전 1회 */ });
  after(() => { /* 테스트 스위트 종료 후 1회 */ });
  beforeEach(() => { /* 각 테스트 전 */ });
  afterEach(() => { /* 각 테스트 후 */ });

  it('should connect', () => { /* ... */ });
});
```

### skip, todo, only
```js
import { test } from 'node:test';

test('결제 재시도', { skip: '외부 PG 샌드박스 점검 중' }, () => {});  // 실행하지 않고 사유만 보고
test('부분 환불', { todo: true }, () => { /* 실행되지만 실패해도 실패로 세지 않는다 */ });
test('주문 생성', { only: true }, () => {});                        // --test-only일 때 이 테스트만 실행
```

- `skip`과 `todo`는 옵션 외에 `test.skip()`, `test.todo()`, 테스트 안의 `t.skip()`, `t.todo()`로도 쓴다. `t.skip()`은 뒤 코드를 멈추지 않으므로 바로 `return`한다. 둘을 함께 주면 `todo`는 무시된다.
- TODO 테스트는 실행되지만 실패해도 프로세스 종료 코드에 영향을 주지 않는다. 실제 회귀를 todo로 덮으면 CI가 통과하므로, 알려진 실패는 실패해야 통과하는 `expectFailure`(v25.5.0, v24.14.0)로 표시해 고쳐졌을 때 드러나게 한다.
- `only`는 `--test-only`로 시작했거나 테스트 격리를 끈(`--test-isolation=none`) 경우에만 나머지를 건너뛴다. 기본 `node --test`는 `'only' and 'runOnly' require the --test-only command-line option.` 진단만 남기고 전부 실행하고, 파일을 `node a.test.mjs`로 직접 실행하면 `only`가 적용됐다(Node.js 26.7 확인). 하위 테스트만 고르려면 조상 테스트에도 `only`를 붙이거나 `t.runOnly(true)`를 쓴다.
- `--test-only`나 격리 해제 상태에서는 남겨 둔 `only`가 다른 테스트를 조용히 건너뛰게 한다. Node.js에는 `only`를 금지하는 CLI 플래그가 없으므로 lint나 CI 검색으로 commit 전에 걸러낸다.

### UI 테스팅 (JSDOM)
```
JSDOM 인스턴스는 1개만 유지하고, @testing-library/react 등과 함께 사용.
history.pushState, IndexedDB 같은 전역 객체는 setup 파일에서 데코레이션.
```
```js
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
globalThis.document = dom.window.document;
globalThis.window = dom.window;
```

## 외부 테스트 프레임워크와 선택 기준

| 도구 | 구성 | 맞는 조건 |
|---|---|---|
| `node:test` | 러너, `node:assert`, mock, 스냅샷, 커버리지 내장 | 외부 의존성 없이 라이브러리나 작은 서비스를 테스트할 때 |
| Mocha | 러너 중심. assertion은 Chai 같은 원하는 라이브러리와 조합 | 기존 Mocha 자산이 있거나 구성을 직접 고를 때 |
| Jest | 러너, `expect`, mock, 스냅샷을 한 패키지로 제공 | mock과 스냅샷 생태계가 필요한 CommonJS 중심 프로젝트. ESM 지원은 실험 단계라 `--experimental-vm-modules`가 필요하다(Jest 30.5 문서) |
| Vitest | Jest 호환 `expect`, mock, 스냅샷과 ESM, TypeScript, JSX 기본 지원. 개발 환경에서는 watch 모드로 시작 | ESM과 TypeScript 우선 프로젝트, Vite 설정을 공유하는 프로젝트 |

이 표는 각 도구의 공식 문서가 밝힌 기능을 비교한 제안이다. 현재 NestJS 문서는 새로 생성한 프로젝트가 Vitest를 기본으로 쓴다고 안내하므로(2026-09-30 확인), 프로젝트 템플릿이나 기존 CI가 정한 도구가 있으면 그 계약을 우선한다.

## 출처

- [Node.js, Running tests from the command line](https://nodejs.org/api/test.html#running-tests-from-the-command-line)
- [Node.js, Test context subtests](https://nodejs.org/api/test.html#contexttestname-options-fn)
- [Node.js, Snapshot testing](https://nodejs.org/api/test.html#snapshot-testing)
- [Node.js, Skipping tests](https://nodejs.org/api/test.html#skipping-tests)
- [Node.js, TODO tests](https://nodejs.org/api/test.html#todo-tests)
- [Node.js, Expecting tests to fail](https://nodejs.org/api/test.html#expecting-tests-to-fail)
- [Node.js, only tests](https://nodejs.org/api/test.html#only-tests)
- [Node.js, Command-line API, --test-only](https://nodejs.org/api/cli.html#--test-only)
- [Node.js, Assert, Strict assertion mode](https://nodejs.org/api/assert.html#strict-assertion-mode)
- [Mocha, Assertions](https://mochajs.org/features/assertions/)
- [Jest, ECMAScript Modules](https://jestjs.io/docs/ecmascript-modules)
- [Vitest, Features](https://vitest.dev/guide/features)
- [NestJS, Testing](https://docs.nestjs.com/fundamentals/testing)
- [인프런, 얄팍한 코딩사전, 테스팅과 린팅](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=278032)

## 관련 문서
- [[Test-Runner-Mocking|테스트 러너 모킹/커버리지]]
- [[Test-Runner|테스트 러너 인덱스]]
- [[Node.js]]
- [[Command-Line|커맨드라인]]
