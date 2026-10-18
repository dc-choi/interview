---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Inference history의 권한, 영구 분리와 기록 누락

objective live의 inference history dataset은 timestamp,user_id,request_uuid,live/objective/model/model_version RID,input/output JSON과 error/stacktrace를 기록한다. direct의 run history/log UI와 별도 기능이다.

## 설정과 보안

설정에는 foundry-ml-live:edit-inference-ledger 권한이 필요하며 보통 objective owner role에 포함된다. parent objective와 같은 project에 새 dataset을 만들어야 하고 기존 dataset은 선택할 수 없다. input/output이 민감할 수 있어 Security Marking과 실제 dataset reader를 확인한다.

Enable Recording toggle은 일시 중단/재개다. Remove는 영구적으로 deployment와 연결을 끊으며 다시 붙일 수 없지만 dataset 파일 자체를 삭제하지는 않는다. 분리 후에는 새 record가 들어가지 않는다.

## 완전성의 한계

source의 captures all이라는 소개와 달리 FAQ는 모든 input/output 기록을 보장하지 않는다고 명시한다. platform performance를 위해 history write 실패를 retry하지 않는다. 누락이 가능하므로 완전한 감사 원장이나 요청 수의 확정 근거로 쓰지 않는다.

drift/quality 평가에는 ground truth와 sampling/누락 검토가 필요하다. 예측 자체를 retraining label로 사용하면 feedback loop가 생길 수 있어 source가 나열한 사용 사례가 무조건 적합한 학습 정책을 의미하지 않는다.

## 출처

- [Palantir, model-inference-history](https://www.palantir.com/docs/foundry/manage-models/model-inference-history)

## 관련 문서

- [[Palantir-Objective-Deployment-Operations]]
- [[Palantir-Model-Evaluation-API]]
