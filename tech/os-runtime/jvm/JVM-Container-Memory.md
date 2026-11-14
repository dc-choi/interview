---
tags: [runtime, jvm, memory, container, g1gc, tuning]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["JVM Container Memory", "JVM 컨테이너 메모리", "used vs committed", "RAMPercentage"]
verified_at: 2026-11-14
---

# JVM 컨테이너 메모리 — used vs committed와 RAMPercentage

컨테이너에서 JVM 메모리가 내려오지 않는 것처럼 보일 때 첫 용의자는 힙 누수지만, 힙 커밋 정책이나 파일 캐시가 원인일 수도 있다. GC가 객체를 정리하면 used는 줄어도 committed(JVM이 사용할 수 있도록 확보한 힙 범위)는 유지될 수 있다. 다만 committed는 물리 상주량이 아니므로 RSS와 같다고 보면 안 된다. 페이지가 실제로 접근돼 resident가 됐는지와 힙 밖 메모리를 함께 봐야 한다.

## used vs committed vs RSS

- **used**: 현재 사용 중으로 보고된 힙 용량. 아직 GC되지 않은 도달 불가능 객체도 포함할 수 있으므로 live set과 동일하지 않으며, live set은 보통 GC 직후 지표로 추정한다.
- **committed**: JVM이 즉시 사용할 수 있도록 확보한 힙 용량. JVM 관점의 용량 지표이며 모든 페이지가 물리 RAM에 상주한다는 뜻은 아니다.
- **RSS**: 현재 물리 메모리에 resident인 프로세스 페이지. 접근된 힙 페이지와 metaspace, thread stack, code cache, native allocation 일부를 포함하지만 committed와 일대일 대응하지 않는다.
- 모니터링에서는 Heap Used, Heap Committed, Full GC 후 잔여 힙, 프로세스 RSS, 컨테이너 working set을 함께 본다. 어느 하나를 다른 지표의 대용으로 쓰지 않는다.

### 애플리케이션 안에서 읽는 heap 값

`Runtime.getRuntime()`의 세 값은 이 문서의 heap 축에 이렇게 대응한다.

| API | Java SE 문서의 정의 | 대응 |
|---|---|---|
| `maxMemory()` | JVM이 사용을 시도할 최대 메모리. 고유한 상한이 없으면 `Long.MAX_VALUE` | heap max |
| `totalMemory()` | JVM의 현재 총 메모리. 실행 환경에 따라 시간이 지나며 변함 | committed |
| `freeMemory()` | 그중 아직 쓰지 않은 부분. GC 뒤 커질 수 있음 | committed - used |
| `totalMemory() - freeMemory()` | 계산값 | used |

- `totalMemory()`를 사용량이나 상한으로 읽지 않는다. committed라서 GC 뒤 used가 내려가도 그대로 유지될 수 있다. MemoryMXBean의 heap committed와 같은 축이지만 계산 경로가 달라 값이 조금 다를 수 있다(아래 JDK 21 G1 실행에서 66MiB와 64MiB).
- `maxMemory()`는 `-Xmx`나 MaxRAMPercentage로 정한 최대 heap을 기준으로 하지만 수집기에 따라 작게 보고된다. JDK 21(Corretto 21.0.3)에서 `-Xmx512m`으로 실행하면 G1은 512MiB, Parallel은 455MiB, Serial은 494MiB를 반환했고 MemoryMXBean의 heap max도 같았다. HotSpot은 이 값을 heap의 `max_capacity()`에서 가져온다.
- 세 값 모두 heap만 본다. container memory limit과 비교할 때는 metaspace, thread stack, direct memory 같은 non-heap을 더한다(아래 합산 설계 절).
- 순간값이라 GC 시점에 따라 흔들린다. 판단은 Micrometer 기본 이름 기준 `jvm.memory.used`, `jvm.memory.committed`, `jvm.memory.max`의 추이와 GC 직후 잔여 heap으로 한다. 이런 값을 HTTP로 보여 주는 진단 endpoint는 운영에서 외부에 열지 않는다([[Spring-Boot-Actuator-Operations]]).

## RAMPercentage 설정의 함정

