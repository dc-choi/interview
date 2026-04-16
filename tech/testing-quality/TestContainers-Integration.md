---
tags: [testing, testcontainers, integration-test, docker, idempotent]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["TestContainers Integration", "Testcontainers 통합 테스트", "멱등성 있는 테스트"]
---

# Testcontainers · 멱등성 있는 통합 테스트

통합 테스트의 오래된 딜레마: **"실제 환경에 가깝되 항상 같은 결과"**. 실제 DB는 공유 리소스 오염이 문제, H2 같은 인메모리는 DB 특화 기능 누락, Docker Compose는 포트 충돌·설정 파일 분리. **Testcontainers**는 이 사이에서 **Java/Kotlin 코드로 Docker 컨테이너를 관리**해 각 테스트가 깨끗한 환경을 얻게 한다. 핵심 가치는 **멱등성**.

## 핵심 명제

- **멱등성** = 여러 번 실행해도 같은 결과
- 공유 DB·외부 서비스에 의존하면 **타 팀 변경**으로 테스트가 깨진다
- **Testcontainers**는 Docker 컨테이너를 **테스트 수명주기에 맞춰** 생성·파괴
- **Random 포트** · **병렬 테스트** · **코드로 관리** 가 차별점

## 통합 테스트 환경 비교

| 방식 | 장점 | 단점 |
|---|---|---|
| **Local 실제 DB** | 실제 환경과 유사 | 멱등성 파괴, 타인 변경 영향, DDL 수동 관리 |
| **In-memory DB (H2 등)** | 빠름·격리 | **DB 특화 기능 테스트 불가**(PostgreSQL JSONB, MySQL FullText 등) |
| **Embedded Library** | 특화 기능 가능 | 일부 DB만 지원, OS/버전 제약 |
| **Docker Compose** | 실 환경 재현 | 설정 파일 별도 관리, **포트 충돌**, 병렬 테스트 제약 |
| **Testcontainers** | 코드로 관리 · Random 포트 · 병렬 가능 | Docker 필요 |

Testcontainers의 우위는 **테스트 코드 안에 인프라 선언**이 들어가는 것.

## 기본 동작 원리

- JUnit·Kotest·Spring Boot Test에 통합
- 테스트 수명주기에 맞춰 컨테이너 **시작·정지**
- 내부에서 **Random 포트**를 할당 → 포트 충돌 없음
- 컨테이너 종료 시 자동 정리

## PostgreSQL 예시

### 의존성

```kotlin
testImplementation("org.testcontainers:junit-jupiter")
testImplementation("org.testcontainers:postgresql")
```

### 컨테이너 선언

```kotlin
@Component
class PostgresqlTestContainer {
    @PreDestroy
    fun stop() { POSTGRES_CONTAINER.stop() }

    companion object {
        @Container @JvmStatic
        val POSTGRES_CONTAINER: PostgreSQLContainer<*> =
            PostgreSQLContainer<Nothing>("postgres:alpine")
                .apply { withDatabaseName("database_name") }
                .apply { withUsername("root") }
                .apply { withPassword("password") }
                .apply { start() }
    }
}
```

### DataSource 연동

```kotlin
@Configuration
class TestDataSource {
    @Bean
    @DependsOn("postgresqlTestContainer")
    fun dataSource(): DataSource =
        DataSourceBuilder.create()
            .url("jdbc:postgresql://localhost:" +
                 "${PostgresqlTestContainer.POSTGRES_CONTAINER.getMappedPort(5432)}")
            .username("root")
            .password("password")
            .build()
}
```

핵심: `getMappedPort(5432)`가 **Random 포트**를 반환. 매 실행마다 다른 포트라 병렬·충돌 회피.

## Kafka 예시

```kotlin
@Component
class KafkaTestContainer {
    companion object {
        @Container @JvmStatic
        val KAFKA_CONTAINER: KafkaContainer =
            KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:5.4.3"))
                .apply { start() }
    }
}

@Configuration
class KafkaTestConfiguration {
    @Bean
    fun kafkaTestAdmin(): KafkaAdmin =
        mapOf(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG to
              KafkaTestContainer.KAFKA_CONTAINER.bootstrapServers)
            .let(::KafkaAdmin)
}
```

