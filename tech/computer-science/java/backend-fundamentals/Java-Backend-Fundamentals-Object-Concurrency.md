---
tags: [cs, java, interview, equals, hashcode, string, synchronized, serialization]
status: done
verified_at: 2026-09-03
category: "CS&프로그래밍(CS&Programming)"
---

# Java 백엔드 면접 기초 — 객체 계약, 문자열, 동시성과 컬렉션

Java 백엔드 면접에서 언어, 런타임에 특화된 빈출 주제를 한데 모은 요약. JVM, GC, JIT, 스레드의 일반 개념은 [[GC-Algorithm]], [[V8]], [[Thread-vs-Event-Loop]], [[Sync-Async-Blocking]] 같은 기존 문서와 교차 참조.

## 1. `Object.equals()`, `hashCode()` 계약

### 동일성 vs 동등성

- **동일성(identity)** — `==` 연산자. 두 참조가 같은 객체를 가리키는가
- **동등성(equality)** — `equals()`. 의미적으로 동일한 값인가(도메인 규칙으로 정의)

### hashCode 계약

- `equals()`가 true면 `hashCode()`는 반드시 같아야 함
- 반대는 성립 안 함(다른 객체가 같은 해시를 가질 수 있음 — 충돌)
- 같은 객체 상태에서 호출마다 일관된 값을 반환해야 함

### 잘못 구현했을 때

- `equals()`만 오버라이드 → `HashMap.get()`, `HashSet.contains()`가 오동작. 같은 논리 객체인데 bucket에 못 찾음
- `hashCode()`에 요청마다 변하는 필드 사용 → 컬렉션에 담긴 후 값이 바뀌면 영원히 못 찾음
- 컬렉션 키로 쓰는 도메인 객체는 `@EqualsAndHashCode`(Lombok), record, IDE 자동 생성 활용

## 2. `String`, `StringBuilder`, `StringBuffer`

| 타입 | 가변성 | 스레드 안전 | 성능 |
|---|---|---|---|
| `String` | 불변 | 안전 | 반복 `+` 누적은 매번 새 객체 생성 |
| `StringBuilder` | 가변 | 불안전 | 단일 스레드에서 가장 빠름 |
| `StringBuffer` | 가변 | `synchronized`로 안전 | StringBuilder보다 느림 |

- **루프에서 문자열 결합**은 반드시 `StringBuilder`. `+`는 내부적으로 `StringBuilder`를 매번 생성할 수 있음
- 멀티스레드에서 공유 버퍼에 쓸 일은 실무에서 드묾 → **`StringBuffer`는 거의 쓸 일 없음**(레거시)
- JDK 9부터 javac는 `+` 연산을 `StringBuilder` append 체인 대신 `java.lang.invoke.StringConcatFactory`를 부트스트랩하는 `invokedynamic`으로 컴파일한다. 런타임 JIT의 변경이 아니라 컴파일 시점의 바이트코드 변경이며, 동적 개수 결합에는 여전히 `StringBuilder`가 안전하다

## 3. `synchronized`, `volatile`

### `synchronized`

- 모니터 락을 획득해 임계 구역 보호 → **상호 배제(mutual exclusion)**
- 락 획득 시 **해당 스레드의 캐시 무효화 + 해제 시 메모리 반영** → 가시성(visibility)도 해결
- 비용: 컨텍스트 스위칭, 경합 대기. 불필요하게 사용하면 처리량 저하

### `volatile`

- 변수 읽기, 쓰기를 **메인 메모리와 직접 동기화** → 가시성만 보장
- 원자성 없음 — `count++`처럼 읽기+수정+쓰기가 섞인 복합 연산은 여전히 race condition
- 단일 플래그(`running = false`) 같은 경우에 적합

### 선택 기준

- 복합 연산 원자성 필요 → `synchronized` 또는 `java.util.concurrent.atomic.*`(CAS 기반)
- 단순 플래그의 가시성만 필요 → `volatile`
- 성능 중요 → `ReentrantLock`, `StampedLock`, `Atomic*`

## 4. `++` 연산의 비원자성

`counter++`는 실제로 **read → modify → write** 3단계 바이트코드. 두 스레드가 겹치면 lost update. 해결:

- `AtomicInteger.incrementAndGet()` — CAS(Compare-And-Swap)로 원자적
- `synchronized`로 임계 구역화
- `LongAdder` — 경합이 심한 카운터에서 `AtomicLong`보다 빠름

## 5. 컬렉션 내부 구현

### ArrayList

- 내부는 **동적 배열** — 무인자 생성자의 초기 capacity 10은 API 계약이지만 정확한 확장 배율은 명세하지 않는다. OpenJDK 구현의 1.5배 확장을 모든 Java 버전의 규칙으로 보지 않는다
- 확장 시 O(n) 복사 발생 → 예상 크기가 크면 `new ArrayList<>(initialCapacity)`로 미리 할당
- 중간 삽입, 삭제는 O(n). 끝 추가는 O(1) 상각

### HashMap

- 버킷 배열 + 체인. OpenJDK 21 구현은 충돌 bin이 treeify threshold 8을 넘고 테이블 용량도 64 이상일 때 Red-Black Tree로 전환하며, 용량이 작으면 먼저 resize한다
- 기본 load factor 0.75, 초과 시 2배 리사이즈
- 키 `hashCode()` 품질이 성능을 좌우 — 나쁘면 핫 버킷에 몰려 O(n)


## 출처

- [JEP 280: Indify String Concatenation](https://openjdk.org/jeps/280)
- [OpenJDK 21 HashMap source](https://github.com/openjdk/jdk/blob/jdk-21%2B35/src/java.base/share/classes/java/util/HashMap.java)

## 관련 문서

- [[Java-Backend-Fundamentals|Java 백엔드 면접 기초]]
- [[Java-Backend-Fundamentals-IO-Serialization-Runtime|I/O, 직렬화, JVM과 로깅]]
- [[Java-Backend-Fundamentals-Value-and-Design|값, 불변성, 타입 설계와 호출 전달]]
