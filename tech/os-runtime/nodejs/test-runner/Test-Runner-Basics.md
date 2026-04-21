---
tags: [runtime, nodejs]
status: done
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

## 관련 문서
- [[Test-Runner-Mocking|테스트 러너 모킹/커버리지]]
- [[Test-Runner|테스트 러너 인덱스]]
- [[Node.js]]
- [[Command-Line|커맨드라인]]
