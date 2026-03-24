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
- [ ] [[Query-Optimization|Query optimization]]
- [ ] [[Index-Tuning|Index tuning]]
- [ ] [[Connection-Pool-Sizing|Connection pool sizing]]
- [ ] [[Thread-Pool-Sizing|Thread pool sizing]]
- [ ] [[Cache-Strategy|Cache strategy]]
- [ ] [[Lock-Contention|Lock contention 분석]]
- [ ] [[CPU-Memory-Profiling|CPU / Memory profiling]]
- [ ] [[Bottleneck-Tracing|Bottleneck tracing]]
- [ ] [[Load-Test-K6|Load test (k6)]]
- [ ] [[Autoscaling]]
- [ ] [[Horizontal-vs-Vertical-Scaling|Horizontal vs Vertical scaling]]
- [ ] [[Capacity-Planning|Capacity planning]]
- [ ] [[Queue-Depth-Scaling|Queue depth 기반 scaling]]
- [ ] [[Hot-Partition|Hot partition 대응]]
