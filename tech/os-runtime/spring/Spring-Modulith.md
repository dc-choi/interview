---
tags: [spring, spring-boot, spring-modulith, modular-monolith, architecture-test, domain-events]
status: done
verified_at: 2026-11-02
category: "OS & Runtime"
aliases: ["Spring Modulith", "스프링 모듈리스"]
---

# Spring Modulith

Spring Modulith는 Spring Boot 애플리케이션을 도메인 기준의 논리 모듈로 구성하도록 돕는 의견이 담긴(opinionated) 도구 모음이다. 패키지 규약으로 애플리케이션 모듈을 정의하고 모듈 구조 검증, 모듈 단위 통합 테스트, 모듈 간 이벤트 처리와 문서 생성을 지원한다. 배포 단위는 하나로 두고 내부 경계를 강제하는 [[Modular-Monolith|모듈러 모놀리스]]를 Spring Boot로 만들 때 쓴다. 아래 API와 설정은 2026-11-02에 확인한 레퍼런스 2.1.1 문서와 같은 태그의 소스 기준이다.

## 버전과 Spring Boot 호환

2022-10에 Spring Boot 3.0, Java 17 기준의 실험 프로젝트로 공개됐고, 당시 Spring Boot 2.7과 호환되던 Moduliths 프로젝트를 잇는다. 2026-11-02 GitHub 릴리스 기준은 다음과 같다. 마지막 열은 공식 호환 범위가 아니라 각 릴리스 노트가 밝힌 Spring Boot 갱신 버전이고, 레퍼런스 부록의 호환 매트릭스는 `2.0 (snapshot)` 행까지만 있어 2.1 이후 계열을 다루지 않는다.

| 계열 | 최신 버전 (공개일) | 릴리스 노트의 Spring Boot 갱신 |
|---|---|---|
| 2.1 | 2.1.2 (2026-10-23, 최신 GA) | 4.1.2 |
| 2.0 | 2.0.9 (2026-10-23) | 4.0.9 |
| 1.4 | 1.4.14 (2026-10-23) | 3.5.16 (1.4.13 노트) |
| 2.2 | 2.2.0-RC1 (2026-10-23, 프리릴리스) | 4.2.0-RC1 |

버전은 `spring-modulith-bom`으로 맞춘다. 구조 검증, 모듈 테스트와 문서 생성 API는 test scope의 `spring-modulith-starter-test`로 추가한다. production 코드의 `package-info.java`에 `@ApplicationModule`이나 `@NamedInterface`를 쓰려면 이 애노테이션이 든 `spring-modulith-api`가 compile scope에 있어야 하고, compile scope의 `spring-modulith-starter-core`가 이를 포함한다(`spring-modulith-runtime`도 runtime으로 포함). 이벤트 발행 기록은 `spring-modulith-starter-jpa`나 `-jdbc` 같은 저장소별 starter로 추가하며 이들도 starter-core를 포함한다. 계열별 OSS 지원 기간은 이 표에 없으므로 Spring 지원 정책에서 확인한다.

## 해결하려는 문제

Java 패키지는 계층 구조가 아니어서 하위 패키지가 상위 패키지 안에 숨겨지지 않는다. 접근 제어자로 컴파일러가 막을 수 있는 것은 패키지 밖에서 public이 아닌 타입에 접근하는 경우다.

- 모듈을 패키지 하나로 두면 내부 타입을 package-private으로 숨길 수 있다. 그러나 모듈 안에 `order.internal` 같은 하위 패키지를 두면 `order`의 공개 서비스가 쓰는 내부 타입을 public으로 열어야 한다. 그 순간 `inventory` 같은 다른 모듈도 그 타입을 참조할 수 있고 컴파일러는 이를 막지 못한다.
- Spring Modulith는 이 경계를 컴파일러 대신 테스트 코드에서 검사한다. 위반이 있으면 검증 테스트가 실패하고 그 테스트를 실행하는 빌드가 깨진다. 기본 설정의 강제 시점은 컴파일이 아니라 테스트 실행이고, `spring-modulith-runtime`이 있을 때 `spring.modulith.runtime.verification-enabled=true`(기본 `false`)로 켜면 애플리케이션 시작 때도 모듈 구조를 검사해 위반이 있으면 시작을 중단한다.

