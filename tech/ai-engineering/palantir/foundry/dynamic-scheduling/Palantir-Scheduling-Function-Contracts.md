---
tags: [palantir, foundry, dynamic-scheduling]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Scheduling 추천, 검증과 inline metric Function

Search Function은 row ID/selected time 또는 puck object를 받아 추천 puck/time slot을 반환한다. ISearchResult는 optional rowGroup/sourcePuckIds/error를 가지며 rowGroup은 title, containerIds, highlights다. SLOT highlight는 domain(start/end Long)과 containerId를, PUCK은 schedulableObjectPrimaryKey/ObjectTypeId를 지정한다. 결과는 노란색 search group과 상세 패널로 나타난다.

Suggestion은 scheduleObjectPrimaryKeys, domainStart, domainEnd를 받아 puck PK→row PK→slot 배열의 FunctionsMap을 반환한다. slot은 domain과 -1..1 rating이다. __ALL_ROWS는 모든 row를 나타내는 shortcut이다. **결과는 초기 application load 때 계산된 정적 결과이며 이후 Action을 반영하지 않는다.** Enforce Suggestions는 highlighted region으로 drop을 제한하지만 Shift로 우회할 수 있다. 다른 drag 설명의 on-demand 표현만 근거로 최신성이나 강제 제약을 보장하지 않는다.

Validation은 초기 load와 각 변경 후 최신 scenario에서 다시 평가한다. input argument 이름은 정확히 scheduleObjectPrimaryKeys여야 widget이 자동 채운다. 반환 배열에는 scheduleObjectPrimaryKey, result, optional details(description/relatedPuckIds)를 둔다. true는 통과, false는 위반, undefined는 해당 없음이다. HARD/SOFT는 빨강/주황 표시이며 문서가 이를 서버 제출 차단 계약으로 보장하지 않는다. 최종 Submit은 scenario에 누적된 Action을 Ontology에 적용한다.

## Inline metrics

header metric은 시간축, row metric은 해당 row에 붙는다. 반환 배열의 각 항목은 range/value이며 interface 이름보다 key가 중요하다. range는 Timestamp, LocalDate 또는 epoch millisecond Integer 범위를 지원하고 value는 string/Integer/Double이다. TS1 IRange는 min/max, TS2 @osdk/functions Range는 startValue/endValue를 쓴다.

TS1은 @Function method/Objects.search(), TS2는 export default와 OSDK ObjectSet/client 기반이다. row object parameter를 runtime input으로 설정하면 해당 row를 제공한다. 예제의 양 끝 포함 bucket은 경계 task를 이웃 bucket에 두 번 셀 수 있고 step<=0은 반복을 종료하지 못할 수 있다. 첫 object를 읽는 예제도 empty input을 처리하지 않는다. 예제 코드를 운영 집계의 경계/입력 검증으로 그대로 간주하지 않는다.

## 출처

- [Palantir, scheduling-inline-metrics](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-inline-metrics)
- [Palantir, scheduling-search-functions](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-search-functions)
- [Palantir, scheduling-suggestion-functions](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-suggestion-functions)
- [Palantir, scheduling-validation-rules](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-validation-rules)

## 관련 문서

- [[Palantir-Scheduling-Data-and-Scenarios]]
