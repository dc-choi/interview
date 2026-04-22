---
tags: [career, job-search, devops, prep]
status: active
category: "이직 준비"
aliases: ["DevOps Prep 2026-09", "하반기 지원 준비", "DevOps 하이브리드 준비"]
---

# DevOps 하반기 지원 준비 로드맵 (2026-05 ~ 2026-08)

## 목표

**2026-09-01 하반기 재진입** 시점까지 백엔드 + DevOps 하이브리드 포지셔닝 완성.

- 스코프: 중간 (AWS CloudOps Associate + Terraform IaC + K8s(minikube→EKS) + 블로그 10편)
- 방향: **전환 아닌 보강** — 백엔드 경력 레버리지 유지하면서 인프라 역량 덧대기
- 실험장: 주일학교 플랫폼 (실운영 아키텍처 경험 축적)
- 장기 경로: CloudOps Associate → **DevOps Engineer Professional** (실무 1-2년 축적 후, 2027-2028 도전)

## 판단 근거

- 지원한 공고 다수가 인프라 역량 요구: 카닥(ECS/EKS/Terraform), 어스얼라이언스(ECS Fargate/Terraform), 밀당PT(K8s/Kafka), 원프레딕트(K8s/ArgoCD)
- 주니어 DevOps 전환 포지션은 소수 → 전환 리스크 큼. 하이브리드가 ROI 최고
- **SAA 대신 CloudOps 선택 이유**:
  - 현재 약점이 DevOps 영역 증빙 (백엔드 경력은 이미 있음)
  - CloudOps 범위(Monitoring·자동화·운영·Systems Manager)가 DevOps 하이브리드 메시지와 직결
  - 6-7월 Terraform·K8s 로드맵과 시너지 최대 (CloudWatch·SSM·Auto Scaling 사고방식 선행)
  - 희소성 (백엔드+CloudOps 조합이 SAA보다 적어 서류 차별화)
- 현 파이프라인 결과 확정 예상: 2026-06 말 ~ 07 초. 이후 7-8월 두 달 집중 준비 + 5-6월은 면접 대응 우선

## 월별 로드맵

### 2026-05: AWS CloudOps Associate 자격증

**타겟**: 2026-06 1주차 응시 (SOA-C03, 라이브 랩 대비 시간 +1주 확보)

- 주 1: IAM·EC2·VPC·S3 기초 (인프런 입문 훑기 1-2h/일) + CloudOps 공식 시험 가이드 읽고 6개 도메인 확정
- 주 2: **Monitoring 스택 집중** — CloudWatch·CloudTrail·Config·EventBridge·Systems Manager (공식 문서 + AWS Exam Readiness)
- 주 3: VPC 심화(NACL/SG/Transit Gateway) + Auto Scaling 정책 + 백업/DR(AWS Backup·Snapshot) + **Performance-Based Lab 실습 집중**
- 주 4: 인프런 중/상급자의 CloudFormation·Beanstalk·Advanced IAM 보강 + AWS 공식 샘플 문제
- 2026-06 1주차: 최종 점검·응시
- 서브: 현 파이프라인 면접 대응 (연락 오면 즉시 최우선)
- 아웃풋: CloudOps 주제 블로그 3편 (CloudWatch 알람 설계·SSM 자동화·IAM 최소권한 모델)

### 2026-06: Terraform + IaC

- 주 1: Terraform 기본 (Provider·Resource·State·Module) + CloudOps 응시 (1주차)
- 주 2: 주일학교 플랫폼 IaC 전환 시작 (VPC·EC2·RDS·S3)
- 주 3: 모듈화·워크스페이스·원격 state (S3 backend + DynamoDB lock)
- 주 4: CI/CD 연동 (GitHub Actions → Terraform apply, plan 리뷰 플로우)
- 병행: 시스템 디자인 (주 2회 2시간)
- 아웃풋: Terraform 실전 블로그 3편 (IaC 전환기 시리즈)

### 2026-07: Kubernetes

- 주 1: k8s 개념 (Pod/Deployment/Service/Ingress/ConfigMap/Secret)
- 주 2: minikube 실전 (주일학교 플랫폼 로컬 배포)
- 주 3: EKS 전환 (Terraform으로 EKS 클러스터 구축·배포)
- 주 4: Helm + 모니터링 (Prometheus/Grafana, 로깅 파이프라인 → CloudOps에서 배운 CloudWatch와 연결)
- 병행: 백엔드 코어 복습 (Node.js 이벤트 루프·스트림·비동기 패턴)
- 아웃풋: k8s 실전 블로그 3편 (minikube→EKS 전환기)

