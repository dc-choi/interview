---
tags: [infrastructure, aws, storage-gateway, datasync, hybrid-cloud]
status: done
category: "Infrastructure - AWS"
aliases: ["Storage Gateway", "AWS Storage Gateway", "DataSync", "AWS DataSync"]
verified_at: 2026-10-07
---

# Storage Gateway & DataSync

온프레미스와 AWS 스토리지를 잇는 두 가지 하이브리드 서비스. **Storage Gateway**는 온프레미스에서 AWS 스토리지에 상시 접근할 수 있는 **게이트웨이(가교)** 역할을 하고, **DataSync**는 대량 데이터를 **이전, 동기화**하는 자동화 서비스다.

## Storage Gateway 개요

- 클라우드 스토리지(S3, Glacier, FSx)를 온프레미스 환경에서 표준 프로토콜로 사용하도록 가교 역할
- 게이트웨이 자체는 스토리지가 아니라 **S3 등 백엔드의 진입점(Gateway)**
- 표준 프로토콜 제공 — **iSCSI / SMB / NFS**
- 게이트웨이 형태
  - 온프레미스 VM(VMware ESXi, Microsoft Hyper-V, KVM)
  - AWS 내 EC2 인스턴스
  - 기존 Storage Gateway **하드웨어 어플라이언스**. 2025-05-12부터 신규 판매가 종료됐고 기존 장비는 2028년 5월까지 지원된다.
- **Volume Gateway의 Stored Volume을 제외하면** 나머지 유형은 AWS의 EC2 기반 게이트웨이를 마운트 포인트로 활용 가능

## Storage Gateway 유형 비교

| 유형 | 프로토콜 | 백엔드 스토리지 | 데이터 형식 | 사용 사례 |
|------|----------|-----------------|-------------|-----------|
| **File Gateway** | NFS / SMB | S3 (Standard, Intelligent-Tiering, Standard-IA, One Zone-IA) | S3 객체 | 파일 공유, 백업 |
| **FSx File Gateway** | SMB | FSx for Windows File Server | FSx 파일 | 기존 고객의 Windows SMB 캐싱. 신규 고객은 사용 불가 |
| **Volume Gateway** | iSCSI | S3 (EBS Snapshot 형식) | 블록 | 온프레미스 블록 스토리지 백업 |
| **Tape Gateway** | iSCSI (VTL) | S3 / S3 Glacier | 가상 테이프 | 기존 테이프 백업 SW 대체 |

## File Gateway

- NFS / SMB로 S3 객체를 파일처럼 읽기, 쓰기
- 업로드 시 파일이 **S3 객체로 변환**되므로 S3 콘솔에서 직접 확인 가능
- S3 기능 전체 활용 가능 — **스토리지 클래스, 수명 주기, 버전 관리, 복제**
- 최근 사용된 데이터는 **게이트웨이 로컬 캐시**에 보관 → 저지연 액세스
- 지원 스토리지 클래스: Standard, Intelligent-Tiering, Standard-IA, One Zone-IA

### FSx File Gateway

- 신규 고객에게는 제공되지 않으며 기존 고객만 계속 사용할 수 있다.
- 온프레미스에서 **Amazon FSx for Windows File Server**에 SMB로 접근
- 파일 읽기, 쓰기는 로컬 캐시에서 수행하고, 변경분만 백그라운드에서 FSx에 동기화
- FSx가 SMB를 직접 지원하는데도 게이트웨이를 두는 이유 → **자주 접근하는 데이터의 로컬 캐싱**

## Volume Gateway

- iSCSI로 S3에 **블록 스토리지** 저장
- **EBS Snapshot 형식**으로 저장됨 → 복구 시 EBS 볼륨으로 마운트 가능
- 게이트웨이 1개당 최대 **32개 볼륨** 지원
- File Gateway와 달리 S3 콘솔에서 데이터를 직접 볼 수 **없음** (스냅샷 형식이라)
- 전송 데이터는 SSL, 저장 데이터는 **SSE-S3**로 암호화