- InitialRAMPercentage와 MaxRAMPercentage를 같은 값(예: 75/75)으로 두면 계산된 초기 힙과 최대 힙이 같아질 수 있다. 이는 큰 힙 용량을 일찍 확보하게 하지만 모든 페이지가 즉시 RSS가 된다는 뜻은 아니다.
- 트래픽이 한 번 오른 뒤 live heap이 다시 내려와도 committed는 상한 근처까지 올라간 뒤 오래 유지된다.
- 근본 조치는 JDK 버전 업그레이드가 아니라 **상한 자체를 서비스 실사용에 맞게 낮추는 것**이다.

## G1이 힙을 잘 돌려주지 않는 이유

- G1은 Full GC뿐 아니라 자연스럽게 시작된 concurrent cycle 뒤에도 힙 크기 조정과 미사용 region 반환을 검토할 수 있다. 다만 유휴 상태에서는 allocation이 적어 concurrent cycle 자체가 시작되지 않을 수 있어 committed heap이 오래 유지될 수 있다.
- JEP 346은 **JDK 12부터** 유휴 시간에도 주기적으로 concurrent cycle을 시작해 미사용 committed memory를 더 신속하게 반환하는 기능을 추가했다. 이는 JDK 11에서 Full GC만이 유일한 반환 경로였다는 뜻이 아니라, 낮은 활동에서 반환 기회를 만들었다는 뜻이다.
- 이후 버전도 설정과 부하에 따라 반환 시점이 달라진다. `G1PeriodicGCInterval`, 시스템 부하 조건, `-Xms`와 `-Xmx` 관계를 확인하고 실제 committed와 RSS 변화로 검증한다.

## OOM vs OOMKilled

| 구분 | OutOfMemoryError | OOMKilled |
|---|---|---|
| 발생 주체 | JVM 내부 (힙, metaspace 등 영역 고갈) | 커널 (cgroup limit 초과) |
| 흔적 | 스택트레이스가 앱 로그에 남음 | 커널 OOM kill이면 termination reason이 `OOMKilled`이고 SIGKILL 결과로 exit code 137이 나타날 수 있음 |
| 판정 기준 | JVM이 인식하는 각 영역의 상한 | 컨테이너에 계정된 메모리 총합 vs limit |

- 반복 재시작에서는 container termination reason, runtime event와 memory 지표를 먼저 본다. exit code 137은 SIGKILL 결과일 뿐 OOM 증거가 아니며 grace timeout, 수동 kill 등도 가능하다. `lastState.terminated.reason: OOMKilled`와 cgroup memory event가 확인될 때 커널 OOM kill로 판단하고, 이 경우 JVM이 stacktrace를 남기지 못할 수 있다.
- K8s 문서 기준으로 memory limit은 커널 OOM kill로 **반응적으로** 강제된다. limit을 넘는 순간 즉시 죽는 것이 아니라 커널이 메모리 압박을 감지하고 회수에 실패할 때 종료되므로, 잠깐 넘고도 살아 있는 구간이 있을 수 있다.

## 상한은 합산으로 설계한다

- 커널이 보는 것은 힙이 아니라 컨테이너에 계정된 총합이다. 성분 정의는 [[Container-Memory-Metrics]]에서 다루고, 여기서는 그 총합을 전제로 힙 상한을 역산하는 문제만 본다.
- MaxRAMPercentage는 이 중 **힙 하나만** 정한다 (UseContainerSupport로 감지한 컨테이너 가용 메모리 대비 백분율). 힙 밖 소비가 수백 MB인 서비스에 높은 백분율을 주면 합산이 limit을 넘도록 설계된 셈이다 — JVM은 힙 상한까지 정상이라고 믿고, 커널은 총합으로 죽인다. 구체 수치는 아래 사례 절.
- 실질 힙 허용량은 역산한다: limit − (metaspace + direct buffer + thread stack + native + page cache 여유분). 힙 백분율은 이 값 아래로 낮춘다.
- 힙 밖 성분에도 상한을 검토한다. MaxMetaspaceSize와 MaxDirectMemorySize는 각각 metaspace와 NIO direct buffer 용량만 제한한다. 힙, metaspace와 direct buffer 상한을 모두 지정해도 thread stack, code cache, GC 구조와 그 밖의 native allocation은 남으므로 JVM native memory 총합이 고정되지는 않는다. Native Memory Tracking과 container 지표로 나머지 성분을 측정한다 ([[Container-Memory-Metrics]]).

