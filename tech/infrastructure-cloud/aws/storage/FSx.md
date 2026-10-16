---
tags: [infrastructure, aws, fsx, storage, file-system, lustre, windows, ontap, openzfs]
status: done
category: "Infrastructure - AWS"
aliases: ["FSx", "Amazon FSx", "FSx for Windows", "FSx for Lustre", "FSx for ONTAP", "FSx for OpenZFS"]
verified_at: 2026-09-03
---

# Amazon FSx

**서드파티 파일 시스템**(Windows, Lustre, NetApp ONTAP, OpenZFS)을 AWS 위에서 완전 관리형으로 제공하는 서비스. EFS가 AWS 고유의 NFS라면, FSx는 **이미 익숙한 엔터프라이즈 파일 시스템을 그대로 클라우드에서** 쓰게 해 준다.

## 핵심 특징

- **완전 관리형** — 하드웨어 프로비저닝, 소프트웨어 구성, 패치와 백업 기능 제공
- **VPC 내부**에서 실행, 보안 그룹, 서브넷으로 액세스 제어
- 저장 데이터는 **KMS로 암호화**. 전송 중 암호화 방식과 지원 조건은 엔진, 프로토콜과 클라이언트에 따라 다름
- Windows, ONTAP, OpenZFS는 **단일 AZ / 다중 AZ** 배포 옵션을 제공. Lustre는 Scratch / Persistent 배포 유형과 스토리지 클래스를 선택
- 4가지 파일 시스템 엔진을 지원 (Windows, Lustre, ONTAP, OpenZFS)

## 4종 비교 한눈에

| 엔진 | 프로토콜 | 대표 OS, 워크로드 | 특징 |
|------|----------|------------------|------|
| **FSx for Windows File Server** | **SMB** | Windows | AD 통합, DFS 네임스페이스 |
| **FSx for Lustre** | **POSIX (Lustre)** | Linux HPC | 최대 수 TB/s 처리량, S3 연동 |
| **FSx for NetApp ONTAP** | **NFS, SMB, iSCSI** | Linux + Windows 혼합 | 멀티프로토콜, 스냅샷, 복제 |
| **FSx for OpenZFS** | **NFS** | Linux | ZFS 스냅샷, 데이터 클론, 저지연 |

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
- 스토리지 클래스와 구성에 따라 최대 **수 TB/s 처리량**, 수백만 IOPS와 밀리초 미만 지연시간 제공
- **S3 통합** — 지원 구성에서 S3 버킷이나 prefix를 데이터 리포지토리로 연결하고, 클라이언트는 FSx 파일 시스템을 마운트한다
  - 파일 메타데이터를 가져온 뒤 첫 접근 때 S3의 실제 데이터를 FSx로 로드한다
  - 결과는 export로 S3에 반영한다. 파일 시스템 삭제 전에는 미반영 변경이 없는지 확인한다
- 배포 옵션
  - **Scratch File System** — 임시, 고성능, 복제 없음. 단기 처리에 저렴
  - **Persistent File System** — 장기 보관, 복제 있음, 고가용성 워크로드
- 대표 사용 사례 — 머신러닝 학습, 미디어 처리, 유전체 분석, 금융 시뮬레이션

### Lustre의 처리량, 메타데이터와 S3 반영을 분리한다

2026-10-07 공식 문서 기준, 높은 총 처리량만으로 작은 파일이 많은 작업의 성능을 판단할 수 없다. 파일 생성, 목록과 삭제 같은 메타데이터 연산도 별도 병목이 된다.

- **Metadata IOPS**: Lustre 2.15의 Persistent 2에서 생성 시 metadata configuration을 지정한 파일 시스템은 메타데이터 성능을 높일 수 있다. SSD의 Automatic 모드는 저장 용량에 연동되고 User-provisioned 모드는 따로 지정한다. Intelligent-Tiering은 User-provisioned만 지원한다. 기존 파일 시스템에 설정을 나중에 추가할 수 있다고 가정하지 않는다.
- **용량 조정의 한계**: Metadata IOPS는 증설만 가능하고 축소는 지원하지 않는다. `Metadata IOPS Utilization`을 보고 데이터 처리량 부족과 구분한다. 12,000 IOPS를 넘어 새 메타데이터 서버가 추가돼도 기존 메타데이터와 하위 디렉터리는 원래 서버에 남으므로 기존 파일까지 같은 비율로 빨라진다고 가정하지 않는다.
- **메타데이터 import와 실제 읽기**: 파일 목록이 보여도 본문을 모두 내려받은 것은 아니다. 첫 읽기는 S3에서 데이터를 가져오고 후속 읽기는 파일 시스템에서 처리한다. 첫 실행과 재실행 시간을 따로 측정하고, 필요하면 preload를 검토한다.
- **결과 보존**: 자동 export는 비동기다. 자동 export를 켠 DRA나 파일 시스템을 삭제하기 전 `AgeOfOldestQueuedMessage`가 0인지 확인한다. 수동 export task를 사용했다면 작업 완료와 결과를 확인한다. 자동 export와 export task는 동시에 사용할 수 없다.
- **지원 범위와 충돌**: DRA는 Lustre 2.10, Scratch 1과 Intelligent-Tiering에 일반화하지 않는다. S3와 FSx에서 같은 파일을 동시에 바꾸는 경우에는 애플리케이션 수준의 조정이 필요하다.

