---
tags: [database, redis, cache]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["캐시란?", "Cache Basics", "캐싱"]
---

# 캐시란?

자주 쓰는 데이터나 비용이 큰 계산 결과를 원본보다 빠른 저장소에 임시로 두고, 다음 요청에 그대로 돌려주는 기술. 미리 만들어 둔 답안지를 꺼내 쓰는 것에 가깝다. 캐시는 원본보다 접근이 쉽고 빨라야 의미가 있고, 같은 데이터를 반복 조회하거나 데이터가 잘 변하지 않을수록 효과가 크다.

## 언제 효과가 큰가

- 동일 데이터에 반복 접근이 많을 때
- 원본 조회나 계산 비용이 클 때 (여러 DB 조인, 통계 집계)
- 데이터가 자주 변하지 않을 때 (stale 허용 범위가 넓을 때)

## 장점과 비용

장점

- 응답 속도 향상 — 매번 원본 조회나 복잡한 계산을 하지 않아도 된다
- 서버, DB, 네트워크 부하 감소 — 같은 요청이 반복될수록 절감이 크다

비용

- 일관성 — 원본이 바뀌어도 캐시가 옛 값을 들고 있으면 사용자는 오래된 정보를 본다 ([[Cache-Invalidation]])
- 복잡도 — 캐시 계층이 늘면 아키텍처와 운영 부담이 커지고 캐시 서버 비용이 든다

그래서 도입 판단은 줄어드는 비용과 얻는 성능이 추가 비용보다 큰지로 따진다. 히트율, 노출률이 낮으면 빼는 게 답일 수 있다 ([[Cache-Decision]]).

## 캐시 히트와 미스

- **히트(Hit)** — 요청 데이터가 캐시에 있어 원본 접근 없이 응답한다. 캐싱 설계의 목표는 히트가 자주 일어나게 만드는 것 (실무 기준 히트율 80% 미만이면 전략 재검토)
- **미스(Miss)** — 캐시에 없어 원본을 다시 조회한다. 캐싱 이점을 못 얻고 오히려 한 단계 더 거친다

## 핵심 용어

- **원본(Origin)** — 캐시가 참조하는 실제 출처. DB, 파일 서버, API 서버
- **만료(Expiration)** — 오래된 캐시를 삭제하거나 무효화하는 것. 원본과의 차이를 줄이기 위함
- **TTL(Time To Live)** — 캐시가 살아 있는 시간(초). TTL이 10초면 생성 후 10초 뒤 만료. 길면 부하는 줄지만 반영이 느리고, 짧으면 반영은 빠르지만 부하가 는다 (상세 [[TTL]])

## 적재 시점: Lazy vs Eager

- **Lazy Loading** — 요청이 들어온 순간 처음 캐시를 채운다. 첫 요청은 원본 조회 탓에 느리지만 이후는 빠르다. 안 쓰일 데이터를 미리 올리지 않아 무난하다. 읽기 전략 [[Cache-Strategies|Cache-Aside]]가 이 방식이다
- **Eager Loading (Cache Warming)** — 요청이 오기 전에 미리 채워 둔다. 첫 요청도 빠르지만 실제로 안 쓰일 데이터까지 계산, 적재해 리소스가 낭비될 수 있다. 요청이 넓게 고르게 분포할 때 유리하고, 일부 데이터만 자주 쓰이면 비효율적이다

## 제거(Eviction)와 만료 정책

메모리가 가득 차거나 만료 시점이 오면 무엇을 버릴지 결정한다.

| 정책 | 제거 기준 | 특징 |
|------|-----------|------|
| TTL | 시간 만료 | 단순, 예측 쉬움. 모든 키가 언젠가 갱신 필요 |
| LRU | 가장 오래 미사용 | 최근성 반영. 스캔성 접근엔 약함 |
| LFU | 가장 적게 사용 | 빈도 반영. 과거에만 인기였던 키가 잔존 |
| FIFO | 먼저 들어온 것 | 구현 쉬움. 사용 패턴을 무시해 실무엔 신중 |

Redis의 실제 eviction 옵션(allkeys-lru, volatile-lfu 등)은 [[Redis-Memory-Eviction]].

## 캐싱이 쓰이는 곳

- **CDN** — 이미지, 영상, 정적 파일을 사용자 가까운 엣지에 캐싱. AWS는 [[CloudFront]] ([[CDN]])
- **인메모리 캐시** — 랭킹, 세션, 자주 조회되는 데이터. Redis 기반 [[ElastiCache]]
- **브라우저 캐시** — 같은 이미지나 파일을 매번 서버에서 받지 않고 필요할 때만 다시 요청
- **다층 캐시** — L1(로컬)부터 L3까지 계층화 ([[Multi-Level-Cache]])
- **RAM, DNS** — CPU와 메모리 사이 빠른 접근([[Cache-Locality]]), DNS 응답의 재사용([[DNS]])

## 면접 체크포인트

- 캐시의 이득(속도, 부하)과 비용(일관성, 복잡도)을 함께 말하고 도입 판단 기준을 제시
- 히트, 미스와 히트율을 설계 목표로 설명
- Lazy vs Eager 적재 시점의 트레이드오프
- TTL, LRU, LFU, FIFO 제거 정책 비교
- 캐싱은 빠르게 만드는 기술인 동시에 언제 버릴지를 설계하는 일 — 무효화와 만료가 본질

## 출처

- [AWS 기초: 캐싱 개념과 활용 방식 — YouTube](https://www.youtube.com/watch?v=s_DeP80QUnE&list=PLfth0bK2MgIYuFahPhXTpTomkwVx5Fl-v&index=6)

## 관련 문서

- [[Cache-Strategies|Cache 전략 (Cache-Aside, Write-Through, Write-Behind)]]
- [[TTL|TTL 전략]]
- [[Redis-Memory-Eviction|Redis 메모리 Eviction]]
- [[Cache-Decision|Cache 도입, 제거 의사결정]]
- [[Cache-Invalidation|Cache invalidation]]
- [[Multi-Level-Cache|Multi-Level Cache]]
- [[CDN|CDN]]
- [[CloudFront|CloudFront]]
- [[ElastiCache|ElastiCache]]
