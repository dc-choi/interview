---
tags: [finops, aws, pricing, billing, cost-model]
status: done
category: "비용&운영(FinOps)"
aliases: ["AWS Pricing", "AWS pricing 구조", "AWS 요금 구조", "AWS 과금 모델"]
---

# AWS 요금 구조 (AWS Pricing)

비용 최적화는 **요금이 어떤 차원으로 매겨지는지**를 아는 데서 시작한다. 서비스마다 과금 차원이 다르고, 같은 서비스도 컴퓨트/스토리지/요청/전송이 따로 청구된다. 차원을 모르면 어디서 새는지 못 짚는다. [[AWS-Cost-Optimization]]

## 큰 원칙

- **종량제(pay-as-you-go)**: 쓴 만큼 낸다. 약정으로 단가를 깎는다(RI/SP). [[Reserved-Instance]]
- **선결제 없음 + 규모의 경제**: 쓸수록 단가 구간이 내려가는 서비스(S3 등)도 있음.
- **리전별 단가 차이**: 같은 서비스도 리전마다 가격이 다르다.
- **Free Tier**: 12개월 무료, 상시 무료, 트라이얼 3종 — 실험엔 유용하나 프로덕션 기준 아님.

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

- **약정**: Reserved Instance, Savings Plans로 30~70% 절감. [[Reserved-Instance]]
- **Spot**: 중단 감내 워크로드 70~90% 절감.
- **티어링**: 접근 빈도에 맞는 스토리지 클래스. [[Storage-Tiering]]
- **아키텍처**: 전송 줄이기(VPC Endpoint, CDN), right-sizing. [[Egress-Cost]], [[Resource-Right-Sizing]]

## 비용 추정 도구

- **AWS Pricing Calculator**: 설계 단계에서 워크로드 가정으로 견적.
- **Cost Explorer**: 실제 청구를 서비스/태그별로 분해. [[Budget-Alert]]
- 둘을 비교해 가정과 실제의 괴리를 좁힌다.

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

- [AWS — How AWS Pricing Works (whitepaper)](https://docs.aws.amazon.com/whitepapers/latest/how-aws-pricing-works/how-aws-pricing-works.html)
- [AWS Pricing Calculator](https://calculator.aws/)

## 관련 문서

- [[AWS-Cost-Optimization|AWS 비용 최적화 플레이북]]
- [[Reserved-Instance|Reserved Instance / Savings Plans]]
- [[Storage-Tiering|스토리지 티어링]]
- [[Egress-Cost|데이터 전송 비용]]
- [[Resource-Right-Sizing|리소스 적정화]]
- [[Cloud-Service-Models|IaaS/PaaS/FaaS 비용 모델]]
