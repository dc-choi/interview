---
tags: [infrastructure, aws, saa-c03, certification, exam-summary]
status: done
verified_at: 2026-07-15
category: "Infrastructure - AWS"
aliases: ["SAA-C03 빈출 비교 체크리스트", "SAA Summary Checklist"]
---

# AWS SAA-C03 시험 직전 종합 요약 — 시험장 체크리스트

> 상위 TOC: [[AWS-SAA-C03-Exam-Summary]]

## 시험장 직전 체크리스트 — 빈출 비교

### 메시징

- **SQS** = 작업 큐(한 메시지는 한 번에 한 소비자가 처리), **SNS** = Pub/Sub(1:N), **Kinesis** = 실시간 스트림(보존, 재처리)
- **SQS Standard vs FIFO**: 매우 높은 처리량, at-least-once, best-effort 순서 → Standard / 메시지 그룹 내 순서와 중복 제거 → FIFO. FIFO 기본 한도는 API 작업당 300 TPS, 배치 시 초당 3,000개 메시지이며 고처리량 모드는 리전별 한도가 다름
- **SQS + SNS Fanout** vs **EventBridge**: 단순 팬아웃 → SNS, 라우팅 룰/스키마/외부 SaaS → EventBridge
- **Amazon MQ** vs **SQS/SNS**: AMQP, MQTT 같은 표준 프로토콜 호환과 기존 브로커 이전 → MQ, AWS 네이티브 큐와 Pub/Sub의 관리형 확장 → SQS/SNS. 모두 서비스 quota는 확인

### 스토리지

- **EBS**(블록, 같은 AZ의 EC2에 연결, 일반적으로 단일 인스턴스, io1/io2 Multi-Attach 예외), **EFS**(파일, 다중 EC2/AZ, NFS), **S3**(객체, 리전 단위 버킷, 웹 API)
- **EFS** vs **FSx Lustre**: 범용 NFS → EFS, HPC/ML 처리량 → Lustre
- **S3 클래스**: 빈번한 접근 → Standard / 패턴이 불명확하거나 변동 → Intelligent-Tiering / 비빈번 접근 → Standard-IA, One Zone-IA / 아카이브 → Glacier Instant, Flexible, Deep Archive. 비용, 최소 보관 기간, 검색 지연을 함께 비교
- **물리 전송** vs **DataSync** vs **Storage Gateway**: 신규 고객의 물리 전송 → AWS Data Transfer Terminal 또는 파트너 / 네트워크 동기화 → DataSync / 하이브리드 상시 연결 → Storage Gateway. Snow Family는 기존 고객만 주문 가능

### 컴퓨팅

- **EC2** vs **Lambda** vs **Fargate**: 풀 제어 → EC2, 이벤트 짧음 → Lambda, 컨테이너 → Fargate
- **ECS** vs **EKS**: 단순하고 AWS 통합 → ECS, K8s 호환과 멀티클라우드 → EKS
- **App Runner**: ECS/EKS 오버킬일 때 즉시 배포

### 네트워킹

- **CloudFront** vs **Global Accelerator**: 캐시 가능한 콘텐츠(HTML/이미지) → CloudFront, HTTP 외/정적 IP → GA
- **ALB**(L7) vs **NLB**(L4) vs **GWLB**(L3 어플라이언스): HTTP → ALB, 초저지연/TCP/UDP → NLB
- **VPC Endpoint Gateway** = S3, DynamoDB만, **Interface** = ENI(대부분)
- **CNAME** vs **Alias**: apex 도메인 → Alias 필수
- **NACL**(서브넷 stateless) vs **SG**(인스턴스 stateful)

### 보안

- **IAM** vs **Cognito**: AWS 리소스 권한 → IAM, 모바일과 웹 앱 사용자 → Cognito
- **Shield** vs **WAF** vs **Network Firewall**: DDoS → Shield, L7 웹 룰 → WAF, VPC 수준 패킷 → Network Firewall
- **Secrets Manager** vs **Parameter Store**: 자동 회전과 RDS 통합 → Secrets Manager, 일반 설정 → Parameter Store. Standard 파라미터는 추가 저장 요금이 없고 Advanced는 요금 발생
- **KMS 키**: AWS 관리형(서비스가 생성하고 연 1회 자동 회전) / 고객 관리형(정책과 회전 제어) / Import(자체 키 소재). 고객 관리형과 API 사용 요금은 최신 가격표 확인

### 데이터베이스, 분석

- **RDS Multi-AZ**(동기, 페일오버) vs **Read Replica**(비동기, 확장)
- **DynamoDB DAX**(키-값 캐시, 마이크로초) vs **ElastiCache**(집계 결과)
- **Athena**(서버리스 S3 SQL) vs **Redshift**(OLAP DW) vs **EMR**(Hadoop/Spark 직접)
- **Redshift Spectrum** vs **Athena**: 둘 다 S3 쿼리지만 Spectrum은 Redshift 클러스터 필요
- **Glue**(서버리스 ETL) vs **EMR**(코드 직접): 인프라 관리 싫음 → Glue
- **DynamoDB + OpenSearch**: 키 외 임의 속성 검색

### 관측, 거버넌스

- **CloudTrail**(누가 호출) vs **CloudWatch Logs**(앱 로그) vs **Config**(구성 변경 추적)
- **Organizations + SCP**: 멀티 계정 권한 일괄 제한 (관리 계정 제외)
- **Firewall Manager**: Organizations 전제로 WAF/Shield 일괄 적용

## 출처

- [AWS Certified Solutions Architect - Associate SAA-C03 시험 가이드 — AWS](https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html)
- [Amazon SQS 큐 유형과 처리량 — AWS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-types.html)
- [Amazon SQS 엔드포인트와 quota — AWS](https://docs.aws.amazon.com/general/latest/gr/sqs-service.html)
- [Amazon EBS Multi-Attach — AWS](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volumes-multi.html)
- [Amazon S3 스토리지 클래스 — AWS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html)
- [AWS Snowball Edge 가용성 변경 — AWS](https://docs.aws.amazon.com/snowball/latest/developer-guide/snowball-edge-availability-change.html)
- [Parameter Store 티어 — AWS](https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html)
- [AWS KMS 키 회전 — AWS](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html)
