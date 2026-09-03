---
tags: [infrastructure, aws, saa-c03, certification, pitfalls, storage]
status: done
category: "Infrastructure - AWS"
aliases: ["스토리지 함정", "SAA-C03 Pitfalls Storage"]
verified_at: 2026-08-27
---

# AWS SAA-C03 빈출 함정 — 스토리지

> 상위 TOC: [[AWS-SAA-C03-Pitfalls]] | 자매: [[AWS-SAA-C03-Exam-Summary]]

### S3 스토리지 클래스, 수명 주기

- 클래스: Standard, Standard-IA, Intelligent Tiering, **One Zone-IA**(AZ 1개, 비용 절감), Glacier **Instant Retrieval**(밀리초), Glacier **Flexible Retrieval**(분-시간), Glacier **Deep Archive**(12시간)
- **Glacier 최소 저장 기간**: Flexible 90일, Deep Archive 180일 — 조기 삭제 시 비용 청구. 자주 변경되는 데이터 → Glacier 금지
- **S3 Lifecycle 소형 객체 기본 동작**: 2024년 9월 이후 생성하거나 수정한 구성은 128KB 미만 객체를 어떤 스토리지 클래스로도 기본 전환하지 않음. 크기 필터로 명시적으로 허용할 수 있고, 기존 구성은 이전 기본값이 유지될 수 있음
- **Intelligent-Tiering**: 128KB 미만 객체는 모니터링과 자동 티어링 대상이 아니며 Frequent Access 티어에 유지됨. 모니터링 요금은 부과되지 않지만 자동 계층화 절감도 없음

### S3 보안, 기능

- **Object Lock**
  | 모드 | 의미 |
  |---|---|
  | Governance | 권한자만 우회 가능 |
  | Compliance | **root조차 삭제 불가** (시험 정답: 절대 변경 불가) |
- **Vault Lock**(Glacier 전용 WORM) ≠ Object Lock
- **암호화**: SSE-S3(AES-256, AWS 관리키), SSE-KMS(CloudTrail 추적, 키 회전), SSE-C(고객 제공키, AWS 저장 안 함), **DSSE-KMS**(이중 암호화). 클라이언트 측 암호화는 별개
- **Pre-signed URL**: 서명자의 현재 유효 자격 증명과 권한 범위를 넘지 않는 임시 접근 토큰. 요청 시점의 버킷 또는 IAM 정책 조건과 명시적 Deny가 적용되고, 지정 만료 시각 전이라도 임시 자격 증명이 만료되거나 서명 자격 증명이 폐기, 삭제, 비활성화되면 만료됨
- **MFA Delete**: 루트 계정만 활성화. 버전 영구 삭제, 버킷 버저닝 변경 보호
- **CORS**: 다른 오리진 정적 사이트가 S3 호스팅 콘텐츠 호출 시 — 자주 시험에 등장. 헤더 미설정 시 브라우저 차단
- **Replication**(CRR/SRR): 버저닝 필수. 기본은 **신규 객체만** 복제(과거 객체는 Batch Replication)
- **Transfer Acceleration**: CloudFront Edge 통해 업로드 가속. 리전 간 콘텐츠 다운로드 아님(그건 CloudFront)
- **S3 Select / Glacier Select**: 기존 사용 고객에게 남아 있는 레거시 기능. 신규 설계에서는 Athena나 애플리케이션 레벨 필터링을 우선 검토한다. S3 Object Lambda도 2025년 11월 7일부터 기존 고객과 일부 APN 파트너만 사용할 수 있으므로 신규 고객의 일반 대안이 아니다. 객체 변환이 필요하면 Lambda를 CloudFront, API Gateway 또는 Function URL로 호출하거나 클라이언트 처리를 비교한다
- **Multipart Upload**: 100MB부터 권장, **5GB 이상 필수**. 실패 파트는 수명주기로 정리해야 청구 안 됨
- **Requester Pays**: 요청과 데이터 다운로드 전송 비용은 요청자가, 저장 비용은 버킷 소유자가 부담. 익명 요청은 불가하며 인증된 요청에 `x-amz-request-payer: requester` 또는 CLI `--request-payer requester`로 비용 부담을 명시해야 함
- **S3 이벤트 알림**: SNS, SQS, Lambda, EventBridge. 알림은 최소 한 번 전달되므로 중복될 수 있고 순서를 보장하지 않는다. 동일 키의 이벤트 순서를 비교해야 하면 `sequencer`를 사용하고 소비자를 멱등하게 만든다. 버전 관리는 객체 버전을 보존하지만 이벤트 전달 보장을 바꾸지는 않는다

### EBS, EFS, FSx

