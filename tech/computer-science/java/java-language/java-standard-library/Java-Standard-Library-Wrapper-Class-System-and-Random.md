---
tags: [java, wrapper, boxing, reflection, class, system, math, random]
status: done
verified_at: 2026-10-05
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Wrapper Class System and Random", "Java 래퍼 Class System 난수"]
---

# Java 래퍼, Class, System과 난수

래퍼 클래스는 primitive 값을 객체가 필요한 API에 연결하고, `Class`는 런타임 타입 정보를 표현한다. `System`, `Math`, 난수 API는 자주 쓰이지만 시간 측정과 보안 난수처럼 목적을 구분해야 한다.

## primitive의 한계와 래퍼 클래스

Java의 타입은 primitive 8개와 그 밖의 참조 타입으로 나뉜다. `int a = 1`의 변수는 값 1을 직접 담지만 `Integer b = 1`의 변수는 heap의 `Integer` object를 가리키는 reference value를 담는다. 값을 읽으려면 reference를 한 번 더 따라가야 하고 boxing에는 object 할당이 따를 수 있다. primitive는 단순한 값 계산을 object 없이 처리하려는 타입이고, 상태와 행동을 정의하는 타입은 참조 타입으로 만든다. 기본형은 stack, 참조형은 heap이라는 요약은 지역 변수에만 맞는다. object의 primitive field는 그 object와 함께 heap에 있다([[Java-Language-Class-Members-and-Memory|클래스 멤버와 메모리 모델]]).

primitive는 값 자체를 효율적으로 다루지만 메서드를 가질 수 없고 generic 타입 인자로 사용할 수 없으며 `null`을 표현하지 않는다. Java는 각 primitive에 대응하는 래퍼를 제공한다.

| primitive | 래퍼 |
|---|---|
| `boolean` | `Boolean` |
| `byte`, `short`, `int`, `long` | `Byte`, `Short`, `Integer`, `Long` |
| `float`, `double` | `Float`, `Double` |
| `char` | `Character` |

래퍼는 불변 객체다. 문자열에서 primitive가 필요하면 `Integer.parseInt`, 객체가 필요하면 `Integer.valueOf`처럼 반환 타입의 의도를 구분한다. `new Integer(...)` 같은 래퍼 생성자는 Java 9부터 deprecated다. JDK 16(JEP 390)에서 제거 예정으로 표시됐다가 JDK 25에서 제거 예정 표시만 풀렸고 deprecated 상태는 그대로이므로 쓰지 않는다. 생성자는 항상 새 object를 만들어 아래 캐시도 우회한다.

### 래퍼를 선택하는 경우

primitive를 기본으로 두고 다음 경우에 래퍼를 쓴다.

- generic 타입 인자: type argument는 참조 타입이나 wildcard만 될 수 있어 `List<int>`는 compile error이고 `List<Integer>`를 쓴다(JLS 4.5.1). `list.add(123)`이 동작하는 것은 compiler가 boxing을 넣기 때문이다.
- 값 부재를 null로 표현할 때: 소속 팀이 없는 선수의 nullable `team_id`처럼 DB의 NULL을 entity field로 옮기면 `int`로는 NULL과 0을 구분하지 못한다. `Integer`를 쓰되 null이 업무 의미인지 먼저 정한다.
- `Integer.parseInt`, `Integer.compare`, `Integer.MAX_VALUE` 같은 유틸리티는 래퍼 class의 static member라 boxing 없이 쓴다. 유틸리티가 필요하다고 변수 타입까지 래퍼로 바꿀 이유는 없다.

## boxing과 unboxing

javac는 boxing에 `valueOf`, unboxing에 `intValue` 같은 호출을 넣는다. 개발자가 변환 코드를 쓰지 않게 해 주는 syntax sugar일 뿐 변환 비용과 실패 가능성이 사라지지는 않는다.

```java
Integer a = 199;   // Integer.valueOf(199)
int b = a;         // a.intValue()
a++;               // a = Integer.valueOf(a.intValue() + 1)
Integer c = a * a; // Integer.valueOf(a.intValue() * a.intValue())
```

래퍼 object는 값을 바꿀 수 없으므로 `a++`는 기존 object를 증가시키지 않고 새 값의 object를 받아 `a`에 다시 대입한다. primitive `b++`가 변수의 값만 바꾸는 것과 달리 unboxing, 연산, boxing을 거친다.

- `Integer value = null; int n = value;`는 unboxing 중 `NullPointerException`을 던진다. reference가 null이면 꺼낼 값이 없기 때문이다(JLS 5.1.8).
- `Integer sum = 0;`을 반복문에서 누적하면 반복마다 unboxing과 boxing을 하고 캐시 범위를 넘는 값마다 object를 만들 수 있다. 누적 변수는 `int`나 `long`으로 두고, 실제 병목은 측정한 뒤 primitive 특화 API를 검토한다.
- 래퍼를 nullable 상태로 쓸 때는 값 부재가 업무 의미인지, `OptionalInt`나 별도 결과 타입이 더 명확한지 검토한다.

강의의 특정 반복 횟수와 배수로 측정한 primitive와 wrapper 성능 차이는 그 환경의 실험 결과다. JVM 최적화, 하드웨어와 코드 모양에 따라 달라지므로 일반 법칙으로 고정하지 않는다.

### ==는 피연산자 타입에 따라 다르게 동작한다

| 식 | 동작 |
|---|---|
| `Integer == int` | 래퍼를 unboxing해 숫자로 비교한다(JLS 15.21.1). 래퍼가 null이면 NPE다 |
| `Integer == Integer` | 같은 object인지 비교한다(JLS 15.21.3). 값이 같아도 다른 object면 false다 |
| `a.equals(b)` | 같은 래퍼 타입이면서 값이 같은지 비교한다. `Long.valueOf(1).equals(1)`은 1이 `Integer`로 boxing되므로 false다 |