## CPU 수 인식도 힙 밖 메모리를 바꾼다

JVM이 계산한 사용 가능 CPU 수(`Runtime.availableProcessors()`의 값)는 GC thread, `ForkJoinPool` 같은 thread pool 크기의 기본값에 쓰이고, 라이브러리도 이 값으로 event loop thread나 buffer 수를 정하는 경우가 많다. 그래서 CPU 수를 크게 인식하면 힙 설정은 그대로여도 thread stack과 native allocation이 늘어 컨테이너 총합이 limit을 넘을 수 있다.

- OpenJDK 변경 8281181은 Linux cgroup의 CPU shares를 active processor count 계산에서 뺐다. 이전에는 CPU quota가 없으면 shares 값으로 CPU 수를 줄였는데, 이후에는 quota가 없으면 shares를 무시하고 프로세스에 허용된 CPU 수(cpuset 등으로 제한하지 않았으면 host 전체)를 쓴다. 메인라인은 이전 동작을 되돌리는 `-XX:+UseContainerCpuShares`(기본 false)를 deprecated로 추가했고, 특수 플래그 목록에 JDK 19 deprecated, 20 obsolete, 21 expired로 등록했다.
- 업데이트 릴리스에도 들어갔다. jdk17u 태그를 비교하면 17.0.4.1에는 이 플래그가 없고 17.0.5부터 기본 false로 들어 있으며, jdk11u도 11.0.16.1에는 없고 11.0.17부터 있다. 그래서 같은 메이저 버전 안의 패치 업데이트만으로도 동작이 바뀐다.
- 영향받는 구성은 CPU limit(quota) 없이 request만 준 Pod처럼, CPU request가 cgroup shares(가중치)로만 반영된 컨테이너다. 업그레이드 전에는 4로 보던 프로세스가 64코어 host에서 64로 볼 수 있다. CPU request만 두는 Kubernetes 설정은 [[K8s-Configuration-Storage-and-Probes|K8s 설정과 probe]]에서, 가용 코어 수로 thread pool을 정하는 방법은 [[Thread-Pool-Sizing|Thread Pool 크기 산정]]에서 다룬다.
- 대응은 컨테이너 안에서 `availableProcessors()`와 GC thread 수를 업그레이드 전후로 비교하는 것부터다. 의도한 수가 있으면 `-XX:ActiveProcessorCount=N`으로 고정한다. 이 옵션은 GC와 `ForkJoinPool` 등의 thread pool 크기 계산에 쓸 CPU 수를 덮어쓰며, `UseContainerSupport`가 꺼져 있어도 적용된다. `UseContainerCpuShares`는 메인라인에서 제거된 임시 플래그라 장기 해법으로 쓰지 않는다. 이 변경 시점의 `arguments.cpp` 기준 obsolete 플래그는 경고 뒤 값이 무시되고 expired 플래그는 인식되지 않으므로, 17에서 넣은 이 플래그는 21 이상으로 옮기기 전에 `ActiveProcessorCount`로 바꾼다(실행 시험은 하지 않음). jdk-17.0.5-ga의 특수 플래그 목록에는 이 플래그가 없어 17에서는 미리 deprecated 경고를 받지 못할 수 있다.

사례: JDK 8과 11에서 17로 수천 개 서비스를 옮긴 대규모 마이그레이션에서, CPU shares로 CPU를 배정하던 컨테이너가 17.0.5 뒤 host 코어 수를 인식했다. GC와 compiler thread, thread pool과 Netty 같은 라이브러리의 buffer가 커지면서 off-heap 사용이 늘어 컨테이너 OOM kill이 이어졌고, 이전 동작을 되돌리는 플래그로 복구했다.

## 컨테이너 튜닝 접근

