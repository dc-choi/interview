---
tags: [reliability, retry, backoff, jitter, concurrency]
status: done
verified_at: 2026-08-21
category: "Reliability"
aliases: ["Retry Backoff Jitter", "지수 백오프와 지터", "Exponential Backoff"]
---

# 재시도, 지수 백오프와 지터

재시도를 언제, 얼마 간격으로, 어떻게 흩어서 할지에 대한 문서. 재시도는 일시 장애(transient)와 부분 장애(partial)를 가려주는 강력한 도구지만 본질적으로 이기적(selfish)이다 — 클라이언트가 자기 요청의 성공 확률을 올리려고 서버 자원을 더 쓰겠다는 요구라서, 장애 원인이 과부하라면 재시도가 부하를 키워 원인이 해소된 뒤에도 회복을 늦춘다.

## 지수 백오프 (Exponential Backoff)

```text
sleep = min(cap, base * 2 ** attempt)
```

- 왜 지수인가: 실패가 반복된다는 것은 경합 참가자가 많거나 다운스트림이 아직 회복되지 않았다는 신호다. 시도마다 대기 구간을 배로 넓히면 재시도 밀도가 상황에 맞춰 떨어진다.
- cap이 필요한 이유: 지수 함수는 금방 커져서 상한 없이는 대기가 비현실적으로 길어진다. 상한을 둔 형태가 capped exponential backoff다.
- cap만으로는 부족하다: cap에 도달하면 모든 클라이언트가 cap 주기로 꾸준히 재시도하는 상태가 된다. 대부분의 경우 재시도 횟수 상한을 두고, 그래도 실패하면 서비스 지향 아키텍처의 더 앞단에서 처리한다. 클라이언트는 대개 자신의 타임아웃으로 먼저 포기한다.

## 왜 지터 없이는 안 되나 — 상관관계

과부하나 경합으로 실패한 클라이언트들은 같은 순간에 실패했으므로, 같은 백오프 공식을 쓰면 같은 순간에 다시 몰린다. 백오프는 재시도 물결의 주기를 늘릴 뿐 물결(cluster) 자체를 없애지 못한다. 지터는 대기 시간에 랜덤을 섞어 이 물결을 시간축에 흩는다.

## 지터 변형과 시뮬레이션 비교

| 변형 | 공식 | 특성 |
|---|---|---|
| No jitter | `min(cap, base * 2 ** attempt)` | 재시도 클러스터 잔존. 총 일량, 완료 시간 모두 최악 |
| Full jitter | `random_between(0, min(cap, base * 2 ** attempt))` | 총 호출 수 최소, 구현 단순 |
| Equal jitter | `temp = min(cap, base * 2 ** attempt)`, `sleep = temp/2 + random_between(0, temp/2)` | 대기 하한 보장. full 대비 완료 시간이 상당히 길다 |
| Decorrelated jitter | `sleep = min(cap, random_between(base, sleep * 3))` | 직전 sleep 기반. full 대비 일량은 많지만 완료 시간은 약간 짧다 |

낙관적 동시성 제어 경합 시뮬레이션(같은 row 갱신을 경쟁하는 클라이언트 수를 늘려가며 측정, 전체 일량이 N 제곱으로 증가하는 설정) 기준으로, 지터 없는 지수 백오프는 두 지표 모두 최악이었고 100 클라이언트 경합에서 지터를 얹는 것만으로 무지터 대비 호출 수가 절반 이하로 줄었다. 대기 하한을 두는 equal jitter는 평균 대기가 full jitter의 1.5배(0.75T 대 0.5T)이고, 원문 측정에서도 완료 시간이 상당히 길었다 — 호출 수는 full과 거의 같아서 흩는 효과가 나빠진 것은 아니다. full과 decorrelated 사이의 우열은 원문도 단정하지 않는다(full이 일량에서 우위, decorrelated가 시간에서 근소 우위) — 지터를 얹은 백오프 전반이 구현 복잡도 대비 절감 폭이 커서 원격 클라이언트의 표준 접근이라는 것이 원문의 결론이고, 이 문서는 구현이 가장 단순한 full jitter를 기본값으로 둔다. 가산형 지터(`min(cap, base * 2 ** attempt) + random(0, j)`)는 하한이 지수 지연 전체라 흩는 폭이 좁고, 위 비교의 대상도 아니다.

