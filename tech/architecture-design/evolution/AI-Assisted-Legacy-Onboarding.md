---
tags: [architecture, evolution, legacy, ai, onboarding, characterization-test]
status: done
verified_at: 2026-08-04
category: "Architecture - 진화"
aliases: ["AI Assisted Legacy Onboarding", "AI 레거시 공략", "레거시 온보딩", "AI 역공학"]
---

# AI를 활용한 레거시 온보딩과 변경

AI coding agent는 낯선 codebase의 탐색과 반복 수정을 빠르게 할 수 있다. 그러나 정적 코드만 보고 복원한 규칙은 **검증 전 가설**이다. 안전한 변경의 주체는 요구사항, 운영 동작과 데이터 불변식을 확인하고 결과를 승인하는 개발자와 팀이다.

## 먼저 현재 동작의 증거를 모은다

코드 정리부터 시작하면 버그인지 호환 동작인지 모르는 부분까지 바꿀 수 있다. 다음 순서로 현재 상태를 복원한다.

1. 실행 방법, test, migration, 배포와 rollback 절차를 찾는다.
2. 사용자 진입점에서 controller, use case, repository와 외부 연동을 따라간다.
3. schema, constraint, 실제 query, log와 metric으로 정적 분석을 교차 검증한다.
4. 문서와 코드가 다르면 어느 쪽이 현재 production 동작인지 확인한다.
5. 알려진 입력과 출력을 characterization test로 고정한다.

AI에게 전체 repository 설명을 한 번에 요청하기보다 구체적인 path와 질문을 준다. 예를 들어 상품 주문 흐름의 entry point, 상태 전이, transaction 경계, 외부 부수효과와 미확인 가정을 각각 요구한다. 결과에는 근거 file/symbol을 붙이게 하고 직접 source를 읽는다.

## 요구사항을 실행 가능한 계약으로 바꾼다

러프한 화면이나 한 문장 요구사항에는 구현을 결정할 정보가 부족하다. agent를 실행하기 전에 다음을 명시한다.

| 축 | 확인할 질문 |
|---|---|
| Actor | 요청자, 소유자, 결제자와 승인자는 누구인가 |
| State | 정상 상태와 허용된 전이, 취소/재시도 규칙은 무엇인가 |
| Data | 기준 ID, snapshot, 기존 row와 migration은 어떻게 다루는가 |
| Time | 조회 기간, timezone, freshness와 cutoff는 무엇인가 |
| Money | 통화 단위, 할인/환불 배분, 반올림과 상한은 무엇인가 |
| Failure | 중간 실패, 중복 요청과 외부 timeout 뒤 복구 방법은 무엇인가 |
| Compatibility | 구 client, API와 순차 배포를 얼마나 유지해야 하는가 |
| Operations | log, metric, audit, reconciliation과 rollback 증거는 무엇인가 |

성공 예시만 주지 말고 경계값, 권한 거부, 이미 처리된 요청, 부분 실패와 동시 요청 예시를 함께 준다. 요구사항의 모호함을 agent가 임의의 정책으로 채우지 못하게 **미결정 사항은 질문 또는 TODO로 남기라**고 지시한다.

## 작은 변경 loop

```text
Observe -> Specify -> Plan -> Patch -> Verify -> Review -> Record
```

### Observe

관련 caller, test, schema와 production evidence를 좁혀 읽는다. agent가 만든 architecture map은 탐색 후보이며 사실 목록이 아니다.

### Specify

외부 동작, 보존할 호환성, 금지 범위와 acceptance test를 적는다. refactoring과 behavior change를 같은 patch에서 섞지 않는 것이 review에 유리하다.

### Plan

변경 file, data migration, rollout 순서, rollback과 예상 risk를 agent에게 먼저 제시하게 한다. 계획이 기존 경계를 불필요하게 넓히면 구현 전에 줄인다.

### Patch

한 번에 한 invariant나 한 vertical slice만 맡긴다. 여러 domain을 동시에 바꾸는 큰 prompt보다 product option schema, backfill, read path 전환처럼 검증 가능한 단위가 안전하다.

### Verify

lint와 unit test만으로 끝내지 않는다. integration test, migration rehearsal, query plan, 외부 sandbox와 핵심 business invariant를 위험에 맞춰 확인한다.

### Review

