---
tags: [infrastructure, aws, efs, storage, nfs, file-system]
status: done
category: "Infrastructure - AWS"
aliases: ["EFS", "Amazon EFS", "Elastic File System"]
verified_at: 2026-07-21
---

# Amazon EFS (Elastic File System)

AWS의 **관리형 NFS 파일 스토리지**. 여러 클라이언트가 **동시에 마운트**해서 공유하는 네트워크 파일 시스템이다. 저장량에 따라 자동 확장, 축소되므로 미리 스토리지 용량을 프로비저닝할 필요는 없지만 파일 크기, 처리량, 연결과 계정별 서비스 할당량은 적용된다.

## 핵심 특징

- 프로토콜 — **NFS v4.1 / v4.0**
- EFS 파일 시스템에 접근할 **mount target을 VPC subnet에 생성**하고 보안 그룹으로 NFS 네트워크 접근 제어
- 많은 NFS 클라이언트가 동시에 액세스할 수 있으나 클라이언트 연결과 작업별 할당량을 확인해야 함
- **탄력적 자동 확장** — 파일을 추가, 삭제하면 저장량이 자동으로 늘고 줄어듦. 단일 파일 최대 크기는 47.9 TiB
- 사전 저장 용량 프로비저닝은 불필요. 저장 클래스 용량 외에도 선택한 throughput mode, Elastic I/O, IA/Archive 접근과 데이터 전송 등에 따라 과금
- 리전과 계정별 파일 시스템 수에는 조정 가능한 서비스 할당량이 적용됨
- **POSIX 권한** 지원 (Linux/Unix 표준 파일 시스템처럼)

## 가용성, 내구성

- **Regional 파일 시스템**은 여러 가용영역에 중복 저장해 AZ 장애에 대비. **One Zone 파일 시스템**은 단일 AZ이므로 예외
- 각 AZ에 **Mount Target**을 두고 EC2가 같은 AZ의 Mount Target으로 접속
- **IPSec VPN / Direct Connect**를 통해 온프레미스에서도 마운트 가능
- 자동 백업 옵션 — AWS Backup과 통합

## 스토리지 클래스

| 클래스 | 가용영역 | 액세스 패턴 | 비용 |
|--------|----------|-------------|------|
| **EFS Standard** | Multi-AZ | 자주 액세스 | 가장 낮은 지연시간 |
| **EFS Infrequent Access** | Multi-AZ | 분기당 몇 번 정도 액세스 | 저장 단가는 낮고 액세스 요금 적용 |
| **EFS Archive** | Multi-AZ, Elastic throughput 필요 | 연간 몇 번 이하 액세스 | 90일 최소 보관, 액세스 요금 적용 |
| **EFS One Zone** | **Single-AZ** | 자주 액세스 | 리전과 사용량별 최신 요금 확인 |
| **EFS One Zone-IA** | **Single-AZ** | 자주 액세스하지 않음 | 저장과 액세스 요금의 트레이드오프 |

- **One Zone 클래스는 단일 AZ에 저장** → 해당 AZ 파괴 시 **데이터 손실 가능성** 존재
- One Zone은 비용 민감, 재생성 가능한 데이터에만 사용 권장

## 수명 주기 관리 (Lifecycle Management)

- 정책에서 정한 기간 동안 액세스되지 않은 파일을 IA 또는 지원되는 경우 Archive로 이동. 현재 기본값은 IA 30일, Archive 90일
- 선택 가능한 기간에는 1일도 포함되며 전환 조합은 파일 시스템 유형과 현재 AWS 정책에 따라 콘솔, API에서 확인
- IA나 Archive 파일을 처음 다시 읽을 때 **Standard로 복귀**시키는 옵션이 있지만 현재 기본값은 복귀하지 않음
- 비용 최적화의 핵심 — Cold 데이터는 IA로 자동 이동

## 처리량 모드 (Throughput Mode)

| 모드 | 동작 | 사용 사례 |
|------|------|-----------|
| **Elastic** (기본, 권장) | 실제 메타데이터와 데이터 I/O에 맞춰 자동 확장, 전송량 기반 과금 | 예측하기 어렵거나 평균 대비 peak가 큰 워크로드 |
| **Provisioned** | 파일 시스템 크기와 독립적으로 처리량을 지정하고 초과 provisioned 양에 과금 | 요구 처리량을 알고 평균 사용률이 높은 워크로드 |
| **Bursting** | Standard 저장량에 비례한 baseline과 **burst credit** 사용 | 저장량에 따라 처리량을 확장하려는 워크로드 |

