---
tags: [infrastructure, aws]
status: index
category: "Infrastructure - AWS"
aliases: ["AWS Services"]
---

# AWS 서비스(AWS Services)

EC2, ASG, ALB, Lambda — 주요 AWS 컴퓨트 서비스.

## 시험 직전 종합
- 📌 [[AWS-SAA-C03-Exam-Summary|AWS SAA-C03 시험 직전 종합 요약]] — 컴퓨팅, 스토리지, DB, 분석, 메시징, 네트워킹, 보안, 관측 한 페이지 + 시험장 직전 체크리스트
- 🎯 [[AWS-SAA-C03-Pitfalls|AWS SAA-C03 시험 함정 모음]] — 빈출 함정, 헷갈리는 옵션, 서비스 비교표, 키워드 → 정답 매핑

## 목차
- [x] [[AWS-Fundamentals|AWS 기본 (Region, AZ, Edge Location, 책임 공유 모델, Elasticity vs Scalability, 리저널/글로벌 서비스)]]
- [x] [[EC2|EC2 (Nitro, Instance Store, Placement Group, IMDSv2, T 시리즈 크레딧, AMI, ENA, Key Pair, Lifecycle)]]
- [x] [[EBS|EBS (gp2/gp3/io1/io2/st1/sc1, io2 Multi-Attach, 증분 스냅샷, Cross-Region 공유, KMS 암호화)]]
- [x] [[Auto-Scaling|EC2 Auto Scaling (ASG, Launch Template, Target Tracking/Simple/Step, Cooldown, Lifecycle Hook, Health Check)]]
- [x] [[ECS|ECS, Fargate (Task Definition, Service Connect, awsvpc, Capacity Provider, IAM Role 3종)]]
  - [[ECS-Service-AutoScaling|Service Auto Scaling (backlog-per-task, Metric Math, scale-to-zero, graceful shutdown)]]
  - [[ECS-SQS-Worker-Terraform|SQS 워커 오토스케일링 Terraform (Fargate vs EC2, Capacity Provider)]]
- [x] [[EKS|EKS (Control Plane, Node Group, Fargate Profile, VPC CNI, IRSA, HPA/VPA, Karpenter, EKS vs ECS)]]
- [x] [[ECR|ECR (컨테이너 레지스트리, Private/Public Gallery, 이미지 스캐닝, Lifecycle Policy)]]
- [x] [[App-Runner|App Runner (매니지드 컨테이너 PaaS, 소스 자동 빌드, VPC Connector, 자동 스케일)]]
- [x] [[AWS-Lambda|AWS Lambda, 서버리스 FaaS (Cold Start, Provisioned/Reserved Concurrency, VPC Lambda, Destinations, Lambda@Edge)]]
- [x] [[API-Gateway|API Gateway (REST, HTTP, WebSocket, Stage, Canary, Authorizer 3종, Throttling, Caching, VPC Link)]]
- [x] [[S3|S3 (스토리지 클래스, Multipart, Strong Consistency, Pre-signed, Lifecycle, CRR/SRR, SSE 암호화, Bucket Policy)]]
- [x] [[S3-File-Upload|S3 파일 업로드 (Stream, MultipartFile, Multipart Upload, Presigned URL, CORS)]]
- [x] [[CloudFront|CloudFront (Edge, Distribution, OAI/OAC, Signed URL, Price Class, Functions vs Lambda@Edge, ACM us-east-1)]]
- [x] [[EFS|EFS (NFS v4.1, Multi-AZ, Performance/Throughput Mode, Storage Class IA, EBS/S3 비교)]]
- [x] [[FSx|FSx (Windows, Lustre, ONTAP, OpenZFS — SMB/HPC/멀티프로토콜, EFS와 차이)]]
- [x] [[Storage-Gateway-DataSync|Storage Gateway & DataSync (File/Volume/Tape Gateway, 온프레미스↔AWS 이전, DataSync vs Gateway 결정)]]
- [x] [[Snow-Family|Snow Family (Snowcone, Snowball Edge, Snowmobile — PB~EB 오프라인 이전, 엣지 컴퓨팅)]]
- [x] [[IAM|IAM (정책 평가, Permission Boundary, AssumeRole, Condition Key)]]
- [x] [[AWS-Organizations|AWS Organizations (멀티 계정, SCP, OU, 통합 결제, CloudTrail Org Trail)]]
- [x] [[Cognito|Cognito (User Pool 인증, Identity Pool 인가, OAuth2/OIDC, Federated Identity, Lambda Trigger)]]
- [x] [[KMS|KMS (CMK 3종, Envelope Encryption, Key Rotation, Multi-Region Key, SSE-S3/KMS/C/DSSE)]]
- [x] [[Secrets-Manager|Secrets Manager (자동 회전, RDS 통합, Cross-Region Replication, KMS 암호화)]]
- [x] [[SSM-Parameter-Store|SSM Parameter Store (Standard/Advanced, 계층 구조, KMS 암호화, Secrets Manager 비교)]]
- [x] [[ACM|ACM (퍼블릭 SSL/TLS 인증서, 자동 갱신, DNS/Email 검증, Private CA, CloudFront는 us-east-1)]]
- [x] [[Shield-WAF-NetworkFirewall|Shield & WAF & Network Firewall (DDoS, L7 웹공격, VPC stateful 방화벽, 결정 트리)]]
- [x] [[Firewall-Manager|Firewall Manager (멀티 계정 WAF/Shield/SG/Network Firewall 일괄 관리, Organizations 통합)]]
- [x] [[CloudTrail-Config|CloudTrail & Config (누가/무엇이, Management/Data Event, Config Rule, Conformance Pack, Remediation)]]
- [x] [[Systems-Manager|Systems Manager (Parameter Store, Patch Manager, Run Command, Session Manager — SSH 키 없이 대규모 관리)]]
- [x] [[RDS-Aurora|RDS / Aurora 관리형 DB (Multi-AZ, Read Replica, Failover, 백업/PITR, RDS Proxy, Aurora Endpoint, Global DB)]]
  - [[RDS-Operational-Pitfalls|운영 함정 빅7 (커넥션 고갈, failover 죽은 소켓, 복제 지연, gp2 BurstBalance, 정적 파라미터, FreeableMemory 오독, 스냅샷 워밍업)]]
  - [[RDS-Operational-Pitfalls-Rare|운영 함정 저빈도 (장기 트랜잭션, cross-AZ 비용, Aurora I/O, utf8mb4, CA 만료, 암호화 사후불가, 승격 비가역, XID wraparound)]]
  - [[RDS-Migration-Scenarios|데이터 마이그레이션이 필요한 상황 (제자리 불가 = 마이그레이션, 도구 선택 매트릭스)]]
    - [[RDS-Zero-Downtime-Migration|무중단(near-zero) 마이그레이션 (Full Load+CDC+Cutover, AUTO_INCREMENT 드리프트, 엔드포인트 전환)]]
      - [[RDS-Storage-Shrink-Runbook|스토리지 축소 런북 (동종 MySQL, 네이티브 binlog 복제, rds_set_external_master)]]
  - [[RDS-Connection-Credentials|앱 연결과 자격증명 (ORM 연결, SSL, Secrets Manager, IAM DB 인증, 비용 과금 항목)]]
  - [[RDS-Security-Group|Security Group 구성 (SG 참조, 계층별 방화벽, IaC)]]
  - [[RDS-Monitoring|모니터링 (CloudWatch, Performance Insights, Slow Query → Slack 알람)]]
