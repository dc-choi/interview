---
tags: [testing, transactional, spring, jpa, junit, integration-test]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["Transactional Test Antipattern", "테스트 @Transactional 안티패턴", "테스트 데이터 롤백"]
---

# 테스트에서 `@Transactional` · 안티패턴과 대안

Spring Boot + JPA 테스트에서 `@Transactional`은 **데이터 자동 롤백**이라는 강력한 편의를 제공한다. 하지만 **테스트 트랜잭션이 프로덕션 경로와 달라** 실제 버그를 가리거나 **false positive**를 만들 위험이 크다. "테스트를 안 하느니만 못한" 결과를 막으려면 대안을 알고 써야 한다. 원칙은 간단하다 — **테스트 환경에서 `@Transactional`을 쓰지 말고, 수동으로 데이터를 롤백하라**.

## 왜 `@Transactional` 테스트가 위험한가

- **트랜잭션 경계 차이** — 프로덕션은 Service 메서드 단위, 테스트는 메서드 전체가 하나의 트랜잭션. `REQUIRES_NEW`·이벤트 발행·flush 동작이 다르게 작동
- **JPA flush 시점 차이** — 커밋 시점까지 지연되어 NOT NULL·UNIQUE 제약 오류가 테스트에서 안 보임
- **Dirty Checking의 가짜 성공** — 영속성 컨텍스트 안 객체만 변경되고 DB 반영 없이 단언이 성공
- **수동 정리 기술 약화** — 자동 롤백에 익숙해지면 MyBatis·JDBCTemplate 같은 비-JPA 경로의 데이터 정리 방법을 잃음

**결과**: 커버리지 숫자는 올라가지만 실제 버그는 그대로. 팀 단위로 테스트에서 `@Transactional`을 **금지**하는 컨벤션이 대안.

## 데이터 롤백 전략 진화

`@Transactional`을 버리면 **수동으로** 데이터를 정리해야 한다. 3단계 진화가 있다.

### 1단계: `Repository.deleteAll()`

```java
@AfterEach
void clean() {
    seasonRepository.deleteAll();
    stayRepository.deleteAll();
    userRepository.deleteAll();
}
```

**문제**:
- 모든 테스트 클래스에 같은 코드 중복
- 새 Repository 추가 시 매번 업데이트 필요 — **누락되면 테스트 오염**
- **외래키 제약 순서**를 고려해야 함 (자식 → 부모)
- MyBatis·JDBCTemplate로 넣은 데이터는 **롤백 못 함**

### 2단계: 테이블 전체 `TRUNCATE`

```java
private void truncate() {
    var tableNames = findDatabaseTableNames();
    jdbcTemplate.execute("SET REFERENTIAL_INTEGRITY FALSE");
    for (String tableName : tableNames) {
        jdbcTemplate.execute("TRUNCATE TABLE " + tableName);
    }
    jdbcTemplate.execute("SET REFERENTIAL_INTEGRITY TRUE");
}

private List<String> findDatabaseTableNames() {
    return jdbcTemplate.query("SHOW TABLES", (rs, rowNum) -> rs.getString(1)).stream().toList();
}
```

**개선**:
- **모든 테이블 순회** → 누락 불가능
- **외래키 제약 일시 해제** → 삭제 순서 신경 안 써도 됨
- ORM 무관 — MyBatis·JDBC도 같이 롤백

**남은 문제**: 모든 테스트 클래스에 이 코드를 **복붙**해야 함.

### 3단계: JUnit Extension + Auto Detection

JUnit 5의 확장 모델로 **전역 적용**. `BeforeEachCallback` 구현체에서 `SpringExtension.getApplicationContext()`로 컨텍스트 조회 → `DatabaseCleaner.clear()` 호출.

```java
public class NoTransactionExtension implements BeforeEachCallback {
    @Override
    public void beforeEach(ExtensionContext ctx) {
        var appCtx = SpringExtension.getApplicationContext(ctx);
        DatabaseCleaner.clear(appCtx);
    }
}
```

Cleaner 내부는 `TransactionTemplate`으로 묶어 `entityManager.clear()` + TRUNCATE 실행. 사용법: `@ExtendWith(NoTransactionExtension.class)` 한 줄.

## JUnit Extension 수명주기 · Auto Detection

Extension 훅 지점: `BeforeAllCallback → BeforeAll → BeforeEachCallback → BeforeEach → BeforeTestExecutionCallback → Test → AfterTestExecutionCallback → AfterEach → AfterEachCallback → AfterAll → AfterAllCallback`. `BeforeEachCallback.beforeEach(ExtensionContext)`에서 **각 테스트 전** 데이터 정리이 자연스러운 위치.

**Auto Detection**으로 `@ExtendWith` 없이 전역 적용:

1. `src/test/resources/META-INF/services/org.junit.jupiter.api.extension.Extension` 생성
2. 파일 내용에 Extension 전체 경로 (`banlife.NoTransactionExtension`) 기재
3. `junit-platform.properties`에 `junit.jupiter.extensions.autodetection.enabled=true`

→ 프로젝트·모듈의 모든 테스트에 자동 적용.

## `@Transactional` 사용을 **차단**하는 기술적 방법

컨벤션만으론 실수를 막기 어려우니 Extension이 **테스트 전 `@Transactional` 존재를 감지**해 `Assertions.fail()`.

