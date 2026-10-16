---
tags: [aws, infrastructure, fundamentals, region, az, cloud]
status: done
verified_at: 2026-09-30
category: "Infrastructure - AWS"
aliases: ["AWS Fundamentals", "AWS 기본 용어", "Region", "Availability Zone", "AZ", "Edge Location"]
---

# AWS Fundamentals — 기본 용어

**Region, AZ, Edge Location**은 AWS 인프라의 위치와 장애 경계를 이해하는 주요 개념이다. 서비스마다 배포 범위가 다르므로 세 개념을 모든 서비스가 순서대로 거치는 단일 계층으로 해석하지 않는다.

## 사용량 기반 비용 모델

- 대부분의 AWS 서비스는 장기 계약 없이 사용한 리소스와 시간, 요청, 저장량, 전송량 등에 따라 과금하는 pay-as-you-go 모델이다. 서버를 직접 사는 초기 자본비용을 줄일 수 있지만, 리소스를 만들고 잊어도 스토리지, 공인 IPv4, 스냅샷 같은 비용은 남을 수 있다.
- Savings Plans, Reserved Instances처럼 사용량을 약정해 단가를 낮추는 선택도 있다. 사용량 기반이라는 말이 항상 최저 비용이라는 뜻은 아니다.
- Free Tier는 모든 사용이 무료라는 뜻이 아니다. 가입 시점, 계정 플랜, 서비스, 지역별 혜택과 한도를 넘으면 표준 요금이 적용될 수 있으므로 Billing, Budgets, Cost Explorer와 알람을 처음부터 설정한다.

## Region

AWS가 여러 AZ를 운영하는 **물리적 지리 영역**이다. Region과 AZ는 같은 단위가 아니며, AZ 하나도 데이터센터 건물 하나와 반드시 일치하지 않는다.

- 전 세계 주요 대도시 단위로 분포 (서울 `ap-northeast-2`, 도쿄 `ap-northeast-1`, 버지니아 `us-east-1` 등)
- 각 Region은 **다수의 AZ로 구성**되며, 개수와 계정에서 사용 가능한 AZ는 공식 목록과 계정 조회로 확인한다
- Region 단위로 **별도의 클라우드망**을 구성할 수 있고, 서비스/리소스는 기본적으로 Region에 종속
- Region 간 데이터 전송은 별도 비용이 부과되며 지연 시간이 상대적으로 큼
- 일부 서비스는 **글로벌**(IAM, Route 53, CloudFront)이고, 대부분은 **리저널** (EC2, S3, RDS 등)

선택 기준: 개발자가 아니라 주 사용자의 지리적 위치(사용자와 서버가 멀수록 왕복 지연이 커짐), 데이터 주권 / 규정 준수, 서비스 가용 여부, 비용 차이.

### 리소스가 사라진 것처럼 보이면 Region부터 확인

콘솔과 CLI는 선택한 Region의 리소스만 조회하고 만든다. 서울에 만든 EC2 인스턴스는 콘솔 상단 Region을 미국 동부로 바꾸면 목록에서 보이지 않다가 서울로 돌아오면 다시 보인다. 삭제를 의심하기 전에 Region 선택부터 확인한다.

- 같은 증상은 security group, key pair, Elastic IP, AMI, ECR repository처럼 Region에 속한 리소스 전반에서 난다. IAM, Route 53, CloudFront 같은 글로벌 서비스는 예외다
- AWS CLI는 `--region` 옵션, `AWS_REGION`, `AWS_DEFAULT_REGION` 환경 변수, profile의 `region` 설정(`aws configure`로 저장) 순으로 대상 Region을 정한다. 콘솔과 CLI의 Region이 다르면 같은 혼란이 생기므로 스크립트와 IaC에는 Region을 명시한다
- 여러 Region에 흩어진 리소스는 읽기 전용인 AWS Global View(EC2 Global View)의 전역 검색으로 한 번에 찾는다

## Availability Zone (AZ)

**가용 영역**. Region 안에서 하나 이상의 별도 데이터센터로 구성되는 인프라 단위다. 데이터센터는 이중화된 전력, 네트워크와 연결 설비를 갖춘다.