## 애플리케이션 모듈 규약

```text
example                    // 메인 패키지 (@SpringBootApplication 클래스 위치)
├── inventory              // 애플리케이션 모듈
│   └── package-info.java  // @ApplicationModule(allowedDependencies = "order")
└── order                  // 애플리케이션 모듈의 API 패키지
    ├── OrderManagement    // 다른 모듈이 참조할 수 있다
    ├── spi                // @NamedInterface("spi")로 공개한 하위 패키지
    └── internal           // 내부 패키지, 다른 모듈의 참조 금지
```

- **기본 감지**: 메인 패키지의 직계 하위 패키지 하나하나가 애플리케이션 모듈이다. 하위 패키지가 없는 모듈은 그 패키지의 public 타입 전체가 API다.
- **API 패키지와 내부 패키지**: 모듈 기본 패키지가 API 패키지이고 그 아래 하위 패키지는 named interface로 공개하지 않는 한 내부 패키지다.
- **named interface**: 하위 패키지를 공개하려면 그 패키지의 `package-info.java`에 `@NamedInterface("spi")`를 붙인다. 의존을 명시하지 않은 모듈은 기본 패키지와 named interface를 모두 참조할 수 있다.
- **허용 의존 명시**: 모듈의 `package-info.java`에 `@ApplicationModule(allowedDependencies = "order")`를 두면 그 모듈은 `order`와 어느 모듈에도 속하지 않은 코드만 참조할 수 있다. 특정 named interface만 허용하려면 `"order :: spi"`, 선언된 named interface 전체는 `"order :: *"`로 쓴다.
- **open 모듈**: `@ApplicationModule(type = Type.OPEN)`이면 다른 모듈이 내부 타입에 접근해도 허용한다. 기존 코드베이스를 권장 패키지 구조로 점진 이전하는 용도이며, 모듈화를 마친 애플리케이션에 남아 있으면 대개 모듈 분리와 패키지 구조가 덜 정리됐다는 신호다.
- **중첩 모듈 (1.3+)**: 모듈 안 패키지에 `@ApplicationModule`을 붙이면 중첩 모듈이 된다. 중첩 모듈의 코드는 부모 모듈 안쪽(부모와 형제 중첩 모듈)에서만 쓸 수 있고, 중첩 모듈은 부모 모듈의 내부 코드와 최상위 모듈이 공개한 타입에 접근할 수 있다.
- **감지 전략**: `spring.modulith.detection-strategy=explicitly-annotated`로 바꾸면 `@ApplicationModule`이나 jMolecules `@Module`을 붙인 패키지만 모듈로 본다. `ApplicationModuleDetectionStrategy`를 직접 구현할 수도 있다.

## 구조 검증

```java
@Test
void 모듈_구조를_검증한다() {
  ApplicationModules.of(Application.class).verify();
}
```

`ApplicationModules.of(...)`는 코드베이스를 검사해 모듈 모델을 메모리에 만든다. 2022 소개 글 기준으로 이 모델 분석과 검증은 ArchUnit으로 구현됐다. `modules.forEach(System.out::println)`로 모듈별 논리 이름, 기본 패키지, Spring bean과 그 가시성을 출력해 감지 결과부터 확인할 수 있다. `verify()`가 적용하는 규칙은 다음과 같다.

1. **모듈 수준 순환 금지**: 모듈 사이 의존은 방향 비순환 그래프(DAG)여야 한다.
2. **API로만 참조**: 다른 모듈의 내부 패키지 타입을 참조하면 거부한다. open 모듈의 내부는 예외다.
3. **허용 의존만 사용**: `allowedDependencies`를 선언한 모듈이 그 밖의 모듈에 의존하면 거부한다. 선언하지 않은 모듈에는 이 규칙이 적용되지 않는다.
4. **jMolecules 규칙**: jMolecules ArchUnit 라이브러리가 classpath에 있으면 그 DDD와 아키텍처 규칙도 자동으로 실행한다.

