---
tags: [runtime, jvm, gc, java, young-gen, old-gen, g1gc, zgc]
status: done
verified_at: 2026-08-26
category: "OS&런타임(OS&Runtime)"
aliases: ["JVM GC", "JVM Garbage Collection", "Java GC"]
---

# JVM Garbage Collection

JVM의 GC는 **힙에서 더 이상 참조되지 않는 객체를 찾아 해제**하는 과정. 개발자가 `free`, `delete`를 직접 호출하지 않는 대신 JVM이 이 책임을 지며, **세대 가설(Generational Hypothesis)** 과 다양한 GC 알고리즘으로 시간, 공간을 절충한다. 알고리즘 이론과 Tri-color Marking, Incremental, Concurrent 같은 **현대 GC 공통 기법**은 [[GC-Algorithm]]에 있고, 이 문서는 **JVM 고유의 메모리 구조, 수집기**에 초점을 둔다.

## JVM 메모리 구조

- **Heap** — 객체 인스턴스가 저장되는 GC 대상 영역
  - **Young Generation**
    - **Eden** — 새 객체가 처음 할당되는 공간
    - **Survivor 0 / Survivor 1 (from/to)** — Minor GC에서 살아남은 객체가 이동하는 두 구역 (하나는 항상 비어 있음)
  - **Old Generation(Tenured)** — Young을 여러 번 살아남은 장수 객체
- **Metaspace**(Java 8+, 이전의 PermGen 대체) — 클래스 메타데이터, 메서드 바이트코드. 네이티브 메모리에 있어 힙과 별도 관리
- **Stack** — 스레드별 메서드 호출 프레임(GC 대상 아님)
- **Code Cache** — JIT 컴파일된 네이티브 코드

일반 객체 회수의 주 대상은 Heap이다. Metaspace는 힙 밖의 네이티브 메모리지만, GC로 클래스가 언로드되면 해당 클래스 메타데이터도 회수된다. Stack과 Code Cache는 힙 객체 수집 대상이 아니며 각각 별도 수명 주기로 관리된다.

## 세대 가설과 분리 설계

"대부분의 객체는 **할당 직후 금방 죽는다**". JVM은 이 가설에 맞춰 Young과 Old를 분리하고 **다른 알고리즘, 빈도**로 처리.

- **Young**: 자주 빠르게 쓸어냄(Minor GC) — 대부분이 쓰레기
- **Old**: 드물게, 전체를 정교하게 쓸어냄(Major/Full GC) — 살아있는 객체 비율이 높음

## 객체의 수명 경로

다음은 전통적인 세대형 수집기의 일반 경로다. G1은 Region을 사용하고, ZGC 같은 수집기는 버전과 모드에 따라 배치와 승격 방식이 다르다.

1. 새 객체 → **Eden** 할당
2. Eden이 차면 **Minor GC** 발생
   - 살아남은 객체는 Survivor(from)로 복사, Eden 비움
   - 다음 Minor GC에서는 Survivor(from) + Eden의 생존자를 Survivor(to)로 복사
   - from ↔ to 역할 교대
3. Survivor에서 JVM이 정한 tenuring threshold를 넘긴 객체는 Old로 **승격(Promotion)**. `-XX:MaxTenuringThreshold`는 그 임계값의 상한이며 실제 임계값은 실행 중 달라질 수 있다
4. Old의 점유 압력이 높아지면 수집기별 Old 수집이나 동시 사이클이 시작되고, 회수나 할당에 실패하면 더 비싼 Full GC로 이어질 수 있다

Survivor 두 개를 교대로 쓰는 이유는 **복사(copy) 방식으로 단편화를 자연스럽게 제거**하기 위함. 단일 Survivor로는 이동 대상과 여유 공간이 섞여 단편화.

## Minor GC vs Major/Full GC

| 구분 | 범위 | 빈도 | 지연 | 알고리즘 |
|---|---|---|---|---|
| **Minor GC** | Young 중심 | 비교적 잦음 | 대체로 짧지만 워크로드 의존 | 생존자 이동 또는 복사 |
| **Major GC** | Old 중심 | 수집기별 상이 | 수집기와 live set 의존 | 동시 마킹, Sweep, Compact 또는 Region 회수 |
| **Full GC** | 전체 Heap 중심, 클래스 언로딩을 동반할 수 있음 | 장애나 압력 조건에서 발생 | 대체로 가장 비쌈 | 수집기별 전체 회수 경로 |

Minor, Major, Full이라는 용어와 실제 범위는 수집기마다 다르므로 GC 로그의 cause와 phase로 확인한다. Full GC는 대개 큰 STW를 동반해 서비스 지연 위험이 크지만 시간은 힙과 live set, 수집기, 머신과 워크로드에 따라 달라진다.

## Stop-the-World (STW)

GC 수행 중 **모든 애플리케이션 스레드를 일시 정지**시키는 구간. 루트 스캔, 객체 이동 시 일관성을 보장하기 위해 필요.

