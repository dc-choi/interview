---
tags: [java, exception, checked-exception, unchecked-exception, spring]
status: done
verified_at: 2026-09-30
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Checked vs Unchecked Exception", "Java 예외 계층"]
---

# Checked vs Unchecked Exception

checked와 unchecked의 기준은 예외가 반드시 복구 가능한지가 아니라 compiler가 처리 또는 선언을 강제하는지다.

## 계층

```text
Throwable
├── Error
└── Exception
    └── RuntimeException
```

- `RuntimeException`과 그 하위 타입, `Error`와 그 하위 타입은 unchecked다.
- 그 밖의 exception class는 checked다. 실무에서는 주로 `Exception` 하위이면서 `RuntimeException` 하위가 아닌 타입을 가리킨다.
- checked exception은 catch하거나 method와 constructor의 `throws`로 허용된 상위 타입을 선언해야 한다.
- unchecked exception은 compile-time checking에서 제외되지만 발생 가능성과 처리 정책이 없어지는 것은 아니다.

## 복구 가능성과 동일시하지 않는다

`RuntimeException`에서도 입력을 다시 받거나 transaction을 중단하는 복구가 가능할 수 있다. 반대로 checked exception도 현재 호출자가 의미 있게 복구하지 못할 수 있다.

`Error`는 일반 application이 보통 복구하도록 기대되지 않지만 모든 `Error`가 언제나 즉시 JVM 종료를 뜻하는 것은 아니다. 최상위 framework 경계나 정교한 runtime code가 일부 조건을 관찰할 수 있으므로 절대 잡으면 안 된다는 규칙으로 단정하지 않는다. 일반 업무 코드에서는 `Throwable` 전체를 잡아 JVM 상태, 취소와 종료 신호를 숨기지 않는다.

## 선택 기준

| 질문 | checked를 검토 | unchecked를 검토 |
|---|---|---|
| 호출자가 즉시 대안이나 복구를 선택해야 하는가 | 예 | 아니오 |
| 실패가 공개 API 계약의 핵심인가 | 예 | 구현 경계에서 변환 가능 |
| 모든 구현이 같은 실패 계약을 공유하는가 | 예 | 구현별 기술 실패가 다른 경우 |
| 호출 계약 위반이나 불변식 위반인가 | 드묾 | 일반적 |

checked는 실패 계약을 드러내지만 호출 계층과 interface 전체에 `throws` 결합을 만들 수 있다. unchecked는 전파를 간결하게 하지만 문서와 공통 처리 경계가 없으면 실패를 숨긴다.

## checked가 interface와 호출 계층으로 번지는 이유

재정의 규칙이 결합을 강제한다. JLS 8.4.8.3에 따라 method를 override하거나 interface의 abstract method를 구현하는 method는 상위 method보다 더 많은 checked exception을 선언할 수 없다. 선언한 checked exception마다 같은 class나 상위 타입이 상위 method의 `throws`에 있어야 하며, 선언을 줄이는 것은 허용된다.

```java
interface MemberRepository {
    Member save(Member member);
}

class JdbcMemberRepository implements MemberRepository {
    public Member save(Member member) throws SQLException { ... } // compile error
}
```

JDK 21.0.3 javac는 이 구현을 `overridden method does not throw SQLException`으로 거부한다. 구현이 `SQLException`을 그대로 던지려면 interface에도 `throws SQLException`을 넣어야 하고, 그 순간 interface가 JDBC에 묶인다. JPA 구현으로 바꾸면 interface와 호출부가 함께 바뀌므로 구현 교체를 위해 interface를 둔 목적이 사라진다. unchecked exception은 선언 없이 전파되므로 interface를 기술 중립으로 유지할 수 있다.

- 계층 전파: repository의 `SQLException`, network client의 `ConnectException`처럼 service와 controller가 복구할 수 없는 기술 예외도 checked이면 상위 method마다 `throws`로 다시 선언해야 한다. 의존하는 library와 외부 system이 늘수록 목록이 쌓이고 상위 계층이 `java.sql` 같은 구체 기술에 의존한다.
- `throws Exception` 회피: `Exception`으로 한꺼번에 선언하면 compile은 통과하고 기술 이름도 감춰지지만, 반드시 처리해야 할 checked exception이 새로 생겨도 compiler가 알려주지 못한다. checked exception의 존재 이유인 누락 검출을 스스로 끄는 셈이다. 이 선언을 받은 호출자가 `catch (Exception e)`로 대응하면 의도하지 않은 `RuntimeException`까지 잡는다. interface를 `throws Exception`으로 선언해 `SQLException`을 감추는 것도 같은 문제다.
- 변환 위치: 복구할 수 없는 기술 예외는 발생 경계에서 cause를 보존한 unchecked exception으로 바꾸고, 공통 예외 처리 경계에서 오류 log와 개발자 알림을 남긴 뒤 사용자에게는 일반 오류 응답을 준다. 기술이 바뀌어도 변환 경계와 공통 처리만 수정한다.

