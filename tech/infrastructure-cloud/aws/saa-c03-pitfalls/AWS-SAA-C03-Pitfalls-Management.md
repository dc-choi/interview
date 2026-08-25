---
tags: [infrastructure, aws, saa-c03, certification, pitfalls, management, migration, ai-ml, dr]
status: done
category: "Infrastructure - AWS"
aliases: ["관리, 마이그레이션, DR 함정", "SAA-C03 Pitfalls Management"]
verified_at: 2026-08-25
---

# AWS SAA-C03 빈출 함정 — 관리, 거버넌스, 마이그레이션, AI/ML, DR, 빈출 패턴

> 상위 TOC: [[AWS-SAA-C03-Pitfalls]] | 자매: [[AWS-SAA-C03-Exam-Summary]]

## 관리, 거버넌스

### CloudTrail, Config, CloudWatch

- **CloudTrail**
  - Event history는 리전별 최근 90일 관리 이벤트를 추가 CloudTrail 요금 없이 조회
  - 90일을 넘겨 보관하려면 trail 또는 event data store를 만든다. 리전별 관리 이벤트 첫 사본은 CloudTrail 전송 요금이 없지만 S3 등 대상 서비스 비용은 별도다. 데이터 이벤트와 Insights는 별도 과금 경계를 확인한다.
  - **Organization Trail**: 모든 계정 통합
- CloudTrail 로그 전달은 요청 경로와 동기화된 실시간 보장이 아니다. 관리 API 이벤트 대응은 EventBridge, 위협 탐지는 GuardDuty처럼 목적에 맞는 신호를 함께 사용한다.
- **AWS Config**
  - 리소스 구성 변경 기록. 관리형 규칙 목록은 계속 바뀌며, 커스텀 규칙은 Lambda 또는 Guard 정책으로 작성
  - **Remediation**: SSM Automation으로 자동 시정
  - **Aggregator**: Organizations 전체 통합
- **CloudWatch**
  - 기본 지표: 5분 (EC2). 상세 모니터링: 1분(추가 비용)
  - **CloudWatch Agent**: 시스템 내부 지표(메모리, 디스크 — 기본 미수집), 로그
  - **Container Insights**: ECS, EKS, Fargate, K8s 자체 호스팅
  - **Logs Insights**: 로그 쿼리 (S3 익스포트와 별개)
  - **Logs 구독 필터**: Kinesis Data Streams, Amazon Data Firehose, Lambda로 전송
  - **사용자 지정 지표** 최소 단위 — 표준 1분, 고해상도 1초(추가 비용)

### CloudFormation, Service Catalog, Organizations

- **CloudFormation**
  - JSON/YAML. **Drift Detection**으로 수동 변경 감지
  - **CreationPolicy**: 신호 대기 (cfn-signal). **WaitCondition**보다 권장
  - **DeletionPolicy**: Retain, Delete, Snapshot
  - **StackSet**: 멀티 계정, 멀티 리전 배포 (Organizations 권장)
  - **Change Set**: 사전 변경 확인
  - **Nested Stack**: 재사용 가능한 모듈
- **Service Catalog**: 승인된 IaC 카탈로그. **사용자에게는 카탈로그만 노출** — 직접 리소스 권한 X
- **Organizations**
  - **Management Account** + Member Accounts
  - **Consolidated Billing**: 볼륨 할인, 예약 인스턴스 공유
  - **SCP**: 관리 계정은 면제

### Systems Manager, 기타

- **SSM Run Command**: 인스턴스에 명령 실행 (SSH 없이)
- **Session Manager**: 브라우저 셸. **포트 22 열 필요 없음**
- **Patch Manager**: 패치 베이스라인, 스케줄
- **Parameter Store**: [위 참고]
- **Inventory**: 설치 SW, 구성 수집
- **Automation**: 런북, 반복 작업
- **State Manager**: 일관된 구성 유지
- **Trusted Advisor**: 비용, 성능, 보안, 내결함성, 서비스 한도 — Basic은 일부, Business/Enterprise Support로 풀
- **Compute Optimizer**: EC2, EBS, Lambda, ASG 리사이징 권장 (ML 기반)
- **Cost Explorer**: 추세 분석, 예측. **태깅 활성화 후 24시간** 필요
- **AWS Budgets**: 예산 알람 (SNS)
- **Resource Access Manager(RAM)**: Subnet, TGW, Aurora DB cluster 같은 리소스를 계정 간 공유한다. Aurora snapshot 공유는 RAM이 아니라 RDS의 별도 기능이다
- **AWS Health Dashboard**: 계정 영향 이벤트. **Health API**로 자동화
- **Well-Architected Tool**: 운영 우수성, 보안, 안정성, 성능 효율성, 비용 최적화, 지속 가능성의 6개 pillar 자체 평가
- **AWS Artifact**: 컴플라이언스 보고서 다운로드 (SOC, PCI, ISO)