- **클래스 레벨**: `TestContextAnnotationUtils.hasAnnotation(testClass, Transactional.class)`
- **메서드 레벨**: `AnnotatedElementUtils.hasAnnotation(testMethod, Transactional.class)`
- **Spring + Jakarta** 두 `@Transactional` 모두 감지
- `@DataJpaTest`처럼 내부에 `@Transactional`이 포함된 메타 어노테이션도 자동 감지

**효과**: 코드 리뷰 단계의 "컨벤션 어긋남" 지적 전에, **테스트 실행 실패**로 개발자가 먼저 인지. 감정 소모 없이 교정.

## 라이브러리화

같은 Extension을 **여러 프로젝트에서 재사용**하려면 라이브러리화가 자연스럽다.

- GitHub에 독립 레포 생성
- JitPack·Maven Central로 배포
- 각 프로젝트 `build.gradle`에 **의존성 + Auto Detection 설정** 한 번으로 적용

```gradle
repositories { maven { url 'https://jitpack.io' } }

dependencies {
    testImplementation 'com.github.banlife:no-transactional:preRelease-5'
}

test {
    systemProperty("junit.jupiter.extensions.autodetection.enabled", true)
}
```

한 곳에서 **관리 포인트 집중** — 개선·버그 수정이 모든 프로젝트에 전파.

## 대안 정리

| 방식 | 복잡도 | 커버리지 | 누락 가능성 | 추천 |
|---|---|---|---|---|
| `@Transactional` | 0 | 부분 (false positive 위험) | 있음 | ❌ |
| `Repository.deleteAll()` | 낮음 | 부분 | 높음 | ❌ |
| `TRUNCATE` 전체 테이블 | 중간 | 완전 | 낮음 | △ |
| JUnit Extension | 중간 | 완전 | 없음 | ✅ 단일 프로젝트 |
| OSS 라이브러리 | 높음(초기) | 완전 | 없음 | ✅ 멀티 프로젝트 |

## Testcontainers와의 결합

[[TestContainers-Integration|Testcontainers]]로 매 테스트 깨끗한 DB를 얻더라도, **테스트 간 데이터 격리**는 별도로 필요. Extension + TRUNCATE 패턴이 자연스럽게 결합된다.

```
Testcontainers (컨테이너 격리)
  + NoTransactionExtension (테스트 간 데이터 격리)
  = 프로덕션과 동일 환경 + 격리된 결정론적 테스트
```

## 언제 `@Transactional`이 허용되는가

예외 케이스:

- **매우 단순한 Repository 단위 테스트** — Service 호출 없이 엔티티 저장·조회만 검증
- **빠른 프로토타입·POC** — 안정성보다 속도 우선
- **실험적 기능의 초기 테스트**

하지만 **Service 레이어 통합 테스트**에는 절대 쓰지 말 것. 허용 시에도 "나중에 제거"라는 기술 부채로 남김을 인지.

## 흔한 실수

- 테스트 커버리지만 보고 `@Transactional` 방치
- `@Transactional` 있는 테스트 통과 후 프로덕션에서 제약 오류 발생
- Repository `deleteAll()`에서 **외래키 순서 고려 누락**
- MyBatis 데이터를 `deleteAll()`로 롤백하려 함
- Extension 만들었지만 **`@ExtendWith` 누락**된 클래스가 존재
- Auto Detection 설정 후 **기존 `@Transactional` 테스트 대량 실패** 상황에 대비 못 함

## 마이그레이션 전략

기존 코드베이스 전환: (1) Extension 배포 - 관찰·로깅만 (2) 한 주 경고 수집 → `@Transactional` 사용처 파악 (3) 우선순위 제거 - 복잡한 Service 통합 테스트부터 (4) `Assertions.fail()` 활성화로 재발 방지 (5) CI 문서에 컨벤션 기재.

## 면접 체크포인트

- 테스트 `@Transactional`의 **4가지 위험**(프로덕션 경계 차이·flush·Dirty Checking·수동 기술 약화)
- 수동 롤백의 3단계 진화(`deleteAll` → `TRUNCATE` → Extension)
- JUnit Extension 수명주기와 `BeforeEachCallback` 활용
- Auto Detection 설정 흐름 (META-INF·junit-platform.properties)
- 컨벤션을 코드 리뷰 대신 **테스트 실패**로 강제하는 설계 가치
- OSS 라이브러리화로 얻는 이득(멀티 프로젝트 일관성)

## 출처
- [banlife — @Transactional 없애려다 오픈소스 라이브러리까지 만든 이야기](https://blog.ban-life.com/transactional-없애려다-오픈소스-라이브러리까지-만든-이야기-5426116036bb)
- [banlife/no-transactional (GitHub)](https://github.com/banlife/no-transactional)

## 관련 문서
- [[Mock-Testing-Strategy|Mock 테스트 설계 전략]]
- [[Classicist-vs-Mockist-Testing|Classicist vs Mockist · Test Double]]
- [[Test-Pyramid|Practical Test Pyramid]]
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
- [[Test-Isolation|Test Isolation]]
- [[Test-Fixture|Test Fixture 전략]]
- [[Spring-Transactional|Spring @Transactional]]
- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
- [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
