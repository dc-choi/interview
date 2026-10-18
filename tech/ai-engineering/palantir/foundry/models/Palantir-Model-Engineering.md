---
tags: [palantir, foundry, mlops, models]
status: index
category: "AI엔지니어링(AIEngineering)"
---

# Palantir 모델 엔지니어링

모델 artifact, adapter, 평가, release와 소비자 version을 구분해 학습한다. 이 지식은 공개 문서의 계약이며 실제 enrollment에서 model을 운영한 증거는 아니다.

1. [[Palantir-Model-Training]]: 문제 정의, 학습 환경, GPU와 Marketplace
2. [[Palantir-Model-Studio]]: no-code trainer, parameter와 run 재현성
3. [[Palantir-Model-Integration-Contracts]]: typed adapter, serializer, container와 외부 모델
4. [[Palantir-Model-Inference]]: version pinning, sidecar와 분산 inference
5. [[Palantir-Model-Evaluation]]: Experiment, Evaluation, objective와 legacy MetricSet
6. [[Palantir-Model-Operations]]: 배포, approval 범위, HTTP 오류, 사용량과 history
7. [[Palantir-Model-Lifecycle]]: LLM deprecation과 foundry_ml migration

## 판단의 연결

- [[Palantir-Data-and-Model-Integration]]
- [[Palantir-Model-Deployment-and-Monitoring]]
- [[Palantir-OSDK]]
- [[Palantir-Registered-Models-and-Provider-Proxies]]

## 이해 확인

- latest model을 읽는데 adapter code는 옛 버전일 수 있는 조건과 sidecar가 이를 바꾸는 이유를 설명한다.
- objective check, branch approval과 release가 각각 무엇을 강제하는지 구분한다.
- 같은 dataset transaction을 고르지 않은 metric 비교와 누락 가능한 inference history의 한계를 설명한다.
