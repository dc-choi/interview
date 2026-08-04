---
tags: [performance, throughput, latency, saturation, load-test]
status: done
category: "성능&확장성(Performance&Scalability)"
aliases: ["Throughput vs Latency", "처리량과 지연시간"]
---

# 처리량과 지연시간

지연시간은 요청 하나가 끝나는 데 걸린 시간이고, 처리량은 단위 시간에 완료한 작업 수다. 하나를 빠르게 처리하는 능력과 많은 작업을 처리하는 능력은 다른 축이며, 부하가 시스템 용량에 가까워지면 서로 강하게 영향을 준다.

## 정의

| 지표 | 질문 | 대표 단위 | 선호 방향 |
|------|------|-----------|-----------|
| Latency | 요청 하나가 완료되기까지 얼마나 걸리는가? | ms, s, p50, p95, p99 | 낮을수록 좋음 |
| Throughput | 일정 시간에 몇 건을 완료하는가? | RPS, TPS, messages/s, bytes/s | 요구 지연을 지키는 범위에서 높을수록 좋음 |

처리량은 시작한 작업 수보다 **완료한 작업 수**로 측정해야 한다. 큐에 넣은 건수를 완료 처리량으로 세면 backlog 증가를 성능 향상으로 오해하게 된다.

## 서로 독립적으로 보이는 구간

- 단일 요청을 짧게 처리해도 한 번에 하나만 실행하면 latency는 낮고 throughput은 낮을 수 있다.
- 큰 batch는 왕복과 commit 비용을 공유해 throughput을 높일 수 있지만, batch가 찰 때까지 기다리는 개별 작업의 latency는 길어질 수 있다.
- worker를 병렬로 늘리면 두 지표가 함께 좋아질 수 있지만 CPU, DB connection이나 외부 API가 포화되면 효과가 멈춘다.

따라서 빠른 시스템과 많이 처리하는 시스템을 같은 말로 취급하지 않는다.

## 부하 곡선과 knee point

낮은 부하에서는 요청이 바로 자원을 얻으므로 처리량이 늘어도 지연이 비교적 일정하다. 유입률이 서비스 가능한 최대치에 가까워지면 connection, thread와 DB 같은 자원을 기다리는 큐가 생긴다. 이때부터 처리량 증가는 둔화하고 p95, p99 지연은 빠르게 상승한다. 이 변곡점이 knee point다.

```text
낮은 부하 -> 자원 여유 -> 지연 안정
용량 근접 -> 대기열 증가 -> tail latency 상승
용량 초과 -> timeout과 재시도 -> 처리량 정체, 연쇄 과부하
```

최대 TPS를 한 번 기록하는 것보다 latency SLO를 지키면서 지속할 수 있는 처리량과 headroom을 찾는 것이 운영 목표에 가깝다.

## Little's Law로 보는 관계

안정 상태에서는 시스템 안의 평균 작업 수 `L`, 평균 처리량 `λ`, 평균 체류 시간 `W`가 다음 관계를 가진다.

```text
L = λW
```

처리량이 같은데 in-flight 작업이나 queue depth가 늘면 작업의 체류 시간이 길어지고 있다는 신호다. 동시성 값을 올리는 것만으로 병목의 처리율이 늘지 않으면 대기만 증가한다. connection pool 적용은 [[Connection-Pool|Little's Law와 pool sizing]]을 함께 본다.

## 무엇을 먼저 목표로 할까

1. 사용자와 downstream이 허용할 latency SLO를 정한다. 예: 정상 부하에서 p95 200ms 이하.
2. 오류율과 자원 포화를 포함한 부하 테스트를 수행한다.
3. SLO를 깨지 않는 범위에서 처리량을 높인다.
4. knee point보다 충분히 앞에 운영 headroom을 둔다.
5. burst, 재시도와 부분 장애에서도 같은 경계를 지키는지 검증한다.

사람이 기다리는 로그인, 결제와 화면 조회는 tail latency가 중요하다. 로그 수집, 스트림과 batch는 개별 건보다 지속 처리량이 더 중요할 수 있지만 backlog의 oldest age와 완료 기한을 함께 관리해야 한다.

## 최적화 전략과 상충

| 전략 | 주 효과 | 주의점 |
|------|---------|--------|
| cache, CDN, 알고리즘 개선 | 반복 비용을 없애 latency 감소 | stale data와 무효화 비용 |
| scale out, 병렬 처리 | 포화 전 throughput 증가 | 공유 DB와 hot partition이 새 병목이 될 수 있음 |
| 비동기 I/O | 대기 시간에 다른 작업을 실행해 동시성 향상 | CPU bound 작업은 별도 병렬화가 필요 |
| batching | 왕복당 작업 수를 늘려 throughput 향상 | batch 대기와 큰 실패 범위로 latency 증가 |
| queue | burst 흡수와 producer 응답 경로 단축 | consumer 용량을 넘으면 완료 latency 증가 |
| concurrency 상향 | 유휴 자원 활용 | 컨텍스트 스위칭, lock과 connection 경합 |

큐, batch와 비동기는 일을 없애는 기술이 아니라 기다림과 실행 순서를 바꾸는 기술이다. 전체 완료 시간과 자원 사용량까지 측정한다.

## 측정 체크포인트

- latency는 평균뿐 아니라 p50, p95, p99를 보는가?
- throughput과 함께 오류율, timeout, CPU, memory, connection과 queue depth를 보는가?
- closed-loop test가 사용자 지연 때문에 요청 생성률까지 낮추는 효과를 구분하는가?
- ramp-up뿐 아니라 순간 burst와 step load를 검증하는가?
- queue enqueue와 실제 business completion을 분리해 측정하는가?

## 관련 문서

- [[Latency-Optimization|레이턴시 최적화]]
- [[Capacity-Planning|캐퍼시티 플래닝]]
- [[Load-Test-K6|부하 테스트]]
- [[Backpressure|배압]]
- [[CPU-Bound-Vs-IO-Bound|CPU Bound와 I/O Bound]]

## 출처

- [처리량 vs 지연시간 - YouTube, 코딩하는기술사](https://www.youtube.com/watch?v=63_ApTsEHhU)
