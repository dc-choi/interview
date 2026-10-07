---
tags: [infrastructure, aws]
status: index
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["인프라&클라우드(Infrastructure&Cloud)", "Infrastructure & Cloud"]
---

# 인프라&클라우드(Infrastructure&Cloud)

## 목차

- [[GPU-Server-Infrastructure|GPU 서버 인프라]] — CPU와 GPU, 워프와 분기 발산, 메모리와 통신 경로, 전력과 냉각, 사용률 해석과 MIG/time-slicing 관측 제약
- [[tech/infrastructure-cloud/foundation/클라우드기초(Foundation)|클라우드 기초 (Foundation)]] — IaaS/PaaS/FaaS, SaaS 리전별 데이터 격리와 운영 주권, IaC와 Pulumi 컴포넌트, 클라우드 전환 전략, Cloudflare cf CLI와 Artifacts
- [[tech/infrastructure-cloud/container/컨테이너(Container)|컨테이너 (Container)]] — Docker, Compose, 컨테이너 내부 구조, 이미지 빌드와 베이스 이미지 선택
- [[tech/infrastructure-cloud/aws/AWS서비스(AWSServices)|AWS 서비스 (AWS)]] — EC2/ASG/ALB, Lambda, ALB 5XX와 NLB TCP 연결 진단
- [[tech/infrastructure-cloud/network/인프라네트워크(InfraNetwork)|인프라 네트워크 (Network)]] — DNS, Load Balancer, Reverse Proxy
- [[tech/infrastructure-cloud/k8s/k8s|Kubernetes]] — workload와 Service, 설정과 storage, traffic 진입과 배포, 리소스 적정화
- [[tech/infrastructure-cloud/istio-ambient/istio-ambient|Istio Ambient (Service Mesh)]] — ztunnel, waypoint, HBONE, 업그레이드와 장애 대응

