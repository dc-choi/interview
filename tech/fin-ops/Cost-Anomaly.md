---
tags: [finops, aws, cost-anomaly-detection, monitoring, ml, alert]
status: done
verified_at: 2026-10-03
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

## 탐지 시점과 범위의 한계

- 할인 적용 후 **net unblended cost**를 대상으로, 청구 데이터 처리 뒤 하루 약 세 번 분석한다. Cost Explorer 데이터는 최대 24시간 지연되어 사용 발생 후 탐지에도 최대 24시간이 걸릴 수 있다. 개별 알림도 사용 순간의 경보가 아니다.
- 새 monitor는 탐지를 시작하기까지 최대 24시간이 걸릴 수 있다. 새 서비스는 10일 분량의 과거 사용 데이터가 필요하다.
- AWS Marketplace의 타사 제품/서비스는 감시하지 않는다. 단, Amazon Bedrock의 타사 파운데이션 모델은 포함한다. 그 밖의 Marketplace 비용은 AWS Budgets 등으로 별도 추적한다.

## 비용 증가의 조사 후보

- 실수로 켠 대형 인스턴스, 지우지 않은 리소스
- 무한 루프/재시도로 폭증한 Lambda/요청 수
- 데이터 전송 급증([[Egress-Cost]]), 로그 폭증([[Long-Term-Retention]])
- 침해로 인한 비정상 사용(크립토 마이닝 등) — 보안 신호이기도 함

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

- [AWS Cost Management, Getting started with AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/getting-started-ad.html)
- [AWS Cost Management, Detecting unusual spend with AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html)
- [AWS Cost Management, Using AWS User Notifications with Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/cad-user-notifications.html)

## 관련 문서

- [[Budget-Alert|AWS Budgets (임계/액션)]]
- [[AWS-Cost-Optimization|AWS 비용 최적화 (가시화 도구)]]
- [[Egress-Cost|데이터 전송 비용 (폭증 원인)]]
- [[Alert-Fatigue|Alert fatigue (알림 임계)]]