## 재시도 규율 — 언제, 어디서, 몇 번

- **멱등한 요청에만**: 타임아웃이나 실패가 부수효과가 없었다는 뜻이 아니다. 부수효과 있는 API는 멱등성 보장 없이 재시도하면 안전하지 않다 ([[Idempotency|멱등성]]).
- **클라이언트 오류(4xx)는 재시도하지 않는다**: 같은 요청은 나중에도 성공하지 않는다. 단 eventual consistency가 이 경계를 흐린다 — 방금 만든 리소스의 404는 상태가 전파되면 성공으로 바뀔 수 있다.
- **단일 계층에서만 재시도**: 5층 스택이 층마다 3회씩 재시도하면 최하단 DB에는 3의 5제곱, 243배 부하가 도달해 회복이 어려워진다. 저비용 작업 기준의 원칙은 스택의 한 지점에서만 재시도하는 것이다.
- **토큰 버킷 재시도 예산**: 단일 계층 재시도라도 오류가 시작되면 트래픽이 크게 는다. 서킷 브레이커는 이를 통째로 끊지만 모달(modal) 동작이 생겨 테스트가 어렵고 회복 시간을 늘릴 수 있다. 토큰 버킷으로 재시도율을 로컬에서 제한하면 토큰이 있는 동안은 전부 재시도하고, 소진되면 고정 비율로만 재시도한다. AWS는 2016년 AWS SDK에 이 동작을 추가했다.
- **다운스트림이 건강할 때만**: 재시도가 가용성을 개선하지 못하고 있으면 멈춘다.

## 지터는 재시도 전용이 아니다

주기 작업(cron, 폴링, 타이머)도 클라이언트 서버들이 분의 첫 몇 초나 자정 직후에 정렬돼 몰린다. 지연 실행되는 작업 전반에 지터를 검토한다. 단 스케줄 작업의 지터는 호스트마다 매번 랜덤으로 뽑지 않고 같은 호스트에서 같은 값이 나오는 일관된 방식을 쓴다 — 과부하나 race가 패턴으로 반복돼야 사람이 원인을 추적할 수 있고, 매번 랜덤이면 문제가 무작위로만 재현된다.

## DB 락 재시도에 적용

- `ER_LOCK_DEADLOCK`이나 NOWAIT 즉시 실패 후 재돌입: 백오프에 지터를 얹어 동시 재돌입을 분산하고 상한 횟수로 자른다. 데드락 재시도 규율은 [[Lock-Deadlock|DB 데드락]].
- 실패 원인이 선행 데이터 미도착처럼 도착 예상 시간이 있는 유형이면 지수 백오프보다 고정 지연이 맞을 수 있다 — [[MQ-Kafka-Retry-DLT|Kafka 재시도와 DLT]]의 백오프 선택.

## 면접 체크포인트

- 왜 백오프만으로 부족하고 지터가 필요한가 (실패 시점의 상관관계, 재시도 물결)
- full, equal, decorrelated jitter의 공식 차이와 무엇을 기본으로 고를지
- 계층형 재시도 증폭(243배)과 단일 계층 재시도 원칙
- 서킷 브레이커 대신 토큰 버킷 재시도 예산을 쓰는 이유
- 재시도하면 안 되는 실패 (비멱등 요청, 4xx, 과부하 중인 다운스트림)

## 출처

- [Exponential Backoff and Jitter — AWS Architecture Blog, Marc Brooker](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Timeouts, retries, and backoff with jitter — Amazon Builders' Library, Marc Brooker](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

## 관련 문서

- [[External-Service-Resilience|외부 서비스 장애 대응]]
- [[External-API-Integration-Patterns|외부 API 연동 실전 패턴]]
- [[Lock-Deadlock|DB 데드락]]
- [[MQ-Kafka-Retry-DLT|Kafka 재시도와 DLT]]
- [[Event-Driven-Patterns|이벤트 드리븐 실전 패턴]]
- [[Idempotency|멱등성]]
- [[performance|성능 테스트 (스파이크로 재시도 버스트 검증)]]
