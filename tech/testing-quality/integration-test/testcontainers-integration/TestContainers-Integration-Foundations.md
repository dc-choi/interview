---
tags: [testing, testcontainers, integration-test, docker, idempotent]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["TestContainers Integration", "Testcontainers 통합 테스트", "멱등성 있는 테스트"]
verified_at: 2026-09-03
---

# Testcontainers 통합 테스트: 기본 원리

통합 테스트의 오래된 딜레마: **"실제 환경에 가깝되 항상 같은 결과"**. 실제 DB는 공유 리소스 오염이 문제, H2 같은 인메모리는 DB 특화 기능 누락, Docker Compose는 포트 충돌, 설정 파일 분리. **Testcontainers**는 이 사이에서 **Java/Kotlin 코드로 Docker 컨테이너를 관리**해 각 테스트가 깨끗한 환경을 얻게 한다. 핵심 가치는 **멱등성**.

## 핵심 명제

- **멱등성** = 여러 번 실행해도 같은 결과
- 공유 DB, 외부 서비스에 의존하면 **타 팀 변경**으로 테스트가 깨진다
- **Testcontainers**는 Docker 컨테이너를 **테스트 수명주기에 맞춰** 생성, 파괴
- **Random 포트**, **코드로 관리**, 직접 격리 설계 시 **병렬화 가능**이 차별점

## 통합 테스트 환경 비교

| 방식 | 장점 | 단점 |
|---|---|---|
| **Local 실제 DB** | 실제 환경과 유사 | 멱등성 파괴, 타인 변경 영향, DDL 수동 관리 |
| **In-memory DB (H2 등)** | 빠름, 격리 | **DB 특화 기능 테스트 불가**(PostgreSQL JSONB, MySQL FullText 등) |
| **Embedded Library** | 특화 기능 가능 | 일부 DB만 지원, OS/버전 제약 |
| **Docker Compose** | 실 환경 재현 | 설정 파일 별도 관리, **포트 충돌**, 병렬 테스트 제약 |
| **Testcontainers** | 코드로 관리, Random 포트, 수명주기와 데이터 격리 설계 시 병렬화 가능 | Docker 필요 |

Testcontainers의 우위는 **테스트 코드 안에 인프라 선언**이 들어가는 것.

## 기본 동작 원리

- JUnit, Kotest, Spring Boot Test에 통합
- 테스트 수명주기에 맞춰 컨테이너 **시작, 정지**
- 내부에서 **Random 포트**를 할당 → 포트 충돌 없음
- 컨테이너 종료 시 자동 정리

## 출처
- [Testcontainers for Java, JUnit 5 Quickstart](https://java.testcontainers.org/quickstart/junit_5_quickstart/)
- [Testcontainers for Java, JUnit 5 Integration](https://java.testcontainers.org/test_framework_integration/junit_5/)
