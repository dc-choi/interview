---
tags: [infrastructure, aws, saa-c03, certification, exam-summary]
status: done
category: "Infrastructure - AWS"
aliases: ["SAA-C03 종합", "AWS SAA Summary", "시험 직전 요약"]
---

# AWS SAA-C03 시험 직전 종합 요약

Stephane Maarek 강의 14페이지 압축. 시험 직전 한 번에 훑기용. 각 서비스 핵심 키워드 + 빈출 시험 포인트 위주, 자세한 내용은 위키링크.

## AWS 기초

- **Region**(AZ 클러스터) / **AZ**(이중화 데이터센터) / **Edge Location**(CDN 캐시)
- 3대 특징: **Compliance**(법규/데이터 외부 반출 불가) · **Proximity**(저지연) · **Available Service**(서비스 가용성 — 리전마다 다름)
- 확장: **수직**(Scale up — 인스턴스 크기) vs **수평**(Scale out — 인스턴스 개수)
- 고가용성 → 다중 AZ, Auto Scaling, ELB
- 자세히: [[AWS-Fundamentals]]

## 컴퓨팅

### EC2

- IaaS. **구매옵션**: On-Demand · Reserved(1-3년) · Saving Plans(패밀리 약정) · Spot(저렴/중단) · Dedicated Host(하드웨어 전용) · Capacity Reservation
- **Placement Groups**: Cluster(저지연) · Partition(파티션 격리) · Spread(고유 HW 배치)
- **ENI**(가상 네트워크 카드), **Elastic IP**(고정 공인 IP)
- 자세히: [[AWS(EC2)]] · [[Auto-Scaling]]

### Lambda

- 서버리스 FaaS. 메모리 128MB-10GB, 실행 ~900초, 환경변수 ~4KB, /tmp 512MB-10GB, 동시 ~1000개
- 배포 한도: 압축 50MB · 압축 전 250MB
- **Lambda@Edge**: CloudFront 경량 함수 (Viewer/Origin Request·Response)
- VPC Lambda → Private Subnet에서 RDS/ElastiCache 접근
- 자세히: [[AWS-Lambda]]

### 컨테이너 (ECS · EKS · ECR · App Runner)

- **ECS**: AWS 자체 오케스트레이터. EC2 launch type / Fargate(서버리스). EventBridge·SQS 트리거로 태스크 생성
- **EKS**: 매니지드 Kubernetes. EC2/Fargate 모드. CSI 드라이버로 EBS·EFS·FSx 연결
- **ECR**: AWS 도커 레지스트리. Private / Public Gallery. 취약점 스캐닝·수명 주기
- **App Runner**: 가장 간단한 PaaS — 코드/이미지 푸시 → 자동 배포
- 자세히: [[ECS]] · [[EKS]] · [[ECR]] · [[App-Runner]]

## 스토리지

### EBS · EFS · S3 · FSx · Storage Gateway

- **EBS**: EC2 블록 스토리지. **같은 AZ 한정**, 1대 EC2 attach(io1/2는 multi-attach). 볼륨 타입: gp(범용 SSD) · io(Provisioned IOPS) · st1(처리량 HDD) · sc1(콜드 HDD). 스냅샷 백업
- **EFS**: 탄력적 파일 시스템 (NFS). **여러 AZ에서 다수 EC2/ECS/Lambda 동시 접근**. Standard/IA/One Zone 클래스
- **S3**: 글로벌 객체 스토리지(리전 단위). 클래스: Standard → Standard-IA → Intelligent Tiering → One-Zone IA → Glacier Instant/Flexible Retrieval → Glacier Deep Archive. **멀티파트 업로드 100MB~ / 5GB 이상 필수**. 전송 가속·바이트 범위 가져오기·S3 Select. **CORS, MFA Delete, Pre-signed URL, Object Lock, Vault Lock(WORM)**
- **FSx**: 매니지드 파일 시스템. Lustre(HPC/ML) · Windows File Server(SMB/AD) · NetApp ONTAP · OpenZFS
- **Storage Gateway**: 온프레미스 ↔ S3 가교. S3 File / FSx File / Volume / Tape Gateway
- 자세히: [[EBS]] · [[EFS]] · [[S3]] · [[FSx]] · [[Storage-Gateway-DataSync]]

### Snow Family · DataSync

- **Snow**: 대용량 데이터 물리 전송. Snowcone · Snowball Edge · Snowmobile. Edge Computing 모드(인터넷 없는 환경)
- **DataSync**: 온프레미스 ↔ AWS 에이전트 기반 동기화. S3/EFS/FSx 대상
- 자세히: [[Snow-Family]] · [[Storage-Gateway-DataSync]]

## 데이터베이스

### RDS · Aurora · DynamoDB · ElastiCache · Redshift

