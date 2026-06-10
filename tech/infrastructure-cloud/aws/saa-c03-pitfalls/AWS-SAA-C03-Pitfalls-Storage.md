---
tags: [infrastructure, aws, saa-c03, certification, pitfalls, storage]
status: done
category: "Infrastructure - AWS"
aliases: ["스토리지 함정", "SAA-C03 Pitfalls Storage"]
---

# AWS SAA-C03 빈출 함정 — 스토리지

> 상위 TOC: [[AWS-SAA-C03-Pitfalls]] | 자매: [[AWS-SAA-C03-Exam-Summary]]

### S3 스토리지 클래스, 수명 주기

- 클래스: Standard, Standard-IA, Intelligent Tiering, **One Zone-IA**(AZ 1개, 비용 절감), Glacier **Instant Retrieval**(밀리초), Glacier **Flexible Retrieval**(분-시간), Glacier **Deep Archive**(12시간)
- **Glacier 최소 저장 기간**: Flexible 90일, Deep Archive 180일 — 조기 삭제 시 비용 청구. 자주 변경되는 데이터 → Glacier 금지
- 수명주기에서 **128KB 미만 객체는 IA/Glacier로 이동 안 됨** — 작은 객체 다수 시나리오는 함정
- **Intelligent Tiering**은 모니터링 비용($1/100만 객체) 있음. 작은 객체 수십억개는 손해

### S3 보안, 기능

- **Object Lock**
  | 모드 | 의미 |
  |---|---|
  | Governance | 권한자만 우회 가능 |
  | Compliance | **root조차 삭제 불가** (시험 정답: 절대 변경 불가) |
- **Vault Lock**(Glacier 전용 WORM) ≠ Object Lock
- **암호화**: SSE-S3(AES-256, AWS 관리키), SSE-KMS(CloudTrail 추적, 키 회전), SSE-C(고객 제공키, AWS 저장 안 함), **DSSE-KMS**(이중 암호화). 클라이언트 측 암호화는 별개
- **Pre-signed URL**: 임시 액세스. 서명자의 권한 + 만료 시각만 — 정책 변경해도 만료 전엔 유효
- **MFA Delete**: 루트 계정만 활성화. 버전 영구 삭제, 버킷 버저닝 변경 보호
- **CORS**: 다른 오리진 정적 사이트가 S3 호스팅 콘텐츠 호출 시 — 자주 시험에 등장. 헤더 미설정 시 브라우저 차단
- **Replication**(CRR/SRR): 버저닝 필수. 기본은 **신규 객체만** 복제(과거 객체는 Batch Replication)
- **Transfer Acceleration**: CloudFront Edge 통해 업로드 가속. 리전 간 콘텐츠 다운로드 아님(그건 CloudFront)
- **S3 Select / Glacier Select**: 객체 내 일부 행만 SQL로 추출 — 비용, 시간 절약
- **Multipart Upload**: 100MB부터 권장, **5GB 이상 필수**. 실패 파트는 수명주기로 정리해야 청구 안 됨
- **Requester Pays**: 데이터 전송 비용을 요청자(consumer)에게. 무료 계정에서 호출 불가
- **S3 이벤트 알림**: SNS, SQS, Lambda, EventBridge. **버저닝 미사용 시 동일 키 동시 쓰기는 이벤트 누락 가능**

### EBS, EFS, FSx

- **EBS**는 **같은 AZ 내**에서만 attach. 다른 AZ로 이동 → 스냅샷 → 새 볼륨 생성
- **io1/io2 Multi-Attach**: 같은 AZ 내 최대 **16개 Nitro 인스턴스**에 동시 attach. 클러스터 파일시스템 필요
- **gp3** vs **gp2**: gp3는 IOPS, 처리량 독립 프로비저닝, gp2는 크기 연동
- **EBS 암호화**: 스냅샷도 자동 암호화. 기존 비암호화 볼륨은 스냅샷 → 복사 시 암호화 옵션 → 새 볼륨
- **EFS 성능 모드**: General Purpose / Max I/O(지연 ↑, 동시성 ↑)
- **EFS 처리량 모드**: Bursting(크기 비례) / Provisioned / **Elastic**(자동 조정, 신규 권장)
- **EFS-IA**: Lifecycle Management로 자동 이동 — 액세스 시 자동으로 Standard로 복귀
- **FSx Lustre**: HPC/ML, S3와 통합(레이지 로드). **Scratch(임시)** vs **Persistent(고가용)**
- **FSx Windows File Server**: SMB, AD 통합 — 리프트앤시프트 Windows 워크로드 정답
- **FSx ONTAP** vs **FSx OpenZFS**: ONTAP은 NetApp 기능(SnapMirror, dedup), OpenZFS는 ZFS 기반 NFS

### Snow, Storage Gateway, DataSync

- **Snowcone**(8TB, IoT 가능) vs **Snowball Edge Storage Optimized**(80TB) vs **Snowball Edge Compute Optimized**(42TB+GPU) vs **Snowmobile**(100PB+, 트럭)
- **데이터 전송 결정 기준**: 1주 미만 네트워크 시간 → DataSync, 1주 이상 → Snow. 시험은 시간/비용 둘 다 고려
- **Storage Gateway 종류**
  | 게이트웨이 | 프로토콜 | 용도 |
  |---|---|---|
  | S3 File Gateway | NFS/SMB | 온프레미스 NAS를 S3로 |
  | FSx File Gateway | SMB | FSx 캐싱 |
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

- AWS SAA C03 Udemy 강의 오답노트 (Stephane Maarek, 로컬)
