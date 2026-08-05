---
tags: [runtime, jvm, memory, container, g1gc, tuning]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["JVM Container Memory", "JVM 컨테이너 메모리", "used vs committed", "RAMPercentage"]
verified_at: 2026-07-21
---

# JVM 컨테이너 메모리 — used vs committed와 RAMPercentage

컨테이너에서 JVM 메모리가 내려오지 않는 것처럼 보일 때 첫 용의자는 힙 누수지만, 힙 커밋 정책이나 파일 캐시가 원인일 수도 있다. GC가 객체를 정리하면 used는 줄어도 committed(JVM이 사용할 수 있도록 확보한 힙 범위)는 유지될 수 있다. 다만 committed는 물리 상주량이 아니므로 RSS와 같다고 보면 안 된다. 페이지가 실제로 접근돼 resident가 됐는지와 힙 밖 메모리를 함께 봐야 한다.

## used vs committed vs RSS

- **used**: 현재 사용 중으로 보고된 힙 용량. 아직 GC되지 않은 도달 불가능 객체도 포함할 수 있으므로 live set과 동일하지 않으며, live set은 보통 GC 직후 지표로 추정한다.
- **committed**: JVM이 즉시 사용할 수 있도록 확보한 힙 용량. JVM 관점의 용량 지표이며 모든 페이지가 물리 RAM에 상주한다는 뜻은 아니다.
- **RSS**: 현재 물리 메모리에 resident인 프로세스 페이지. 접근된 힙 페이지와 metaspace, thread stack, code cache, native allocation 일부를 포함하지만 committed와 일대일 대응하지 않는다.
- 모니터링에서는 Heap Used, Heap Committed, Full GC 후 잔여 힙, 프로세스 RSS, 컨테이너 working set을 함께 본다. 어느 하나를 다른 지표의 대용으로 쓰지 않는다.

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
| 흔적 | 스택트레이스가 앱 로그에 남음 | 앱 로그 없이 SIGKILL — exit code 137 (128+9) |
| 판정 기준 | JVM이 인식하는 각 영역의 상한 | 컨테이너에 계정된 메모리 총합 vs limit |

- 반복 재시작에서 첫 갈림길은 exit code다. 137이면 JVM 로그를 아무리 뒤져도 원인이 없다 — `lastState.terminated.reason: OOMKilled`를 먼저 확인한다.
- K8s 문서 기준으로 memory limit은 커널 OOM kill로 **반응적으로** 강제된다. limit을 넘는 순간 즉시 죽는 것이 아니라 커널이 메모리 압박을 감지하고 회수에 실패할 때 종료되므로, 잠깐 넘고도 살아 있는 구간이 있을 수 있다.

## 상한은 합산으로 설계한다

- 커널이 보는 것은 힙이 아니라 컨테이너에 계정된 총합이다. 성분 정의는 [[Container-Memory-Metrics]]에서 다루고, 여기서는 그 총합을 전제로 힙 상한을 역산하는 문제만 본다.
- MaxRAMPercentage는 이 중 **힙 하나만** 정한다 (UseContainerSupport로 감지한 컨테이너 가용 메모리 대비 백분율). 힙 밖 소비가 수백 MB인 서비스에 높은 백분율을 주면 합산이 limit을 넘도록 설계된 셈이다 — JVM은 힙 상한까지 정상이라고 믿고, 커널은 총합으로 죽인다. 구체 수치는 아래 사례 절.
- 실질 힙 허용량은 역산한다: limit − (metaspace + direct buffer + thread stack + native + page cache 여유분). 힙 백분율은 이 값 아래로 낮춘다.
- 힙 밖 성분에도 상한을 명시한다. MaxMetaspaceSize와 MaxDirectMemorySize를 지정하지 않으면 해당 영역의 성장이 힙 상한과 무관하게 총합을 밀어 올린다 (MaxDirectMemorySize 미설정 시 JVM이 자동으로 정한다). 상한 3종을 함께 걸면 JVM이 직접 잡는 성분의 합은 고정되지만, page cache처럼 컨테이너에 계정되는 커널 성분은 별도 축으로 남는다 ([[Container-Memory-Metrics]]).

## 컨테이너 튜닝 접근

- 초기 힙과 최대 힙의 비율을 분리해, 커밋 풋프린트가 실사용을 따라가게 한다.
- 힙 상한을 정할 때는 **힙 밖 소비를 남겨둬야** 한다 — metaspace, thread stack, native에 더해 컨테이너 계정에는 page cache까지 잡힌다. 컨테이너 지표 축은 [[Container-Memory-Metrics]] 참고.
- 튜닝 검증은 배포 직후 수치가 아니라 며칠 뒤 고원에서 판단한다. 힙 커밋을 잡아도 다른 성분(page cache)이 남아 있으면 usage는 다시 오른다.

## 사례

