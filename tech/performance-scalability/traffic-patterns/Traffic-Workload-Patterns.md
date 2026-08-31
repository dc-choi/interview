---
tags: [performance, scalability, concurrency, redis, fan-out, system-design, geospatial]
status: index
category: "성능&확장성(Performance&Scalability)"
aliases: ["Traffic Workload Patterns", "대규모 트래픽 워크로드 패턴"]
---

# 대규모 트래픽 워크로드 패턴

짧은 시간에 요청이 몰리는 워크로드별 설계 사례를 모은다. 한정 수량 선착순, 예매 대기열 입장 제어, 수백만 건 푸시 팬아웃, 실시간 위치 매칭은 부하가 걸리는 지점이 서로 달라 구조도 다르게 잡는다.

- [[First-Come-Coupon-Patterns|선착순 이벤트(쿠폰, 재고, 티켓) 패턴]]: Redis INCR 원자성과 Kafka 비동기 저장, 경계 실패 설계
- [[Virtual-Waiting-Room-Architecture|가상 대기열 아키텍처]]: Redis Sorted Set, 입장 제어, adaptive polling, 원자적 예매
- [[Notification-Broadcast-System|대규모 알림 시스템]]: 계층적 팬아웃, SQS in-flight 한계, 전용 인프라 격리
- [[Geospatial-Matching|실시간 위치 기반 매칭]]: H3 육각형 격자, k-ring, 공간과 시간 분할, 핫 파티션
- [[Hot-Partition|핫 파티션 대응]]: 키 설계, 샤딩, salting과 실제 분포 검증

## 함께 볼 문서

- [[성능&확장성(Performance&Scalability)|성능&확장성]]