agent가 요구사항을 충족했는지뿐 아니라 삭제한 동작, 숨은 query, transaction 범위, authorization, error handling과 unused code까지 source diff로 본다. test가 통과해도 test 자체가 잘못된 정책을 고정했을 수 있다.

### Record

새로 확인한 규칙만 repository instruction, ADR와 test에 남긴다. 특정 구현에서 우연히 발견한 패턴을 팀의 보편 규칙으로 승격하지 않는다.

## project guideline의 역할

지속 instruction에는 agent가 추론하기 어려우면서 여러 작업에 반복되는 사실을 둔다.

- build/test/migration 명령과 target path
- layer와 dependency boundary
- transaction, error와 logging 원칙
- 현재 framework 기준과 금지된 legacy API
- source of truth와 검증 절차

패키지 이름이나 `Manager`, `Reader`, `Assembler` 같은 용어 자체가 좋은 설계를 보장하지 않는다. 팀이 의미와 책임을 합의하고 source/test로 강제할 수 있을 때만 guideline에 둔다. JetBrains Junie도 project instruction을 context로 사용하지만 생성 결과는 비결정적이므로 검토가 필요하다.

## 자주 발생하는 실패

- **정적 코드만으로 규칙 생성**: 역사적 우연과 dead code를 표준으로 만든다.
- **동작 확인 전 대규모 정리**: 호환 동작과 버그를 구분하지 못한다.
- **통과하는 test만 목표화**: agent가 assertion이나 fixture를 약하게 바꿔 green을 만들 수 있다.
- **복잡한 금액 정책을 한 prompt로 구현**: 부분 취소, coupon 복원과 반올림 정책이 서로 충돌한다.
- **schema 변경을 application code로만 처리**: backfill, 혼합 version과 rollback이 빠진다.
- **N+1과 과도한 조회**: 보기 좋은 component 분리가 실제 query 수를 숨긴다.
- **generic 이름으로 책임 은폐**: manager와 processor가 여러 domain 결정을 빨아들인다.
- **AI 생성물이 새 legacy가 됨**: 의도, test와 운영 evidence가 남지 않는다.

## NestJS와 TypeORM 적용

- controller에서 domain 조합이 커지면 use case/application service로 옮기되 계층 이름보다 transaction과 책임 경계를 먼저 정한다.
- TypeORM entity를 여러 component 사이의 만능 DTO로 전달하지 않는다. 필요한 ID, value object와 command/query model로 의도를 드러낸다.
- production schema는 `synchronize`에 맡기지 않고 migration을 version 관리한다.
- repository 분리 뒤 실제 SQL 수가 늘지 않았는지 query log와 plan으로 확인한다.
- 외부 결제 호출과 local DB transaction을 하나의 ACID transaction으로 착각하지 않고 idempotency, 상태 기록과 복구 절차를 설계한다.

## 완료 조건

- 변경 전 동작과 미확인 가정이 구분되어 있다.
- acceptance test가 정상, 실패, 권한, 중복과 동시성 경계를 포함한다.
- schema/data migration과 mixed-version rollout을 rehearsal했다.
- agent가 수정한 모든 file을 사람이 review했다.
- query, transaction, external side effect와 rollback을 확인했다.
- 새 지식은 source/test/ADR 가운데 유지 가능한 곳에 남았다.

## 출처

- [JetBrains, Junie Playbook](https://www.jetbrains.com/guide/ai/article/junie/)
- [JetBrains, Junie project settings](https://junie.jetbrains.com/docs/junie-plugin-project-settings.html)
- [제미니 강사, 입사 첫날 레거시와 AI](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392728)
- [제미니 강사, 상품 목록 요구사항 분석](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392731)
- [제미니 강사, 리뷰 기능의 AI 구현과 검토](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392783)
- [제미니 강사, 취소 기능의 단계적 AI 구현](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392803)
- [제미니 강사, 정산 기능의 AI 구현과 검토](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392808)

## 관련 문서

- [[Legacy-Modernization-Strategies|레거시 현대화 전략]]
- [[Refactoring-In-Practice|실전 리팩토링]]
- [[Agent-Coding-Guardrails|AI coding agent guardrail]]
- [[Agent-Spec-Writing|agent 작업 명세 작성]]
- [[Test-Pyramid|테스트 피라미드]]
