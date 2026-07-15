---
tags: [finops, aws, budgets, alert, budget-actions, governance]
status: done
category: "비용&운영(FinOps)"
aliases: ["Budget Alert", "예산 알람", "AWS Budgets", "예산 가드레일"]
---

# 예산 알람 (AWS Budgets)

비용에 **명시적인 상한선과 가드레일**을 거는 도구. 이상 탐지([[Cost-Anomaly]])가 평소와 다른 급변을 본다면, Budgets는 **정해둔 금액/사용량을 넘는지**를 본다. 단순 알림을 넘어 **자동 조치**까지 걸 수 있어 예방적 통제의 핵심이다.

## 예산 종류

| 종류 | 추적 대상 |
|---|---|
| **Cost budget** | 월/분기 비용 금액 |
| **Usage budget** | 사용량(예: EC2 시간, 데이터 GB) |
| **RI/SP budget** | 약정의 **활용률/커버리지** ([[Reserved-Instance]]) |

서비스/계정/태그/비용 카테고리로 범위를 좁혀 팀 단위 예산도 가능. [[AWS-Cost-Optimization|태그 정책]]과 결합.

## Actual vs Forecasted — 두 임계

알림 임계를 두 종류로 건다.

- **Actual(실제)**: 이미 쓴 금액이 임계를 넘으면 알림 → 사후.
- **Forecasted(예측)**: 추세로 볼 때 **월말에 넘을 것 같으면** 미리 알림 → 선제. 보통 80% 예측 + 100% 실제를 함께 건다.

예측 알림이 있어야 월 중반에 손쓸 수 있다.

## Budget Actions — 알림을 넘어 차단

임계 도달 시 **자동 조치**를 실행한다(승인 단계 둘 수 있음).

- **IAM/SCP 적용**: 신규 리소스 생성 권한을 제한(deny 정책 부착).
- **EC2/RDS 중지**: 비핵심 환경의 인스턴스 정지.
- **SNS/Slack 통보**: 책임자에게 에스컬레이션.

dev/test 환경에 특히 유용 — 실험 비용이 폭주하면 자동으로 묶는다. 프로덕션엔 차단보다 통보 위주로.

## 층으로 쓰기

```
예측 80% → 알림 (조심)
실제 100% → 알림 + 책임자 에스컬레이션
실제 120% → Budget Action으로 dev 신규 생성 차단
```

이상 탐지(급변) + 예산 알람(상한) + 예산 액션(강제)을 함께 두면 빈틈이 준다.

## 흔한 함정

- Actual만 걸고 Forecasted를 안 둠 → 월말에야 초과 인지
- 전체 한 예산만 → 어느 팀/서비스가 넘겼는지 모름(태그별 예산 필요)
- Budget Action을 프로덕션에 공격적으로 → 서비스 중단 위험
- 임계를 100% 한 개만 → 경고 여유 없음(80/100/120 층 권장)
- 예산을 만들고 알림 수신자를 관리 안 해 아무도 안 봄

## 면접 체크포인트

- Budgets(임계) vs Cost Anomaly(급변)의 역할 분담
- Cost/Usage/RI-SP 예산 종류
- Actual vs Forecasted 임계, 예측 알림의 가치
- Budget Actions로 알림을 넘어 자동 차단(dev에 유용, prod는 통보)
- 예측/실제/액션을 층으로 거는 가드레일 설계

## 출처

- [AWS — AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)
- [AWS — Budget Actions](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html)

## 관련 문서

- [[Cost-Anomaly|비용 이상 탐지]]
- [[AWS-Cost-Optimization|AWS 비용 최적화 (가시화)]]
- [[Reserved-Instance|RI / SP (활용률 예산)]]
- [[AWS-Pricing|AWS 요금 구조]]
