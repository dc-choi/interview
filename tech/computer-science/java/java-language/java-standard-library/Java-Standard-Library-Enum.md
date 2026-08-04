---
tags: [java, enum, type-safety, value-object, refactoring]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Enum", "Java 열거형"]
---

# Java 열거형

`enum`은 허용된 값의 집합을 별도 타입으로 표현한다. 문자열이나 정수 상수보다 잘못된 값의 유입을 컴파일 단계에서 줄이고, 각 값에 상태와 행동을 결합할 수 있다.

## 문자열과 상수의 한계

```java
double discount(String grade, int price) {
    if (grade.equals("BASIC")) return price * 0.10;
    if (grade.equals("GOLD")) return price * 0.20;
    return 0;
}
```

문자열은 오타와 허용하지 않은 값도 같은 타입으로 전달할 수 있다. `static final String` 상수는 이름의 재사용을 돕지만 메서드가 다른 문자열을 받는 것을 막지는 못한다. enum은 값 집합을 타입 경계로 만든다.

```java
enum Grade {
    BASIC(10), GOLD(20), DIAMOND(30);

    private final int discountPercent;

    Grade(int discountPercent) {
        this.discountPercent = discountPercent;
    }

    int discountAmount(int price) {
        return Math.multiplyExact(price, discountPercent) / 100;
    }
}
```

## enum의 언어 규칙

- 각 enum 상수는 enum 클래스의 이름 붙은 인스턴스다.
- enum 클래스는 직접 `java.lang.Enum`을 확장하므로 다른 클래스를 `extends`할 수 없지만 interface는 구현할 수 있다.
- 생성자는 외부에서 호출할 수 없고 상수 선언 과정에서만 인스턴스가 만들어진다.
- 상수별 class body가 없으면 enum은 암시적으로 `final`이다. 상수별 class body가 있으면 허용된 하위 클래스만 있는 형태로 암시적으로 `sealed`다.
- enum 상수는 클래스 로더 경계 안에서 고유하므로 `==` 비교가 허용되고 `Enum.equals`도 동일성 비교를 사용한다.

## 주요 메서드

| API | 의미 | 주의점 |
|---|---|---|
| `name()` | 선언된 정확한 상수 이름 | 외부 표시 문구로 쓰기보다 별도 필드를 둔다 |
| `ordinal()` | 선언 순서, 첫 값은 0 | 저장소나 protocol의 영속 식별자로 쓰지 않는다 |
| `values()` | 선언 순서의 모든 상수 | 호출할 때마다 새 배열을 반환한다 |
| `valueOf(String)` | 정확한 상수 이름을 조회 | 없으면 `IllegalArgumentException`, null이면 `NullPointerException` |
| `compareTo` | 선언 순서를 비교 | 업무 우선순위가 선언 순서와 같은지 명시한다 |

`ordinal()`을 DB 코드로 저장하면 중간 상수 추가나 순서 변경으로 기존 데이터의 의미가 바뀐다. 외부 계약에는 변경 정책이 있는 명시적 코드 필드를 둔다.

```java
enum HttpStatus {
    OK(200), NOT_FOUND(404);

    private final int code;

    HttpStatus(int code) {
        this.code = code;
    }

    static Optional<HttpStatus> findByCode(int code) {
        return Arrays.stream(values())
            .filter(status -> status.code == code)
            .findFirst();
    }
}
```

lookup이 자주 실행되고 상수가 많다면 코드에서 enum으로 가는 불변 `Map`을 한 번 구성할 수 있다. 중복 코드 검증도 초기화 시점에 수행한다.

## 데이터와 행동을 함께 둔다

호출자가 enum 종류를 검사해 `if`나 `switch`로 같은 분기를 반복하면 새 상수를 추가할 때 수정 지점이 퍼진다. 할인율이나 계산처럼 값마다 달라지는 행동을 enum에 둘 수 있다.

상수마다 알고리즘이 완전히 다르면 추상 메서드와 상수별 class body를 사용할 수 있다. 다만 복잡한 외부 의존성과 업무 흐름까지 enum에 넣으면 테스트와 의존성 주입이 어려워진다. 값 자체의 안정적인 규칙은 enum에, orchestration은 service에 둔다.

## 경계에서 문자열을 enum으로 바꾼다

HTTP, JSON과 DB에서는 문자열이나 숫자가 들어온다. 내부 모델까지 문자열을 퍼뜨리지 말고 입력 경계에서 검증해 enum으로 변환한다.

- `valueOf`는 대소문자와 정확한 이름을 요구하므로 사용자 입력용 오류로 그대로 노출하지 않는다.
- 공개 API 값은 enum 상수 이름 변경과 결합하지 않도록 별도 wire value와 변환기를 둘 수 있다.
- 알 수 없는 미래 값에 대한 호환 정책을 정한다. 거부, 기본값, 별도 UNKNOWN 중 도메인에 맞게 고른다.
- enum 전용 집합과 맵에는 `EnumSet`, `EnumMap`이 타입과 의도를 잘 드러낸다.

## 면접 체크포인트

- 문자열 상수를 enum으로 바꿀 때 얻는 타입 안전성
- enum이 다른 클래스를 상속할 수 없는 이유
- enum 비교에 `==`를 사용할 수 있는 이유
- `ordinal`을 영속 코드로 쓰면 안 되는 이유
- 값과 행동을 enum에 둘 범위
- 외부 문자열을 enum으로 바꾸는 경계 설계

## 출처

- [JLS 8.9, Enum Classes](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html#jls-8.9)
- [Enum, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Enum.html)
- [EnumSet, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/EnumSet.html)
- [EnumMap, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/EnumMap.html)
- 김영한 강사, [문자열과 타입 안전성1](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212232)
- 김영한 강사, [문자열과 타입 안전성2](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212233)
- 김영한 강사, [타입 안전 열거형 패턴](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212234)
- 김영한 강사, [열거형 - Enum Type](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212235)
- 김영한 강사, [열거형 - 주요 메서드](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212236)
- 김영한 강사, [열거형 - 리팩토링1](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212237)
- 김영한 강사, [열거형 - 리팩토링2](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212238)
- 김영한 강사, [열거형 - 리팩토링3](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212239)
- 김영한 강사, [열거형 문제와 풀이1](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212240)
- 김영한 강사, [열거형 문제와 풀이2](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212241)
- 김영한 강사, [열거형 정리](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212242)

## 관련 문서

- [[Java-Standard-Library-Object-and-Equality|Java Object와 동등성]]
- [[Java-Standard-Library-Immutability-and-String|Java 불변 객체와 String]]
- [[Java-Language-OOP-Design-and-OCP|Java 객체 협력과 OCP]]
