---
tags: [database, redis, cache]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Use cases", "Use Cases"]
---

# Use cases

## 카운팅
```
string의 단순 증감 연산을 사용하면 됨.

bits 연산을 사용하여 데이터 공간을 절약할 수 있지만 정수로 된 데이터만 가능.

hyperloglogs를 사용하여 대량의 데이터를 카운팅 할 때 훨씬 더 적절. 모든 string 데이터 값을 유니크하게 구분할 수 있음. 저장된 데이터가 몇백만, 몇천만 건이던 상관없이 모두 12kb임. 한번 저장한 데이터는 다시 불러올 수 없는데 데이터를 보호하기 위한 목적으로도 사용할 수 있음.
```

## 실시간 랭킹 시스템
```
sorted set를 사용한 실시간 점수 및 랭킹 관리, 게임 점수 랭킹, 스트리밍 서비스 인기 순위
```

## 메시징
### list 활용
- 자체적으로 blocking 기능이 있어 적절히 사용하면 polling을 방지할 수 있음
- 키가 있을 경우에만 데이터를 추가할 수 있는 커맨드 존재
- SNS 사례: 자주 사용하는 유저에게만 타임라인 트윗을 캐싱, 비활성 유저는 동작하지 않음

### stream 활용
- append-only라서 중간에 데이터가 바뀌지 않음
- id는 시간값으로 저장되며 키-값을 매칭하여 데이터 저장
- 시간 대역대별 검색, 새로 들어오는 데이터만 리스닝 가능
- 소비자(consumer) 개념이 있어 특정 데이터를 원하는 소비자만 읽게 할 수 있음
- 간단한 메시징 브로커가 필요할 때 적합

## 실시간 채팅 및 알림
- Pub/Sub을 사용해 채팅 메시지 및 이벤트 알림 처리
- 라이브 스트리밍 채팅, 실시간 알림 서비스

## Rate Limiting
- 특정 시간 내 요청 횟수를 제한하는 기능
- 로그인 시도 제한, DDoS 방어

## 관련 문서
- [[Redis-vs-Memcached|redis와 memcached의 차이점]]
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Session-Store|Session store]]
- [[Distributed-Lock|Distributed lock]]
