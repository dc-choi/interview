---
tags: [kubernetes, infrastructure, observability, finops, index]
status: index
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["K8s Right-Sizing", "Kubernetes Right Sizing", "Pod 리소스 적정화"]
---

# Kubernetes Resource Right-Sizing

Pod의 `resources.requests`와 `limits`를 실측 사용 패턴에 맞추는 작업. 기준 수립, 측정 쿼리, 컴포넌트별 적용 세 축으로 나눠 둔다.

## 목차

- [[K8s-Resource-Right-Sizing-Criteria|기준 수립 (requests의 스케줄링 의미, Memory vs CPU 버퍼 전략, 측정 지표, P95 집계, 측정 기간, 적정 Request 역산식)]]
- [[K8s-Resource-Right-Sizing-PromQL|PromQL 쿼리 (Memory 사용률, CPU 사용률, Throttling 비율과 조치 해석표)]]
- [[K8s-Resource-Right-Sizing-Component-Rollout|컴포넌트별 버퍼 차등과 적용 (벤더 권장치 비교, 적용 순서와 롤백 기준, 트레이드오프, 면접 체크포인트)]]

## 관련 문서

- [[k8s|Kubernetes]] — 상위 폴더 인덱스
