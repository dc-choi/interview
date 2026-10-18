---
tags: [palantir, foundry, quiver, analysis, graph, versioning]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Quiver 분석 그래프와 버전 관리"]
---

# Quiver 분석 그래프와 버전 관리

Quiver 분석은 타입이 있는 카드의 의존 그래프로 구성된다. 화면에 카드를 놓는 위치와 실제 계산 순서를 분리해야 분석을 안전하게 재사용할 수 있다. 아래는 2026-10-16 공식 문서 기준이며 실제 분석을 실행하지 않았다.

## 카드, 그래프, 캔버스

카드는 입력을 0개 이상 받아 하나의 정해진 타입을 출력한다. Object set, single object, time series, event set, dataset, transform table, categorical chart, scalar와 array는 서로 다른 계약이다. 예를 들어 object property는 single object를 받으므로 object set에서 바로 연결하려면 먼저 객체를 선택해야 한다.

캔버스는 표시와 배치 단위다. 카드를 이동하거나 다른 캔버스에 놓아도 계산 의존 순서는 바뀌지 않는다. 그래프는 입력에서 출력으로 이어지는 데이터 흐름을 보여 준다. 그래프에서 추가한 카드는 캔버스에 자동 배치되지 않는다.

색상 그룹, 접기와 숨기기는 복잡한 그래프를 탐색하기 위한 구성이다. 캔버스나 대시보드에서 카드를 제거하는 것과 분석에서 카드를 삭제하는 것은 구분한다. 분석에서 삭제하면 하위 카드가 입력을 잃을 수 있고, descendants 삭제는 하위 분기까지 제거한다.

Unused card 정리는 캔버스에 없는지만 보지 않는다. 캔버스 카드의 의존성, 대시보드, 함수와 전역 설정의 참조도 확인한다.

## 참조와 타입

`$A` 같은 global identifier는 분석 내부의 카드 참조다. 수식과 Vega에서 사용할 수 있으며, transform table 열은 `$A.column_name`으로 참조한다. 카드 ID, 열 ID와 화면 표시 이름을 같은 것으로 취급하지 않는다.

Parameter는 downstream 카드가 요구하는 타입에 맞아야 한다. 숫자 필터에 문자열 parameter가 보이지 않는 것은 타입 제한일 수 있다. Parameter panel에서 값, 설명, 사용처를 함께 관리하면 하나의 입력이 어느 결과를 바꾸는지 확인하기 쉽다.

전체 Quiver는 객체 분석, 시계열과 대시보드를 함께 지원한다. 단순한 object set/time series 분석에서 전체 Quiver로 전환하면 새 분석 사본이 생긴다. 원본과 사본의 변경은 연동되지 않으며 역방향 전환도 지원하지 않는다.

## 저장된 버전과 URL 작업 상태

Save는 분석의 저장 버전을 만든다. Save 사이에도 작업 상태가 자동 보관되며 URL의 `state` 값으로 특정 미저장 상태를 다시 열 수 있다. `state`가 포함된 링크는 최신 저장 버전 대신 그 작업 상태를 연다.

여러 사용자는 각자 독립적인 작업 상태로 편집할 수 있지만, 저장하면 서로의 저장 결과를 덮어쓸 수 있다. 변경을 합치는 협업 편집이라고 가정하지 않는다. History에서 과거 버전을 보고 되돌릴 수 있으며, 되돌린 결과를 현재 버전으로 남기는 저장 동작도 구분한다.

분석 권한은 Project/folder에서 상속되며 Viewer와 Editor의 역할이 다르다. 분석을 공유하는 것과 개별 dashboard/function resource를 공유하는 것도 별도다.

## 설정 범위와 계산 비용

분석 설정은 현재 분석에 적용된다. 개인 default는 새 분석의 초기값이며, 기존 공유 분석에 적용하면 다른 사용자가 보는 설정도 바뀔 수 있다. Apply 버튼은 여러 설정 변경의 계산을 모으고, Wait for first apply는 최초 계산을 지연시킨다.

활성 캔버스, 표시된 plot과 graph preview를 중심으로 계산한다. Load all 대신 Only visible items를 사용하면 스크롤 시점까지 계산을 늦출 수 있지만, 화면을 옮길 때 기다림이 생긴다. Graph에서 불필요한 preview를 pin하면 계산이 늘어난다. 화면에서 숨긴다는 것을 데이터 삭제나 접근 제어로 해석하지 않는다.

## 이해 확인

- 카드를 캔버스 아래쪽으로 옮겨도 계산 순서가 바뀌지 않는 이유를 설명할 수 있는가?
- `state` 링크, Save 버전과 publish된 dashboard 버전이 각각 무엇을 고정하는가?
- 화면에서 제거한 카드가 여전히 downstream 계산에 필요한지 확인할 수 있는가?

## 보존된 번역 경로의 적용 범위

