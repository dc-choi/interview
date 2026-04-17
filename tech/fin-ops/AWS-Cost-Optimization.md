---
tags: [finops, aws, cost-optimization, spot, reserved-instance, savings-plan]
status: done
category: "비용&운영(FinOps)"
aliases: ["AWS 비용 최적화", "Cost Optimization", "FinOps Playbook"]
---

# AWS 비용 최적화 — 실전 플레이북

클라우드 비용은 **방치하면 선형 이상으로 증가**한다. 요금 구조를 이해하고 반복 가능한 최적화 루틴을 만드는 것이 FinOps의 핵심. 스타트업·중견 규모 조직에서 실제로 먹히는 기법을 영역별로 정리.

## Frugal Architect — 비용을 비기능 요구사항으로

Werner Vogels가 제시한 원칙: **"비용은 버그처럼 추적하고 해결해야 할 비기능 요구사항이다."**

- 기능 요구사항만 충족하고 끝나는 게 아니라, 실행 비용을 항상 함께 측정한다
- 새 기능이 비용을 크게 늘리면 설계·배포 단계에서 재검토
- 비용 절감은 **일회성 이벤트가 아니라 지속 루틴** — 정기 리뷰·대시보드·책임자 할당이 필수

## 비용 가시화 — 출발점

| 도구 | 용도 |
|---|---|
| **Cost Explorer** | 서비스별·태그별 비용 추이·예측 |
| **AWS Budgets** | 월 예산 초과 시 알림·Slack 연동 |
| **Cost Anomaly Detection** | ML 기반 비정상 비용 탐지 |
| **Cost Optimization Hub** | 전 서비스 절감 추천을 한 화면에 집계 (최대 75% 절감 추천) |
| **myApplications** | 앱 단위로 비용·성능·보안을 한 대시보드에서 |

### 태그 정책
- 모든 리소스에 `Environment`·`Service`·`Owner`·`CostCenter` 필수 태그
- 태그 없는 리소스는 `AWS Config` 룰로 감지·자동 차단
- 태그로 **리소스→비용→팀** 매핑이 가능해야 책임 소재가 명확해짐

## Top 10 전략 — 큰 덩어리부터

Divide & Conquer: 비용 상위 10개 서비스가 전체의 80~90%를 차지하는 경우가 대부분. **Top-N 타게팅**이 가장 ROI 높다.

1. **EC2 타입·사이즈 재검토** — CPU/메모리 사용률 < 20% 인스턴스 탐지
2. **RDS 인스턴스 다운사이징** — 트래픽 패턴 분석 후 축소 or Aurora Serverless 전환
3. **S3 스토리지 클래스 자동 전환** — Intelligent-Tiering·Glacier Instant Retrieval
4. **NAT Gateway 트래픽 축소** — VPC Endpoint로 우회 (아래)
5. **로그·모니터링 보존 기간** — CloudWatch Logs 무한 보존 → 30일 + S3 아카이브
6. **미사용 리소스 삭제** — 유휴 EBS·Elastic IP·오래된 AMI·Untagged ECR 이미지 (→ [[ECR-Cost-Reduction|ECR]])
7. **ELB 유휴화** — 트래픽 없는 ALB/NLB
8. **데이터 전송** — Cross-AZ·Egress 최소화
9. **Managed Service 재평가** — MediaConvert 같은 고가 서비스 → 자체 Batch/ECS+ffmpeg로 10~20배 절감 가능
10. **CDN 캐싱 강화** — Origin 트래픽 감소 → [[CDN|CloudFront 설정]]

## 컴퓨트 비용 — 인스턴스 구매 모델

| 모델 | 할인율 | 적합 워크로드 |
|---|---|---|
| **On-Demand** | 0% | 예측 불가 트래픽, 초기 실험 |
| **Spot Instance** | **70~90%** | 중단 감내 가능한 배치·CI/CD·학습 워커 |
| **Reserved Instance (1yr/3yr)** | 30~50% | 상시 구동 서버, 기저 부하 |
| **Savings Plans (Compute/EC2)** | 30~50% | 인스턴스 타입 바꿔도 적용되는 유연 할인 |
| **Graviton (ARM)** | ~20% + 성능 개선 | x86 호환 워크로드 대부분 |

### 실전 팁
- **CI/CD Jenkins·빌드 러너**: Spot으로 70~90% 절감
- **배치 잡**: Spot Fleet + 중단 대응 로직
- **상시 서비스**: 기저 부하는 RI/SP, 피크는 On-Demand로 혼합
- **Graviton 이전**: 대부분 언어 런타임(Java·Node.js·Python)은 무변경 이식 가능 → 성능↑·비용↓
- **MSP(Managed Service Provider) 활용**: RI/SP 최적 조합 추천·관리 위임

### 사례 — Jenkins on Spot (CI/CD 비용 4.5배 절감)

CircleCI·GitHub Actions 같은 SaaS에서 자체 Jenkins + Spot으로 이전한 구성 예.

**아키텍처**
- **Jenkins Controller**: 단일 On-Demand EC2. `JENKINS_HOME`을 **EFS**에 마운트 — 컨트롤러 재시작에도 설정·빌드 이력 유지
- **Build Agents**: **EC2 Auto Scaling Group + Spot**. Jenkins **EC2 Fleet Plugin**이 동적으로 Agent 프로비저닝
- **Network**: Private Subnet에 배치, ALB를 통한 접근은 VPN·GitHub IP로 제한

