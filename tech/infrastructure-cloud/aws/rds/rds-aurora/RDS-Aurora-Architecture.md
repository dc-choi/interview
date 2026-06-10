---
tags: [infrastructure, aws, rds, aurora, managed-db, database, ncp, saa-c03]
status: done
category: "Infrastructure - AWS"
aliases: ["Aurora 공유 스토리지", "Aurora 클러스터와 엔드포인트"]
---

# Aurora — RDS와 무엇이 다른가

Amazon이 **MySQL, PostgreSQL 호환**으로 재설계한 클라우드 네이티브 DB. 기존 RDS와 **스토리지 아키텍처**가 근본적으로 다르다.

## 공유 스토리지 아키텍처

- 기존 RDS: 각 인스턴스(primary/replica)가 **독립 스토리지**에 복제
- Aurora: primary, replica 모두 **같은 분산 스토리지**를 참조
  - **6-way 복제(3 AZ × 2 복사본)** — 스토리지 레이어에서 처리
  - 읽기/쓰기 시 6개 사본 중 **일부만 사용**하여 가용성 확보 (쿼럼)
  - 스토리지 자체가 **최대 128 TB까지 자동 확장**
  - 오류를 스스로 감지, 복구하는 **Self-healing** 내장
  - Replica는 데이터 복사 불필요 → **추가 비용↓, Lag ~ms**

## Aurora DB Cluster, Endpoints

- **클러스터** = 기본(writer) DB 인스턴스 + 읽기 복제본(reader) 인스턴스 묶음
- 읽기 복제본 **최대 15개**, 백업, 스냅샷이 퍼포먼스에 영향 없음
- **Writer Endpoint** — 항상 마스터(writer) DB만 가리킴 (쓰기 트래픽 진입점)
- **Reader Endpoint** — 모든 읽기 복제본과 자동 연결, **부하 분산** 수행
- 마스터 장애 시 복제본으로 **자동 Failover**

## Aurora Auto Scaling

- 클러스터에 프로비저닝된 **Read Replica 수를 동적 조정**
- MySQL, PostgreSQL 모두 지원
- 트래픽 패턴에 맞춰 항상 적절한 replica 수 유지

## 주요 특장점

| 항목 | 설명 |
|---|---|
| **빠른 Replica 승격** | 공유 스토리지이므로 primary 장애 시 초~십여 초 내 자동 승격 |
| **Replica Lag 최소화** | 보통 100ms 이하. 일반 RDS는 수 초까지 튈 수 있음 |
| **Aurora Global Database** | 1개 기본 리전 + **보조 리전 최대 5개**. RPO ~1초, RTO 1분 미만. 기본 리전 장애 시 보조 리전을 기본으로 승격 |
| **Aurora Serverless v2** | 초 단위 오토스케일, idle 시 낮은 비용. 가변 워크로드용 |
| **Backtrack** (MySQL) | 언두(undo) 스타일의 72시간 내 시간 되돌리기 |
| **Aurora Limitless Database** | 자동 샤딩으로 페타바이트 규모 + 초당 수백만 쓰기 트랜잭션. 2023 re:Invent 발표 |

## 언제 RDS 대신 Aurora를 고르나

- 읽기 트래픽이 많고 Lag에 민감한 서비스
- Multi-AZ + 다수 Read Replica 구성이 필요한 프로덕션
- 초단위 오토스케일이 필요한 SaaS(Aurora Serverless)
- 비용: 인스턴스 단가는 Aurora가 비싸지만 **스토리지, I/O, Replica 구성 총비용**은 낮은 경우가 많음
