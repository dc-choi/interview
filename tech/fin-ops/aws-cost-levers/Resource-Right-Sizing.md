---
tags: [finops, aws, right-sizing, compute-optimizer, graviton, utilization]
status: done
category: "비용&운영(FinOps)"
aliases: ["Resource Right-Sizing", "리소스 적정화", "right-sizing", "다운사이징"]
---

# 리소스 적정화 (Right-Sizing)

프로비저닝한 용량을 **실제 사용량에 맞추는** 작업. 대부분의 인스턴스는 만일을 대비해 과대 할당되어 절반도 안 쓰인다. Right-sizing은 그 격차를 줄여 **유휴에 내는 돈을 없앤다**. 약정/Spot보다 먼저 해야 하는 1순위 절감이다 — **안 쓰는 용량은 약정해도 낭비**이기 때문이다. [[Reserved-Instance]]

> 측정 방법론(P95, 집계 기간, PromQL) 자체는 [[K8s-Resource-Right-Sizing]]을 참조. 여기서는 비용 의사결정 관점.

## 무엇을 보고 줄이나

실제 사용 지표를 일정 기간(2주~한 달) 관찰한다.

- **CPU/메모리 사용률**: 피크와 평균. 평균 10%, 피크 30%면 과대.
- **네트워크/디스크 IOPS**: 인스턴스 타입이 IO에 묶였는지.
- **P95/P99 기준**: 평균이 아니라 꼬리로 봐야 피크를 못 버티는 다운사이징을 피함.

순간 평균이 아니라 **분포로** 판단하는 게 핵심 — 평균만 보면 피크에 터지고, 피크만 보면 영원히 과대.

## 도구 — Compute Optimizer

- **AWS Compute Optimizer**: EC2, ASG, EBS, Lambda, ECS(Fargate)의 사용 지표를 분석해 **다운사이징/업사이징 추천**과 예상 절감액 제시.
- **Cost Optimization Hub**: 전 계정의 추천을 한 화면에 집계. [[AWS-Cost-Optimization]]
- 추천을 그대로 믿지 말고 피크/계절성을 함께 확인.

## 레버

- **다운사이징**: 한 단계 작은 타입으로(예: `xlarge` → `large`).
- **타입 변경**: CPU 위주면 c계열, 메모리 위주면 r계열로 워크로드에 맞춤.
- **Graviton(ARM) 이전**: 대부분 런타임(Node.js, Java, Python) 무변경 이식, ~20% 단가↓ + 성능↑.
- **유휴/고아 리소스 제거**: 미사용 EBS, Elastic IP, 안 붙은 ELB, 오래된 스냅샷.
- **상시/스케줄 결합**: 적정 단위로 줄인 뒤 [[Autoscaling-Cost|오토스케일링]]으로 변동 흡수.

## 절감 순서

```
1. 유휴/고아 제거 (가장 쉬움)
2. Right-sizing (사용량에 맞춤)
3. Graviton/타입 최적화
4. 그 위에 약정(RI/SP) + Spot
```

right-sizing을 건너뛰고 약정부터 하면 **과대 용량을 1~3년 약정**하는 셈이라 손해다.

## 흔한 함정

- 평균만 보고 다운사이징 → 피크에 성능 저하/장애
- 약정/Spot을 right-sizing보다 먼저 → 과대 용량을 약정
- Compute Optimizer 추천을 계절성 무시하고 적용
- 다운사이징 후 모니터링 안 함 → 포화를 놓침([[Connection-Pool]], saturation)
- 유휴 리소스(고아 EBS/EIP)를 방치

## 면접 체크포인트

- right-sizing이 약정/Spot보다 선행돼야 하는 이유(과대 용량 약정 방지)
- 평균이 아니라 P95/분포로 판단하는 이유
- Compute Optimizer/Cost Optimization Hub의 역할과 한계
- 다운사이징/타입 변경/Graviton/고아 제거 레버
- 절감 순서(유휴 제거 → right-size → 최적화 → 약정)

## 출처

- [AWS — Compute Optimizer](https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html)
- [AWS — Right Sizing guidance](https://docs.aws.amazon.com/whitepapers/latest/cost-optimization-right-sizing/cost-optimization-right-sizing.html)

## 관련 문서

- [[K8s-Resource-Right-Sizing|메트릭 기반 적정화 (P95, PromQL)]]
- [[Reserved-Instance|RI / SP (right-sizing 후 약정)]]
- [[Autoscaling-Cost|오토스케일링 비용]]
- [[AWS-Cost-Optimization|AWS 비용 최적화]]
- [[AWS-Pricing|AWS 요금 구조]]
