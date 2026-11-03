---
tags: [runtime, jvm, java, jit, aot, performance, leyden]
status: done
verified_at: 2026-11-03
category: "OS&런타임(OS&Runtime)"
aliases: ["HotSpot JIT and AOT Cache", "HotSpot JIT 최적화", "AOT 캐시", "Project Leyden", "Compact Object Headers", "JDK 기본값 변화"]
---

# HotSpot JIT 최적화와 AOT 캐시

HotSpot은 바이트코드를 해석하면서 실행 프로파일을 모으고, 자주 실행되는 코드를 그 프로파일에 기대 기계어로 컴파일한다. 그래서 같은 코드도 기동 직후와 충분히 실행한 뒤의 성능이 다르고, JDK를 올리기만 해도 컴파일러, GC와 기본값이 바뀌어 결과가 달라진다. 이 문서는 C2의 추측 최적화와 그 한계, 학습 실행의 결과를 재사용하는 AOT 캐시, JDK 업그레이드에서 함께 바뀌는 기본값을 다룬다. 실행 엔진의 전체 구성은 [[JVM-Architecture#Execution Engine|JVM 아키텍처]]를 따른다.

아래 JDK 상태는 2026-11-03 기준이다. JDK 26은 2026-03-17, JDK 27은 2026-09-15에 GA가 됐고, JDK 28의 GA 예정일은 2027-03-09다.

## 성능을 네 축으로 나눈다

| 축 | 뜻 | 주로 관련된 기술 |
|---|---|---|
| 기동(startup) | 프로세스를 띄운 뒤 첫 유효 작업을 시작하기까지 | 클래스 로딩과 링크, AOT 캐시 |
| 워밍업(warmup) | 최고 성능에 가까워지기까지. 프로파일 수집과 JIT 컴파일이 이 구간에 일어난다 | 메서드 프로파일과 기계어의 사전 준비 |
| 안정 상태(steady state) | 충분히 실행한 뒤의 처리량과 지연 | C2 최적화, GC |
| 메모리 사용량(footprint) | 힙과 네이티브 메모리 | 객체 헤더 크기, 초기 힙 |

한 변경이 네 축을 모두 개선한다고 가정하지 않는다. 개선하려는 축을 먼저 정하고 그 축을 측정한다.

## C2는 프로파일에 기대 추측하고, 틀리면 되돌린다

HotSpot은 인터프리터와 C1 단계에서 호출 횟수, 분기 방향과 수신 객체의 타입을 프로파일로 모은다. C2는 이 정보로 인라이닝 범위를 넓힌 뒤 최적화한다.

- **추측과 역최적화:** 실행되지 않은 분기는 코드에서 빼 두고, 그 분기에 들어가면 역최적화한다. 호출 지점이나 캐스트에 예상하지 못한 타입이 와도 역최적화한다. C2가 만든 코드가 인터프리터로 돌아가 실행을 이어가는 지점을 uncommon trap이라 부른다. 수신 타입이 하나뿐이라고 관찰한 인터페이스 호출을 그 구현의 직접 호출로 바꿔 인라이닝하는 최적화도 이 가정 위에 선다. 같은 구조의 V8 사례는 [[V8-Ignition-TurboFan#Deoptimization (역최적화)|V8 역최적화]]에 있다.
- **범위 검사 제거:** 반복 범위를 나눠(iteration range splitting) 루프 본문의 배열 범위 검사를 줄인다. OpenJDK 위키 기준으로 포인터를 따라가는 루프와 보폭이 상수가 아닌 루프는 대상이 아니다.
- **루프 펼치기:** 기본값(`LoopMaxUnroll=16`)에서는 벡터화하지 않는 루프의 본문을 최대 16벌까지 복제해 반복 횟수와 분기를 줄인다. 자동 벡터화 대상 루프는 벡터 폭에 맞춰 상한이 올라가거나 벡터화 뒤 더 펼쳐질 수 있다. 생성 코드가 커지는 대가가 있다.
- **자동 벡터화(SuperWord):** 루프의 같은 연산을 SIMD 명령으로 묶는다. 루프 안의 제어 흐름은 허용하지 않는다. JDK 26은 서로 겹칠 수 있는 메모리 접근을 실행 시점에 검사하고, 검사가 실패하면 역최적화하는 predicate나 빠른 루프와 가정 없는 느린 루프로 나누는 multiversioning을 쓴다(JDK-8324751). 벡터화가 이득인지 판단하는 비용 모델도 넣었다(JDK-8340093). JDK 27은 int와 short, byte 같은 subword 타입 사이를 좁히거나 넓히는 캐스트가 있는 루프를 더 많은 경우에 벡터화한다(JDK-8342095).
- **탈출 분석과 스칼라 치환:** 스칼라 치환할 수 있다고 판정된 객체는 C2가 할당과 관련 락을 생성 코드에서 없애고 필드를 개별 값으로 다룬다. 전역으로 탈출하지 않는 객체의 락도 없앤다. Oracle 문서는 이것이 힙 할당을 스택 할당으로 바꾸는 방식이 아니라고 명시한다. 그러니 HotSpot C2가 객체를 스택에 할당한다고 설명하지 않는다(OpenJ9 같은 다른 JVM은 일부 객체를 스택에 할당한다).
- **부동소수점 연산 순서:** JLS는 부작용이 없으면 덧셈과 곱셈이 교환법칙을 따르지만, 부동소수점 덧셈과 곱셈은 결합법칙이 성립하지 않는다고 적는다. 정수 연산은 피연산자 타입이 같으면 결합법칙이 성립한다. 그래서 부동소수점 식의 결합 순서를 바꾸는 재배열은 결과가 달라질 수 있어 정수 식처럼 자유롭지 않다(해석).

### 상수로 확정되면 더 많이 지운다

JDK 내부의 `@Stable` 필드는 기본값이 아닌 값이 한 번 들어가면 바뀌지 않는다고 JIT에 알린다. JDK 25는 `String`이 캐시하는 hash 필드를 이렇게 다뤄, 상수 문자열의 `hashCode()`가 상수 접기 대상이 될 수 있게 했다(JDK-8354300). 해당 마이크로벤치마크는 약 8배 빨라졌지만, `@Stable`은 기본값이 아닌 값만 확정된 값으로 믿으므로 hash 값이 0인 문자열은 접히지 않는다(관련 개선 JDK-8354777은 2026-11-03 Open). 문자열을 키로 쓰는 불변 조회 구조에서 효과가 커질 수 있는 변경이며, 일반 애플리케이션의 처리량 개선 폭으로 옮기지 않는다.

애플리케이션 코드에서 같은 지연 초기화 상수를 표현하는 API는 preview 단계의 `LazyConstant`다(JDK 25의 StableValue를 JDK 26의 JEP 526에서 개명). preview API는 릴리스 사이에 의미가 바뀔 수 있다. JDK 26 Javadoc은 계산 함수가 예외를 던지면 초기화되지 않은 상태로 남아 다음 `get()`이 다시 계산할 수 있다고 적지만, JDK 27 Javadoc은 많아야 한 번 초기화한다고 적는다. 실패하면 그 호출부터 `NoSuchElementException`을 던지고(첫 호출은 원래 예외를 cause로 담는다) 다시 계산하지 않는다. JDK 28에는 변경 없이 다시 preview로 제안돼 있다(JEP 547, Candidate).

## 기동과 워밍업을 앞당기는 AOT 캐시

JDK 24부터 HotSpot은 학습 실행(training run)에서 얻은 결과를 AOT 캐시 파일에 담아 다음 실행에서 재사용한다(Project Leyden). 별도 네이티브 실행 파일을 만드는 GraalVM Native Image와 달리 같은 HotSpot JVM에서 동작한다. JDK 27까지의 캐시에는 메서드 기계어가 없어 모든 메서드를 평소처럼 해석하고 JIT 컴파일한다. JEP 544(JDK 28 예정)부터는 캐시의 기계어로 시작할 수 있고, 캐시에 없거나 조건이 맞지 않는 메서드는 해석과 JIT로 실행되며 JIT가 AOT 코드를 대체할 수도 있다.

| JDK | JEP | 캐시에 담는 것과 효과 |
|---|---|---|
| 24 | 483 Ahead-of-Time Class Loading & Linking | 학습 실행에서 읽고 링크한 클래스. Spring PetClinic 예제의 기동이 4.486초에서 2.604초로 42% 줄었다 |
| 25 | 514 Ahead-of-Time Command-Line Ergonomics | `-XX:AOTCacheOutput` 하나로 학습 실행과 캐시 생성을 한 번에 한다 |
| 25 | 515 Ahead-of-Time Method Profiling | 메서드 실행 프로파일. 워밍업을 줄인다. 프로파일 없는 AOT 캐시 대비 HelloStreamWarmup 예제가 90ms에서 73ms로 19% 줄었고 캐시는 약 2.5% 커졌다. 운영 실행에서도 프로파일링은 계속된다 |
| 26 | 516 Ahead-of-Time Object Caching with Any GC | 객체를 GC 중립 형식에서 순차적으로 적재하는 형식을 추가해 ZGC에서도 캐시한 객체를 쓴다. 기존의 GC 전용 매핑 형식은 남아 있고, 캐시를 만들 때 학습 실행의 조건으로 형식을 고른다 |
| 28 예정 | 544 Ahead-of-Time Code Compilation | 최적화된 기계어. 2026-11-03 Integrated 상태이며 아직 GA 릴리스가 아니다 |

```bash
# 학습 실행과 캐시 생성을 한 번에 (JDK 25 이상)
java -XX:AOTCacheOutput=app.aot -cp app.jar com.example.App

# 운영 실행
java -XX:AOTCache=app.aot -cp app.jar com.example.App
```

- **실행 조건이 맞아야 쓴다:** JEP 483 기준으로 모든 실행이 같은 JDK 릴리스와 일관된 클래스 경로(JAR만, 디렉터리 불가)와 모듈 옵션을 써야 하고, 클래스 파일을 임의로 고치는 JVMTI 에이전트는 쓸 수 없다. 어기면 경고를 내고 캐시를 무시한다. 에이전트 제약은 릴리스마다 다시 확인한다. JEP 544의 기계어는 여기에 더해 학습 실행과 운영 실행의 CPU 아키텍처, AVX-512 같은 CPU 기능과 GC가 같아야 쓰이고, 다르면 경고를 내고 인터프리터와 JIT로 돌아간다.
- **설정 확인용 강제 모드:** 캐시를 쓸 수 없으면 종료하는 `-XX:AOTMode=required`(JDK 27에서 추가, 기존 `on`은 권장하지 않는 별칭으로 남음)는 캐시 설정 확인에 쓴다. 운영에서는 VM 옵션 하나만 바뀌어도 기동이 실패할 수 있어 주의한다(JDK-8383031).
- **학습 실행이 운영을 대표해야 한다:** 캐시의 클래스와 프로파일은 학습 실행이 실제로 실행한 경로에서 나온다. 운영 트래픽과 다른 경로만 실행했다면 효과가 작을 수 있다(해석).
- **기존 설명의 갱신:** JDK 9의 실험적 `jaotc`는 JDK 17에서 제거됐지만(JEP 410), 그 뒤 HotSpot의 AOT는 위 캐시 방식으로 다시 들어왔다. JVM 진영의 AOT를 Native Image 하나로만 설명하지 않는다.

## JDK 업그레이드는 기본값도 바꾼다

| 변경 | JDK | 내용 | 이전 동작으로 비교하려면 |
|---|---|---|---|
| G1 동기화 감소 (JEP 522) | 26 | 두 번째 카드 테이블을 두어 애플리케이션 스레드의 쓰기 장벽과 GC 최적화 스레드 사이의 동기화를 줄였다. 참조를 많이 바꾸는 앱에서 처리량 5~15% 향상을 관측했고, x64 쓰기 장벽은 명령 약 50개에서 12개로 줄었다. 카드 테이블마다 힙 용량의 0.2%(힙 1GB당 2MB)의 네이티브 메모리가 더 든다 | 플래그로 되돌리는 기능이 아니므로 JDK 25와 비교 |
| 기본 초기 힙 (JDK-8375501) | 26 | 기본 `InitialRAMPercentage`(물리 메모리의 1/64)를 없애 초기 힙을 `MinHeapSize`로 둔다 | `-XX:InitialRAMPercentage=1.5625` 또는 `-Xms` |
| 가상 스레드의 클래스 초기화 대기 (JDK-8369238) | 26 | 다른 스레드가 초기화 중인 클래스를 기다리는 가상 스레드가 대부분의 경우 carrier에서 내려온다. 인터프리터의 `invokestatic`, `new`, `getstatic`, `putstatic` 경로에 한정된다 | JDK 25와 비교 |
| G1을 모든 환경의 기본 GC로 (JEP 523) | 27 | CPU 1개 또는 물리 메모리 1792MB 미만이라 Serial을 고르던 환경도 G1을 쓴다. Serial은 제거되지 않는다 | `-XX:+UseSerialGC` |
| Compact Object Headers 기본값 (JEP 534) | 27 | 64비트 플랫폼의 객체 헤더를 96비트에서 64비트로 줄이는 배치가 기본이 됐다. JDK 24 실험 기능(JEP 450), JDK 25 제품 기능(JEP 519)을 거쳤다. 옛 배치는 이번에 제거하지 않으며, 향후 릴리스에서 deprecate할 계획이라고 적는다 | `-XX:-UseCompactObjectHeaders` |
| Object Monitor Table 기본 사용 (JDK-8379782) | 27 | compact headers가 필요로 하는 모니터 테이블을 기본으로 켰다. 동기화가 많은 벤치마크에서 30% 회귀가 드러나 별도로 고쳤다(JDK-8382311) | 진단 플래그 `-XX:+UnlockDiagnosticVMOptions -XX:-UseObjectMonitorTable`로 비교를 검토하되 compact headers 기본값과 함께 쓸 수 있는지 확인한다. 동기화가 많은 코드는 JDK 26과도 비교 |

JEP 534는 SPECjbb2015에서 힙 22%, CPU 8%, GC 횟수 15%가 줄었다는 측정을 인용한다. 객체가 작아지면 같은 힙에 더 많은 객체가 들어가고 캐시 효율도 달라질 수 있지만, 이득은 객체 크기 분포와 동기화 패턴에 달려 있다. 컨테이너에서는 초기 힙 변경이 committed 메모리와 RSS 추이를 바꿀 수 있으므로 [[JVM-Container-Memory|JVM 컨테이너 메모리]]의 지표로 함께 확인한다.

라이브러리 최적화는 코드를 바꾸지 않아도 적용된다. 예를 들어 JDK 27은 입력이 `HashMap`이나 수정 불가 래퍼일 때 `HashMap.putAll()`을 최적화했다(JDK-8371656). 다만 개선 폭은 출처마다 다르게 보고되므로(Inside.java 기사는 61~86% 시간 감소, JBS 이슈는 약 40~80% 향상) 한 숫자를 인용하지 않고 자기 부하로 잰다.

## 측정과 적용

- **많이 쓰는 곳부터:** 전체 시간의 10%를 차지하는 구간을 4배 빠르게 해도 전체 시간은 0.9 + 0.1/4 = 0.925, 곧 7.5%만 준다. 프로파일로 시간을 많이 쓰는 경로를 먼저 찾는다.
- **JDK 비교는 기본값 그대로 한 번, 하나씩 되돌려 한 번:** 같은 입력과 부하로 이전 JDK와 새 JDK를 비교하고, 차이가 나면 위 표의 플래그로 기본값을 하나씩 되돌려 원인을 나눈다(운영 제안). 기동, 안정 상태의 처리량, 메모리와 꼬리 지연을 따로 기록한다.
- **기동이 문제면 AOT 캐시부터:** 짧게 실행되고 끝나는 프로그램이나 자주 다시 뜨는 컨테이너는 기동과 워밍업의 비중이 크다. 학습 실행을 배포 파이프라인에 넣고, 캐시 생성에 쓴 JDK와 실행 조건을 산출물과 함께 기록한다(운영 제안).
- **마이크로벤치마크의 한계:** 한 연산만 재는 벤치마크는 실제 애플리케이션의 개선을 보장하지 않는다. JMH 측정 조건은 [[JVM-Architecture#JVM 벤치마크의 측정 조건|JVM 벤치마크의 측정 조건]]을 따른다.

## 확인 질문

- 개선하려는 것이 기동, 워밍업, 안정 상태와 메모리 중 무엇인가?
- 업그레이드 뒤 성능이 바뀌었다면 GC, 객체 헤더와 초기 힙의 기본값 변경을 분리해 확인했는가?
- AOT 캐시의 학습 실행이 운영 경로를 대표하고, 캐시를 만든 JDK, 클래스 경로, 모듈 옵션과 에이전트, CPU 기능과 GC가 운영과 같은가?
- preview API의 동작을 JDK 버전별 Javadoc으로 확인했는가?

## 출처

- [Java Performance Update - 2026 — Java (YouTube), Per-Åke Minborg](https://www.youtube.com/watch?v=1d9t8R20V10) — Devoxx Belgium 2026 발표, 계기 자료. 강연의 버전 귀속과 수치는 아래 JEP, JBS와 Javadoc으로 대조했다. 초기 힙이 커졌다는 설명은 JDK-8375501 기준으로 바로잡았고, 녹취만으로는 불분명한 G1 기본화 릴리스는 JEP 523으로 확인했다
- [OpenJDK, JDK 26](https://openjdk.org/projects/jdk/26/)
- [OpenJDK, JDK 27](https://openjdk.org/projects/jdk/27/)
- [OpenJDK, JDK 28](https://openjdk.org/projects/jdk/28/) — GA 예정일과 JEP 544 포함 여부
- [OpenJDK, JEP 410: Remove the Experimental AOT and JIT Compiler](https://openjdk.org/jeps/410)
- [OpenJDK, JEP 526: Lazy Constants (Second Preview)](https://openjdk.org/jeps/526)
- [OpenJDK, JEP 547: Lazy Constants (Fourth Preview)](https://openjdk.org/jeps/547)
- [CSR: Add -XX:AOTMode=required — OpenJDK Bug System](https://bugs.openjdk.org/browse/JDK-8383031)
- [OpenJDK, JEP 483: Ahead-of-Time Class Loading & Linking](https://openjdk.org/jeps/483)
- [OpenJDK, JEP 514: Ahead-of-Time Command-Line Ergonomics](https://openjdk.org/jeps/514)
- [OpenJDK, JEP 515: Ahead-of-Time Method Profiling](https://openjdk.org/jeps/515)
- [OpenJDK, JEP 516: Ahead-of-Time Object Caching with Any GC](https://openjdk.org/jeps/516)
- [OpenJDK, JEP 544: Ahead-of-Time Code Compilation](https://openjdk.org/jeps/544)
- [OpenJDK, JEP 450: Compact Object Headers (Experimental)](https://openjdk.org/jeps/450)
- [OpenJDK, JEP 519: Compact Object Headers](https://openjdk.org/jeps/519)
- [OpenJDK, JEP 534: Compact Object Headers by Default](https://openjdk.org/jeps/534)
- [OpenJDK, JEP 522: G1 GC: Improve Throughput by Reducing Synchronization](https://openjdk.org/jeps/522)
- [OpenJDK, JEP 523: Make G1 the Default Garbage Collector in All Environments](https://openjdk.org/jeps/523)
- [OpenJDK, JEP 531: Lazy Constants (Third Preview)](https://openjdk.org/jeps/531)
- [Release Note: Default Initial Heap Size Now Set to MinHeapSize — OpenJDK Bug System](https://bugs.openjdk.org/browse/JDK-8375501) — JDK-8375501, 변경 이슈는 JDK-8371986
- [Allow virtual thread preemption on some common class initialization paths — OpenJDK Bug System](https://bugs.openjdk.org/browse/JDK-8369238) — JDK-8369238, 릴리스 노트 JDK-8371412
- [C2 SuperWord: Aliasing Analysis runtime check — OpenJDK Bug System](https://bugs.openjdk.org/browse/JDK-8324751)
- [OpenJDK Bug System, JDK-8340093](https://bugs.openjdk.org/browse/JDK-8340093) — SuperWord 비용 모델
- [Add autovectorizer support for subword vector casts — OpenJDK Bug System](https://bugs.openjdk.org/browse/JDK-8342095)
- [OpenJDK Bug System, JDK-8354300](https://bugs.openjdk.org/browse/JDK-8354300) — String hash의 @Stable 처리
- [OpenJDK Bug System, JDK-8354777](https://bugs.openjdk.org/browse/JDK-8354777) — hash 0 문자열의 상수 접기, 2026-11-03 Open
- [HashMap.putAll() optimizations — OpenJDK Bug System](https://bugs.openjdk.org/browse/JDK-8371656)
- [Implement Object Monitor Table enabled by default — OpenJDK Bug System](https://bugs.openjdk.org/browse/JDK-8379782)
- [OpenJDK Bug System, JDK-8382311](https://bugs.openjdk.org/browse/JDK-8382311) — 모니터 테이블 회귀 수정
- [c2_globals.hpp — GitHub, openjdk/jdk27u](https://github.com/openjdk/jdk27u/blob/master/src/hotspot/share/opto/c2_globals.hpp) — `LoopMaxUnroll` 기본값 16
- [Oracle, Java SE 26 API, LazyConstant](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/LazyConstant.html)
- [Oracle, Java SE 27 API, LazyConstant](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/lang/LazyConstant.html)
- [Oracle, Java HotSpot Virtual Machine Performance Enhancements (Java SE 25)](https://docs.oracle.com/en/java/javase/25/vm/java-hotspot-virtual-machine-performance-enhancements.html) — 탈출 분석과 스칼라 치환
- [Oracle, The Java Language Specification, Java SE 25 Edition, Chapter 15](https://docs.oracle.com/javase/specs/jls/se25/html/jls-15.html) — 15.17.1과 15.18.2의 교환법칙과 결합법칙
- [OpenJDK Wiki, HotSpot PerformanceTechniques](https://wiki.openjdk.org/display/HotSpot/PerformanceTechniques)
- [OpenJDK, HotSpot Glossary of Terms](https://openjdk.org/groups/hotspot/docs/HotSpotGlossary.html) — uncommon trap
- [OpenJDK Wiki, HotSpot RangeCheckElimination](https://wiki.openjdk.org/spaces/HotSpot/pages/11829253/RangeCheckElimination)
- [Performance Improvements in JDK 25 — Inside.java](https://inside.java/2025/10/20/jdk-25-performance-improvements/)
- [Performance Improvements in JDK 26 — Inside.java](https://inside.java/2026/06/09/jdk-26-performance-improvements/)
- [Performance Improvements in JDK 27 — Inside.java](https://inside.java/2026/09/28/performance-update-jdk27/)

## 관련 문서

- [[JVM-Architecture|JVM 아키텍처]] — 실행 엔진의 구성과 벤치마크 측정 조건
- [[JVM-GC|JVM GC]] — G1, ZGC와 수집기 선택
- [[JVM-Container-Memory|JVM 컨테이너 메모리]] — 초기 힙과 committed, RSS
- [[Compile-and-Runtime|컴파일과 런타임]] — AOT, 인터프리터와 JIT의 일반 구분
- [[V8-Ignition-TurboFan|V8 컴파일 파이프라인]] — JavaScript 엔진의 추측 최적화와 역최적화
- [[Java-Spring-Stack-Migration|Java와 Spring 스택 마이그레이션]] — GraalVM Native Image 전환의 경계
