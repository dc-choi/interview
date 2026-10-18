---
tags: [palantir, foundry, contour]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 필터, join과 union의 결과 계약

분석은 기본적으로 전체 컬럼을 대상으로 하므로 일부 행만 계산하려면 먼저 필터한다. 시각화 선택도 downstream 필터가 된다. AND/OR, Keep/Remove, case sensitivity와 exact/substring/regex 의미를 명시한다.

`contains`의 wildcard 설명이 board summary와 filter 상세에서 다르다. 상세 문서는 contains도 wildcard를 해석하며 escape를 허용하고 contains-with-wildcards는 escape하지 못한다고 설명한다. 문자열의 literal `*`/`?`가 중요한 경우 테스트하거나 명시적인 regex를 사용한다. 긴 값 목록은 브라우저 부담을 주므로 별도 dataset과 join/set 연산을 검토한다.

Join은 left/inner/right/full과 다중 키의 any/all 조건을 지원한다. Full join의 양쪽 key는 자동 coalesce하지 않으므로 null key 컬럼을 단순 누락으로 보지 않는다. Key의 유일성, 중복 곱셈과 null 처리를 검증한다. 문서의 foreign-key join이 Spark를 crash시킨다는 단정은 일반 SQL 제약이 아니며, 큰 비유일 join의 실행 비용 경고로 제한해서 읽는다.

Union/Add rows는 중복을 그대로 더할 수 있다. By position은 이름이 달라도 위치대로 매핑하므로 뒤바뀐 컬럼을 조심한다. Appear in의 keep/remove는 전체 행 비교, Match on은 지정 key 기반 semi/anti join 의미다. Compatible 타입은 cast될 수 있고 union에는 같은 컬럼 수가 필요하다. Pivot 결과 schema가 변하면 downstream union도 깨질 수 있다.

## 출처

- [Palantir, boards-filter](https://www.palantir.com/docs/foundry/contour/boards-filter)
- [Palantir, boards-join](https://www.palantir.com/docs/foundry/contour/boards-join)

## 관련 문서

- [[Palantir-Contour]]
- [[Palantir-Pipeline-Builder]]