- `verify()`는 위반이 있으면 예외를 던진다. 위반을 걸러 다루려면 `detectViolations()`로 받아 `filter(...)` 뒤 `throwIfPresent()`를 호출한다.
- `verify(...)`와 `detectViolations(...)`에 넘기는 `VerificationOptions`는 classpath에 따라 붙는 추가 검사만 조정한다. `defaults()`는 jMolecules가 있으면 그 규칙을 담고, `withoutAdditionalVerifications()`는 기본 추가 검사를 끄며, `withAdditionalVerifications(...)`는 `JMoleculesArchitectureRules.ensureHexagonal(...)` 같은 검사로 교체하고, `andAdditionalVerifications(...)`는 덧붙인다. 1~3번 규칙은 이 옵션으로 끌 수 없으므로 특정 위반만 무시하려면 위처럼 `detectViolations()` 결과를 거른다.
- 일부 패키지를 검사에서 빼려면 `ApplicationModules.of(Application.class, JavaClass.Predicates.resideInAPackage("com.example.db"))`처럼 조건을 넘긴다. 패턴 문법은 ArchUnit `PackageMatcher`를 따른다.

## 모듈 통합 테스트

모듈 패키지(또는 그 하위 패키지)에 둔 테스트 클래스에 `@ApplicationModuleTest`를 붙이면 `@SpringBootTest`처럼 모든 계층을 띄우되 부트스트랩을 그 모듈로 제한한다. 자동 구성, 컴포넌트 스캔과 엔티티 스캔이 해당 모듈 패키지로 좁혀진다.

| `BootstrapMode` | 띄우는 범위 |
|---|---|
| `STANDALONE` (기본) | 현재 모듈만 |
| `DIRECT_DEPENDENCIES` | 현재 모듈과 직접 의존하는 모듈 |
| `ALL_DEPENDENCIES` | 현재 모듈과 의존 트리 전체 |

- 모드는 `@ApplicationModuleTest(mode = BootstrapMode.DIRECT_DEPENDENCIES)`처럼 지정하고, `extraIncludes`로 모드와 별개로 포함할 모듈을 더한다. `verifyAutomatically`(기본 `true`)는 모듈 구조의 유효성도 자동으로 검사한다.
- 띄우지 않은 다른 모듈의 bean을 참조하면 부트스트랩이 실패한다. 범위를 넓히기보다 `@MockitoBean`으로 그 bean을 mock하는 편이 대개 낫고, 이런 의존이 많으면 결합이 높다는 신호이므로 도메인 이벤트로 바꿀 후보인지 본다.
- `@Modulithic(sharedModules = ...)`로 지정한 공유 모듈은 모든 모듈 통합 테스트에 포함된다.

```java
@ApplicationModuleTest
class InventoryIntegrationTests {
  @Autowired Inventory inventory; // 이 모듈의 bean, findStock은 남은 수량을 돌려준다고 가정
  @MockitoBean SomeOtherComponent someOtherComponent; // 띄우지 않은 모듈의 bean
  @Test
  void 주문_완료_이벤트를_받으면_재고를_차감한다(Scenario scenario) {
    // 전제: 재고 10개인 상품 productId와 그 상품을 담은 주문 orderId를 미리 저장했다
    scenario.publish(new OrderCompleted(orderId))
      .andWaitForStateChange(() -> inventory.findStock(productId), stock -> stock < 10)
      .andVerify(stock -> { /* 차감 결과 검증 */ });
  }
}
```

