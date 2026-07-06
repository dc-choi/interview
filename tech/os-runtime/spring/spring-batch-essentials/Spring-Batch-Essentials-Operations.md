---
tags: [spring-batch, batch, jenkins, operations, deployment, test, spring-test-context]
status: done
category: "OS & Runtime"
aliases: ["Spring Batch 운영", "Jenkins 배치 운영", "배치 테스트", "Spring Context 캐싱"]
---

# Spring Batch 운영 — Jenkins, 배포, 테스트

배치는 프레임워크 사용법보다 **운영 설계**가 난이도를 좌우한다. 실행과 이력 관리(Jenkins), 무중단 배포, 재실행 가능한 파라미터 설계, 회귀를 막는 테스트가 한 세트다.

## 배치 운영에 필요한 것과 Jenkins

배치 운영의 요구사항: 수동 실행 + 스케줄 실행, 실행 이력, 콘솔 로그, 실패 알림, 권한 관리, 잡 간 순서 조합.

- **Jenkins**는 CI/CD 도구지만 이 요구사항을 이미 다 갖췄다 — 실행 이력, 콘솔 로그, 권한 관리, Slack 알림, 스케줄(cron) 실행, Pipeline 조합
- Spring Batch Admin은 더 이상 유지되지 않고(공식 후속은 Spring Cloud Data Flow), 자체 Admin UI 개발은 비용이 크다
- 실무의 현실적인 선택: **검증된 CI 도구를 배치 실행 관리 도구로 재사용**

## 실행 명령은 전역 환경 변수로 추상화

Jenkins에서 배치는 보통 `java -jar batch.jar --job.name=someJob targetDate=2024-01-01` 형태로 실행한다. 문제는 모든 Jenkins Job마다 JVM 옵션, 프로파일, JAR 경로가 반복 복사된다는 점.

- JAR 경로, JVM 옵션, 실행 명령 템플릿을 **Jenkins 전역 환경 변수**로 분리
- GC 옵션이나 JAR 경로가 바뀌어도 한 곳만 수정 — 배치 수가 늘수록 효과가 커진다

## 무중단 배포 — 심볼릭 링크

배치 JAR를 실행 도중 교체하면 돌고 있는 배치가 깨질 수 있다. 실행용 링크와 실제 버전 파일을 분리해 해결한다.

- 실행 명령은 항상 `app.jar`를 바라보고, `app.jar`는 `app-v1.jar` 같은 실제 파일을 가리키는 **심볼릭 링크**
- 배포 시 `app-v2.jar` 업로드 후 링크만 교체 — 실행 중인 프로세스는 기존 JAR로 끝까지 돌고, 다음 실행부터 새 버전 사용

## Step 남용 대신 Jenkins Pipeline

A 다음 B 다음 C를 실행한다는 이유만으로 하나의 Job에 Step을 줄줄이 묶으면, 나중에 **B만 단독 실행**해야 할 때 구조를 바꿔야 한다.

- 비즈니스적으로 독립 실행 가능성이 있는 작업은 **각각 독립 Job**으로 두고, 순서 조합은 **Jenkins Pipeline**으로
- Spring Batch Step은 진짜로 한 몸인 단계(전처리 → 본처리)에만 사용

## 날짜 파라미터 자동화 — 멱등성과 스케줄의 양립

[[Spring-Batch-Essentials-JobParameter|멱등성]]을 지키려면 날짜를 파라미터로 받아야 하지만, 매일 도는 배치에 사람이 날짜를 입력할 수는 없다.

- Jenkins의 날짜 파라미터 플러그인(Date Parameter 계열)으로 **기본값을 오늘 또는 어제 날짜로 동적 생성**
- 스케줄 실행은 기본값으로, 재처리는 사람이 날짜를 바꿔 수동 실행 — 같은 코드로 두 시나리오 모두 대응
- 핵심 원칙: **날짜를 코드 안에서 만들지 않고 실행 환경에서 명시적으로 주입**

## 배치는 테스트 코드가 필수다

웹 기능은 QA가 화면으로 검증할 수 있지만, 배치는 **실행 전후 데이터 변화**를 확인해야 해서 내부 로직을 모르는 QA가 세부 검증하기 어렵다.

- 배치 검증의 사실상 유일한 안전망이 테스트 코드
- 특히 기존 배치에 새 조건이 추가될 때, 과거 데이터 처리 방식이 깨지지 않았는지 **회귀 테스트**로 보장해야 한다

## 배치 테스트 속도 — Spring Context 캐싱

Spring 테스트는 ApplicationContext를 캐싱해 같은 구성이면 재사용한다. 이 캐시를 깨는 순간 배치 테스트 전체가 느려진다.

- 캐시 무효화 조건: `@MockBean`/`@SpyBean` 조합 변화, 테스트 프로퍼티 차이, 조건부 Bean 로딩 차이
- 함정: 배치 설정마다 `@ConditionalOnProperty`를 붙이고 테스트마다 해당 Job만 로딩 → **테스트마다 다른 컨텍스트** → 매번 재기동
- 대안: **모든 Job Bean을 한 번에 로딩**하고, 테스트에서는 실행할 Job만 이름으로 찾아 실행 — 컨텍스트 1회 기동으로 전체 배치 테스트 커버

## 면접 체크포인트

- 배치 운영 요구사항(실행, 이력, 알림, 권한)과 **Jenkins를 배치 관리 도구로 쓰는 근거**
- 심볼릭 링크 배포가 **실행 중인 배치를 보호**하는 원리
- Step으로 묶기 vs 독립 Job + Pipeline 조합의 **선택 기준** (단독 실행 가능성)
- 날짜를 실행 환경에서 주입해야 멱등성과 자동화가 양립하는 이유
- 배치 테스트가 웹 테스트보다 더 필수적인 이유
- Spring Test Context 캐시가 깨지는 조건과 **전체 로딩 + 이름 선택 실행** 패턴

## 출처

- [Spring Batch 운영과 설계 — YouTube 강의](https://www.youtube.com/watch?v=_nkJkWVH-mo&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew&index=41)

## 관련 문서

- [[Spring-Batch-Essentials-JobParameter|Job Parameter와 Late Binding, 멱등성]]
- [[Spring-Batch-Essentials-Scheduler|Spring Scheduler vs Quartz]]
- [[CI-Tool-Selection|CI 도구 비교 (Jenkins 포함)]]
- [[Test-Isolation|테스트 격리]]
