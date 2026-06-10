---
tags: [infrastructure, aws, fsx, storage, file-system, lustre, windows, ontap, openzfs]
status: done
category: "Infrastructure - AWS"
aliases: ["FSx", "Amazon FSx", "FSx for Windows", "FSx for Lustre", "FSx for ONTAP", "FSx for OpenZFS"]
---

# Amazon FSx

**서드파티 파일 시스템**(Windows, Lustre, NetApp ONTAP, OpenZFS)을 AWS 위에서 완전 관리형으로 제공하는 서비스. EFS가 AWS 고유의 NFS라면, FSx는 **이미 익숙한 엔터프라이즈 파일 시스템을 그대로 클라우드에서** 쓰게 해 준다.

## 핵심 특징

- **완전 관리형** — 하드웨어 프로비저닝, 소프트웨어 구성, 패치, 백업 자동 처리
- **VPC 내부**에서 실행, 보안 그룹, 서브넷으로 액세스 제어
- 유휴, 전송 데이터 **자동 암호화** (KMS, TLS)
- **단일 AZ / 다중 AZ** 배포 선택 가능
- 4가지 파일 시스템 엔진을 지원 (Windows, Lustre, ONTAP, OpenZFS)

## 4종 비교 한눈에

| 엔진 | 프로토콜 | 대표 OS, 워크로드 | 특징 |
|------|----------|------------------|------|
| **FSx for Windows File Server** | **SMB** | Windows | AD 통합, DFS 네임스페이스 |
| **FSx for Lustre** | **POSIX (Lustre)** | Linux HPC | 수백 GB/s 처리량, S3 연동 |
| **FSx for NetApp ONTAP** | **NFS, SMB, iSCSI** | Linux + Windows 혼합 | 멀티프로토콜, 스냅샷, 복제 |
| **FSx for OpenZFS** | **NFS** | Linux | ZFS 스냅샷, 복제, 저지연 |

## FSx for Windows File Server

- **SMB(Server Message Block)** 프로토콜로 Windows 파일 서버 제공
- **Microsoft Active Directory(AD) 통합** → Windows 도메인 환경 그대로
- **DFS(분산 파일 시스템) 네임스페이스** 지원 — 여러 파일 시스템의 공유를 하나의 공통 폴더 구조로 그룹화
- ACL, 사용자 할당량 등 Windows 네이티브 기능 지원
- **단일 AZ / 다중 AZ** 선택 가능 (다중 AZ는 자동 페일오버)
- 대표 사용 사례 — Windows 홈 디렉토리, SharePoint, IIS, 엔터프라이즈 파일 공유

## FSx for Lustre

- **고성능 컴퓨팅(HPC)** 워크로드에 특화된 병렬 파일 시스템
- Linux 인스턴스에서 **POSIX 호환** 프로토콜로 접근 (AWS, 온프레미스 컨테이너 포함)
- 수백 **GB/s 처리량**과 **수백만 IOPS**, 밀리초 미만 지연시간
- **S3 통합**이 강점 — S3 버킷을 Lustre 파일 시스템으로 마운트
  - S3 데이터셋을 FSx에 연결해 **분석 실행** → 결과를 다시 S3로 기록 → 파일 시스템 삭제 가능
  - "Lazy load" 방식 — 처음 접근 시 S3에서 캐싱
- 배포 옵션
  - **Scratch File System** — 임시, 고성능, 복제 없음. 단기 처리에 저렴
  - **Persistent File System** — 장기 보관, 복제 있음, 고가용성 워크로드
- 대표 사용 사례 — 머신러닝 학습, 미디어 처리, 유전체 분석, 금융 시뮬레이션

## FSx for NetApp ONTAP

- NetApp ONTAP 운영체제를 AWS에서 그대로 사용
- **멀티프로토콜** — NFS, SMB, iSCSI 동시 지원 → Linux, Windows, 블록까지 한 번에
- **스냅샷, 클론, 복제(SnapMirror), 중복 제거, 압축** 등 ONTAP 기능 활용
- 온프레미스 NetApp 환경을 **그대로 AWS로 이전**하는 시나리오에 적합
- 자동 계층화 — 자주 안 쓰는 데이터를 저비용 용량 풀로 이동
- 대표 사용 사례 — 엔터프라이즈 NAS 마이그레이션, 멀티 OS 환경 공유 스토리지

## FSx for OpenZFS

- **ZFS 파일 시스템**을 관리형으로 제공
- **NFS v3/v4/v4.1/v4.2** 지원 (Linux, Mac, Windows 클라이언트도 NFS로 접근)
- **ZFS 스냅샷, 복제, 압축, 중복 제거** 활용
- 저지연, 고 IOPS — 데이터베이스, DevOps, 전자 설계(EDA) 워크로드에 적합
- 데이터 무결성을 위한 **체크섬, copy-on-write**

## EFS와의 차이

| 기준 | EFS | FSx |
|------|-----|-----|
| 파일 시스템 | AWS 자체 (NFS v4.1) | **서드파티 엔진** (Windows, Lustre, ONTAP, OpenZFS) |
| 프로토콜 | **NFS만** | **SMB, POSIX/Lustre, NFS, iSCSI** (엔진별) |
| OS | **Linux/Unix 전용** | Windows, Linux, 혼합 |
| 자동 확장 | 페타바이트까지 **자동 탄력 확장** | **사전 프로비저닝** 필요 (변경은 가능) |
| HPC | 불가 | **Lustre가 전용** |
| Windows 환경 | 부적합 | **for Windows / ONTAP** |
| 비용 모델 | 사용한 만큼 | 프로비저닝 용량 기준 |

## 백업, 고가용성

- 모든 FSx는 **자동 일일 백업** 지원 — AWS Backup과 통합
- **다중 AZ** 배포 시 활성-대기 페일오버 자동 처리
- 단일 AZ 배포는 비용 절감이지만 AZ 장애 시 다운타임 가능
- KMS로 저장 데이터 암호화, TLS로 전송 데이터 암호화

## 시험 체크포인트

- **Windows + SMB + Active Directory** → **FSx for Windows File Server**
- **Linux + HPC + 수백 GB/s 처리량** → **FSx for Lustre**
- **S3 데이터셋을 파일 시스템으로 마운트**해서 분석 → **FSx for Lustre**
- **Linux + Windows 혼합 + 멀티프로토콜(NFS, SMB, iSCSI)** → **FSx for NetApp ONTAP**
- **온프레미스 NetApp 환경 마이그레이션** → **FSx for ONTAP**
- **ZFS 스냅샷, 복제 + 저지연 NFS** → **FSx for OpenZFS**
- "공유 NFS + Linux 전용 + 자동 확장" → **EFS** (FSx 아님)
- "Windows SMB" 키워드가 보이면 **EFS가 아니라 FSx for Windows** (EFS는 NFS 전용)
- **DFS 네임스페이스**로 여러 파일 공유 그룹화 → **FSx for Windows**
- Lustre의 두 배포 옵션 — **Scratch**(임시, 저렴) vs **Persistent**(장기, 복제)
- FSx 전체 — 단일 AZ vs **다중 AZ** 선택. 프로덕션은 다중 AZ
- 저장 암호화 **KMS**, 전송 암호화 **TLS** — 모든 FSx 공통

## 출처

- AWS SAA C03 학습 자료 (로컬)

## 관련 문서

- [[EFS]]
- [[EBS]]
- [[S3]]
- [[Storage-Gateway-DataSync]]
- [[VPC]]
