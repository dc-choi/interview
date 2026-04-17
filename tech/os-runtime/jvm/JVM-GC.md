---
tags: [runtime, jvm, gc, java, young-gen, old-gen, g1gc, zgc]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["JVM GC", "JVM Garbage Collection", "Java GC"]
---

# JVM Garbage Collection

JVM의 GC는 **힙에서 더 이상 참조되지 않는 객체를 찾아 해제**하는 과정. 개발자가 `free`·`delete`를 직접 호출하지 않는 대신 JVM이 이 책임을 지며, **세대 가설(Generational Hypothesis)** 과 다양한 GC 알고리즘으로 시간·공간을 절충한다. 알고리즘 이론과 Tri-color Marking·Incremental·Concurrent 같은 **현대 GC 공통 기법**은 [[GC-Algorithm]]에 있고, 이 문서는 **JVM 고유의 메모리 구조·수집기**에 초점을 둔다.

## JVM 메모리 구조

- **Heap** — 객체 인스턴스가 저장되는 GC 대상 영역
  - **Young Generation**
    - **Eden** — 새 객체가 처음 할당되는 공간
    - **Survivor 0 / Survivor 1 (from/to)** — Minor GC에서 살아남은 객체가 이동하는 두 구역 (하나는 항상 비어 있음)
  - **Old Generation(Tenured)** — Young을 여러 번 살아남은 장수 객체
- **Metaspace**(Java 8+, 이전의 PermGen 대체) — 클래스 메타데이터·메서드 바이트코드. 네이티브 메모리에 있어 힙과 별도 관리
- **Stack** — 스레드별 메서드 호출 프레임(GC 대상 아님)
- **Code Cache** — JIT 컴파일된 네이티브 코드

GC는 **Heap만** 대상으로 한다. Metaspace는 클래스 언로딩 시에만 정리.

## 세대 가설과 분리 설계

"대부분의 객체는 **할당 직후 금방 죽는다**". JVM은 이 가설에 맞춰 Young과 Old를 분리하고 **다른 알고리즘·빈도**로 처리.

- **Young**: 자주 빠르게 쓸어냄(Minor GC) — 대부분이 쓰레기
- **Old**: 드물게, 전체를 정교하게 쓸어냄(Major/Full GC) — 살아있는 객체 비율이 높음

## 객체의 수명 경로

1. 새 객체 → **Eden** 할당
2. Eden이 차면 **Minor GC** 발생
   - 살아남은 객체는 Survivor(from)로 복사, Eden 비움
   - 다음 Minor GC에서는 Survivor(from) + Eden의 생존자를 Survivor(to)로 복사
   - from ↔ to 역할 교대
3. Survivor에서 **특정 횟수(`-XX:MaxTenuringThreshold`, 기본 15) 이상 살아남으면** Old로 **승격(Promotion)**
4. Old가 가득 차면 **Major/Full GC** 발생

Survivor 두 개를 교대로 쓰는 이유는 **복사(copy) 방식으로 단편화를 자연스럽게 제거**하기 위함. 단일 Survivor로는 이동 대상과 여유 공간이 섞여 단편화.

## Minor GC vs Major/Full GC

| 구분 | 범위 | 빈도 | 지연 | 알고리즘 |
|---|---|---|---|---|
| **Minor GC** | Young | 잦음 | 수 ms | Copy (생존자만 복사) |
| **Major GC** | Old | 드묾 | 수십~수백 ms | Mark-Sweep-Compact 또는 Region 기반 |
| **Full GC** | Young + Old + Metaspace | 가장 드묾 | 수초 가능 | 전체 스캔, STW 긺 |

"Full GC가 돈다" = **Stop-the-World가 길게 잡힌다** = 서비스 응답이 일시 정지. 운영에서 가장 피하고 싶은 이벤트.

## Stop-the-World (STW)

GC 수행 중 **모든 애플리케이션 스레드를 일시 정지**시키는 구간. 루트 스캔·객체 이동 시 일관성을 보장하기 위해 필요.

- STW 길이 = **힙 크기·살아있는 객체 수·수집기 알고리즘**에 비례
- 지연 민감 서비스(결제·트레이딩·게임)에서 가장 큰 병목
- 최신 GC(ZGC·Shenandoah)는 STW를 **밀리초 미만**으로 축소

## GC 알고리즘 계보

| 수집기 | 도입 | 특징 | 용도 |
|---|---|---|---|
| **Serial** | 전통 | 단일 스레드, Mark-Sweep-Compact | 소형 앱·싱글 코어 |
| **Parallel (Throughput)** | JDK 5 | 멀티 스레드 Young+Old | 배치·처리량 중심 |
| **CMS** (Concurrent Mark Sweep) | JDK 5~14 | Old를 **동시 마킹**으로 STW 축소 | 응답 지연 민감 앱(Deprecated) |
| **G1** (Garbage-First) | JDK 7~, 기본(JDK 9+) | **Region 기반**, 예측 가능 pause, Old도 동시 처리 | 일반 대형 힙(4~32GB)의 표준 |
| **ZGC** | JDK 11~, Production(JDK 15+) | **서브 ms STW**, TB급 힙 지원, Colored Pointer | 초저지연·초대형 힙 |
| **Shenandoah** | JDK 12~(OpenJDK) | Concurrent Compaction, ZGC와 유사한 저지연 | 초저지연 대안 |
| **Epsilon** | JDK 11~ | **아무것도 회수 안 함** | 단기 벤치마크·메모리 분석 |

