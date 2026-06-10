---
tags: [infrastructure, aws, saa-c03, certification, pitfalls, management, migration, ai-ml, dr]
status: done
category: "Infrastructure - AWS"
aliases: ["관리, 마이그레이션, DR 함정", "SAA-C03 Pitfalls Management"]
---

# AWS SAA-C03 빈출 함정 — 관리, 거버넌스, 마이그레이션, AI/ML, DR, 빈출 패턴

> 상위 TOC: [[AWS-SAA-C03-Pitfalls]] | 자매: [[AWS-SAA-C03-Exam-Summary]]

## 관리, 거버넌스

### CloudTrail, Config, CloudWatch

- **CloudTrail**
  - 기본 90일 이벤트 기록은 **AWS 관리** (무료)
  - 트레일 만들면 S3로 영구 보관. **관리 이벤트**(기본 활성, 무료) / **데이터 이벤트**(S3, Lambda, DynamoDB, 기본 비활성, 유료) / **인사이트 이벤트**(이상 패턴)
  - **Organization Trail**: 모든 계정 통합
- **CloudTrail은 거의 실시간이지만 ~15분 지연** — 실시간 보안 알림은 어려움(GuardDuty가 더 빠름)
- **AWS Config**
  - 리소스 구성 변경 기록. 관리형 규칙 ~75개 + 커스텀(Lambda)
  - **Remediation**: SSM Automation으로 자동 시정
  - **Aggregator**: Organizations 전체 통합
- **CloudWatch**
  - 기본 지표: 5분 (EC2). 상세 모니터링: 1분(추가 비용)
  - **CloudWatch Agent**: 시스템 내부 지표(메모리, 디스크 — 기본 미수집), 로그
  - **Container Insights**: ECS, EKS, Fargate, K8s 자체 호스팅
  - **Logs Insights**: 로그 쿼리 (S3 익스포트와 별개)
  - **Logs 구독 필터**: Kinesis, Firehose, Lambda로 실시간 전송
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
  - **Master/Management Account** + Member Accounts
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
- **Resource Access Manager(RAM)**: 리소스 공유 — Subnet, TGW, RDS Aurora 스냅샷 등
- **Personal Health Dashboard**: 계정 영향 이벤트. **Health API**로 자동화
- **Well-Architected Tool**: 5 Pillars 자체 평가
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
- **Kendra**: 엔터프라이즈 문서 검색 (자연어)
- **Personalize**: 추천 시스템
- **Forecast**: 시계열 예측
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
  | Multi-Site Active-Active | 0 | 0 | 최고 |
- **Pilot Light**: 핵심 시스템(DB)만 항상 가동. 나머지는 페일오버 시 부팅
- **Warm Standby**: 축소된 풀스택 가동. 페일오버 시 스케일업
- **Route 53 Failover** + Health Check로 자동 전환
- **Aurora Global Database**: RPO <1초, RTO 1분 — 시험에서 가장 짧은 RTO/RPO DB 시나리오
- **S3 Cross-Region Replication**: RPO 최소화 — 단방향 또는 양방향
- **DynamoDB Global Table**: 멀티 리전 다중 마스터

---

## 빈출 시험 패턴 (요약)

- **"가장 비용 효율적"** + 대용량 일회성 전송 → **Snowball Edge**
- **"가장 비용 효율적"** + S3 자주 변경 안 됨 → **Intelligent-Tiering** 또는 **Standard-IA**
- **"가장 비용 효율적"** + 30일 후 거의 안 봄 → 수명주기로 **Glacier**
- **"가장 비용 효율적"** + 컨테이너 단순 실행 → **Fargate** (관리 부담 없음)
- **"운영 부담 최소화"** → **서버리스**(Lambda, Fargate, Aurora Serverless, Athena)
- **"실시간"** + 데이터 분석 → **Kinesis Data Streams**, 단순 적재 → **Firehose**(60초 버퍼)
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
- **"불변, 감사"** → **QLDB**(원장) 또는 **S3 Object Lock(Compliance)**
- **"멀티 리전 활성-활성 RDB"** → **Aurora Global Database** 또는 **DynamoDB Global Table**

## 관련 문서

[[CloudTrail-Config]], [[CloudWatch]], [[CloudFormation]], [[AWS-Organizations]]

## 출처

- AWS SAA C03 Udemy 강의 오답노트 (Stephane Maarek, 로컬)
