---
tags: [palantir, foundry, release-history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["2024 AIP context, 타입과 재현성"]
---

# 2024 AIP context, 타입과 재현성

2024년 공식 release note의 역사적 변경 기록이다. 현재 지원과 기본값은 해당 제품의 최신 계약을 다시 확인한다.

## Structured output의 시간적 변화

3-12 Logic single completion은 도구/명시적 return type을 지원하지 않는 낮은 token overhead 모드였다. 3-28에는 array/struct,8월에는 object/list output 지원이 추가됐다고 기록한다. 예전 제한과 후속 기능을 한 문장의 동시 계약으로 합치지 않는다.

Apply Action/Execute/Filter object set/Transform block은 parameter와 필터를 명시적으로 구성하는 경로다. Natural language query/semantic search는 해석 또는 유사도 기반이며 deterministic filter와 구분한다. Typed LLM 출력은 형태를 강제하는 것으로 사실성/업무적 적합성을 보증하지 않는다.

Pipeline Builder는5-16 output type 강제,5-23 Include errors struct,11-26 raw prompt/intermediate failures/corrections/final output 관측을 추가했다. 과거 coercion 실패의 null과 원천 결측을 구분해야 한다. Error column을 추가하면 output schema가 바뀌고 build 성공과 각 row의 성공도 다르다.

## 캐시, 평가와 version

9-10 Skip recomputing rows는 prompt에 들어간 column/parameter 값이 같은 row의 결과를 재사용한다. Prompt/model 변경 시 cache clear 또는 같은 output type을 유지한 채 과거 결과를 유지하는 선택이 있어 현재 prompt를 실행한 결과와 혼재할 수 있다. 3시간→20분은 vendor 테스트 예이며 모든 pipeline의 보장값이 아니다.

7월 Logic Evaluations는 string/object/temporal metric, custom LLM evaluator와 object-set test case/집계/개별 결과를 도입했다. 당시 unpublished/intermediate block 평가가 roadmap이었다. LLM judge의 점수도 독립적 정답으로 가정하지 않는다. Compile 통과와 생성 코드의 실제 동작/권한 검증을 구분한다.

10-02 Agent는 새 message에서 최신 Function을 자동 참조하고 version pin을 선택할 수 있게 됐다. Agent publish version만 고정해도 tool behavior가 불변이라는 뜻이 아니다. 11-06 Action Tool 자동실행 toggle은 기본 사람 확인 경로와 다르며 tool permission과 사용자 의도 확인을 대신하지 않는다.

## Context와 availability

5월 custom docs는 Documentation repo/allowlist 중심이었고7월 Notepad,10월 custom-source-only Assist Agent/Agent Studio/Threads,12월 Carbon/OSDK/platform API로 확장됐다. Assist에 custom source를 추가하는 것과 그 source만 검색하는 Agent mode는 다르다. Code attachment는 코드와 참조 metadata를 모델 context로 제공하며 모든 실제 row를 읽었다는 보장이 아니다.

10월 Threads는 full document context를 future roadmap으로 적고 relevant chunk 수 설정을 별도 추가했다. Retrieval 답변을 전체 문서 읽기와 같게 보고하지 않는다. Prompt/reasoning UI는 실행 설명/관측 자료이며 모델의 숨은 사고나 답의 정확성을 완전히 증명하지 않는다.

모델명/성능/추천, Azure/Direct 용량2배/geo restriction, Bedrock 지역 지원과 계약 addendum은 당시 제공 경로다. Palantir enablement, region, contract와 resource 권한이 모두 달라질 수 있으며 현재 가격/지원/보안을 이 기록만으로 판단하지 않는다. 실제 모델 호출/Action 실행은 하지 않았다.

## 출처

- [Palantir, 2024 release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2024)
- [Palantir, 2024 release notes](https://www.palantir.com/docs/foundry/release-notes/2024)

## 관련 문서

- [[Palantir-Platform-Evolution-2024]]