- **RDS**: 매니지드 관계형 (Postgres·MySQL·Oracle·MSSQL·Aurora). **Read Replicas**(비동기, 최대 15개, 승격 가능) · **Multi-AZ**(동기, 자동 페일오버). **SSH/DB 인스턴스 직접 접근 안 됨**
- **Aurora**: AWS 자체 RDB. 10~128TB 자동 확장. 읽기 복제본 15개, Writer/Reader Endpoint. 저장/전송 암호화
- **DynamoDB**: 서버리스 NoSQL. ms 응답. Standard/IA 클래스, Provisioned/On-Demand, Streams, Global Table, PITR 35일, **DAX** 마이크로초 캐시
- **ElastiCache**: 매니지드 Redis/Memcached. 세션 저장·리더보드(Redis Sorted Set). Redis는 자동장애조치/복제, Memcached는 샤딩
- **Redshift**: OLAP 데이터 웨어하우스. 열기반 PostgreSQL 기반. 리더+컴퓨팅 노드. **Spectrum**: S3 데이터 직접 쿼리
- 자세히: [[RDS-Aurora]] · [[RDS-Security-Group]] · [[DynamoDB]] · [[ElastiCache]] · [[Redshift]]

## 분석

- **Athena**: S3 서버리스 SQL 쿼리. Parquet/ORC 권장(less scan). 연합 쿼리로 온프레미스 DB도 가능
- **Glue**: 서버리스 ETL. Glue Crawler → Data Catalog (Athena/Redshift Spectrum/EMR가 활용). Job Bookmarks, DataBrew, Studio
- **EMR**: Hadoop/Spark/HBase/Presto/Flink 매니지드. Master/Core/Task 노드 (Task는 Spot)
- **QuickSight**: 서버리스 BI. SPICE 인메모리 엔진
- **OpenSearch**: ElasticSearch 후속. 전문 검색, **인스턴스 클러스터 필요**, SQL 미지원
- **Lake Formation**: Data Lake 매니지드. 행/열 수준 권한, ML 변환, 블루프린트
- 자세히: [[Athena]] · [[Glue]] · [[EMR]] · [[QuickSight]] · [[OpenSearch]] · [[Lake-Formation]]

## 메시징

- **SQS**: 큐. Standard(무제한·중복 가능) / FIFO(순서·낮은 처리량). 메시지 보존 1분-14일. Long Polling, Visibility Timeout. SendMessage(Producer) / DeleteMessage(Consumer)
- **SNS**: Pub/Sub. 구독자 = E-mail/SMS/HTTPS/SQS/Lambda/Firehose. **Fanout**(SNS → 다수 SQS). FIFO·메시지 필터링·KDF로 S3 전송
- **Kinesis**: 실시간 스트리밍. **Data Stream**(샤드·레코드 · Sequence No · 파티션 키) / **Firehose**(S3·Redshift·OpenSearch로 전달, Queue) / **Data Analytics**(SQL/Flink) / **Video Streams**. Standard(샤드당 2MB/s) / **Enhanced Fanout**(소비자당 2MB/s)
- **Amazon MQ**: 매니지드 RabbitMQ/ActiveMQ. AMQP/MQTT 표준 프로토콜. **확장성 제한** — 온프레미스 마이그레이션용
- **EventBridge**: 이벤트 버스. Schedule/cron, 스키마 레지스트리. SQS/SNS와 차이는 **라우팅 룰 기반**
- 자세히: [[SQS]] · [[SNS]] · [[Kinesis]] · [[Amazon-MQ]] · [[EventBridge]]

## 네트워킹

### VPC

- **CIDR**: 사설 IP — 10.0.0.0/8 · 172.16.0.0/12 · 192.168.0.0/16
- 리전 당 VPC 5개, CIDR 5개(/16~/28)
- 서브넷 예약 IP 5개: .0(네트워크) · .1(VPC 라우터) · .2(Amazon DNS) · .3(비상) · .255(브로드캐스트)
- **NACL**(서브넷, Stateless) · **Security Group**(인스턴스, Stateful)
- **IGW**(인터넷 게이트웨이) · **NAT Gateway**(아웃바운드 인터넷, Private 리소스용)
- **VPC Endpoint**: **Interface**(ENI, 대부분 서비스) / **Gateway**(라우팅 직접, S3·DynamoDB만)
- 자세히: [[VPC]]

### ELB · Route 53 · CloudFront · Global Accelerator

