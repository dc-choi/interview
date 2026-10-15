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

### 코드 설명의 형식과 사실 검증을 분리한다

레거시 문서 생성에는 대상 코드와 출력 템플릿을 함께 준다. 프로그램 개요, 데이터 구조, 메서드, 테스트 구성, 의존성, 오류 처리와 성능 검토 항목을 고정하면 인계 때 빠진 항목을 찾기 쉽다. Amazon Q Developer의 ABAP 문서 생성 예제는 이런 사용자 정의 템플릿을 사용한다(2025-07-01 AWS 공개 예제, 2026-10-14 대조).

검토 제안: 각 설명에 파일과 심볼을 연결하고, 코드에서 읽은 사실과 실행으로 확인할 가정을 나눈다. 빈 항목은 추측으로 채우지 않고 미확인으로 남긴다. 형식이 완성된 문서만으로 현재 업무 규칙이나 표준 기능으로의 대체 가능성이 검증되지는 않는다. 이 절은 문서 생성 방식만 대조했으며 실제 SAP 실행과 기존 절 전체의 재검증은 수행하지 않았다.

생성할 문서의 범위도 입력으로 정한다. 루트 README는 전체 구조와 시작점을 설명하고, 모듈 README는 해당 코드의 실행 방법과 외부 의존성을 다루도록 나눌 수 있다. AWS의 2025-04-11 문서 생성 예제는 선택한 폴더의 README 생성, 기존 README 갱신과 결과 승인 전 수정을 보여준다. 해당 예제의 문서 분석은 `.gitignore`에 지정한 파일을 제외하며, 접근할 수 없는 내부 플랫폼이나 사용자 정의 도구의 지식은 수동 보완 대상으로 둔다(2026-10-16 대조).

적용 제안: 생성 요청에 대상 폴더와 독자를 적고, 코드에서 확인할 수 없는 설정과 운영 절차는 별도 확인 항목으로 남긴다. 인계받는 사람이 README의 시작 명령부터 핵심 사용자 흐름까지 재현할 수 있는지 검사한다. 파일 제외는 이 예제의 분석 범위이며 비밀 보호나 도구 전체의 접근 통제를 보장하지 않는다. 문서 생성 기능을 직접 실행하거나 기존 절 전체를 재검증한 것은 아니므로 문서 전체의 검증일은 유지한다.

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

## 수정이 수렴하지 않을 때

같은 오류를 고쳐도 다른 정책이 깨지거나 임시 분기가 계속 늘면 추가 지시만 누적하지 않는다. 요구사항에서 상태, 금액, 호환성의 결정이 빠졌는지 먼저 확인하고, 필요하면 이번 작업의 변경만 식별해 마지막 검증 상태로 되돌린 뒤 명세를 다시 쓴다. 다른 사람의 변경이 섞인 작업 트리는 전체 reset으로 지우지 않는다.

금액 계산처럼 서로 의존하는 규칙은 한 번에 전부 맡기기보다 전체 취소, 부분 취소, 할인 배분, 반올림을 각각 검증 가능한 단계로 나눈다. 단계를 통과할 때 입력, 출력과 불변식을 남겨 다음 수정의 기준으로 쓴다.

## 자동 코드 변환의 완료와 동작 보존을 구분한다

런타임 업그레이드와 의존성 업그레이드는 범위가 다르다. 2026-10-09 Amazon Q Developer의 Java 변환 문서 기준, JDK 업그레이드는 대상 JDK와 호환되는 최소 변경을 수행한다. 제3자 라이브러리를 폭넓게 올리는 작업은 별도 변환으로 진행할 수 있으며, 변환 diff와 summary를 검토한 뒤 수락한다. JDK 전환이 끝났다는 이유로 모든 의존성 정리까지 완료됐다고 기록하지 않는다.

기존 테스트의 이식과 변환 뒤 새 테스트 생성도 구분한다. 같은 날 확인한 AWS Transform의 .NET 문서에서는 기존 MSTest, NUnit, xUnit 테스트를 이식하고 실행한다. 선택적으로 생성하는 테스트는 현대화된 코드에 대해 만들어지므로 **원래 코드의 동작 보존을 검증하는 증거가 아니다**. 새 코드와 새 테스트가 함께 통과해도 이전 정책이 유지되는지는 별도로 확인한다.

검증 제안: 변환 전에 고정한 입력과 기대 결과로 핵심 업무 흐름을 다시 실행한다. 변환 보고서와 남은 작업을 읽고, 애플리케이션 기능과 UI, 탐색 경로를 원래 동작과 비교한다. 위 내용은 문서로 확인한 도구의 범위이며 실제 프로젝트의 변환 성공률이나 절감률을 측정한 결과가 아니다.

