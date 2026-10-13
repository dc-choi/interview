---
tags: [finops, aws, pricing, billing, cost-model]
status: done
verified_at: 2026-10-14
category: "비용&운영(FinOps)"
aliases: ["AWS Pricing", "AWS pricing 구조", "AWS 요금 구조", "AWS 과금 모델"]
---

# AWS 요금 구조 (AWS Pricing)

비용 최적화는 **요금이 어떤 차원으로 매겨지는지**를 아는 데서 시작한다. 서비스마다 과금 차원이 다르고, 같은 서비스도 컴퓨트/스토리지/요청/전송이 따로 청구된다. 차원을 모르면 어디서 새는지 못 짚는다. [[AWS-Cost-Optimization]]

## 큰 원칙

- **On-Demand 종량제(pay-as-you-go)**: 선결제 없이 쓴 만큼 낸다. Reserved Instances와 Savings Plans는 사용량 약정으로 단가를 낮출 수 있다. [[Reserved-Instance]]
- **규모의 경제**: 쓸수록 단가 구간이 내려가는 서비스(S3 등)도 있음.
- **리전별 단가 차이**: 같은 서비스도 리전마다 가격이 다르다.
- **Free Tier**: 2025-07-15 이후 `Sign up for AWS (advanced)` 경로로 만든 신규 계정은 Free 또는 Paid account plan을 고른다(새 가입 경로는 아래 절 참고). Free plan은 계정 생성 뒤 최대 6개월 또는 크레딧 소진까지이며, Always Free 서비스에는 월별 무료 한도가 있다. 그 이전 계정에는 서비스별 레거시 조건이 남아 있을 수 있으므로 계정과 서비스 문서를 확인한다. 실험용 혜택일 뿐 프로덕션 비용 기준으로 쓰지 않는다.

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
- **Cost Explorer**: 청구 데이터를 서비스/태그별로 분해. 진행 중인 달은 추정치다([[AWS-Pricing#월 청구서 확정과 결제 시점|월 청구서 확정]]). [[Budget-Alert]]
- 둘을 비교해 가정과 실제의 괴리를 좁힌다.

## 신규 계정의 크레딧과 Free plan 종료

2026-10-12 AWS Billing과 계정 관리 문서, AWS Free Tier 약관(2025-07-09 갱신), Free Tier FAQ와 2025-07-15 AWS News Blog 대조 기준이며 `Sign up for AWS (advanced)` 경로로 만든 계정에 해당한다. 2025-07-15 이전에 만든 계정은 레거시 Free Tier를 따르고, Free plan과 크레딧은 AWS 계정을 가진 적이 없는 신규 고객만 받는다. 2026-10-12 일부 고객에게 제한 배포 중인 `Sign up for AWS (new)` 경로는 root 사용자를 만들지 않고 AWS Organizations와 IAM Identity Center에 자동으로 참여하며, Paid plan 프로젝트에 월 세전 비용 한도(spend limit)를 둘 수 있는 등 지원 기능이 달라 아래 조건을 그대로 적용하지 않는다.

- **크레딧:** 가입 크레딧 100달러는 플랜과 관계없이 받는다. 콘솔의 Explore AWS 위젯에 있는 활동 다섯 개(EC2 인스턴스 시작, Bedrock playground에서 모델 호출, Budgets 비용 예산 설정, Lambda 웹 앱 만들기, RDS 데이터베이스 생성)를 마치면 활동당 20달러, 최대 100달러를 더 받는다. Budgets를 뺀 네 활동은 실제 서비스를 쓰므로 그 사용료가 크레딧에서 차감된다. 활동은 계정을 연 날부터 6개월 안에 마쳐야 하고, AWS Organizations에 가입하거나 Control Tower landing zone을 설정하면 남은 활동이 즉시 만료되고 추가 크레딧 자격도 끝난다.
- **Free plan에 머무는 동안의 위험은 청구가 아니라 계정 폐쇄다:** Free plan에서는 요금이 발생하지 않는 대신, 6개월이 지나거나 크레딧을 다 쓰면 계정이 자동으로 닫히고 리소스와 데이터에 접근할 수 없게 된다. AWS는 콘텐츠를 90일 동안 보관한 뒤 계정과 리소스를 영구 삭제하며, 그 안에 Paid plan으로 전환하면 계정을 다시 열고 접근을 복구할 수 있다. 약관도 Free plan 계정을 평가용으로 두고 민감한 데이터 처리에 쓰지 말라고 정한다. 따라서 운영 중인 서비스를 Free plan 계정에 두면 플랜 종료 시점이 곧 서비스 중단 위험이 된다(운영 판단).
- **종료 전 알림:** 2025-07-15 발표 기준, 크레딧이 50%, 25%, 10% 남았을 때 이메일을 보내고 6개월 기간이 15일, 7일, 2일 남았을 때 콘솔과 이메일로 알린다. 현재 Billing 문서는 기준값 없이 크레딧 잔액과 플랜 종료가 다가올 때 주기적으로 이메일을 보낸다고 적는다.
- **Free plan의 제약:** Free plan은 일부 서비스와 기능만 쓸 수 있다. 크레딧을 크게 소진할 수 있는 서비스와 하드웨어 구매가 제외되며 Savings Plans, Reserved Instances와 요금이 발생할 수 있는 일부 AWS Marketplace 상품이 그 예다. 쓸 수 있는 서비스는 AWS Free Tier 페이지의 적격 목록으로 확인하고, 다른 프로모션 크레딧과 할인은 Paid plan에서만 받을 수 있다.
- **자동 Paid 전환:** AWS Organizations 가입, Control Tower landing zone 설정, AWS Partner Network 가입, Professional Services 계약, Enterprise Agreement 체결, AWS Skill Builder Team 구독 구매, HIPAA나 SEC 준수 계정 지정 중 하나를 하면 Free plan이 자동으로 Paid plan으로 바뀐다. 그때부터 크레딧을 넘는 사용과 크레딧 비적용 서비스에 표준 요금이 붙는다. 특히 약관은 Free plan 계정이 AWS Organizations에 가입하면 Paid plan으로 바뀌고 Free Tier 크레딧을 더는 쓰거나 받을 수 없다고 정한다.
- **전환 뒤 남은 크레딧:** 약관과 2025-07-15 발표는 Free Tier 크레딧이 계정을 연 날부터 12개월 뒤 만료된다고 하며, 발표는 Paid plan으로 직접 전환해도 남은 크레딧을 그때까지 쓸 수 있다고 한다. Organizations 가입으로 전환된 경우는 위 항목대로 크레딧을 쓸 수 없다. 2026-10-12 FAQ의 일반 문항은 크레딧이 계정 생성 6개월 뒤 만료된다고 적으면서 2026년 10월 새 가입 경험 출시 전에 가입했다면 Credits 페이지를 보라고 덧붙인다. 실제 만료일은 Billing의 Credits 페이지에서 확인한다.

## Free Tier 사용 중의 청구 점검

이 절은 2026-10-09 AWS Billing 문서 대조 기준이다. 서비스별 무료 사용량, 크레딧 잔액과 계정 플랜을 따로 확인한다.

- **플랜 경계:** Free plan 계정은 Paid plan으로 전환하기 전에는 요금이 발생하지 않는다. Paid plan은 크레딧을 초과한 사용이나 크레딧 비적용 서비스에 표준 요금이 적용될 수 있다. 플랜 기간과 종료 조건은 위 절을 따르고, 레거시 계정에 신규 플랜 조건을 그대로 적용하지 않는다.
- **사용량 확인:** Billing의 Free Tier 화면에서 서비스별 혜택과 실제 사용량을 대조하고, Bills에서는 서비스, 리전과 사용 기간별 청구를 확인한다. 무료 혜택 대상 서비스라는 사실만으로 그 서비스의 모든 사용이 무료라고 판단하지 않는다.
- **알림 범위:** Free Tier 사용량 알림은 해당 월의 활성 혜택을 대상으로 서비스별 한도의 85% 초과를 알린다. 개별 계정에는 기본 활성화되지만 AWS Organizations 관리 계정은 opt-in이 필요하다. 수신 주소와 활성 상태를 확인하고 `zero spend budget`으로 추가 감시할 수 있다.

알림 설정은 리소스 중지나 지출 상한 설정이 아니다. [[Budget-Alert|예산 알람의 지연과 조치 범위]]를 함께 보고, 청구 항목과 실제 리소스를 연결해 남아 있는 과금 원인을 점검한다.

## 월 청구서 확정과 결제 시점

2026-10-13 AWS Billing 문서, Cost Explorer 문서와 Data Exports의 CUR 열 정의 대조 기준이다. 월중에 보이는 금액과 확정된 청구 금액을 구분한다.

- **확정 전후 상태:** 월 사용료와 정기 요금은 월 청구 기간이 닫힌 뒤 인보이스로 발행된다. Bills 화면에서 청구 기간이 닫혀 인보이스가 발행되면 `Issued`, 그 전에는 `Pending`으로 표시되며 `Pending` 금액은 그때까지 계량된 사용량으로 계산한 추정치다. All Upfront Reserved Instance 구매 같은 일회성 요금은 월말을 기다리지 않고 즉시 청구된다.
- **결제:** AWS는 매월 초 기본 결제 수단에 자동으로 청구한다. 신용카드는 월 청구 기간이 끝나 인보이스가 발행될 때 함께 청구된다. 결제 수단에 따라 출금 시점이 다르다. 미국 은행 계좌와 USD 결제에만 쓰는 ACH direct debit은 월초 10일 안에 인보이스 발행과 출금을 시작하며, 성공 표시까지 3~5일, 콘솔에 `Succeeded`로 보인 뒤 최종 완료까지 최대 20일이 걸릴 수 있다. 자동 청구가 실패하면 Payments 화면의 `Payments due`에서 미납 인보이스를 골라 직접 결제한다.
- **시간대:** Cost Explorer의 월과 일은 UTC 기준이고 CUR의 청구 기간 시작일과 종료일도 UTC 시각으로 기록된다. 따라서 한국 시간(UTC+9) 매월 1일 0시부터 9시 전까지의 사용분은 이 집계에서 이전 달에 들어간다. 월 경계 비용을 한국 시간 달력으로 잘라 대조하지 않는다.
- **확정 여부를 데이터로 판단:** CUR의 인보이스 ID 열(레거시 CUR의 `bill/InvoiceId`, CUR 2.0의 `bill_invoice_id`)은 보고서가 확정되기 전까지 비어 있다. 다만 확정 뒤에도 환불, 크레딧이나 Support 요금이 적용되면 AWS가 보고서를 갱신할 수 있다. Developer, Business와 Enterprise Support 요금은 최종 사용료로 계산되므로 보통 다음 달 6일이나 7일에 지난달 보고서에 반영되고, 환불은 별도 파일로 생성된다. 사용료가 확정된 뒤의 재집계는 [[Cloud-Unit-Cost|클라우드 단위 비용]]의 계산 원칙을 따른다.

운영 적용 제안: 월 비용 집계 파이프라인은 인보이스 ID가 채워진 값을 확정치로, 비어 있는 동안의 값을 잠정치로 표시하되 확정 표시 뒤에도 재집계를 허용한다. 일회성 요금은 즉시 청구되므로 인보이스 ID가 있는 행이 일부 있다는 사실만으로 그 달 사용료 전체가 확정됐다고 보지 않는다. 외주 고객에게 AWS 사용료를 넘겨 청구하거나 월 비용 보고를 낼 때, 고객 전용 독립 계정이면 `Issued` 인보이스 금액을, AWS Organizations 통합 결제나 billing transfer에 속한 계정이면 Bills의 계정별 금액(`Charges by account`)을, 한 계정을 여러 고객이 함께 쓰면 계정이나 태그 단위의 CUR 행을 기준으로 한다. 월중 Bills와 Cost Explorer 금액은 추정치로 표시한다.

## 결제 수단 변경과 미납 청구

2026-10-13 AWS Billing의 결제 설정, 카드 관리와 payment profile 문서 대조 기준이다. 비용 발생과 결제 수단의 유효성은 별도로 점검한다.

- **카드 갱신:** Billing and Cost Management의 `Payment preferences`에서 카드의 만료일과 연결 정보를 수정하거나 새 카드를 추가한다. 새 카드 등록과 기본 결제 수단 지정은 구분하며, 사용할 수단이 `Set as default`로 선택됐는지 확인한다.
- **청구 주기 말의 변경:** 기본 결제 수단을 바꿔도 청구 주기 말에 변경하면 해당 주기 요금이 이전 수단으로 청구될 수 있다. 변경 완료 화면만으로 이번 청구서의 결제 수단까지 바뀌었다고 판단하지 않는다. 이 예외는 2026-10-14 AWS 공식 Knowledge Center에서 대조했다.
- **미납 금액:** 카드를 추가하거나 갱신하면 AWS가 이전 달의 미납 청구서를 새 카드에 청구할 수 있다. 변경 효과를 다음 결제 주기에만 한정하지 않는다.
- **기존 카드 제거:** 먼저 다른 유효한 결제 수단을 기본값으로 지정해야 한다. 기본값으로 설정된 카드는 삭제할 수 없다.
- **판매 법인별 결제:** 여러 AWS 판매 법인(SOR)의 청구서를 받으면 payment profile로 법인별 통화와 결제 수단을 지정할 수 있다. 지원 수단은 법인에 따라 다르므로 기본 카드 하나가 모든 청구에 유효하다고 가정하지 않는다.
- **Billing transfer:** 사용 중이면 청구를 넘겨받는 bill transfer account가 해당 청구서의 결제 설정을 제어한다. 청구를 넘기는 bill source account에서 설정을 바꿔도 transfer가 활성화된 동안에는 효력이 없다.

운영 적용 제안: 카드 재발급 때 만료일, 기본값, 판매 법인별 profile과 미납 청구 상태를 함께 확인한다. 결제 정보 수정 완료를 실제 납부 성공으로 기록하지 않는다.

## 계정 폐쇄 뒤에도 남는 청구

2026-10-08 공식 계정 관리와 CloudTrail 문서 확인 기준이다. 계정 폐쇄, 종량 사용 중단과 약정 종료는 서로 다른 사건이다.

- **이미 사용한 금액:** 폐쇄 전 사용료는 다음 달에 청구될 수 있다. 청구서 도착일만 보고 폐쇄 후 새 사용이 발생했다고 판단하지 않는다.
- **Reserved Instances와 Savings Plans:** 계정을 닫아도 만료 전 약정 청구는 남는다. 폐쇄를 약정 취소 수단으로 계산하지 않는다.
- **AWS Marketplace:** 계정 폐쇄만으로 구독이 자동 취소되지 않는다. 해당 소프트웨어 인스턴스를 종료하고 Marketplace에서 구독 취소를 별도로 확인한다.
- **CloudTrail trail:** 계정 폐쇄 뒤에도 trail이 남을 수 있다. 다른 계정의 S3 버킷으로 전송하던 trail은 전달이 가능한 동안 이벤트를 계속 보낼 수 있다. 종료 전 보존 요구와 전달 대상을 확인해 삭제 여부를 정하고, 이미 닫았다면 AWS Support에 삭제를 요청할 수 있다. 이 동작을 CloudTrail Lake 등 모든 관련 리소스에 일반화하지 않는다.

운영 점검은 Bills에서 **서비스, 리전, 사용 기간과 약정**을 분리해 대조하는 순서로 한다. 폐쇄 후 90일 동안은 과거 청구 조회와 미납 요금 납부가 가능하지만, 이를 서비스 사용 권한이나 납부 유예 기간으로 해석하지 않는다.

### Marketplace 구독 취소와 인스턴스 종료를 함께 확인한다

EC2 인스턴스로 실행하는 Marketplace 소프트웨어는 구독 취소만으로 사용료가 멈추지 않을 수 있다. 실행 중인 인스턴스가 남으면 소프트웨어 사용료가 청구되고 인프라 비용도 발생할 수 있다. 2026-10-14 AWS 공식 Knowledge Center 대조 기준, 구독의 `View instances`에서 실행 리전을 확인하고 **각 리전의 관련 인스턴스를 종료한 뒤 구독을 취소**하는 순서가 권장된다. 종료 전 필요한 데이터와 서비스 의존성을 확인하는 것은 이 절차를 적용하기 위한 운영 점검이다.

구독을 취소한 소프트웨어의 새 인스턴스는 Marketplace 콘솔과 EC2 콘솔에서 시작할 수 없다. 따라서 취소를 비용 중단뿐 아니라 다시 실행할 수 있는지의 문제로도 점검한다. 이 절차를 SaaS나 기간 약정 상품 전체의 취소, 환불 조건으로 확대하지 않는다.

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

- [How do I change the default payment method that's associated with my AWS account? — AWS re:Post](https://repost.aws/knowledge-center/change-default-payment-method) — 청구 주기 말 변경 시 이전 수단으로 청구될 수 있는 예외
- [How do I terminate instances in my AWS Marketplace subscription and cancel the subscription? — AWS re:Post](https://repost.aws/knowledge-center/cancel-marketplace-subscription) — 리전별 인스턴스 종료, 구독 취소와 잔존 사용료의 구분
- [AWS, Understanding your bill](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/getting-viewing-bill.html)
- [AWS, Making payments](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-making-a-payment.html)
- [AWS, Managing ACH direct debit](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-ach-debit.html) — 미국 은행 계좌와 USD 조건, 최종 완료까지 최대 20일
- [AWS, What are AWS Cost and Usage Reports?](https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html) — 확정 뒤 환불, 크레딧, Support 요금 반영과 별도 환불 파일
- [AWS, Modifying your chart](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-modify.html) — Cost Explorer의 UTC 기간 정의
- [AWS, Billing details](https://docs.aws.amazon.com/cur/latest/userguide/billing-columns.html) — 레거시 CUR의 `bill/InvoiceId`와 청구 기간 열
- [AWS, Bill columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-bill.html) — CUR 2.0의 `bill_invoice_id`
- [AWS, Customizing your AWS payment preferences](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-payment-method.html)
- [AWS, Managing credit cards](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-cc.html)
- [AWS, Using payment profiles](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/manage-paymentprofiles.html)
- [AWS, Close an AWS account](https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-closing.html)
- [AWS, AWS account closure and trails](https://docs.aws.amazon.com/en_en/awscloudtrail/latest/userguide/cloudtrail-account-closure.html)
- [Why did I receive a bill after I closed my AWS account? — AWS re:Post](https://repost.aws/knowledge-center/closed-account-bill)
- [AWS, How AWS Pricing Works](https://docs.aws.amazon.com/whitepapers/latest/how-aws-pricing-works/how-aws-pricing-works.html)
- [AWS, Explore AWS services with AWS Free Tier](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html)
- [AWS, Choosing a plan](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html)
- [AWS, Earning additional credits](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans-activities.html)
- [AWS Free Tier update: New customers can get started and explore AWS with up to $200 in credits — AWS News Blog](https://aws.amazon.com/blogs/aws/aws-free-tier-update-new-customers-can-get-started-and-explore-aws-with-up-to-200-in-credits/)
- [AWS, AWS Free Tier FAQs](https://aws.amazon.com/free/free-tier-faqs/)
- [AWS, Compare sign-up options](https://docs.aws.amazon.com/accounts/latest/reference/sign-up-for-aws.html)
- [AWS, AWS Free Tier Terms](https://aws.amazon.com/free/terms/) — 2025-07-09 갱신본, 크레딧 만료와 Organizations 가입 시 크레딧 상실
- [AWS, Tracking your AWS Free Tier usage](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/tracking-free-tier-usage.html)
- [AWS, Track your Free Tier usage for Amazon EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html)
- [AWS Pricing Calculator](https://calculator.aws/)
- [When will my AWS bill be ready? — Amazon Web Services](https://www.youtube.com/watch?v=1ycHyJT3M8U)

## 관련 문서

- [[AWS-Cost-Optimization|AWS 비용 최적화 플레이북]]
- [[Reserved-Instance|Reserved Instance / Savings Plans]]
- [[Storage-Tiering|스토리지 티어링]]
- [[Egress-Cost|데이터 전송 비용]]
- [[Resource-Right-Sizing|리소스 적정화]]
- [[Cloud-Service-Models|IaaS/PaaS/FaaS 비용 모델]]
