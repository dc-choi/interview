---
tags: [infrastructure, aws, saa-c03, certification, exam-summary]
status: done
verified_at: 2026-07-15
category: "Infrastructure - AWS"
aliases: ["SAA-C03 컴퓨팅 스토리지 데이터 요약", "SAA Summary Compute Storage Data"]
---

# AWS SAA-C03 시험 직전 종합 요약 — 기초, 컴퓨팅, 스토리지, 데이터

> 상위 TOC: [[AWS-SAA-C03-Exam-Summary]]

## AWS 기초

- **Region**(서로 격리된 지리적 영역) / **AZ**(리전 안의 독립 위치, 하나 이상의 데이터센터) / **Edge Location**(CDN 캐시)
- 3대 특징: **Compliance**(법규/데이터 외부 반출 불가), **Proximity**(저지연), **Available Service**(서비스 가용성 — 리전마다 다름)
- 확장: **수직**(Scale up — 인스턴스 크기) vs **수평**(Scale out — 인스턴스 개수)
- 고가용성 → 다중 AZ, Auto Scaling, ELB
- 자세히: [[AWS-Fundamentals]]

## 컴퓨팅

### EC2

- IaaS. **구매옵션**: On-Demand, Reserved(1-3년), Saving Plans(패밀리 약정), Spot(저렴/중단), Dedicated Host(하드웨어 전용), Capacity Reservation
- **Placement Groups**: Cluster(저지연), Partition(파티션 격리), Spread(고유 HW 배치)
- **ENI**(가상 네트워크 카드), **Elastic IP**(고정 공인 IP)
- 자세히: [[EC2]], [[Auto-Scaling]]

### Lambda

- 서버리스 FaaS. 함수 메모리 128MB-10,240MB, 최대 실행 900초, 환경변수 4KB, `/tmp` 512MB-10,240MB. 계정의 리전별 동시 실행 기본 quota는 1,000이지만 신규 계정은 더 낮을 수 있고 증액 가능
- zip 배포 한도: Lambda API 직접 업로드 50MB, 압축 해제 후 250MB
- **Lambda@Edge**: Lambda 함수를 CloudFront의 Viewer Request/Response와 Origin Request/Response 이벤트에서 실행. CloudFront Functions와 별도 서비스
- VPC Lambda → Private Subnet에서 RDS/ElastiCache 접근
- 자세히: [[AWS-Lambda]]

### 컨테이너 (ECS, EKS, ECR, App Runner)

- **ECS**: AWS 자체 오케스트레이터. EC2 launch type / Fargate(서버리스). EventBridge, SQS 트리거로 태스크 생성
- **EKS**: 매니지드 Kubernetes. EC2/Fargate 모드. CSI 드라이버로 EBS, EFS, FSx 연결
- **ECR**: AWS 도커 레지스트리. Private / Public Gallery. 취약점 스캐닝, 수명 주기
- **App Runner**: 가장 간단한 PaaS — 코드/이미지 푸시 → 자동 배포
- 자세히: [[ECS]], [[EKS]], [[ECR]], [[App-Runner]]

## 스토리지

### EBS, EFS, S3, FSx, Storage Gateway

- **EBS**: EC2 블록 스토리지. **같은 AZ 한정**, 1대 EC2 attach(io1/2는 multi-attach). 볼륨 타입: gp(범용 SSD), io(Provisioned IOPS), st1(처리량 HDD), sc1(콜드 HDD). 스냅샷 백업
- **EFS**: 탄력적 파일 시스템 (NFS). **여러 AZ에서 다수 EC2/ECS/Lambda 동시 접근**. Standard/IA/One Zone 클래스
- **S3**: 리전 단위 버킷의 객체 스토리지. 클래스는 Standard, Express One Zone, Intelligent-Tiering, Standard-IA, One Zone-IA, Glacier Instant/Flexible Retrieval, Glacier Deep Archive가 있으며 접근 패턴, 복원 시간, 최소 보관 기간으로 선택. **멀티파트 업로드는 100MB부터 고려하고 단일 PUT 한도인 5GB를 초과하면 필수**. 전송 가속, 바이트 범위 가져오기. S3 Select는 신규 고객에게 제공되지 않는 레거시 기능. **CORS, MFA Delete, Pre-signed URL, Object Lock, Vault Lock(WORM)**
- **FSx**: 매니지드 파일 시스템. Lustre(HPC/ML), Windows File Server(SMB/AD), NetApp ONTAP, OpenZFS
- **Storage Gateway**: 온프레미스 ↔ S3 가교. S3 File / FSx File / Volume / Tape Gateway
- 자세히: [[EBS]], [[EFS]], [[S3]], [[FSx]], [[Storage-Gateway-DataSync]]

