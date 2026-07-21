---
tags: [infrastructure, aws, ec2, compute]
status: done
category: "Infrastructure - AWS"
aliases: ["EC2 컴퓨트 아키텍처", "Nitro System"]
verified_at: 2026-07-21
---

# AWS EC2 — 컴퓨트 아키텍처

## 가상화 — Nitro System

| 측면 | Xen 기반 (구) | Nitro 기반 (현행) |
|------|--------------|------------------|
| 하이퍼바이저 | Xen | KVM 변형 (경량) |
| 네트워크, 스토리지 | 호스트 CPU에서 처리 | **전용 Nitro Card**로 오프로드 |
| 베어메탈 | 어려움 | 가능 (`.metal` 인스턴스) |
| 보안 격리 | 소프트웨어 분리 | 하드웨어 수준 격리 |
| 성능 오버헤드 | 워크로드와 세대에 따라 다름 | I/O 기능을 전용 하드웨어로 오프로드해 호스트 자원을 인스턴스에 더 많이 제공 |

Nitro System은 네트워크, EBS 스토리지, 관리 기능을 전용 카드와 보안 칩으로 오프로드한다. 다수의 현행 인스턴스 타입이 Nitro 기반이지만 지원 기능은 타입과 크기별로 다르므로 EC2 인스턴스 유형 표에서 확인한다.

## 스토리지 — Instance Store vs EBS

| 측면 | Instance Store | EBS (Elastic Block Store) |
|------|---------------|---------------------------|
| 위치 | 물리 호스트에 직결 | 네트워크 스토리지 |
| 성능 | 매우 빠름 (NVMe) | 빠름 (gp3, io2 옵션) |
| 영속성 | **휘발성** (Stop, Hibernate, Terminate와 호스트 장애 시 손실 가능) | 볼륨 수명 주기와 `DeleteOnTermination` 설정에 따라 인스턴스 종료 뒤에도 유지 가능 |
| 스냅샷 | 직접 지원하지 않음 | 요청 또는 정책에 따라 EBS 스냅샷 생성 |
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
| `a1, m6g` (Graviton) | ARM | ARM64 호환성이 있는 워크로드에서 가격 대비 성능을 측정해 비교 |

## T 시리즈 CPU 크레딧 시스템

T 인스턴스는 **베이스라인 CPU 성능**(예: t3.medium 20%)을 기준으로:
- 사용량 < 베이스라인 → **크레딧 적립**
- 사용량 > 베이스라인 → **크레딧 소진하여 버스트** (100% CPU)
- 크레딧 0 → 베이스라인으로 강제 제한

| 모드 | 동작 |
|------|------|
| Standard | 크레딧 0 시 베이스라인 제한 (예측 가능 비용) |
| **Unlimited** | 크레딧 소진 후에도 베이스라인을 넘겨 버스트할 수 있고 일정 조건에서 surplus credit 요금 발생. T3/T4g 온디맨드의 초기 설정은 시작 경로와 구성에 따라 확인 |

급증하는 트래픽이 있을 때 Unlimited는 추가 비용이 생길 수 있으므로 `CPUCreditBalance`, `CPUSurplusCreditBalance`, `CPUSurplusCreditsCharged`를 함께 모니터링한다.

## Placement Group — 물리 배치 제어

| 종류 | 의미 | 적합 |
|------|------|------|
| **Cluster** | 같은 AZ 내 저지연 네트워크에 유리하도록 가깝게 배치 | HPC, 노드 간 고대역폭과 저지연 |
| **Spread** | 노드별 다른 하드웨어 | 소수 인스턴스, 동시 장애 회피 |
| **Partition** | 파티션 단위 격리 (Kafka, HDFS) | 분산 시스템 장애 도메인 분리 |

## 출처

- [AWS Nitro System](https://docs.aws.amazon.com/whitepapers/latest/security-design-of-aws-nitro-system/the-components-of-the-nitro-system.html)
- [Nitro 기반 EC2 인스턴스](https://docs.aws.amazon.com/ec2/latest/instancetypes/ec2-nitro-instances.html)
- [버스터블 성능 인스턴스의 CPU 크레딧](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-credits-baseline-concepts.html)
- [인스턴스 스토어 수명](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-store-lifetime.html)
