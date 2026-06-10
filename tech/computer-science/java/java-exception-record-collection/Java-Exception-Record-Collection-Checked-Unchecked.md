---
tags: [java, exception, record, first-class-collection, data-class]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Checked vs Unchecked Exception", "Java 예외 계층"]
---

# Checked vs Unchecked Exception

## 계층

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

## 차이

| 항목 | Checked | Unchecked (RuntimeException) |
|---|---|---|
| 컴파일러 검사 | **강제** (try-catch or throws) | 강제 안 함 |
| 용도 | 복구 가능한 **외부 환경** (I/O, 네트워크, DB) | 프로그래머 오류, 호출 계약 위반 |
| 전파 | 모든 계층이 throws 명시 필요 | 자동 전파 |
| 스프링 관례 | 최소 사용, **unchecked로 래핑** | 권장 |

## Error

- JVM 수준 문제 (메모리 부족, StackOverflow, LinkageError)
- **애플리케이션이 잡아서는 안 됨** — 복구 불가능, JVM 종료가 정답
- `catch (Throwable)`는 Error까지 잡으므로 지양

## Spring, 현대 Java의 관례

**Checked Exception보다 Unchecked를 권장**한다.

- Checked는 호출 스택 전체에 throws 전염 → 추상화 경계에서 **인터페이스 오염**
- 재시도, 복구 로직은 `@Retry`, `CompletableFuture`, `try-with-resources` 등으로 더 깔끔히
- Spring의 `DataAccessException`, `RestClientException`은 모두 Unchecked 계열로 설계됨
- **경계에서 Checked를 Unchecked로 래핑**하는 것이 일반 패턴

```java
try {
    doIO();
} catch (IOException e) {
    throw new MyDomainException("I/O failure", e);
}
```

## 면접 체크포인트

- **Checked vs Unchecked** 차이와 현대 Java, Spring이 Unchecked를 선호하는 이유
- **Error는 catch하면 안 되는 이유**
