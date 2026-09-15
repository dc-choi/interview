---
tags: [testing, testcontainers, integration-test, docker, idempotent]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["TestContainers Integration", "Testcontainers 통합 테스트", "멱등성 있는 테스트"]
verified_at: 2026-09-03
---

# Testcontainers 통합 테스트: 운영 고려사항

## 고려 사항

### 기동 시간

- 매 테스트마다 컨테이너 시작 → **테스트 속도** 저하
- 해결: **클래스 레벨 공유**는 `@Container`가 붙은 static field로 얻는다. Kotlin에서는 companion object property에 `@JvmField`를 붙여 static field로 노출하며, 범위는 해당 test class다. Suite 전역 공유가 필요하면 `@Testcontainers` extension 대신 singleton container를 직접 `start()`한다
- Testcontainers의 **Reusable Containers** 모드도 옵션

### 재사용 전략

- **Test Suite 전역 공유** — 가장 빠르지만 **테스트 간 격리** 직접 관리 필요
- **클래스별** — 균형
- **테스트별** — 완전 격리, 가장 느림

대부분 프로젝트는 **JVM 전역 1개 + 테스트마다 Truncate/Reset** 패턴.

JUnit 5의 `@Testcontainers` extension은 공식적으로 sequential execution만 검증됐고 parallel execution은 지원하지 않는다. 병렬화하려면 컨테이너 수명주기와 DB/schema/topic 같은 테스트 데이터를 직접 격리한다.

### CI 환경

- GitHub Actions, CircleCI와 GitLab에서 사용할 수 있지만 runner별 Docker API 제공 방식과 설정이 다르다. CircleCI는 machine executor, GitLab은 socket 또는 DinD 등 공식 가이드를 확인한다
- CI runner에서 Testcontainers가 접근할 수 있는 지원 Docker API와 실행 권한이 필요하다
- 컨테이너 이미지 **캐싱**으로 CI 시간 단축

### Docker 없는 환경

- Docker Desktop 라이선스는 CPU 종류가 아니라 조직 규모, 매출과 사용 목적 기준을 확인한다
- macOS에서는 Colima, OrbStack, Podman 같은 대체 runtime의 Testcontainers 호환성을 검증한다. CI도 지원되는 Docker API 환경과 실행 권한을 별도로 확인한다

## 멱등성의 실전 사례

- 공유 개발 DB에 스키마, 데이터가 계속 쌓이면 특정 테스트만 통과
- 타 팀이 외부 서비스 설정을 바꾸면 **모든 테스트 깨짐**
- 출시 후 복구에 대량 리소스 투입 필요
- Testcontainers로 **매 실행 깨끗한 환경** → 운영 영향 제거

## 통합 vs 단위의 경계

Testcontainers는 **통합 테스트** 영역. Unit Test까지 가져가면 속도가 너무 느림.

- Repository/DAO: 통합 테스트로 Testcontainers 사용
- Domain/Service: Unit Test + Mock
- [[Test-Pyramid|테스트 피라미드]]의 Integration 층에 위치 — 이상적 비율은 정해져 있지 않고, Unit보다 적고 E2E보다 많은 중간 수량을 유지

## 흔한 실수

- **모든 테스트에 Testcontainers** — Unit까지 포함하면 CI 5분 → 30분
- **컨테이너 수명주기 관리 누락** — 좀비 컨테이너 축적
- **Random 포트 하드코딩** → 포트 충돌 시 테스트 실패
- **CI에 Docker 미설정** → 테스트가 로컬만 통과
- **테스트 간 데이터 누수** — Truncate/Clean 없으면 이전 테스트 영향
- **공유 Container 재시작 없이** 설정 바꿈 → 테스트 오염

## 면접 체크포인트

- Testcontainers가 H2, Docker Compose 대비 유리한 지점
- **멱등성** 확보의 실전 방법
- Random 포트, 클래스 공유 같은 **수명 주기 전략**
- CI에서 Testcontainers 운영 시 주의점
- 단위/통합 경계에서 Testcontainers의 위치

## 출처
- [Testcontainers for Java, JDBC support](https://java.testcontainers.org/modules/databases/jdbc/)
- [Testcontainers for Java, JUnit 5 Quickstart](https://java.testcontainers.org/quickstart/junit_5_quickstart/)
- [Testcontainers for Java, Kafka Module](https://java.testcontainers.org/modules/kafka/)
- [Testcontainers for Java, JUnit 5 Integration](https://java.testcontainers.org/test_framework_integration/junit_5/)
- [Testcontainers for Java, Singleton containers](https://java.testcontainers.org/test_framework_integration/manual_lifecycle_control/#singleton-containers)
- [Testcontainers for Java 2.0.5 — GitHub Releases](https://github.com/testcontainers/testcontainers-java/releases/tag/2.0.5)
- [Kotlin, Java interop — Static fields](https://kotlinlang.org/docs/java-to-kotlin-interop.html#static-fields)
- [Docker Docs, Docker Desktop license agreement](https://docs.docker.com/subscription/desktop-license/)
- Testcontainers CI 가이드: [CircleCI](https://java.testcontainers.org/supported_docker_environment/continuous_integration/circle_ci/), [GitLab CI](https://java.testcontainers.org/supported_docker_environment/continuous_integration/gitlab_ci/)

## 관련 문서
- [[Test-Pyramid|Practical Test Pyramid]]
- [[Mock-Testing-Strategy|Mock 테스트 설계 전략]]
- [[Classicist-vs-Mockist-Testing|Classicist vs Mockist, Test Double]]
- [[Test-Isolation|Test Isolation]]
- [[Test-Fixture|Test Fixture 전략]]
- [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
- [[LocalStack-Integration-Test|LocalStack AWS 통합 테스트]]
- [[Docker|Docker]]
