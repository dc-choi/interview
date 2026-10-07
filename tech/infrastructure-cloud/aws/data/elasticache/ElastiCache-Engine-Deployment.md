---
tags: [aws, elasticache, redis, memcached, valkey, serverless]
status: done
category: "Infrastructure - AWS"
aliases: ["ElastiCache 엔진 선택", "ElastiCache 클러스터 구조", "ElastiCache Serverless"]
verified_at: 2026-07-21
---

# Amazon ElastiCache — 엔진 선택, 운영 기능과 클러스터 구조

## 왜 필요한가

- **DB 부담 완화**: 복잡한 조인, 집계 결과를 캐시해 재계산 제거
- **지연 절감**: 메모리 기반 조회로 반복적인 데이터베이스 접근을 줄인다. 실제 지연과 사용자 영향은 데이터 크기, 네트워크, 명령, 워크로드에서 측정한다.
- **스파이크 흡수, 글로벌 상태 공유**: 순간 트래픽 증가 시 DB 폭주를 막는 버퍼가 되고, 여러 앱 서버가 세션, 락, 카운터를 공유

## 엔진 선택 — node-based Redis/Valkey vs Memcached

| 항목 | Redis / Valkey | Memcached |
|---|---|---|
| 자료구조 | String, Hash, List, Set, Sorted Set, Stream, Bitmap | String만 |
| 백업 | node-based 배포에서 RDB 기반 백업과 스냅샷 지원 | node-based Memcached는 미지원 |
| 복제, 클러스터 | 공식 지원 | 제한적 |
| Pub/Sub | 지원 | 미지원 |
| 분산락 | SETNX, Redlock | 미지원 |
| 사용 패턴 | 다양한 자료구조, 복잡한 로직 | 단순 KV 캐시, 멀티스레드 고속 |

자료구조, 복제, 장애 조치가 필요하면 **Valkey 또는 Redis OSS**를 검토한다. Memcached는 단순하고 폐기 가능한 KV 캐시에 적합하다. 단, ElastiCache Serverless for Memcached는 snapshot과 restore를 지원하므로 node-based Memcached의 백업 미지원 특성을 전체 Memcached 배포에 일반화하면 안 된다.

**Valkey**는 Redis OSS 7.2에서 갈라져 Linux Foundation이 관리하는 오픈소스 프로젝트다. Redis OSS 프로토콜과 명령 호환성이 높지만, 마이그레이션 전에는 사용하는 엔진 버전과 명령, 클라이언트 호환성을 확인한다.

## ElastiCache 운영 기능

| 기능 | 설명 |
|---|---|
| **Multi-AZ with Auto Failover** | 프라이머리 장애 시 레플리카 자동 승격 |
| **Global Datastore** | 리전 간 복제 (Redis/Valkey 한정) |
| **Backup, Snapshot** | S3로 자동 백업, 특정 시점 복구 |
| **In-transit / At-rest Encryption** | TLS, KMS 연동 |
| **ElastiCache Serverless** | 사용량 기반 자동 스케일, 기본 가용성 99.99% |

### ElastiCache Serverless 주의점

- **스토리지와 요청량 과금** — Serverless는 저장 데이터를 GB-hour로, 요청 처리를 ElastiCache Processing Unit(ECPU)으로 측정한다. 엔진별 최소 측정 스토리지가 있으므로 유휴 비용도 0으로 단정할 수 없다
- 비용 우위는 최소 저장량, 데이터 처리량, 노드 사용률과 엔진에 따라 달라지므로 예측 부하는 Serverless와 노드 기반 구성을 계산기로 비교한다. 트래픽 패턴이 예측 불가하거나 변동이 큰 워크로드에는 Serverless가 유리하다

## 클러스터, 노드 구조 (시험 관점)

node-based ElastiCache는 **Node**를 서비스 단위로 사용한다. Node는 인스턴스 타입에 따른 메모리와 endpoint를 가지며 AWS가 관리형 인프라 작업을 수행한다. Serverless는 이 node 구성을 사용자에게 추상화하므로 아래 구조와 동일하게 해석하지 않는다.

**Memcached**: `Cluster ↔ Node` 2계층. 다른 AZ 분산은 되지만 **복제본, Failover 불가**, 용량 증설은 Node 추가만.

**Redis / Valkey**: `Cluster → Shard → Node` 3계층. Shard = Primary 1 + Replica N. Cluster 모드 비활성 시 **Shard 1개**(복제만), 활성 시 **다수 Shard로 키스페이스 샤딩**. 복제본 → **Failover, Multi-AZ 지원**.

### Failover, HA 핵심

