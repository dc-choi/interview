---
tags: [performance]
status: index
category: "성능&확장성(Performance&Scalability)"
aliases: ["성능&확장성(Performance&Scalability)", "Performance & Scalability"]
---

# 성능&확장성(Performance&Scalability)

## 현장사례
- [[Zigzag-Fashion-Seminar#구간별핵심기술|지그재그 커머스 구간별 핵심기술]] — 앞단(캐시,ES)/중단(동시성,큐)/뒷단(PG,TX)
- [[Fintech-Seminar#트래픽처리방식|핀테크 트래픽 처리]] — 대기표 발급 방식, 외부 금융기관 연동 제약
- [[Sorting-Operations|정렬이 발생하는 5가지 연산]] — ORDER BY, DISTINCT, UNION, JOIN, GROUP BY의 정렬 비용과 회피법
- [x] [[Transaction-Lock-Contention|트랜잭션 경합과 Lock 문제]]

## Checklist
- [x] [[Latency-Optimization|레이턴시 최적화 개관 (캐싱·DB·비동기·네트워크 4대 전략 + P99/SLO 측정)]]
- [x] [[CPU-Bound-Vs-IO-Bound|CPU-Bound vs I/O-Bound (병목 구분, 언어 선택, 최적화 전략 매트릭스)]]
- [x] [[First-Come-Coupon-Patterns|선착순 이벤트(쿠폰·재고·티켓) 패턴 (Redis INCR 원자성 + Kafka 비동기 저장)]]
- [ ] [[Query-Optimization|Query optimization]]
- [ ] [[Index-Tuning|Index tuning]]
- [x] [[Connection-Pool|Connection Pool 사이징 (HikariCP 공식, Little's Law, 과대 풀의 역설)]]
- [ ] [[Thread-Pool-Sizing|Thread pool sizing]]
- [ ] [[Cache-Strategy|Cache strategy]]
- [ ] [[Lock-Contention|Lock contention 분석]]
- [ ] [[CPU-Memory-Profiling|CPU / Memory profiling]]
- [ ] [[Bottleneck-Tracing|Bottleneck tracing]]
- [x] [[Load-Test-K6|성능 테스트 도구 (k6·JMeter·Keploy, 시나리오·측정 지표·전용 환경)]]
- [ ] [[Autoscaling]]
- [x] [[Scale-Up-vs-Out|Scale Up vs Scale Out (수직·수평 확장 비교·혼합 패턴)]]
- [x] [[Traffic-Scaling-Playbook|트래픽 스케일링 실전 (서버 증설 없는 최적화·모니터링→식별→카나리)]]
- [x] [[Notification-Broadcast-System|대규모 알림 시스템 (계층적 팬아웃·SQS in-flight·전용 인프라 격리)]]
- [ ] [[Capacity-Planning|Capacity planning]]
- [ ] [[Queue-Depth-Scaling|Queue depth 기반 scaling]]
- [ ] [[Hot-Partition|Hot partition 대응]]