- 토픽 Publish/Subscribe 플로우를 실제 Kafka에서 검증
- Embedded Kafka보다 **실제 브로커**에 가까운 동작

## 대표 지원 대상

- **DB**: PostgreSQL, MySQL, MariaDB, MongoDB, Oracle, MSSQL, Cassandra
- **Messaging**: Kafka, RabbitMQ, Redis, Pulsar
- **검색**: Elasticsearch, Solr
- **Observability**: Prometheus·Jaeger
- **LocalStack** — AWS 서비스 에뮬레이션
- **Custom** — 어떤 Docker 이미지든 `GenericContainer`로

## 고려 사항

### 기동 시간

- 매 테스트마다 컨테이너 시작 → **테스트 속도** 저하
- 해결: **클래스 레벨 공유** (`@Container` + `@TestInstance(PER_CLASS)`) 또는 **JVM 수명 주기 공유** (`@JvmStatic`)
- Testcontainers의 **Reusable Containers** 모드도 옵션

### 재사용 전략

- **Test Suite 전역 공유** — 가장 빠르지만 **테스트 간 격리** 직접 관리 필요
- **클래스별** — 균형
- **테스트별** — 완전 격리, 가장 느림

대부분 프로젝트는 **JVM 전역 1개 + 테스트마다 Truncate/Reset** 패턴.

### CI 환경

- GitHub Actions·CircleCI·GitLab 모두 **Docker-in-Docker** 지원
- 빌드 머신에 Docker 설치 필수
- 컨테이너 이미지 **캐싱**으로 CI 시간 단축

### Docker 없는 환경

- M1/M2 Mac의 Docker Desktop 라이선스 이슈 → Colima·OrbStack·Podman으로 대체
- CI에서는 문제 없음

## 멱등성의 실전 사례

- 공유 개발 DB에 스키마·데이터가 계속 쌓이면 특정 테스트만 통과
- 타 팀이 외부 서비스 설정을 바꾸면 **모든 테스트 깨짐**
- 출시 후 복구에 대량 리소스 투입 필요
- Testcontainers로 **매 실행 깨끗한 환경** → 운영 영향 제거

## 통합 vs 단위의 경계

Testcontainers는 **통합 테스트** 영역. Unit Test까지 가져가면 속도가 너무 느림.

- Repository/DAO: 통합 테스트로 Testcontainers 사용
- Domain/Service: Unit Test + Mock
- [[Test-Pyramid|테스트 피라미드]] 내 20% 비중이 적절

## 흔한 실수

- **모든 테스트에 Testcontainers** — Unit까지 포함하면 CI 5분 → 30분
- **컨테이너 수명주기 관리 누락** — 좀비 컨테이너 축적
- **Random 포트 하드코딩** → 포트 충돌 시 테스트 실패
- **CI에 Docker 미설정** → 테스트가 로컬만 통과
- **테스트 간 데이터 누수** — Truncate/Clean 없으면 이전 테스트 영향
- **공유 Container 재시작 없이** 설정 바꿈 → 테스트 오염

## 면접 체크포인트

- Testcontainers가 H2·Docker Compose 대비 유리한 지점
- **멱등성** 확보의 실전 방법
- Random 포트·클래스 공유 같은 **수명 주기 전략**
- CI에서 Testcontainers 운영 시 주의점
- 단위/통합 경계에서 Testcontainers의 위치

## 출처
- [Riiid Team Blog — Testcontainer로 멱등성 있는 Integration Test 환경 구축하기](https://medium.com/riiid-teamblog-kr/testcontainer-로-멱등성있는-integration-test-환경-구축하기-4a6287551a31)

## 관련 문서
- [[Test-Pyramid|Practical Test Pyramid]]
- [[Mock-Testing-Strategy|Mock 테스트 설계 전략]]
- [[Classicist-vs-Mockist-Testing|Classicist vs Mockist · Test Double]]
- [[Test-Isolation|Test Isolation]]
- [[Test-Fixture|Test Fixture 전략]]
- [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
- [[Docker|Docker]]