| 엔진 | Failover | Multi-AZ | 백업 |
|------|----------|----------|------|
| node-based Memcached | 불가 | 노드 분산만 | 없음 |
| node-based Redis/Valkey | **자동 승격** | 지원 | RDB 기반 백업과 스냅샷, S3 저장 |
| Serverless Memcached | 서비스가 가용성과 확장을 관리 | Serverless 배포 모델 | snapshot과 restore 지원 |

복제, 자동 장애 조치, 백업이 필요하면 Valkey 또는 Redis OSS를 선택한다. 어느 엔진이든 캐시를 유일한 원본 데이터 저장소로 두는지는 복구 요구와 데이터 손실 허용 범위를 따로 검토한다.

### Multi-AZ 장애 복구와 데이터 손실 경계

이 절은 2026-10-07 AWS 공식 문서 기준이다. Multi-AZ는 AZ 분산을, automatic failover는 장애 시 replica 승격을 다루지만, 현재 공식 설정 안내에서는 Multi-AZ 활성화가 자동 장애 조치를 함께 켠다. 각 shard에 primary와 다른 AZ의 replica가 최소 하나 필요하다. Automatic failover만 켠 구성은 AZ 분산을 보장하지 않는다.

Durability를 사용하지 않는 구성의 primary 장애에서는 복제 지연이 가장 작은 replica를 승격하고 대체 replica를 만든다. AZ 전체 장애라면 해당 AZ의 복구 전까지 대체 replica 생성이 지연될 수 있다. Primary endpoint의 DNS가 갱신돼도 기존 연결의 재연결 동작은 애플리케이션에서 확인해야 한다. 개별 replica endpoint를 직접 사용하는 클라이언트는 승격 후 읽기 대상 변경도 확인한다.

데이터 손실 범위는 내구성 설정에 따라 다르다.

| 구성 | 장애 조치 때 확인할 경계 |
|---|---|
| Durability를 사용하지 않는 비동기 복제 | replica로 전달되지 않은 쓰기가 유실될 수 있음 |
| Valkey 9.0+의 durability와 synchronous writes | 성공 응답 전에 Multi-AZ transactional log에 저장, primary 장애 조치 후에도 성공한 쓰기의 강한 일관성 유지 |
| Durability와 asynchronous writes | 로그 저장 전에 응답할 수 있어 장애 시 최대 10초의 승인된 쓰기가 유실될 수 있음 |

Synchronous writes 구성에서도 replica 읽기는 최종 일관성이므로 최신 쓰기의 즉시 조회를 보장하지 않는다. **Multi-AZ 활성화만으로 무손실을 단정하지 않는다.**

Durability는 지원 노드 유형의 Valkey 9.0 이상에서 cluster mode enabled와 Multi-AZ, shard당 replica 최소 하나를 요구한다. Serverless와 Global Datastore에는 적용되지 않는다. 클러스터 생성 때 활성화해야 하며 기존 비내구성 클러스터에 나중에 켤 수 없다. 활성화한 뒤 sync와 async 모드는 바꿀 수 있지만 durability 자체를 끌 수는 없다.

개발 또는 검증 환경의 `TestFailover`로 쓰기 중단, 클라이언트 복구와 오류 처리를 확인한다. 이 API는 장애 시 애플리케이션 동작을 시험하기 위한 기능이며 운영 장애를 해결하는 도구로 설계되지 않았다.

## 비용, 사이징

- **인스턴스 타입**: 데이터 크기, eviction, CPU, 네트워크와 엔진 호환성을 측정해 선택한다. Graviton 계열의 가격 대비 성능도 워크로드에서 비교한다.
- **샤딩**: 단일 노드 메모리 한도(100GB+) 넘으면 Redis Cluster 모드로 샤딩
- **비용 지표**: 인스턴스 시간 + 데이터 전송 + 스냅샷 스토리지

## 출처

- [ElastiCache Multi-AZ와 자동 장애 조치](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/AutoFailover.html)
- [ElastiCache 내구성 구성의 일관성](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Durability.Consistency.html)
- [ElastiCache 내구성 지원 조건과 제한](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Durability.Limitations.html)
- [ElastiCache 배포 옵션](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.deployment.html)
- [ElastiCache 요금](https://aws.amazon.com/elasticache/pricing/)
- [ElastiCache 백업과 복원](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/backups.html)
- [ElastiCache 엔진 버전 고려사항](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/VersionManagementConsiderations.html)
- [ElastiCache 엔진 선택](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/SelectEngine.html)

## 관련 문서

- [[ElastiCache|Amazon ElastiCache]]
- [[ElastiCache-Use-Cases|ElastiCache 주요 사용 사례]]
- [[ElastiCache-Caching-Strategy|ElastiCache 캐시 전략과 체크포인트]]
- [[Connection-Pool|Connection Pool]]