### 2026-08: Kafka/Redis + 재진입 준비

- 주 1: Kafka 기본 + 주일학교 플랫폼 이벤트 설계 (알림·로그 이벤트 파이프라인)
- 주 2: Redis 캐시·세션·Rate Limit 실전
- 주 3: 면접 탄약 갱신 (5-8월 학습 내용 반영), 이력서/포트폴리오 DevOps 섹션 추가
- 주 4: 공고 크롤링·지원 준비 (8/31까지 지원 셋업 완료)
- 아웃풋: 블로그 1편 (Kafka·Redis 통합 아키텍처)

## 주간 시간 배분 (기준)

- **DevOps 메인 학습**: 주 10-12시간 (평일 저녁 1-2h + 주말 4-6h)
- **백엔드 코어/CS/시스템 디자인**: 주 3-4시간 (유지 학습)
- **블로그 아웃풋**: 주 1편 최소
- **주일학교 플랫폼 개발**: 주 5-8시간 (실험장 겸용, 별도 집계)
- **면접 대응**: 공고 진행 시 최우선

## 아웃풋 체크리스트

- [ ] AWS CloudOps Associate 합격 (~2026-06-07)
- [ ] 주일학교 플랫폼 Terraform IaC 전환 완료 (~2026-06-30)
- [ ] 주일학교 플랫폼 EKS 배포 완료 (~2026-07-31)
- [ ] DevOps 블로그 10편 이상 발행 (~2026-08-31)
- [ ] 이력서/포트폴리오 DevOps 섹션 갱신 (~2026-08-31)
- [ ] 하반기 지원 셋업 완료 (~2026-08-31)

## 변수 대응

- **현 파이프라인 면접 풀림**: 해당 회사 준비 최우선, 학습 일정 후순위 조정
- **6월 말까지 최종 합격 없음**: 로드맵대로 진행
- **CloudOps 5월 말 합격 어려워 보임**: 6월 1-2주차로 응시 미루고, Terraform을 6월 2주차부터 시작
- **동기부여 높고 여유 있음**: 풀 스코프로 전환 검토 (CKA 자격증 + Kafka 심화)
- **속도 뒤처짐**: 최소 스코프로 축소 (CloudOps + Terraform + 블로그 5편, K8s 보류)
- **긴급 이직 니즈 발생**: 로드맵 중단, 7월부터 바로 지원 재개 (여름 공고 적어도 경쟁도 낮음)

## 원칙 (CLAUDE.md 학습 원칙 반영)

- **아웃풋 우선**: 강의 시청 < 블로그 작성 < 실제 구축 경험. 퇴근 후는 아웃풋 트랙
- **짜투리 시간**: 근무 중 틈은 인프런 강의 훑기·복습용
- **숫자로 숙련도 판단 금지**: `status: done` 카운트 말고 "면접·블로그에서 말·글로 튀어나오나?" 테스트로
- **주일학교 플랫폼 활용**: 학습 주제를 실제 구축에 적용해 포트폴리오 스토리로 전환 (CloudWatch 알람·SSM 런북·Terraform IaC·EKS 배포 전부 플랫폼에 실적용)

## 학습 자료

### 월별 메인 플로우

**AWS CloudOps Associate (5월)**

- **인프런 "AWS 입문자를 위한 강의"** (Sungmin Kim, 8h 26m) — 짜투리 시간 기초. IAM·EC2·VPC·S3·RDS·Lambda·CloudWatch·API Gateway·DynamoDB·CI/CD 기본
  - https://www.inflearn.com/course/aws-%EC%9E%85%EB%AC%B8
- **인프런 "AWS 중/상급자를 위한 강의"** (Sungmin Kim, 8h 48m) — 짜투리 시간 심화. Advanced IAM·KMS·CloudFormation·Beanstalk·ECS
  - https://www.inflearn.com/course/aws-%EC%A4%91%EC%83%81%EA%B8%89%EC%9E%90

- **Terraform (6월)** — _(진행하며 추가)_
- **Kubernetes (7월)** — _(진행하며 추가)_
- **Kafka/Redis (8월)** — _(진행하며 추가)_

### AWS 공식 자료 (전체 기간 참조)

