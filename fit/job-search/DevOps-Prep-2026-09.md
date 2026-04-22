---
tags: [career, job-search, devops, prep]
status: active
category: "이직 준비"
aliases: ["DevOps Prep 2026-09", "하반기 지원 준비", "DevOps 하이브리드 준비"]
---

# DevOps 하반기 지원 준비 로드맵 (2026-05 ~ 2026-08)

## 목표

**2026-09-01 하반기 재진입** 시점까지 백엔드 + DevOps 하이브리드 포지셔닝 완성.

- 스코프: SAA → CloudOps → Terraform(ECS Fargate 실배포) → K8s(minikube + EKS 샌드박스) → Redis 심화 + 블로그 공개 6-7편 (내부 목표 10편)
- **배포 아키텍처 분리**: 주일학교 플랫폼 실운영 = ECS Fargate (규모·비용 적정), K8s/EKS = 학습 전용 샌드박스
- 방향: **전환 아닌 보강** — 백엔드 경력 레버리지 유지하면서 인프라 역량 덧대기
- 실험장: 주일학교 플랫폼 (실운영 아키텍처 경험 축적)
- 장기 경로: SAA + CloudOps Associate → **DevOps Engineer Professional** (실무 1-2년 축적 후, 2027-2028 도전)

## 판단 근거

- 지원한 공고 다수가 인프라 역량 요구: 카닥(ECS/EKS/Terraform), 어스얼라이언스(ECS Fargate/Terraform), 밀당PT(K8s), 원프레딕트(K8s/ArgoCD)
- 주니어 DevOps 전환 포지션은 소수 → 전환 리스크 큼. 하이브리드가 ROI 최고
- **SAA → CloudOps 연속 취득 선택**:
  - SAA는 한국 채용시장 인지도 공식값 (비기술 HR 필터·기본값 시그널)
  - CloudOps는 DevOps 증빙·Terraform/K8s 시너지·희소성 차별화
  - 시험 범위 중첩 실측 60-65% → 실질 학습 부담 **1.7-1.8배** 수준, 순차 2관왕 현실적
  - SAA 효용 핵심 시점은 **이번 파이프라인 실패 후 다음 라운드 대비** (현 활성 12곳은 이미 HR 필터 통과 중 → SAA 한계효용 작음, "당장 티켓"보다 "재진입 레버리지" 프레임)
- **Kafka 드롭**: 현 파이프라인 JD 매칭률 낮고(밀당PT 한 곳) 1개월로 수박 겉핥기. EventBridge·SQS 경력으로 메시징 감각은 이미 증명됨. 필요해지면 실무에서 집중 투입
- 현 파이프라인 결과 확정 예상: 2026-06 말 ~ 07 초. 5-6월은 면접 대응 최우선

## 월별 로드맵

### 2026-05: AWS SAA (+ CloudOps 워밍업)

**타겟**: 2026-05 4주차 SAA 응시

- 주 1: SAA 공식 가이드 + 5 Pillars 훑기 + 인프런 입문으로 기초 복원, 모의고사 1회 샘플링
- 주 2: 도메인별 심화 (Resilient/High-Performing/Secure/Cost-Optimized) + 모의고사 2회
- 주 3: 시험 함정 구간 집중 (RDS Multi-AZ vs Read Replica / Gateway vs Interface Endpoint 과금 / Storage Class 선택 등) + 모의고사 3-4회 / 동시에 CloudOps 고유 영역 워밍업 (Systems Manager·Config·CloudTrail) 30분/일
- 주 4: **SAA 응시** + CloudOps 본격 전환 (Monitoring·Systems Manager 심화)
- 서브: 현 파이프라인 면접 대응 (연락 오면 즉시 최우선)
- 아웃풋: 블로그 1-2편 (SAA 설계 결정 프레임 / VPC 엔드포인트 과금 정리)
- **쌍 학습 원칙**: SAA "왜 이 서비스인가(설계)" ↔ CloudOps "고장 나면 어떻게 아는가(지표)" 짝지어 흡수. 예: ELB 가용영역 분산 ↔ SurgeQueueLength

### 2026-06: CloudOps 응시 + Terraform

