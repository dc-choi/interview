---
tags: [cs, java, interview, equals, hashcode, string, synchronized, serialization]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Backend Fundamentals", "Java 백엔드 면접 기초"]
---

# Java 백엔드 면접 기초

Java 백엔드 면접에서 언어·런타임에 특화된 빈출 주제를 한데 모은 요약. JVM·GC·JIT·스레드의 일반 개념은 [[GC-Algorithm]], [[V8]], [[Thread-vs-Event-Loop]], [[Sync-Async-Blocking]] 같은 기존 문서와 교차 참조.

## 1. `Object.equals()` · `hashCode()` 계약

### 동일성 vs 동등성

- **동일성(identity)** — `==` 연산자. 두 참조가 같은 객체를 가리키는가
- **동등성(equality)** — `equals()`. 의미적으로 동일한 값인가(도메인 규칙으로 정의)

### hashCode 계약

- `equals()`가 true면 `hashCode()`는 반드시 같아야 함
- 반대는 성립 안 함(다른 객체가 같은 해시를 가질 수 있음 — 충돌)
- 같은 객체 상태에서 호출마다 일관된 값을 반환해야 함

### 잘못 구현했을 때

- `equals()`만 오버라이드 → `HashMap.get()`·`HashSet.contains()`가 오동작. 같은 논리 객체인데 bucket에 못 찾음
- `hashCode()`에 요청마다 변하는 필드 사용 → 컬렉션에 담긴 후 값이 바뀌면 영원히 못 찾음
- 컬렉션 키로 쓰는 도메인 객체는 `@EqualsAndHashCode`(Lombok)·record·IDE 자동 생성 활용

## 2. `String` · `StringBuilder` · `StringBuffer`

| 타입 | 가변성 | 스레드 안전 | 성능 |
|---|---|---|---|
| `String` | 불변 | 안전 | 반복 `+` 누적은 매번 새 객체 생성 |
| `StringBuilder` | 가변 | 불안전 | 단일 스레드에서 가장 빠름 |
| `StringBuffer` | 가변 | `synchronized`로 안전 | StringBuilder보다 느림 |

- **루프에서 문자열 결합**은 반드시 `StringBuilder`. `+`는 내부적으로 `StringBuilder`를 매번 생성할 수 있음
- 멀티스레드에서 공유 버퍼에 쓸 일은 실무에서 드묾 → **`StringBuffer`는 거의 쓸 일 없음**(레거시)
- JDK 9+의 JIT이 `+` 연산을 `StringConcatFactory`로 최적화하지만, 동적 개수 결합은 여전히 `StringBuilder`가 안전

## 3. `synchronized` · `volatile`

### `synchronized`

- 모니터 락을 획득해 임계 구역 보호 → **상호 배제(mutual exclusion)**
- 락 획득 시 **해당 스레드의 캐시 무효화 + 해제 시 메모리 반영** → 가시성(visibility)도 해결
- 비용: 컨텍스트 스위칭·경합 대기. 불필요하게 사용하면 처리량 저하

### `volatile`

- 변수 읽기·쓰기를 **메인 메모리와 직접 동기화** → 가시성만 보장
- 원자성 없음 — `count++`처럼 읽기+수정+쓰기가 섞인 복합 연산은 여전히 race condition
- 단일 플래그(`running = false`) 같은 경우에 적합

### 선택 기준

- 복합 연산 원자성 필요 → `synchronized` 또는 `java.util.concurrent.atomic.*`(CAS 기반)
- 단순 플래그의 가시성만 필요 → `volatile`
- 성능 중요 → `ReentrantLock`·`StampedLock`·`Atomic*`

## 4. `++` 연산의 비원자성

`counter++`는 실제로 **read → modify → write** 3단계 바이트코드. 두 스레드가 겹치면 lost update. 해결:

- `AtomicInteger.incrementAndGet()` — CAS(Compare-And-Swap)로 원자적
- `synchronized`로 임계 구역화
- `LongAdder` — 경합이 심한 카운터에서 `AtomicLong`보다 빠름