### Cached vs Stored

| 구분 | 기본 스토리지 | 캐시/버퍼 | 시나리오 |
|------|---------------|-----------|----------|
| **Cached Volume** | S3 (클라우드) | 온프레미스 캐시, 업로드 버퍼 | 클라우드를 주 저장소로, 로컬은 캐시만 |
| **Stored Volume** | 온프레미스 | — (S3는 비동기 백업) | 로컬 우선, 낮은 지연, S3는 DR용 백업 |

## Tape Gateway

- 기존 **테이프 백업 워크플로**를 클라우드로 이전
- **VTL (Virtual Tape Library)** 지원 — 기존 백업 SW(NetBackup, Veeam 등) 그대로 사용
- 가상 테이프는 **S3 / S3 Glacier**에 저장 (장기 보관은 Glacier로 비용 절감)
- iSCSI 인터페이스로 백업 SW와 연동

## AWS DataSync 개요

- 온프레미스 ↔ AWS, 또는 AWS 서비스 간 **대량 데이터 이전, 동기화 자동화** 서비스
- 전송 채널 — **AWS Direct Connect, VPN, 인터넷**
- 온프레미스와 AWS 사이에는 **DataSync Agent**가 필요하다. 다른 클라우드의 파일 스토리지와 EFS / FSx 사이에도 agent가 필요하다. 다른 클라우드의 객체 스토리지와 S3 사이는 Basic 모드에서 agent가 필요하지만 Enhanced 모드는 agent 없이 전송할 수 있다.
- 같은 계정의 지원되는 AWS 스토리지 서비스 사이는 보통 agent가 필요 없다. 다만 S3 on Outposts가 포함되거나, S3가 포함되지 않은 일부 교차 계정 전송처럼 agent가 필요한 예외가 있다.
- 전송 작업의 스케줄링, 증분 동기화, 검증, 암호화, 압축 자동 처리
- TLS 전송 중 암호화 기본 활성화

## DataSync 지원 소스/타겟

| 방향 | 소스/타겟 |
|------|-----------|
| **온프레미스 → AWS** | NFS, SMB, HDFS, Object Storage (S3 호환) |
| **AWS 서비스 간** | S3, EFS, FSx for Windows, FSx for Lustre, FSx for OpenZFS, FSx for NetApp ONTAP |
| **AWS → 온프레미스** | (역방향 동기화도 지원) |

## DataSync Enhanced 모드와 파티션 간 S3 전송

Enhanced는 목록 조회, 준비, 전송과 검증을 병렬화하고 Basic은 준비, 전송과 검증을 순차 수행한다. **Enhanced가 항상 agent 없는 모드라는 뜻은 아니다.** 지원 location 조합과 agent 필요 여부를 함께 확인하며, 작업을 만든 뒤에는 task mode를 바꿀 수 없다.

상용 AWS와 AWS GovCloud (US)의 S3 버킷 사이에는 다음 구성을 쓴다.

1. 작업을 실행할 리전의 버킷은 Amazon S3 location으로 둔다.
2. 다른 파티션의 버킷은 같은 작업 리전에서 **Object storage location**으로 등록한다. 반대쪽 S3 endpoint, 버킷과 해당 버킷에 접근할 IAM 사용자 자격 증명이 필요하다.
3. agent 없이 전송하려면 Enhanced를 선택한다. Basic이면 agent가 필요하다. 이 S3 구성의 조건을 모든 EFS/FSx 파티션 간 전송에 확대하지 않는다.
4. IAM 사용자는 필요한 버킷 작업만 허용하고 더 이상 필요하지 않으면 제거한다. 장기 자격 증명을 문서나 명령 예시에 넣지 않는다.

