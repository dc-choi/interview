---
tags: [performance, scalability, latency, connection-pool, lock, cdn, monitoring]
status: index
category: "성능&확장성(Performance&Scalability)"
aliases: ["Performance Optimization", "성능 최적화 전략"]
---

# 성능 최적화 전략

이미 운영 중인 시스템에서 병목을 찾아 비용을 줄이는 전략을 모은다. 레이턴시 구간과 읽기, 쓰기 경로부터 커넥션 풀과 트랜잭션 락 같은 자원 경합, 전송 바이트, 증설 없는 반복 튜닝 사이클까지 다룬다.

- [[Latency-Optimization|레이턴시 최적화 개관]]: 캐싱, DB, 비동기, 네트워크 4대 전략과 P99/SLO 측정, wall-clock 프로파일링
- [[Read-Write-Performance-Strategies|읽기와 쓰기 성능 전략]]: 계층별 병목, 상충 관계, 측정과 검증
- [[Connection-Pool|DB 커넥션 풀, 사이징]]: HikariCP 설정 축, Little's Law 초기 추정, 사이징 절차, 포화 상태 해석, 과대 풀의 역설
- [[Transaction-Lock-Contention|트랜잭션 경합과 Lock 문제]]: 객체 참조가 만드는 트랜잭션 확대, Aggregate 경계 분리, 도메인 이벤트 (세미나 원본)
- [[Image-Delivery-Optimization|이미지 전송 최적화]]: Lambda@Edge 리사이즈, WebP/AVIF, GIF→MP4, LCP와 egress
- [[Traffic-Scaling-Playbook|서버 증설 없이 트래픽 스케일링]]: 모니터링→병목 식별→소규모 최적화→카나리 사이클, 3대 공통 병목 처방

## 함께 볼 문서

- [[성능&확장성(Performance&Scalability)|성능&확장성]]
