---
tags: [runtime, jvm, memory, container, g1gc, tuning]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["JVM Container Memory", "JVM 컨테이너 메모리", "used vs committed", "RAMPercentage"]
verified_at: 2026-07-16
---

# JVM 컨테이너 메모리 — used vs committed와 RAMPercentage

컨테이너에서 JVM 메모리가 내려오지 않는 것처럼 보일 때 첫 용의자는 힙 누수지만, 실제 범인은 힙 커밋 정책인 경우가 많다. GC가 객체를 정리하면 used는 줄어도 committed(JVM이 OS에 예약해 둔 힙)는 그대로 유지되는 경우가 많고, 프로세스 RSS는 committed를 기준으로 커진다. 돌아오지 않는 메모리의 정체가 누수가 아니라 반환하지 않는 예약인 것이다.

## used vs committed vs RSS

- **used**: live 객체가 실제로 차지하는 힙.
- **committed**: JVM이 OS로부터 커밋해 둔 힙. GC 후 used가 내려가도 committed는 유지되는 경우가 많다.
- **RSS**: committed heap에 metaspace, thread stack, code cache 같은 힙 밖 영역까지 더한 프로세스 물리 점유.
- 모니터링에서 봐야 할 것은 Heap Used가 아니라 **Heap Committed와 Full GC 후 잔여 힙**이다. used만 보면 커밋이 만든 고원을 놓친다.

## RAMPercentage 설정의 함정

- InitialRAMPercentage와 MaxRAMPercentage를 같은 값(예: 75/75)으로 두면 컨테이너 limit의 75%를 최대 힙으로 잡고 초기 힙도 같은 비율로 시작한다. G1은 그 상한을 향해 region 단위로 힙을 커밋해 간다.
- 트래픽이 한 번 오른 뒤 live heap이 다시 내려와도 committed는 상한 근처까지 올라간 뒤 오래 유지된다.
- 근본 조치는 JDK 버전 업그레이드가 아니라 **상한 자체를 서비스 실사용에 맞게 낮추는 것**이다.

## G1이 힙을 잘 돌려주지 않는 이유

- G1은 힙 크기 조정과 반환을 주로 **Full GC나 concurrent cycle 종료(Remark 등) 시점**에 검토한다. 할당이 계속 이어지고 G1 자체가 Full GC를 피하도록 설계돼 있어, 빈 region을 OS에 반환할 기회가 실전에서는 드물다.
- 유휴 시 미사용 커밋 힙을 주기적으로 반환하는 메커니즘(JEP 346, Periodic GC)은 **JDK 12부터** 도입됐다. JDK 11에서는 외부에서 Full GC를 강제하지 않는 한 committed가 상한 근처에서 오래 유지되는 패턴이 자연스럽다.
- 이후 버전이라고 자동 해결은 아니다 — 주기 반환은 도입 시점부터 기본 비활성이라 설정으로 켜야 동작하고, 사례 분석 시점 기준 JDK 21 G1도 기본 설정에서는 커밋을 오래 유지하는 패턴이 보고된다.

## 컨테이너 튜닝 접근

- 초기 힙과 최대 힙의 비율을 분리해, 커밋 풋프린트가 실사용을 따라가게 한다.
- 힙 상한을 정할 때는 **힙 밖 소비를 남겨둬야** 한다 — metaspace, thread stack, native에 더해 컨테이너 계정에는 page cache까지 잡힌다. 컨테이너 지표 축은 [[Container-Memory-Metrics]] 참고.
- 튜닝 검증은 배포 직후 수치가 아니라 며칠 뒤 고원에서 판단한다. 힙 커밋을 잡아도 다른 성분(page cache)이 남아 있으면 usage는 다시 오른다.

## 사례

75/75 설정으로 돌던 JVM 계산 서비스: live heap이 약 1GiB 수준인데 committed는 약 2.45GiB로 유지됐다. Initial 40 / Max 60으로 조정하자 committed가 약 1.12GiB로 즉시 개선되고 working set 비율은 99%에서 61%로 하락했다. 최종 설정은 40/60에 MaxMetaspaceSize 512M, G1NewSizePercent 20 / G1MaxNewSizePercent 30, memory limit 3.5G. 다만 JVM 튜닝만으로 working set은 안정됐지만 usage는 파일 로그 page cache 때문에 다시 상승해, 두 축을 함께 조치해야 지표가 함께 내려왔다 ([[Container-Memory-Metrics]] 사례와 같은 시스템 — SSG 프로모션 서비스).

## 면접 체크포인트

- used와 committed의 차이, 모니터링에서 어느 쪽을 봐야 하는가
- Initial과 Max를 같은 높은 비율로 두면 생기는 현상 (커밋 ramp-up 후 고원)과 그것이 누수처럼 보이는 이유
- G1이 힙을 OS에 잘 반환하지 않는 이유 (반환 검토 시점의 희소성, Full GC 회피)
- JEP 346이 해결한 문제와 도입 버전 (JDK 12), 기본 설정으로는 동작하지 않는다는 점
- 컨테이너에서 힙 상한을 정할 때 고려할 힙 밖 소비 (metaspace, thread, native, page cache)

## 출처

- [돌아오지 않는 메모리를 찾아서 — SSG TECH BLOG](https://medium.com/ssgtech/%EB%8F%8C%EC%95%84%EC%98%A4%EC%A7%80-%EC%95%8A%EB%8A%94-%EB%A9%94%EB%AA%A8%EB%A6%AC%EB%A5%BC-%EC%B0%BE%EC%95%84%EC%84%9C-6988f6d55066)
- [JEP 346: Promptly Return Unused Committed Memory from G1 — OpenJDK](https://openjdk.org/jeps/346) (반환은 Full GC나 concurrent cycle에서만, 주기 반환 기본 비활성, JDK 12 도입)
- [Garbage-First Garbage Collector Tuning — Oracle Java SE Docs](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-garbage-collector-tuning.html) (G1NewSizePercent 등 튜닝 옵션, Xms=Xmx 리사이즈 제거)

## 관련 문서

- [[Container-Memory-Metrics|컨테이너 메모리 지표 해석 (usage, working set, page cache)]]
- [[JVM-GC|JVM GC (G1 구조, 수집기)]]
- [[JVM-Architecture|JVM 아키텍처 (Runtime Data Area)]]
- [[K8s-Resource-Right-Sizing|K8s Resource Right-Sizing (P95 역산)]]
- [[Jib-Java-Container|Jib (Java 컨테이너 이미지)]]
