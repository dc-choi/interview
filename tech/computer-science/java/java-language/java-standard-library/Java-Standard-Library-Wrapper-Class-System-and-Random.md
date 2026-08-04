---
tags: [java, wrapper, boxing, reflection, class, system, math, random]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Wrapper Class System and Random", "Java 래퍼 Class System 난수"]
---

# Java 래퍼, Class, System과 난수

래퍼 클래스는 primitive 값을 객체가 필요한 API에 연결하고, `Class`는 런타임 타입 정보를 표현한다. `System`, `Math`, 난수 API는 자주 쓰이지만 시간 측정과 보안 난수처럼 목적을 구분해야 한다.

## primitive의 한계와 래퍼 클래스

primitive는 값 자체를 효율적으로 다루지만 메서드를 가질 수 없고 generic 타입 인자로 사용할 수 없으며 `null`을 표현하지 않는다. Java는 각 primitive에 대응하는 래퍼를 제공한다.

| primitive | 래퍼 |
|---|---|
| `boolean` | `Boolean` |
| `byte`, `short`, `int`, `long` | `Byte`, `Short`, `Integer`, `Long` |
| `float`, `double` | `Float`, `Double` |
| `char` | `Character` |

래퍼는 불변 객체다. 문자열에서 primitive가 필요하면 `Integer.parseInt`, 객체가 필요하면 `Integer.valueOf`처럼 반환 타입의 의도를 구분한다. `new Integer(...)` 생성자는 deprecated이므로 사용하지 않는다.

## boxing과 unboxing

```java
Integer boxed = 10; // boxing conversion
int value = boxed;  // unboxing conversion
```

컴파일러가 변환을 허용하지만 비용과 실패 가능성이 사라지는 것은 아니다.

- `Integer value = null; int n = value;`는 unboxing 중 `NullPointerException`을 던진다.
- 반복 계산에서 boxing은 할당, 캐시 조회와 간접 접근을 유발할 수 있다. 실제 병목은 측정하고 primitive 특화 API를 검토한다.
- 일부 boxing 결과는 동일 객체를 재사용할 수 있다. 특히 특정 상수 범위에는 명세 규칙이 있지만 `Integer` 참조를 `==`로 비교하는 코드는 범위와 실행 환경에 따라 달라질 수 있으므로 값 비교에는 `equals`를 쓴다.
- 래퍼를 nullable 상태로 쓸 때는 값 부재가 업무 의미인지, `OptionalInt`나 별도 결과 타입이 더 명확한지 검토한다.

강의의 특정 반복 횟수와 배수로 측정한 primitive와 wrapper 성능 차이는 그 환경의 실험 결과다. JVM 최적화, 하드웨어와 코드 모양에 따라 달라지므로 일반 법칙으로 고정하지 않는다.

## Class와 런타임 타입 정보

각 로드된 타입은 `Class<?>` 객체로 표현된다. 클래스 리터럴, 객체의 `getClass()`, 이름 기반 로딩으로 얻을 수 있다.

```java
Class<String> literal = String.class;
Class<?> runtime = value.getClass();
Class<?> loaded = Class.forName("com.example.Plugin");
```

`Class`로 이름, package, superclass, interface, field, method와 constructor 메타데이터를 조회할 수 있다. annotation, serializer, DI container와 plugin이 이 기능을 사용한다.

- deprecated된 `Class.newInstance()` 대신 `getDeclaredConstructor().newInstance()`를 사용한다.
- reflection 호출은 생성자 없음, 접근 제한, module 경계, 초기화 실패와 호출 대상 예외를 처리해야 한다.
- generic 타입 인자는 대부분 type erasure의 영향을 받는다. `List<String>.class` 같은 클래스 리터럴은 없다.
- 문자열 기반 타입 선택은 컴파일 시 검사를 잃으므로 허용 목록과 명시적인 등록 구조를 우선 검토한다.

## System API

