---
tags: [cs, java, interview, equals, hashcode, string, synchronized, serialization]
status: done
verified_at: 2026-09-03
category: "CS&프로그래밍(CS&Programming)"
---

# Java 백엔드 면접 기초 — 값, 불변성, 타입 설계와 호출 전달

## 10. 박싱 / 언박싱

- `int`↔`Integer` 자동 변환. 컬렉션, 제네릭은 박싱 필수
- Java 언어 명세는 -128부터 127까지의 상수 boxing에만 동일 참조를 보장한다. 범위 밖의 `==` 결과는 구현과 설정에 따라 달라질 수 있으므로 값 비교는 `equals`를 사용한다
- 루프에서의 숨은 할당은 GC 부담 → 성능 민감 코드는 `int[]`, `IntStream`

## 11. Mutable vs Immutable

- **Immutable**(`String`, `LocalDateTime`, `BigDecimal`): Thread-safe 기본, 값 객체, DTO, VO 권장. `record`는 component field의 재할당만 막는 shallow immutability라서 참조한 mutable 객체는 바뀔 수 있다
- **Mutable**(`ArrayList`, `HashMap`, 일반 POJO): 공유 시 동기화 필요
- 설계 원칙: 기본은 Immutable, 필요할 때만 Mutable

## 12. Abstract Class vs Interface

| 축 | Abstract Class | Interface |
|---|---|---|
| 상속 | **단일 상속** | **다중 구현** |
| 상태(필드) | 가질 수 있음 | `static final`만 |
| 생성자 | 있음(하지만 직접 인스턴스화 불가) | 없음 |
| 메서드 | 구현 있음/없음 혼용 | Java 8+ `default`, `static` 허용 |
| 용도 | **공통 구현 공유**(is-a 관계) | **계약 정의**(can-do 역할) |

현대 Java에서는 `default` 메서드로 경계가 흐려졌지만, **"역할(interface) + 기본 구현(abstract class)"** 조합이 여전히 유효.

## 13. Call by Value, Java의 함정

Java는 **모든 인자를 value로 전달**한다. 단, 객체 인자의 value는 **참조의 복사본** — 이 차이가 오해를 낳는다.

```java
void rename(User u) { u.setName("New"); }    // 원본 영향 O (참조로 같은 객체 수정)
void replace(User u) { u = new User("X"); }  // 원본 영향 X (복사본만 재할당)
```

- **참조의 복사**라 내부 상태 변경은 원본에 반영됨
- 참조 자체를 바꿔도(`u = new User(...)`) 호출자의 참조는 그대로
- "Java는 Call by Reference가 아니다" — 이 미묘함을 묻는 질문이 단골
- C++의 `&` 참조, C의 포인터 역참조와 달리, Java에는 **참조의 재할당을 바깥에 전파할 수단이 없음**

## 면접 체크포인트

- `equals()`, `hashCode()` 계약과 HashMap 성능의 관계
- `StringBuilder` vs `StringBuffer`의 실무 선택 기준
- `synchronized` vs `volatile`의 역할 구분(가시성 vs 원자성)
- `ArrayList`, `HashMap` 내부 구조(리사이즈, 트리화)
- Thread-per-Request의 한계와 Loom, WebFlux 대안
- `Serializable`의 역직렬화 공격 리스크와 JSON 선호 이유
- 실무에서 `System.out.println` 대신 로거를 쓰는 이유

## 출처

- [Java Language Specification 5.1.7, Boxing Conversion](https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html#jls-5.1.7)
- [Java Language Specification 8.10, Record Classes](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html#jls-8.10)

## 관련 문서

- [[Java-Backend-Fundamentals|Java 백엔드 면접 기초]]
- [[Java-Backend-Fundamentals-Object-Concurrency|객체 계약, 문자열, 동시성과 컬렉션]]
- [[Java-Backend-Fundamentals-IO-Serialization-Runtime|I/O, 직렬화, JVM과 로깅]]
