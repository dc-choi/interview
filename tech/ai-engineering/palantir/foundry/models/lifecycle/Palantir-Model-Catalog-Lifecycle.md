---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# LLM Catalog와 deprecation migration의 확인 범위

Model Catalog는 enrollment에서 사용 가능한 Palantir-provided LLM 탐색/비교 도구다. custom ML/AI model 목록은 아니며 그 자산은 Modeling Objective 등에서 찾는다. completion/embedding/vision, creator, lifecycle과 region/enablement를 구분한다.

Experimental은 API/용량/앱 동작이 불안정할 수 있고 enrollment admin이 켜거나 끈다. Stable은 provider/Palantir의 가용성 기준을 통과한 단계지만 실제 지역/제품 quota는 별도다. Sunset은 교체를 준비하는 단계, Deprecated는 기존 API workflow도 사용할 수 없는 단계다. 과거 logs/history가 남아 있는 것과 inference 가능성을 구별한다.

## 탐색과 평가

model entity page는 playground, Function/Transform 시작 예제와 description/context/data cutoff를 제공한다. comparison은 같은 completion/vision task에2개 모델을 놓고 비교한다. 간단한 playground 결과를 업무 evaluation suite의 대체로 보지 않는다.

## brownout과 장애

provider deprecation 통지 뒤 Upgrade Assistant에서 migration deadline/brownout 일정을 확인한다. brownout은 의도적인 일시 접근 제한이며 NOT_FOUND LanguageModelNotAvailable의 params에 deprecation/brownout 시각이 올 수 있다. 최종 deprecation 뒤에는 대체될 때까지 호출이 실패한다. retry만으로 해결되는 transient 오류와 다르다.

Upgrade Assistant는 실제 호출을 근거로 pending을 찾는다. 다른 model 호출이 있고 마지막 deprecated 호출 후24시간이 지나면 completed로 바뀔 수 있다. 다시 옛 model을 부르면 pending으로 돌아온다. migration 기간에 실행하지 않은 dormant workflow는 목록에서 빠질 수 있어 생산 inventory와 source search도 필요하다.

## 수정 위치와 실제 채택

Pipeline Builder는 pipeline 단위로 표시하므로 use LLM node를 전부 찾고 save/deploy/rebuild한다. Workshop은 widget의 직접 model과 upstream Logic/chatbot Function을 구분하고 새 Function publish 후 소비자 version도 올린다. Quiver는 analysis AIP settings를 확인한다.

TypeScript1은 model import와 call site, TypeScript2는 Resource imports의 model alias와 proxy endpoint를 바꾼다. Python의 typed LanguageModelInput도 원본 model RID를 갱신한다. TS1 params/maxTokens와 TS2 proxy의 max_completion_tokens를 같은 request schema로 섞지 않는다.

Workflow Lineage로 upstream과 소비자, Ontology Manager의 Function usage/version을 확인한다. bulk replace와 Function-version update도 실제 소비자에 반영됐는지 확인한다. view/edit 권한이 부족하면 upstream 원인 조사를 완료한 것으로 보고하지 않는다.

이 문서는 특정 provider 모델의 현재 지원/종료 날짜를 전수 확인한 목록이 아니다. 실제 적용 시 enrollment Catalog와 해당 model의 Upgrade Assistant, evaluation suite를 다시 확인한다.

## 출처

- [Palantir, model-catalog](https://www.palantir.com/docs/foundry/model-catalog)
- [Palantir, overview](https://www.palantir.com/docs/foundry/model-catalog/overview)
- [Palantir, model-deprecation](https://www.palantir.com/docs/foundry/model-catalog/model-deprecation)

## 관련 문서

- [[Palantir-AIP-Model-Availability]]
- [[Palantir-Registered-Models-and-Provider-Proxies]]
- [[Palantir-Model-Deployment-and-Monitoring]]
