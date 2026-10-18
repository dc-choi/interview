---
tags: [palantir, foundry, release-history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["2024 Pipeline state, cache와 deploy"]
---

# 2024 Pipeline state, cache와 deploy

2024년 공식 release note의 역사적 변경 기록이다. 현재 지원과 기본값은 해당 제품의 최신 계약을 다시 확인한다.

## Preview와 production

6월 upstream preview cache 재사용과500row preview를 발표했다. Expensive join/LLM을 proactive cache한다는 설명과 row-count-changing operation/join/aggregation/logic change는 이득이 없다는 제한이 같은 원문에 있다. 전부 같은 경계의 보장으로 합치지 않는다. Vendor 내부40배 속도 결과를 service SLA로 쓰지 않는다.

4월 manual preview preference,8월 unit test,9월 duplicate test datasource 분리 fix와 output expectation warn/fail 선택이 추가됐다. Sample/test 통과는 전체 데이터의 정합성을 보증하지 않는다. Warning으로 낮춘 expectation은 build를 막지 않으므로 성공 상태가 기준 충족을 뜻하지 않을 수 있다.

## State break와 실행 대상

3월 deploy without build는 jobspec publish와 실제 build를 분리하고 selective target/job group, streaming replay 선택을 지원했다. 6월 state break에서는 모든 output을 build하도록 수정해 다음 build에 예상 밖 재처리가 발생하던 문제를 해결했다고 기록한다. 10월 full reprocessing 확인 alert는 비용과 history 영향에 대한 명시적 선택이다.

9월 multiple protected branch는 모든 protected branch가 같은 approval policy를 따른다고 설명한다. 11월 Foundry branch deployability check 실패는 proposal merge와 branch deploy를 막는다. 화면에 사전 오류가 없더라도 deploy 시에만 나타나는 error가 있을 수 있다는12월 안내를 유지한다.

Input fallback branch, project-scope reference, output state와 Ontology/index/build 완료를 구분한다. Rename/hidden node/folder/pseudocode는 표현과 탐색의 변경이다. Pseudocode view는 code authoring을 제공하지 않으며 diff/join/union/LLM view도 바꾸지 않는다.

## Data shape와 처리 정책

Coalesce는 partition 수를 줄일 때 shuffle 없이 기존 partition을 묶고 더 큰 수를 요구해도 늘리지 않는다. 성능은 데이터 분포와 병렬도에 달려 있으므로 무조건 가속으로 해석하지 않는다.

Excel Source sheet→Source sheet pattern 변경은 regex 의미를 명확히 한 것으로 실제동작 변경이 아니다. GeoJSON property 전체 string 추출과 명시적 struct 추출, parse JSON/XML sample schema 검증, 텍스트 추출 ignore/fail 정책도 서로 다른 정합성 계약이다.

11월 streaming many-to-many link output과12월 struct property output 지원은 당시 확장 기록이다. 전자의 연결 입력과 양쪽 object target의 identity, 후자의 nested/type 지원은 현행 API 문서로 확인한다. Python UDF6월/12월 beta 발표는 scope/backend 변화를 함께 읽어야 하며 같은 note를 중복 구현으로 해석하지 않는다.

Source/target Marking 제거는 단순 UI 옵션이 아니다.4월 발표는 Remove marking permission, protected branch와 code approval이 필요하고 master에 merge/build한 뒤 적용된다고 명시한다. 10월 source transform의 propagation 중지는 당시 lightweight 미지원이었다. 실제 deploy/build/marking 변경은 수행하지 않았다.

## 출처

- [Palantir, 2024 release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2024)
- [Palantir, 2024 release notes](https://www.palantir.com/docs/foundry/release-notes/2024)

## 관련 문서

- [[Palantir-Platform-Evolution-2024]]