## G1GC (현대 표준)

힙을 수백~수천 개의 동일 크기 **Region**으로 나누고, 각 리전을 Young/Old/Humongous 중 하나로 할당.

- **Garbage-First**: 회수율이 가장 높은 Region부터 처리 → 적은 노력으로 최대 공간 확보
- **MaxGCPauseMillis**: 목표 STW를 설정하면 G1이 Region 수를 그에 맞춰 조절(soft target)
- 큰 객체는 연속된 여러 Region에 걸친 **Humongous Object**로 별도 처리
- Old 수집도 **Concurrent Marking**으로 길게 멈추지 않음
- JDK 9+의 기본 수집기

## ZGC · Shenandoah (초저지연)

- **Colored Pointer / Load Barrier** — 포인터에 메타 비트를 심어 마킹·이동을 **앱 스레드와 동시**에
- **Concurrent Compaction** — 압축(이동)도 동시에 수행. 전통 GC는 STW 중에만 가능
- 힙 **수 TB 규모**에서도 STW 수 ms 이하
- CPU·배리어 오버헤드가 있어 처리량은 G1보다 약간 낮을 수 있음

## 튜닝 포인트

### 힙 크기

- `-Xms` 초기, `-Xmx` 최대. 보통 같은 값으로 → 런타임 리사이즈 비용 제거
- 너무 크면 Full GC가 드물지만 **한 번 돌 때 길어짐** → 지연 민감 서비스는 중간 크기 + G1/ZGC

### 세대 비율

- `-XX:NewRatio`(Old/Young 비율), `-XX:SurvivorRatio`(Eden/Survivor)
- 단명 객체가 많으면 Young을 키우고, 장수 객체가 많으면 Old를 키움
- 현대 수집기(G1·ZGC)는 Region 동적 관리로 이 튜닝 중요도가 낮아짐

### 승격 임계값

- `-XX:MaxTenuringThreshold` — Survivor를 몇 번 살아남으면 Old로 승격할지
- 너무 낮으면 단명 객체까지 Old로 가서 Full GC 증가

### GC 수집기 선택

- 처리량 중심 → Parallel
- 일반 응답시간 · 대형 힙 → **G1 (기본)**
- 초저지연 · 초대형 힙 → ZGC / Shenandoah

## 진단 도구

- **GC 로그**: `-Xlog:gc*:file=gc.log` (JDK 9+ 통합 로그)
- **JVisualVM / JConsole** — JMX 기반 실시간 모니터링
- **JFR (Java Flight Recorder)** — 저비용 상시 프로파일링
- **힙 덤프**: `-XX:+HeapDumpOnOutOfMemoryError`, `jmap -dump:live,format=b`
- **GCeasy · gceasy.io** — GC 로그 자동 분석
- **APM(Datadog·NewRelic·Pinpoint)** — GC 시간·횟수를 메트릭으로

## OutOfMemoryError 패턴

- **Java heap space** — Old Gen 가득. 누수 or 힙 부족
- **GC overhead limit exceeded** — GC가 98% 시간을 차지하는데 2% 미만만 회수 → 사실상 메모리 부족
- **Metaspace** — 클래스 무한 로딩(동적 프록시 과다·리플렉션 생성)
- **Direct buffer memory** — NIO off-heap 한도 초과(`-XX:MaxDirectMemorySize`)

## 흔한 오해

- **"GC 튜닝으로 모든 지연 해결"** — 근본적으로 메모리 할당이 많으면 GC 빈도가 높음. 객체 재사용·풀링·불변 설계가 우선
- **"큰 힙 = 안전"** — Full GC 길어짐. G1/ZGC 아니면 위험
- **"Survivor는 한 개면 된다"** — 복사 알고리즘 특성상 **두 개 교대**가 핵심
- **"CMS가 최신"** — JDK 14에서 제거됨. **G1이 현재 표준**
- **"Stop-the-World는 없어졌다"** — ZGC도 루트 스캔 등 일부 STW는 존재. 다만 **ms 미만**으로 짧음

## 면접 체크포인트

- JVM 힙의 Young/Old 분리 근거(세대 가설)
- Eden·Survivor·Old의 객체 이동 경로
- Minor GC와 Full GC의 범위·비용 차이
- Survivor 영역이 두 개인 이유(복사 + 단편화 제거)
- G1GC의 Region 기반 설계가 해결하는 문제
- ZGC·Shenandoah가 초저지연을 달성하는 메커니즘(Colored Pointer·Load Barrier)
- GC 튜닝이 만능이 아닌 이유(할당 패턴이 근원)

## 출처
- [daddyprogrammer — JVM GC](https://daddyprogrammer.org/post/2058/tech-terms-concept/)

## 관련 문서
- [[JVM-Architecture|JVM 아키텍처 (ClassLoader·Runtime Data Area·JIT)]]
- [[GC-Algorithm|GC 알고리즘 이론 (Tri-color Marking · Incremental · Concurrent · Work Stealing)]]
- [[Java-Backend-Fundamentals|Java 백엔드 면접 기초]]
- [[V8|V8 엔진 (JIT · Generational GC)]]
- [[OOM-Troubleshooting|Node.js OOM 트러블슈팅]]
- [[Call-Stack-Heap|콜 스택과 힙]]
