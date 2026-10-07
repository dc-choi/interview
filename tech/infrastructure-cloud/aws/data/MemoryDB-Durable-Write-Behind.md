---
tags: [aws, memorydb, durability, write-behind, recovery]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["MemoryDB 내구성 쓰기 버퍼", "MemoryDB Durable Write Behind"]
---

# MemoryDB의 내구성과 비동기 DB 반영

MemoryDB를 먼저 기록하고 관계형 DB에 나중에 반영하는 구조에서는 두 완료 시점을 구분한다. MemoryDB의 쓰기 성공은 후속 DB의 트랜잭션 완료를 뜻하지 않는다.

## 쓰기 응답과 읽기의 경계

단일 리전 MemoryDB는 성공한 쓰기를 여러 AZ의 트랜잭션 로그에 내구성 있게 저장한 뒤 클라이언트에 응답한다. primary 읽기는 앞서 성공한 쓰기를 반영하며, replica 읽기는 비동기 반영 때문에 최신 값보다 뒤처질 수 있다. 리전 간 복제의 의미는 [[MemoryDB-Multi-Region|Multi-Region]]에서 따로 본다.

primary 장애 시에는 일관된 replica를 승격해 쓰기를 재개한다. replica가 없는 단일 노드 shard는 primary를 교체하고 로그를 동기화할 때까지 쓰기를 받지 못한다. 내구성과 서비스 중단 시간은 서로 다른 판단 기준이다.

## 비동기 반영의 설계 예시

아래는 이 내구성 계약을 이용한 애플리케이션 설계 예시다. MemoryDB가 관계형 DB 적재와 소비자 복구까지 자동으로 제공한다는 뜻은 아니다.

1. 변경 내용과 재처리에 필요한 식별자, 순서를 내구성 있는 버퍼에 기록한다.
2. 기록 성공 뒤 클라이언트에 응답하고, 소비자가 관계형 DB에 변경을 반영한다.
3. 대상 DB의 반영 완료를 확인한 범위만 처리 완료로 표시하고 버퍼에서 정리한다.
4. 소비자가 중단되면 미완료 범위부터 재처리한다. DB 커밋 뒤 완료 표시 전에 중단될 수 있으므로 멱등 처리나 버전 비교가 필요하다.

내부 트랜잭션 로그는 MemoryDB 복구 장치다. 애플리케이션이 삭제한 버퍼 데이터를 임의로 다시 소비하는 이벤트 보관소로 간주하지 않는다. 미반영 데이터에 TTL이나 조기 삭제를 적용하면 내구성 있는 저장소를 사용해도 업무 데이터가 사라질 수 있다.

## 운영에서 확인할 것

- 읽기 최신성: 버퍼에는 최신 값이 있지만 대상 DB에는 이전 값이 있을 때 어느 저장소에서 읽을지 정한다. 캐시 miss를 곧바로 대상 DB의 최신 상태로 해석하지 않는다.
- 복구 범위: 마지막으로 반영된 버전, 미처리량, 가장 오래된 미처리 항목의 나이를 함께 관측한다. 큐 길이가 0이어도 실행 중인 DB 트랜잭션이 남을 수 있다.
- 종료 순서: 신규 쓰기를 멈춘 뒤 버퍼, 실행 중인 처리와 대상 DB의 완료 지점을 대조한다.
- 비용과 용량: 재생성 가능한 캐시와 유실되면 안 되는 미반영 변경을 구분한다. 보관량과 소비 속도가 용량을 넘지 않는지 측정한다.

확인 실험은 primary failover, 소비자 중단, DB 커밋 직후 중단을 구분해 수행한다. 각 경우의 응답 성공 데이터, 최종 DB 값과 중복 반영 여부를 비교해야 전체 경로의 복구를 판단할 수 있다.

## 출처

- [Amazon MemoryDB, Consistency](https://docs.aws.amazon.com/memorydb/latest/devguide/consistency.html)
- [Amazon MemoryDB, Minimizing downtime in MemoryDB with Multi-AZ](https://docs.aws.amazon.com/memorydb/latest/devguide/autofailover.html)

## 관련 문서

- [[MemoryDB-Multi-Region|리전 간 복제와 충돌 해결]]
- [[Cache-Strategies|Write-Behind와 다른 캐시 전략]]
- [[Transactional-Outbox|DB 변경과 이벤트 발행의 원자성]]
