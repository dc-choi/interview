---
tags: [java, exception, record, first-class-collection, data-class]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Exception Record Collection", "Checked Unchecked", "Java Record", "1급 컬렉션"]
---

# Java 추가 개념 — Checked/Unchecked · Record · 1급 컬렉션 · Stack

Java 백엔드 면접의 **타입 안전성·예외 설계·자료구조 선택** 주제들을 한데 모은 요약. 일반 백엔드 기초는 [[Java-Backend-Fundamentals]] 참조.

## Checked vs Unchecked Exception

### 계층

```
Throwable
├── Error          (OutOfMemoryError, StackOverflowError 등 — 복구 불가)
└── Exception
    ├── (Checked)              ← try-catch 또는 throws 강제
    │   ├── IOException
    │   ├── SQLException
    │   └── ...
    └── RuntimeException       ← 컴파일러 강제 없음
        ├── NullPointerException
        ├── IllegalArgumentException
        └── ...
```

### 차이

| 항목 | Checked | Unchecked (RuntimeException) |
|---|---|---|
| 컴파일러 검사 | **강제** (try-catch or throws) | 강제 안 함 |
| 용도 | 복구 가능한 **외부 환경** (I/O·네트워크·DB) | 프로그래머 오류·호출 계약 위반 |
| 전파 | 모든 계층이 throws 명시 필요 | 자동 전파 |
| 스프링 관례 | 최소 사용, **unchecked로 래핑** | 권장 |

### Error

- JVM 수준 문제 (메모리 부족·StackOverflow·LinkageError)
- **애플리케이션이 잡아서는 안 됨** — 복구 불가능, JVM 종료가 정답
- `catch (Throwable)`는 Error까지 잡으므로 지양

### Spring·현대 Java의 관례

**Checked Exception보다 Unchecked를 권장**한다.

- Checked는 호출 스택 전체에 throws 전염 → 추상화 경계에서 **인터페이스 오염**
- 재시도·복구 로직은 `@Retry`·`CompletableFuture`·`try-with-resources` 등으로 더 깔끔히
- Spring의 `DataAccessException`·`RestClientException`은 모두 Unchecked 계열로 설계됨
- **경계에서 Checked를 Unchecked로 래핑**하는 것이 일반 패턴

```java
try {
    doIO();
} catch (IOException e) {
    throw new MyDomainException("I/O failure", e);
}
```

## Java Record

**Java 16+의 불변 데이터 타입**. 선언 한 줄로 final 필드·생성자·`equals`·`hashCode`·`toString`·접근자를 자동 생성.

```java
record UserDto(Long id, String name, String email) {}
```

### 자동 생성되는 것

- **`private final` 필드**로 각 컴포넌트
- Canonical constructor (모든 필드를 받는 생성자)
- Accessor: `id()`·`name()`·`email()` (getter 규약 없음, 컴포넌트명 그대로)
- `equals`·`hashCode`·`toString`: 값 비교·문자열 표현

### 제약

- **상속 불가** — `final` 클래스로 만들어짐. interface는 구현 가능
- **인스턴스 필드 추가 불가** — 선언된 컴포넌트 외에는 추가 못 함 (static 필드는 가능)
- Mutable 필드·Setter 없음 (설계 의도)

### 커스터마이징

```java
record Money(BigDecimal amount, Currency currency) {
    // Compact Constructor로 유효성 검증
    Money {
        if (amount.signum() < 0) throw new IllegalArgumentException();
    }
    // 파생 메서드 추가 가능
    Money plus(Money other) { ... }
}
```

### Record vs DTO vs VO

| 축 | Record | 전통적 DTO | VO |
|---|---|---|---|
| 변경 가능성 | 불변 | Mutable 흔함 | 불변 |
| 비즈니스 로직 | 간단한 파생만 | 보통 없음 | 도메인 규칙 가질 수 있음 |
| 상속 | 불가 | 가능 | 가능 |
| 자동 생성 | equals·hashCode·toString | Lombok 필요 | 수동 혹은 Lombok |

**DTO로 쓰는 건 자연스럽지만, VO로도 쓸 수 있다.** 중요 결정: 상속이 필요하면 Record는 답이 아님.

### Lombok과의 관계

- `@Value` (Lombok)와 유사: 불변·equals·hashCode·toString 자동
- Record는 **언어 레벨 지원**이라 Lombok 설정·IDE 플러그인 없이 동작
- 새 코드는 Record 우선, Lombok은 Mutable이 필요하거나 상속 계층에서 사용

## 1급 컬렉션 (First-Class Collection)