- **자극**: 테스트 메서드 파라미터로 주입받은 `Scenario`에서 `publish(event)`로 이벤트를 발행하거나 `stimulate(() -> ...)`로 bean 메서드를 호출한다. 자극은 새 트랜잭션에서 실행되어 DB 변경이 롤백되지 않으므로 `andCleanup(...)`으로 정리한다.
- **기대**: `andWaitForEventOfType(X.class).matching(...).toArriveAndVerify(...)`로 후속 이벤트를, `andWaitForStateChange(...).andVerify(...)`로 상태 변화를 기다린다. 기본으로는 null이 아닌 값(`Optional`은 값이 있을 때, 컬렉션은 비어 있지 않을 때, `Boolean`은 true일 때)을 상태 변화로 보므로, 위 예처럼 변화 전에도 값을 돌려주는 조회는 `Predicate`를 받는 overload로 판정 조건을 준다.
- **대기**: 비동기 대기는 Awaitility가 처리하며 `andWaitAtMost(Duration)`나 `customize(...)`로 timeout을 조정한다.

test scope의 `spring-modulith-junit`(1.3+)은 루트 모듈(메인 패키지 같은 루트 패키지마다 만드는 특수 모듈), 변경된 모듈과 그 모듈에 전이적으로 의존하는 모듈에 있는 테스트를 골라 실행한다. IDE에서 실행하면 요청한 테스트를 건너뛰지 않고, 모듈 루트의 빌드 파일(`pom.xml`, `build.gradle(.kts)` 등)이나 classpath 리소스가 바뀌었거나 변경이 감지되지 않으면 기본 설정에서 선별 없이 전체를 실행한다. `buildSrc`나 `build-logic` 같은 별도 빌드 로직 디렉터리의 변경은 전체 실행을 일으키지 않는다. CI에서는 `spring.modulith.test.reference-commit`에 마지막 성공 빌드의 커밋을 지정하고 그 커밋까지의 이력을 checkout한다.

## 모듈 간 이벤트

다른 모듈의 bean을 직접 호출하면 연동 기능이 호출하는 클래스로 계속 끌려 들어와 테스트가 어려워지고, 기능을 붙일 때마다 그 클래스를 고쳐야 한다. 동기 이벤트로 바꿔도 트랜잭션은 공유되어 부가 기능이 늘수록 트랜잭션이 넓어지고, 중요하지 않은 기능의 실패가 전체를 실패시킬 수 있다. 커밋 시점에 비동기로 처리하면 원래 트랜잭션과 분리되지만 리스너가 실패하면 이벤트가 사라진다. 리스너마다 안전장치를 둬도 리스너가 호출되기 전에 시스템이 멈출 수 있어 완전하지 않으므로, 아래 Event Publication Registry는 발행 기록을 원래 업무 트랜잭션 안에서 남긴다.

`@ApplicationModuleListener`는 `@Async`, `@Transactional(propagation = Propagation.REQUIRES_NEW)`, `@TransactionalEventListener`를 묶은 합성(composed) 애노테이션이다. 원래 업무 트랜잭션이 커밋된 뒤 리스너가 비동기로, 자기 트랜잭션에서 실행된다. `readOnlyTransaction`, `id`(1.1+), `condition`(1.2+), `propagation`(1.3+, 기본 `REQUIRES_NEW`) 속성이 있다. `@TransactionalEventListener` 기반이므로 활성 트랜잭션 밖에서 발행한 이벤트를 처리하지 않는 계약도 그대로 따른다([[Spring-Transaction-Events|Spring 트랜잭션 이벤트]]).

### Event Publication Registry

