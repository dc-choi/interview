---
tags: [finops, aws, budgets, alert, budget-actions, governance]
status: done
verified_at: 2026-10-03
category: "비용&운영(FinOps)"
aliases: ["Budget Alert", "예산 알람", "AWS Budgets", "예산 가드레일"]
---

# 예산 알람 (AWS Budgets)

비용/사용량 목표와 알림 임계를 정하고 대응 조치를 연결하는 도구. 이상 탐지([[Cost-Anomaly]])가 평소와 다른 급변을 본다면, Budgets는 **정해둔 금액/사용량을 넘는지**를 본다. **예산과 Budget Actions는 지출 상한을 보장하지 않는다.**

AWS Budgets 정보는 하루 최대 세 번, 보통 이전 갱신 후 8~12시간에 갱신된다. 사용량이 청구 데이터로 반영되는 지연도 있어, 알림을 받기 전이나 받은 뒤에도 비용이 임계를 초과할 수 있다.

## 예산 종류

| 종류 | 추적 대상 |
|---|---|
| **Cost budget** | 기간별 비용 금액 |
| **Usage budget** | 사용량(예: EC2 시간, 데이터 GB) |
| **RI/SP budget** | 약정의 **활용률/커버리지** ([[Reserved-Instance]]) |

비용 예산은 서비스/연결 계정/활성화된 비용 할당 태그/비용 카테고리로 범위를 좁혀 팀 단위로도 관리한다. 연결 계정 필터는 멤버 계정에서 사용할 수 없다. [[AWS-Cost-Optimization|태그 정책]]과 결합.

## Actual vs Forecasted — 두 임계

알림 임계를 두 종류로 건다.

- **Actual(실제)**: 집계된 실제 비용/사용량이 임계를 넘으면 알림 → 사후.
- **Forecasted(예측)**: 추세로 볼 때 **예산 기간 말에 임계를 넘을 것으로 예측되면** 알림 → 선제.

예측에는 약 5주 분량의 사용 이력이 필요하다. 이력이 부족한 새 계정에서는 예측 알림에만 의존하지 않는다. 각 Actual 알림은 해당 예산 기간에 처음 임계에 도달했을 때 한 번 보내므로, 반복 경보로 간주하지 않는다.

## Budget Actions — 임계에 연결하는 제한된 조치

비용/사용량 예산의 임계에 자동 실행 또는 수동 승인 후 실행할 조치를 연결한다.

- **IAM/SCP 적용**: 정책이 지정한 주체와 API의 권한을 제한한다. 신규 생성 제한 정책을 붙여도 기존 리소스의 과금이 일괄 중단되지는 않는다. SCP 조치는 관리 계정에서 설정한다.
- **EC2/RDS 중지**: 같은 계정의 지정한 인스턴스만 대상으로 한다. 다른 계정의 인스턴스를 직접 중지할 수 없으며, 리소스의 중지 지원 조건도 확인해야 한다.

임계 충족, 승인과 실행 성공은 별개다. 실행 역할과 설정 사용자의 권한이 부족하면 조치가 실행되지 않는다. 승인 대기와 실행 결과를 확인한다.

중지 후에도 EC2 EBS와 RDS 스토리지/백업 비용은 남는다. ASG 소속 EC2는 중지하면 대체 인스턴스가 생성될 수 있고, RDS DB 인스턴스는 7일 연속 중지 후 자동 재시작한다. dev/test에서도 재생성 경로와 남는 비용을 확인하며, 프로덕션 자동 중지는 가용성과 복구 영향을 먼저 검토한다.

## Notifications — 책임자 통보

- 예산 임계 알림은 이메일 수신자 또는 Amazon SNS topic으로 보낸다.
- Slack 전달은 SNS를 받은 별도 채팅 연동을 통해 구성하며, Budget Action 자체가 아니다.
- SNS 발행 권한과 수신 구독 확인을 별도로 점검한다.

## 층으로 쓰기

아래는 설명용 예시이며 공통 권장값이 아니다. 비용 증가 속도, 데이터 지연, 대응 시간과 서비스 중요도에 맞춰 임계를 정한다.

```
예측 80% → 이메일/SNS 알림 (조심)
실제 100% → 이메일/SNS 알림 + 책임자 에스컬레이션
실제 120% → Budget Action으로 지정한 dev 신규 생성 API 제한
```

이상 탐지(급변) + 예산 알람(임계) + 예산 액션(선택한 조치)을 함께 두어 대응을 보완한다. 120% 조치는 이미 초과한 뒤의 대응이므로, 반드시 지켜야 할 목표액이 있다면 더 이른 경고와 자원별 통제를 검토한다.

## 흔한 함정

- Actual만 설정 → 예측 경고 기회를 놓칠 수 있음. 이력이 부족하면 예측도 동작하지 않음
- 합산 예산만 확인 → 팀/서비스별 초과 원인 파악이 어려움. 범위별 예산과 비용 분석으로 좁힘
- Budget Action을 프로덕션에 공격적으로 → 서비스 중단 위험
- 임계를 100% 한 개만 → 데이터 지연과 대응 시간에 따른 여유가 부족할 수 있음
- 예산을 만들고 알림 수신자를 관리 안 해 아무도 안 봄
- 액션을 설정했다는 이유로 총지출이 멈췄다고 간주 → 실행 실패, 승인 대기, 남는 비용을 놓침

## 면접 체크포인트

- Budgets(임계) vs Cost Anomaly(급변)의 역할 분담
- Cost/Usage/RI-SP 예산 종류
- Actual vs Forecasted 임계, 예측 알림의 가치
- Budget Actions의 대상/권한/승인/실행 결과와 지출 상한을 보장하지 않는 이유
- 예측/실제/액션을 층으로 거는 가드레일 설계

## 출처

- [AWS, AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)
- [AWS, Configuring budget actions](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html)
- [AWS, Configuring a budget action](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-action-configure.html)
- [AWS, Best practices for AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html)
- [AWS, Budget filters](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create-filters.html)
- [AWS, Receiving budget alerts in chat applications](https://docs.aws.amazon.com/cost-management/latest/userguide/sns-alert-chime.html)
- [AWS, How EC2 instance stop and start works](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-ec2-instance-stop-start-works.html)
- [AWS, Stopping an Amazon RDS DB instance temporarily](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_StopInstance.html)

## 관련 문서

- [[Cost-Anomaly|비용 이상 탐지]]
- [[AWS-Cost-Optimization|AWS 비용 최적화 (가시화)]]
- [[Reserved-Instance|RI / SP (활용률 예산)]]
- [[AWS-Pricing|AWS 요금 구조]]
