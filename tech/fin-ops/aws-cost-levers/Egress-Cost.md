---
tags: [finops, aws, data-transfer, egress, nat-gateway, vpc-endpoint, cost]
status: done
category: "비용&운영(FinOps)"
aliases: ["Egress Cost", "Egress cost 관리", "데이터 전송 비용", "data transfer cost", "NAT Gateway 비용"]
verified_at: 2026-08-05
---

# 데이터 전송 비용 (Egress / Data Transfer)

클라우드 청구서의 **숨은 폭탄**. 인스턴스/스토리지는 눈에 보이지만 데이터 전송은 추적이 어려워 방치되기 쉽다. 원칙은 단순하다 — **인터넷에서 들어오는 것(ingress)은 과금 없음, 나가는 것(egress)과 경계를 넘는 것이 돈**이다. [[AWS-Cost-Optimization]]의 데이터 전송 절을 심화한다.

## 어디서 돈이 새나

단가는 리전, 서비스, 누적 사용량에 따라 달라진다. 아래는 과금 구조 위주로 정리했고, 금액을 적은 항목은 **US East (Ohio) 기준, 2026-08-05 공식 요금 페이지 확인값**이다. 실제 견적은 대상 리전 요금표로 다시 계산한다.

| 구간 | 과금 구조 | 비고 |
|---|---|---|
| Internet **ingress** | 과금 없음 | 인터넷에서 AWS로 들어오는 전송 |
| Internet **egress** | 리전별 계층 요금, 월 100GB는 전 서비스, 전 리전 합산으로 무료(중국, GovCloud 제외) | 누적 사용량이 늘수록 계층 단가 하락 |
| **Cross-AZ** | 같은 리전 AZ 간 전송은 인바운드와 아웃바운드가 **각각 계량**됨 | 한 번의 전송이 두 줄로 청구 |
| **Cross-Region** | **소스 리전의 아웃바운드에만** 과금, 목적지 리전 인바운드는 무과금 | 소스와 목적지 리전 조합으로 단가 결정 |
| **NAT Gateway** | 시간당 $0.045 + 처리 GB당 $0.045 | 프라이빗 → 외부 |
| **Gateway Endpoint**(S3, DynamoDB) | 시간 요금과 데이터 처리 요금 없음 | NAT 우회 |
| **Interface Endpoint**(PrivateLink) | AZ별 엔드포인트 ENI 시간당 $0.01 + 처리 GB당 $0.01(첫 1PB) | 엔드포인트 수만큼 시간 요금 누적 |
| **S3 → CloudFront** | CloudFront로 서빙하는 트래픽은 AWS 오리진 전송 요금이 면제됨 | 같은 생태계 |

핵심 직관: **인터넷 아웃바운드가 가장 비싸다.** 다만 그 아래에서 cross-AZ와 cross-region의 상하는 고정이 아니다. cross-AZ는 인바운드와 아웃바운드가 각각 계량돼 왕복분이 청구되는 반면 cross-region은 소스 리전 아웃바운드만 청구되므로, 단가가 낮은 인접 리전 조합(예: us-east-1과 us-east-2)에서는 리전 간 전송이 cross-AZ보다 쌀 수 있다. 어느 경계를 넘는지에 더해 리전 조합까지 봐야 비용이 결정된다.

## 절감 레버

- **VPC Endpoint**: S3와 DynamoDB의 **Gateway Endpoint는 시간 요금과 데이터 처리 요금이 없어** NAT 우회에 유리하다. 그 외 AWS 서비스용 Interface Endpoint는 AZ별 시간 요금과 데이터 처리 요금이 붙어 엔드포인트 수와 트래픽량에 따라 NAT Gateway보다 비쌀 수도 있으므로 비교 계산한다. [[VPC]]
- **내부 통신은 Private IP/DNS**: 같은 VPC 안에서 Public 엔드포인트로 접근하면 불필요한 NAT/인터넷 경유 발생.
- **CDN 전진 배치**: 사용자 트래픽을 Edge가 흡수해 Origin egress 감소. S3에서 CloudFront로 나가는 오리진 전송은 요금이 면제된다. [[CDN]], [[CloudFront]]
- **AZ 인식 배치**: 통신 잦은 컴포넌트를 같은 AZ에 둬 cross-AZ 최소화(단, 가용성과 균형).
- **압축/배치 전송**: 외부로 나가는 데이터는 압축, 잦은 소량보다 묶어서.
- **리전 통합**: cross-region 복제가 정말 필요한지 재검토(DR 요구와 균형). [[DR-Strategy]]

