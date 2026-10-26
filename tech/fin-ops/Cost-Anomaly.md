---
tags: [finops, aws, cost-anomaly-detection, monitoring, ml, alert]
status: done
verified_at: 2026-10-14
category: "비용&운영(FinOps)"
aliases: ["Cost Anomaly", "Cost Anomaly Detection", "비용 이상 탐지"]
---

# 비용 이상 탐지 (Cost Anomaly Detection)

**청구 데이터에서 평소 패턴과 다른 비용 증가를 자동으로 찾는** 것이 이상 탐지다. 예산 알람([[Budget-Alert]])이 정해둔 선을 넘는지 본다면, 이상 탐지는 **평소와 다른 급변**을 본다. 둘은 보완 관계이며, 실시간 탐지나 지출 상한을 보장하지 않는다.

## 무엇이 다른가 — Anomaly vs Budget

| | Cost Anomaly Detection | AWS Budgets |
|---|---|---|
| 트리거 | 평소 패턴 대비 **비정상 급변** | 미리 정한 **금액/사용량 임계** |
| 방식 | ML이 베이스라인 학습 | 사용자가 임계 설정 |
| 강점 | 예상 못 한 비용 증가 탐지 | 명시한 임계 알림과 선택한 Budget Action 연결 |
| 약점 | 청구 데이터 지연과 학습 기간이 있으며 자체 차단 기능 없음 | 집계 지연이 있으며 임계 미만의 패턴 변화는 알리지 않음 |

예산은 정한 목표 대비 비용을, 이상 탐지는 과거 패턴 대비 증가를 확인한다.

## 작동 방식

- **Monitor 정의**: 감시 차원은 AWS services, 연결 계정, 비용 카테고리, 비용 할당 태그 네 가지다. AWS managed monitor는 선택한 차원의 값을 자동으로 개별 평가한다. AWS services 차원은 AWS managed만 지원하며 특정 서비스 하나만 고르는 customer managed monitor는 만들 수 없다. Customer managed는 선택한 연결 계정/태그 값 등을 합산해 감시한다. 연결 계정/태그/비용 카테고리 monitor는 관리 계정에서만 생성한다. 서비스별 기여와 알림 전달 범위는 근본 원인 분해와 AWS User Notifications 필터로 확인한다.
- **ML 베이스라인**: 과거 비용 패턴을 학습해 비용 증가의 이상 여부를 평가한다.
- **근본 원인 분해**: 서비스/계정/리전/사용 유형별 기여 비용을 제시한다. 실제 원인은 리소스와 사용 내역을 추가로 확인한다.
- **Alert Subscription**: 예상 대비 증가액(절대 금액)이나 증가율 임계로 알림을 설정한다. 개별 알림은 SNS, 일/주 요약은 이메일로 받는다. AWS User Notifications로 별도 전달/필터 규칙도 구성할 수 있다.

## Cost Explorer를 켜면 생기는 기본 설정

2026-10-12 AWS Cost Management 문서 기준이다.

- Cost Explorer는 콘솔에서 처음 열 때 활성화되며 API로는 켤 수 없다. 켜면 이번 달과 지난 13개월의 비용 데이터를 준비한다. 이번 달 데이터는 약 24시간 뒤에 보이고 나머지는 며칠 더 걸린다. 예측 기간은 2026-10-26 대조한 활성화 안내에는 다음 12개월, 개요에는 다음 18개월로 표기가 달라 이 문서에서는 하나의 현행 상한으로 확정하지 않는다.
- 활성화 과정에서 AWS가 Cost Anomaly Detection을 자동 구성한다. AWS services monitor 하나와 일일 요약 alert subscription을 만들고, 대부분의 AWS 서비스에서 비용 영향이 100달러와 예상 지출의 40%를 넘는 이상 지출을 알린다. opt-out은 언제든 할 수 있으며, 그러려면 계정의 cost monitor와 alert subscription을 모두 삭제해야 한다.
- 일일 요약은 전날 알림 가운데 상위 10개를 비용 영향 순으로 정리한 이메일이다. 매일 UTC 00:00에 만들어지며 실제 도착 시각은 달라질 수 있다. 탐지되는 대로 받으려면 SNS topic이 필요한 개별 알림을 쓴다.
- 임계 미만의 이상도 ML 모델은 계속 탐지하며 `Detected anomalies` 탭에 남는다. 알림이 없었다는 사실을 이상이 없었다는 뜻으로 읽지 않는다.
- 기본 구독은 비용 영향이 100달러와 예상 지출의 40%를 함께 넘는 이상만 알리므로, 비용 영향이 100달러 미만인 이상은 증가율이 커도 알리지 않는다. 월 비용이 작은 계정은 임계를 낮추거나 [[Budget-Alert|예산 알림]]을 함께 두는 구성을 검토한다(운영 제안).

