---
tags: [aws, infrastructure, fundamentals, region, az, cloud]
status: done
category: "Infrastructure - AWS"
aliases: ["AWS Fundamentals", "AWS 기본 용어", "Region", "Availability Zone", "AZ", "Edge Location"]
---

# AWS Fundamentals — 기본 용어

AWS 모든 서비스의 기반이 되는 인프라 개념. **Region, AZ, Edge Location**의 3 계층 위에 모든 AWS 서비스가 배치되며, 가용성, 지연 시간, 비용, 규정 준수의 설계가 이 계층 위에서 결정된다.

## Region

AWS가 운영하는 **IDC(데이터센터) 집합 단위**. 거의 모든 클라우드 서비스가 Region을 단위로 탑재된다.

- 전 세계 주요 대도시 단위로 분포 (서울 `ap-northeast-2`, 도쿄 `ap-northeast-1`, 버지니아 `us-east-1` 등)
- 각 Region은 **다수의 AZ로 구성** (보통 3~4개)
- Region 단위로 **별도의 클라우드망**을 구성할 수 있고, 서비스/리소스는 기본적으로 Region에 종속
- Region 간 데이터 전송은 별도 비용이 부과되며 지연 시간이 상대적으로 큼
- 일부 서비스는 **글로벌**(IAM, Route 53, CloudFront)이고, 대부분은 **리저널** (EC2, S3, RDS 등)

선택 기준: 사용자 지리적 위치, 데이터 주권 / 규정 준수, 서비스 가용 여부, 비용 차이.

## Availability Zone (AZ)

**가용 영역**. Region 내부의 **물리적으로 분리된 데이터센터**로, 실체가 있는 IDC의 역할.

- 보통 Region당 **3~4개의 AZ**가 존재
- AZ는 서로 수십 km 이내로 가깝되, 전력, 네트워크, 냉각이 **독립**되어 있어 한 AZ 장애가 다른 AZ로 전파되지 않음
- AZ 간은 저지연 전용 회선으로 연결 → 동기 복제 수준의 다중 AZ 아키텍처 가능
- **VPC의 서브넷 1개 = AZ 1개**에 묶임 (서브넷은 단일 AZ에 종속)
- EBS 볼륨도 단일 AZ에 종속 — 다른 AZ EC2에는 직접 부착 불가

다중 AZ 패턴: RDS Multi-AZ, ELB의 Cross-AZ Load Balancing, ASG의 다중 AZ 분산이 가용성 확보의 표준.

## On-Premise

클라우드가 아닌 **자체 보유 전산실, IDC** 인프라. AWS와의 대비 용어로 자주 사용.

- 하이브리드 구성 시 AWS와 On-Premise를 **VPN / Direct Connect**로 연결
- AWS Outposts, Wavelength 등은 On-Premise, 엣지 영역에 AWS 서비스 일부를 확장한 형태

## Edge Location

**CloudFront(CDN)가 사용하는 캐시 서버 거점**. Region, AZ보다 훨씬 많은 수가 전 세계에 분포.

- 사용자에 가장 가까운 Edge에서 콘텐츠를 캐시, 서빙 → 지연 시간 최소화
- Edge Location끼리 **데이터를 공유**하며 동작
- CloudFront뿐 아니라 **Route 53, AWS Global Accelerator, Shield, WAF**도 Edge 인프라를 활용
- Edge 캐시 미스 시 **Regional Edge Cache → Origin** 순으로 폴백

## 탄력성(Elasticity) vs 확장성(Scalability)

용어를 혼동하기 쉬우나 AWS 맥락에서는 명확히 구분된다.

| 구분 | Elasticity (탄력성) | Scalability (확장성) |
|------|--------------------|---------------------|
| 시점 | **단기 / 즉각적** | **장기 / 아키텍처적** |
| 방향 | Scale **out**, in (수평) | Scale **up**, down (수직) 또는 아키텍처적 수평 확장 |
| 트리거 | 갑작스러운 수요 변동 | 예측 가능한 성장 |
| 대표 서비스 | Auto Scaling, Lambda 동시성 | 인스턴스 패밀리 변경, DB Read Replica 추가 |
| 비유 | "필요할 때 늘렸다가 줄임" | "감당할 수 있는 그릇을 키움" |

실무에서는 둘을 결합 — 베이스라인은 Scalability(예: r6i 패밀리 선택)로 잡고, 변동은 Elasticity(ASG, Spot Fleet)로 흡수.

## Scale Out, In vs Scale Up, Down

| 방식 | 의미 | 예 |
|------|------|----|
| **Scale Out** | 인스턴스 수를 늘림 (수평 확장) | ASG로 EC2 1대 → 10대 |
| **Scale In** | 인스턴스 수를 줄임 | 트래픽 감소 시 10대 → 1대 |
| **Scale Up** | 인스턴스 사이즈를 키움 (수직 확장) | `t3.medium` → `t3.xlarge` |
| **Scale Down** | 인스턴스 사이즈를 줄임 | `r5.4xlarge` → `r5.large` |

Out/In은 **stateless 워크로드**에 적합 (웹, API). Up/Down은 **DB, 캐시처럼 분산이 어려운 워크로드**에 사용. RDS, ElastiCache는 인스턴스 클래스 변경으로 Scale Up.

## AWS의 책임 공유 모델 (참고)

- **AWS가 책임**: Region, AZ, 하이퍼바이저, 물리 보안 — "Of the Cloud"
- **사용자가 책임**: 데이터 암호화, IAM, SG, OS 패치, 앱 보안 — "In the Cloud"

기본 용어 이해는 곧 책임 경계 이해. Region, AZ는 AWS가 운영하지만, 그 위에 어떤 가용성, 보안 설계를 얹을지는 사용자 몫.

## 시험 체크포인트 (SAA-C03)

- Region과 AZ의 차이 — Region은 IDC 집합, AZ는 개별 IDC
- 보통 Region은 **3~4개 AZ**로 구성된다
- VPC 서브넷은 **단일 AZ에 종속** (Multi-AZ를 위해 서브넷도 AZ별로 생성)
- Edge Location은 **CloudFront 캐시 서버** — Region 수보다 훨씬 많음
- **Elasticity(Scale Out)** vs **Scalability(Scale Up)** 정의 구분
- 일부 서비스는 글로벌(IAM, Route 53, CloudFront), 대부분은 리저널
- 다중 AZ 설계는 가용성(HA) 패턴의 출발점 — RDS Multi-AZ, ELB Cross-AZ

## 출처

- [AWS 글로벌 인프라](https://aws.amazon.com/about-aws/global-infrastructure/)

## 관련 문서

- [[EC2|EC2, Elastic Compute Cloud]]
- [[VPC|VPC, Subnet, CIDR]]
- [[S3|S3, Object Storage]]
- [[IAM|IAM, 권한 관리]]
- [[EBS|EBS, Elastic Block Store]]
- [[RDS-Aurora|RDS, Aurora]]
- [[ECS|ECS, 컨테이너 오케스트레이션]]
- [[AWS-Lambda|AWS Lambda, 서버리스 FaaS]]
- [[ElastiCache|ElastiCache, Redis/Memcached]]
- [[Load-Balancer|Load Balancer (ALB, NLB)]]
