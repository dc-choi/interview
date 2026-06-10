---
tags: [infrastructure, aws, efs, storage, nfs, file-system]
status: done
category: "Infrastructure - AWS"
aliases: ["EFS", "Amazon EFS", "Elastic File System"]
---

# Amazon EFS (Elastic File System)

AWS의 **관리형 NFS 파일 스토리지**. 여러 EC2가 **동시에 마운트**해서 공유하는 네트워크 파일 시스템. 페타바이트까지 자동 확장되며 미리 용량 프로비저닝이 필요 없다.

## 핵심 특징

- 프로토콜 — **NFS v4.1 / v4.0**
- **VPC 내부에서 생성**, 보안 그룹으로 액세스 제어
- **수천 개의 EC2가 동시에** 액세스 가능 (concurrent connections)
- **탄력적 자동 확장** — 파일을 추가, 삭제하면 자동으로 늘고 줄어듦 (페타바이트까지)
- 사전 용량 프로비저닝 불필요, 사용한 만큼만 과금
- 계정당 최대 **1,000개의 파일 시스템** 생성 가능
- **POSIX 권한** 지원 (Linux/Unix 표준 파일 시스템처럼)

## 가용성, 내구성

- 기본적으로 **여러 가용영역(Multi-AZ)에 중복 저장** → 하나의 AZ 장애가 나도 다른 AZ에서 서비스 제공
- 각 AZ에 **Mount Target**을 두고 EC2가 같은 AZ의 Mount Target으로 접속
- **IPSec VPN / Direct Connect**를 통해 온프레미스에서도 마운트 가능
- 자동 백업 옵션 — AWS Backup과 통합

## 스토리지 클래스

| 클래스 | 가용영역 | 액세스 패턴 | 비용 |
|--------|----------|-------------|------|
| **EFS Standard** | Multi-AZ | 자주 액세스 | 표준 |
| **EFS Standard-IA** | Multi-AZ | 자주 액세스하지 않음 (Infrequent Access) | 저렴 (저장), 비쌈 (검색) |
| **EFS One Zone** | **Single-AZ** | 자주 액세스 | 표준보다 ~47% 저렴 |
| **EFS One Zone-IA** | **Single-AZ** | 자주 액세스하지 않음 | 가장 저렴 |

- **One Zone 클래스는 단일 AZ에 저장** → 해당 AZ 파괴 시 **데이터 손실 가능성** 존재
- One Zone은 비용 민감, 재생성 가능한 데이터에만 사용 권장

## 수명 주기 관리 (Lifecycle Management)

- 사용자가 지정한 **N일 동안 액세스되지 않은 파일**을 자동으로 IA 클래스로 이동
- 옵션: 7, 14, 30, 60, 90, 180, 270, 365일
- IA로 이동한 파일이 다시 액세스되면 **Standard로 복귀**시키는 옵션도 존재 (`Transition into Standard: On first access`)
- 비용 최적화의 핵심 — Cold 데이터는 IA로 자동 이동

## 처리량 모드 (Throughput Mode)

| 모드 | 동작 | 사용 사례 |
|------|------|-----------|
| **Bursting** (기본) | 스토리지 용량에 비례한 처리량, **버스트 크레딧** 누적해 단기 폭증 대응 | 일반 워크로드 |
| **Elastic** | 워크로드 특성에 따라 **자동으로 늘리고 줄임** | 예측 불가, 스파이크가 큰 워크로드 |
| **Provisioned** | 처리량을 **고정값으로 미리 지정** | 처리량을 보장해야 하는 안정적 워크로드 |

- Bursting은 작은 파일 시스템에서 큰 처리량이 필요할 때 한계 → Provisioned/Elastic으로 전환
- Elastic은 비싼 대신 가장 유연

## 성능 모드 (Performance Mode)

| 모드 | 특징 | 사용 사례 |
|------|------|-----------|
| **General Purpose** (기본) | **지연시간이 짧음**, 대부분 워크로드에 적합 | 웹 서버, CMS, 일반 파일 공유 |
| **Max I/O** | 다수 EC2 동시 접근에 최적화, **지연시간은 길어짐** | 빅데이터 분석, 미디어 처리 등 대규모 병렬 |

- 일반적으로 General Purpose가 정답, Max I/O는 **수백~수천 대가 병렬 접근**할 때만 고려
- 성능 모드는 **생성 후 변경 불가** → 처음 선택할 때 신중

## 파일 시스템 정책 (File System Policy)

- EFS를 사용하는 **모든 NFS 클라이언트에 적용되는 IAM 리소스 정책**
- 설정 가능 항목
  - **전송 중 암호화 강제** (TLS)
  - **루트 액세스 비활성화**
  - **읽기 전용 액세스**
  - 특정 IAM Principal에게만 마운트 허용
- 저장 데이터 암호화는 **KMS**로 (생성 시 활성화)

## EBS vs EFS vs S3 비교

| 기준 | EBS | EFS | S3 |
|------|-----|-----|-----|
| 타입 | **블록 스토리지** | **파일 시스템** (NFS) | **객체 스토리지** |
| 액세스 | 한 EC2에 1:1 (Multi-Attach 예외) | **다수 EC2 동시 마운트** | API (HTTPS) |
| 범위 | **AZ 한정** (스냅샷으로 리전 이전) | **Multi-AZ 또는 One Zone** | **리전 전역** |
| 프로토콜 | NVMe, iSCSI (블록) | **NFS v4.1** | REST API |
| 확장 | 볼륨 크기 사전 지정 (확장 가능) | **자동 탄력 확장** | 사실상 무제한 |
| 가격 모델 | 프로비저닝한 용량 | 사용한 만큼 | 사용한 만큼 + 요청, 전송 |
| 대표 용도 | 단일 EC2 부트, DB | 공유 파일 시스템, CMS, 홈디렉토리 | 정적 자산, 백업, 데이터 레이크 |

## 시험 체크포인트

- **여러 EC2가 동시에 공유**하는 파일 시스템 → **EFS** (EBS는 기본 단일 EC2)
- **Linux/Unix POSIX, NFS**가 보이면 → EFS (Windows SMB는 **FSx for Windows**)
- 단일 AZ에 저장해서 비용 절감하지만 AZ 장애 시 손실 → **One Zone / One Zone-IA**
- **자주 액세스하지 않는 파일**을 자동 이동 → 수명 주기 관리로 **IA 클래스 전환**
- 처리량 예측 불가 + 자동 확장 → **Elastic Throughput**
- 처리량 보장 필요 + 안정적 워크로드 → **Provisioned Throughput**
- **수백~수천 대 EC2 병렬 액세스** → **Max I/O Performance Mode** (지연시간 트레이드오프)
- 성능 모드는 **생성 후 변경 불가** (처리량 모드는 변경 가능)
- 온프레미스에서 마운트 → **VPN / Direct Connect** 필요
- 보안 그룹 + **파일 시스템 정책**으로 IAM 단위 제어 가능
- 저장 암호화는 **KMS**, 전송 암호화는 TLS (파일 시스템 정책으로 강제 가능)
- "공유 NFS + Multi-AZ + Auto Scaling 필요" → **무조건 EFS**

## 출처

- AWS SAA C03 학습 자료 (로컬)

## 관련 문서

- [[EBS]]
- [[S3]]
- [[Storage-Gateway-DataSync]]
- [[VPC]]
