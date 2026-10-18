---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Q&A의 시각화 선택과 저장 경계"]
---

# Q&A의 시각화 선택과 저장 경계

## 화면에서 본 집합

2024년 Contour/Quiver/Workshop/Slate 답변은 source type과 displayed sample을 구분하라고 읽는다. Row-count 차이는 preview sampling이나 non-deterministic operation일 수 있다. Vega/transform table, object-set/materialization chart는 drill-down/scale 기능이 다르다. 과거 Vega50,000 제한과 object chart의 제한 없음 표현을 현재 모든 규모의 성능 보장으로 승격하지 않는다.

Quiver hover는 가장 가까운 point를 보여 interpolation 결과와 다를 수 있다. Internal join interpolation, 개별 시계열 display와 external interpolation을 분리한다. Null Boolean을 제외한 chart를 전체 Boolean 분포로 읽지 않는다. Unit override는 표시 의미를 바꾸며 값 자체 변환을 자동 보장하지 않는다.

Workshop에서 maximum timestamp로 filter하면 동률 객체가 여러 개일 수 있다. Value-at-index0은 선택 집합에서 한 값만 남기므로 유일성 검증을 대신하지 않는다. 지역/시간대 표시는 IANA zone, timestamp와 string format을 구분한다. 저장 module과 published module, published dashboard와 analysis도 별개다.

## 임베딩과 재실행

Workshop→Quiver는 dashboard input과 host object-set binding을 구성해야 한다. Slate로 보낸 object-set spec은 해당 service pagination을 거쳐 읽으며 pageSize가 전체 object 수를 뜻하지 않는다. Frontend JSON string은 parsing이 필요한 값이며 typed object와 다르다.

기본 function/query/widget는 upstream 값 변화에 반응하지만 캐시와 manual mode가 있다. Event run/nonce 예제는 최신 재계산 계약과 대조한다. Embedded lazy loading은 초기 visible chain이 깊으면 waterfall을 만들 수 있다. 단순 module 분할이 항상 빠르다는 보장은 아니다.

## 공유와 출력

Export는 regular/function-backed column, 파일 형식과 시점에 따라 한계가 다르다. 과거200,000/10,000행 답변을 현행 CSV/Excel별 계약과 혼용하지 않는다. Materialize-then-download는 별도 데이터 복제와 권한을 발생시키며 무제한 export 보장이 아니다.

Comments를 Action/로그 객체로 복사한 내용은 원래 댓글과 별도 사본이다. Save-state menu의 header 의존, clipboard 문자열 export와 iframe embedded=true는 UI 기능이며 데이터 보안의 대체가 아니다. Vertex graph 재생성/derived-property coloring도 그래프 구성과 원본 데이터 변경을 구분한다.

Carbon 외부 링크, Notepad linked-object/section input과 header/footer workaround, Workshop object-view tab 우회는 당시 UI 상태의 예다. 현재 guide의 지원과 다를 수 있고 실제 앱/차트/iframe 동작은 시험하지 않았다.

## 출처

- [Palantir questions-answers, questions-answers](https://www.palantir.com/docs/foundry/questions-answers)
- [Palantir questions-answers, automate](https://www.palantir.com/docs/foundry/questions-answers/automate)
- [Palantir questions-answers, builds](https://www.palantir.com/docs/foundry/questions-answers/builds)
- [Palantir questions-answers, carbon-community](https://www.palantir.com/docs/foundry/questions-answers/carbon-community)
- [Palantir questions-answers, code-repositories](https://www.palantir.com/docs/foundry/questions-answers/code-repositories)
- [Palantir questions-answers, code-repositories-community](https://www.palantir.com/docs/foundry/questions-answers/code-repositories-community)
- [Palantir questions-answers, code-workspaces](https://www.palantir.com/docs/foundry/questions-answers/code-workspaces)
- [Palantir questions-answers, code-workspaces-community](https://www.palantir.com/docs/foundry/questions-answers/code-workspaces-community)
- [Palantir questions-answers, contour](https://www.palantir.com/docs/foundry/questions-answers/contour)
- [Palantir questions-answers, contour-community](https://www.palantir.com/docs/foundry/questions-answers/contour-community)
- [Palantir questions-answers, data-connection](https://www.palantir.com/docs/foundry/questions-answers/data-connection)
- [Palantir questions-answers, foundry-metadata-community](https://www.palantir.com/docs/foundry/questions-answers/foundry-metadata-community)
- [Palantir questions-answers, functions](https://www.palantir.com/docs/foundry/questions-answers/functions)
- [Palantir questions-answers, functions-community](https://www.palantir.com/docs/foundry/questions-answers/functions-community)
- [Palantir questions-answers, linter](https://www.palantir.com/docs/foundry/questions-answers/linter)
- [Palantir questions-answers, media-sets](https://www.palantir.com/docs/foundry/questions-answers/media-sets)
- [Palantir questions-answers, media-sets-community](https://www.palantir.com/docs/foundry/questions-answers/media-sets-community)
- [Palantir questions-answers, modeling](https://palantir.com/docs/zh/foundry/questions-answers/modeling/)
- [Palantir questions-answers, notepad](https://www.palantir.com/docs/foundry/questions-answers/notepad)
- [Palantir questions-answers, notifications-community](https://www.palantir.com/docs/foundry/questions-answers/notifications-community)
- [Palantir questions-answers, object-views-community](https://www.palantir.com/docs/foundry/questions-answers/object-views-community)
- [Palantir questions-answers, ontology](https://www.palantir.com/docs/foundry/questions-answers/ontology)
- [Palantir questions-answers, ontology-sdk](https://www.palantir.com/docs/foundry/questions-answers/ontology-sdk)
- [Palantir questions-answers, pipeline-builder](https://www.palantir.com/docs/foundry/questions-answers/pipeline-builder)
- [Palantir questions-answers, pipeline-builder-community](https://www.palantir.com/docs/foundry/questions-answers/pipeline-builder-community)
- [Palantir questions-answers, projects-community](https://www.palantir.com/docs/foundry/questions-answers/projects-community)
- [Palantir questions-answers, quiver](https://www.palantir.com/docs/foundry/questions-answers/quiver)
- [Palantir questions-answers, quiver-community](https://www.palantir.com/docs/foundry/questions-answers/quiver-community)
- [Palantir questions-answers, slate](https://www.palantir.com/docs/foundry/questions-answers/slate)
- [Palantir questions-answers, streaming](https://www.palantir.com/docs/foundry/questions-answers/streaming)
- [Palantir questions-answers, vertex](https://www.palantir.com/docs/foundry/questions-answers/vertex)
- [Palantir questions-answers, webhooks](https://www.palantir.com/docs/foundry/questions-answers/webhooks)
- [Palantir questions-answers, workshop](https://www.palantir.com/docs/foundry/questions-answers/workshop)
- [Palantir questions-answers, workshop-community](https://www.palantir.com/docs/foundry/questions-answers/workshop-community)

## 관련 문서

- [[Palantir-Collaborative-Analysis]]