이는 다른 파티션의 IAM role을 그대로 참조하는 일반 S3 location 두 개의 구성이 아니다. Object storage location의 인증 경계를 별도로 다룬다. 전송 기능의 지원과 해당 데이터를 파티션 밖으로 옮겨도 되는지는 다른 판단이다.

Enhanced의 검증은 전송한 데이터를 대상으로 하므로 대상 버킷 전체가 원본과 같다는 보증으로 해석하지 않는다. 실행 상태, 검증 결과와 필요한 데이터 범위를 함께 확인한다. 실제 계정의 권한과 전송 실행은 이 문서에서 검증하지 않았다.

## Storage Gateway vs DataSync

| 기준 | Storage Gateway | DataSync |
|------|-----------------|----------|
| 목적 | **상시 액세스** (마운트해서 사용) | **일회성, 반복 이전** (마이그레이션, 동기화) |
| 액세스 패턴 | 파일, 블록, 테이프 프로토콜로 실시간 사용 | 배치성 대량 전송 |
| 캐시 | 로컬 캐시로 저지연 | 캐시 없음, 전송 자체가 목적 |
| 대표 시나리오 | 온프레미스 앱이 S3를 NFS처럼 마운트 | 데이터센터 종료, 페타바이트 마이그레이션 |

## 시험 체크포인트

- **NFS/SMB로 S3 객체에 접근 + 로컬 캐시**가 키워드면 → **File Gateway**
- **iSCSI 블록 스토리지 + EBS Snapshot 백업**이면 → **Volume Gateway** (Cached/Stored 구분 주의)
- **VTL, 가상 테이프 라이브러리, 기존 백업 SW 유지**가 보이면 → **Tape Gateway**
- **온프레미스 → S3 일회성 페타바이트 이전**은 → **DataSync** (혹은 더 크면 Snowball Family — 기존 Snow 고객 한정, 신규는 Data Transfer Terminal이나 파트너, [[Snow-Family]])
- **같은 계정의 지원되는 AWS 스토리지 서비스 간 동기화** (S3 ↔ EFS, EFS ↔ FSx) → **DataSync**, 일반적으로 agent 불필요
- **상시 마운트해서 사용**할 거면 Storage Gateway, **이전, 복제 자동화**면 DataSync
- File Gateway는 **S3 콘솔에서 객체 직접 확인 가능**, Volume Gateway는 **불가** (스냅샷 형식)
- Volume Gateway 데이터 암호화 — 전송 SSL, 저장 **SSE-S3**

## 출처

2026-10-07 추가 대조 범위는 DataSync task mode, 파티션 간 S3 location 구성과 권한 경계다. Storage Gateway 절의 기존 검증 기준은 2026-09-03이다.

- [AWS DataSync, Choosing a task mode for your data transfer](https://docs.aws.amazon.com/datasync/latest/userguide/choosing-task-mode.html)
- [AWS DataSync, Configuring transfers with Amazon S3](https://docs.aws.amazon.com/datasync/latest/userguide/create-s3-location.html) — 상용 리전과 GovCloud 간 S3 전송 절.
- [AWS Storage Gateway, How Volume Gateway works](https://docs.aws.amazon.com/storagegateway/latest/vgw/StorageGatewayConcepts.html)
- [AWS Storage Gateway, Hardware Appliance end of availability](https://docs.aws.amazon.com/storagegateway/latest/vgw/appliance-launch-gateway.html)
- [AWS Storage Gateway API, GatewayInfo](https://docs.aws.amazon.com/storagegateway/latest/APIReference/API_GatewayInfo.html)
- [AWS DataSync, Where can I transfer my data?](https://docs.aws.amazon.com/datasync/latest/userguide/working-with-locations.html)
- [AWS DataSync, Do I need an agent?](https://docs.aws.amazon.com/datasync/latest/userguide/do-i-need-datasync-agent.html)
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서

- [[S3]]
- [[EFS]]
- [[EBS]]
- [[VPC]]