- **EBS**는 **같은 AZ 내**에서만 attach. 다른 AZ로 이동 → 스냅샷 → 새 볼륨 생성
- **io1/io2 Multi-Attach**: 같은 AZ 내 최대 **16개 Nitro 인스턴스**에 동시 attach. 클러스터 파일시스템 필요
- **gp3** vs **gp2**: gp3는 IOPS, 처리량 독립 프로비저닝, gp2는 크기 연동
- **EBS 암호화**: 스냅샷도 자동 암호화. 기존 비암호화 볼륨은 스냅샷 → 복사 시 암호화 옵션 → 새 볼륨
- **EFS 성능 모드**: General Purpose / Max I/O(지연 ↑, 동시성 ↑)
- **EFS 처리량 모드**: Bursting(크기 비례) / Provisioned / **Elastic**(자동 조정, 신규 권장)
- **EFS-IA**: Lifecycle Management로 미액세스 파일을 IA(기본 30일), Archive(기본 90일)로 자동 이동. IA나 Archive 파일을 액세스해도 **기본값은 Standard로 복귀하지 않음**(Transition into Standard 기본값 None) — 복귀시키려면 On first access를 명시적으로 지정
- **FSx Lustre**: HPC/ML, S3와 통합(레이지 로드). **Scratch(임시)** vs **Persistent(고가용)**
- **FSx Windows File Server**: SMB, AD 통합 — 리프트앤시프트 Windows 워크로드 정답
- **FSx ONTAP** vs **FSx OpenZFS**: ONTAP은 NetApp 기능(SnapMirror, dedup), OpenZFS는 ZFS 기반 NFS

### Snow, Storage Gateway, DataSync

- **Snow Family**: 기존 고객은 계속 사용할 수 있지만 신규 고객은 Snowball Edge를 주문할 수 없음. Snowcone은 2024-11부터 기존 고객 포함 주문 불가, Snowmobile은 2024-03-14 지원 종료, 상용 리전의 Snowball 디바이스 지원은 2026-12-31 종료 예정 — 상세는 [[Snow-Family]]
- **데이터 전송 결정 기준**: 온라인 전송은 DataSync, 물리 전송은 AWS Data Transfer Terminal이나 파트너, 엣지 컴퓨팅은 Outposts를 검토. 기존 Snow 고객만 Snow Family를 선택지에 포함
- **Storage Gateway 종류**
  | 게이트웨이 | 프로토콜 | 용도 |
  |---|---|---|
  | S3 File Gateway | NFS/SMB | 온프레미스 NAS를 S3로 |
  | FSx File Gateway | SMB | 기존 고객의 FSx 캐싱. 신규 고객은 2024년 10월 28일부터 사용 불가 |
  | Volume Gateway (Stored/Cached) | iSCSI | 블록 디스크 ↔ S3 백업 |
  | Tape Gateway | iSCSI VTL | 기존 백업 SW의 가상 테이프 |
- **DataSync**: 에이전트 기반. 온프레↔S3/EFS/FSx, AWS 내부도 가능. **TLS 암호화 자동, 체크섬 검증**
- **Transfer Family**(SFTP/FTPS/FTP): S3, EFS로. SFTP는 22번 포트, IAM, AD 통합

### Backup, DLM

- **AWS Backup**: 중앙 백업 정책. EFS, EBS, RDS, DynamoDB, Storage Gateway, FSx 통합. **Vault Lock(WORM)**으로 변경 방지 — 컴플라이언스 시나리오
- **Data Lifecycle Manager**: EBS 스냅샷, AMI 정책 — Backup보다 가벼움. EBS 전용

## 관련 문서

[[S3]], [[S3-File-Upload]], [[EBS]], [[EFS]], [[FSx]], [[Storage-Gateway-DataSync]], [[Snow-Family]]

## 출처

- [How S3 Intelligent-Tiering works — AWS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-overview.html)
- [Amazon S3 pricing — AWS](https://aws.amazon.com/s3/pricing/)
- [Download and upload objects with presigned URLs — AWS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [Using Requester Pays general purpose buckets for storage transfers and usage — AWS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/RequesterPaysBuckets.html)
- [Amazon S3 Object Lambda availability change — AWS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazons3-ol-change.html)
- [Amazon S3 Event Notifications — AWS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html)
- [Amazon S3 event notification content structure — AWS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-content-structure.html)
- [Transitioning objects using Amazon S3 Lifecycle — AWS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html)
- [Managing storage lifecycle — AWS](https://docs.aws.amazon.com/efs/latest/ug/lifecycle-management-efs.html)
- [Amazon FSx File Gateway User Guide — AWS](https://docs.aws.amazon.com/filegateway/latest/filefsxw/storagegateway-fsxfile-ug.pdf)
- [AWS Snowball Edge availability change — AWS](https://docs.aws.amazon.com/snowball/latest/developer-guide/snowball-edge-availability-change.html)
- [AWS General Reference, Services in Full Shutdown](https://docs.aws.amazon.com/general/latest/gr/full_shutdown_services.html)
- AWS SAA C03 Udemy 강의 오답노트 (Stephane Maarek, 로컬)
