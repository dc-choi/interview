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
- [x] [[Latency-Optimization|레이턴시 최적화 개관 (캐싱, DB, 비동기, 네트워크 4대 전략 + P99/SLO 측정)]]
- [x] [[CPU-Bound-Vs-IO-Bound|CPU-Bound vs I/O-Bound (병목 구분, 언어 선택, 최적화 전략 매트릭스)]]
- [x] [[First-Come-Coupon-Patterns|선착순 이벤트(쿠폰, 재고, 티켓) 패턴 (Redis INCR 원자성 + Kafka 비동기 저장)]]
- [ ] Query optimization (작성 예정: `Query-Optimization`)
- [ ] Index tuning (작성 예정: `Index-Tuning`)
- [x] [[Connection-Pool|Connection Pool 사이징 (HikariCP 공식, Little's Law, 과대 풀의 역설)]]
- [ ] Thread pool sizing (작성 예정: `Thread-Pool-Sizing`)
- [ ] Cache strategy (작성 예정: `Cache-Strategy`)
- [ ] Lock contention 분석 (작성 예정: `Lock-Contention`)
- [ ] CPU / Memory profiling (작성 예정: `CPU-Memory-Profiling`)
- [ ] Bottleneck tracing (작성 예정: `Bottleneck-Tracing`)
- [x] [[Load-Test-K6|성능 테스트 도구 (k6, JMeter, Keploy, 시나리오, 측정 지표, 전용 환경)]]
- [ ] `Autoscaling` (작성 예정)
- [x] [[Scale-Up-vs-Out|Scale Up vs Scale Out (수직, 수평 확장 비교, 혼합 패턴)]]
- [x] [[Traffic-Scaling-Playbook|트래픽 스케일링 실전 (서버 증설 없는 최적화, 모니터링→식별→카나리)]]
- [x] [[Notification-Broadcast-System|대규모 알림 시스템 (계층적 팬아웃, SQS in-flight, 전용 인프라 격리)]]
- [x] [[Image-Delivery-Optimization|이미지 전송 최적화 (Lambda@Edge 리사이즈, WebP/AVIF, GIF→MP4, LCP/egress)]]
- [x] [[Geospatial-Matching|실시간 위치 기반 매칭 (H3 육각형 격자, k-ring, 공간+시간 분할, 핫 파티션)]]
- [x] [[Capacity-Planning|캐퍼시티 플래닝 (스파이크 대비 사이클, 램프업 vs 스텝 BMT, Redis 가용량 확보 3옵션)]]
- [x] [[Traffic-Spike-Query-Types|예측 불가 트래픽 폭증 (Repetitive vs Unique Query, 계층별 차등 캐퍼시티)]]
- [ ] Queue depth 기반 scaling (작성 예정: `Queue-Depth-Scaling`)
- [ ] Hot partition 대응 (작성 예정: `Hot-Partition`)