## 5. 컬렉션 내부 구현

### ArrayList

- 내부는 **동적 배열** — 기본 용량 10, 가득 차면 **1.5배로 확장**(Java 기준; `Arrays.copyOf`)
- 확장 시 O(n) 복사 발생 → 예상 크기가 크면 `new ArrayList<>(initialCapacity)`로 미리 할당
- 중간 삽입·삭제는 O(n). 끝 추가는 O(1) 상각

### HashMap

- 버킷 배열 + 체인(Java 8부터 버킷당 8개 초과 시 **Red-Black Tree**로 전환)
- 기본 load factor 0.75, 초과 시 2배 리사이즈
- 키 `hashCode()` 품질이 성능을 좌우 — 나쁘면 핫 버킷에 몰려 O(n)

## 6. Blocking vs Non-Blocking I/O

### Thread-per-Request (Tomcat 기본)

- 요청마다 스레드 할당 → I/O 대기 중 스레드가 유휴
- 동시 요청 = 스레드 풀 크기 = 메모리(스레드당 1MB+)
- C10K 이상 부담. CPU는 놀고 스레드 풀은 포화

### Non-Blocking (Netty·WebFlux)

- 이벤트 루프 + 셀렉터(`epoll`/`kqueue`/IOCP)
- 소수 스레드로 수만 커넥션 → **I/O 바운드에 강함**
- 리액티브 체인의 학습·디버깅 비용은 부담

### Project Loom (가상 스레드, JDK 21+)

- OS 스레드와 1:1 매핑 없이 **수백만 가상 스레드**를 JVM이 스케줄링
- `Thread.startVirtualThread()` — Blocking 코드 그대로 쓰면서 Non-Blocking 효과
- 자세한 논의: [[Async-vs-Threads|async/await vs 스레드]]

## 7. 직렬화(Serialization)

### `Serializable`

- 마커 인터페이스. 구현하면 `ObjectOutputStream`으로 바이트 스트림 변환 가능
- **`serialVersionUID`** 명시 권장 — 없으면 컴파일러가 필드 구성으로 해시 생성 → 클래스 변경 시 역직렬화 실패
- 보안 위험: 역직렬화 가젯 체인 공격(Jackson/XStream CVE 다수) → **신뢰 없는 입력을 역직렬화하지 말 것**

### JSON·ProtoBuf·Avro

- 현대 백엔드 표준은 대부분 **JSON(Jackson/Gson)** 또는 **ProtoBuf/Avro**(스키마 기반)
- Java 기본 직렬화는 버저닝·언어 호환성 약함 → 마이크로서비스 간 통신에는 부적합
- 필드 이름·타입 변경 시의 호환성(하위·상위)은 스키마 규약으로 관리

## 8. JVM·GC·JIT (다른 문서 포인터)

- **JVM 아키텍처**(ClassLoader·Runtime Data Area·JIT C1/C2·GraalVM): [[JVM-Architecture]]
- **JVM GC**(Young/Old/Metaspace, G1·ZGC·Shenandoah): [[JVM-GC]]
- **GC 알고리즘 이론**(Tri-color Marking, Incremental, Concurrent): [[GC-Algorithm]]
- **JIT 컴파일러**(C1/C2·인라이닝·탈출분석): Node.js V8과 개념 유사 → [[V8]]
- **TLAB(Thread Local Allocation Buffer)**: [[V8]]의 TLAB 섹션
- **OOM 대응**(힙 덤프·`-XX:+HeapDumpOnOutOfMemoryError`): [[OOM-Troubleshooting]]과 개념 공유
- **APM 툴**: Pinpoint·NewRelic·Datadog — **Java Bytecode Instrumentation**으로 메서드 진입/종료를 후킹

## 9. `System.out.println` 금지

실무 코드에서 `System.out.println`을 사용하면 안 되는 이유.

