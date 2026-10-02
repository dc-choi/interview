---
tags: [runtime, nodejs]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["Test Runner Mocking", "테스트 러너 모킹"]
---

# 테스트 러너 모킹과 커버리지

Node.js 내장 테스트 러너의 모듈/API/타이머 모킹, 그리고 코드 커버리지 기능을 다룬다.

## 모킹 (Mocking)

### 모킹 대상 기준

| 대상 | 단위 테스트 | 통합 테스트 |
|------|-----------|----------|
| 자신의 코드 | 실제 구현을 우선 사용 | 실제 구현 사용 |
| 외부 코드 (npm) | 비결정적 동작이나 경계만 대체 | 통합 범위에 따라 실제 구현 또는 대체 |
| 외부 시스템 (DB, FS) | 보통 대체 | 테스트 목적에 따라 격리된 실제 시스템 또는 대체 |

### 모듈 모킹
```bash
node --experimental-test-module-mocks --test
```
```js
import { test, mock } from 'node:test';

const barMock = mock.fn(() => 'mocked');
mock.module('./bar.mjs', {
  exports: { default: barMock, helper: mock.fn() },
});

const { foo } = await import('./foo.mjs');  // bar.mjs가 모킹된 상태로 로드
```

모듈 모킹은 현재도 실험 기능이며 위 플래그가 필요하다. `exports` 옵션은 Node.js v24.15.0부터 제공되며 `defaultExport`/`namedExports`와 함께 쓸 수 없다. 그 이전 릴리스에서는 기존 두 옵션을 사용한다.

### API 모킹 (Fetch/HTTP with undici)
```js
import { MockAgent, setGlobalDispatcher } from 'undici';

const agent = new MockAgent();
setGlobalDispatcher(agent);
agent.disableNetConnect();

const pool = agent.get('https://api.example.com');
pool.intercept({ path: '/users', method: 'GET' })
    .reply(200, [{ id: 1, name: 'John' }]);

// 이후 fetch('https://api.example.com/users')는 모킹된 응답 반환
```

전역 dispatcher를 교체하면 같은 프로세스의 다른 테스트에도 영향을 준다. 원래 dispatcher를 보관하고 `finally` 또는 test 종료 hook에서 복원한 뒤 MockAgent를 닫는다. 전역 상태를 바꾸는 테스트를 무심코 병렬 실행하지 않는다. `undici`의 MockAgent를 import하려면 패키지는 별도 설치해야 한다.

### 타이머 모킹
```js
import { test } from 'node:test';

test('지정한 시간만큼 시계를 진행한다', t => {
  t.mock.timers.enable({ now: new Date('2024-01-01T00:00:00Z') });

  // Date.now(), setTimeout, setInterval이 모킹된 시간으로 동작
  const now = Date.now();  // 2024-01-01T00:00:00Z

  t.mock.timers.tick(5000);  // 5초 경과 시뮬레이션
  // t.mock은 테스트 종료 시 정리된다.
});
```

`t.mock`은 테스트 수명에 맞춰 정리된다. 전역 `mock`을 사용한 대체는 복원과 reset의 소유자를 명시한다. 모듈 mock은 소비 모듈을 로드하기 전에 등록하고, 이미 로드된 import 참조까지 소급 교체된다고 가정하지 않는다.

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
node --experimental-test-coverage --test-coverage-include='src/*.js' --test

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
임계값 미달이면 비정상 종료하므로 CI 조건으로 사용할 수 있다. 커버리지는 실행 여부를 측정하며 올바른 assertion이나 경계 조건의 검증을 보장하지 않는다. 제외 규칙으로 수치를 높인 것은 검증이 늘어난 결과가 아니다.

`run()` API에서는 `coverage: true`, `coverageIncludeGlobs`, `coverageExcludeGlobs`와 `lineCoverage`/`branchCoverage`/`functionCoverage`를 사용한다. 포함과 제외를 함께 주면 두 조건을 모두 만족해야 포함된다. 기본 수집에서 로드되지 않은 소스 파일이 빠질 수 있으므로 보고서의 대상 집합도 확인한다.

## 출처

- [Node.js, Mocking in tests](https://nodejs.org/learn/test-runner/mocking)
- [Node.js, Collecting code coverage](https://nodejs.org/learn/test-runner/collecting-code-coverage)
- [Node.js, Test runner](https://nodejs.org/api/test.html)

- [Node.js, `mock.module()`](https://nodejs.org/api/test.html#mockmodulespecifier-options)
- [Undici, `MockAgent`](https://github.com/nodejs/undici/blob/main/docs/docs/api/MockAgent.md)

## 관련 문서
- [[Test-Runner-Basics|테스트 러너 기본]]
- [[Test-Runner|테스트 러너 인덱스]]
- [[Node.js]]
- [[Command-Line|커맨드라인]]
