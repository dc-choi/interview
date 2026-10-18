---
tags: [palantir, ontology, derived-property, query, aggregation]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir 파생 속성", "Foundry Derived Properties"]
---

# Palantir 파생 속성의 계산, 보안과 비용

Derived property는 저장된 값을 바꾸는 대신 조회 시점에 연결 객체의 값을 선택, 집계하거나 표현식으로 계산하는 읽기 전용 속성이다. 원천 변경을 다음 계산에 반영하지만 별도 색인을 가진 저장 속성은 아니다. Action으로 편집할 값, 객체 primary key나 링크 foreign key로 쓰지 않는다.

## 정의의 공유 범위를 고른다

| 구분 | Ontology 정의형 | Runtime 정의형 |
|---|---|---|
| 정의 위치 | Ontology Manager | Workshop, Insight 또는 OSDK 요청 |
| 저장 위치 | Ontology 정의 | Object set 정의 |
| 공유 범위 | 해당 타입의 소비자 | 요청, 모듈, 해당 저장 object set 접근자 |
| 링크 탐색 | 최대 3회 | Workshop/Insight 1회, OSDK 고정 제한 없음 |
| 산술/날짜 표현식 | 미지원 | 지원 |
| 확인일의 상태 | Beta | Generally available |

조직의 공통 의미라면 Ontology 정의형을, 특정 화면의 계산이나 산술/날짜 조합이면 runtime 정의형을 검토한다. OSDK 탐색 횟수에 고정 제한이 없다는 설명이 실행 비용과 다른 query 제한까지 없다는 뜻은 아니다.

OSDK TypeScript 2.x의 최소 client는 `2.2.0-beta.x`이며 linked selection, 산술/날짜 표현식은 `2.4.0` 이상이다. OSv1 타입을 포함한 query에는 파생 속성을 사용할 수 없다. Required, 직접 value type 지정, conditional/value formatting과 inline action도 지원하지 않는다. 원천 속성의 value type은 상속한다.

## 관계의 개수에 맞춰 선택과 집계를 나눈다

모든 탐색이 최대 한 객체에 도달할 때는 linked selection 또는 집계를 선택할 수 있다. 한 단계라도 여러 객체에 도달하면 집계가 필요하다. N:M 링크는 selection이 안 되며, 배열 foreign key를 가진 1:N 링크도 양방향에서 다수에 도달할 수 있는 관계로 취급한다.

| 집계 | 결과와 주의점 |
|---|---|
| Count | Long, 속성값 선택 불필요 |
| Average | 숫자 입력을 Double로 반환 |
| Sum | Short/Integer는 Long, Float는 Double로 확장 |
| Min/Max | 숫자, 문자열, Boolean, 날짜/시각의 원천 타입 유지 |
| Approximate/Exact cardinality | Long, 정확한 개수가 필요할 때만 Exact 검토 |
| Collect list/set | Vector 외 타입을 배열로 반환 |
| Approximate percentile | 숫자, runtime 정의형만 지원 |

배열 입력은 원소를 펼친 뒤 집계한다. Sum의 Long은 그대로 Long이며 decimal은 필요하면 precision을 늘리고 scale을 줄인다. Vector는 집계, 선택과 결과 타입으로 지원하지 않는다.

## 화면에 보이는 배열과 query 대상은 다르다

Collect list는 중복을 유지하고 Collect set은 중복을 제거한 뒤 반환 제한을 적용한다. Null 속성은 건너뛰므로 결과 배열에 null을 넣지 않는다. 기본 반환 제한은 10, 최대 100이다. Reducer가 없으면 순서를 보장하지 않으며 reducer가 정의되면 적용 여부와 관계없이 반환값 정렬에 사용한다.

반환 개수는 query 평가 범위를 제한하지 않는다. Filter, sort와 aggregate는 잘린 목록이 아니라 전체 원소를 대상으로 한다. Reducer 역시 대표값 하나를 표시하지만 전체 배열의 query 의미를 바꾸지 않는다. 따라서 표시된 목록에 없는 값으로 필터가 일치할 수 있다.

