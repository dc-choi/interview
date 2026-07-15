---
tags: [infrastructure, aws, saa-c03, certification, exam-summary]
status: done
verified_at: 2026-07-15
category: "Infrastructure - AWS"
aliases: ["SAA-C03 메시징 네트워킹 보안 요약", "SAA Summary Network Security Ops"]
---

# AWS SAA-C03 시험 직전 종합 요약 — 메시징, 네트워킹, 보안, 거버넌스, IaC

> 상위 TOC: [[AWS-SAA-C03-Exam-Summary]]

## 메시징

- **SQS**: 큐. Standard(매우 높은 처리량, at-least-once, best-effort 순서) / FIFO(메시지 그룹 내 순서, 중복 제거). FIFO 기본 한도는 API 작업당 300 TPS, 배치 시 초당 3,000개 메시지이며 고처리량 모드 한도는 리전별로 다름. 메시지 보존 1분-14일. Long Polling, Visibility Timeout. SendMessage(Producer) / DeleteMessage(Consumer)
- **SNS**: Pub/Sub. 구독자 = Email/SMS/HTTPS/SQS/Lambda/Amazon Data Firehose. **Fanout**(SNS → 다수 SQS). FIFO, 메시지 필터링, Firehose로 S3 전송
- **Kinesis**: 실시간 스트리밍. **Data Streams**(샤드, 레코드, Sequence Number, 파티션 키) / **Amazon Data Firehose**(S3, Redshift, OpenSearch 등으로 버퍼 후 전달) / **Managed Service for Apache Flink**(이전 Data Analytics) / **Video Streams**. 샤드당 지속 처리량은 쓰기 1MB/s와 읽기 2MB/s, **Enhanced Fan-Out**은 등록 소비자마다 샤드당 읽기 2MB/s 제공
- **Amazon MQ**: 매니지드 RabbitMQ/ActiveMQ. AMQP, MQTT 같은 표준 프로토콜과 기존 브로커 호환이 필요한 마이그레이션에 적합. 인스턴스와 브로커 구성에 따른 처리량 한계를 설계에 반영
- **EventBridge**: 이벤트 버스. Schedule/cron, 스키마 레지스트리. SQS/SNS와 차이는 **라우팅 룰 기반**
- 자세히: [[SQS]], [[SNS]], [[Kinesis]], [[Amazon-MQ]], [[EventBridge]]

## 네트워킹

### VPC

- **CIDR**: 사설 IP — 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
- 리전당 VPC 5개, VPC당 IPv4 CIDR 5개가 기본 quota이며 둘 다 증액 가능. IPv4 서브넷 크기는 /16-/28
- AWS 제공 IPv4 범위의 서브넷 예약 IP 5개: 첫 네 주소(네트워크, VPC 라우터, DNS, 향후 사용)와 마지막 주소. 마지막 주소는 서브넷 크기에 따라 달라지며 BYOIP 범위는 예외
- **NACL**(서브넷, Stateless), **Security Group**(인스턴스, Stateful)
- **IGW**(인터넷 게이트웨이), **NAT Gateway**(아웃바운드 인터넷, Private 리소스용)
- **VPC Endpoint**: **Interface**(ENI, AWS PrivateLink 지원 서비스) / **Gateway**(라우팅 테이블, S3와 DynamoDB). S3와 DynamoDB도 Interface 유형을 지원
- 자세히: [[VPC]]

### ELB, Route 53, CloudFront, Global Accelerator

- **ELB**: CLB(이전 세대, 신규 설계는 ALB/NLB 권장) / **ALB**(L7, HTTP, WebSocket, URI, 호스트명, 헤더, 쿼리 라우팅, AWSALBAPP, AWSALBTG 쿠키) / **NLB**(L4, TCP/TLS/UDP, Sticky Session) / **GWLB**(L3 써드파티 어플라이언스). **X-Forwarded-For**: Client IP
- **Route 53**: DNS. Public/Private Hosted Zone. **Alias**(AWS 리소스, apex 가능) vs **CNAME**(apex 불가). 라우팅 정책: Simple, Weighted, Failover, Latency, Geolocation, Multi-Value, Geoproximity
- **CloudFront**: 글로벌 PoP 기반 CDN. Origin = S3/ALB/EC2/HTTP 백엔드. Cache Invalidation, 지역 제한
- **Global Accelerator**: 2개 **Anycast IP** → AWS 글로벌 백본. ALB/NLB/EC2/EIP 헬스 체크. **HTTP 외(TCP/UDP)** 또는 정적 IP 필요할 때 ELB+GA
- 자세히: [[ELB]], [[Route53]], [[CloudFront]], [[Global-Accelerator]]

## 보안, 자격증명, 암호화

### IAM, Cognito, KMS, Secrets Manager, Parameter Store, ACM

