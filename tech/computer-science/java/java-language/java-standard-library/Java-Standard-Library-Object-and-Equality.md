---
tags: [java, object, equality, equals, hashcode, tostring, polymorphism]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Object and Equality", "Java Object와 동등성"]
---

# Java Object와 동등성

`Object`는 Java 클래스 계층의 루트다. 모든 클래스는 직접 또는 간접적으로 `Object`를 상위 클래스로 가지며, 배열을 포함한 모든 객체는 `Object`의 메서드를 사용할 수 있다. 인터페이스 자체가 `Object`를 상속한다고 설명하면 안 된다.

## Object가 제공하는 공통 계약

| 메서드 | 역할 | 설계할 때 확인할 점 |
|---|---|---|
| `getClass()` | 런타임 클래스를 반환 | 선언 타입이 아니라 실제 객체 타입을 본다 |
| `equals(Object)` | 논리적 동등성을 판단 | 기본 구현은 동일 객체인지 판단한다 |
| `hashCode()` | 해시 기반 자료구조에 쓸 값을 반환 | `equals`가 같은 객체는 같은 해시 코드를 반환해야 한다 |
| `toString()` | 사람이 읽을 문자열 표현을 반환 | 로그 형식이나 직렬화 형식으로 고정해 의존하지 않는다 |
| `wait`, `notify`, `notifyAll` | 객체 모니터에서 스레드를 조정 | 모니터를 소유한 상태에서 조건 반복 검사와 함께 사용한다 |

`clone()`은 기본적으로 얕은 복사이며 `Cloneable` 규약도 다루기 까다롭다. 값 객체에는 생성자, 정적 팩터리, 명시적인 복사 메서드처럼 의도가 드러나는 방식을 우선 검토한다. `finalize()`는 제거 예정이므로 자원 정리에 사용하지 않는다.

## Object 다형성과 OCP

`Object` 매개변수나 배열은 서로 다른 클래스 인스턴스를 한 타입으로 받을 수 있다. 하지만 `Object`에는 각 클래스의 고유 행동이 없으므로 다운캐스팅 없이는 그 행동을 호출할 수 없다.

```java
static String describe(Object value) {
    return String.valueOf(value);
}
```

이 예제가 확장에 열려 있는 이유는 새 타입을 추가할 때 `describe`를 고칠 필요 없이 각 타입이 `toString()` 계약을 구현할 수 있기 때문이다. 반대로 `instanceof` 분기를 계속 추가해 타입별 행동을 직접 선택하면 확장 지점이 호출자에게 새어나온다. 공통 행동이 중요하다면 `Object`보다 목적이 분명한 인터페이스를 설계한다.

## toString은 주소 출력이 아니다

`Object.toString()`의 기본 형식은 클래스 이름, `@`, `hashCode()`의 부호 없는 16진수 표현이다.

```text
com.example.Member@4e25154f
```

이 값은 메모리 주소가 아니다. 클래스가 `hashCode()`를 재정의하면 뒤쪽 값도 그 결과를 사용한다. 사람이 읽기 쉬운 진단 정보에는 `toString()`을 재정의하되 비밀번호, 토큰과 개인정보는 포함하지 않는다. 형식은 JVM 실행이나 버전 사이에 안정적이라고 보장되지 않으므로 API 응답이나 영속화 포맷으로 쓰지 않는다.

## 동일성과 동등성

- `a == b`는 두 참조가 같은 객체를 가리키는지 검사한다. 물리 주소 숫자를 직접 비교하는 연산이라고 단정하지 않는다.
- `a.equals(b)`는 클래스가 정의한 논리적 동등성을 검사한다.
- `Object.equals` 기본 구현은 `==`와 같은 동일성 기준이다.
- `Objects.equals(a, b)`는 `null`을 포함한 비교를 간결하게 처리한다.

값 객체의 `equals`는 다음 계약을 지켜야 한다.