**Spot 중단 대응**
- **하이브리드 용량**: 기저 1~2대는 On-Demand, 나머지는 Spot
- **Price-capacity optimized** 할당 전략 + **Capacity Rebalancing** 활성화 → 중단 확률 최소화
- **EC2 Fleet Plugin**: Spot 중단 시 해당 Agent의 잡을 **자동으로 다른 Agent에서 재시작**

**빌드 성능 유지**
- **Idle Timeout 15~30분**: 바로 종료하지 말고 짧은 간격 연속 빌드에서 의존성 캐시 재사용
- **최소 대기 용량**: 신규 빌드 즉시 시작 가능
- **Docker Layer Caching**: 이미지 빌드 가속
- **Private IP 라우팅**: NAT 경유 없이 내부 트래픽으로 비용·지연 절감

이런 구성으로 **CI/CD 파이프라인 비용이 최대 4.5배 절감**된 사례가 보고됨. Agent가 100% Spot이어도 운영 안정성 유지 가능.

## 서버리스 · Managed Service 주의

**항상 싼 게 아니다.** 트래픽이 충분히 크면 일반 인스턴스가 더 쌀 수 있다.

- **Aurora Serverless v2**: ACU(Aurora Capacity Unit)당 과금. 유휴도 최소 0.5 ACU ≠ 0원. 상시 부하에서는 Provisioned가 유리할 수 있음
- **Fargate**: EC2 자체 관리 부담을 없애주지만, CPU·메모리 단가는 EC2보다 높음
- **Lambda**: 요청당 과금이 장점이지만 초당 수천 요청 상시 처리에는 EC2가 저렴할 수 있음

**실제 워크로드 패턴**으로 계산기 돌린 후 선택. Inflab 사례처럼 MediaConvert를 자체 솔루션으로 교체해 **15~20배 절감**한 케이스도 있음.

## 데이터 전송 — 숨은 요금 폭탄

- **Cross-AZ 트래픽**: GB당 $0.01~0.02
- **Cross-Region 트래픽**: GB당 $0.02~0.09
- **Egress to Internet**: 지역에 따라 GB당 $0.08~0.12
- **NAT Gateway**: 데이터 처리당 GB $0.045 + 시간당 $0.045

### 감축 전략
- **VPC Endpoint 사용** — S3·DynamoDB는 **Gateway Endpoint 무료**. 그 외 AWS 서비스는 **Interface Endpoint**(시간당 요금 + GB당 요금, 그래도 NAT보다 쌈)
- **내부 통신은 Private IP** — 같은 VPC 안에서 Public DNS로 접근하면 불필요한 NAT 경유
- **CDN 전진 배치** — Origin 전송을 Edge가 흡수 (→ [[CDN|CloudFront]])
- **S3 → CloudFront 전송 무료** — 같은 AWS 생태계 유지 시 트래픽 요금 절감

## 조직·문화 — 기술만으로는 안 됨

Inflab 사례가 **연 $300K 절감**을 이룬 핵심은 조직 운영.

- **비용 대시보드 상시 공개** — Cost Explorer 스냅샷을 Slack·Notion에 정기 배포
- **절감 성과 인정** — "이번 달 -$5K" 같은 수치를 공개 축하
- **책임자 지정** — 팀별·서비스별 비용 오너
- **정기 리뷰** — 월 1회 Top 10 비용 재검토·액션 아이템 도출
- **MSP 파트너** — 추천·감사·RI 거래소 활용

## 면접 체크포인트

- **Frugal Architect** 원칙과 "비용을 비기능 요구사항으로" 의미
- **Spot vs RI vs SP** 선택 기준과 대표 워크로드
- **VPC Endpoint·내부 Private IP 통신**으로 NAT 비용 줄이는 방법
- **Aurora Serverless·Fargate·Lambda가 항상 저렴하지 않은** 이유와 판별 기준
- **태그 정책 → 비용 가시화 → Top-N 공략**의 프로세스
- 조직 관점에서 FinOps를 **지속 가능하게** 운영하는 방법

## 출처
- [The Frugal Architect — AWS re:Invent 2023 / kakao pay 정리](https://tech.kakaopay.com/post/2023-aws-reinvent-2/)
- [Inflab — 스타트업 AWS 비용 최적화 (연 $300K 절감)](https://tech.inflab.com/20240227-finops-for-startup/)
- [AWS Blog — 인프랩의 EC2 Spot 기반 Jenkins CI/CD 구축 사례](https://aws.amazon.com/ko/blogs/tech/inflab-ec2-spot-instance/)

## 관련 문서
- [[ECR-Cost-Reduction|ECR Lifecycle Policy로 저장 비용 절감]]
- [[CDN|CDN (CloudFront 캐시 전략)]]
- [[RDS-Aurora|RDS·Aurora 선택 기준]]
- [[AWS-Lambda|AWS Lambda 비용 구조]]
- [[Cloud-Service-Models|IaaS/PaaS/FaaS 비용 모델]]
