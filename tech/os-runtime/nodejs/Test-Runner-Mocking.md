---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Test Runner Mocking", "테스트 러너 모킹"]
---

# 테스트 러너 모킹과 커버리지

Node.js 내장 테스트 러너의 모듈/API/타이머 모킹, 그리고 코드 커버리지 기능을 다룬다.

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
- [[Test-Runner-Basics|테스트 러너 기본]]
- [[Test-Runner|테스트 러너 인덱스]]
- [[Node.js]]
- [[Command-Line|커맨드라인]]