## AWS 체크리스트
- [x] [[AWS-Backup-Malware-Scanning|AWS Backup 악성코드 검사]] — 검사 상태와 결과, 증분 기준과 복원 검증
- [x] [[Bedrock-Private-Access|Bedrock 비공개 연결]] — API별 endpoint, DNS와 IAM 인가의 구분
- [x] [[ECS-GPU-Inference|ECS GPU 추론]] — GPU 배치, 분할 용량과 모델 준비 완료
- [x] [[RDS-Monitoring-Logs#Aurora Database Activity Streams와 CDC의 경계|Aurora 활동 감사와 CDC]] — 유실 가능성, SQL 민감 데이터와 동기화 계약의 구분
- [x] [[RDS-Aurora-Replica-Lag|Aurora Reader 지연 진단]] — 밀리초 단위, Writer 쓰기, Reader 용량과 purge 부담
- [x] [[Auto-Scaling#예정된 급증은 준비 완료 시각에서 역산한다|EC2 예정 트래픽 사전 확장]] — 예약과 동적 정책, 초기화 시간, 종료 후 용량 복구
- [x] [[Security-Hub-AI-Inventory|Security Hub AI Inventory]] — 발견 신호, Inspector/GuardDuty 전제와 미지원 범위
- [x] [[ROSA|ROSA 관리형 OpenShift]] — HCP와 Classic, 고객의 애플리케이션 운영과 복구 책임
- [x] [[QuickSight#상담 녹취의 분석 결과를 시각화한다|상담 녹취 분석과 BI]] — 전사, 분류와 집계의 경계, 원문 추적과 처리 누락 확인
- [x] [[Security-Hub-Exposure-Analysis|Security Hub 노출 분석]] — 외부 스캔, IAM 경로, Azure connector 수집 범위와 NO_DATA 확인
- [x] [[OpenSearch-Service-Security-Observability#높은 CPU와 자동 진단의 실행 경계|OpenSearch Service CPU 진단]] — hot threads와 검색 task, 진단 자원 생성과 정리
- [x] [[ACM#외부 인증서 가져오기와 재가져오기|ACM 외부 인증서 운영]] — PEM과 체인, 대상 서비스 호환성, ARN 유지 갱신과 WHOIS 검증 종료
- [x] [[Amazon-Braket|Amazon Braket]] — 시뮬레이션과 QPU 실측, 고전 기준선과 변환 비용
- [x] [[EC2-Operations#Amazon Linux 패치와 저장소 버전|Amazon Linux 패치 운영]] — 저장소 버전, 종료 코드, 보안 선택 갱신과 재시작
- [x] [[ECS-Express-Mode|ECS Express Mode]] — 자동 구성, 기본 최소 태스크 수, ALB 공유와 변경 제한
- [x] [[GuardDuty-Investigation|GuardDuty 경보 조사]] — Preview 전제, 조사 범위, 위험과 신뢰도, 권고 조치 검토
- [x] [[Athena-MCP-Text-to-SQL|Athena MCP 자연어 분석]] — 실행과 결과 열람, 도구 플래그와 실제 AWS 권한
- [x] [[RDS-MySQL-Storage-Reclamation|RDS MySQL 공간 회수]] — 테이블스페이스, binlog와 로그, 할당 용량과의 구분
- [x] [[GameLift-Servers|GameLift Servers]] — 세션 배치와 Spot 중단 경계
- [x] [[GameLift-Streams|GameLift Streams]] — WebRTC와 위치별 용량, 공유 URL의 사용 횟수와 재접속 제한
- [x] [[Athena#CloudTrail 로그의 파티션과 호출 주체 추적|Athena로 CloudTrail 조사]] — 날짜 파티션과 사건 시각, 역할 세션 연결, 미수집과 실행 실패의 구분
- [x] [[Route53#삭제한 S3 버킷을 가리키는 DNS|S3 버킷 삭제와 DNS 정리]] — 남은 Alias의 이름 재사용 위험, CloudFront 전환과 OAC origin 구분
- [x] [[ElastiCache-Engine-Deployment#엔진 업그레이드와 클라이언트 복구|ElastiCache 엔진 업그레이드]] — node-based 교체 절차, 연결 복구와 제한된 rollback
- [x] [[MemoryDB-Durable-Write-Behind|MemoryDB 내구성 쓰기 버퍼]] — 응답과 DB 반영의 구분, 소비자 복구와 정리 시점
- [x] [[Cloud-WAN-Migration|Cloud WAN 마이그레이션]] — attachment 태그, 정책 change set과 단계별 통신 검증
- [x] [[Glue#Glue 6.0 전환의 호환성 경계|Glue 6.0 전환]] — 런타임 호환성, Iceberg v3의 비가역성과 Athena 조회 제한
- [x] [[Amazon-Quick-Flows-and-Knowledge|Amazon Quick의 자동화와 개인 지식 그래프]] — 예약 action 권한, 변경된 flow 실행과 원문 근거
- [x] [[SageMaker-Catalog-Discovery|SageMaker Catalog의 탐색과 분석]] — 메타데이터 검토, 계보 보기, 품질 결과, 구독 철회와 실제 권한 회수, SQL 생성
- [x] [[EKS-Windows|EKS Windows 노드]] — Linux 시스템 Pod, OS 스케줄링, 단일 ENI와 prefix IP 용량
- [x] [[DocumentDB-TTL-Operations|DocumentDB TTL 운영]] — 비동기 삭제, 만료 데이터의 사용 제한과 부하 검증
- [x] [[MemoryDB-Multi-Region|MemoryDB Multi-Region]] — 비동기 복제, 자료형별 LWW와 동시 카운터의 한계
- [x] [[Glue#수집 로그를 분석 테이블로 만드는 경계|수집 로그와 분석 테이블]] — 부분 실패와 재시도, 스키마 누락과 중첩 구조 변환
- [x] [[AWS-Control-Tower|Control Tower 거버넌스]] — 계정 표준화, 통제별 적용 범위와 공동 책임
- [x] [[IoT-Edge-Cloud-Pipeline|IoT 엣지와 클라우드 파이프라인]] — 수집과 추론 분리, 메시지 순서와 중복, 현장 제어의 검증 경계
- [x] [[End-User-Messaging-Two-Way-SMS|양방향 SMS 수신 진단]] — 목적지별 권한, FIFO 제한과 암호화 topic
- [x] [[Elemental-Inference|영상 인코딩과 AI 분석]] — feed와 기능별 output, 자막 지원 언어와 최종 출력 검수
- [x] [[DMS#자동 변환율과 업무 동작 검증은 별개다|DB 마이그레이션 검증 경계]] — 생성형 AI 적용 범위, 객체 변환, 행 비교와 애플리케이션 회귀 검증
- [x] [[DMS#엔드포인트 연결과 TLS 검증|DMS endpoint 연결]] — 복제 인스턴스 기준 연결 검사, TLS 모드와 엔진별 지원 차이
- [x] [[HealthOmics-Workflows|HealthOmics 워크플로 운영]] — 실행 정의, 상태 이벤트 누락 대비, 로그와 자원 조정
- [x] [[Athena#SageMaker Unified Studio와 Power BI의 ODBC 연결|Athena ODBC와 Power BI]] — 대화형 로그인, 게이트웨이 IAM 역할과 연결 매핑
- [x] [[DynamoDB#스로틀링과 재시도|DynamoDB 스로틀링 진단]] — reason과 resource ARN, GSI back pressure, 파티션과 quota, Auto Scaling 지연
- [x] [[S3-Tables-Maintenance|S3 Tables 유지보수]] — table bucket, 스냅샷 만료와 파일 삭제, Iceberg 설정 충돌과 운영 책임
- [x] [[Glue#Data Quality: 검사와 적재 차단을 나눈다|Glue Data Quality]] — 규칙별 검사 범위, 기본 실패 동작과 적재 차단, 행과 데이터셋 결과의 구분
- [x] [[Redshift#Iceberg와 Delta Lake 조회의 운영 차이|Redshift의 레이크 테이블 조회]] — Iceberg 메타데이터와 Delta Lake manifest, 일관성 범위와 파일 정리
- [x] [[QuickSight#계정 간 템플릿으로 대시보드 재사용|QuickSight 계정 간 템플릿 공유]] — 데이터셋 placeholder와 스키마, 공유 권한과 대시보드 생성 완료 확인
- [x] [[RDS-Stop-Start-Scheduling|RDS 중지와 재시작 예약]] — 7일 한도와 유지보수 완료 확인, 중지 후 남는 비용
- [x] [[ECS-Service-AutoScaling#예정된 이벤트의 사전 확장과 복구|ECS 이벤트 사전 확장]] — 예약 min/max, 동적 축소 제어, 준비 확인과 원래 설정 복구
- [x] [[S3-Scale-Design-Lessons|S3 대규모 설계 교훈]] — 워크로드 집계와 데이터 배치의 구분, 부하 평탄화의 조건, 내구성 위협과 대응책 검토, 추가 shard를 이용한 점진 배포
- [x] [[Amazon-Connect-Conversation-Continuity|Amazon Connect 대화 연속성과 채팅 복원]] — persistent chat, contact 연결, 토큰 보호와 인계 검토
- [x] [[RDS-PostgreSQL-Performance-Triage|RDS와 Aurora PostgreSQL 성능 진단]] — 자원과 세션 연결, idle 상태 구분, 누적 SQL 통계의 차분, 유지보수와 실행 계획, QPM의 수집과 적용
- [x] [[Storage-Gateway-DataSync|DataSync 클라우드 간 전송]] — 파티션 간 S3의 Object storage location, Azure Blob의 SAS와 태그, agent 조건과 검증 범위
- [x] [[ElastiCache-Use-Cases#8. Semantic Cache (Gen AI)|시맨틱 캐시]] — 정확 일치 캐시와의 차이, 임계값, 문맥과 권한, 무효화와 총비용
- [x] [[IAM|AWS IAM (엔티티, 정책 평가, AssumeRole과 Federation, Roles Anywhere와 Account access manager, 모범 사례)]]
- [x] [[AWS-Builder-ID-Recovery|AWS Builder ID 복구 이메일]] — 등록 절차, MFA 복구에 필요한 두 메일함과 계정 유형 구분
- [x] [[SQS|SQS]] / [[SNS|SNS]] / [[EventBridge|EventBridge]] — Queue, Pub/Sub, Event Bus의 선택 기준과 운영
- [x] [[CloudWatch|CloudWatch (Metrics, Logs, Alarms, Insights, 운영과 비용)]]
- [x] [[EBS#EBS vs Instance Store (요약)|EBS vs Instance Store (영속성, 성능, 스냅샷, 적용 워크로드)]]

## Network 체크리스트
- [x] [[VPC-NAT-Security#NACL 응답 포트와 적용 범위|SG와 NACL 운영]] — 기본값 구분, 연결 추적, 응답의 임시 포트와 서브넷 경계
- [x] [[Direct-Connect-SiteLink|Direct Connect SiteLink]] — 거점 간 연결, prefix controls, 터널과 MTU, 암호화와 비용 경계
- [x] [[Cloudflare-HTML-Cache|Cloudflare HTML 캐시]] — 공개 HTML의 캐시 조건, 로그인 제외와 CF-Cache-Status 진단
- [x] [[DNS#UDP와 TCP의 선택|DNS 전송 방식]] — EDNS의 크기 협상, TCP 연결 재사용과 암호화 DNS의 QUIC 경로
- [x] [[DNS#JVM 이름 해석 캐시는 별도로 확인한다|JVM DNS 캐시]] — DNS TTL과 런타임 캐시, Security Manager 조건과 보안 속성
- [x] [[VPC-Subnet-CIDR#서브넷 유형 — 라우팅이 성격을 결정|Public, Private, Isolated Subnet]] / [[VPC-NAT-Security#NAT Gateway vs NAT Instance|NAT Gateway와 NAT Instance]]

## Kubernetes
- [x] [[Container-Memory-Metrics|컨테이너 메모리 지표 해석 (cgroup 계정 범위, RSS와 page cache, working set, 고원 vs 우상향, 실측)]]

### 기초와 운영 체크리스트
- [x] [[K8s-Core-Workloads-and-Service-Architecture|Control plane과 node component]]
- [x] [[K8s-Core-Workloads-and-Service|Pod / Deployment / Service]] / [[K8s-Traffic-Entry-Helm-and-GitOps|Ingress와 Gateway API]]
- [x] [[K8s-HPA-VPA|HPA / VPA]] — 기존 보강: [[EKS#오토스케일링 — 3축|HPA와 VPA 개요]]
- [x] [[K8s-Configuration-Storage-and-Probes|ConfigMap / Secret]] — 보안 심화: [[Secret-Management#두 가지 누출 지점|K8s Secret 위협 모델]]
- [x] [[K8s-Resource-Right-Sizing|Resource request / limit (스케줄링, CPU 경합, throttling, OOM, 실측 기준과 PromQL, 컴포넌트별 적용)]]
- [x] [[K8s-Configuration-Storage-and-Probes|Startup / Liveness / Readiness probe]] — mesh 심화: [[Istio-Ambient-Partially-Enrolled-Pod|Kubernetes Ready와 mesh 준비의 차이]]
- [x] [[K8s-PDB|PodDisruptionBudget]]
- [x] [[K8s-NetworkPolicy|NetworkPolicy (방향별 격리, selector 조합, default deny와 DNS egress, CNI 집행 구성과 kube-proxy 대체의 구분)]]
- [x] [[EKS#Cluster Autoscaler vs Karpenter|Node autoscaling (Cluster Autoscaler와 Karpenter)]]

## 현장사례
- [[Kakao-Ent-Seminar#백엔드인프라전체그림|카카오엔터 백엔드 인프라 전체 그림]] — 네트워크~모니터링 계층별 구성
- [[SSG-Ecommerce-Seminar#인프라&배포|SSG 인프라&배포]] — Docker+K8s 온프레미스, Bamboo CI/CD
- [[Fintech-Seminar#망분리|금융 망분리]] — 법적 망분리 의무, eCams CI/CD
- [[TS-Backend-Meetup-1#로그 적재 비용 개선기|로그 적재 아키텍처]] — FluentBit 사이드카, Firehose, S3 적재
- [[TS-Backend-Meetup-3#MSA (아임웹 사례)|아임웹 MSA 인프라]] — 모노레포, 테라폼 모듈, ArgoCD, Kong Gateway
- [[TS-Backend-Meetup-2#세션 1: AWSome IaC|AWSome IaC]] — IaC 필요성, 명령형 vs 명세형, 테라폼 핵심 개념
