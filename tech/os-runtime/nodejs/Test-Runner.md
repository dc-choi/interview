---
tags: [runtime, nodejs]
status: note
category: "OS & Runtime"
aliases: ["테스트 러너"]
---

# 테스트 러너 (Test Runner)

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
- **/*.test.{js,mjs,cjs}
- **/*-test.{js,mjs,cjs}
- **/*_test.{js,mjs,cjs}
- **/test-*.{js,mjs,cjs}
- **/test.{js,mjs,cjs}
- **/test/**/*.{js,mjs,cjs}
```

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

### 동적 테스트 케이스 (v23.8.0+)
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

const userAgents = [
  { os: 'Windows', ua: 'Mozilla/5.0 (Windows NT 10.0)' },
  { os: 'Mac', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' },
];

test('Detect OS via user-agent', { concurrency: true }, t => {
  for (const { os, ua } of userAgents) {
    t.test(ua, () => {
      assert.equal(detectOsInUserAgent(ua), os);
    });
  }
});
```

### 스냅샷 테스팅 (v22.3.0+)
```bash
node --experimental-test-snapshots --test           # 스냅샷 비교 실행
node --experimental-test-snapshots --test-update-snapshots --test  # 스냅샷 갱신
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

## 모킹 (Mocking)

### 모킹 대상 기준

| 대상 | 단위 테스트 | 통합 테스트 |
|------|-----------|----------|
| 자신의 코드 | 권장 | 선택적 |
| 외부 코드 (npm) | 항상 | 상황에 따라 |
| 외부 시스템 (DB, FS) | 항상 | 항상 |

### 모듈 모킹
```bash
node --experimental-test-module-mocks --test
```
```js
import { test, mock } from 'node:test';

const barMock = mock.fn(() => 'mocked');
mock.module('./bar.mjs', {
  defaultExport: barMock,
  namedExports: { helper: mock.fn() },
});

const { foo } = await import('./foo.mjs');  // bar.mjs가 모킹된 상태로 로드
```

### API 모킹 (Fetch/HTTP with undici)
```js
import { MockAgent, setGlobalDispatcher } from 'undici';

const agent = new MockAgent();
setGlobalDispatcher(agent);

const pool = agent.get('https://api.example.com');
pool.intercept({ path: '/users', method: 'GET' })
    .reply(200, [{ id: 1, name: 'John' }]);

// 이후 fetch('https://api.example.com/users')는 모킹된 응답 반환
```

### 타이머 모킹
```js
import { test, mock } from 'node:test';

test('timer test', () => {
  mock.timers.enable({ now: new Date('2024-01-01T00:00:00Z') });

  // Date.now(), setTimeout, setInterval이 모킹된 시간으로 동작
  const now = Date.now();  // 2024-01-01T00:00:00Z

  mock.timers.tick(5000);  // 5초 경과 시뮬레이션
  mock.timers.reset();
});
```

## 코드 커버리지

### 실행
```bash
node --experimental-test-coverage --test main.test.js
```

### 커버리지 메트릭

| 메트릭 | 설명 |
|--------|------|
| Line Coverage | 실행된 코드 라인의 비율 |
| Branch Coverage | 테스트된 분기(if/else, switch)의 비율 |
| Function Coverage | 호출된 함수의 비율 |

### 포함/제외 설정
```bash
# 특정 파일만 포함
node --experimental-test-coverage --test-coverage-include=src/*.js --test

# 특정 파일 제외
node --experimental-test-coverage --test-coverage-exclude=src/legacy.js --test
```

**주석으로 무시**
```js
/* node:coverage ignore next 3 */
if (process.env.DEBUG) {
  console.log('debug info');
}
```

### 임계값 설정
```bash
node --experimental-test-coverage \
  --test-coverage-lines=90 \
  --test-coverage-branches=85 \
  --test-coverage-functions=80 \
  --test
```
임계값 미달 시 비정상 종료 코드 반환 → CI 파이프라인에서 게이트로 활용 가능.

## 관련 문서
- [[Node.js]]
- [[Command-Line|커맨드라인]]