- **ELB**: CLB(지원종료) / **ALB**(L7, HTTP·WebSocket·URI·호스트명·헤더·쿼리 라우팅, AWSALBAPP·AWSALBTG 쿠키) / **NLB**(L4, TCP/TLS/UDP, Sticky Session) / **GWLB**(L3 써드파티 어플라이언스). **X-Forwarded-For**: Client IP
- **Route 53**: DNS. Public/Private Hosted Zone. **Alias**(AWS 리소스, apex 가능) vs **CNAME**(apex 불가). 라우팅 정책: Simple · Weighted · Failover · Latency · Geolocation · Multi-Value · Geoproximity
- **CloudFront**: CDN. ~216개 Edge Location. Origin = S3/ALB/EC2/HTTP 백엔드. Cache Invalidation, 지역 제한
- **Global Accelerator**: 2개 **Anycast IP** → AWS 글로벌 백본. ALB/NLB/EC2/EIP 헬스 체크. **HTTP 외(TCP/UDP)** 또는 정적 IP 필요할 때 ELB+GA
- 자세히: [[ELB]] · [[Route53]] · [[CloudFront]] · [[Global-Accelerator]]

## 보안·자격증명·암호화

### IAM · Cognito · KMS · Secrets Manager · Parameter Store · ACM

- **IAM**: 정책(Policy) + 역할(Role). 리소스 기반 정책: S3 버킷, SNS 주제, SQS 대기열, Lambda 함수. `aws:PrincipalOrgID`로 조직 멤버만 허용
- **Cognito**: 사용자 풀(인증) + 자격 증명 풀(연합·임시 자격)
- **KMS**: 키 관리. 대칭(단일 키, 직접 액세스 X) · 비대칭(퍼블릭/프라이빗). 키 종류: AWS 관리형(무료, 1년 자동 갱신) / **CMK 고객 관리형**($1/월) / **Import**($1/월, 수동 교체). API $0.03/10K. 키 정책: 기본(IAM 정책으로 위임) / 커스텀(키 관리자 명시). **다중 리전 키**(동일 ID·구성)
- **Secrets Manager**: 자동 회전(Lambda). RDS 통합. KMS 강제
- **Parameter Store**: Standard(무료, 4KB) / Advanced(8KB, TTL, 정책). CloudFormation 입력 매개변수
- **ACM**: TLS 인증서. ELB·CloudFront·API Gateway에 무료. **EC2에는 추출 불가** (NLB·CloudFront 우회). 자동 갱신
- 자세히: [[IAM]] · [[Cognito]] · [[KMS]] · [[Secrets-Manager]] · [[SSM-Parameter-Store]] · [[ACM]]

### Shield · WAF · Firewall Manager · Network Firewall

- **Shield Standard**(무료, SYN/UDP L3/L4) / **Advanced**(EC2/ELB/CloudFront/GA/Route53 보호)
- **WAF**: L7 웹 ACL — ALB/API Gateway/CloudFront/AppSync/Cognito 풀. IP·헤더·문자열·Geo·rate
- **Firewall Manager**: Organizations 멀티 계정 WAF/Shield/SG/Network Firewall 일괄 적용
- 자세히: [[Shield-WAF-NetworkFirewall]] · [[Firewall-Manager]]

## 거버넌스·관측

- **CloudTrail**: 누가 무엇을 했나 (API 호출 기록). 관리/데이터/Insight 이벤트. CloudWatch Logs·S3 전송. **기본 90일 보존**
- **AWS Config**: 무엇이 변했나 (리소스 구성 변경 추적). 관리형 규칙 75개 + 커스텀(Lambda). SSM 자동화로 시정 가능
- **CloudWatch**: 지표·로그·경보. **통합 에이전트(신)** — 로그+시스템 단계지표 / **로그 에이전트(구)** — 로그만. 컨테이너/Lambda/Application Insights, Contributor Insights
- **EventBridge** (구 CloudWatch Events): 이벤트 라우팅. Schedule/cron, 스키마 레지스트리
- **AWS Organizations**: 멀티 계정. **SCP**로 OU/계정 권한 제한 (관리 계정 제외)
- 자세히: [[CloudTrail-Config]] · [[CloudWatch]] · [[EventBridge]] · [[AWS-Organizations]]

## IaC

- **CloudFormation**: JSON/YAML 템플릿 → 스택. Parameter Store 통합. 변경 세트(Change Set)로 사전 확인
- 자세히: [[CloudFormation]]

---

## 시험장 직전 체크리스트 — 빈출 비교

### 메시징

- **SQS** = 큐(1:1 소비) · **SNS** = Pub/Sub(1:N) · **Kinesis** = 실시간 스트림(보존·재처리)
- **SQS Standard vs FIFO**: 순서 필요 → FIFO (처리량 제한)
- **SQS + SNS Fanout** vs **EventBridge**: 단순 팬아웃 → SNS, 라우팅 룰·스키마·외부 SaaS → EventBridge
- **Amazon MQ** vs **SQS/SNS**: 표준 프로토콜(AMQP/MQTT) → MQ, 무한 확장 → SQS/SNS

### 스토리지