---

## 마이그레이션

- **DMS**(Database Migration Service): RDB, NoSQL 마이그레이션. **소스 DB 운영 중에 가능**. **SCT**(Schema Conversion Tool)와 짝 — 이기종(Oracle→Aurora)
- **DMS CDC**: 변경 데이터 캡처 — 1회성 + 지속 복제. 다중 마스터(역방향)
- **Application Migration Service(MGN)**: 서버 리프트앤시프트. **에이전트 기반**으로 디스크 복제 (구 SMS, CloudEndure 통합)
- **Elastic Disaster Recovery(DRS)**: MGN 기술로 DR — 저비용 대기 인스턴스, 페일오버 가능
- **Database Migration vs Server Migration**: DB만 → DMS, 서버 통째 → MGN
- **Snow Family**: 1주 이상 네트워크 시간 시
- **DataSync**: 지속 동기화, 증분
- **Transfer Family**: SFTP/FTPS/FTP 인터페이스

---

## AI/ML

- **Comprehend**: NLP(언어, 감정, 엔티티, 키프레이즈). **Medical** 버전 별도
- **Comprehend Medical**: PHI 추출 — HIPAA
- **Rekognition**: 이미지, 동영상 분석. 얼굴, 객체, 콘텐츠 검열, 유명인
- **Transcribe**: 음성→텍스트. **PII 자동 마스킹**
- **Polly**: 텍스트→음성
- **Translate**: 다국어 번역
- **Lex**: 챗봇(Alexa 엔진). Connect와 통합
- **Connect**: 콜센터
- **Kendra**: 엔터프라이즈 문서 검색 서비스지만 2026-06-30부터 maintenance mode이며 신규 고객 등록은 2026-07-30에 종료됐다. 새 검색 애플리케이션은 Bedrock Knowledge Bases 같은 현재 대안을 검토
- **Personalize**: 추천 시스템
- **Forecast**: 시계열 예측 서비스지만 신규 고객에게는 제공되지 않는다. 새 설계는 SageMaker Canvas 등 현재 대안을 검토
- **Textract**: 문서 OCR, 폼, 표
- **SageMaker**: ML 풀스택 (Studio, Ground Truth, JumpStart)
- **시험 패턴**: "이 기능을 코드 작성 없이" → 매니지드 AI 서비스. "커스텀 모델 학습" → SageMaker

---

## DR, HA 전략

- **백업 전략 4종**
  | 전략 | RTO | RPO | 비용 |
  |---|---|---|---|
  | Backup & Restore | 시간-일 | 시간 | 최저 |
  | Pilot Light | 10분 단위 | 분 | 낮음 |
  | Warm Standby | 분 | 초-분 | 중 |
  | Multi-Site Active-Active | 가장 짧게 설계 가능 | 복제 방식에 따라 다름 | 최고 |
- **Pilot Light**: 핵심 시스템(DB)만 항상 가동. 나머지는 페일오버 시 부팅
- **Warm Standby**: 축소된 풀스택 가동. 페일오버 시 스케일업
- **Route 53 Failover** + Health Check로 자동 전환
- **Aurora Global Database**: 리전 간 복제 지연은 보통 1초 미만이고 보조 리전 승격은 1분 미만이 가능하지만, 실제 RPO와 RTO는 장애 시점의 복제 지연과 애플리케이션 전환 절차로 검증한다.
- **S3 Cross-Region Replication**: RPO 최소화 — 단방향 또는 양방향
- **DynamoDB Global Table**: 멀티 리전 다중 마스터

---

## 빈출 시험 패턴 (요약)

