---
tags: [infrastructure, aws, saa-c03, certification, exam-summary]
status: done
category: "Infrastructure - AWS"
aliases: ["SAA-C03 빈출 비교 체크리스트", "SAA Summary Checklist"]
---

# AWS SAA-C03 시험 직전 종합 요약 — 시험장 체크리스트

> 상위 TOC: [[AWS-SAA-C03-Exam-Summary]]

## 시험장 직전 체크리스트 — 빈출 비교

### 메시징

- **SQS** = 큐(1:1 소비), **SNS** = Pub/Sub(1:N), **Kinesis** = 실시간 스트림(보존, 재처리)
- **SQS Standard vs FIFO**: 순서 필요 → FIFO (처리량 제한)
- **SQS + SNS Fanout** vs **EventBridge**: 단순 팬아웃 → SNS, 라우팅 룰/스키마/외부 SaaS → EventBridge
- **Amazon MQ** vs **SQS/SNS**: 표준 프로토콜(AMQP/MQTT) → MQ, 무한 확장 → SQS/SNS

### 스토리지

- **EBS**(블록, 1 EC2, 같은 AZ), **EFS**(파일, 다중 EC2/AZ, NFS), **S3**(객체, 글로벌, 웹 API)
- **EFS** vs **FSx Lustre**: 범용 NFS → EFS, HPC/ML 처리량 → Lustre
- **S3 클래스**: Standard → IA → Intelligent Tiering → One-Zone IA → Glacier Instant → Glacier Flexible → Glacier Deep Archive (아래로 갈수록 저렴, 검색 느림)
- **Snow** vs **DataSync** vs **Storage Gateway**: 일회성 대용량 물리 → Snow, 네트워크 동기화 → DataSync, 하이브리드 상시 → Storage Gateway

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
- **Secrets Manager** vs **Parameter Store**: 자동 회전과 RDS 통합 → Secrets Manager, 일반 설정 → Parameter Store(저렴)
- **KMS 키**: AWS 관리형(무료) / CMK(고객 관리, $1/월) / Import(자체 키)

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