`Integer x = 128; Integer y = x; x *= 1;` 뒤에는 기본 설정에서 `x == y`가 false이고 `x.equals(y)`는 true다. `x *= 1`도 unboxing한 뒤 `valueOf`로 새 object를 받기 때문이다. 128 대신 100을 쓰면 `valueOf`가 캐시된 object를 돌려줘 `x == y`가 true가 된다. 같은 코드의 결과가 값의 범위로 갈리므로 래퍼끼리 값을 비교할 때는 `equals`나 `Objects.equals`를 쓴다.

## 래퍼 캐시의 범위와 계약

`valueOf`는 자주 쓰는 값의 object를 미리 만들어 재사용한다. autoboxing도 javac가 `valueOf`를 호출하므로 같은 캐시를 거친다.

| 래퍼 | Java SE 26 API가 약속하는 캐시 | OpenJDK 26 구현 |
|---|---|---|
| `Boolean` | `Boolean.TRUE`, `Boolean.FALSE` 반환 | 같음 |
| `Byte` | 모든 값 | 같음 |
| `Short`, `Integer`, `Long` | -128~127은 항상 캐시하고 범위 밖은 캐시할 수도 있음 | -128~127, `Integer`만 상한을 넓힐 수 있음 |
| `Character` | `\u0000`~`\u007F`(0~127)은 항상 캐시 | 같음 |
| `Float`, `Double` | 보장 범위 없음 | 매번 새 object |

- JLS 5.1.7은 boolean, `\u0000`~`\u007f`의 char, -128~127의 정수를 상수식에서 boxing한 결과가 `==`로 같다고 보장하고, 그 밖의 값은 identity를 가정하지 말라고 정한다.
- 캐시는 `valueOf` 경로에만 적용된다. 생성자로 만든 object는 범위 안의 값이어도 캐시 object와 `==`로 다르다.
- HotSpot은 `-XX:AutoBoxCacheMax=<size>`로 `Integer` 캐시 상한을 넓힐 수 있다. java launcher 문서에 없는 옵션이 `java.lang.Integer.IntegerCache.high` 속성으로 전달되는 구현 세부사항이며(OpenJDK `IntegerCache` 주석), 상한을 127보다 낮출 수 없고 하한 -128은 고정이다. 실행 옵션 하나로 `==` 결과가 바뀐다는 점도 `==`를 값 비교에 쓰면 안 되는 이유다.
- 래퍼는 value-based class다. `equals`로 같은 instance는 서로 바꿔 쓸 수 있는 것으로 다루고 `==`, identity hash, `synchronized` 같은 identity 의존 연산을 피한다. javac는 value-based class instance에 대한 `synchronized`를 기본으로 켜진 `synchronization` lint로 경고한다(JEP 390).
- String에서 Integer로의 parsing은 boxing이 아니며 `parseInt`나 `valueOf(String)`을 명시적으로 쓴다.

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
- 래퍼를 써야 하는 세 경우와 그 밖에는 primitive를 기본으로 두는 이유
- null wrapper를 unboxing할 때 생기는 문제
- `Integer == int`와 `Integer == Integer`의 차이, `a++`가 기존 object를 바꾸지 않고 다른 object를 대입하는 이유
- 캐시되는 래퍼와 범위, wrapper 캐시를 `==` 비교 근거로 쓰면 안 되는 이유
- `Class` 객체와 reflection의 역할 및 실패 경계
- `currentTimeMillis`와 `nanoTime`의 목적 차이
- 일반 난수와 보안 난수의 선택 기준

## 출처

- [JLS 4.5.1, Type Arguments of Parameterized Types](https://docs.oracle.com/javase/specs/jls/se26/html/jls-4.html#jls-4.5.1)
- [JLS 5, Conversions and Contexts](https://docs.oracle.com/javase/specs/jls/se26/html/jls-5.html)
- [JLS 15.21, Equality Operators](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.21)
- [Integer, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Integer.html)
- [Long, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Long.html)
- [Short, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Short.html)
- [Byte, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Byte.html)
- [Character, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Character.html)
- [Boolean, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Boolean.html)
- [Double, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Double.html)
- [Value-based Classes, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/doc-files/ValueBased.html)
- [JEP 390, Warnings for Value-Based Classes](https://openjdk.org/jeps/390)
- [JDK-8354335, No longer deprecate wrapper class constructors for removal — OpenJDK](https://bugs.openjdk.org/browse/JDK-8354335)
- [Integer.java IntegerCache — OpenJDK jdk-26-ga](https://github.com/openjdk/jdk/blob/jdk-26-ga/src/java.base/share/classes/java/lang/Integer.java)
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
- 쉬운코드, [기본형 타입과 참조형 타입의 결정적 차이](https://www.youtube.com/watch?v=s4biIuIZQWg)
- 쉬운코드, [래퍼 클래스는 언제 써야 할까](https://www.youtube.com/watch?v=9IZ42_YBQJ0)
- 쉬운코드, [오토박싱과 언박싱](https://www.youtube.com/watch?v=iMeryQgAf-M)
- 쉬운코드, [Integer caching](https://www.youtube.com/watch?v=niA2j_6CFIY)
- 쉬운코드, [래퍼 클래스 캐싱](https://www.youtube.com/watch?v=im17AoV0zOc)

## 관련 문서

- [[Java-Standard-Library-Immutability-and-String|Java 불변 객체와 String]]
- [[Java-Standard-Library-Date-and-Time|Java 날짜와 시간]]
- [[JVM-GC|JVM GC]]
- [[Security|보안]]
