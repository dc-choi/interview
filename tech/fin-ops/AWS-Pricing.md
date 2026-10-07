---
tags: [finops, aws, pricing, billing, cost-model]
status: done
verified_at: 2026-08-25
category: "비용&운영(FinOps)"
aliases: ["AWS Pricing", "AWS pricing 구조", "AWS 요금 구조", "AWS 과금 모델"]
---

# AWS 요금 구조 (AWS Pricing)

비용 최적화는 **요금이 어떤 차원으로 매겨지는지**를 아는 데서 시작한다. 서비스마다 과금 차원이 다르고, 같은 서비스도 컴퓨트/스토리지/요청/전송이 따로 청구된다. 차원을 모르면 어디서 새는지 못 짚는다. [[AWS-Cost-Optimization]]

## 큰 원칙

- **On-Demand 종량제(pay-as-you-go)**: 선결제 없이 쓴 만큼 낸다. Reserved Instances와 Savings Plans는 사용량 약정으로 단가를 낮출 수 있다. [[Reserved-Instance]]
- **규모의 경제**: 쓸수록 단가 구간이 내려가는 서비스(S3 등)도 있음.
- **리전별 단가 차이**: 같은 서비스도 리전마다 가격이 다르다.
- **Free Tier**: 2025-07-15 이후 만든 신규 계정은 Free 또는 Paid account plan을 고른다. Free plan은 계정 생성 뒤 최대 6개월 또는 크레딧 소진까지이며, Always Free 서비스에는 월별 무료 한도가 있다. 그 이전 계정에는 서비스별 레거시 조건이 남아 있을 수 있으므로 계정과 서비스 문서를 확인한다. 실험용 혜택일 뿐 프로덕션 비용 기준으로 쓰지 않는다.

## 서비스별 과금 차원

| 서비스 | 주요 과금 차원 |
|---|---|
| **EC2** | 인스턴스 타입 × 가동 시간 + EBS + 데이터 전송 |
| **Lambda** | 요청 수 + (메모리 × 실행 시간 GB-초). [[AWS-Lambda]] |
| **S3** | 저장 GB-월 + 요청 수(PUT/GET) + 전송 + 클래스별 차등. [[S3]] |
| **RDS/Aurora** | 인스턴스 시간 + 스토리지 + IOPS + 백업 + 전송. [[RDS-Aurora]] |
| **데이터 전송** | egress, cross-AZ, cross-region, NAT 처리량. [[Egress-Cost]] |
| **CloudWatch** | 수집 GB + 저장 + 커스텀 메트릭 수 + API 호출 |

핵심: **인스턴스/컴퓨트만 보지 말 것**. 스토리지, 요청 수, 데이터 전송, 매니지드 부가 차원이 청구서의 큰 부분을 차지하는 경우가 많다.

## 단가를 낮추는 레버

- **약정**: Reserved Instances와 Savings Plans로 단가를 낮춘다. 할인 폭은 서비스, 기간, 결제 옵션에 따라 다르다. [[Reserved-Instance]]
- **Spot**: 중단을 감내할 수 있는 워크로드에서 단가를 낮춘다. 중단 가능성과 재시작 설계를 함께 검토한다.
- **티어링**: 접근 빈도에 맞는 스토리지 클래스. [[Storage-Tiering]]
- **아키텍처**: 전송 줄이기(VPC Endpoint, CDN), right-sizing. [[Egress-Cost]], [[Resource-Right-Sizing]]

## 비용 추정 도구

- **AWS Pricing Calculator**: 설계 단계에서 워크로드 가정으로 견적.
- **Cost Explorer**: 실제 청구를 서비스/태그별로 분해. [[Budget-Alert]]
- 둘을 비교해 가정과 실제의 괴리를 좁힌다.

## 계정 폐쇄 뒤에도 남는 청구

2026-10-08 공식 계정 관리와 CloudTrail 문서 확인 기준이다. 계정 폐쇄, 종량 사용 중단과 약정 종료는 서로 다른 사건이다.

- **이미 사용한 금액:** 폐쇄 전 사용료는 다음 달에 청구될 수 있다. 청구서 도착일만 보고 폐쇄 후 새 사용이 발생했다고 판단하지 않는다.
- **Reserved Instances와 Savings Plans:** 계정을 닫아도 만료 전 약정 청구는 남는다. 폐쇄를 약정 취소 수단으로 계산하지 않는다.
- **AWS Marketplace:** 계정 폐쇄만으로 구독이 자동 취소되지 않는다. 해당 소프트웨어 인스턴스를 종료하고 Marketplace에서 구독 취소를 별도로 확인한다.
- **CloudTrail trail:** 계정 폐쇄 뒤에도 trail이 남을 수 있다. 다른 계정의 S3 버킷으로 전송하던 trail은 전달이 가능한 동안 이벤트를 계속 보낼 수 있다. 종료 전 보존 요구와 전달 대상을 확인해 삭제 여부를 정하고, 이미 닫았다면 AWS Support에 삭제를 요청할 수 있다. 이 동작을 CloudTrail Lake 등 모든 관련 리소스에 일반화하지 않는다.

운영 점검은 Bills에서 **서비스, 리전, 사용 기간과 약정**을 분리해 대조하는 순서로 한다. 폐쇄 후 90일 동안은 과거 청구 조회와 미납 요금 납부가 가능하지만, 이를 서비스 사용 권한이나 납부 유예 기간으로 해석하지 않는다.

## 흔한 함정

- 인스턴스 단가만 비교하고 전송/스토리지/요청을 빼먹음
- Free Tier 기준으로 프로덕션 비용을 과소 추정
- 리전 단가 차이를 무시
- 매니지드 서비스의 부가 과금 차원(IOPS, ACU, 커스텀 메트릭)을 못 봄
- 약정/Spot 같은 레버를 안 쓰고 전부 On-Demand

## 면접 체크포인트

- 종량제 + 약정 할인의 기본 구조
- 서비스별 과금 차원이 컴퓨트만이 아니라는 점(스토리지/요청/전송)
- Lambda/S3/RDS의 과금 차원 분해
- 단가를 낮추는 레버(약정/Spot/티어링/아키텍처)
- Pricing Calculator vs Cost Explorer의 역할

## 출처

- [AWS, Close an AWS account](https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-closing.html)
- [AWS, AWS account closure and trails](https://docs.aws.amazon.com/en_en/awscloudtrail/latest/userguide/cloudtrail-account-closure.html)
- [Why did I receive a bill after I closed my AWS account? — AWS re:Post](https://repost.aws/knowledge-center/closed-account-bill)
- [AWS, How AWS Pricing Works](https://docs.aws.amazon.com/whitepapers/latest/how-aws-pricing-works/how-aws-pricing-works.html)
- [AWS, Explore AWS services with AWS Free Tier](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html)
- [AWS, AWS Free Tier FAQs](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-FAQ.html)
- [AWS, Track your Free Tier usage for Amazon EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html)
- [AWS Pricing Calculator](https://calculator.aws/)

## 관련 문서

- [[AWS-Cost-Optimization|AWS 비용 최적화 플레이북]]
- [[Reserved-Instance|Reserved Instance / Savings Plans]]
- [[Storage-Tiering|스토리지 티어링]]
- [[Egress-Cost|데이터 전송 비용]]
- [[Resource-Right-Sizing|리소스 적정화]]
- [[Cloud-Service-Models|IaaS/PaaS/FaaS 비용 모델]]