1. **기록**: 이벤트를 발행하면 그 이벤트를 받을 transactional event listener마다 발행 기록을 원래 업무 트랜잭션 안에서 저장한다. 대상은 기본적으로 `@TransactionalEventListener`로 (메타)애노테이션된 리스너다.
2. **완료 표시**: 리스너를 감싼 aspect가 리스너 실행이 성공하면 해당 기록을 완료로 표시한다.
3. **실패**: 리스너가 실패하면 기록은 완료되지 않은 채 남고 재시도 방식은 애플리케이션이 정한다. 2.0부터 기록은 `PUBLISHED`, `PROCESSING`, `COMPLETED`, `FAILED`, `RESUBMITTED` 상태와 시도 횟수를 가진다. `spring.modulith.events.staleness` 아래 `published`, `processing`, `resubmitted` 시간을 정하면 그 시간을 넘긴 기록을 `FAILED`로 표시한다(기본값은 모두 0이라 비활성).
4. **재제출**: `IncompleteEventPublications`로 조건이나 발행 후 경과 시간 기준으로, 2.0부터는 `FailedEventPublications.resubmit(ResubmissionOptions)`로 실패 건만 재제출한다. `spring.modulith.events.republish-outstanding-events-on-restart`는 재시작 때 미완료 건을 재발행하지만 기본값이 `false`이고, 다른 인스턴스가 아직 처리 중일 수 있어 여러 인스턴스 배포에서는 대개 권장되지 않는다.
5. **완료 기록 정리**: `spring.modulith.events.completion-mode`(1.3+)는 `UPDATE`(기본, 완료일을 기록하고 보존), `DELETE`(완료 시 삭제), `ARCHIVE`(보관 테이블로 이동) 중 하나다. `UPDATE`에서 오래된 완료 기록을 주기적으로 지우지 않으면 저장소가 끝없이 커지고 기록 생성과 완료가 느려질 수 있다. `CompletedEventPublications`로 완료 기록을 조회하거나 전체 또는 일정 기간이 지난 기록을 삭제한다.

JDBC 저장소는 `EVENT_PUBLICATION` 테이블을 쓰며 DB별 스키마는 레퍼런스 부록에 있다. 재제출은 같은 리스너를 다시 실행하므로, 실패 전에 외부 효과를 낸 리스너는 다시 실행돼도 결과가 같도록 멱등하게 만든다.

### 외부 broker로 내보내기

- 이벤트 타입에 `@Externalized("customer-created::#{#this.getLastname()}")`처럼 대상과 routing key를 지정하면 Kafka(`spring-modulith-events-kafka`), AMQP(`-amqp`), JMS(`-jms`, routing key 미지원), Spring Messaging(`-messaging`)으로 내보낸다. 대상을 생략하면 애플리케이션 기준 타입 이름(예: `sample.SampleEvent`)을 쓴다.
- 기본 구현은 broker별 발행에 위임하는 transactional event listener라서 Event Publication Registry가 broker 통신 실패를 지켜 재제출할 수 있게 한다. 비동기 리스너 기반의 단순한 방식이어서 전용 outbox 구현에 기대하는 핵심 기능 일부는 없다. 2.1부터 `spring.modulith.events.externalization.mode=outbox`로 Namastack Outbox(관계형 DB만)나 JobRunr에 위임할 수 있다([[Transactional-Outbox]]).
- 여러 스레드가 동시에 broker와 통신하면, 특히 재제출 때 나중 이벤트가 앞선 이벤트를 앞지를 수 있다. 순서가 중요하면 `spring.modulith.events.externalization.serialize-externalization=true`로 한 번에 하나씩 보낸다.

## 문서 생성

- 테스트에서 `new Documenter(ApplicationModules.of(Application.class))`를 호출하면 결과를 빌드 폴더의 `spring-modulith-docs`에 쓴다. `writeModulesAsPlantUml()`은 전체 모듈과 관계를, `writeIndividualModulesAsPlantUml()`은 모듈마다 그 모듈과 직접 의존하는 모듈을 PlantUML로 그린다. 기본은 C4 컴포넌트 다이어그램이고 `DiagramOptions.defaults().withStyle(DiagramStyle.UML)`로 UML 스타일을 고른다.
- `writeModuleCanvases()`는 모듈별 Application Module Canvas를 만든다. 기본 패키지, 모듈이 공개한 Spring bean(API 패키지나 named interface 패키지에 있는 bean을 stereotype별로), aggregate root, 발행하고 수신하는 이벤트, 설정 프로퍼티를 표로 보여 준다. 발행 이벤트는 jMolecules `@DomainEvent`나 `DomainEvent`로 표시해야 잡히고, 설정 프로퍼티 추출에는 `spring-boot-configuration-processor`가 필요하다.
- `writeAggregatingDocument()`는 생성된 다이어그램과 canvas를 묶은 문서를 만든다.