- 초기 힙과 최대 힙의 비율을 분리해, 커밋 풋프린트가 실사용을 따라가게 한다.
- 힙 상한을 정할 때는 **힙 밖 소비를 남겨둬야** 한다 — metaspace, thread stack, native에 더해 컨테이너 계정에는 page cache까지 잡힌다. 컨테이너 지표 축은 [[Container-Memory-Metrics]] 참고.
- 튜닝 검증은 배포 직후 수치가 아니라 며칠 뒤 고원에서 판단한다. 힙 커밋을 잡아도 다른 성분(page cache)이 남아 있으면 usage는 다시 오른다.

## 사례

75/75 설정으로 돌던 JVM 계산 서비스: live heap이 약 1GiB 수준인데 committed는 약 2.45GiB로 유지됐다. Initial 40 / Max 60으로 조정하자 committed가 약 1.12GiB로 즉시 개선되고 working set 비율은 99%에서 61%로 하락했다. 최종 설정은 40/60에 MaxMetaspaceSize 512M, G1NewSizePercent 20 / G1MaxNewSizePercent 30, memory limit 3.5G. 다만 JVM 튜닝만으로 working set은 안정됐지만 usage는 파일 로그 page cache 때문에 다시 상승해, 두 축을 함께 조치해야 지표가 함께 내려왔다 ([[Container-Memory-Metrics]] 사례와 같은 시스템 — SSG 프로모션 서비스).

합산 초과형 OOMKilled 사례 (Nextree 분석): memory limit 1Gi(= 1,024MiB, 이하 MiB 기준)에 MaxRAMPercentage 80이면 힙 상한이 약 819MiB다. 여기에 실측 non-heap 약 200MiB만 더해도 약 1,019MiB이고, off-heap과 thread stack이 그 위에 얹히면 limit을 넘는 구조였다. 힙 백분율을 60(약 614MiB)으로 낮추고 MaxMetaspaceSize 192m, MaxDirectMemorySize 140m을 명시해(각각 실측 사용량 122MiB, 108MiB에 여유를 둔 값) 관측 기간의 총사용량을 limit 아래로 낮췄다. 제한하지 않은 thread stack, code cache, GC와 기타 native 증가를 계속 관측하고 headroom을 둔다. 임계 백분율은 그 서비스의 힙 밖 실측에서 역산한 값이지 일반 권장치가 아니다.

## 면접 체크포인트

- used와 committed의 차이, 모니터링에서 어느 쪽을 봐야 하는가
- Initial과 Max를 같은 높은 비율로 두면 생기는 현상 (커밋 ramp-up 후 고원)과 그것이 누수처럼 보이는 이유
- G1이 힙을 OS에 잘 반환하지 않는 이유 (반환 검토 시점의 희소성, Full GC 회피)
- JEP 346이 해결한 문제와 도입 버전 (JDK 12), 기본 설정으로는 동작하지 않는다는 점
- 컨테이너에서 힙 상한을 정할 때 고려할 힙 밖 소비 (metaspace, thread, native, page cache)
- exit code 137만으로 OOMKilled를 단정할 수 없는 이유와 JVM OutOfMemoryError의 구분
- MaxRAMPercentage가 힙만 제한한다는 함정과 실질 힙 허용량 역산
- JDK 업데이트 뒤 같은 컨테이너에서 OOMKilled가 늘었을 때 CPU 수 인식 변화를 의심하는 이유와 `ActiveProcessorCount`로 고정하는 방법

## 출처