- **"가장 비용 효율적"** + 대용량 일회성 전송 → **Snowball Edge** (시험 기준. 실무는 기존 Snow 고객 한정, 신규는 Data Transfer Terminal이나 파트너 — [[Snow-Family]])
- **"가장 비용 효율적"** + S3 자주 변경 안 됨 → **Intelligent-Tiering** 또는 **Standard-IA**
- **"가장 비용 효율적"** + 30일 후 거의 안 봄 → 수명주기로 **Glacier**
- **"운영 부담 최소화"** + 컨테이너 실행 → **Fargate**. 가장 저렴한지는 실행 패턴과 EC2 활용률로 비교
- **"운영 부담 최소화"** → **서버리스**(Lambda, Fargate, Aurora Serverless, Athena)
- **"실시간 스트림 처리"** → **Kinesis Data Streams**, 관리형 목적지 적재 → **Amazon Data Firehose**. Firehose 버퍼는 목적지별 크기와 시간 설정이므로 60초로 고정되지 않는다.
- **"가장 낮은 지연"** + 게임/VoIP → **Global Accelerator**
- **"DDoS 보호"** + 비용 보상 → **Shield Advanced**
- **"코드 변경 없이"** + 다중 AZ → **RDS Multi-AZ**(설정만)
- **"SSH 키 관리 불필요"** → **Systems Manager Session Manager**
- **"비밀번호 자동 회전"** → **Secrets Manager**
- **"멀티 계정 권한 통제"** → **Organizations + SCP**
- **"멀티 계정 보안 정책 일괄"** → **Firewall Manager**
- **"S3 객체 변경 시 트리거"** → S3 이벤트 알림 → Lambda, SQS, SNS, EventBridge
- **"하이브리드 파일 액세스"** → **Storage Gateway**(File, Volume, Tape)
- **"온프레 ↔ AWS 지속 동기화"** → **DataSync**
- **"불변 객체 보관"** → **S3 Object Lock(Compliance)**. QLDB는 2025-07-31 지원 종료되어 새 설계 선택지가 아니다.
- **"멀티 리전 활성-활성" + NoSQL 허용** → **DynamoDB Global Tables**. 각 리전 replica가 읽기와 쓰기를 받는다.
- **"멀티 리전 관계형 읽기/DR"** → **Aurora Global Database**. 쓰기는 한 primary 리전에서 수행하고 secondary 리전은 읽기 전용이다.
- **"멀티 리전 활성-활성 RDB"** → 위 두 서비스를 같은 답으로 묶지 않는다. 관계형 다중 writer가 필수라면 현재 서비스와 일관성 요구를 별도로 확인한다.

## 관련 문서

[[CloudTrail-Config]], [[CloudWatch]], [[CloudFormation]], [[AWS-Organizations]]

## 출처

- [AWS CloudTrail, Working with CloudTrail event history](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events-console.html)
- [AWS Config, List of AWS Config Managed Rules](https://docs.aws.amazon.com/config/latest/developerguide/managed-rules-by-trigger-type.html)
- [Amazon EC2, Manage detailed monitoring](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-detailed-monitoring.html)
- [AWS Well-Architected Framework, Definitions](https://docs.aws.amazon.com/wellarchitected/latest/framework/definitions.html)
- [AWS Resource Access Manager, Shareable AWS resources](https://docs.aws.amazon.com/ram/latest/userguide/shareable.html)
- [Amazon Aurora, Sharing a DB cluster snapshot](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-share-snapshot.html)
- [Amazon Kendra, Availability change](https://docs.aws.amazon.com/kendra/latest/dg/kendra-availability-change.html)
- [Amazon Forecast, Document history](https://docs.aws.amazon.com/forecast/latest/dg/doc-history.html)
- [Amazon Data Firehose, BufferingHints](https://docs.aws.amazon.com/firehose/latest/APIReference/API_BufferingHints.html)
- [Amazon Aurora, Using Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html)
- [Amazon DynamoDB, Global tables](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html)
- [Amazon QLDB, End of support notice](https://docs.aws.amazon.com/qldb/latest/developerguide/getting-started-step-7.html)
- AWS SAA C03 Udemy 강의 오답노트 (Stephane Maarek, 로컬)