- **IAM**: 정책(Policy) + 역할(Role). 리소스 기반 정책: S3 버킷, SNS 주제, SQS 대기열, Lambda 함수. `aws:PrincipalOrgID`로 조직 멤버만 허용
- **Cognito**: 사용자 풀(인증) + 자격 증명 풀(연합, 임시 자격)
- **KMS**: 대칭 및 비대칭 키 관리. AWS 관리형 키는 매년 자동 회전하며 고객 관리형 키는 정책과 회전 주기를 제어할 수 있다. 자체 키 소재 Import를 지원한다. 관련 Multi-Region 키는 같은 키 ID와 키 소재를 공유하지만 각 리전의 독립 리소스다. 정확한 키와 API 요금은 최신 가격표 확인
- **Secrets Manager**: 자동 회전(Lambda). RDS 통합. KMS 강제
- **Parameter Store**: Standard(추가 파라미터 저장 요금 없음, 4KB) / Advanced(요금 발생, 8KB, TTL, 정책). CloudFormation 입력 매개변수
- **ACM**: TLS 인증서. 통합 AWS 서비스용 비내보내기 공개 인증서에는 추가 요금이 없고 자동 갱신을 지원. 2025-06-17 이후 생성된 내보내기 가능 공개 인증서는 EC2, 컨테이너, 온프레미스에도 배포할 수 있지만 별도 요금과 갱신 인증서 재배포가 필요
- 자세히: [[IAM]], [[Cognito]], [[KMS]], [[Secrets-Manager]], [[SSM-Parameter-Store]], [[ACM]]

### Shield, WAF, Firewall Manager, Network Firewall

- **Shield Standard**(추가 요금 없이 기본 제공, 일반적인 L3/L4 DDoS 보호) / **Advanced**(EC2/ELB/CloudFront/GA/Route53 등 보호 강화)
- **WAF**: L7 웹 ACL — ALB/API Gateway/CloudFront/AppSync/Cognito 풀. IP, 헤더, 문자열, Geo, rate
- **Firewall Manager**: Organizations 멀티 계정 WAF/Shield/SG/Network Firewall 일괄 적용
- 자세히: [[Shield-WAF-NetworkFirewall]], [[Firewall-Manager]]

## 거버넌스, 관측

- **CloudTrail**: 누가 무엇을 했나 (API 호출 기록). 관리/데이터/Insight 이벤트. CloudWatch Logs, S3 전송. **기본 90일 보존**
- **AWS Config**: 무엇이 변했나 (리소스 구성 변경 추적). 사전 정의된 관리형 규칙과 커스텀 규칙(Lambda 또는 Guard)을 제공. SSM 자동화로 시정 가능
- **CloudWatch**: 지표, 로그, 경보. **통합 에이전트(신)** — 로그+시스템 단계지표 / **로그 에이전트(구)** — 로그만. 컨테이너/Lambda/Application Insights, Contributor Insights
- **EventBridge** (구 CloudWatch Events): 이벤트 라우팅. Schedule/cron, 스키마 레지스트리
- **AWS Organizations**: 멀티 계정. **SCP**로 OU/계정 권한 제한 (관리 계정 제외)
- 자세히: [[CloudTrail-Config]], [[CloudWatch]], [[EventBridge]], [[AWS-Organizations]]

## IaC

- **CloudFormation**: JSON/YAML 템플릿 → 스택. Parameter Store 통합. 변경 세트(Change Set)로 사전 확인
- 자세히: [[CloudFormation]]

## 출처

- [AWS Certified Solutions Architect - Associate SAA-C03 시험 가이드 — AWS](https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html)
- [Amazon SQS 엔드포인트와 quota — AWS](https://docs.aws.amazon.com/general/latest/gr/sqs-service.html)
- [Kinesis Data Streams quota — AWS](https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html)
- [Amazon Data Firehose — AWS](https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html)
- [Amazon VPC quota — AWS](https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html)
- [VPC 서브넷 CIDR과 예약 주소 — AWS](https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html)
- [Gateway VPC Endpoint — AWS](https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html)
- [Classic Load Balancer — AWS](https://docs.aws.amazon.com/elasticloadbalancing/latest/classic/introduction.html)
- [AWS KMS 키 회전 — AWS](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html)
- [AWS KMS Multi-Region 키 — AWS](https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html)
- [Parameter Store 티어 — AWS](https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html)
- [ACM 내보내기 가능 공개 인증서 — AWS](https://docs.aws.amazon.com/acm/latest/userguide/acm-exportable-certificates.html)
- [AWS Shield — AWS](https://docs.aws.amazon.com/waf/latest/developerguide/shield-chapter.html)
- [AWS Config 규칙 — AWS](https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config.html)
