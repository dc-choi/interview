---
tags: [infrastructure, aws]
status: index
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["인프라&클라우드(Infrastructure&Cloud)", "Infrastructure & Cloud"]
---

# 인프라&클라우드(Infrastructure&Cloud)

## 목차

- [[GPU-Server-Infrastructure|GPU 서버 인프라]] — CPU와 GPU, 워프와 분기 발산, 메모리와 통신 경로, 전력과 냉각, 랙 설치 조건
- [[tech/infrastructure-cloud/foundation/클라우드기초(Foundation)|클라우드 기초 (Foundation)]] — IaaS/PaaS/FaaS, IaC, 클라우드 전환 전략, Cloudflare cf CLI와 Artifacts
- [[tech/infrastructure-cloud/container/컨테이너(Container)|컨테이너 (Container)]] — Docker, Compose, 컨테이너 내부 구조, 이미지 빌드와 베이스 이미지 선택
- [[tech/infrastructure-cloud/aws/AWS서비스(AWSServices)|AWS 서비스 (AWS)]] — EC2/ASG/ALB, Lambda, ALB 5XX와 NLB TCP 연결 진단
- [[tech/infrastructure-cloud/network/인프라네트워크(InfraNetwork)|인프라 네트워크 (Network)]] — DNS, Load Balancer, Reverse Proxy
- [[tech/infrastructure-cloud/k8s/k8s|Kubernetes]] — workload와 Service, 설정과 storage, traffic 진입과 배포, 리소스 적정화
- [[tech/infrastructure-cloud/istio-ambient/istio-ambient|Istio Ambient (Service Mesh)]] — ztunnel, waypoint, HBONE, 업그레이드와 장애 대응

## AWS 체크리스트
- [x] [[S3-Scale-Design-Lessons|S3 대규모 설계 교훈]] — 워크로드 집계와 데이터 배치의 구분, 부하 평탄화의 조건, 내구성 위협과 대응책 검토
- [x] [[Amazon-Connect-Conversation-Continuity|Amazon Connect 대화 연속성과 채팅 복원]] — persistent chat, contact 연결, 토큰 보호와 인계 검토
- [x] [[RDS-PostgreSQL-Performance-Triage|RDS와 Aurora PostgreSQL 성능 진단]] — 자원과 세션 연결, idle 상태 구분, 누적 SQL 통계의 차분, 유지보수와 실행 계획, QPM의 수집과 적용
- [x] [[Storage-Gateway-DataSync#DataSync Enhanced 모드와 파티션 간 S3 전송|DataSync 파티션 간 S3 전송]] — Object storage location, agent 조건과 검증 범위
- [x] [[ElastiCache-Use-Cases#8. Semantic Cache (Gen AI)|시맨틱 캐시]] — 정확 일치 캐시와의 차이, 임계값, 문맥과 권한, 무효화와 총비용
- [x] [[IAM|AWS IAM (엔티티, 정책 평가, AssumeRole과 Federation, 모범 사례)]]
- [x] [[AWS-Builder-ID-Recovery|AWS Builder ID 복구 이메일]] — 등록 절차, MFA 복구에 필요한 두 메일함과 계정 유형 구분
- [x] [[SQS|SQS]] / [[SNS|SNS]] / [[EventBridge|EventBridge]] — Queue, Pub/Sub, Event Bus의 선택 기준과 운영
- [x] [[CloudWatch|CloudWatch (Metrics, Logs, Alarms, Insights, 운영과 비용)]]
- [x] [[EBS#EBS vs Instance Store (요약)|EBS vs Instance Store (영속성, 성능, 스냅샷, 적용 워크로드)]]

## Network 체크리스트
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
- [x] [[K8s-NetworkPolicy|NetworkPolicy (방향별 격리, selector 조합, default deny와 DNS egress)]]
- [x] [[EKS#Cluster Autoscaler vs Karpenter|Node autoscaling (Cluster Autoscaler와 Karpenter)]]

## 현장사례
- [[Kakao-Ent-Seminar#백엔드인프라전체그림|카카오엔터 백엔드 인프라 전체 그림]] — 네트워크~모니터링 계층별 구성
- [[SSG-Ecommerce-Seminar#인프라&배포|SSG 인프라&배포]] — Docker+K8s 온프레미스, Bamboo CI/CD
- [[Fintech-Seminar#망분리|금융 망분리]] — 법적 망분리 의무, eCams CI/CD
- [[TS-Backend-Meetup-1#로그 적재 비용 개선기|로그 적재 아키텍처]] — FluentBit 사이드카, Firehose, S3 적재
- [[TS-Backend-Meetup-3#MSA (아임웹 사례)|아임웹 MSA 인프라]] — 모노레포, 테라폼 모듈, ArgoCD, Kong Gateway
- [[TS-Backend-Meetup-2#세션 1: AWSome IaC|AWSome IaC]] — IaC 필요성, 명령형 vs 명세형, 테라폼 핵심 개념
