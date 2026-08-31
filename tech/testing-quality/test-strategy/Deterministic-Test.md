---
tags: [testing, flaky-test, determinism]
status: done
verified_at: 2026-08-31
category: "테스트&품질(Testing&Quality)"
aliases: ["Deterministic Test", "결정적 테스트", "Flaky Test"]
---

# 결정적 테스트와 flaky 대응

**결정적 테스트(deterministic test)**는 같은 코드와 같은 입력에 대해 몇 번을 돌리든 같은 결과를 내는 테스트다. Google은 flaky한 결과를 "a test that exhibits both a passing and a failing result with the same code"로 정의한다. 격리는 결정성의 필요조건 하나일 뿐이고 시간, 랜덤, 대기, 동시성이 남아 있으면 완벽히 격리된 테스트도 흔들린다. 상태 초기화와 병렬 실행 격리는 [[Test-Isolation|테스트 격리]]에 있으므로 여기서는 그 위에 남는 비결정성만 다룬다.

## 비결정성의 원인 분류

| 원인 | 전형적 증상 | 1차 대응 |
|---|---|---|
| 시간, 타임존, 로케일 | 자정 근처나 특정 요일에만 실패, CI(UTC)와 로컬(KST)의 날짜 하루 차이 | 시계를 주입 경계로 밀거나 fake timer, `TZ`와 로케일을 러너 환경에 고정 |
| 랜덤, UUID, 자동증가 ID | 스냅샷 diff가 매 실행 달라짐, 정렬 결과가 뒤바뀜 | 시드 고정 PRNG와 ID 생성기 주입, 스냅샷에서 변동값 마스킹 |
| 실행 순서, 잔여 상태 | 단독 실행은 통과, 전체 실행에서만 실패 | [[Test-Isolation\|테스트 격리]]의 상태 초기화와 worker별 namespace |
| 동시성, 경합 | 재현율이 낮고 CI 부하가 높은 날에만 실패 | 경합 지점을 결정적으로 제어(수동 스케줄링, 배리어), 공유 자원 제거 |
| 네트워크, 외부 의존 | 외부 서비스 장애나 rate limit 때 동반 실패 | 계약 수준에서 대역으로 대체 ([[Mock-Testing-Strategy\|Mock 설계 전략]]), 실제 호출은 별도 계층으로 분리 |
| 대기 부족 | 느린 환경에서만 실패, 로컬에서는 재현 안 됨 | 고정 sleep 제거, 조건 폴링과 자동 재시도 assertion |
| 순서 없는 컬렉션, 직렬화 | 배열 비교가 간헐 실패, JSON 키 순서 차이 | 집합 비교나 명시적 정렬 후 비교 |
| 부동소수 정밀도 | 누적 연산 결과가 마지막 자리에서 어긋남 | 허용 오차 기반 비교, 금액은 정수 최소단위나 decimal 타입 |

Google Testing Blog도 flakiness의 원인을 테스트 자체, 테스트 실행 프레임워크, 대상 시스템처럼 컴포넌트 축으로 나눠 정리한다. 원인 축을 이렇게 나누는 이유는 대응이 서로 대체되지 않기 때문이다. 격리를 아무리 강화해도 고정 sleep은 사라지지 않고, fake timer를 걸어도 DB가 찍는 시각은 그대로다.

## 시간 고정

### fake timer가 잡는 것과 못 잡는 것