### Snow Family, DataSync

- **Snow Family**: 기존 고객의 대용량 물리 전송과 엣지 컴퓨팅 용도. 신규 고객은 주문할 수 없으므로 온라인 전송은 DataSync, 물리 전송은 AWS Data Transfer Terminal 또는 파트너, 엣지 컴퓨팅은 Outposts를 검토
- **DataSync**: 온프레미스 ↔ AWS 에이전트 기반 동기화. S3/EFS/FSx 대상
- 자세히: [[Snow-Family]], [[Storage-Gateway-DataSync]]

## 데이터베이스

### RDS, Aurora, DynamoDB, ElastiCache, Redshift

- **RDS**: 매니지드 관계형 (PostgreSQL, MySQL, MariaDB, Oracle, Microsoft SQL Server, Db2). **Read Replica**는 비동기이며 지원 개수와 기능은 엔진별로 다르고 승격 가능. **Multi-AZ DB 인스턴스**는 다른 AZ의 동기식 대기 복제본으로 자동 페일오버. 호스트 OS와 SSH에는 직접 접근할 수 없음
- **Aurora**: MySQL/PostgreSQL 호환 RDB. 스토리지는 자동 확장하며 최대 크기는 엔진 버전별로 다르고 일부 최신 버전은 256TiB. Aurora Replica는 최대 15개, Writer/Reader Endpoint 제공. 저장/전송 암호화 지원
- **DynamoDB**: 서버리스 NoSQL. ms 응답. Standard/IA 클래스, Provisioned/On-Demand, Streams, Global Table, PITR 보존 기간 1-35일, **DAX** 마이크로초 캐시
- **ElastiCache**: 매니지드 Redis/Memcached. 세션 저장, 리더보드(Redis Sorted Set). Redis는 자동장애조치/복제, Memcached는 샤딩
- **Redshift**: OLAP 데이터 웨어하우스. 열 기반이며 프로비저닝 클러스터는 리더와 컴퓨팅 노드 구조, Serverless 선택지도 제공. **Spectrum**: S3 데이터 직접 쿼리
- 자세히: [[RDS-Aurora]], [[RDS-Security-Group]], [[DynamoDB]], [[ElastiCache]], [[Redshift]]

## 분석

- **Athena**: S3 서버리스 SQL 쿼리. Parquet/ORC 권장(less scan). 연합 쿼리로 온프레미스 DB도 가능
- **Glue**: 서버리스 ETL. Glue Crawler → Data Catalog (Athena/Redshift Spectrum/EMR가 활용). Job Bookmarks, DataBrew, Studio
- **EMR**: Hadoop/Spark/HBase/Presto/Flink 매니지드. Master/Core/Task 노드 (Task는 Spot)
- **QuickSight**: 서버리스 BI. SPICE 인메모리 엔진
- **OpenSearch**: 오픈 소스 검색과 분석 엔진 기반 서비스. 프로비저닝 도메인과 Serverless 컬렉션을 선택할 수 있고 SQL 플러그인과 Workbench를 지원
- **Lake Formation**: Data Lake 매니지드. 행/열 수준 권한, ML 변환, 블루프린트
- 자세히: [[Athena]], [[Glue]], [[EMR]], [[QuickSight]], [[OpenSearch-Service|OpenSearch]], [[Lake-Formation]]

## 출처

- [AWS Certified Solutions Architect - Associate SAA-C03 시험 가이드 — AWS](https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html)
- [AWS 리전과 가용 영역 — AWS](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions-availability-zones.html)
- [Lambda quota — AWS](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [Lambda@Edge 요청과 응답 이벤트 — AWS](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-edge-event-request-response.html)
- [Amazon S3 스토리지 클래스 — AWS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html)
- [Amazon S3 멀티파트 업로드 한도 — AWS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html)
- [Amazon S3 단일 PUT 한도 — AWS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity-upload.html)
- [AWS Snowball Edge 가용성 변경 — AWS](https://docs.aws.amazon.com/snowball/latest/developer-guide/snowball-edge-availability-change.html)
- [Amazon RDS Read Replica — AWS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)
- [Amazon Aurora 스토리지 — AWS](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html)
- [DynamoDB point-in-time recovery — AWS](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html)
- [Amazon OpenSearch Serverless — AWS](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-overview.html)
- [Amazon OpenSearch SQL — AWS](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/sql-support.html)