- AZ 개수는 Region마다 다르며, 용량 제약 때문에 계정별로 사용 가능한 AZ가 다를 수도 있다
- 여러 AZ를 활용하면 단일 데이터센터 의존을 줄일 수 있다. 물리적 분리만으로 애플리케이션의 무중단이나 모든 장애의 격리가 보장되지는 않는다
- AZ 간은 저지연 전용 회선으로 연결 → 동기 복제 수준의 다중 AZ 아키텍처 가능
- **VPC의 서브넷 1개 = AZ 1개**에 묶임 (서브넷은 단일 AZ에 종속)
- EBS 볼륨도 단일 AZ에 종속 — 다른 AZ EC2에는 직접 부착 불가

다중 AZ 패턴: RDS Multi-AZ, ELB의 Cross-AZ Load Balancing, ASG의 다중 AZ 분산이 가용성 확보의 표준.

## On-Premise

클라우드가 아닌 **자체 보유 전산실, IDC** 인프라. AWS와의 대비 용어로 자주 사용.

- 하이브리드 구성 시 AWS와 On-Premise를 **VPN / Direct Connect**로 연결
- AWS Outposts는 고객 현장에 AWS 인프라를 배치하고, Wavelength는 통신 사업자 네트워크의 엣지에 배치한다. 두 서비스를 같은 온프레미스 배치로 취급하지 않는다.

### 하이브리드 배치 위치와 운영 책임

부분 검증(2026-10-14): AWS Outposts, Local Zones와 Wavelength 공식 문서 및 Outposts racks FAQ를 대조했다. 기존 문서 전체의 검증일은 유지한다.

| 배치 방식 | 위치와 연결 경계 |
|---|---|
| Local Zones | 인구와 산업이 밀집한 지역 가까이에 일부 AWS 자원을 배치한다. 세부 네트워크와 지원 범위는 [[AWS-Local-Zones]]에서 확인한다. |
| Wavelength | 통신 사업자 네트워크 엣지의 Zone에 배치하며, 연결된 Region의 제어 평면으로 관리한다. |
| Outposts | 고객 현장의 컴퓨트와 스토리지 자원을 Region/AZ의 확장으로 운영한다. rack과 server의 서비스 지원 범위는 다르다. |

Outposts rack의 **service link**는 Region과 관리 및 VPC 트래픽을 교환하는 암호화된 VPN 연결이다. 현장 네트워크 연결은 **local gateway**가 담당한다. 현장 배치만으로 Region 의존성이 사라지지는 않는다.

Outposts racks는 지속적인 연결을 전제로 한다. 연결이 끊겨도 기존 EC2와 연결된 EBS는 로컬 접근을 계속할 수 있지만 인스턴스 생성, 시작, 중지와 종료 같은 제어 작업은 제한된다. 단절 중 EBS 하드웨어 장애가 발생하면 복제 중복성을 복구하지 못할 수 있으므로 독립 운영이나 내구성 보장으로 해석하지 않는다. 고객은 현장의 물리 보안, 출입 통제, 전력과 네트워크 환경을 책임진다.

설계 검증 제안: 애플리케이션의 로컬 처리, Region API 호출, 로그 전송과 백업 경로를 나누어 연결 단절과 복구를 시험한다. 데이터의 현장 저장만으로 모든 관리 정보까지 현장을 떠나지 않는다고 가정하지 않는다. 실제 단절 시험은 수행하지 않았다.

## Edge Location

**CloudFront(CDN)가 사용하는 캐시 서버 거점**. Region, AZ보다 훨씬 많은 수가 전 세계에 분포.

- 요청을 잘 처리할 수 있는 POP로 라우팅하며, 보통 지연 시간 기준으로 가까운 위치를 선택한다
- POP에 객체가 없으면 일반적으로 Regional Edge Cache를 조회하고, 거기에도 없으면 Origin에서 가져온다. 모든 POP가 서로의 캐시를 직접 동기화한다는 뜻은 아니다
- CloudFront뿐 아니라 **Route 53, AWS Global Accelerator, Shield, WAF**도 Edge 인프라를 활용
- 동적 요청과 `PUT`, `POST`, `PATCH`, `OPTIONS`, `DELETE`는 Regional Edge Cache를 거치지 않고 Origin으로 간다. S3 Origin과 최적 Regional Edge Cache의 Region이 같을 때도 이 중간 캐시를 건너뛴다

## 탄력성(Elasticity) vs 확장성(Scalability)

용어를 혼동하기 쉬우나 AWS 맥락에서는 명확히 구분된다.

