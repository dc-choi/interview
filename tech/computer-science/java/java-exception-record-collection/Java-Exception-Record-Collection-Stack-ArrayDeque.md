---
tags: [java, exception, record, first-class-collection, data-class]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Stack ArrayDeque", "Stack 대신 ArrayDeque"]
---

# Stack, ArrayDeque

Java SE API는 LIFO stack이 필요할 때 legacy `Stack`보다 `Deque` 구현을 우선 사용하라고 안내한다. 일반적인 단일 스레드 stack과 queue에는 `ArrayDeque`가 한 선택지다.

## Stack을 기본 선택으로 삼지 않는 이유

- `Stack`은 `Vector`를 상속해 LIFO 연산 외의 인덱스 기반 연산까지 노출한다.
- `Vector`의 동기화 정책도 함께 상속한다. 이 정책이 application의 복합 연산 전체를 자동으로 thread-safe하게 만들지는 않는다.
- `Deque`는 stack과 양끝 queue의 의도를 직접 표현하는 API를 제공한다.

## Deque와 ArrayDeque의 정확한 범위

| 항목 | `Stack` | `ArrayDeque` |
|---|---|---|
| 타입 관계 | `Vector`의 하위 클래스 | `Deque` 구현 |
| stack API | `push`, `pop`, `peek` | `push`, `pop`, `peek` |
| 양끝 queue API | 제공하지 않음 | `offerFirst`, `offerLast`, `pollFirst`, `pollLast` |
| `null` 원소 | 허용 | 허용하지 않음 |
| thread safety | 상속한 개별 연산 동기화 | thread-safe하지 않음 |

`Deque`는 양끝을 모두 조작할 수 있으므로 타입 자체가 엄격한 LIFO 규칙을 강제하지 않는다. stack으로 사용할 때는 한 API 계열만 쓰도록 팀 규약이나 wrapper로 경계를 만든다. `ArrayDeque`의 내부 배열 배치와 확장 배수 같은 구현 세부사항은 공개 API 계약으로 가정하지 않는다.

## 사용법

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);
stack.push(2);
int top = stack.pop();   // 2
int next = stack.peek(); // 1

Deque<Integer> queue = new ArrayDeque<>();
queue.offerLast(1);
queue.offerLast(2);
int first = queue.pollFirst(); // 1
```

공유 mutable deque가 필요하면 외부 동기화 정책이나 `java.util.concurrent`의 목적에 맞는 구현을 검토한다. Java 표준 `Collections`에는 `synchronizedDeque` 팩터리가 없다.

## 면접 체크포인트

- `Stack`보다 `Deque` 구현을 권장하는 API 설계상의 이유
- `Deque`가 stack으로 쓰일 수 있어도 엄격한 LIFO 타입은 아닌 이유
- `ArrayDeque`가 thread-safe하지 않다는 말과 `Stack`의 동기화가 복합 연산 안전성을 보장하지 않는다는 말의 차이
- queue로 쓸 때 삽입과 제거 방향을 일관되게 정하는 방법

## Java SE 26 근거

- [Deque](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Deque.html)
- [ArrayDeque](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/ArrayDeque.html)
- [Stack](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Stack.html)
- [Vector](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Vector.html)

## 관련 문서

- [[Java-Generics-and-Collections-Map-Stack-Queue|Map, Stack, Queue와 Deque]]
- [[Java-Exception-Record-Collection|Java 예외, Record, 1급 컬렉션]]
