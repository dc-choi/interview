---
tags: [finops, aws, cost-anomaly-detection, monitoring, ml, alert]
status: done
category: "비용&운영(FinOps)"
aliases: ["Cost Anomaly", "Cost Anomaly Detection", "비용 이상 탐지"]
---

# 비용 이상 탐지 (Cost Anomaly Detection)

예산 초과를 월말 청구서에서 발견하면 이미 늦다. **비용이 평소 패턴에서 벗어나는 순간 자동으로 잡아내는** 것이 이상 탐지다. 예산 알람([[Budget-Alert]])이 정해둔 선을 넘는지 본다면, 이상 탐지는 **평소와 다른 급변**을 본다. 둘은 보완 관계다.

## 무엇이 다른가 — Anomaly vs Budget

| | Cost Anomaly Detection | AWS Budgets |
|---|---|---|
| 트리거 | 평소 패턴 대비 **비정상 급변** | 미리 정한 **금액/사용량 임계** |
| 방식 | ML이 베이스라인 학습 | 사용자가 임계 설정 |
| 강점 | 예상 못 한 폭증 포착 | 명시적 상한 강제 |
| 약점 | 임계가 아니라 추세라 즉각 차단은 못 함 | 평소와 다른 미세 급증은 못 봄 |

예산은 "넘지 마"고, 이상 탐지는 "어, 평소랑 다른데?"다.

## 작동 방식

- **Monitor 정의**: 무엇을 감시할지 — 전체 서비스, 특정 서비스(예: EC2만), 계정(Organizations), 비용 카테고리, 태그(Cost Allocation Tag) 단위.
- **ML 베이스라인**: 과거 사용 패턴을 학습해 정상 범위를 만들고, 벗어나면 이상으로 표시.
- **근본 원인 분해**: 이상 발생 시 어느 서비스/사용 유형/리전이 기여했는지 자동 분석.
- **Alert Subscription**: 임계 금액 이상의 이상에 대해 이메일/SNS로 알림(개별 또는 일/주 요약).

## 흔한 원인 — 무엇을 잡아주나

- 실수로 켠 대형 인스턴스, 지우지 않은 리소스
- 무한 루프/재시도로 폭증한 Lambda/요청 수
- 데이터 전송 급증([[Egress-Cost]]), 로그 폭증([[Long-Term-Retention]])
- 침해로 인한 비정상 사용(크립토 마이닝 등) — 보안 신호이기도 함

## 운영 팁

- **태그 기반 Monitor**로 팀/서비스별 책임 소재를 명확히. [[AWS-Cost-Optimization|태그 정책]]
- 알림 임계를 적절히 — 너무 낮으면 [[Alert-Fatigue|알람 피로]], 너무 높으면 놓침.
- 이상 탐지(추세) + 예산 알람(상한) + 예산 액션(차단)을 **층으로** 운영.

## 흔한 함정

- 이상 탐지만 믿고 상한(예산 액션)을 안 둠 → 탐지해도 자동 차단 안 됨
- 전체 한 Monitor만 → 작은 서비스의 폭증이 큰 비용에 묻힘
- 알림 임계 미설정 → 소액 이상까지 알려 피로
- 탐지 후 근본 원인 분해를 안 봐 대응이 느림

## 면접 체크포인트

- 이상 탐지(추세 급변) vs 예산 알람(임계)의 역할 분담
- ML 베이스라인과 Monitor 범위(서비스/계정/태그) 설계
- 자동 근본 원인 분해의 가치
- 폭증의 흔한 원인(미삭제 리소스, 재시도, 전송, 침해)
- 탐지 + 알람 + 액션을 층으로 두는 운영

## 출처

- [AWS — Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/getting-started-ad.html)

## 관련 문서

- [[Budget-Alert|AWS Budgets (임계/액션)]]
- [[AWS-Cost-Optimization|AWS 비용 최적화 (가시화 도구)]]
- [[Egress-Cost|데이터 전송 비용 (폭증 원인)]]
- [[Alert-Fatigue|Alert fatigue (알림 임계)]]