성능 비교에서는 같은 데이터셋의 첫 읽기, 재읽기, 메타데이터 작업과 결과 export 시간을 나눠 기록한다. 이 절은 Lustre의 해당 조건만 대조했으며 다른 엔진의 기능과 한도는 다시 검증하지 않았다.

## FSx for NetApp ONTAP

- NetApp ONTAP 운영체제를 AWS에서 그대로 사용
- **멀티프로토콜** — NFS, SMB, iSCSI 동시 지원 → Linux, Windows, 블록까지 한 번에
- **스냅샷, 클론, 복제(SnapMirror), 중복 제거, 압축** 등 ONTAP 기능 활용
- 온프레미스 NetApp 환경을 **그대로 AWS로 이전**하는 시나리오에 적합
- 자동 계층화 — 자주 안 쓰는 데이터를 저비용 용량 풀로 이동
- 대표 사용 사례 — 엔터프라이즈 NAS 마이그레이션, 멀티 OS 환경 공유 스토리지

### S3 access point로 파일 데이터에 접근하기

2026-10-07 공식 문서 기준, ONTAP 볼륨에 S3 access point를 연결하면 파일을 S3 버킷으로 복사하지 않고 `GetObject`, `PutObject`, `ListObjectsV2`로 접근할 수 있다. 데이터는 FSx에 남으며 NFS와 SMB 접근도 유지된다.

- **인가를 두 번 확인한다.** S3의 IAM 정책 평가를 통과한 뒤 access point에 연결한 UNIX 또는 Windows 사용자의 파일 권한을 검사한다. 같은 access point를 통한 요청은 이 파일 시스템 사용자의 권한으로 처리된다.
- Access point 정책의 제한은 그 경로에만 적용된다. 직접 NFS나 SMB로 접근하는 경로의 권한까지 바꾸지는 않는다.
- S3 API를 지원해도 일반 S3 버킷의 모든 기능이 제공되는 것은 아니다. Object Versioning, Object Lock, Object Lifecycle과 conditional writes는 지원하지 않는다. 연동 서비스가 요구하는 API를 호환성 표와 대조한다.
- 읽기와 쓰기는 원래 볼륨에 대한 작업이다. 분석용 연결이라면 IAM과 파일 권한 모두 읽기 범위로 제한하고, 기존 클라이언트의 쓰기와 충돌할 조건을 확인한다.

파일 복제 부담을 줄이는 선택지이며, S3 버킷 이전이나 별도 백업을 수행한 것으로 해석하지 않는다. 이 절만 추가 대조했으며 다른 FSx 엔진의 기능과 한도는 다시 검증하지 않았다.

## FSx for OpenZFS

- **ZFS 파일 시스템**을 관리형으로 제공
- **NFS v3/v4/v4.1/v4.2** 지원 (Linux, Mac, Windows 클라이언트도 NFS로 접근)
- **ZFS 스냅샷, 데이터 클론, Zstandard / LZ4 압축, 볼륨 예약과 사용자 / 그룹 할당량** 지원
- 저지연, 고 IOPS — 데이터베이스, DevOps, 전자 설계(EDA) 워크로드에 적합
- 데이터 무결성을 위한 **체크섬, copy-on-write**

## EFS와의 차이

| 기준 | EFS | FSx |
|------|-----|-----|
| 파일 시스템 | AWS 자체 (NFS v4.1) | **서드파티 엔진** (Windows, Lustre, ONTAP, OpenZFS) |
| 프로토콜 | **NFS만** | **SMB, POSIX/Lustre, NFS, iSCSI** (엔진별) |
| OS | **Linux/Unix 전용** | Windows, Linux, 혼합 |
| 자동 확장 | 페타바이트까지 **자동 탄력 확장** | SSD / HDD는 용량을 프로비저닝하고, Lustre / OpenZFS Intelligent-Tiering은 탄력적으로 확장 |
| HPC | 불가 | **Lustre가 전용** |
| Windows 환경 | 부적합 | **for Windows / ONTAP** |
| 비용 모델 | 사용한 만큼 | SSD / HDD는 프로비저닝 용량 기준. Intelligent-Tiering은 저장한 데이터와 요청량 기준 |

