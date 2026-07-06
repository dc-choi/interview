---
tags: [spring-batch, batch, job-parameter, job-scope, step-scope, late-binding, idempotency]
status: done
category: "OS & Runtime"
aliases: ["Spring Batch Job Parameter", "Late Binding", "배치 멱등성", "@JobScope"]
---

# Spring Batch Job Parameter와 Late Binding, 멱등성

배치의 재실행 가능성(멱등성)은 프레임워크 기능이 아니라 **파라미터 설계**에서 나온다. 바뀔 수 있는 값(날짜, 대상 타입, 범위)을 코드 안에 숨기지 않고 Job Parameter로 끌어올리는 것이 핵심.

## Job Parameter — 실행 시점 값 주입

- 배치 실행 시 외부에서 넘기는 값. 예: `targetDate=2024-01-01`
- 기본 지원 타입은 String, Long, Double, Date 중심 (Spring Batch 5부터는 컨버터 기반으로 임의 타입 지원이 넓어짐)
- `job_name + JobParameters` 조합이 JobInstance의 유니크 키 — 같은 파라미터로 완료된 Job은 재실행이 거부된다 ([[Spring-Batch-Essentials-Structure|메타데이터 테이블]] 참조)

## @JobScope, @StepScope와 Late Binding

일반 Bean은 애플리케이션 기동 시점에 생성되지만, `@JobScope`/`@StepScope`가 붙은 Bean은 **Job 또는 Step이 실제 실행되는 시점에 생성**된다.

- 파라미터 바인딩: `@Value("#{jobParameters[targetDate]}")` — 기동 시점에는 값이 없고, 실행 시점에 바인딩됨. 이 특성이 **Late Binding**
- `@JobScope`는 Step 선언부에, `@StepScope`는 Tasklet, Reader, Processor, Writer 선언부에 사용
- Scope 없이 `jobParameters` SpEL을 쓰면 바인딩이 실패한다 — 기동 시점에는 파라미터가 존재하지 않기 때문

## 날짜 파라미터는 전용 객체로 변환해 관리

실무 파라미터의 대부분은 날짜인데, 기본 타입 제약 때문에 String으로 받아 `LocalDate`로 파싱하는 코드가 Step마다 반복되기 쉽다.

- **Job Parameter 전용 Bean**을 하나 만들고(`@JobScope`), 그 안에서 String → `LocalDate` 변환을 한 번만 수행
- 배치 코드에서는 `params.getTargetDate()`처럼 의미 있는 타입으로 바로 사용
- 파싱 로직이 한 곳에 모여 포맷 변경, 검증 추가에도 유리

## Late Binding으로 Reader, Writer를 동적으로 교체

Scope Bean은 실행 시점에 만들어지므로, **파라미터 값에 따라 다른 Reader/Processor/Writer를 반환**할 수 있다.

- 예: 같은 외부 전송 배치에서 파라미터가 `order`면 주문 테이블, `ad`면 광고 테이블을 읽는 Reader를 리턴
- 비슷한 배치 클래스를 여러 벌 만들지 않고 하나의 구조를 재사용
- 적합 조건: **처리 흐름은 같고 입력 대상만 다른 경우**. 분기가 많아지면 오히려 이해 비용이 커지므로 남용 금지

## 멱등성 — 배치 재실행의 생명줄

멱등성 = 같은 작업을 여러 번 실행해도 결과가 달라지지 않는 성질. 운영에서는 어제 데이터 재처리, 일주일 전 데이터 재전송 같은 **재실행 요청이 일상**이라 배치의 필수 속성이다.

- 안티패턴: 코드 안에서 `LocalDate.now()`로 처리 대상을 결정 — 오늘 돌리면 오늘 데이터, 내일 돌리면 내일 데이터를 처리해 **같은 작업의 재실행이 불가능**해진다
- 원칙: 날짜, 타입, 대상 범위처럼 바뀔 수 있는 값은 전부 Job Parameter로 주입 → 같은 파라미터 = 같은 결과
- 매일 자동 실행과의 양립: 날짜 기본값은 실행 환경(Jenkins 날짜 파라미터 플러그인 등)에서 주입 → [[Spring-Batch-Essentials-Operations|운영]] 참조

## 흔한 실수

- **`LocalDate.now()`를 Reader 쿼리 조건에 직접 사용** — 재실행 불가, 멱등성 붕괴
- **Scope 없이 `#{jobParameters[...]}` 사용** — 기동 시점 바인딩 실패
- **Step마다 String 날짜 파싱 반복** — 전용 파라미터 객체로 일원화
- **한 Job에 파라미터 분기 과다** — 처리 흐름이 다르면 별도 Job으로 분리

## 면접 체크포인트

- Job Parameter가 JobInstance 유니크 키를 구성하는 방식과 **중복 실행 방지** 효과
- `@JobScope`/`@StepScope` Bean이 **실행 시점에 생성**되는 이유와 Late Binding의 의미
- 배치에서 **멱등성이 왜 중요한지** — 운영 재실행 요청 시나리오로 설명
- `LocalDate.now()`를 배치 코드에 쓰면 안 되는 이유
- Late Binding으로 Reader를 동적 교체하는 패턴의 적합 조건과 한계

## 출처

- [Spring Batch 운영과 설계 — YouTube 강의](https://www.youtube.com/watch?v=_nkJkWVH-mo&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew&index=41)

## 관련 문서

- [[Spring-Batch-Essentials-Structure|Spring Batch 구조와 처리 모델]]
- [[Spring-Batch-Essentials-Operations|Spring Batch 운영 — Jenkins, 배포, 테스트]]
- [[Idempotency|멱등성 일반론]]
