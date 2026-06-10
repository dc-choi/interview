---
tags: [infrastructure, aws, saa-c03, certification, exam-summary]
status: done
category: "Infrastructure - AWS"
aliases: ["SAA-C03 컴퓨팅 스토리지 데이터 요약", "SAA Summary Compute Storage Data"]
---

# AWS SAA-C03 시험 직전 종합 요약 — 기초, 컴퓨팅, 스토리지, 데이터

> 상위 TOC: [[AWS-SAA-C03-Exam-Summary]]

## AWS 기초

- **Region**(AZ 클러스터) / **AZ**(이중화 데이터센터) / **Edge Location**(CDN 캐시)
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

- 서버리스 FaaS. 메모리 128MB-10GB, 실행 ~900초, 환경변수 ~4KB, /tmp 512MB-10GB, 동시 ~1000개
- 배포 한도: 압축 50MB, 압축 전 250MB
- **Lambda@Edge**: CloudFront 경량 함수 (Viewer/Origin Request, Response)
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
- **S3**: 글로벌 객체 스토리지(리전 단위). 클래스: Standard → Standard-IA → Intelligent Tiering → One-Zone IA → Glacier Instant/Flexible Retrieval → Glacier Deep Archive. **멀티파트 업로드 100MB~ / 5GB 이상 필수**. 전송 가속, 바이트 범위 가져오기, S3 Select. **CORS, MFA Delete, Pre-signed URL, Object Lock, Vault Lock(WORM)**
- **FSx**: 매니지드 파일 시스템. Lustre(HPC/ML), Windows File Server(SMB/AD), NetApp ONTAP, OpenZFS
- **Storage Gateway**: 온프레미스 ↔ S3 가교. S3 File / FSx File / Volume / Tape Gateway
- 자세히: [[EBS]], [[EFS]], [[S3]], [[FSx]], [[Storage-Gateway-DataSync]]

### Snow Family, DataSync

- **Snow**: 대용량 데이터 물리 전송. Snowcone, Snowball Edge, Snowmobile. Edge Computing 모드(인터넷 없는 환경)
- **DataSync**: 온프레미스 ↔ AWS 에이전트 기반 동기화. S3/EFS/FSx 대상
- 자세히: [[Snow-Family]], [[Storage-Gateway-DataSync]]

## 데이터베이스

### RDS, Aurora, DynamoDB, ElastiCache, Redshift

- **RDS**: 매니지드 관계형 (Postgres, MySQL, Oracle, MSSQL, Aurora). **Read Replicas**(비동기, 최대 15개, 승격 가능), **Multi-AZ**(동기, 자동 페일오버). **SSH/DB 인스턴스 직접 접근 안 됨**
- **Aurora**: AWS 자체 RDB. 10~128TB 자동 확장. 읽기 복제본 15개, Writer/Reader Endpoint. 저장/전송 암호화
- **DynamoDB**: 서버리스 NoSQL. ms 응답. Standard/IA 클래스, Provisioned/On-Demand, Streams, Global Table, PITR 35일, **DAX** 마이크로초 캐시
- **ElastiCache**: 매니지드 Redis/Memcached. 세션 저장, 리더보드(Redis Sorted Set). Redis는 자동장애조치/복제, Memcached는 샤딩
- **Redshift**: OLAP 데이터 웨어하우스. 열기반 PostgreSQL 기반. 리더+컴퓨팅 노드. **Spectrum**: S3 데이터 직접 쿼리
- 자세히: [[RDS-Aurora]], [[RDS-Security-Group]], [[DynamoDB]], [[ElastiCache]], [[Redshift]]

## 분석

- **Athena**: S3 서버리스 SQL 쿼리. Parquet/ORC 권장(less scan). 연합 쿼리로 온프레미스 DB도 가능
- **Glue**: 서버리스 ETL. Glue Crawler → Data Catalog (Athena/Redshift Spectrum/EMR가 활용). Job Bookmarks, DataBrew, Studio
- **EMR**: Hadoop/Spark/HBase/Presto/Flink 매니지드. Master/Core/Task 노드 (Task는 Spot)
- **QuickSight**: 서버리스 BI. SPICE 인메모리 엔진
- **OpenSearch**: ElasticSearch 후속. 전문 검색, **인스턴스 클러스터 필요**, SQL 미지원
- **Lake Formation**: Data Lake 매니지드. 행/열 수준 권한, ML 변환, 블루프린트
- 자세히: [[Athena]], [[Glue]], [[EMR]], [[QuickSight]], [[OpenSearch-Service|OpenSearch]], [[Lake-Formation]]