1. 반사성: `x.equals(x)`는 참이다.
2. 대칭성: `x.equals(y)`와 `y.equals(x)`의 결과가 같다.
3. 추이성: `x`와 `y`, `y`와 `z`가 같으면 `x`와 `z`도 같다.
4. 일관성: 비교에 쓰는 정보가 바뀌지 않으면 결과가 일관된다.
5. null 규칙: null이 아닌 `x`에 대해 `x.equals(null)`은 거짓이다.

## equals와 hashCode를 함께 설계한다

```java
final class MemberId {
    private final long value;

    MemberId(long value) {
        this.value = value;
    }

    @Override
    public boolean equals(Object other) {
        return this == other
            || other instanceof MemberId id && value == id.value;
    }

    @Override
    public int hashCode() {
        return Long.hashCode(value);
    }
}
```

- `equals`를 재정의하면 같은 객체들이 같은 해시 코드를 내도록 `hashCode`도 재정의한다.
- 서로 다른 객체가 같은 해시 코드를 내는 충돌은 허용된다. 해시 코드가 유일 식별자는 아니다.
- 상속 가능한 클래스에서 새 필드를 동등성에 추가하면 대칭성과 추이성이 깨지기 쉽다. 값 타입은 불변으로 만들고 상속을 제한하는 방안을 검토한다.
- 해시 기반 컬렉션의 키가 된 뒤 비교 필드를 바꾸면 원소를 찾지 못할 수 있다.
- 배열의 `equals`는 원소 비교가 아니라 배열 객체의 동일성을 사용한다. 원소 비교에는 `Arrays.equals`나 다차원 배열용 `Arrays.deepEquals`를 선택한다.

## 실전 판단

- 엔티티는 식별자 기준, 값 객체는 의미를 구성하는 값 기준처럼 도메인에서 동등성의 뜻을 먼저 정한다.
- `toString`, `equals`, `hashCode`를 IDE가 생성해도 포함 필드와 변경 가능성을 검토한다.
- `getClass()` 비교는 정확히 같은 런타임 클래스만 허용하고, `instanceof`는 하위 타입도 허용한다. 상속 정책과 동등성 계약을 함께 결정한다.
- 객체 배열은 다양한 타입을 담을 수 있지만, 업무 행동을 호출하려면 역할 인터페이스가 더 명확하다.

## 면접 체크포인트

- 모든 Java 타입이 아니라 모든 클래스가 `Object`를 상위 클래스로 가진다는 차이
- 기본 `toString()`의 뒷부분이 메모리 주소가 아닌 이유
- 동일성과 동등성의 차이
- `equals`를 재정의할 때 `hashCode`도 재정의하는 이유
- `Object` 다형성과 역할 인터페이스의 선택 기준

## 출처

- [Object, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Object.html)
- [Objects, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Objects.html)
- [Arrays, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Arrays.html)
- [JLS 4, Types, Values, and Variables](https://docs.oracle.com/javase/specs/jls/se26/html/jls-4.html)
- 김영한 강사, [프로젝트 환경 구성](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212188)
- 김영한 강사, [java.lang 패키지 소개](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212189)
- 김영한 강사, [Object 클래스](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212190)
- 김영한 강사, [Object 다형성](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212191)
- 김영한 강사, [Object 배열](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212192)
- 김영한 강사, [toString()](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212193)
- 김영한 강사, [Object와 OCP](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212194)
- 김영한 강사, [equals() - 1. 동일성과 동등성](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212195)
- 김영한 강사, [equals() - 2. 구현](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212196)
- 김영한 강사, [Object 문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212197)
- 김영한 강사, [Object 정리](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212198)

## 관련 문서

- [[Java-Language-Object-Model|Java 객체 모델]]
- [[Java-Language-References-and-Initialization|Java 참조와 초기화]]
- [[Java-Standard-Library-Immutability-and-String|Java 불변 객체와 String]]
- [[Java-Language-OOP-Design-and-OCP|Java 객체 협력과 OCP]]