| API | 용도 | 주의점 |
|---|---|---|
| `System.in/out/err` | 표준 입출력 stream | application logging과 secret 출력 정책을 분리한다 |
| `getProperty` | JVM system property 조회 | 외부 입력처럼 검증하고 credential을 출력하지 않는다 |
| `getenv` | 환경 변수 조회 | 값 전체를 로그에 남기지 않는다 |
| `arraycopy` | 배열 구간 복사 | 타입, 범위와 겹침 규칙을 API 계약대로 처리한다 |
| `currentTimeMillis` | epoch 기준 현재 시각 | 벽시계 조정의 영향을 받을 수 있다 |
| `nanoTime` | 경과 시간 측정 | 값 자체가 시각은 아니며 같은 JVM 안에서 차이를 구한다 |
| `exit` | 현재 JVM 종료 요청 | library 코드에서는 호출자 정리 기회를 빼앗을 수 있다 |

경과 시간에는 `System.nanoTime()`의 두 결과 차이를 사용한다. 날짜와 시각을 표현하려면 `Instant`와 `Clock` 같은 `java.time` 타입을 사용한다.

## Math와 난수

`Math`는 절댓값, 최솟값과 최댓값, 거듭제곱, 반올림과 정확한 정수 연산 같은 정적 메서드를 제공한다. 정수 overflow를 잡아야 할 때 `addExact`, `multiplyExact` 등을 사용하면 조용한 wraparound 대신 `ArithmeticException`을 받을 수 있다.

난수 생성기는 목적에 맞게 고른다.

- 재현 가능한 테스트나 일반 simulation은 고정 seed와 `Random` 또는 `RandomGenerator` 구현을 사용할 수 있다.
- 동시 실행과 병렬 계산에는 공유 `Random`의 경합과 알고리즘 요구를 검토하고 적합한 generator를 선택한다.
- 비밀번호, reset token, session secret처럼 공격자가 예측하면 안 되는 값에는 `Random`을 쓰지 않고 `SecureRandom`을 사용한다.
- seed를 고정하면 같은 구현에서 재현성을 얻는 데 유용하지만 보안성이 생기지는 않는다.

로또 번호처럼 중복 없는 표본을 만들 때 계속 다시 뽑는 방식 외에도 후보 목록을 섞고 앞부분을 선택하는 방법이 있다. 표본 크기와 범위에 맞춰 편향이 없는 알고리즘과 중복 정책을 명시한다.

## 면접 체크포인트

- primitive와 wrapper의 표현력과 비용 차이
- null wrapper를 unboxing할 때 생기는 문제
- wrapper 캐시를 `==` 비교 근거로 쓰면 안 되는 이유
- `Class` 객체와 reflection의 역할 및 실패 경계
- `currentTimeMillis`와 `nanoTime`의 목적 차이
- 일반 난수와 보안 난수의 선택 기준

## 출처

- [JLS 5, Conversions and Contexts](https://docs.oracle.com/javase/specs/jls/se26/html/jls-5.html)
- [Integer, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Integer.html)
- [Class, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Class.html)
- [System, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/System.html)
- [Math, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Math.html)
- [Random, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Random.html)
- [RandomGenerator, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/random/RandomGenerator.html)
- [SecureRandom, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/security/SecureRandom.html)
- 김영한 강사, [래퍼 클래스 - 기본형의 한계1](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212220)
- 김영한 강사, [래퍼 클래스 - 기본형의 한계2](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212221)
- 김영한 강사, [래퍼 클래스 - 자바 래퍼 클래스](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212222)
- 김영한 강사, [래퍼 클래스 - 오토 박싱](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212223)
- 김영한 강사, [래퍼 클래스 - 주요 메서드와 성능](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212224)
- 김영한 강사, [Class 클래스](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212225)
- 김영한 강사, [System 클래스](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212226)
- 김영한 강사, [Math, Random 클래스](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212227)
- 김영한 강사, [래퍼와 Class 문제와 풀이1](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212228)
- 김영한 강사, [래퍼와 Class 문제와 풀이2](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212229)
- 김영한 강사, [래퍼와 Class 정리](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212230)

## 관련 문서

- [[Java-Standard-Library-Immutability-and-String|Java 불변 객체와 String]]
- [[Java-Standard-Library-Date-and-Time|Java 날짜와 시간]]
- [[JVM-GC|JVM GC]]
- [[Security|보안]]
