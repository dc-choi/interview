---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 분석 결과의 단위와 공간 UI의 변화

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## Quiver와 Contour

- 1월 manual entry transform table GA는 최대 5,000행, string/number/Boolean/time/time series를 지원했다. row/column selector로 downstream parameter를 만들고 작은 time series를 sync 없이 분석하는 용도였다.
- 2월 Align series to event set은 각 event에 reference value/bounded series를 정렬해 실제 sensor와 비교했다.
- 4월 union manual column mapping은 입력 type 호환 문제를 조정했다. 5월 coalesce는 처음 non-null/error series를 선택하며 empty EventSet 처리와 marker 색상 등이 확대됐다.
- 6월 Segment Transformation 명칭이 Statistics로 바뀌었다. 7월 root에서 linked EventSet search-around가 쉬워졌다.
- 10월 analysis-wide streaming toggle은 모든 axis/metric에 영향을 줬다. 기존 개별 streaming 기본값과 새 항목 기본값을 구분한다. 11월 date range는 fixed/relative/variable 중 하나를 선택한다.
- 12월 materialization card의 Marketplace 지원은 초기 범위였다. Contour header는 10월 세 줄/scroll 개선 뒤 12월 ellipsis 방식으로 다시 바뀌었다.

## Map과 Vertex

- 2월 Follow object는 시간 변화에 따라 viewport를 선택 객체에 고정했다. 4월 map watermark는 Org default와 group override를 사용하며 사용자가 속한 첫 해당 group을 기준으로 한다.
- 5월 새 Map template은 legacy migration warning와 수동 전환을 제공했다. 수백만 object tile 경로와 legacy 10,000 object 경로를 비교했지만 mobile/non-WebGL에는 legacy가 남았고 feature parity를 보장하지 않았다.
- 5월 12/24h, elevation tile format, 6월 drawing tool의 여러 persistent annotation와 bidirectional shape output, local template callback이 추가됐다.
- Vertex layer lock은 interaction을 막는 기능이며 data access control은 아니다. 4월 touchscreen pan/zoom은 기존 graph를 대상으로 했고 right-click은 제공하지 않았다.
- Vertex는 큰 Search Around 성능, deterministic saved-selection 색상, multi-type add-object search, dark-mode PNG export hang, annotation/media layer와 object-view panel을 개선했다.
- 12월 Map/Vertex Object Set Views와 time-series-property timeline 베타가 추가됐다. runtime 시점과 saved selection/template 상태를 구분한다.

## Object Explorer와 분석의 관측값

2월 Object Explorer home은 recents/favorites, Ontology group과 saved exploration/list를 모았다. Active users는 최근 30일 동안 해당 object type과 상호작용한 사용자 수, Applications는 Workshop 사용 개수였다. 이 숫자를 전체 데이터 사용량이나 모든 API consumer 수로 해석하지 않는다. hidden property와 semantic type 표시, search 범위와 object edit history는 권한과 값 해석을 돕는 별도 UI다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [February 25, 2025, Discover your Ontology with the new Object Explorer home page — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#58afc095-c400-4252-a9b2-0c405a963d10)
- [January 15, 2025, Introducing manual entry transform tables in Quiver [GA] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#2cc3875e-499d-401d-bce6-1c4311d616c4)
- [December 15, 2025, Improved header text truncation in table boards — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#cb2403f6-4ea6-4abc-b87c-efbd84c80eea)
- [December 9, 2025, Initial support for materializations in Marketplace — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#1cb8c50fa34199dc08a7971c4dfd491519950c87187dec8dfca246f3f52b4bcf)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
- [[Palantir-Map]]
