---
tags: [infrastructure, aws, ec2, compute]
status: done
category: "Infrastructure - AWS"
aliases: ["EC2 컴퓨트 아키텍처", "Nitro System"]
---

# AWS EC2 — 컴퓨트 아키텍처

## 가상화 — Nitro System

| 측면 | Xen 기반 (구) | Nitro 기반 (현행) |
|------|--------------|------------------|
| 하이퍼바이저 | Xen | KVM 변형 (경량) |
| 네트워크, 스토리지 | 호스트 CPU에서 처리 | **전용 Nitro Card**로 오프로드 |
| 베어메탈 | 어려움 | 가능 (`.metal` 인스턴스) |
| 보안 격리 | 소프트웨어 분리 | 하드웨어 수준 격리 |
| 성능 오버헤드 | 큼 | ~ 베어메탈 수준 |

Nitro Card가 ENI(네트워크), EBS(스토리지), 보안을 별도 칩으로 처리 → 호스트 CPU는 게스트에 거의 100% 투입. 최신 인스턴스 패밀리(C5+, M5+, R5+)는 모두 Nitro.

## 스토리지 — Instance Store vs EBS

| 측면 | Instance Store | EBS (Elastic Block Store) |
|------|---------------|---------------------------|
| 위치 | 물리 호스트에 직결 | 네트워크 스토리지 |
| 성능 | 매우 빠름 (NVMe) | 빠름 (gp3, io2 옵션) |
| 영속성 | **휘발성** (Stop, Terminate 시 손실) | 영속 (인스턴스와 독립) |
| 스냅샷 | 불가 | S3에 자동 스냅샷 |
| 적합 | 캐시, 임시 처리, shuffle | 부트 디스크, DB 데이터 |

EBS 볼륨 유형:
- `gp3`(범용 SSD) 표준, IOPS, Throughput 분리 프로비저닝
- `io2 Block Express` 고성능 (DB)
- `st1`/`sc1` HDD (저비용 대용량)

## 인스턴스 패밀리

| 패밀리 | 특성 | 용도 |
|--------|------|------|
| `t3, t4g` | **Burstable** — CPU 크레딧 | 가변 부하 (개발, 소형 웹) |
| `m5, m6g, m7i` | 범용 균형 | 표준 워크로드 |
| `c5, c6g, c7i` | 컴퓨트 최적화 | 배치, HPC, 인코딩 |
| `r5, r6g, r7i` | 메모리 최적화 | DB, 캐시, 인메모리 분석 |
| `i3, i4i` | 스토리지 (NVMe) | 데이터베이스, 검색 |
| `g, p` | GPU | ML 학습, 추론, 그래픽 |
| `a1, m6g` (Graviton) | ARM | 비용 효율 ~20% ↓ |

## T 시리즈 CPU 크레딧 시스템

T 인스턴스는 **베이스라인 CPU 성능**(예: t3.medium 20%)을 기준으로:
- 사용량 < 베이스라인 → **크레딧 적립**
- 사용량 > 베이스라인 → **크레딧 소진하여 버스트** (100% CPU)
- 크레딧 0 → 베이스라인으로 강제 제한

| 모드 | 동작 |
|------|------|
| Standard | 크레딧 0 시 베이스라인 제한 (예측 가능 비용) |
| **Unlimited** (기본) | 크레딧 소진 후에도 풀 CPU, 추가 비용 발생 |

급증하는 트래픽이 있을 때 Unlimited는 비용 폭증 위험 — CloudWatch `CPUCreditBalance` 모니터링 필수.

## Placement Group — 물리 배치 제어

| 종류 | 의미 | 적합 |
|------|------|------|
| **Cluster** | 같은 AZ 내 좁은 영역에 배치 | HPC, 노드 간 저지연 (10Gbps+) |
| **Spread** | 노드별 다른 하드웨어 | 소수 인스턴스, 동시 장애 회피 |
| **Partition** | 파티션 단위 격리 (Kafka, HDFS) | 분산 시스템 장애 도메인 분리 |