- **동기 I/O** — 콘솔 출력이 끝날 때까지 스레드 블로킹, 고트래픽에선 심각한 병목
- **레벨 제어 불가** — 로그 레벨(DEBUG/INFO/WARN/ERROR) 구분이 없어 환경별 필터링 불가
- **포맷·타임스탬프·스레드 정보 부재** — 디버깅 메타데이터가 남지 않음
- 해결: SLF4J + Logback/Log4j2로 비동기 Appender 사용

## 10. 박싱 / 언박싱

- `int`↔`Integer` 자동 변환. 컬렉션·제네릭은 박싱 필수
- 함정: `Integer a = 128; Integer b = 128; a == b` → `false` (Integer 캐시는 -128~127만). 값 비교는 항상 `equals`
- 루프에서의 숨은 할당은 GC 부담 → 성능 민감 코드는 `int[]`·`IntStream`

## 11. Mutable vs Immutable

- **Immutable**(`String`, `LocalDateTime`, `BigDecimal`, JDK 16+ `record`): Thread-safe 기본, 값 객체·DTO·VO 권장
- **Mutable**(`ArrayList`, `HashMap`, 일반 POJO): 공유 시 동기화 필요
- 설계 원칙: 기본은 Immutable, 필요할 때만 Mutable

## 12. Abstract Class vs Interface

| 축 | Abstract Class | Interface |
|---|---|---|
| 상속 | **단일 상속** | **다중 구현** |
| 상태(필드) | 가질 수 있음 | `static final`만 |
| 생성자 | 있음(하지만 직접 인스턴스화 불가) | 없음 |
| 메서드 | 구현 있음/없음 혼용 | Java 8+ `default`·`static` 허용 |
| 용도 | **공통 구현 공유**(is-a 관계) | **계약 정의**(can-do 역할) |

현대 Java에서는 `default` 메서드로 경계가 흐려졌지만, **"역할(interface) + 기본 구현(abstract class)"** 조합이 여전히 유효.

## 13. Call by Value · Java의 함정

Java는 **모든 인자를 value로 전달**한다. 단, 객체 인자의 value는 **참조의 복사본** — 이 차이가 오해를 낳는다.

```java
void rename(User u) { u.setName("New"); }    // 원본 영향 O (참조로 같은 객체 수정)
void replace(User u) { u = new User("X"); }  // 원본 영향 X (복사본만 재할당)
```

- **참조의 복사**라 내부 상태 변경은 원본에 반영됨
- 참조 자체를 바꿔도(`u = new User(...)`) 호출자의 참조는 그대로
- "Java는 Call by Reference가 아니다" — 이 미묘함을 묻는 질문이 단골
- C++의 `&` 참조·C의 포인터 역참조와 달리, Java에는 **참조의 재할당을 바깥에 전파할 수단이 없음**

## 면접 체크포인트

- `equals()`·`hashCode()` 계약과 HashMap 성능의 관계
- `StringBuilder` vs `StringBuffer`의 실무 선택 기준
- `synchronized` vs `volatile`의 역할 구분(가시성 vs 원자성)
- `ArrayList`·`HashMap` 내부 구조(리사이즈·트리화)
- Thread-per-Request의 한계와 Loom·WebFlux 대안
- `Serializable`의 역직렬화 공격 리스크와 JSON 선호 이유
- 실무에서 `System.out.println` 대신 로거를 쓰는 이유

## 출처
- [F-Lab — Java 백엔드 개발자 인터뷰 1편](https://f-lab.kr/blog/java-backend-interview-1)
- [F-Lab — Java 백엔드 개발자 인터뷰 2편](https://f-lab.kr/blog/java-backend-interview-2)

## 관련 문서
- [[GC-Algorithm|GC 알고리즘]]
- [[V8|V8 엔진 (JIT · TLAB)]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Async-vs-Threads|async/await vs 스레드]]
- [[Sync-Async-Blocking|동기·비동기·블로킹·논블로킹]]
- [[OOM-Troubleshooting|Node.js OOM 트러블슈팅]]
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