- 주 1: CloudOps 최종 점검 (Performance-Based Lab 시나리오·인프런 중상급 복습)
- 주 2: **CloudOps 응시** → 시험 직후 **3-4일 완전 휴식 (번아웃 버퍼, 타협 금지)**
- 주 3: Terraform 기본 (Provider·Resource·State·Module·data source) + 주일학교 플랫폼 IaC 시작 (VPC·RDS·S3)
- 주 4: 모듈화·원격 state (S3 backend + DynamoDB lock) + **ECS Fargate로 주일학교 플랫폼 실배포** + GitHub Actions 연동 (plan 리뷰 → apply)
- 병행: 시스템 디자인 (주 2회 2시간)
- 아웃풋: 블로그 1-2편 (CloudOps 합격 회고·운영 관찰성 / Terraform state·module 재사용 패턴)
- **집중 포인트**: 리소스 나열 말고 **재사용 가능한 module 설계 + state 분리 전략** (시니어 기준점). ECS Fargate는 **규모 적정성 판단** 논리까지 블로그로 정리

### 2026-07: Kubernetes (학습 샌드박스, 실운영 전환 없음)

- 주 1: k8s 개념 (Pod/Deployment/Service/Ingress/ConfigMap/Secret/StatefulSet)
- 주 2: **minikube/kind 심화** — 샘플 앱 배포, 매니페스트 직접 작성, kubectl 익숙해지기
- 주 3: **EKS 샌드박스 구축** — Terraform으로 최소 구성(VPC·IAM Role·**IRSA**·노드그룹 1-2개·애드온). 실습 후 `terraform destroy`로 즉시 정리 (비용 통제)
- 주 4: Helm 기본 + **CloudWatch Container Insights + Amazon Managed Prometheus** (자체 Prometheus/Grafana 구축은 컷 — CloudOps에서 배운 CloudWatch를 k8s로 이식)
- 병행: 백엔드 코어 복습 (Node.js 이벤트 루프·스트림·비동기 패턴)
- 아웃풋: 블로그 1-2편 (**ECS Fargate vs EKS 선택 논거** / IRSA·IAM 권한 설계)
- **비용 통제 원칙**: EKS 샌드박스는 **실습 시간만 운영**. 실습 종료 즉시 destroy. 잊고 방치 시 월 $100+ 각오
- **막힐 때 컷 우선순위**: 관측성 → Helm → EKS 샌드박스 (뒤에서부터 보호, EKS 학습이 최우선)

### 2026-08: Redis + 재진입 준비 (병행)

- 주 1: Redis 캐시 패턴 (Cache-aside·Write-through, TTL 전략, **Cache Stampede 방어** — lock / probabilistic early expiration), 세션 저장소 실적용 + **이력서/STAR 스토리 초안 갱신 시작**
- 주 2: Redis 분산 패턴 (Redlock·경계 조건, Pub/Sub·Streams, Rate Limit Token Bucket) + 주일학교 플랫폼 실적용 + 포트폴리오 DevOps 섹션 1차 완성
- 주 3: 면접 탄약 갱신 (5-7월 학습 반영·"AWS 권장 vs 비용 절충" 답변 세트) + **모의 면접 2-3세션**
- 주 4: 시스템 디자인 연습 집중 + 공고 크롤링·지원 셋업 (8/31까지 완료)
- 아웃풋: 블로그 1-2편 (Cache Stampede 방어 / Redlock 경계와 대안)
- **이전 구직 실패 패턴 대응**: "문제 정의 없이 코드 진입 / 너무 솔직한 답변" 재발 방지 — STAR 구조화 + 면접 답변 프레임 사전 스크립트화

## 주간 시간 배분 (기준)

- **DevOps 메인 학습**: 주 10-12시간 (평일 저녁 1-2h + 주말 4-6h)
- **백엔드 코어/CS/시스템 디자인**: 주 3-4시간 (유지, 7월부터 면접 대비 강화)
- **블로그 아웃풋**: 월 1-2편 (공개 커밋)
- **주일학교 플랫폼 개발**: 주 5-8시간 (실험장 겸용, 별도 집계)
- **면접 대응**: 공고 진행 시 최우선

## 아웃풋 체크리스트