75/75 설정으로 돌던 JVM 계산 서비스: live heap이 약 1GiB 수준인데 committed는 약 2.45GiB로 유지됐다. Initial 40 / Max 60으로 조정하자 committed가 약 1.12GiB로 즉시 개선되고 working set 비율은 99%에서 61%로 하락했다. 최종 설정은 40/60에 MaxMetaspaceSize 512M, G1NewSizePercent 20 / G1MaxNewSizePercent 30, memory limit 3.5G. 다만 JVM 튜닝만으로 working set은 안정됐지만 usage는 파일 로그 page cache 때문에 다시 상승해, 두 축을 함께 조치해야 지표가 함께 내려왔다 ([[Container-Memory-Metrics]] 사례와 같은 시스템 — SSG 프로모션 서비스).

합산 초과형 OOMKilled 사례 (Nextree 분석): memory limit 1Gi(= 1,024MiB, 이하 MiB 기준)에 MaxRAMPercentage 80이면 힙 상한이 약 819MiB다. 여기에 실측 non-heap 약 200MiB만 더해도 약 1,019MiB이고, off-heap과 thread stack이 그 위에 얹히면 limit을 넘는 구조였다. 힙 백분율을 60(약 614MiB)으로 낮추고 MaxMetaspaceSize 192m, MaxDirectMemorySize 140m을 명시해(각각 실측 사용량 122MiB, 108MiB에 여유를 둔 값) 합산을 limit 아래로 고정했다. 임계 백분율은 그 서비스의 힙 밖 실측에서 역산한 값이지 일반 권장치가 아니다.

## 면접 체크포인트

- used와 committed의 차이, 모니터링에서 어느 쪽을 봐야 하는가
- Initial과 Max를 같은 높은 비율로 두면 생기는 현상 (커밋 ramp-up 후 고원)과 그것이 누수처럼 보이는 이유
- G1이 힙을 OS에 잘 반환하지 않는 이유 (반환 검토 시점의 희소성, Full GC 회피)
- JEP 346이 해결한 문제와 도입 버전 (JDK 12), 기본 설정으로는 동작하지 않는다는 점
- 컨테이너에서 힙 상한을 정할 때 고려할 힙 밖 소비 (metaspace, thread, native, page cache)
- exit code 137과 OutOfMemoryError 로그의 구분 — 반복 재시작 진단의 첫 갈림길
- MaxRAMPercentage가 힙만 제한한다는 함정과 실질 힙 허용량 역산

## 출처

- [돌아오지 않는 메모리를 찾아서 — SSG TECH BLOG](https://medium.com/ssgtech/%EB%8F%8C%EC%95%84%EC%98%A4%EC%A7%80-%EC%95%8A%EB%8A%94-%EB%A9%94%EB%AA%A8%EB%A6%AC%EB%A5%BC-%EC%B0%BE%EC%95%84%EC%84%9C-6988f6d55066)
- [JEP 346: Promptly Return Unused Committed Memory from G1 — OpenJDK](https://openjdk.org/jeps/346) (반환은 Full GC나 concurrent cycle에서만, 주기 반환 기본 비활성, JDK 12 도입)
- [Garbage-First Garbage Collector Tuning — Oracle Java SE Docs](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-garbage-collector-tuning.html) (G1NewSizePercent 등 튜닝 옵션, Xms=Xmx 리사이즈 제거)
- [OpenJDK hotspot-gc-dev — committed memory and RSS are different quantities](https://mail.openjdk.org/pipermail/hotspot-gc-dev/2020-July/030387.html)
- [Java MemoryUsage API](https://docs.oracle.com/en/java/javase/24/docs/api/java.management/java/lang/management/MemoryUsage.html)
- [Resource Management for Pods and Containers — Kubernetes Docs](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) (memory limit은 커널 OOM kill로 반응적 강제)
- [java Command Reference — Oracle Java SE Docs](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html) (UseContainerSupport 컨테이너 감지, MaxDirectMemorySize는 NIO direct buffer 총량 상한이며 미설정 시 JVM 자동 결정)
- [Kubernetes 환경 OOMKilled 원인 분석 — Nextree](https://www.nextree.io/kubernetes-hwangyeong-oomkilled-weonin-bunseog/)

## 관련 문서

- [[Container-Memory-Metrics|컨테이너 메모리 지표 해석 (usage, working set, page cache)]]
- [[JVM-GC|JVM GC (G1 구조, 수집기)]]
- [[JVM-Architecture|JVM 아키텍처 (Runtime Data Area)]]
- [[K8s-Resource-Right-Sizing|K8s Resource Right-Sizing (P95 역산)]]
- [[K8s-Configuration-Storage-and-Probes|K8s 설정과 probe (반복 restart 진단)]]
- [[Jib-Java-Container|Jib (Java 컨테이너 이미지)]]
