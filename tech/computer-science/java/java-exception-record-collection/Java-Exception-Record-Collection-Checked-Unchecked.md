---
tags: [java, exception, checked-exception, unchecked-exception, spring]
status: done
verified_at: 2026-08-04
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

## 출처

- [JLS 11, Exceptions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-11.html)
- [Throwable, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Throwable.html)
- [Spring Framework, DataAccessException](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/dao/DataAccessException.html)

## 관련 문서

- [[Java-Standard-Library-Exception-Handling|Java 예외 처리]]
- [[Java-Language-Library-and-IO|Java 표준 라이브러리와 I/O]]