| 구분 | Elasticity (탄력성) | Scalability (확장성) |
|------|--------------------|---------------------|
| 시점 | **단기 / 즉각적** | **장기 / 아키텍처적** |
| 방향 | 수요에 따라 Scale out, in 또는 up, down하고 불필요한 자원을 반납 | Scale out, in과 Scale up, down 모두 가능 |
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

- **AWS가 책임**: 서비스를 구동하는 하드웨어, 네트워크, 기반 소프트웨어와 시설 보호
- **사용자가 책임**: 선택한 서비스에 맞는 데이터, 접근 권한과 보안 설정. EC2에서는 게스트 OS 패치, 설치한 앱과 보안 그룹도 관리한다. S3 같은 추상화된 서비스까지 게스트 OS 패치 책임을 일반화하지 않는다

기본 용어 이해는 곧 책임 경계 이해. Region, AZ는 AWS가 운영하지만, 그 위에 어떤 가용성, 보안 설계를 얹을지는 사용자 몫.

## 시험 체크포인트 (SAA-C03)

- Region과 AZ의 차이 — Region은 여러 AZ를 포함하고, AZ는 하나 이상의 데이터센터로 구성된다
- AZ 개수와 계정에서 사용 가능한 AZ는 별도로 확인한다
- VPC 서브넷은 **단일 AZ에 종속** (Multi-AZ를 위해 서브넷도 AZ별로 생성)
- Edge Location은 **CloudFront 캐시 서버** — Region 수보다 훨씬 많음
- **Elasticity** vs **Scalability** 정의 구분 — Elasticity는 필요할 때 자원을 확보하고 불필요해지면 반납하는 능력이며 수평, 수직 확장을 모두 포함한다. Scalability도 늘어난 수요를 수평 또는 수직으로 감당하는 성질이다
- 일부 서비스는 글로벌(IAM, Route 53, CloudFront), 대부분은 리저널
- 다중 AZ 설계는 가용성(HA) 패턴의 출발점 — RDS Multi-AZ, ELB Cross-AZ

## 출처

- [AWS Outposts, What is AWS Outposts?](https://docs.aws.amazon.com/outposts/latest/userguide/what-is-outposts.html)
- [AWS Outposts, Connectivity through service link](https://docs.aws.amazon.com/outposts/latest/userguide/service-links.html)
- [AWS, AWS Outposts racks FAQs](https://aws.amazon.com/outposts/rack/faqs/)
- [AWS Wavelength, What is AWS Wavelength?](https://docs.aws.amazon.com/wavelength/latest/developerguide/what-is-wavelength.html)
- [AWS Local Zones, What is AWS Local Zones?](https://docs.aws.amazon.com/local-zones/latest/ug/what-is-aws-local-zones.html)

2026-10-13 부분 대조: Region/AZ의 정의와 사용 가능 범위, CloudFront 캐시 경로의 예외, 서비스별 보안 책임을 확인했다. 기존 비용, CLI와 확장성 설명 전체를 재검증한 것은 아니므로 문서 전체의 기존 검증일은 유지한다.

- [AWS, Global infrastructure](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/global-infrastructure.html)
- [AWS, AWS Availability Zones](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-availability-zones.html)
- [Amazon CloudFront, How CloudFront delivers content](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HowCloudFrontWorks.html)
- [AWS, Shared Responsibility Model](https://aws.amazon.com/compliance/shared-responsibility-model/)
- [AWS 글로벌 인프라](https://aws.amazon.com/about-aws/global-infrastructure/)
- [AWS Pricing](https://aws.amazon.com/pricing/)
- [AWS Free Tier](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html)
- [AWS Well-Architected, Elasticity](https://wa.aws.amazon.com/wellarchitected/2020-07-02T19-33-23/wat.concept.elasticity.en.html)
- [Amazon EC2 User Guide, Manage your Amazon EC2 resources](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/resources.html)
- [Amazon EC2 User Guide, Elastic IP addresses](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html)
- [Amazon EC2 User Guide, View resources across Regions using AWS Global View](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/global-view.html)
- [AWS CLI User Guide, Configuring environment variables](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html)
- [Sungmin Kim 강사 — AWS 입문과 클라우드 비용 모델](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=43720)
- [JSCODE 박재성 강사 — EC2 셋팅하기, 리전 선택](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227955)
- [JSCODE 박재성 강사 — EC2 셋팅하기, 스토리지 구성](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227958)

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