## NAT Gateway가 특히 위험

프라이빗 서브넷의 외부 통신이 전부 NAT를 거치면 **처리량 요금이 누적**된다. S3와 DynamoDB는 시간 요금과 데이터 처리 요금이 없는 Gateway Endpoint로 빼면 그만큼 NAT 처리 요금이 그대로 줄어든다.

반면 ECR은 Gateway Endpoint가 없고 유료 Interface Endpoint(`ecr.api`, `ecr.dkr`)를 써야 한다. AZ별 시간 요금과 데이터 처리 요금이 붙으므로 우회할 NAT 처리량과 비교 계산해 이득일 때만 옮긴다(이미지 레이어는 S3에서 내려오므로 S3 Gateway Endpoint를 함께 둔다).

## 흔한 함정

- 같은 VPC인데 Public DNS로 접근 → 불필요한 NAT/인터넷 경유
- S3 접근을 NAT로 → Gateway Endpoint는 시간 요금과 데이터 처리 요금이 없는데 NAT 처리 요금을 냄
- cross-AZ 트래픽을 인지 못 한 채 마이크로서비스 산개
- CDN 없이 S3에서 직접 대량 다운로드 제공
- 데이터 전송 비용을 태그/모니터링 안 해 원인 미추적

## 면접 체크포인트

- 인터넷 ingress 과금 없음, egress와 경계 넘기 과금의 기본 구조
- 인터넷 아웃바운드가 가장 비싸고, cross-AZ와 cross-region의 상하는 리전 조합에 따라 뒤집힐 수 있다는 점
- VPC Endpoint(특히 시간 요금과 데이터 처리 요금이 없는 S3/DynamoDB Gateway)로 NAT 줄이기
- 내부 통신 Private IP, CDN 전진 배치의 효과
- NAT Gateway가 비용 누적의 핵심인 이유

## 출처

- [AWS — Overview of Data Transfer Costs](https://aws.amazon.com/blogs/architecture/overview-of-data-transfer-costs-for-common-architectures/)
- [AWS — VPC Endpoints (Gateway vs Interface)](https://docs.aws.amazon.com/vpc/latest/privatelink/concepts.html)
- [Amazon VPC pricing — NAT Gateway, Gateway Endpoint 요금](https://aws.amazon.com/vpc/pricing/)
- [AWS PrivateLink pricing — Interface Endpoint 시간, 데이터 처리 요금](https://aws.amazon.com/privatelink/pricing/)
- [Amazon EC2 On-Demand Pricing — Data Transfer(월 100GB 무료 한도)](https://aws.amazon.com/ec2/pricing/on-demand/)
- [Amazon CloudFront pricing — AWS 오리진 전송 요금 면제](https://aws.amazon.com/cloudfront/pricing/)
- [AWS Data Exports — Understanding data transfer charges(리전 내, 리전 간, 인터넷 과금 구조)](https://docs.aws.amazon.com/cur/latest/userguide/cur-data-transfers-charges.html)

## 관련 문서

- [[AWS-Cost-Optimization|AWS 비용 최적화 (데이터 전송 개요)]]
- [[VPC|VPC (Endpoint)]]
- [[CDN|CDN / CloudFront]]
- [[AWS-Pricing|AWS 요금 구조]]
- [[DR-Strategy|DR 전략 (cross-region 균형)]]
