---
tags: [java, exception, record, first-class-collection, data-class]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Stack ArrayDeque", "Stack 대신 ArrayDeque"]
---

# Stack, ArrayDeque

Java의 `java.util.Stack`은 **레거시 취급**. 대신 `Deque` 인터페이스의 `ArrayDeque`를 쓴다.

## `Stack`의 문제

- `Vector`를 상속 — **인덱스 기반 접근**이 가능해 LIFO 규약 위반 가능
- 모든 메서드가 `synchronized` — 단일 스레드에서 불필요한 오버헤드
- API가 낡음 (`empty()`, `peek()`, `pop()`, `push()` — Deque의 현대적 네이밍과 불일치)

## `Deque`, `ArrayDeque`가 나은 이유

| 항목 | Stack | ArrayDeque |
|---|---|---|
| 기반 | Vector 상속 | 원형 배열 |
| 동기화 | 항상 synchronized | 없음 (필요 시 `Collections.synchronizedDeque`) |
| LIFO 규약 | 인덱스 접근으로 깰 수 있음 | 엄격 |
| 성능 | 느림 | 배열 기반이라 빠름 |

## 사용법

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);
stack.push(2);
int top = stack.pop();   // 2
int peek = stack.peek(); // 1
```

`Queue`로도 쓰려면 `offer`, `poll`, `peek`. **하나의 `ArrayDeque`**가 Stack, Queue 양쪽 역할을 수행.

## 면접 체크포인트

- **`Stack` 대신 `ArrayDeque`** 를 쓰는 이유 (Vector 상속, 불필요한 synchronized)