## 탐지 시점과 범위의 한계

- 할인 적용 후 **net unblended cost**를 대상으로, 청구 데이터 처리 뒤 하루 약 세 번 분석한다. 이상 탐지 안내는 데이터 지연과 탐지에 최대 24시간이 걸릴 수 있다고 설명하지만, Cost Explorer 개요와 데이터 탐색 안내에는 상위 청구 데이터에 따라 일부 반영이 24시간보다 늦을 수 있다는 예외가 있다(2026-10-26 대조). 따라서 이를 모든 비용의 반영이나 탐지를 보장하는 24시간 상한으로 사용하지 않는다. 개별 알림도 사용 순간의 경보가 아니다.
- 새 monitor는 탐지를 시작하기까지 최대 24시간이 걸릴 수 있다. 새 서비스는 10일 분량의 과거 사용 데이터가 필요하다.
- AWS Marketplace의 타사 제품/서비스는 감시하지 않는다. 단, Amazon Bedrock의 타사 파운데이션 모델은 포함한다. 그 밖의 Marketplace 비용은 AWS Budgets 등으로 별도 추적한다.

## 비용 증가의 조사 후보

- 실수로 켠 대형 인스턴스, 지우지 않은 리소스
- 무한 루프/재시도로 폭증한 Lambda/요청 수
- 데이터 전송 급증([[Egress-Cost]]), 로그 폭증([[Long-Term-Retention]])
- 침해로 인한 비정상 사용(크립토 마이닝 등) — 보안 신호이기도 함

### 서비스별 합계에서 조사 범위를 좁힌다

2026-10-26 Cost Explorer 공식 안내 대조 기준이다. 먼저 비교 기간과 비용 지표를 고정하고 `Group by`를 `Service`로 두어 비용이 큰 서비스를 찾는다. `Linked account`, `Region`, `Service` 필터로 대상 범위를 좁힌 뒤 사용 유형과 운영 기록을 확인한다. 그룹화는 선택한 범위의 합계를 나누는 것이고, 필터는 분석에 포함할 데이터를 제한하는 것이다.

서비스별 차트는 비용 상위 9개를 보여 준다는 공식 기능 설명을 따른다. 차트에 보이는 항목 수를 사용한 서비스의 전체 수로 해석하지 않고, 아래 표의 금액과 선택한 조건의 전체 데이터 CSV를 확인한다. 서비스별 합계에서 데이터 전송 비용은 관련 EC2나 S3 등에 포함되므로 별도의 전송 서비스 행이 없다는 이유로 전송 비용을 0으로 판단하지 않는다.

Cost Explorer는 비용 데이터를 적어도 24시간마다 갱신하지만 일부 청구 데이터는 더 늦게 도착할 수 있다. 전날 사용분이 모두 확정됐다고 가정하지 않고 조회 시각과 조건을 남긴다(운영 제안). 진행 중인 달의 추정 비용과 월말 예상액도 확정 청구서와 구분한다.

### EC2-Other는 사용 유형으로 나눠 읽는다

2026-10-14 AWS Cost Explorer와 CUR 문서, AWS Price List와 AWS Cloud Financial Management 블로그 대조 기준이다. `EC2-Other`는 AWS 제품 이름이 아니라 Cost Explorer가 EC2 비용을 나눈 서비스 범주다. 2019-09 AWS 블로그 기준, 인스턴스 가동 시간 비용을 EC2가 다른 서비스와 맞물려 생기는 비용과 따로 보도록 나뉘어 있으며, EBS 볼륨과 스냅샷, NAT Gateway, 데이터 전송 등이 여기에 모인다. 범주 이름만으로는 원인을 알 수 없으므로 다음 순서로 나눈다.