Vitest의 `vi.useFakeTimers()`는 `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, `setImmediate`, `clearImmediate`와 Date 계열 API를 대체하고, `process.nextTick`과 `queueMicrotask`는 기본으로 대체하지 않아 `toFake` 옵션으로 명시해야 한다. Jest의 modern fake timer는 `Date`, `performance.now()`, `queueMicrotask()`와 timer API를 대체하고 Node 환경에서는 `process.hrtime()`과 `process.nextTick()`도 포함한다. Jest의 legacy mode 범위는 또 다르므로, 두 도구의 fake 범위가 같다고 가정하지 말고 사용하는 버전과 설정을 명시한다 (2026-08-31 기준).

- `vi.advanceTimersByTime(ms)`, `jest.advanceTimersByTime(ms)` — 지정한 시간만큼 진행시키며 그 사이 예약된 타이머를 실행
- `vi.runAllTimers()`, `jest.runAllTimers()` — 큐가 빌 때까지 실행. Vitest는 시도 10,000회를 넘기면 무한 루프로 보고 throw
- `jest.runOnlyPendingTimers()` — 실행 중 새로 예약된 타이머는 건드리지 않아 재귀 타이머의 무한 루프를 피함
- `vi.setSystemTime(date)` — 타이머를 발화시키지 않고 `Date`와 같은 wall-clock API의 현재 시각을 바꾼다. `performance.now()`와 `hrtime` 같은 monotonic clock은 별도 fake 설정이나 명시적 clock 주입 없이는 같은 의미로 이동한다고 가정하지 않는다

fake timer가 못 잡는 범위가 flaky의 실제 서식지다.

- DB가 채우는 시각: `NOW()`, `CURRENT_TIMESTAMP`, `DEFAULT CURRENT_TIMESTAMP` 컬럼은 DB 서버 프로세스의 시계를 쓰므로 애플리케이션 프로세스의 fake timer와 무관하다
- 다른 프로세스와 컨테이너의 시계: 브라우저, 테스트 컨테이너, 외부 워커
- 타임존과 로케일: fake timer는 시각을 고정할 뿐 해석 규칙은 그대로다

### 시간 주입과 fake timer의 선택

| 기준 | 시계 주입 (Clock 포트) | fake timer |
|---|---|---|
| 대상 | 도메인 로직이 읽는 현재 시각 | 라이브러리와 프레임워크가 예약한 타이머 |
| 손대는 곳 | 프로덕션 코드 설계 (주입 경계) | 테스트 코드만 |
| 강점 | 의도가 시그니처에 드러나고 값 조작이 자유롭다 | 남의 코드가 부른 `setTimeout`까지 잡힌다 |
| 약점 | 내가 소유하지 않은 코드에는 못 쓴다 | 전역 상태라 해제 누락 시 다음 테스트로 샌다 |

기본은 시계를 주입 경계로 미는 쪽이다. 설계 원칙 자체는 [[Controllability-Functional-Core|제어 가능성과 Functional Core]]에 있고, fake timer는 그 경계 바깥(디바운스, 폴링, 재시도 백오프 등)에 남는 부분을 덮는 보완 수단으로 쓴다. NestJS/Jest 환경에서 fake timer 해제와 mock 복원을 빠뜨렸을 때의 구체적 증상은 [[NestJS-Testing|NestJS 테스트]]에 정리돼 있다.

### 타임존과 로케일 고정

Node.js에서 `TZ` 환경변수는 타임존 설정을 지정하고 `'Etc/UTC'`, `'Asia/Seoul'` 같은 기본 timezone ID를 지원한다. 문서 이력상 `process.env.TZ` 재할당이 런타임에 반영되는 것은 POSIX가 v13.0.0, Windows가 v16.2.0부터다. 그래도 러너 부팅 전에 환경변수로 고정하는 쪽이 안전하다. 이미 만들어진 `Intl` 포매터나 캐시된 값에는 재할당이 늦게 반영될 수 있기 때문이다.

- CI와 로컬을 같은 `TZ`로 맞춘다. 팀이 KST 로컬에서 개발하고 CI가 UTC면 날짜 경계 테스트가 하루씩 어긋난다
- 숫자와 날짜 포맷을 비교한다면 로케일도 함께 고정한다
- 운영이 여러 타임존을 다루면 UTC 고정 대신 대표 타임존 몇 개를 파라미터로 도는 테스트를 따로 둔다

## 랜덤과 ID 고정

- **시드 고정**: 난수는 생성기를 주입하고 테스트에서 고정 시드를 쓴다. `Math.random`을 직접 부르는 코드는 시드를 줄 수 없어 spy로 덮는 우회밖에 남지 않는다
- **ID 생성기 주입**: `randomUUID()`를 도메인 코드에서 직접 부르지 않고 `IdGenerator` 포트로 감싸면 테스트에서 순번 ID를 내려줄 수 있다
- **DB 자동증가 ID를 단정하지 않기**: `expect(id).toBe(1)`은 시퀀스 상태에 의존한다. 값이 아니라 관계(생성한 엔티티의 id로 다시 조회하면 같은 레코드)를 검증한다. TypeORM 통합 테스트에서 정리 방식에 따라 시퀀스가 유지되거나 리셋되는 차이는 [[Transactional-Test-Antipattern|트랜잭션 테스트 안티패턴]] 참조
- **스냅샷 마스킹**: id, 타임스탬프, 서명값은 스냅샷 직렬화 단계에서 고정 토큰으로 치환한다. 마스킹 없이 스냅샷을 쓰면 매 실행 diff가 나고, 결국 스냅샷을 무조건 갱신하는 습관이 생겨 회귀 탐지력이 사라진다

## 대기 전략

E2E와 통합 테스트에서 자주 걸리는 원인 하나는 잘못된 대기다. 대응의 골자는 고정 지연을 최대 대기 시간과 재확인 간격을 갖춘 조건 폴링으로 바꾸는 것이고, Playwright는 이 방식을 액션 전 actionability 검사와 재시도 assertion으로 프레임워크 차원에서 제공한다.

- **고정 sleep 금지**: `await sleep(2000)`은 느린 CI에서 부족하고 빠른 로컬에서 낭비다. 값을 늘려 넘긴 flaky는 사라진 게 아니라 더 느린 환경으로 미뤄진 것이다
- **조건 폴링**: 대기의 종료 조건을 시간이 아니라 상태로 쓴다. Playwright는 액션 전에 visible, stable, enabled, editable, receives events 같은 actionability 검사를 자동으로 기다린다
- **자동 재시도 assertion**: Playwright의 `toBeVisible()`, `toHaveText()` 같은 매처는 조건이 만족될 때까지 재시도하며 기본 timeout은 5초다. 여러 단정을 묶어 폴링하려면 `expect(...).toPass()`를 쓰는데, 이쪽은 기본 timeout이 0이라 timeout과 interval을 명시해야 한다 (2026-08-31 문서 기준)
- **타임아웃 값의 근거**: 관측된 p99 소요 시간에 여유를 곱해 정하고 그 근거를 코드 주석이나 설정에 남긴다. 근거 없는 30초는 실패를 30초씩 늦추기만 한다
- **폴링이 만드는 위양성**: 중간 상태를 통과 조건으로 잡으면 폴링이 이른 시점에 성공해버린다. 로딩 스피너가 사라진 것과 데이터가 렌더된 것은 다른 조건이고, 후자를 대기해야 한다
- 외부 컨테이너를 띄우는 통합 테스트는 준비 완료 신호를 기다려야 한다. 초기화 대기가 없어 생기는 CI flaky의 사례는 [[LocalStack-Integration-Test|LocalStack 통합 테스트]] 참조

## 탐지

- **정의를 먼저 합의한다**: 같은 커밋에서 결과가 갈리면 flaky다. 코드가 바뀌었으면 그것은 회귀지 flaky가 아니다. 이 구분이 없으면 진짜 버그가 flaky로 분류돼 사라진다
- **반복 실행으로 후보 좁히기**: Playwright는 `--repeat-each <N>`으로 각 테스트를 N번 돌린다. 단독 반복에서도 재현되면 시간, 랜덤, 대기와 테스트 내부 race를 먼저 보고, 전체 실행에서만 재현되면 순서와 공유 상태뿐 아니라 suite 부하, 자원 경쟁과 외부 rate limit도 함께 본다. 실행 형태는 원인 확정이 아니라 탐색 순서를 정하는 신호다
- **순서 섞기로 재현**: Vitest의 `sequence.shuffle`(기본값 `false`)은 파일과 테스트를 무작위 순서로 실행해 의도치 않은 테스트 간 의존을 드러낸다. `sequence.seed`(기본값 `Date.now()`)를 로그에 남겨야 실패한 순서를 재현할 수 있다
- **CI에서 축적**: 테스트 단위로 실패율과 재실행률을 누적한다. 한 번의 빨간불은 정보가 없고, 같은 테스트가 30회 중 3회 실패했다는 이력이 판단 근거다
- Google은 2016년 시점에 전체 테스트 실행의 약 1.5%가 flaky한 결과를 냈고, 테스트의 거의 16%가 어느 정도 flakiness를 가지며, pass에서 fail로의 전이 중 약 84%가 flaky 테스트와 얽혀 있다고 보고했다. 규모가 커질수록 flaky는 예외가 아니라 상시 운영 항목이다

## 운영 정책: 재시도와 quarantine

- **재시도는 신호를 지우지 않는 방식으로만**: Playwright는 첫 실행에 실패하고 재시도에서 통과한 테스트를 failed가 아니라 flaky로 분류한다. 재시도를 켜되 결과를 flaky로 남겨 집계하는 것이 핵심이고, 통과로 덮어써서 리포트에서 지우면 안 된다
- **재시도의 대가**: 자동 재시도는 실제 race condition을 은폐한다. Google은 flakiness가 높은 테스트를 자동으로 quarantine하는 도구를 두면서도 그것이 "could easily mask a real race condition or some other bug in the code being tested"라고 명시했다. 재시도 허용 범위는 결제, 정합성 등 은폐 비용이 큰 영역에서는 좁혀야 한다
- **quarantine으로 신뢰도 붕괴 차단**: flaky 테스트를 머지 게이트에서 빼되 삭제하지 않고 별도 잡에서 계속 돌린다. 게이트에 남겨두면 사람들이 빨간불을 무시하는 습관을 배우고, 그 습관이 진짜 실패까지 삼킨다
- **기한, 담당자, 삭제 기준**: quarantine 항목마다 이슈, 담당자, 기한을 붙인다. 기한을 넘기면 고치거나 삭제하고, 방치된 채 쌓이는 격리 목록은 그 자체가 부채다. 커버리지 손실이 두려워 못 지운다면 그 시나리오를 더 낮은 계층에서 결정적으로 다시 쓰는 것이 정답이다
- 계층 신뢰도 관점의 배경은 [[Test-Pyramid|테스트 피라미드]]에 있다. flaky를 방치한 상위 계층은 아무도 안 보는 초록불이 되고, [[Test-Pyramid-Blind-Spots|초록불이 못 잡는 것]]의 사각지대가 넓어진다

## 지표와 판정

| 지표 | 정의 | 쓰임 |
|---|---|---|
| flake rate | 같은 커밋 반복 실행 중 결과가 갈린 비율 | 전체 신뢰도의 추세 지표 |
| rerun rate | 재시도 후 통과한 실행의 비율 | 재시도로 가려진 양의 크기 |
| quarantine 체류 시간 | 격리 등록부터 해제나 삭제까지 걸린 기간 | 부채가 쌓이는지 도는지 판단 |
| top flaky 목록 | 실패 이력 상위 테스트 | 수리 우선순위 |

게이트 기준은 조직 상황에 맞춰 정하되, 임계값과 그 근거를 문서로 고정하고 초과 시 새 테스트 추가보다 수리를 우선한다는 규칙까지 함께 정해야 실제로 작동한다. 실기기 E2E처럼 자원 풀 자체가 흔들리는 환경의 재실행률 운영은 [[Device-Farm|Device Farm]] 참조.

## 면접 포인트

Q. flaky 테스트를 만나면 어떤 순서로 진단하는가?
- 먼저 같은 커밋에서 결과가 갈리는지 확인해 회귀와 구분한다
- 단독 반복 실행과 전체 실행을 나눠 돌린다. 단독에서 재현되면 시간, 랜덤, 대기 계열이고 전체에서만 재현되면 순서와 공유 상태 계열이다
- 순서 계열이면 시드를 기록한 무작위 순서 실행으로 의존 쌍을 좁힌다
- 원인 축이 잡히면 시계 주입, 시드 고정, 조건 폴링 중 해당하는 대응을 적용한다

Q. 테스트 재시도를 켜야 하는가?
- 켜되 재시도로 통과한 실행을 flaky로 분류해 남기는 조건에서만 켠다. 통과로 덮으면 진짜 race condition이 사라진다
- 재시도는 진단 시간을 벌어주는 완화책이지 수리가 아니다. 반복 등장하는 테스트는 quarantine으로 옮기고 기한과 담당자를 붙인다

Q. 테스트 격리와 결정성은 어떻게 다른가?
- 격리는 테스트 간 상태 간섭을 없애는 것이고, 결정성은 실행마다 같은 결과가 나오는 성질이다
- 격리는 결정성의 필요조건 중 하나다. 완벽히 격리된 단일 테스트도 시계, 난수, 고정 sleep 때문에 흔들릴 수 있다
- 반대로 결정적으로 보이는 테스트가 순서 의존을 숨기고 있을 수 있어 무작위 순서 실행으로 확인한다

## 출처
- [Vitest 공식 문서, Vi (vi.useFakeTimers, vi.setSystemTime)](https://vitest.dev/api/vi.html)
- [Vitest 공식 문서, sequence](https://vitest.dev/config/sequence)
- [Vitest 공식 문서, retry](https://vitest.dev/config/retry)
- [Jest 공식 문서, Timer Mocks](https://jestjs.io/docs/timer-mocks)
- [Playwright 공식 문서, Auto-waiting](https://playwright.dev/docs/actionability)
- [Playwright 공식 문서, Assertions](https://playwright.dev/docs/test-assertions)
- [Playwright 공식 문서, Retries](https://playwright.dev/docs/test-retries)
- [Playwright 공식 문서, Command line](https://playwright.dev/docs/test-cli)
- [Node.js 공식 문서, Command-line API (TZ)](https://nodejs.org/api/cli.html#tz)
- [Flaky Tests at Google and How We Mitigate Them — Google Testing Blog](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html)
- [Test Flakiness - One of the main challenges of automated testing — Google Testing Blog](https://testing.googleblog.com/2020/12/test-flakiness-one-of-main-challenges.html)

## 관련 문서
- [[Test-Isolation|테스트 격리]]
- [[Controllability-Functional-Core|제어 가능성과 Functional Core]]
- [[Test-Pyramid|Practical Test Pyramid]]
- [[Test-Pyramid-Blind-Spots|초록불이 못 잡는 것]]
- [[NestJS-Testing|NestJS 테스트]]
- [[HTTP-API-Integration-Testing|HTTP API 통합 테스트]]
- [[LocalStack-Integration-Test|LocalStack 통합 테스트]]
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
- [[Transactional-Test-Antipattern|트랜잭션 테스트 안티패턴]]
- [[Mock-Testing-Strategy|Mock 설계 전략]]
- [[Device-Farm|Device Farm]]