- Bursting에서 허용 처리량을 지속적으로 많이 사용하거나 credit을 소진하면 Elastic 또는 Provisioned를 비교
- 어느 모드가 더 저렴한지는 저장량, 평균과 peak 처리량, 읽기/쓰기 비율로 계산하고 CloudWatch 사용량으로 검증

## 성능 모드 (Performance Mode)

| 모드 | 특징 | 사용 사례 |
|------|------|-----------|
| **General Purpose** (기본) | **지연시간이 짧음**, 대부분 워크로드에 적합 | 웹 서버, CMS, 일반 파일 공유 |
| **Max I/O** (이전 세대) | 더 높은 operation 지연시간. One Zone과 Elastic throughput에서는 지원하지 않음 | 기존 호환성이 필요한 Regional 파일 시스템만 검토 |

- AWS는 신규 및 기존 파일 시스템 모두 General Purpose 사용을 권장한다. 병렬 클라이언트 수만으로 Max I/O를 선택하지 않음
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
| 확장 | 볼륨 크기 사전 지정 (확장 가능) | **저장량 자동 탄력 확장**, 단일 파일과 서비스 할당량 적용 | 버킷과 객체, 요청별 할당량 안에서 대규모 확장 |
| 가격 모델 | 프로비저닝한 용량과 성능 | 스토리지 클래스, throughput mode, I/O와 접근 요금 | 저장량 + 요청, 검색과 전송 등 |
| 대표 용도 | 단일 EC2 부트, DB | 공유 파일 시스템, CMS, 홈디렉토리 | 정적 자산, 백업, 데이터 레이크 |

## 시험 체크포인트

- **여러 EC2가 동시에 공유**하는 파일 시스템 → **EFS** (EBS는 기본 단일 EC2)
- **Linux/Unix POSIX, NFS**가 보이면 → EFS (Windows SMB는 **FSx for Windows**)
- 단일 AZ에 저장해서 비용 절감하지만 AZ 장애 시 손실 → **One Zone / One Zone-IA**
- **자주 액세스하지 않는 파일**을 자동 이동 → 수명 주기 관리로 **IA 클래스 전환**
- 처리량 예측 불가 + 자동 확장 → **Elastic Throughput**
- 처리량 요구를 알고 평균 사용률이 높음 → **Provisioned Throughput** 비교
- 신규 파일 시스템의 성능 모드 → **General Purpose** 권장. Max I/O는 이전 세대 호환성과 제약을 확인
- 성능 모드는 **생성 후 변경 불가**. 처리량 모드는 대체로 변경 가능하지만 Archive 데이터가 있으면 Elastic에서 Bursting이나 Provisioned로 변경할 수 없음
- 온프레미스에서 마운트 → **VPN / Direct Connect** 필요
- 보안 그룹 + **파일 시스템 정책**으로 IAM 단위 제어 가능
- 저장 암호화는 **KMS**, 전송 암호화는 TLS (파일 시스템 정책으로 강제 가능)
- "공유 NFS + Multi-AZ + 저장량 자동 확장 필요" → EFS가 우선 후보. 지연시간, 처리량, OS, 비용과 파일 크기 요건에 따라 FSx 계열이나 다른 스토리지도 비교

## 출처

- AWS SAA C03 학습 자료 (로컬)
- [AWS EFS 서비스 할당량](https://docs.aws.amazon.com/efs/latest/ug/limits.html)
- [AWS EFS 성능과 처리량 모드](https://docs.aws.amazon.com/efs/latest/ug/performance.html)
- [AWS EFS 스토리지 클래스와 가용성](https://docs.aws.amazon.com/efs/latest/ug/features.html)
- [AWS EFS lifecycle management](https://docs.aws.amazon.com/efs/latest/ug/lifecycle-management-efs.html)

## 관련 문서

- [[EBS]]
- [[S3]]
- [[Storage-Gateway-DataSync]]
- [[VPC]]