**`List<Order>`처럼 컬렉션을 필드로 가지는 클래스**를 만들고, 그 안에 관련 로직을 모으는 패턴.

### 나쁜 예

```java
class OrderService {
    int totalAmount(List<Order> orders) {
        return orders.stream().mapToInt(Order::amount).sum();
    }
    boolean hasPremium(List<Order> orders) {
        return orders.stream().anyMatch(Order::isPremium);
    }
}
```

컬렉션 처리 로직이 서비스에 흩어지고, 어디서든 `List<Order>`를 자유롭게 만들 수 있어 **규칙을 강제하지 못함**.

### 좋은 예 — 1급 컬렉션

```java
class Orders {
    private final List<Order> orders;

    public Orders(List<Order> orders) {
        validate(orders);                          // 생성 시 규칙 강제
        this.orders = List.copyOf(orders);         // 불변 복사
    }

    public int totalAmount() {
        return orders.stream().mapToInt(Order::amount).sum();
    }
    public boolean hasPremium() {
        return orders.stream().anyMatch(Order::isPremium);
    }
    public Orders filterPaid() {
        return new Orders(orders.stream().filter(Order::isPaid).toList());
    }

    private void validate(List<Order> orders) {
        if (orders.size() > 100) throw new IllegalArgumentException("최대 100건");
    }
}
```

### 이점

- **불변성 보장**: 생성자에서 `List.copyOf`·`Collections.unmodifiableList`로 래핑
- **도메인 규칙 캡슐화**: 컬렉션 조작 규칙이 한 곳에 모임
- **의미 있는 이름**: `Orders.filterPaid()` vs `orders.stream().filter(Order::isPaid).toList()` — 의도가 드러남
- **API 제어**: 컬렉션의 모든 메서드(`add`·`remove` 등)를 노출하지 않음

### 주의

- **모든 `List<T>`를 1급 컬렉션으로 감쌀 필요 없음** — 도메인 규칙이 있거나 재사용되는 처리가 있을 때만
- 너무 많이 만들면 **미들맨 패턴**으로 퇴보. 단순 전달만 하는 클래스는 가치 없음

## Stack · ArrayDeque

Java의 `java.util.Stack`은 **레거시 취급**. 대신 `Deque` 인터페이스의 `ArrayDeque`를 쓴다.

### `Stack`의 문제

- `Vector`를 상속 — **인덱스 기반 접근**이 가능해 LIFO 규약 위반 가능
- 모든 메서드가 `synchronized` — 단일 스레드에서 불필요한 오버헤드
- API가 낡음 (`empty()`·`peek()`·`pop()`·`push()` — Deque의 현대적 네이밍과 불일치)

### `Deque`·`ArrayDeque`가 나은 이유

| 항목 | Stack | ArrayDeque |
|---|---|---|
| 기반 | Vector 상속 | 원형 배열 |
| 동기화 | 항상 synchronized | 없음 (필요 시 `Collections.synchronizedDeque`) |
| LIFO 규약 | 인덱스 접근으로 깰 수 있음 | 엄격 |
| 성능 | 느림 | 배열 기반이라 빠름 |

### 사용법

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);
stack.push(2);
int top = stack.pop();   // 2
int peek = stack.peek(); // 1
```

`Queue`로도 쓰려면 `offer`·`poll`·`peek`. **하나의 `ArrayDeque`**가 Stack·Queue 양쪽 역할을 수행.

## 면접 체크포인트

- **Checked vs Unchecked** 차이와 현대 Java·Spring이 Unchecked를 선호하는 이유
- **Error는 catch하면 안 되는 이유**
- **Record**가 제공하는 자동 생성물과 상속 제약
- Record를 DTO·VO 어느 쪽으로도 쓸 수 있는지 판단 기준
- **1급 컬렉션**이 주는 불변성·캡슐화·도메인 규칙 강제
- **`Stack` 대신 `ArrayDeque`** 를 쓰는 이유 (Vector 상속·불필요한 synchronized)

## 출처
- [매일메일 — Checked vs Unchecked Exception](https://www.maeil-mail.kr/question/50)
- [매일메일 — 1급 컬렉션](https://www.maeil-mail.kr/question/53)
- [매일메일 — Java Stack](https://www.maeil-mail.kr/question/104)
- [매일메일 — Java Record](https://www.maeil-mail.kr/question/107)

## 관련 문서
- [[Java-Backend-Fundamentals|Java 백엔드 면접 기초]]
- [[Defensive-Copy|방어적 복사]]
- [[Cohesion-Coupling|응집도·결합도]]
- [[Spring-Exception-Handling|Spring 예외 처리]]