## 도입 판단과 한계

| 수단 | 강제 시점 | 막는 대상 | 비용과 한계 |
|---|---|---|---|
| Java 접근 제어자 | 컴파일 | 패키지 밖에서 public이 아닌 타입 접근 | 하위 패키지로 나누면 public이 필요해 경계가 샌다 |
| Gradle 멀티 프로젝트 | 컴파일 | 빌드 프로젝트 사이 의존 선언으로 classpath를 나눈다. `implementation` 의존은 소비자의 compile classpath에 오르지 않는다 | 모듈마다 빌드 프로젝트와 의존 선언을 관리 |
| ArchUnit | 테스트 실행 | bytecode를 읽어 직접 작성한 패키지, 계층, slice 의존과 순환 규칙 | 규칙을 팀이 설계하고 유지 |
| Spring Modulith | 테스트 실행 (선택: 애플리케이션 시작) | 패키지 규약에서 유도한 모듈의 순환, 내부 타입 참조, 허용하지 않은 의존 | 패키지 규약을 따르는 Spring Boot 애플리케이션 전제 |

- 기본 설정에서 검증은 테스트가 실행될 때만 일어난다. 구조 검증 테스트를 CI 필수 단계에 두고, 변경 기반 테스트 선택을 쓰면 그 테스트가 실행 범위에 들어가는지 확인한다.
- 검사 대상은 타입 사이의 의존이다. 다른 모듈의 테이블을 SQL로 직접 읽는 데이터 결합은 이 규칙으로 드러나지 않으므로 데이터 소유 규칙과 리뷰로 다룬다.
- 프로세스와 배포 단위는 하나 그대로다. 장애 격리, 독립 배포와 독립 확장은 얻지 못한다([[Modular-Monolith]]의 유지되는 한계).
- 기존 코드베이스는 open 모듈로 시작해 권장 구조로 옮기고, 이미 있는 위반은 `detectViolations()` 결과를 걸러 새 위반만 실패시키는 식으로 다룰 수 있다. ArchUnit `FreezingArchRule`이 기존 위반을 기록해 두고 새 위반만 보고하는 기준선 동결과 같은 발상이다([[Architecture-Fitness-Functions]]).

NestJS 모듈은 provider를 기본으로 캡슐화한다. 현재 모듈의 provider이거나 import한 모듈이 `exports`로 공개한 provider만 주입할 수 있고, `exports`가 모듈의 공개 API다. 예외로 `@Global()` 모듈이 공개한 provider는 import 없이 주입되지만, 모두 전역으로 만드는 설계는 권장되지 않는다. 범위 밖 provider를 요구하면 `Nest can't resolve dependencies of ...` 오류가 난다. NestJS의 규칙은 DI 주입 범위를 다루고, Spring Modulith의 규칙은 패키지 사이의 타입 참조와 모듈 의존 그래프를 다룬다는 점에서 막는 대상이 다르다.

## 면접 체크포인트

- 패키지만 나눠서는 모듈 경계가 지켜지지 않는 이유 (하위 패키지 타입을 쓰려면 public이 필요하고 컴파일러는 public 참조를 막지 않는다)
- 기본 모듈 규약: 메인 패키지의 직계 하위 패키지, API 패키지와 내부 패키지, named interface, 허용 의존
- `verify()`가 검사하는 규칙과 그 강제가 컴파일이 아니라 테스트 실행(선택적으로 애플리케이션 시작) 시점이라는 의미
- `@ApplicationModuleTest`의 bootstrap mode와 다른 모듈 bean을 mock으로 대체하는 이유
- `@ApplicationModuleListener`가 묶는 세 애노테이션과 실행 의미 (커밋 후, 비동기, 새 트랜잭션)
- Event Publication Registry가 리스너 실패 시 유실을 막는 방식과 재제출 때 리스너 멱등성이 필요한 이유
- 기본 이벤트 외부화와 전용 outbox 구현의 차이, 동시 전송 시 순서 역전
- Gradle 멀티 프로젝트, ArchUnit, NestJS 모듈 캡슐화와 막는 대상과 시점의 차이

