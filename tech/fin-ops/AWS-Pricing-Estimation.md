---
tags: [finops, aws, pricing, cost-estimation, pricing-calculator, mcp]
status: done
verified_at: 2026-10-14
category: "비용&운영(FinOps)"
aliases: ["AWS Pricing Estimation", "AWS 비용 추정", "AWS 견적 도구", "AWS Pricing MCP Server"]
---

# AWS 비용 추정 (AWS Pricing Estimation)

비용 추정은 서비스의 과금 차원마다 사용량 가정을 세우고 리전 단가를 곱하는 일이다([[AWS-Pricing#서비스별 과금 차원|서비스별 과금 차원]]). 도구가 대신하는 것은 단가 조회와 곱셈이며, 빠뜨린 차원이나 틀린 사용량 가정은 도구가 고쳐 주지 않는다. 이 문서는 2026-10-14 AWS 공식 문서, AWS Price List와 AWS Labs 문서 대조 기준이다.

## 네 가지 추정 경로

| 경로 | AWS 계정 | 조직의 할인과 약정 | 맞는 경우 |
|---|---|---|---|
| 서비스 가격 페이지로 직접 계산 | 불필요 | 반영 안 함 | 과금 차원을 익히고 계산 근거를 남길 때 |
| AWS Pricing Calculator(공개 웹) | 불필요 | 반영 안 함 | 설계 단계의 구성 비교와 견적 공유 |
| Billing and Cost Management의 Pricing Calculator | 필요 | 단가 유형으로 선택 | 기존 사용량, 할인과 약정을 반영한 추정 |
| AWS Pricing MCP Server | 자격 증명 필요 | 반영 안 함 | 개발 도구 안에서 대화형으로 단가를 찾고 비용 보고서 초안을 만들 때 |

- **가격 페이지 직접 계산:** 리전, 사용 구간(tier)과 과금 차원별 단가를 찾아 곱한다. 계산 과정이 그대로 남지만 놓친 차원은 그대로 과소 추정이 된다. AWS Price List와 서비스 가격 페이지의 단가가 다르면 AWS는 가격 페이지의 단가로 청구한다.
- **공개 Pricing Calculator:** 무료이며 선결제, 월, 연 비용을 함께 보여 준다. 단가는 AWS Price List API에서 가져오고 세금은 포함하지 않으며 입력한 사용량만 계산한다. 공유 링크는 AWS 공개 서버에 저장되는 공개 링크이고, 2023-05-31 이후 만든 링크는 1년 동안 유효하다. 견적을 고쳐도 기존 링크에 저장되지 않으므로 다시 공유해 새 링크를 남긴다.
- **콘솔 Pricing Calculator:** Workload estimate는 특정 워크로드의 비용을 추정하며 독립, 관리, 멤버 계정 모두 무료로 쓴다. 사용량은 새로 입력하거나 기존 비용과 사용량 데이터에서 가져오거나 공개 계산기의 공유 URL로 가져온다. 단가 유형은 할인 전, 할인 후, 할인과 약정 반영 후 가운데 하나이며 관리 계정이 멤버 계정에 허용할 단가 유형을 정한다. Bill estimate는 관리 계정이나 독립 계정만 쓰며, 지난달 통합 결제 사용량과 기존 Savings Plans, Reserved Instances를 자동으로 포함한 채 사용량과 약정 변경을 모델링한다. 달마다 5회는 무료이고 그 뒤로는 회당 2달러다.
- **Pricing MCP Server:** AWS Labs의 오픈소스 MCP 서버다. MCP를 지원하는 IDE나 AI 도우미에서 자연어로 물으면 AWS Pricing API로 단가를 실시간 조회해 계산한다. `pricing:*` 권한이 있는 AWS 자격 증명이 필요하고 Pricing API 호출에는 요금이 없다. 사용자별 데이터를 조회하지 않으므로 조직의 할인과 약정은 반영되지 않는다. CDK와 Terraform 프로젝트를 읽어 사용하는 서비스를 찾고 비용 보고서를 만드는 기능도 있다. 문서는 AI 도우미가 필터를 항상 올바르게 만들거나 가장 싼 선택지를 찾는다고 보장할 수 없다고 적는다.

Price List에는 계정 나이에 따라 끝나는 Free Tier 혜택과 EC2 Spot 가격이 없고, Price List Query API는 Savings Plans 가격을 지원하지 않는다. Price List를 직접 조회해 계산할 때는 이 항목을 따로 확인한다.

## 계산 예: S3에 사진 1만 장(100GB)을 올려 보관한다

us-east-1의 S3 Standard 기준이며 단가는 2026-10-12 게시 AWS Price List 값이다.

| 항목 | 단가 | 계산 | 발생 |
|---|---|---|---|
| 저장 | 첫 50TB 구간 GB-월당 0.023달러 | 100 × 0.023 = 2.30달러 | 보관하는 달마다 |
| 업로드 요청 | PUT, COPY, POST, LIST 1,000건당 0.005달러 | 10,000 × 0.005 / 1,000 = 0.05달러 | 올릴 때 한 번 |
| 인터넷에서 S3로 들어오는 전송 | GB당 0달러 | 0달러 | 없음 |

첫 달은 2.35달러이고, 데이터를 그대로 두면 그 뒤로는 달마다 2.30달러다. GB-월은 그 달의 GB-시간을 합산해 그 달의 시간 수로 나눈 값이라, 월중에 올린 데이터의 첫 달 저장 요금은 보관한 시간만큼만 붙는다. 저장량이 50TB를 넘으면 다음 450TB에는 GB-월당 0.022달러가 적용된다.

이 예에는 조회가 없다. 사진을 내려받게 하면 GET 요청(1,000건당 0.0004달러)과 인터넷으로 나가는 전송이 더해지며, 두 항목은 저장량이 아니라 접근량에 비례한다. 조회가 있는 서비스에서 접근 가정을 빼면 그만큼 과소 추정된다.

## 추정을 청구와 맞추는 점검

- **비용 성격을 나눠 적는다:** 견적 행을 반복 비용(저장 GB-월, 가동 시간), 사용량 비례 비용(요청 수, 전송량)과 일회성 비용(초기 적재 요청, 약정 선결제)으로 나눠 둔다. 가정이 바뀔 때 고칠 행이 보이고, 청구가 시작된 뒤 [[Cost-Anomaly|비용 이상 탐지]]에서 선결제와 사용량 증가를 구분하기 쉬워진다(운영 제안).
- **공개 단가와 조직 단가를 구분한다:** 공개 계산기와 Pricing MCP Server는 공개 단가로 계산한다. 할인이나 약정이 있는 조직은 콘솔 계산기의 할인 후 단가 유형으로 다시 계산하고, 공개 계산기 견적은 공유 URL로 가져와 입력을 반복하지 않는다.
- **LLM이 낸 금액은 단가와 산술을 따로 검증한다:** MCP 응답의 단가는 가격 페이지나 Price List와 대조하고, 곱셈은 스프레드시트나 코드로 다시 계산한다. 금액 산술을 LLM에 맡기지 않는 이유는 [[LLM-Cost-Optimization|LLM 비용 최적화]]의 시뮬레이션 원칙과 같다(운영 제안).
- **견적 링크의 공유 범위를 정한다:** 공개 계산기의 공유 링크는 공개 서버에 저장되므로 고객 구성과 규모가 드러나는 견적은 전달 범위를 정해 공유한다(운영 제안).
- **견적은 청구가 아니다:** 진행 중인 달의 Bills와 Cost Explorer 금액도 추정치다. 확정 시점은 [[AWS-Pricing#월 청구서 확정과 결제 시점|월 청구서 확정]]을 따른다.

## WAF 비용: 청구 기준선과 요청 지표를 나눠 본다

이 절은 2026-10-27 AWS WAF 가격표, 지표와 액션 문서, Cost Management 문서를 대조한 부분 보강이다. 앞의 S3 단가와 계산기 정책을 이날 다시 검증했다는 뜻은 아니다.

1. **비용을 과금 차원으로 분해한다.** 종량제에서는 web ACL, 규칙, 요청 검사와 선택한 유료 보호 기능을 나눠 추정한다. 초과 WCU와 본문 검사 크기 같은 추가 요금도 확인한다. Cost Explorer에서 서비스를 AWS WAF로 좁히고 Usage type과 Linked account로 비용 원인을 찾는다. WAF 로그 처리 비용은 CloudWatch에 청구될 수 있으므로 WAF 서비스 합계만으로 관측 비용까지 포함했다고 판단하지 않는다. Shield Advanced나 CloudFront 요금제의 포함 범위는 별도로 확인한다.
2. **Count를 무료 검사나 독립 요청으로 세지 않는다.** Count는 평가를 끝내지 않으므로 같은 요청이 Count 규칙에 매칭된 뒤 최종 Allow나 Block으로 처리될 수 있다. 따라서 규칙별 `CountedRequests`를 `AllowedRequests`, `BlockedRequests`에 더해 전체 요청량으로 쓰면 중복될 수 있다. 지표의 web ACL, rule, rule group과 label 차원을 구분하고, metric math 비용은 청구 명세와 대조할 추정치로 둔다.
3. **차단 효과와 과금 감소를 구분한다.** Count를 Block으로 바꿔도 이미 WAF에 도달한 요청의 기본 검사 비용이 사라지는 것은 아니다. 앞단 차단은 뒤쪽 유료 rule group까지 도달하는 검사량과 origin 부하를 줄이는 데 쓰며, 요청 자체가 줄었는지와 유료 검사만 줄었는지를 따로 측정한다. 검사 대상과 규칙 순서는 [[WAF-Bot-Control#비용 관리|Bot Control 비용 관리]]를 따른다.
4. **빠른 트래픽 신호와 늦은 비용 신호를 결합한다.** WAF는 CloudWatch 지표를 1분마다 보고한다. Cost Anomaly Detection은 청구 데이터 처리 뒤 하루 약 세 번 실행되고, Cost Explorer 데이터 지연 때문에 사용 후 탐지까지 최대 24시간 걸릴 수 있다. 새 서비스는 10일의 사용 이력이 필요하다. 트래픽 경보, [[Budget-Alert|예산 알림]]과 [[Cost-Anomaly|비용 이상 탐지]]를 같은 실시간 차단 장치로 취급하지 않는다.

운영 점검에서는 상위 IP와 URI를 비용 조사 단서로 쓰되, 비중이나 무매칭 기간 하나만으로 차단하거나 규칙을 삭제하지 않는다. 정상 요청의 영향, 보호 목적과 오탐을 확인한 뒤 변경하고 되돌릴 조건을 둔다. 이는 위 동작을 적용한 운영 제안이며 특정 임계값이나 절감률을 보장하지 않는다.

## 면접 체크포인트

- 공개 계산기와 콘솔 계산기의 차이 (계정, 기존 사용량 가져오기, 할인과 약정 반영)
- S3 견적에서 반복 비용(저장)과 일회성 비용(초기 업로드 요청)을 나누는 이유
- LLM 기반 견적 도구의 결과를 그대로 쓰지 않고 단가와 산술을 검증하는 방법

## 출처

- [AWS WAF Pricing — AWS](https://aws.amazon.com/waf/pricing/) — WAF 과금 차원과 CloudWatch 로그 비용
- [AWS WAF, AWS WAF metrics and dimensions](https://docs.aws.amazon.com/waf/latest/developerguide/waf-metrics.html) — 지표 주기와 집계 차원
- [AWS WAF, Using rule actions in AWS WAF](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-action.html) — Count의 비종료 평가와 Block의 종료 평가
- [AWS Cost Management, Filtering the data that you want to view](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-filtering.html)
- [AWS Cost Management, Detecting unusual spend with AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html) — 탐지 주기, 데이터 지연과 새 서비스의 이력 요건
- [AWS Pricing Calculator User Guide, What is AWS Pricing Calculator?](https://docs.aws.amazon.com/pricing-calculator/latest/userguide/what-is-pricing-calculator.html)
- [AWS Pricing Calculator User Guide, Sharing your estimate](https://docs.aws.amazon.com/pricing-calculator/latest/userguide/save-share-estimate.html) — 공개 서버 저장, 링크 유효 기간과 수정 시 새 링크
- [AWS Cost Management, Generating estimates with Pricing Calculator](https://docs.aws.amazon.com/cost-management/latest/userguide/pricing-calculator.html) — workload estimate와 bill estimate, 단가 유형과 요금
- [AWS Cost Management, Workload estimates](https://docs.aws.amazon.com/cost-management/latest/userguide/pc-workload-estimate.html) — 기존 사용량과 공개 계산기 URL 가져오기
- [AWS Billing, Calling AWS services and prices using the AWS Price List](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/price-changes.html) — Free Tier와 Spot 제외, Query API의 Savings Plans 미지원, 가격 페이지 우선
- [AWS Labs MCP, AWS Pricing MCP Server](https://awslabs.github.io/mcp/servers/aws-pricing-mcp-server)
- [AWS Price List Bulk API, Amazon S3 offer file (us-east-1)](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/us-east-1/index.json) — 2026-10-12 게시본의 저장, 요청과 수신 전송 단가
- [Amazon S3 User Guide, Understanding your AWS billing and usage reports for Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/aws-usage-report-understand.html) — GB-월 산정
- [Making Sense of AWS Pricing — Amazon Web Services](https://www.youtube.com/watch?v=Txny5HLCImY)

## 관련 문서

- [[AWS-Pricing|AWS 요금 구조 (과금 차원과 청구 확정)]]
- [[Storage-Tiering|스토리지 티어링 (S3 클래스 비교)]]
- [[Cost-Anomaly|비용 이상 탐지 (선결제와 사용량 증가 구분)]]
- [[LLM-Cost-Optimization|LLM 비용 최적화 (결정론 산술)]]
- [[MCP|MCP (Model Context Protocol)]]