#### 자격증

- [CloudOps Engineer Associate 자격증 페이지](https://aws.amazon.com/certification/certified-cloudops-engineer-associate/)
- [시험 가이드 (SOA-C03, HTML)](https://docs.aws.amazon.com/aws-certification/latest/sysops-administrator-associate-03/sysops-administrator-associate-03.html)
- [4-Step Exam Prep Plan (Skill Builder)](https://skillbuilder.aws/category/exam-prep/cloudops-engineer-associate)
- [AWS Certification Paths PDF](https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/certification/approved/pdfs/AWS_certification_paths.pdf)
- [AWS Certification 메인](https://aws.amazon.com/certification/)
- [DevOps Engineer Pro 자격증](https://aws.amazon.com/certification/certified-devops-engineer-professional/) — 장기 목표 (2027-2028)

#### 실습 플랫폼

- [AWS Skill Builder](https://skillbuilder.aws/) — Exam Readiness·Performance-Based Lab·Practice Exam 허브
- [AWS Workshops](https://workshops.aws/) — 공식 무료 실습 (Systems Manager·CloudWatch·Networking·Container 워크샵 다수)
- [AWS Well-Architected Labs](https://wellarchitectedlabs.com/) — Reliability·Security·Cost 실전 예제

#### 서비스 문서 — Monitoring·Logging·Remediation

- [CloudWatch](https://docs.aws.amazon.com/cloudwatch/)
- [CloudTrail](https://docs.aws.amazon.com/cloudtrail/)
- [AWS Config](https://docs.aws.amazon.com/config/)
- [EventBridge](https://docs.aws.amazon.com/eventbridge/)
- [Systems Manager](https://docs.aws.amazon.com/systems-manager/) — CloudOps 에이스 서비스

#### 서비스 문서 — Reliability·Business Continuity

- [Auto Scaling](https://docs.aws.amazon.com/autoscaling/)
- [Elastic Load Balancing](https://docs.aws.amazon.com/elasticloadbalancing/)
- [Route 53](https://docs.aws.amazon.com/route53/)
- [AWS Backup](https://docs.aws.amazon.com/aws-backup/)

#### 서비스 문서 — Networking & Content Delivery

- [VPC](https://docs.aws.amazon.com/vpc/)
- [Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/)
- [CloudFront](https://docs.aws.amazon.com/cloudfront/)
- [Direct Connect](https://docs.aws.amazon.com/directconnect/)

#### 서비스 문서 — Security & Compliance

- [IAM](https://docs.aws.amazon.com/iam/)
- [KMS](https://docs.aws.amazon.com/kms/)
- [Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [GuardDuty](https://docs.aws.amazon.com/guardduty/)

#### 서비스 문서 — Deployment·Provisioning·Automation

- [CloudFormation](https://docs.aws.amazon.com/cloudformation/)
- [Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/)
- [CodePipeline](https://docs.aws.amazon.com/codepipeline/)
- [CodeDeploy](https://docs.aws.amazon.com/codedeploy/)

#### 아키텍처·모범 사례

- [Well-Architected Framework (5 Pillars)](https://aws.amazon.com/architecture/well-architected/)
- [AWS Architecture Center](https://aws.amazon.com/architecture/)
- [AWS Whitepapers](https://aws.amazon.com/whitepapers/)
- [DevOps on AWS (공식 허브)](https://aws.amazon.com/devops/)

### 블로그 레퍼런스

- _(좋은 한국어/영어 블로그 발견 시 추가)_

## 장기 경로 (2027 이후)

**AWS Certified DevOps Engineer - Professional (DOP-C02)**

- CloudOps Associate + Developer Associate 통합 심화판. CloudOps 탄탄히 갖추면 베이스 완성
- AWS 공식 권장: Associate 2개 + 실무 2년 → Pro 도전
- 2026 이직 성공 후 하이브리드 실무 1-2년 축적 → 2027-2028 도전 타이밍 적정
- **지금 4개월로 무리 도전 금지**. CloudOps로 기초 다지고 실무 경험이 Pro 합격·실효성 둘 다 끌어올림
- 공식 페이지: https://aws.amazon.com/certification/certified-devops-engineer-professional/

## 연관 문서

- [[Job-Search-Tracker]] — 지원 트래킹
- [[Running-A-Tech-Blog]] — 블로그 운영 원칙
- [[Self-Development-While-Working]] — 근무 중 자기계발 전략
