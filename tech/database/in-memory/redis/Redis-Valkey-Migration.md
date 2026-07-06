---
tags: [database, redis, valkey, cache, migration, elasticache]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Valkey", "Redis Valkey Migration", "Redis 라이선스", "Redis to Valkey"]
---

# Redis에서 Valkey로 — 포크 배경과 마이그레이션

Valkey는 Redis 라이선스 변경(2024, BSD → SSPL/RSALv2 이중 라이선스)에 대응해 갈라져 나온 **Redis 호환 오픈소스 인메모리 데이터베이스**다. Linux Foundation 산하에서 개발되며, Redis 7.2를 기준으로 포크되어 그 이전 워크로드와 자연 호환된다. 관리형으로는 AWS ElastiCache가 Valkey 엔진을 지원한다.

## 포크 배경 — 라이선스 변경

- Redis가 BSD(완전 오픈소스)에서 SSPL/RSALv2 이중 라이선스로 전환하며 클라우드 사업자의 관리형 서비스 제공이 제약됨
- 이에 커뮤니티와 주요 클라우드 사업자가 마지막 BSD 버전(7.2.4)을 기반으로 Valkey를 포크
- Valkey는 Redis와 **명령어, 프로토콜(RESP), 데이터 구조가 호환**되므로 클라이언트 코드 변경 없이 전환 가능

## Valkey의 개선점

| 영역 | 버전 | 내용 |
|---|---|---|
| **I/O 멀티스레딩** | 8.0 | 단일 스레드 제약 완화. 처리량이 크게 향상 (수십만 → 백만 QPS급) |
| **메모리 효율** | 8.0, 8.1 | Key당 메타데이터 20~30바이트 절감 → 동일 메모리에 더 많은 데이터 |
| **파이프라인 처리량** | 8.x | 최대 40% 향상 |
| **클러스터 안정성** | 9.0 | Slot 마이그레이션 신뢰성, 다중 장애 복구, 재연결 폭증 제어 |

Redis의 단일 스레드 명령 처리 모델(→ [[Redis-Architecture]])은 유지하되, **네트워크 I/O를 멀티스레드로 분리**해 병목을 완화하는 방향.

## 비용 — ElastiCache

- ElastiCache에서 Valkey 노드는 Redis OSS 대비 **약 20% 저렴**
- 메모리 효율 개선과 결합하면 노드 다운사이징 기회까지 생겨 절감폭이 커진다

## 인플레이스 업그레이드와 클라이언트 요건

ElastiCache 인플레이스 업그레이드는 새 노드를 붙여 데이터를 복제한 뒤 Failover하는 방식. 엔드포인트는 유지되지만 **짧은 연결 끊김이 발생**할 수 있어 클라이언트의 재연결 능력이 필수다.

### 클라이언트 체크리스트

- **공통**: 연결/읽기 타임아웃 설정, 자동 재연결 + 지수 백오프 재시도, 연결 풀의 stale connection 처리
- **클러스터 모드 추가**: MOVED/ASK 리다이렉트 처리, 해시태그로 동일 슬롯 제약 충족, 다중키 명령(MGET, MSET, Lua)이 같은 슬롯 준수 (슬롯 원리는 [[Redis-Cluster-Sharding]])

## 마이그레이션 원칙

- **리스크는 엔진보다 클라이언트와 운영 절차에 있다** — 체크리스트로 관리 가능
- **호환성 경계가 명확** — Valkey는 Redis 7.2 기준이라 6.x 워크로드와 자연 호환
- **단계적 롤아웃** — 영향도 낮은 캐시부터 검증 후 확대
- **엔진 업그레이드와 노드 스펙 조정을 분리** — 문제 발생 시 원인 파악이 쉬움

## 성과 관측 지표

전환 효과는 CloudWatch 메트릭으로 확인한다. 대표 사례의 변화 방향:

- CPU 사용률 감소 (약 50%)
- FreeableMemory 증가, 메모리 사용률 개선 (약 10%)
- GET 지연시간 대폭 감소 (약 60%), SET 지연시간 감소 (약 20%)

## 면접 체크포인트

- Valkey가 왜 생겼는가 — Redis 라이선스 변경(BSD → SSPL/RSALv2)과 커뮤니티 포크
- Redis와의 호환성 경계 (7.2 기준 포크, 명령어/프로토콜 호환)
- Valkey I/O 멀티스레딩이 Redis 단일 스레드 모델과 어떻게 공존하는가 (명령 실행은 단일, I/O만 병렬)
- 인플레이스 업그레이드에서 무중단이 아닌 이유와 클라이언트 재연결 요건
- 클러스터 모드 마이그레이션에서 슬롯, 해시태그, 다중키 명령 제약
- 엔진 업그레이드와 노드 스펙 조정을 분리해야 하는 이유

## 출처

- [Redis 6.x에서 Valkey 9.0으로 — 아임웹 기술블로그](https://tech.imweb.me/posts/redis-oss-valkey-upgrade/)

## 관련 문서

- [[Redis-Architecture|Redis Architecture (Event Loop, RESP, 단일 스레드)]]
- [[Redis-Cluster-Sharding|Redis Cluster, Sharding (Hash Slot)]]
- [[Redis-vs-Memcached|Redis vs Memcached]]
- [[Redis-Memory-Eviction|메모리 정책, Eviction]]
- [[Operations|Redis 운영 팁]]