1. Service 필터를 `EC2-Other`로 좁히고 Usage type으로 그룹화한다. 차트는 그룹 일부만 그리므로(서비스로 묶으면 비용 상위 9개) 전체 목록은 차트 아래 데이터 표나 CSV 내려받기로 확인한다.
2. 사용 유형의 앞부분은 리전 billing code다. `USE1-USW2-AWS-Out-Bytes`는 us-east-1에서 us-west-2로 나간 리전 간 전송이며, 요금은 보낸 리전의 Out 행에 붙는다. 같은 리전의 AZ 간 전송은 `DataTransfer-Regional-Bytes`로 기록되고 송신과 수신이 각각 계량되어 행이 두 개 생긴다. 리전 접두사가 없는 데이터 전송 사용 유형은 us-east-1의 전송이다.
3. EC2 관련 비용이 특정 날이나 달에만 크게 튀면 사용량 증가로 보기 전에 예약 요금인지 확인한다. Charge type 필터의 `Upfront reservation fee`(RI)와 `Savings Plan upfront fee`는 구매 시점에 급증을 만든다. 부분 선결제와 무선결제 RI의 `Recurring reservation fee`는 매월 1일에 청구되어 일별 차트에서 급증처럼 보인다. CUR에서 RI 선결제는 `AmazonEC2` 제품 코드의 `Fee` 행이고, Savings Plans 선결제는 별도 제품 코드 `ComputeSavingsPlans`의 `SavingsPlanUpfrontFee` 행이다. 기간별 유효 비용은 아래 [[Cost-Anomaly#선결제와 사용량 증가를 구분한다|상각 비용]]으로 본다.
4. 퍼블릭 IPv4 주소는 Elastic IP를 포함해 2024-02-01부터 연결 여부와 관계없이 시간당 과금된다. 2026-09-17 게시 AWS Price List(us-east-1)에서 이 요금의 사용 유형 `USE1-PublicIPv4:InUseAddress`, `USE1-PublicIPv4:IdleAddress`는 Amazon VPC 상품에 속한다. Elastic IP를 EC2-Other 구성 요소로 든 자료가 있어도 EC2-Other와 VPC 서비스를 함께 확인한다(운영 제안).

정리 대상은 분해 결과로 고른다. 2023-06 AWS 블로그 기준, Compute Optimizer와 Trusted Advisor는 연결되지 않은 EBS 볼륨과 gp2에서 gp3로의 전환 같은 볼륨 유형 변경을 권고한다. AMI를 등록 해제해도 기본적으로 스냅샷은 지워지지 않고 저장 요금이 계속되므로, 등록 해제할 때 연결된 스냅샷을 함께 지우거나 따로 지운다. 다른 AMI가 함께 쓰는 스냅샷은 삭제를 지정해도 지워지지 않는다. gp3 전환 전 성능 비교는 [[Storage-Tiering|스토리지 티어링]], NAT Gateway와 전송 경로는 [[Egress-Cost|데이터 전송 비용]]을 따른다.

## 에이전트로 조사할 때도 원인과 조치를 나눈다

Amazon Q Developer의 비용 조사 기능은 비용 기여 차원을 분해하고 사용량 증가와 단가 변화를 구분한다. 사용량 변화는 CloudTrail 이벤트와 연결하고, 단가 변화는 가격과 할인 구성을 분석한다. 필요한 로그가 없으면 사용 가능한 비용 데이터로 조사하므로, 설명이 생성됐다는 사실만으로 원인까지 입증된 것은 아니다(2026-10-07 공식 문서 기준).

별도 에이전트를 만드는 경우에도 다음처럼 조사와 실행의 경계를 둔다. 이는 서비스의 자동 보장이 아니라 운영 설계 제안이다.

1. **범위 고정:** 대상 계정, 리전, 서비스, 비교 기간과 비용 산식을 기록한다. 청구 데이터와 운영 지표의 집계 시간대를 맞춘다.
2. **근거 수집:** 비용 증가 구간을 사용량, 요청 로그와 배포 이력에 연결한다. 실행한 쿼리, 조회 시각과 결과를 남겨 재현할 수 있게 한다.
3. **가설 분리:** 사용량 증가, 단가 변화와 할인 재배분을 구분한다. 로그가 없거나 리소스 연결이 불완전하면 미확인으로 남긴다.
4. **조치 검토:** 삭제, 축소와 약정 구매를 조사 도구에 한꺼번에 위임하지 않는다. 서비스 소유자, 피크 부하와 복구 방법을 확인한 뒤 승인된 경로로 실행한다.

분석 시간 단축, 예상 절감액과 실제 청구 절감은 별도 지표다. 쿼리 비용, 에이전트 비용과 사람의 검토 시간을 포함해 비교한다. AWS의 조사 기능 자체 요금과 별개로 CloudWatch Logs Insights 같은 하위 서비스 사용료가 발생할 수 있다.

### 선결제와 사용량 증가를 구분한다

월별 총액이 커졌다고 사용량이 늘었다고 단정하지 않는다. 2026-10-14 AWS 문서 대조 기준, Savings Plans의 All Upfront와 Partial Upfront 구매에는 일회성 `SavingsPlanUpfrontFee`가 생긴다. Cost Explorer의 amortized cost는 예약 선결제와 정기 요금을 기간에 배분하며, net amortized cost는 할인도 반영한다. 청구 시점의 급증과 기간별 유효 비용은 다른 질문에 답한다.

다음은 비용 조사에 적용하는 점검 순서다.

1. 비교할 계정, 기간, 필터와 비용 지표를 고정하고 서비스와 charge type으로 증가분을 나눈다.
2. 선결제 항목은 실제 지출로 보존하면서 사용량 증가 조사에서 따로 분리한다. 약정 비용을 제거한 금액을 총비용이나 절감액으로 보고하지 않는다.
3. 사용량과 단가, 할인 배분을 각각 대조한다. Cost Anomaly Detection은 net unblended cost를 쓰므로 상각 비용 차트를 탐지 입력과 같은 값으로 취급하지 않는다.

Savings Plans의 `SavingsPlanCoveredUsage`에 표시된 unblended cost는 할인 전 온디맨드 금액이며 `SavingsPlanNegation`이 이를 상쇄한다. 사용 항목만 더해 과다 지출로 판단하지 않고, 약정에 배분된 사용 비용은 `savingsPlan/SavingsPlanEffectiveCost`와 함께 확인한다. 이 절은 청구 해석 기준이며 실제 계정의 절감이나 장애 원인을 확인한 결과가 아니다.

## 운영 팁

- **태그 기반 Monitor**로 팀/서비스별 책임 소재를 명확히. [[AWS-Cost-Optimization|태그 정책]]
- 알림 임계를 적절히 — 너무 낮으면 [[Alert-Fatigue|알람 피로]], 너무 높으면 놓침.
- 이상 탐지(패턴 변화) + 예산 알람(임계) + 예산 액션(선택한 조치)을 **층으로** 운영. 액션의 대상, 권한과 실행 결과는 [[Budget-Alert]]에서 구분한다.

## 흔한 함정

- 이상 탐지만 믿음 → 탐지 지연 중에도 비용 발생. 탐지 자체로 자동 차단되지 않음
- 선택한 값을 합산하는 customer managed monitor만 사용 → 작은 범위의 증가가 합계에 묻힐 수 있음. AWS services monitor는 서비스별로 평가함
- 알림 임계를 너무 낮게 설정 → 소액 이상까지 알려 피로. 너무 높으면 탐지된 이상도 알림에서 제외됨
- 새 monitor/서비스를 만들자마자 탐지된다고 기대 → 초기 지연과 학습 기간을 놓침
- 탐지 후 근본 원인 분해를 안 봐 대응이 느림

## 면접 체크포인트

- 이상 탐지(추세 급변) vs 예산 알람(임계)의 역할 분담
- ML 베이스라인과 Monitor 범위(AWS services/연결 계정/비용 카테고리/태그) 설계
- 자동 근본 원인 분해의 가치
- 폭증의 흔한 원인(미삭제 리소스, 재시도, 전송, 침해)
- EC2-Other를 사용 유형으로 분해하고 선결제 급증과 사용량 증가를 구분하는 방법
- 탐지 + 알람 + 액션을 층으로 두는 운영

## 출처

2026-10-26에는 서비스별 그룹화, 필터, 표와 CSV의 범위 및 비용 데이터의 지연 예외를 대조했다. 예측 기간의 공식 문서 간 차이는 위에 남겼으며, 실제 계정 화면과 청구 내역을 확인한 것은 아니다. 다른 항목의 기존 검증일은 유지한다.

- [AWS Cost Management, Analyzing your costs and usage with AWS Cost Explorer](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html)
- [AWS Cost Management, Exploring your data using Cost Explorer](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-exploring-data.html)

2026-10-07에는 탐지 지연과 근본 원인 분해, Amazon Q Developer의 비용 조사 범위를 대조했다. 위 조사 절차는 이를 적용한 설계 제안이다. 2026-10-12에는 Cost Explorer 활성화 시 기본 구성과 일일 요약, 임계 미만 탐지의 표시 범위를 대조했다. 2026-10-14에는 EC2-Other의 사용 유형 분해, 데이터 전송 사용 유형, 선결제 charge type과 퍼블릭 IPv4 사용 유형의 상품 분류를 대조했다.

- [AWS Cost Management, Enabling Cost Explorer](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-enable.html)
- [AWS Cost Management, Opting out of Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/opting-out-cad.html)
- [AWS Cost Management, Investigating anomaly root causes with Amazon Q Developer](https://docs.aws.amazon.com/cost-management/latest/userguide/investigating-ad.html)
- [AWS Cost Management, Getting started with AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/getting-started-ad.html)
- [AWS Cost Management, Detecting unusual spend with AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html)
- [AWS Cost Management, Using AWS User Notifications with Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/cad-user-notifications.html)
- [AWS Cost Management, Choosing advanced options](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-advanced.html)
- [AWS Data Exports, Understanding Savings Plans](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)
- [AWS Cost Management, Filtering the data that you want to view](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-filtering.html) — charge type의 선결제 항목과 EC2 사용 유형 그룹
- [AWS Cost Management, Reading the Cost Explorer data table](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-table.html) — 그룹별 표와 전체 데이터 CSV
- [AWS, AWS Cost Explorer features](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/features/) — 서비스로 묶은 차트의 상위 9개
- [AWS Data Exports, Understanding data transfer charges](https://docs.aws.amazon.com/cur/latest/userguide/cur-data-transfers-charges.html)
- [AWS Data Exports, Understanding your reservation line items](https://docs.aws.amazon.com/cur/latest/userguide/regular-reserved-instances.html) — RI 선결제 `Fee` 행
- [AWS Regions and Availability Zones, AWS Region billing codes](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-region-billing-codes.html)
- [AWS Price List Bulk API, Amazon VPC offer file (us-east-1)](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonVPC/current/us-east-1/index.json) — 2026-09-17 게시본의 퍼블릭 IPv4 사용 유형
- [Amazon EC2 User Guide, Deregister an Amazon EC2 AMI](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/deregister-ami.html) — 등록 해제 뒤 남는 스냅샷 요금
- [Tips and Tricks for Exploring your Data in AWS Cost Explorer — AWS Cloud Financial Management Blog](https://aws.amazon.com/blogs/aws-cloud-financial-management/tips-and-tricks-for-exploring-your-data-in-aws-cost-explorer-part-2/) — 2019-09 게시, EC2-Other 범주의 분리 이유와 구성. Elastic IP를 포함한 구성 목록은 2024-02 퍼블릭 IPv4 과금 시작 전 기준이다.
- [Optimize and save on “other” services — AWS Cloud Financial Management Blog](https://aws.amazon.com/blogs/aws-cloud-financial-management/optimize-and-save-on-the-other-services/) — 2023-06 EBS 권고 도구와 스냅샷 정리
- [New – AWS Public IPv4 Address Charge + Public IP Insights — AWS News Blog](https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights/) — 2023-07 게시, 2024-02-01 과금 시작과 Elastic IP 포함
- [What is EC2-Other? — Amazon Web Services](https://www.youtube.com/watch?v=puiB59ni7bA)

## 관련 문서

- [[Budget-Alert|AWS Budgets (임계/액션)]]
- [[AWS-Cost-Optimization|AWS 비용 최적화 (가시화 도구)]]
- [[Egress-Cost|데이터 전송 비용 (폭증 원인)]]
- [[Alert-Fatigue|Alert fatigue (알림 임계)]]
- [[AI-Workflow-Knowledge-Loop|AI 업무와 지식 환류]] — 조사 결과와 현재 환경의 구분