### 자격증·인프라
- [ ] AWS SAA 합격 (~2026-05-24)
- [ ] AWS CloudOps Associate 합격 (~2026-06-14)
- [ ] 주일학교 플랫폼 Terraform IaC 전환 + ECS Fargate 실배포 (~2026-06-30)
- [ ] EKS 샌드박스 구축·실습·destroy 사이클 1회 이상 (IRSA·Helm 포함) (~2026-07-31)
- [ ] Redis 캐시·분산락·Rate Limit 주일학교 플랫폼 실적용 (~2026-08-14)

### 블로그 (내부 목표 10편 / 공개 커밋 6-7편)

**핵심 5편 (무조건 사수)**
- [ ] Terraform state·module 재사용 패턴 (6월)
- [ ] ECS Fargate 배포기 + 규모 적정성 판단 (6월 말 / 7월)
- [ ] IRSA·IAM 권한 설계 (ECS Task Role vs EKS IRSA 비교) (7월)
- [ ] Cache Stampede 방어 (8월)
- [ ] Redlock 경계와 대안 (8월)

**보너스 (여유 생기면)**
- [ ] SAA 합격 회고 / VPC 엔드포인트 과금 정리 (5월)
- [ ] CloudOps 합격 회고·운영 관찰성 (6월)
- [ ] Helm 기본 패턴 / CloudWatch Container Insights (7월)
- [ ] minikube vs kind vs EKS 학습 경험기 (7월)

### 재진입 준비
- [ ] 이력서/포트폴리오 DevOps 섹션 갱신 (~2026-08-14)
- [ ] 모의 면접 3세션 이상 (~2026-08-21)
- [ ] 하반기 지원 셋업 완료 (~2026-08-31)

## 변수 대응

- **5월 중 면접 풀림**: 해당 회사 준비 최우선. SAA 속성 유지, CloudOps 보류 → 옵션 A(SAA 단독)로 축소
- **SAA 5월 말 응시 어려움 판단 시점**: 6월 1주로 밀고 CloudOps 6월 3주차 응시로 연쇄
- **Terraform 일정 타이트**: 7월 1주차까지 연장, K8s 주 단위 축소 (관측성 컷 우선)
- **7월 k8s 막힘**: 관측성 스택 먼저 컷 → Helm 간소화 → EKS 샌드박스 보호 (학습 우선순위)
- **8월 면접 풀림**: 재진입 우선, Redis 분산 패턴 축소·블로그 포기 가능
- **동기부여 높고 여유**: K8s 4주차에 CKA 기초 진입 (Kafka는 여전히 드롭 유지)
- **긴급 이직 니즈 발생**: 로드맵 중단, 7월부터 바로 지원 재개

## 비용 예산

- 시험 응시료: SAA $150 + CloudOps $150 = **$300**
- AWS 상시 운영 (주일학교 ECS Fargate + RDS + ElastiCache): **월 $30-60**
- EKS 샌드박스 실습 (7월만, 시간 단위 운영·즉시 destroy): **월 $20-40**
- Skill Builder Subscription (선택): $29/월 (Performance-Based Lab 접근 시 가치 큼)
- 총 예상: 4개월 **$500-800** 범위. EKS 실습 후 `terraform destroy` 즉시 정리 습관

## 원칙 (CLAUDE.md 학습 원칙 반영)

- **아웃풋 우선**: 강의 시청 < 블로그 작성 < 실제 구축 경험. 퇴근 후는 아웃풋 트랙
- **짜투리 시간**: 근무 중 틈은 인프런 강의 훑기·복습용
- **숫자로 숙련도 판단 금지**: `status: done` 카운트 말고 "면접·블로그에서 말·글로 튀어나오나?" 테스트로
- **쌍 학습**: SAA(설계) ↔ CloudOps(운영) 관점을 짝지어 흡수. 주일학교 플랫폼에 즉시 실적용
- **자격증-실무 괴리 대비**: "AWS 권장은 A지만 비용/상황 때문에 B로 절충" 답변 세트 상시 준비
- **번아웃 버퍼**: 6월 2주 시험 직후 3-4일 완전 휴식 고정. 타협 금지
- **블로그 슬립 전제**: 공개 커밋은 6-7편 라인. 핵심 5편만 사수하면 성공