## 출처

- [Introducing Spring Modulith — Spring Blog, Oliver Drotbohm](https://spring.io/blog/2022/10/21/introducing-spring-modulith)
- [Spring Modulith, Overview](https://docs.spring.io/spring-modulith/reference/index.html)
- [Spring Modulith, Fundamentals](https://docs.spring.io/spring-modulith/reference/fundamentals.html)
- [Spring Modulith, Verifying Application Module Structure](https://docs.spring.io/spring-modulith/reference/verification.html)
- [Spring Modulith, Integration Testing Application Modules](https://docs.spring.io/spring-modulith/reference/testing.html)
- [Spring Modulith, Working with Application Events](https://docs.spring.io/spring-modulith/reference/events.html)
- [Spring Modulith, Documenting Application Modules](https://docs.spring.io/spring-modulith/reference/documentation.html)
- [Spring Modulith, Spring Modulith Runtime Support](https://docs.spring.io/spring-modulith/reference/runtime.html)
- [Spring Modulith, Appendix](https://docs.spring.io/spring-modulith/reference/appendix.html)
- [ApplicationModules.java — GitHub spring-projects/spring-modulith](https://github.com/spring-projects/spring-modulith/blob/2.1.1/spring-modulith-core/src/main/java/org/springframework/modulith/core/ApplicationModules.java)
- [VerificationOptions.java — GitHub spring-projects/spring-modulith](https://github.com/spring-projects/spring-modulith/blob/2.1.1/spring-modulith-core/src/main/java/org/springframework/modulith/core/VerificationOptions.java)
- [ApplicationModuleListener.java — GitHub spring-projects/spring-modulith](https://github.com/spring-projects/spring-modulith/blob/2.1.1/spring-modulith-events/spring-modulith-events-api/src/main/java/org/springframework/modulith/events/ApplicationModuleListener.java)
- [ApplicationModuleTest.java — GitHub spring-projects/spring-modulith](https://github.com/spring-projects/spring-modulith/blob/2.1.1/spring-modulith-test/src/main/java/org/springframework/modulith/test/ApplicationModuleTest.java)
- [Scenario.java — GitHub spring-projects/spring-modulith](https://github.com/spring-projects/spring-modulith/blob/2.1.1/spring-modulith-test/src/main/java/org/springframework/modulith/test/Scenario.java)
- [spring-projects/spring-modulith Releases — GitHub](https://github.com/spring-projects/spring-modulith/releases)
- [ArchUnit, User Guide](https://www.archunit.org/userguide/html/000_Index.html)
- [Gradle, The Java Library Plugin](https://docs.gradle.org/current/userguide/java_library_plugin.html)
- [NestJS, Modules](https://docs.nestjs.com/modules)
- [NestJS, Common errors](https://docs.nestjs.com/faq/common-errors)

## 관련 문서

- [[Spring|Spring]]
- [[Modular-Monolith|모듈러 모놀리스 (경계를 도구로 강제하는 방법과 유지되는 한계)]]
- [[Hexagonal-In-Practice|헥사고날 실전 적용 (애플리케이션 컴포넌트와 의존 검증)]]
- [[Architecture-Fitness-Functions|아키텍처 Fitness Function (ArchUnit 규칙과 기준선 동결)]]
- [[Spring-Transaction-Events|Spring 트랜잭션 이벤트 (@TransactionalEventListener 계약)]]
- [[Transactional-Outbox|Transactional Outbox 패턴]]
- [[Spring-Testing-Essentials|Spring test 경계]]
- [[NestJS-vs-Spring-Runtime-DI|NestJS vs Spring 런타임과 DI, 모듈 구조]]
