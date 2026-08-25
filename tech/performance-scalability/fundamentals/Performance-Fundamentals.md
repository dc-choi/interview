---
tags: [performance, scalability, throughput, latency, cpu-bound, cache, queue]
status: index
category: "성능&확장성(Performance&Scalability)"
aliases: ["Performance Fundamentals", "성능 기초 개념"]
---

# 성능 기초 개념

성능을 개선하기 전에 먼저 정해야 하는 비교 축을 모은다. 병목이 CPU인지 I/O인지, 지연시간과 처리량 중 무엇을 목표로 삼을지, 서버를 키울지 늘릴지, 값을 재사용할지 작업을 미룰지가 이후 모든 최적화 선택의 전제가 된다.

- [[CPU-Bound-Vs-IO-Bound|CPU-Bound vs I/O-Bound]]: 병목 구분, 언어 선택, 최적화 전략 매트릭스
- [[Throughput-vs-Latency|처리량과 지연시간]]: 부하 곡선, knee point, Little's Law, SLO 기준 처리량
- [[Scale-Up-vs-Out|Scale Up vs Scale Out]]: 수직, 수평 확장 비교, 혼합 패턴
- [[Cache-vs-Queue|캐시와 큐]]: 값 재사용 vs 작업 전달, 접수와 완료, 선택 기준

## 함께 볼 문서

- [[성능&확장성(Performance&Scalability)|성능&확장성]]
