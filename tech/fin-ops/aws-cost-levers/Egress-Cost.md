---
tags: [finops, aws, data-transfer, egress, nat-gateway, vpc-endpoint, cost]
status: done
category: "비용&운영(FinOps)"
aliases: ["Egress Cost", "Egress cost 관리", "데이터 전송 비용", "data transfer cost", "NAT Gateway 비용"]
---

# 데이터 전송 비용 (Egress / Data Transfer)

클라우드 청구서의 **숨은 폭탄**. 인스턴스/스토리지는 눈에 보이지만 데이터 전송은 추적이 어려워 방치되기 쉽다. 원칙은 단순하다 — **들어오는 건(ingress) 대체로 무료, 나가는 것(egress)과 경계를 넘는 것이 돈**이다. [[AWS-Cost-Optimization]]의 데이터 전송 절을 심화한다.

## 어디서 돈이 새나

| 구간 | 대략 단가 | 비고 |
|---|---|---|
| Internet **ingress** | 무료 | 들어오는 트래픽 |
| Internet **egress** | GB당 $0.08~0.12 | 사용자/외부로 나감 |
| **Cross-AZ** | GB당 $0.01~0.02(양방향) | 같은 리전 다른 AZ |
| **Cross-Region** | GB당 $0.02~0.09 | 리전 간 복제/통신 |
| **NAT Gateway** | 처리 GB당 $0.045 + 시간당 요금 | 프라이빗 → 외부 |
| **S3 → CloudFront** | 무료 | 같은 생태계 |

핵심 직관: **경계를 넘을수록(AZ → Region → Internet) 비싸진다**. 트래픽이 어느 경계를 넘는지가 비용을 결정한다.

## 절감 레버

- **VPC Endpoint**: S3/DynamoDB는 **Gateway Endpoint 무료**로 NAT 우회. 그 외 AWS 서비스는 Interface Endpoint(NAT보다 쌈). [[VPC]]
- **내부 통신은 Private IP/DNS**: 같은 VPC 안에서 Public 엔드포인트로 접근하면 불필요한 NAT/인터넷 경유 발생.
- **CDN 전진 배치**: 사용자 트래픽을 Edge가 흡수해 Origin egress 감소. S3→CloudFront는 무료. [[CDN]], [[CloudFront]]
- **AZ 인식 배치**: 통신 잦은 컴포넌트를 같은 AZ에 둬 cross-AZ 최소화(단, 가용성과 균형).
- **압축/배치 전송**: 외부로 나가는 데이터는 압축, 잦은 소량보다 묶어서.
- **리전 통합**: cross-region 복제가 정말 필요한지 재검토(DR 요구와 균형). [[DR-Strategy]]

## NAT Gateway가 특히 위험

프라이빗 서브넷의 외부 통신이 전부 NAT를 거치면 **처리량 요금이 누적**된다. S3/DynamoDB/ECR 같은 AWS 서비스 트래픽을 VPC Endpoint로 빼는 것만으로 NAT 비용이 크게 준다.

## 흔한 함정

- 같은 VPC인데 Public DNS로 접근 → 불필요한 NAT/인터넷 경유
- S3 접근을 NAT로 → Gateway Endpoint면 무료인데 돈 냄
- cross-AZ 트래픽을 인지 못 한 채 마이크로서비스 산개
- CDN 없이 S3에서 직접 대량 다운로드 제공
- 데이터 전송 비용을 태그/모니터링 안 해 원인 미추적

## 면접 체크포인트

- ingress 무료, egress와 경계 넘기 과금의 기본 구조
- AZ → Region → Internet으로 갈수록 비싸지는 직관
- VPC Endpoint(특히 S3/DynamoDB Gateway 무료)로 NAT 줄이기
- 내부 통신 Private IP, CDN 전진 배치의 효과
- NAT Gateway가 비용 누적의 핵심인 이유

## 출처

- [AWS — Overview of Data Transfer Costs](https://aws.amazon.com/blogs/architecture/overview-of-data-transfer-costs-for-common-architectures/)
- [AWS — VPC Endpoints (Gateway vs Interface)](https://docs.aws.amazon.com/vpc/latest/privatelink/concepts.html)

## 관련 문서

- [[AWS-Cost-Optimization|AWS 비용 최적화 (데이터 전송 개요)]]
- [[VPC|VPC (Endpoint)]]
- [[CDN|CDN / CloudFront]]
- [[AWS-Pricing|AWS 요금 구조]]
- [[DR-Strategy|DR 전략 (cross-region 균형)]]