### JDK 변경과 Jakarta 패키지 전환을 분리한다

2026-10-14 부분 검증: Spring Boot 3.0은 Java 17 이상과 Spring Framework 6.0을 요구하며, 사용하는 Jakarta EE 사양을 EE 10 기준으로 올렸다. 이에 따른 Servlet과 JPA 의존성 및 `javax`에서 `jakarta`로의 import 변경은 프레임워크와 해당 API의 전환이다. Java 17로 올리면 모든 `javax` 패키지가 사라진다는 뜻은 아니다. Java SE 17에도 `javax.sql`과 `DataSource`가 남아 있으므로 접두사 전체를 일괄 치환하지 않는다.

변환 계획에는 JDK, 프레임워크, 직접 및 전이 의존성의 목표 버전을 나눠 적는다. 생성 diff에서 해당 API의 좌표와 import가 함께 바뀌었는지 확인하고, 빌드 뒤 실제 연결과 요청 흐름을 검사한다. Amazon Q의 최소 JDK 변환 완료를 전체 프레임워크 전환 완료로 해석하지 않는다. 이 절의 버전 경계만 대조했으며 기존 문서 전체의 검증일은 갱신하지 않았다.

## 기존 조회 함수를 재사용할 때

함수 이름과 반환 타입이 같아도 조회 의미가 같다는 보장은 없다. 현재 SQL과 caller에서 상태 필터, soft delete, 소유자, 대상 타입, 정렬과 잠금을 확인한다. 과거의 전체 조회 함수를 새 타입별 조회에 그대로 쓰거나, 생략값을 전체 타입으로 해석하면 구현은 재사용해도 계약은 바뀐다. [[Backward-Compatibility-Design|하위 호환성]]과 함께 구 요청과 새 요청의 결과를 비교한다.

query 수는 요청 데이터 크기와 함께 측정한다. 단건 PK를 고정 횟수 조회하는 설계는 응답 시간과 책임 경계가 허용하면 유지할 수 있다. 목록 N개마다 조회가 늘어나는 경로는 N을 키워 부하와 지연을 확인하고 batch 조회, join 또는 projection을 검토한다. 쿼리 한 번을 줄이려고 계층 책임과 권한 검증을 흐리는 것도 비용이다.

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

## 전체 지도와 변경 경로를 오가며 탐색한다

낯선 코드베이스는 처음부터 끝까지 순서대로 읽기보다 시스템 경계와 이번 변경의 진입점을 먼저 찾는다. 모듈의 역할을 대략 확인한 뒤 입력이 들어오는 곳, 호출 관계와 데이터가 나가는 곳을 따라가고, 필요한 구현만 깊게 읽는다. 세부에서 길을 잃으면 전체 구조로 돌아와 위치를 다시 확인한다.

