---
tags: [finops, aws, cost-anomaly-detection, monitoring, ml, alert]
status: done
verified_at: 2026-10-12
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

- Cost Explorer는 콘솔에서 처음 열 때 활성화되며 API로는 켤 수 없다. 켜면 이번 달과 지난 13개월의 비용 데이터를 준비하고 다음 12개월을 예측한다. 이번 달 데이터는 약 24시간 뒤에 보이고 나머지는 며칠 더 걸린다.
- 활성화 과정에서 AWS가 Cost Anomaly Detection을 자동 구성한다. AWS services monitor 하나와 일일 요약 alert subscription을 만들고, 대부분의 AWS 서비스에서 비용 영향이 100달러와 예상 지출의 40%를 넘는 이상 지출을 알린다. opt-out은 언제든 할 수 있으며, 그러려면 계정의 cost monitor와 alert subscription을 모두 삭제해야 한다.
- 일일 요약은 전날 알림 가운데 상위 10개를 비용 영향 순으로 정리한 이메일이다. 매일 UTC 00:00에 만들어지며 실제 도착 시각은 달라질 수 있다. 탐지되는 대로 받으려면 SNS topic이 필요한 개별 알림을 쓴다.
- 임계 미만의 이상도 ML 모델은 계속 탐지하며 `Detected anomalies` 탭에 남는다. 알림이 없었다는 사실을 이상이 없었다는 뜻으로 읽지 않는다.
- 기본 구독은 비용 영향이 100달러와 예상 지출의 40%를 함께 넘는 이상만 알리므로, 비용 영향이 100달러 미만인 이상은 증가율이 커도 알리지 않는다. 월 비용이 작은 계정은 임계를 낮추거나 [[Budget-Alert|예산 알림]]을 함께 두는 구성을 검토한다(운영 제안).

## 탐지 시점과 범위의 한계

- 할인 적용 후 **net unblended cost**를 대상으로, 청구 데이터 처리 뒤 하루 약 세 번 분석한다. Cost Explorer 데이터는 최대 24시간 지연되어 사용 발생 후 탐지에도 최대 24시간이 걸릴 수 있다. 개별 알림도 사용 순간의 경보가 아니다.
- 새 monitor는 탐지를 시작하기까지 최대 24시간이 걸릴 수 있다. 새 서비스는 10일 분량의 과거 사용 데이터가 필요하다.
- AWS Marketplace의 타사 제품/서비스는 감시하지 않는다. 단, Amazon Bedrock의 타사 파운데이션 모델은 포함한다. 그 밖의 Marketplace 비용은 AWS Budgets 등으로 별도 추적한다.

## 비용 증가의 조사 후보

- 실수로 켠 대형 인스턴스, 지우지 않은 리소스
- 무한 루프/재시도로 폭증한 Lambda/요청 수
- 데이터 전송 급증([[Egress-Cost]]), 로그 폭증([[Long-Term-Retention]])
- 침해로 인한 비정상 사용(크립토 마이닝 등) — 보안 신호이기도 함

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
- 탐지 + 알람 + 액션을 층으로 두는 운영

## 출처

2026-10-07에는 탐지 지연과 근본 원인 분해, Amazon Q Developer의 비용 조사 범위를 대조했다. 위 조사 절차는 이를 적용한 설계 제안이다. 2026-10-12에는 Cost Explorer 활성화 시 기본 구성과 일일 요약, 임계 미만 탐지의 표시 범위를 대조했다.

- [AWS Cost Management, Enabling Cost Explorer](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-enable.html)
- [AWS Cost Management, Opting out of Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/opting-out-cad.html)
- [AWS Cost Management, Investigating anomaly root causes with Amazon Q Developer](https://docs.aws.amazon.com/cost-management/latest/userguide/investigating-ad.html)
- [AWS Cost Management, Getting started with AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/getting-started-ad.html)
- [AWS Cost Management, Detecting unusual spend with AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html)
- [AWS Cost Management, Using AWS User Notifications with Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/cad-user-notifications.html)
- [AWS Cost Management, Choosing advanced options](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-advanced.html)
- [AWS Data Exports, Understanding Savings Plans](https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html)

## 관련 문서

- [[Budget-Alert|AWS Budgets (임계/액션)]]
- [[AWS-Cost-Optimization|AWS 비용 최적화 (가시화 도구)]]
- [[Egress-Cost|데이터 전송 비용 (폭증 원인)]]
- [[Alert-Fatigue|Alert fatigue (알림 임계)]]
- [[AI-Workflow-Knowledge-Loop|AI 업무와 지식 환류]] — 조사 결과와 현재 환경의 구분
