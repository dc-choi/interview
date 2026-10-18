---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 평가, BYOM와 LLM 용량의 선택 조건

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## 평가와 모델 등록

- 2월 Evals test parameter는 column header에서 이름/type/optional을 수정하고 오류를 해당 header에 표시했다. 복잡한 reorder는 전체 schema editor를 사용한다.
- 3월 Evals target branch 선택은 **Logic global branch만** 지원하고 Function global branch는 미지원이었다.
- 6월 Rubric Grader/Contains Key Details는 새 suite에서 제거하고 LLM-as-a-judge를 권했다. 기존 suite는 영향이 없었다. 기존 evaluator와 새 judge의 결과를 동일 지표로 가정하지 않는다.
- 3월 TS2/Python Function은 Platform SDK proxy endpoint와 model alias로 Palantir/registered LLM을 호출했다. 5월 custom alias는 install 때 바꿀 string 설정, model alias는 제공/registered 모델 참조로 구분됐다.
- 5월 21일 BYOM GA는 Control Panel에서 common provider API 모델을 등록해 model selector와 rate/permission/observability를 통합했다. tool calling/reasoning/structured output/vision/streaming을 확대했고 기존 Function-interface 방식은 기존 통합에 남되 신규 권장 경로에서 제외됐다.
- 5월 custom embedding model은 @Embedding을 붙여 선택하고 Ontology vector output의 모든 embedding column 차원을 deploy 전에 설정했다.
- 6월 Logic/Pipeline Builder는 **모든 선택 모델**이 native tool calling을 지원할 때 자동 upgrade했다. strict tool이 있으면 모든 모델의 strict 지원도 확인한다. 하나라도 미지원이면 prompted 방식이 남고 upgrade는 debug message로 알린다.

## 용량과 사용량의 관측 단위

4월 autoscaling은 eligible enrollment/geo/compliance/일부 GPT-5 및 GPT-4.1 계열에 기본 활성화돼 최대 2배 headroom을 추가했다. 기존 tier allocation을 낮추지 않으며 안정성 점검을 계속한다. Project override는 autoscaling 활성 때만 제공하고 **user-folder rate limit은 autoscale하지 않는다**. 비활성화하면 표준 limit로 돌아간다.

4월 Project Viewer는 2주, 분 단위 token/request와 batch/interactive 사용량, rate-limit hit를 볼 수 있게 됐다. 5월 daily token usage dataset은 model/resource별 input/output/cache read/write와 compute/currency를 분리하고 export 후 접근 권한을 관리해야 했다.

이 dataset export 권한은 5월 6일 Org administrator, 5월 28일 장문 Resource Management Administrator/enrollment administrator로 다르게 서술된다. 역할이 동등하다고 단정하지 않고 해당 enrollment의 실제 권한을 확인한다. capacity overlay는 현재 limit이며 과거 모든 시점의 limit을 나타내는지 별도 확인한다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [April 21, 2026, LLM capacity now autoscales up to 2× by default in eligible AIP-enabled Foundry enrollments — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#1d99c5dd-fdc5-4c2d-9957-8870df133f0a)
- [April 30, 2026, View AIP usage for projects — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#510a22e7-c110-46bb-8ad5-38f42e7e5943)
- [May 21, 2026, Use the new bring your own model implementation instead of function interfaces to register models in AIP — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#1b19f0e9-2d32-4d7d-9df7-c0594cc392c2)
- [June 26, 2026, Automatic upgrade from prompted to native tool calling in AIP Logic — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#0fe0af911f2dd72eb268c0711e94bca4dd1cb4010acd6f58d068b970e7dfa0a5)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