- STW 길이는 **루트 집합, 힙과 live set, 수집기 알고리즘, 머신과 워크로드**의 영향을 받는다. 동시 수집기는 pause와 전체 힙 크기의 상관을 줄이도록 설계된다
- 지연 민감 서비스(결제, 트레이딩, 게임)에서 가장 큰 병목
- ZGC와 Shenandoah는 무거운 작업을 애플리케이션과 동시에 수행해 짧은 pause를 목표로 한다. 실제 pause는 GC 로그와 부하 테스트로 확인한다

## GC 알고리즘 계보

| 수집기 | 도입 | 특징 | 용도 |
|---|---|---|---|
| **Serial** | 전통 | 단일 스레드, Mark-Sweep-Compact | 소형 앱, 싱글 코어 |
| **Parallel (Throughput)** | JDK 5 | 멀티 스레드 Young+Old | 배치, 처리량 중심 |
| **CMS** (Concurrent Mark Sweep) | JDK 1.4.1~13, JDK 14에서 제거 | Old를 **동시 마킹**으로 STW 축소 | 과거 응답 지연 민감 앱 |
| **G1** (Garbage-First) | JDK 7~, 기본(JDK 9+) | **Region 기반**, pause 목표, Old도 동시 처리 | 일반 서버 워크로드의 기본 선택 |
| **ZGC** | 실험 JDK 11(JEP 333), Production JDK 15(JEP 377) | 짧은 pause 목표, TB급 힙 지원, Colored Pointer | 초저지연, 초대형 힙 |
| **Shenandoah** | Production JDK 15(JEP 379) | Concurrent Compaction, ZGC와 유사한 저지연. **Oracle JDK 빌드에는 미포함(OpenJDK 계열만)** | 초저지연 대안 |
| **Epsilon** | JDK 11~ | **아무것도 회수 안 함** | 단기 벤치마크, 메모리 분석 |

## G1GC (현대 표준)

힙을 수백~수천 개의 동일 크기 **Region**으로 나누고, 각 리전을 Young/Old/Humongous 중 하나로 할당.

- **Garbage-First**: 회수율이 가장 높은 Region부터 처리 → 적은 노력으로 최대 공간 확보
- **MaxGCPauseMillis**: 목표 STW를 설정하면 G1이 Region 수를 그에 맞춰 조절(soft target)
- 큰 객체는 연속된 여러 Region에 걸친 **Humongous Object**로 별도 처리
- Old 수집도 **Concurrent Marking**으로 길게 멈추지 않음
- JDK 9+의 기본 수집기

## ZGC, Shenandoah (초저지연)

- **ZGC**는 Colored Pointer와 Load Barrier를 사용해 마킹과 이동의 대부분을 애플리케이션 스레드와 동시에 처리한다
- **Shenandoah**는 Load Barrier와 forwarding pointer를 이용해 객체 이동과 참조 갱신을 동시에 수행한다
- 두 수집기 모두 pause가 전체 힙 크기에 따라 선형으로 늘지 않도록 설계됐지만, 루트 집합과 클래스 처리, 머신과 워크로드는 실제 pause에 영향을 준다
- 동시 작업과 배리어에는 CPU와 메모리 여유가 필요하다. G1 대비 처리량 차이는 워크로드에서 측정한다

**ZGC 버전별 caveat**: 초기 ZGC는 세대 구분이 없는 단일 힙(non-generational)이었다. **JDK 21에서 JEP 439로 Generational ZGC가 추가**돼 Young/Old를 분리하며 할당률 높은 워크로드의 효율이 크게 개선됐고, **JDK 23에서 JEP 474로 generational이 기본**이 됐다(`-XX:+ZGenerational`이 기본값). 이후 **JEP 490으로 non-generational 모드는 제거**됐다. 따라서 JDK 버전에 따라 ZGC가 세대형인지 여부가 다르다.

## 튜닝 포인트

### 힙 크기

- `-Xms` 초기, `-Xmx` 최대. 보통 같은 값으로 → 런타임 리사이즈 비용 제거 (전용 서버, 지연 민감 기준. 컨테이너에서 커밋 풋프린트와 메모리 지표가 중요하면 Initial을 낮춰 분리하기도 한다 — [[JVM-Container-Memory]])
- 너무 크면 Full GC가 드물지만 **한 번 돌 때 길어짐** → 지연 민감 서비스는 중간 크기 + G1/ZGC

### 세대 비율

- `-XX:NewRatio`(Old/Young 비율), `-XX:SurvivorRatio`(Eden/Survivor)
- 단명 객체가 많으면 Young을 키우고, 장수 객체가 많으면 Old를 키움
- 현대 수집기(G1, ZGC)는 Region 동적 관리로 이 튜닝 중요도가 낮아짐

### 승격 임계값

