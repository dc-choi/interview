---
tags: [infrastructure, aws, saa-c03, certification, exam-summary]
status: done
category: "Infrastructure - AWS"
aliases: ["SAA-C03 메시징 네트워킹 보안 요약", "SAA Summary Network Security Ops"]
---

# AWS SAA-C03 시험 직전 종합 요약 — 메시징, 네트워킹, 보안, 거버넌스, IaC

> 상위 TOC: [[AWS-SAA-C03-Exam-Summary]]

## 메시징

- **SQS**: 큐. Standard(무제한, 중복 가능) / FIFO(순서, 낮은 처리량). 메시지 보존 1분-14일. Long Polling, Visibility Timeout. SendMessage(Producer) / DeleteMessage(Consumer)
- **SNS**: Pub/Sub. 구독자 = E-mail/SMS/HTTPS/SQS/Lambda/Firehose. **Fanout**(SNS → 다수 SQS). FIFO, 메시지 필터링, KDF로 S3 전송
- **Kinesis**: 실시간 스트리밍. **Data Stream**(샤드, 레코드, Sequence No, 파티션 키) / **Firehose**(S3, Redshift, OpenSearch로 전달, Queue) / **Data Analytics**(SQL/Flink) / **Video Streams**. Standard(샤드당 2MB/s) / **Enhanced Fanout**(소비자당 2MB/s)
- **Amazon MQ**: 매니지드 RabbitMQ/ActiveMQ. AMQP/MQTT 표준 프로토콜. **확장성 제한** — 온프레미스 마이그레이션용
- **EventBridge**: 이벤트 버스. Schedule/cron, 스키마 레지스트리. SQS/SNS와 차이는 **라우팅 룰 기반**
- 자세히: [[SQS]], [[SNS]], [[Kinesis]], [[Amazon-MQ]], [[EventBridge]]

## 네트워킹

### VPC

- **CIDR**: 사설 IP — 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
- 리전 당 VPC 5개, CIDR 5개(/16~/28)
- 서브넷 예약 IP 5개: .0(네트워크), .1(VPC 라우터), .2(Amazon DNS), .3(비상), .255(브로드캐스트)
- **NACL**(서브넷, Stateless), **Security Group**(인스턴스, Stateful)
- **IGW**(인터넷 게이트웨이), **NAT Gateway**(아웃바운드 인터넷, Private 리소스용)
- **VPC Endpoint**: **Interface**(ENI, 대부분 서비스) / **Gateway**(라우팅 직접, S3, DynamoDB만)
- 자세히: [[VPC]]

### ELB, Route 53, CloudFront, Global Accelerator

- **ELB**: CLB(지원종료) / **ALB**(L7, HTTP, WebSocket, URI, 호스트명, 헤더, 쿼리 라우팅, AWSALBAPP, AWSALBTG 쿠키) / **NLB**(L4, TCP/TLS/UDP, Sticky Session) / **GWLB**(L3 써드파티 어플라이언스). **X-Forwarded-For**: Client IP
- **Route 53**: DNS. Public/Private Hosted Zone. **Alias**(AWS 리소스, apex 가능) vs **CNAME**(apex 불가). 라우팅 정책: Simple, Weighted, Failover, Latency, Geolocation, Multi-Value, Geoproximity
- **CloudFront**: CDN. ~216개 Edge Location. Origin = S3/ALB/EC2/HTTP 백엔드. Cache Invalidation, 지역 제한
- **Global Accelerator**: 2개 **Anycast IP** → AWS 글로벌 백본. ALB/NLB/EC2/EIP 헬스 체크. **HTTP 외(TCP/UDP)** 또는 정적 IP 필요할 때 ELB+GA
- 자세히: [[ELB]], [[Route53]], [[CloudFront]], [[Global-Accelerator]]

## 보안, 자격증명, 암호화

### IAM, Cognito, KMS, Secrets Manager, Parameter Store, ACM

- **IAM**: 정책(Policy) + 역할(Role). 리소스 기반 정책: S3 버킷, SNS 주제, SQS 대기열, Lambda 함수. `aws:PrincipalOrgID`로 조직 멤버만 허용
- **Cognito**: 사용자 풀(인증) + 자격 증명 풀(연합, 임시 자격)
- **KMS**: 키 관리. 대칭(단일 키, 직접 액세스 X), 비대칭(퍼블릭/프라이빗). 키 종류: AWS 관리형(무료, 1년 자동 갱신) / **CMK 고객 관리형**($1/월) / **Import**($1/월, 수동 교체). API $0.03/10K. 키 정책: 기본(IAM 정책으로 위임) / 커스텀(키 관리자 명시). **다중 리전 키**(동일 ID, 구성)
- **Secrets Manager**: 자동 회전(Lambda). RDS 통합. KMS 강제
- **Parameter Store**: Standard(무료, 4KB) / Advanced(8KB, TTL, 정책). CloudFormation 입력 매개변수
- **ACM**: TLS 인증서. ELB, CloudFront, API Gateway에 무료. **EC2에는 추출 불가** (NLB, CloudFront 우회). 자동 갱신
- 자세히: [[IAM]], [[Cognito]], [[KMS]], [[Secrets-Manager]], [[SSM-Parameter-Store]], [[ACM]]

### Shield, WAF, Firewall Manager, Network Firewall

- **Shield Standard**(무료, SYN/UDP L3/L4) / **Advanced**(EC2/ELB/CloudFront/GA/Route53 보호)
- **WAF**: L7 웹 ACL — ALB/API Gateway/CloudFront/AppSync/Cognito 풀. IP, 헤더, 문자열, Geo, rate
- **Firewall Manager**: Organizations 멀티 계정 WAF/Shield/SG/Network Firewall 일괄 적용
- 자세히: [[Shield-WAF-NetworkFirewall]], [[Firewall-Manager]]

## 거버넌스, 관측

- **CloudTrail**: 누가 무엇을 했나 (API 호출 기록). 관리/데이터/Insight 이벤트. CloudWatch Logs, S3 전송. **기본 90일 보존**
- **AWS Config**: 무엇이 변했나 (리소스 구성 변경 추적). 관리형 규칙 75개 + 커스텀(Lambda). SSM 자동화로 시정 가능
- **CloudWatch**: 지표, 로그, 경보. **통합 에이전트(신)** — 로그+시스템 단계지표 / **로그 에이전트(구)** — 로그만. 컨테이너/Lambda/Application Insights, Contributor Insights
- **EventBridge** (구 CloudWatch Events): 이벤트 라우팅. Schedule/cron, 스키마 레지스트리
- **AWS Organizations**: 멀티 계정. **SCP**로 OU/계정 권한 제한 (관리 계정 제외)
- 자세히: [[CloudTrail-Config]], [[CloudWatch]], [[EventBridge]], [[AWS-Organizations]]

## IaC

- **CloudFormation**: JSON/YAML 템플릿 → 스택. Parameter Store 통합. 변경 세트(Change Set)로 사전 확인
- 자세히: [[CloudFormation]]