## 백업, 고가용성

- Windows, ONTAP, OpenZFS는 자동 일일 백업을 지원한다. Lustre는 S3 데이터 리포지토리에 연결하지 않은 Persistent 파일 시스템만 백업할 수 있고, 자동 백업 보존 기간 기본값은 0일이라 직접 활성화해야 한다. Scratch와 S3 연결 Lustre는 백업을 지원하지 않는다.
- Windows, ONTAP, OpenZFS에서 다중 AZ 배포를 선택하면 AZ 장애에 대비할 수 있다. Lustre는 사용자가 단일 / 다중 AZ 배포 유형을 고르는 구조가 아니며, Intelligent-Tiering 데이터가 내부적으로 여러 AZ에 복제된다.
- 저장 데이터는 KMS로 암호화된다. 전송 중 암호화는 Windows의 SMB 3.0 이상, Lustre와 OpenZFS의 지원 EC2 인스턴스처럼 엔진과 클라이언트 조건을 확인한다.

## 시험 체크포인트

- **Windows + SMB + Active Directory** → **FSx for Windows File Server**
- **Linux + HPC + 최대 수 TB/s 처리량** → **FSx for Lustre**
- **S3 데이터셋을 연결한 파일 시스템**에서 분석 → **FSx for Lustre**, import와 export 완료를 별도로 확인
- **Linux + Windows 혼합 + 멀티프로토콜(NFS, SMB, iSCSI)** → **FSx for NetApp ONTAP**
- **온프레미스 NetApp 환경 마이그레이션** → **FSx for ONTAP**
- **ZFS 스냅샷, 데이터 클론 + 저지연 NFS** → **FSx for OpenZFS**
- 공유 NFS + Linux 전용 + 자동 확장 → **EFS** (FSx 아님)
- Windows SMB 키워드가 보이면 **EFS가 아니라 FSx for Windows** (EFS는 NFS 전용)
- **DFS 네임스페이스**로 여러 파일 공유 그룹화 → **FSx for Windows**
- Lustre의 두 배포 옵션 — **Scratch**(임시, 저렴) vs **Persistent**(장기, 복제)
- Windows, ONTAP, OpenZFS는 단일 AZ와 **다중 AZ** 옵션을 제공. Lustre는 Scratch / Persistent와 스토리지 클래스를 구분
- 저장 암호화는 **KMS**가 공통이고, 전송 중 암호화의 방식과 지원 조건은 엔진별로 확인

## 출처

- [AWS, Managing metadata performance](https://docs.aws.amazon.com/fsx/latest/LustreGuide/managing-metadata-performance.html)
- [AWS, Importing changes from your data repository](https://docs.aws.amazon.com/fsx/latest/LustreGuide/importing-files-dra.html)
- [AWS, Automatically export updates to your S3 bucket](https://docs.aws.amazon.com/fsx/latest/LustreGuide/autoexport-data-repo-dra.html)
- [AWS, Exporting changes to the data repository](https://docs.aws.amazon.com/fsx/latest/LustreGuide/export-changed-data-meta-dra.html)
- [AWS, Linking your file system to an Amazon S3 bucket](https://docs.aws.amazon.com/fsx/latest/LustreGuide/create-dra-linked-data-repo.html)
- [AWS, DataRepositoryAssociation](https://docs.aws.amazon.com/fsx/latest/APIReference/API_DataRepositoryAssociation.html)
- [AWS, What is Amazon FSx for Lustre?](https://docs.aws.amazon.com/fsx/latest/LustreGuide/what-is.html)
- [AWS, FSx for Lustre deployment and storage class options](https://docs.aws.amazon.com/fsx/latest/LustreGuide/using-fsx-lustre.html)
- [AWS, Protecting FSx for Lustre data with backups](https://docs.aws.amazon.com/fsx/latest/LustreGuide/using-backups-fsx.html)
- [AWS, FSx for Windows encryption in transit](https://docs.aws.amazon.com/fsx/latest/WindowsGuide/encryption-in-transit.html)
- [AWS, FSx for OpenZFS FAQ](https://aws.amazon.com/fsx/openzfs/faqs/)
- [AWS, Accessing your data via Amazon S3 access points](https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/accessing-data-via-s3-access-points.html)
- [AWS, Managing access point access](https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/s3-ap-manage-access-fsxn.html)
- [AWS, Access point compatibility](https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/access-points-for-fsxn-object-api-support.html)
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서

- [[EFS]]
- [[EBS]]
- [[S3]]
- [[Storage-Gateway-DataSync]]
- [[VPC]]
