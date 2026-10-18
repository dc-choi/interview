---
tags: [postgresql, storage, nvme, ebs, performance, durability]
status: done
verified_at: 2026-10-16
category: "데이터&저장소(Data&Storage)"
aliases: ["PostgreSQL Storage Bottlenecks", "PostgreSQL 스토리지 병목"]
---

# PostgreSQL 스토리지 병목과 내구성

작업 데이터가 `shared_buffers`와 운영체제 캐시보다 커지면 무작위 페이지 읽기와 WAL 기록이 처리량을 제한할 수 있다. 이때 CPU가 덜 바쁘다는 사실은 계산 여유의 증거인 동시에 I/O를 기다리는 신호일 수 있다.

## 부하가 경쟁하는 위치

애플리케이션 쿼리, VACUUM, 체크포인트와 복제는 같은 스토리지 경로를 사용할 수 있다. 쿼리 하나의 실행 계획 외에 장치 지연, IOPS 한도와 대기열, `pg_stat_activity`의 wait event를 함께 본다. CPU 프로파일의 함수별 비율과 전체 wall time도 구분한다.

## 비교 사례의 조건

2026-10-13 GeekNews 입력의 9.24배는 2026-10-16 확인한 ClickHouse 벤치마크 수치와 연결된다.

- PostgreSQL 18.3, `m6id.4xlarge`, 16 vCPU와 64GiB RAM, `shared_buffers=16GB`.
- 33억 행, heap 482GiB, 무작위 단일 행 UPDATE, client 64개와 thread 16개, 5분.
- 로컬 instance-store NVMe와 기본 3,000 IOPS gp3 EBS 비교.
- 중앙 처리량 16,030 TPS와 1,734 TPS로 약 9.24배다. 게시문은 9.2배로 반올림한다.

이는 해당 워크로드와 스토리지 구성의 측정이다. EBS 전체 제품군의 한계나 모든 PostgreSQL 쿼리의 개선 배율로 확대하지 않는다. gp3 IOPS와 처리량을 높인 구성, 캐시에 들어가는 데이터나 다른 병렬도에서는 다시 비교해야 한다.

## 성능과 데이터 보존은 별도 계약

로컬 instance store는 노드 수명에 묶인다. 교체 뒤 볼륨을 다시 붙일 수 있는 영속 블록 저장소와 다르다. 로컬 NVMe를 정본 저장에 쓰려면 복제, 장애 전환, WAL 아카이브와 백업 복원을 함께 설계한다.

동기 복제 설정 하나만으로 모든 장애에서 무손실을 단정하지 않는다. 승인 응답의 조건, failover 대상과 fencing, 복수 노드 손실을 따로 검증한다. 빠른 디스크는 행 저장을 열 저장으로 바꾸지 않으므로 대규모 분석 스캔의 별도 설계 필요성도 남는다.

## 운영 점검

1. 같은 쿼리, 데이터, 캐시 상태와 내구성 옵션으로 비교한다.
2. 평균뿐 아니라 p95/p99와 오류율, 유지보수의 진행률을 본다.
3. 노드 제거와 복원 시간을 포함해 비용을 계산한다.

공개 벤치마크와 조건만 대조했으며 직접 재현하거나 복구 시험을 하지 않았다.

## 출처

- [Postgres on NVMe: performance and the convergence of transactions and analytics — ClickHouse](https://clickhouse.com/blog/postgres-on-nvme)

## 관련 문서

- [[PostgreSQL-Production-Operations|PostgreSQL 운영]]
- [[Storage-and-FileSystem-Performance|디스크 I/O와 RAID]]
- [[Backup-Restore|백업과 복구]]