## 학습 자료

### 월별 메인 플로우

- **AWS SAA + CloudOps (5-6월)**
  - [인프런 "AWS 입문자를 위한 강의"](https://www.inflearn.com/course/aws-%EC%9E%85%EB%AC%B8) (Sungmin Kim, 8h 26m) — 짜투리 기초
  - [인프런 "AWS 중/상급자를 위한 강의"](https://www.inflearn.com/course/aws-%EC%A4%91%EC%83%81%EA%B8%89%EC%9E%90) (Sungmin Kim, 8h 48m) — 짜투리 심화
- **Terraform (6월 후반)** — _(진행하며 추가)_
- **Kubernetes (7월)** — _(진행하며 추가)_
- **Redis (8월)** — _(진행하며 추가)_

### AWS 공식 자료

**자격증**

- [SAA 자격증](https://aws.amazon.com/certification/certified-solutions-architect-associate/) · [SAA 시험 가이드 (SAA-C03)](https://d1.awsstatic.com/training-and-certification/docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Exam-Guide.pdf)
- [CloudOps 자격증](https://aws.amazon.com/certification/certified-cloudops-engineer-associate/) · [CloudOps 시험 가이드 (SOA-C03)](https://docs.aws.amazon.com/aws-certification/latest/sysops-administrator-associate-03/sysops-administrator-associate-03.html)
- [Skill Builder Exam Prep](https://skillbuilder.aws/category/exam-prep/cloudops-engineer-associate) · [DevOps Engineer Pro](https://aws.amazon.com/certification/certified-devops-engineer-professional/) (장기 목표)

**실습 플랫폼**

- [AWS Skill Builder](https://skillbuilder.aws/) · [AWS Workshops](https://workshops.aws/) · [Well-Architected Labs](https://wellarchitectedlabs.com/)

**서비스 문서 (핵심)**

- Monitoring·Logging·Remediation: [CloudWatch](https://docs.aws.amazon.com/cloudwatch/) · [CloudTrail](https://docs.aws.amazon.com/cloudtrail/) · [Config](https://docs.aws.amazon.com/config/) · [EventBridge](https://docs.aws.amazon.com/eventbridge/) · [Systems Manager](https://docs.aws.amazon.com/systems-manager/)
- Reliability·BCP: [Auto Scaling](https://docs.aws.amazon.com/autoscaling/) · [ELB](https://docs.aws.amazon.com/elasticloadbalancing/) · [Route 53](https://docs.aws.amazon.com/route53/) · [AWS Backup](https://docs.aws.amazon.com/aws-backup/)
- Networking: [VPC](https://docs.aws.amazon.com/vpc/) · [Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/) · [CloudFront](https://docs.aws.amazon.com/cloudfront/)
- Security: [IAM](https://docs.aws.amazon.com/iam/) · [KMS](https://docs.aws.amazon.com/kms/) · [Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- Deployment·IaC: [CloudFormation](https://docs.aws.amazon.com/cloudformation/) · [CodePipeline](https://docs.aws.amazon.com/codepipeline/) · [CodeDeploy](https://docs.aws.amazon.com/codedeploy/)
- 아키텍처: [Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/) · [Architecture Center](https://aws.amazon.com/architecture/) · [DevOps on AWS](https://aws.amazon.com/devops/)

## 장기 경로 (2027 이후)

**AWS Certified DevOps Engineer - Professional (DOP-C02)**

- SAA + CloudOps + Developer Associate 통합 심화판. 두 Associate 갖추면 베이스 완성
- AWS 공식 권장: Associate 2개 + 실무 2년 → Pro 도전
- 2026 이직 성공 후 하이브리드 실무 1-2년 축적 → 2027-2028 도전 타이밍 적정
- **지금 4개월로 무리 도전 금지**. SAA+CloudOps로 기초 다지고 실무 경험이 Pro 합격·실효성 둘 다 끌어올림

## 연관 문서

- [[Job-Search-Tracker]] — 지원 트래킹
- [[Running-A-Tech-Blog]] — 블로그 운영 원칙
- [[Self-Development-While-Working]] — 근무 중 자기계발 전략