- `-XX:MaxTenuringThreshold` — Survivor를 몇 번 살아남으면 Old로 승격할지
- 너무 낮으면 단명 객체까지 Old로 가서 Full GC 증가

### GC 수집기 선택

- 처리량 중심 → Parallel
- 일반 응답시간, 대형 힙 → **G1 (기본)**
- 초저지연, 초대형 힙 → ZGC / Shenandoah

## 진단 도구

- **GC 로그**: `-Xlog:gc*:file=gc.log` (JDK 9+ 통합 로그)
- **JVisualVM / JConsole** — JMX 기반 실시간 모니터링
- **JFR (Java Flight Recorder)** — 저비용 상시 프로파일링
- **힙 덤프**: `-XX:+HeapDumpOnOutOfMemoryError`, `jmap -dump:live,format=b`
- **GCeasy, gceasy.io** — GC 로그 자동 분석
- **APM(Datadog, NewRelic, Pinpoint)** — GC 시간, 횟수를 메트릭으로

## OutOfMemoryError 패턴

- **Java heap space** — Old Gen 가득. 누수 or 힙 부족
- **GC overhead limit exceeded** — GC가 98% 시간을 차지하는데 2% 미만만 회수 → 사실상 메모리 부족
- **Metaspace** — 클래스 무한 로딩(동적 프록시 과다, 리플렉션 생성)
- **Direct buffer memory** — NIO off-heap 한도 초과(`-XX:MaxDirectMemorySize`)

## 흔한 오해

- **"GC 튜닝으로 모든 지연 해결"** — 근본적으로 메모리 할당이 많으면 GC 빈도가 높음. 객체 재사용, 풀링, 불변 설계가 우선
- **"큰 힙 = 안전"** — Full GC 길어짐. G1/ZGC 아니면 위험
- **"Survivor는 한 개면 된다"** — 복사 알고리즘 특성상 **두 개 교대**가 핵심
- **"CMS가 최신"** — JDK 14에서 제거됨. **G1이 현재 표준**
- **"Stop-the-World는 없어졌다"** — ZGC도 루트 스캔 등 일부 STW는 존재. 다만 **ms 미만**으로 짧음

## 면접 체크포인트

- JVM 힙의 Young/Old 분리 근거(세대 가설)
- Eden, Survivor, Old의 객체 이동 경로
- Minor GC와 Full GC의 범위, 비용 차이
- Survivor 영역이 두 개인 이유(복사 + 단편화 제거)
- G1GC의 Region 기반 설계가 해결하는 문제
- ZGC, Shenandoah가 초저지연을 달성하는 메커니즘(Colored Pointer, Load Barrier)
- GC 튜닝이 만능이 아닌 이유(할당 패턴이 근원)

## 출처
- [Oracle, JDK 1.4.1의 새 병렬, 동시 수집기](https://www.oracle.com/technical-resources/articles/javame/garbagecollection2.html)
- [Oracle Java 25, HotSpot GC Tuning Guide, Class Metadata](https://docs.oracle.com/en/java/javase/25/gctuning/other-considerations.html#GUID-F4188072-92FA-4A7C-BF5A-9EF7D32BC82B)
- [OpenJDK Wiki, Shenandoah Performance Guidelines and Diagnostics](https://wiki.openjdk.org/display/shenandoah/Main#Main-PerformanceGuidelinesandDiagnostics)
- [JEP 363 — Remove Concurrent Mark Sweep (OpenJDK)](https://openjdk.org/jeps/363)
- [JEP 333 — ZGC Experimental (OpenJDK)](https://openjdk.org/jeps/333)
- [JEP 377 — ZGC Production (OpenJDK)](https://openjdk.org/jeps/377)
- [JEP 379 — Shenandoah Production (OpenJDK)](https://openjdk.org/jeps/379)
- [JEP 439 — Generational ZGC (OpenJDK)](https://openjdk.org/jeps/439)
- [JEP 474 — Generational ZGC by Default (OpenJDK)](https://openjdk.org/jeps/474)
- [JEP 490 — Remove Non-Generational ZGC (OpenJDK)](https://openjdk.org/jeps/490)
- [daddyprogrammer — JVM GC](https://daddyprogrammer.org/post/2058/tech-terms-concept/)

## 관련 문서
- [[JVM-Architecture|JVM 아키텍처 (ClassLoader, Runtime Data Area, JIT)]]
- [[JVM-Container-Memory|JVM 컨테이너 메모리 (used vs committed, RAMPercentage, G1 uncommit)]]
- [[GC-Algorithm|GC 알고리즘 이론 (Tri-color Marking, Incremental, Concurrent, Work Stealing)]]
- [[Java-Backend-Fundamentals|Java 백엔드 면접 기초]]
- [[V8|V8 엔진 (JIT, Generational GC)]]
- [[OOM-Troubleshooting|Node.js OOM 트러블슈팅]]
- [[Call-Stack-Heap|콜 스택과 힙]]