- [x] [[DynamoDB|DynamoDB (NoSQL, Provisioned/On-Demand, DAX, Streams, Global Table, PITR)]]
- [x] [[Redshift|Redshift (컬럼 기반 DW, OLAP, RA3/DC2, DISTKEY/SORTKEY, Spectrum, Concurrency Scaling, Materialized View)]]
- [x] [[Athena|Athena (서버리스 SQL on S3, Presto/Trino, Glue Catalog, 파티셔닝/컬럼 포맷, Federated Query)]]
- [x] [[EMR|EMR (Hadoop/Spark, Master/Core/Task 노드, Spot Instance 활용, EMR Studio)]]
- [x] [[Glue|Glue (서버리스 ETL, Data Catalog, Crawler, Glue Studio, Job Bookmark)]]
- [x] [[Lake-Formation|Lake Formation (데이터 레이크 통합 권한, 행/열 수준 보안, Blueprint)]]
- [x] [[QuickSight|QuickSight (서버리스 BI, SPICE 인메모리 엔진, ML Insights, 임베디드 분석)]]
- [x] [[OpenSearch-Service|OpenSearch (전문 검색, 로그 분석, DynamoDB 검색 보완, k-NN/Vector)]]
- [x] [[DMS|Database Migration Service (Full Load + CDC, 이기종은 SCT 결합, 동종은 단독, DocumentDB 3접근)]]
- [x] [[VPC|VPC, Subnet, Peering, Transit Gateway, CIDR 설계, NAT GW vs Instance, SG vs NACL, 온프레미스 연결]]
- [x] [[ELB|ELB (ALB, NLB, GWLB, CLB, Sticky Session, Cross-Zone, SSL Termination, Connection Draining)]]
- [x] [[Route53|Route 53 (Hosted Zone, 레코드 9종, Routing Policy 7종, Alias vs CNAME, Health Check, DNSSEC)]]
- [x] [[Global-Accelerator|Global Accelerator (Anycast IP, AWS 백본 가속, Endpoint Group/Weight, CloudFront vs AGA — L7 vs L4)]]
- [x] [[Transit-Gateway|Transit Gateway (허브-스포크, 5종 어태치먼트, Route Table, ECMP, RAM 공유, vs VPC Peering)]]
- [x] [[ElastiCache|ElastiCache (Redis, Valkey, Memcached, Semantic Cache, Pub/Sub, 분산락, Cluster 모드, Failover)]]
- [x] [[CloudFormation|CloudFormation (Template, Stack, Change Set, Drift Detection, StackSet, Nested Stack, Helper Script)]]
