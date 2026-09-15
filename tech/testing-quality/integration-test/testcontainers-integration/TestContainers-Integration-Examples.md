---
tags: [testing, testcontainers, integration-test, docker, idempotent]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["TestContainers Integration", "Testcontainers 통합 테스트", "멱등성 있는 테스트"]
verified_at: 2026-09-03
---

# Testcontainers 통합 테스트: PostgreSQL, Kafka 예제

## PostgreSQL 예시

### 의존성

```kotlin
testImplementation(platform("org.testcontainers:testcontainers-bom:2.0.5"))
testImplementation("org.testcontainers:testcontainers-junit-jupiter")
testImplementation("org.testcontainers:testcontainers-postgresql")
testImplementation("org.testcontainers:testcontainers-kafka")
```

### 컨테이너 선언

아래 예시는 JUnit `@Container`나 Spring `ApplicationContext` 수명주기가 아닌 JVM singleton 패턴이다. 컨테이너는 처음 참조할 때 한 번 시작하고 명시적으로 `stop()`하지 않는다. JVM 종료 시 Testcontainers의 Ryuk이 정리한다.

```kotlin
import org.testcontainers.postgresql.PostgreSQLContainer
class PostgresqlTestContainer private constructor() {
    companion object {
        @JvmField val POSTGRES_CONTAINER: PostgreSQLContainer =
            PostgreSQLContainer("postgres:16-alpine")
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
    fun dataSource(): DataSource =
        DataSourceBuilder.create()
            .url(PostgresqlTestContainer.POSTGRES_CONTAINER.jdbcUrl)
            .username("root")
            .password("password")
            .build()
}
```

핵심: `jdbcUrl`은 Testcontainers가 계산한 host, mapped port와 `withDatabaseName()`의 database 이름을 포함한다. URL을 직접 만들면 `container.host`, `getMappedPort(5432)`, database 이름을 모두 써야 하며 remote Docker 환경에서 `localhost`를 가정하지 않는다. mapped port가 매 실행마다 달라 포트 충돌을 줄인다.

## Kafka 예시

```kotlin
import org.testcontainers.kafka.ConfluentKafkaContainer
import org.testcontainers.utility.DockerImageName
class KafkaTestContainer private constructor() {
    companion object {
        @JvmField val KAFKA_CONTAINER: ConfluentKafkaContainer =
            ConfluentKafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.4.0"))
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
- **Observability**: Prometheus, Jaeger
- **LocalStack** — AWS 서비스 에뮬레이션 → [[LocalStack-Integration-Test|LocalStack AWS 통합 테스트]]
- **Custom** — 어떤 Docker 이미지든 `GenericContainer`로

## 출처
- [Testcontainers for Java, JUnit 5 Quickstart](https://java.testcontainers.org/quickstart/junit_5_quickstart/)
- [Testcontainers for Java, Kafka Module](https://java.testcontainers.org/modules/kafka/)
- [Testcontainers for Java, Singleton containers](https://java.testcontainers.org/test_framework_integration/manual_lifecycle_control/#singleton-containers)
- [Testcontainers for Java 2.0.5 — GitHub Releases](https://github.com/testcontainers/testcontainers-java/releases/tag/2.0.5)
- [Kotlin, Java interop — Static fields](https://kotlinlang.org/docs/java-to-kotlin-interop.html#static-fields)