- **EBS**(블록, 1 EC2, 같은 AZ) · **EFS**(파일, 다중 EC2/AZ, NFS) · **S3**(객체, 글로벌·웹 API)
- **EFS** vs **FSx Lustre**: 범용 NFS → EFS, HPC/ML 처리량 → Lustre
- **S3 클래스**: Standard → IA → Intelligent Tiering → One-Zone IA → Glacier Instant → Glacier Flexible → Glacier Deep Archive (아래로 갈수록 저렴·검색 느림)
- **Snow** vs **DataSync** vs **Storage Gateway**: 일회성 대용량 물리 → Snow, 네트워크 동기화 → DataSync, 하이브리드 상시 → Storage Gateway

### 컴퓨팅

- **EC2** vs **Lambda** vs **Fargate**: 풀 제어 → EC2, 이벤트 짧음 → Lambda, 컨테이너 → Fargate
- **ECS** vs **EKS**: 단순·AWS 통합 → ECS, K8s 호환·멀티클라우드 → EKS
- **App Runner**: ECS/EKS 오버킬일 때 즉시 배포

### 네트워킹

- **CloudFront** vs **Global Accelerator**: 캐시 가능한 콘텐츠(HTML/이미지) → CloudFront, HTTP 외/정적 IP → GA
- **ALB**(L7) vs **NLB**(L4) vs **GWLB**(L3 어플라이언스): HTTP → ALB, 초저지연/TCP/UDP → NLB
- **VPC Endpoint Gateway** = S3·DynamoDB만, **Interface** = ENI(대부분)
- **CNAME** vs **Alias**: apex 도메인 → Alias 필수
- **NACL**(서브넷 stateless) vs **SG**(인스턴스 stateful)

### 보안

- **IAM** vs **Cognito**: AWS 리소스 권한 → IAM, 모바일·웹 앱 사용자 → Cognito
- **Shield** vs **WAF** vs **Network Firewall**: DDoS → Shield, L7 웹 룰 → WAF, VPC 수준 패킷 → Network Firewall
- **Secrets Manager** vs **Parameter Store**: 자동 회전·RDS 통합 → Secrets Manager, 일반 설정 → Parameter Store(저렴)
- **KMS 키**: AWS 관리형(무료) / CMK(고객 관리, $1/월) / Import(자체 키)

### 데이터베이스·분석

- **RDS Multi-AZ**(동기·페일오버) vs **Read Replica**(비동기·확장)
- **DynamoDB DAX**(키-값 캐시, 마이크로초) vs **ElastiCache**(집계 결과)
- **Athena**(서버리스 S3 SQL) vs **Redshift**(OLAP DW) vs **EMR**(Hadoop/Spark 직접)
- **Redshift Spectrum** vs **Athena**: 둘 다 S3 쿼리지만 Spectrum은 Redshift 클러스터 필요
- **Glue**(서버리스 ETL) vs **EMR**(코드 직접): 인프라 관리 싫음 → Glue
- **DynamoDB + OpenSearch**: 키 외 임의 속성 검색

### 관측·거버넌스

- **CloudTrail**(누가 호출) vs **CloudWatch Logs**(앱 로그) vs **Config**(구성 변경 추적)
- **Organizations + SCP**: 멀티 계정 권한 일괄 제한 (관리 계정 제외)
- **Firewall Manager**: Organizations 전제로 WAF/Shield 일괄 적용

---

## 관련 문서

[[AWS-Fundamentals]] · [[AWS(EC2)]] · [[EBS]] · [[Auto-Scaling]] · [[ECS]] · [[EKS]] · [[ECR]] · [[App-Runner]] · [[AWS-Lambda]] · [[API-Gateway]] · [[S3]] · [[S3-File-Upload]] · [[CloudFront]] · [[EFS]] · [[FSx]] · [[Storage-Gateway-DataSync]] · [[Snow-Family]] · [[IAM]] · [[Cognito]] · [[KMS]] · [[Secrets-Manager]] · [[SSM-Parameter-Store]] · [[ACM]] · [[Shield-WAF-NetworkFirewall]] · [[Firewall-Manager]] · [[CloudTrail-Config]] · [[RDS-Security-Group]] · [[RDS-Aurora]] · [[RDS-Monitoring]] · [[DynamoDB]] · [[Redshift]] · [[Athena]] · [[Glue]] · [[EMR]] · [[QuickSight]] · [[OpenSearch]] · [[Lake-Formation]] · [[VPC]] · [[ELB]] · [[Route53]] · [[Global-Accelerator]] · [[ElastiCache]] · [[CloudFormation]] · [[AWS-Organizations]] · [[SQS]] · [[SNS]] · [[Kinesis]] · [[Amazon-MQ]] · [[EventBridge]] · [[CloudWatch]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
