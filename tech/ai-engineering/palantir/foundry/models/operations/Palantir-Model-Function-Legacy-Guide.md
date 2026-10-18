---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 옛 direct-function publishing 문서의 적용 범위

이 문서는 English canonical이404인 상태에서 확보한 Chinese machine-translated alias를 학습했다. 원문 스스로 번역 정확성 미검증을 알리며 현재 API 지원의 근거로 단독 사용하지 않는다.

옛 guide는 Parameter input과 single Parameter output만 direct publishing 가능하다고 제한하고 tabular/multi-output은 Functions on models 경로를 안내한다. 현재 model-functions-guide와 model-adapter-api는 typed tabular/Object/ObjectSet 등을 설명하므로 이 과거 제한을 현재 전체 기능에 확대하지 않는다.

공통으로 유효한 설계 원리는 model API가 같으면 기존 wrapper가 계속 deployment를 가리킬 수 있지만 API가 바뀌면 새 Function version과 downstream consumer 수정이 필요하다는 것이다. 번역 guide의 objective당1Function과 현재 branch별 Function 계약도 같은 범위로 합치지 않는다.

현재 direct deployment/Marketplace의 자동 Function publication 예외는 별도 최신 문서를 따른다. 이 alias의 UI 이미지와 sample은 지원되는 현재 실행 절차를 검증한 기록이 아니다.

## 출처

- [Palantir, direct-function-publishing (미검증 번역 alias)](https://palantir.com/docs/zh/foundry/manage-models/direct-function-publishing/)

## 관련 문서

- [[Palantir-Model-Functions-Versioning]]
- [[Palantir-Direct-Model-Deployment]]
