---
tags: [java, spring, jobrunr, background-jobs, idempotency]
status: done
verified_at: 2026-10-22
category: "OS&런타임(OS&Runtime)"
aliases: ["JobRunr 영속 백그라운드 작업", "JobRunr Persistent Background Jobs"]
---

# JobRunr의 영속 백그라운드 작업

JobRunr는 JVM에서 즉시, 지연, 반복 작업을 예약하고 DB에 실행 상태를 보존하는 라이브러리다. 요청 처리와 오래 걸리는 작업을 분리할 때 사용한다. 아래는 JobRunr 9 계열의 공식 계약이며 실제 애플리케이션에 설치하거나 장애 복구를 시험한 기록은 아니다.

## 예약과 실행을 분리한다

`JobScheduler`는 실행할 타입, 메서드와 인자를 직렬화해 `StorageProvider`에 저장한다. `BackgroundJobServer`가 작업을 가져와 실행하고 상태를 갱신한다. 예약 프로세스와 실행 프로세스를 같은 JVM에 두거나 별도로 배포할 수 있다. 등록 성공은 업무 처리 완료가 아니다.

Spring Boot에서는 버전에 맞는 `jobrunr-spring-boot-3-starter` 또는 `jobrunr-spring-boot-4-starter`를 선택한다. 작업 실행 서버와 대시보드는 기본 비활성화다. 필요한 프로세스에서 각각 `jobrunr.background-job-server.enabled`, `jobrunr.dashboard.enabled`를 켠다. DB 연결 또는 `StorageProvider`도 필요하다.

큰 객체 전체보다 식별자를 인자로 전달하고 람다는 단순하게 유지한다. 작업 인자는 저장되므로 요청 메모리의 객체를 그대로 나중에 실행하는 방식으로 이해하지 않는다. 실패를 잡아 로그만 남기고 정상 반환하면 실행기가 성공으로 판단하므로 재시도할 오류는 다시 던진다.

## 단계 완료 기록과 외부 효과의 멱등성

일반 재시도는 작업 메서드를 처음부터 다시 호출한다. 기본 정책은 실패 작업에 최대 10회 재시도와 지수 백오프를 적용한다. 실패 전에 결제가 끝났다면 전체 메서드 재실행으로 중복 결제가 생길 수 있다.

`JobContext.runStepOnce`는 완료한 단계의 기록과 반환값을 재사용한다. 이 기능은 8.0.0부터 있으며, 9에서 새로 생긴 것은 단계별 실행을 보여 주는 Chart다. 단계 ID는 작업 안에서 유일하고 배포 사이에도 안정적이어야 한다. 이름을 바꾸면 새 단계로 취급한다.

완료 기록의 저장 시점도 구분한다. 일반 예외 재시도에서는 완료 단계를 건너뛰지만, OSS의 실행 중 상태 저장은 polling 주기를 따른다. 강제 종료가 마지막 저장 뒤에 발생하면 끝난 단계도 다시 실행될 수 있다. Pro는 단계 완료 즉시 상태를 저장한다.

두 에디션 모두 실행 중이던 단계의 외부 효과까지 원자적으로 보장하지 않는다. 결제 같은 호출에는 재실행해도 중복 효과가 나지 않는 idempotency key를 적용한다. 단계 밖 코드는 매 시도마다 실행되므로 부수 효과를 두지 않는다. 분기 조건은 기록된 결과를 사용하고, 시간이나 난수에 의존하면 그 결정도 단계 안에 기록한다.

## 실행 시간과 대기 시간을 나누어 본다

Job history의 Chart는 OSS와 Pro 모두 제공한다. 작업의 시도, 상태와 단계 시간을 나누어 보므로 처리 자체가 느린지, 실행 대기가 긴지 구별할 수 있다. Pro의 Job Analytics는 작업 유형, 서버와 예외별 분석을 제공한다.

Pro의 성능 기능도 서로 다른 병목을 겨냥한다.

| 기능 | 줄이려는 비용과 확인할 경계 |
|---|---|
| `JobPrefetchQueue` | 다음 작업을 DB에서 가져오는 왕복 대기. 이전 명칭은 `SmartQueue` |
| `SelfLearningWorkerCapacityPolicy` | DB 연결 대기, CPU와 메모리 상태를 관측해 동시 작업 수 조절 |
| PostgreSQL `LISTEN/NOTIFY` EventBus | 새 작업 발견의 polling 대기. 처리 시간이나 전체 처리량 보장은 아님 |

PostgreSQL 알림 경로는 서버마다 listener용 연결 하나를 더 유지하고 polling도 안전망으로 남긴다. PgBouncer의 transaction pooling 뒤에서는 listener에 PostgreSQL 직접 연결이 필요하다. 알림이 빠르다는 이유로 DB 연결 용량을 무시하지 않는다.

## 일시정지와 버전 이전의 경계

Pro의 batch pause는 아직 실행하지 않은 자식 작업을 멈춘다. 이미 처리 중인 작업은 완료까지 진행한다. 자식 작업을 등록하는 도중 pause하면 등록을 마친 뒤 멈춘다. 따라서 pause를 진행 중인 외부 호출의 취소로 취급하지 않는다.

v8과 v9 서버는 같은 DB에서 병행할 수 있지만, batch pause처럼 v9 전용 저장 형식을 사용하는 기능을 켜면 해당 작업을 v8 서버가 읽지 못할 수 있다. 새 인덱스 적용 시간도 고려한다. 배포 순서와 되돌림 가능성은 새 기능 사용 여부까지 포함해 검토한다.

v9는 OSS에서 Java 8을 지원하는 마지막 major로 안내된다. 이것은 모든 프레임워크와 테스트 도구가 Java 8에서 동작한다는 뜻이 아니다. JobRunr test fixtures는 JDK 17 이상을 요구하며 Spring Boot 자체의 Java 요구사항도 별도로 확인한다.

## 적용 전에 확인할 것

1. 결제 성공 직후 완료 기록 저장 전에 프로세스가 죽어도 같은 요청의 효과가 중복되지 않는가?
2. API 서버는 예약만 하는지, 작업 실행까지 맡는지 설정으로 구분되는가?
3. 작업 지연의 원인이 실행 대기, DB 연결 대기, 실제 처리 중 어디에 있는가?
4. batch pause 뒤 이미 실행 중이던 작업과 이전 버전 서버를 어떻게 다룰 것인가?

이 질문은 도입 검토와 장애 실습의 기준이다. 실행기를 선택했다는 사실만으로 멱등성, 성능이나 복구가 입증되지는 않는다.

## 출처

- [JobRunr, Introduction](https://www.jobrunr.io/en/documentation/)
- [JobRunr, Spring Boot Starter](https://www.jobrunr.io/en/documentation/configuration/spring/)
- [JobRunr, Best practices](https://www.jobrunr.io/en/documentation/background-methods/best-practices/)
- [JobRunr, Durable Executions: Crash-Proof Multi-Step Jobs with runStepOnce](https://www.jobrunr.io/en/guides/advanced/durable-executions/)
- [JobRunr & JobRunr Pro v9: See Inside Every Background Job — JobRunr](https://www.jobrunr.io/en/blog/v9-release/)
- [JobRunr, Upgrade to v9](https://www.jobrunr.io/en/guides/migration/v9/)

## 관련 문서

- [[Spring|Spring]]
- [[Spring-Batch-Essentials-Scheduler|Spring Batch와 스케줄러의 역할]]
- [[NestJS-Task-Scheduling|NestJS 작업 스케줄링]]