예를 들어 부서의 프로젝트 목록을 10개로 표시하면서 특정 프로젝트 필터를 걸면, 그 프로젝트가 11번째 이후여도 부서가 검색될 수 있다. 이는 계약에서 도출한 설명 예시다.

## 표현식은 선언 순서를 따른다

Runtime 표현식은 더하기, 빼기, 곱하기, 나누기, min/max, 절댓값과 부호 반전, 날짜 min/max와 `extractPart`를 지원한다. 날짜 추출 단위는 DAYS, MONTHS, QUARTERS와 YEARS다. 확인일 기준 static literal을 표현식에 넣는 기능은 지원하지 않는다.

같은 `withProperties`에 선언한 다른 계산 속성을 참조하지 않는다. 의존 계산을 다음 `withProperties` 호출로 나눈다. Linked selection과 aggregation은 다른 derived property 정의를 중첩하거나 참조하는 일반 조합기로 취급하지 않는다. 공식 reference의 선언 순서와 선택 가능 property 범위를 확인한다.

결과에서 파생 속성을 받으려면 명시적으로 select해야 한다. Reference 앞부분은 이미 scope에 들어온 property 선택을 언급하지만 뒤쪽 주의문은 linked/aggregation 기반 derived property의 다른 derived property 참조를 금지한다. 이를 임의의 중첩 지원으로 확장하지 않고 구체적인 SDK query로 확인한다.

## 권한에 따라 같은 계산값이 달라진다

출발 객체뿐 아니라 다중 탐색의 중간 객체와 원천 객체마다 접근을 검사한다. 두 사용자가 같은 객체를 보더라도 읽을 수 있는 연결 객체가 다르면 집계값도 다를 수 있다. Collect 결과의 각 값은 해당 값의 security marking을 보존한다. 사용자별 차이를 데이터 불일치로 판단하기 전에 접근 경로를 확인한다.

이 설명은 파생 속성의 계산 보안이다. 결과를 외부로 복사했을 때 모든 원래 정책이 계속 강제된다는 일반 보증은 아니며 [[Palantir-Security-and-Governance]]의 후속 이용 경계를 함께 본다.

## 로딩 비용과 검색 비용을 분리한다

값을 반환하는 비용은 대체로 집계 요청 수준이다. Count, Sum, Average, Min/Max와 cardinality 값을 기준으로 filter/sort하면 남은 후보마다 계산할 수 있어 더 비싸다. Collect list/set의 검색은 원천 색인으로 pushdown할 수 있어 상대적으로 낮지만 연결 객체 수의 영향을 받으며 반환 제한을 줄인다고 전체 계산량이 같은 비율로 줄지는 않는다.

관계 탐색 전 필터로 후보를 좁히고, 연결 객체 수와 중간 결과를 확인한다. Exact cardinality보다 approximate를 우선 검토하되 업무가 정확한 개수를 요구하면 지연을 받아들일지 판단한다. 반복 계산의 지연이 허용되지 않으면 사전 계산값과 갱신 비용을 비교한다. Workshop에서 파생 속성을 쓰는 object set을 정렬하면 200행으로 제한된다. Automate 조건은 scheduled monitoring에서만 파생 속성 필터를 지원하고 live monitoring에서는 지원하지 않는다.

## 출처

- [Palantir, Derived properties](https://www.palantir.com/docs/foundry/ontology/derived-properties)
- [Palantir, Derived properties reference](https://www.palantir.com/docs/foundry/ontology/derived-properties-reference)

## 관련 문서

- [[Palantir-Ontology-Retrieval|객체 검색과 계산]]
- [[Palantir-Ontology-Modeling|객체와 관계의 의미]]
- [[Palantir-Security-and-Governance|보안과 후속 이용]]