VS Code의 Call Hierarchy는 언어 확장이 제공하는 caller와 callee 관계를 탐색하는 도구다. 지원 범위는 등록된 provider에 달려 있고 결과가 없을 수도 있다([VS Code, CallHierarchyProvider](https://code.visualstudio.com/api/references/vscode-api#CallHierarchyProvider), 2026-10-01 확인). 동적 등록, 이벤트와 외부 설정 등 정적 호출 관계로 설명되지 않는 연결은 실행 흔적, 설정과 동료 설명을 대조한다.

이번 변경과 무관한 모듈을 잠시 추상화로 남겨도 된다. 다만 화면 변경이라도 공용 컴포넌트, 접근성, 권한과 API 계약처럼 영향을 받을 수 있는 경계는 확인한다. 지도 비유는 탐색 순서를 정하는 방법이지 변경 영향 검토를 생략하는 근거가 아니다.

## 소스가 없을 때는 분석 산출물과 실행 관찰을 구분한다

소스가 없는 애플리케이션을 이해할 때도 조사할 기능과 검증할 입력, 출력을 먼저 좁힌다. 번들에서 찾은 모듈 관계나 바이너리의 의사 코드는 동작을 설명할 근거지만, 해당 경로가 실제 실행됐다는 관찰과 구분한다.

2026-10-13 부분 검증: REA의 공개 README와 CLI 문서에서 아래 분석 범위와 증거 계약을 확인했다. 도구를 설치하거나 대상 앱을 실행하지 않았으며, 처리 시간과 복원 정확도는 검증하지 않았다. 기존 절 전체를 재검증한 것은 아니므로 frontmatter의 검증일은 유지한다.

| 분석 경로 | 확인할 수 있는 자료 | 구분할 경계 |
|---|---|---|
| JavaScript/Electron 정적 분석 | 모듈, import, source map, IPC와 native add-on 관계 | 제공한 파일을 읽으며 대상 애플리케이션을 실행하지 않는다 |
| 네이티브 바이너리 분석 | 의사 코드, 어셈블리, 문자열, 심볼과 참조 | Hopper, Ghidra, IDA 같은 분석 엔진과 대상 지원 범위에 의존한다 |
| 런타임 관찰 | 선택한 대상의 실행 또는 상호작용 결과 | 사용자 권한으로 대상에 작용하므로 정적 파일 읽기와 같은 작업으로 취급하지 않는다 |

REA의 Evidence는 대상 산출물 식별, 원본 위치, 관찰, 추론과 미해결 항목을 보존한다. 결과를 인계할 때도 이 구분을 유지하고, 저장된 분석 결과를 새로운 실행의 증거로 바꾸어 읽지 않는다. 로컬에서 분석하더라도 도구 결과는 에이전트에 전달되므로 모델 제공자의 데이터 처리 정책은 별도로 확인한다.

검증 제안: 분석 권한이 있는 대상에서 한 기능의 진입점과 호출 경로를 찾고, 재현 입력과 관찰 결과를 연결한다. 복원한 구현을 사용할 때는 앞 절의 characterization test로 필요한 외부 동작을 비교한다. 분석 완료와 호환 구현 완료는 별도 판정이다.

## 출처
- [Simplifying Code Documentation with Amazon Q Developer — AWS](https://aws.amazon.com/blogs/devops/simplifying-code-documentation-with-amazon-q-developer/)
- [Build SAP applications faster with Amazon Q Developer — AWS](https://aws.amazon.com/blogs/awsforsap/build-sap-applications-faster-with-amazon-q-developer/)
- [REA: Reverse Engineer Anything — morluto/rea](https://github.com/morluto/rea)
- [REA, CLI and Evidence](https://github.com/morluto/rea/blob/main/docs/cli.md)
- [Amazon Q Developer, Upgrading Java versions with Amazon Q Developer](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/code-transformation.html)
- [Spring Boot, Spring Boot 3.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide)
- [Java SE 17, Package javax.sql](https://docs.oracle.com/en/java/javase/17/docs/api/java.sql/javax/sql/package-summary.html)
- [AWS Transform, Unit tests](https://docs.aws.amazon.com/transform/latest/userguide/dotnet-unit-tests.html)
- [AWS Transform, Validation and finalization](https://docs.aws.amazon.com/transform/latest/userguide/dotnet-bp-validation.html)
- [코드를 읽지 않고 찾는 방법 — YouTube, 코딩맨](https://www.youtube.com/watch?v=WfAgL5Ves3Q) — 2025-12-20, 탐색 원칙은 경험적 설명, 도구 계약은 공식 문서 대조

- [JetBrains, Junie Playbook](https://www.jetbrains.com/guide/ai/article/junie/)
- [JetBrains, Junie project settings](https://junie.jetbrains.com/docs/junie-plugin-project-settings.html)
- [제미니 강사, 입사 첫날 레거시와 AI](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392728)
- [제미니 강사, 상품 목록 요구사항 분석](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392731)
- [제미니 강사, 리뷰 기능의 AI 구현과 검토](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392783)
- [제미니 강사, 취소 기능의 단계적 AI 구현](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392803)
- [제미니 강사, 정산 기능의 AI 구현과 검토](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392808)
- [제미니 강사, 장바구니 - 레거시 x AI 느끼기](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392792)
- [제미니 강사, 장바구니 - 코드 느끼기](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392794)
- [제미니 강사, 결제 - 레거시 x AI 느끼기](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392799)
- [제미니 강사, 찜하기 - 레거시 x AI 느끼기](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392786)
- [제미니 강사, 찜하기 - 코드 느끼기](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392787)
- [제미니 강사, 주문 - 레거시 x AI 느끼기](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392796)
- [제미니 강사, 주문 - 코드 느끼기](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392797)
- [제미니 강사, 결제 - 코드 느끼기](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392800)

## 관련 문서

- [[Legacy-Modernization-Strategies|레거시 현대화 전략]]
- [[Refactoring-In-Practice|실전 리팩토링]]
- [[Agent-Coding-Guardrails|AI coding agent guardrail]]
- [[Agent-Spec-Writing|agent 작업 명세 작성]]
- [[Test-Pyramid|테스트 피라미드]]