영어 `analysis-overview`는 확보되지 않아 한국어/중국어 경로 본문을 대조했다. 두 경로에는 공식 AIP 번역이지만 정확성을 검증하지 않았다는 경고가 있다. 캔버스 간 데이터 공유와 단일 의존 graph 설명은 유지하되, graph에서 카드는 항상 보인다는 표현은 최신 영어 graph guide의 hide/filter 기능과 구분한다. 번역 경로를 최신 UI 동작의 우선 근거로 쓰지 않는다.

보존된 `cards-overview` 번역은 일부 visualization에 downstream output이 없다는 관점과 materialization card 명칭을 사용한다. 최신 data model의 Flow end, Dataset 타입과 구분해 읽는다. 하나의 series를 여러 chart에 표시할 수 있다는 설명도 개별 plot 하나는 한 chart에만 있다는 최신 guide와 구분한다. 같은 underlying series를 별도 plot으로 재사용하는 것과 동일 plot 이동은 다른 동작이다.

## 출처

- [Palantir Quiver, Quiver / Overview](https://www.palantir.com/docs/foundry/quiver)
- [Palantir Quiver, Quiver / Analysis / Canvas mode](https://www.palantir.com/docs/foundry/quiver/analysis-canvas)
- [Palantir Quiver, Quiver / Analysis / Data model](https://www.palantir.com/docs/foundry/quiver/analysis-data-model)
- [Palantir Quiver, Quiver / Analysis / Global identifiers](https://www.palantir.com/docs/foundry/quiver/analysis-global-identifiers)
- [Palantir Quiver, Quiver / Analysis / Graph mode](https://www.palantir.com/docs/foundry/quiver/analysis-graph)
- [Palantir Quiver, Quiver / Analysis / Graph color groups](https://www.palantir.com/docs/foundry/quiver/analysis-graph-color-groups)
- [Palantir Quiver, Quiver / Analysis / Organize and filter the graph](https://www.palantir.com/docs/foundry/quiver/analysis-graph-organization)
- [Palantir Quiver, Quiver / Analysis / Saving and sharing](https://www.palantir.com/docs/foundry/quiver/analysis-save-share)
- [Palantir Quiver, Quiver / Analysis / Settings](https://www.palantir.com/docs/foundry/quiver/analysis-settings)
- [Palantir Quiver, Quiver / Analysis / Analysis toolbars](https://www.palantir.com/docs/foundry/quiver/analysis-toolbars)
- [Palantir Quiver, Quiver / Analysis types](https://www.palantir.com/docs/foundry/quiver/analysis-types)
- [Palantir Quiver, Quiver / Card references / Index of cards](https://www.palantir.com/docs/foundry/quiver/cards-index)
- [Palantir Quiver, Quiver / Card references / Display](https://www.palantir.com/docs/foundry/quiver/cards-index-display)
- [Palantir Quiver, Quiver / Card references / Table](https://www.palantir.com/docs/foundry/quiver/cards-index-tables)
- [Palantir Quiver, Quiver / Core concepts](https://www.palantir.com/docs/foundry/quiver/core-concepts)
- [Palantir Quiver, Quiver / Getting started](https://www.palantir.com/docs/foundry/quiver/getting-started)
- [Palantir Quiver, Quiver / Overview](https://www.palantir.com/docs/foundry/quiver/overview)
- [Palantir Quiver, Quiver / Best practices](https://www.palantir.com/docs/foundry/quiver/quiver-best-practices)

- [Palantir Quiver, analysis-overview (한국어 AIP 미검증 번역)](https://palantir.com/docs/kr/foundry/quiver/analysis-overview/)
- [Palantir Quiver, analysis-overview (중국어 AIP 미검증 번역)](https://palantir.com/docs/zh/foundry/quiver/analysis-overview/)

- [Palantir Quiver, cards-overview (한국어 AIP 미검증 번역)](https://palantir.com/docs/kr/foundry/quiver/cards-overview/)
- [Palantir Quiver, cards-overview (중국어 AIP 미검증 번역)](https://palantir.com/docs/zh/foundry/quiver/cards-overview/)

## 관련 문서

- [[Palantir-Quiver]]
- [[Palantir-Quiver-Object-Sets-and-Charts|Quiver 객체 집합, 탐색과 차트의 정확도]]
- [[Palantir-Quiver-Transform-Tables-and-Datasets|Quiver transform table과 dataset의 계산 계약]]
- [[Palantir-Quiver-Formula-and-Value-Contracts|Quiver 수식, 값 변환과 빈값 계약]]
- [[Palantir-Quiver-Time-Series-Interpolation-and-Aggregation|Quiver 시계열 보간, 시간창과 집계]]
- [[Palantir-Quiver-Events-Ranges-and-Reference-Profiles|Quiver 이벤트, 시간 범위와 기준 프로파일]]
- [[Palantir-Quiver-Regression-and-Forecasting|Quiver 회귀, 예측과 분포 해석]]
- [[Palantir-Quiver-Dashboards-and-Embedding|Quiver 대시보드, 임베딩과 권한 전파]]
- [[Palantir-Quiver-Functions-AIP-and-Vega|Quiver 재사용 함수, AIP와 Vega의 경계]]