- [돌아오지 않는 메모리를 찾아서 — SSG TECH BLOG](https://medium.com/ssgtech/%EB%8F%8C%EC%95%84%EC%98%A4%EC%A7%80-%EC%95%8A%EB%8A%94-%EB%A9%94%EB%AA%A8%EB%A6%AC%EB%A5%BC-%EC%B0%BE%EC%95%84%EC%84%9C-6988f6d55066)
- [JEP 346: Promptly Return Unused Committed Memory from G1 — OpenJDK](https://openjdk.org/jeps/346) (반환은 Full GC나 concurrent cycle에서만, 주기 반환 기본 비활성, JDK 12 도입)
- [Oracle Java SE Docs, Garbage-First Garbage Collector Tuning](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-garbage-collector-tuning.html) (G1NewSizePercent 등 튜닝 옵션, Xms=Xmx 리사이즈 제거)
- [OpenJDK hotspot-gc-dev — committed memory and RSS are different quantities](https://mail.openjdk.org/pipermail/hotspot-gc-dev/2020-July/030387.html)
- [Java MemoryUsage API](https://docs.oracle.com/en/java/javase/24/docs/api/java.management/java/lang/management/MemoryUsage.html)
- [Oracle Java SE 25 Docs, Runtime](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Runtime.html) (`maxMemory`, `totalMemory`, `freeMemory` 정의)
- [jvm.cpp — OpenJDK GitHub](https://github.com/openjdk/jdk/blob/master/src/hotspot/share/prims/jvm.cpp) (`JVM_TotalMemory`는 heap `capacity()`, `JVM_MaxMemory`는 `max_capacity()`)
- [MicrometerJvmMemoryMeterConventions.java — Micrometer GitHub](https://github.com/micrometer-metrics/micrometer/blob/main/micrometer-core/src/main/java/io/micrometer/core/instrument/binder/jvm/convention/micrometer/MicrometerJvmMemoryMeterConventions.java) (`jvm.memory.used`, `committed`, `max`)
- [인프런, 김영한, 자동 구성 직접 만들기 - 기반 예제](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148098)
- [인프런, 김영한, @Conditional](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148099)
- [Kubernetes Docs, Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) (memory limit은 커널 OOM kill로 반응적 강제)
- [Kubernetes Docs, Pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Oracle Java SE Docs, java Command Reference](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html) (UseContainerSupport 컨테이너 감지, MaxDirectMemorySize는 NIO direct buffer 총량 상한이며 미설정 시 JVM 자동 결정, 2026-11-14 ActiveProcessorCount의 thread pool 크기 계산용 CPU 수 덮어쓰기 대조)
- [Oracle Java SE Docs, Native Memory Tracking](https://docs.oracle.com/en/java/javase/24/vm/native-memory-tracking.html)
- [Kubernetes 환경 OOMKilled 원인 분석 — Nextree](https://www.nextree.io/kubernetes-hwangyeong-oomkilled-weonin-bunseog/)
- [8281181: Do not use CPU Shares to compute active processor count — OpenJDK GitHub](https://github.com/openjdk/jdk/commit/e07fd395bdc314867886a621ec76cf74a5f76b89) (2026-11-14 `active_processor_count`의 shares 제외, `UseContainerCpuShares` 기본값과 JDK 19, 20, 21 단계 대조. obsolete와 expired의 처리는 같은 revision의 [arguments.cpp](https://github.com/openjdk/jdk/blob/e07fd395bdc314867886a621ec76cf74a5f76b89/src/hotspot/share/runtime/arguments.cpp))
- [globals_linux.hpp — OpenJDK jdk17u GitHub](https://github.com/openjdk/jdk17u/blob/jdk-17.0.5-ga/src/hotspot/os/linux/globals_linux.hpp) (2026-11-14 jdk-17.0.5-ga 태그의 `UseContainerCpuShares` 정의 확인, jdk11u는 jdk-11.0.17-ga 태그 기준)
- [Java Modernization @ LinkedIn — JavaOne 2026, Vivek Deshpande, Yingbo Liu](https://www.youtube.com/watch?v=Sw5-c8-lmy0) (JDK 17 마이그레이션 중 CPU 수 인식 변화로 생긴 컨테이너 OOM 사례)

## 관련 문서

- [[Container-Memory-Metrics|컨테이너 메모리 지표 해석 (usage, working set, page cache)]]
- [[JVM-GC|JVM GC (G1 구조, 수집기)]]
- [[JVM-Architecture|JVM 아키텍처 (Runtime Data Area)]]
- [[K8s-Resource-Right-Sizing|K8s Resource Right-Sizing (P95 역산)]]
- [[K8s-Configuration-Storage-and-Probes|K8s 설정과 probe (반복 restart 진단)]]
- [[Jib-Java-Container|Jib (Java 컨테이너 이미지)]]