## 실무 기본값과 unchecked 문서화

Spring의 `DataAccessException`, Jakarta Persistence의 `PersistenceException`처럼 주요 data access library는 `RuntimeException` 계열을 기본 계약으로 제공한다. 이 흐름에서 자주 쓰는 기본값은 다음과 같다.

- 기본은 unchecked exception이다.
- checked exception은 호출자가 반드시 잡아 업무적으로 대응해야 하는 좁은 경우에 검토한다. 계좌 이체 실패, 결제 시 point 부족, login 정보 불일치처럼 의도적으로 던지는 업무 예외가 후보이며, 이 경우에도 unchecked와 문서화가 더 나을 수 있다.
- 위의 선택 기준 표와 복구 가능성을 checked로 동일시하지 않는 원칙은 그대로 적용한다.

unchecked exception은 compiler가 강제하지 않으므로 계약을 문서로 드러낸다. Oracle의 doc comment 작성 가이드는 호출자가 잡을 만한 unchecked exception을 Javadoc `@throws`로 적고 `throws` 절에는 넣지 않는 것을 관례로 둔다. compiler는 `throws` 절의 unchecked exception을 허용하되 검사하지 않는다. 실제 API도 갈린다. Jakarta Persistence `EntityManager.persist`는 signature에 `throws` 없이 Javadoc에만 예외를 적고, Spring `JdbcTemplate.update`는 signature에 `throws DataAccessException`을 선언한다. 팀 convention으로 하나를 정한다.

## Spring과 예외 변환

Spring은 `DataAccessException`처럼 기술별 checked exception을 unchecked 추상화로 변환하는 패턴을 많이 사용한다. 이를 모든 checked exception을 무조건 unchecked로 바꾸라는 규칙으로 확대하지 않는다.

```java
try {
    repository.save(order);
} catch (SQLException cause) {
    throw new OrderPersistenceException("order save failed", cause);
}
```

- 구현 세부사항이 상위 계층으로 새지 않는 추상화 경계에서 변환한다.
- 원본 exception을 cause로 보존한다.
- 사용자 응답과 내부 진단 정보를 분리한다.
- catch할 때 실제 복구, fallback, 재시도 판단 또는 의미 있는 변환을 수행한다.

## 면접 체크포인트

- checked와 unchecked를 나누는 compile-time checking 기준
- `RuntimeException`에서도 복구가 가능할 수 있는 이유
- broad catch가 `Error`와 취소 신호까지 숨길 수 있는 문제
- unchecked 변환이 적절한 추상화 경계
- cause를 보존해야 하는 이유
- interface 구현 method가 새 checked exception을 선언할 수 없는 이유와 그 결과로 생기는 기술 종속
- `throws Exception`이 compiler의 누락 검출을 무력화하는 이유

## 출처

- [JLS 11, Exceptions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-11.html)
- [JLS 8.4.8.3, Requirements in Overriding and Hiding](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html#jls-8.4.8.3)
- [Throwable, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Throwable.html)
- [Spring Framework, DataAccessException](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/dao/DataAccessException.html)
- [Spring Framework, JdbcTemplate](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jdbc/core/JdbcTemplate.html)
- [Jakarta Persistence 3.2, EntityManager](https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/entitymanager)
- [Jakarta Persistence 3.2, PersistenceException](https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/persistenceexception)
- [Oracle, How to Write Doc Comments for the Javadoc Tool](https://www.oracle.com/technical-resources/articles/java/javadoc-tool.html)
- [인프런, 스프링 DB 1편, 체크 예외 기본 이해](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110101)
- [인프런, 스프링 DB 1편, 체크 예외 활용](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110103)
- [인프런, 스프링 DB 1편, 언체크 예외 활용](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110104)
- [인프런, 스프링 DB 1편, 정리](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110106)
- [인프런, 스프링 DB 1편, 체크 예외와 인터페이스](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110107)
- [인프런, 김영한의 실전 자바 중급 1편, 자바 예외 처리3 - 체크 예외](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212282)
- [인프런, 김영한의 실전 자바 중급 1편, 자바 예외 처리4 - 언체크 예외](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212283)
- [인프런, 김영한의 실전 자바 중급 1편, 실무 예외 처리 방안1 - 설명](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212292)
- [인프런, 김영한의 실전 자바 중급 1편, 정리](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212295)

## 관련 문서

- [[Java-Standard-Library-Exception-Handling|Java 예외 처리]]
- [[Java-Language-Library-and-IO|Java 표준 라이브러리와 I/O]]
