---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 옛 direct-function publishing 문서의 적용 범위

이 문서는 English canonical이404인 상태에서 확보한 Chinese machine-translated alias를 학습했다. 원문 스스로 번역 정확성 미검증을 알리며 현재 API 지원의 근거로 단독 사용하지 않는다.

옛 guide는 Parameter input과 single Parameter output만 direct publishing 가능하다고 제한하고 tabular/multi-output은 Functions on models 경로를 안내한다. 현재 model-functions-guide와 model-adapter-api는 typed tabular/Object/ObjectSet 등을 설명하므로 이 과거 제한을 현재 전체 기능에 확대하지 않는다.

공통으로 유효한 설계 원리는 model API가 같으면 기존 wrapper가 계속 deployment를 가리킬 수 있지만 API가 바뀌면 새 Function version과 downstream consumer 수정이 필요하다는 것이다. Modeling Objective당 1 Function과 direct deployment의 branch별 Function 계약은 적용 범위가 다르다.

2026-10-18 대조한 English model-functions-guide의 Modeling Objective 게시 화면도 objective당 1 Function을 명시한다. 등록한 deployment 연결은 수정/제거할 수 없지만 다른 deployment를 같은 Function의 새 버전으로 등록할 수 있다고 설명한다. 따라서 이 제한의 근거가 번역 alias에만 있는 것은 아니다. 공식 본문의 direct deployment branch별 규칙과 구분하며, 이 화면을 실제 환경에서 실행 검증한 것은 아니다. ([공식 가이드](https://www.palantir.com/docs/foundry/model-integration/model-functions-guide), [게시 화면](https://www.palantir.com/docs/resources/foundry/model-integration/direct-function-publish-new-dialog.png))

현재 direct deployment/Marketplace의 자동 Function publication 예외는 별도 최신 문서를 따른다. 이 alias의 UI 이미지와 sample은 지원되는 현재 실행 절차를 검증한 기록이 아니다.

## 출처

- [Palantir, direct-function-publishing (미검증 번역 alias)](https://palantir.com/docs/zh/foundry/manage-models/direct-function-publishing/)
- [Palantir, model-functions-guide](https://www.palantir.com/docs/foundry/model-integration/model-functions-guide)

## 관련 문서

- [[Palantir-Model-Functions-Versioning]]
- [[Palantir-Direct-Model-Deployment]]
