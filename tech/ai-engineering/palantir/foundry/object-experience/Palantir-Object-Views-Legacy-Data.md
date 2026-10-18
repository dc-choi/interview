---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Legacy Object View 데이터와 시각화

Properties widget은 current object 또는 one-to-one/many-to-one의 single linked object를 보여준다. Edit 허용에는 type Edits와 inline Action 설정이 필요하다. Hidden/표시 제외는 보안이 아니다. Property Cards는 값과 linked aggregation을 표시하지만 conditional formatting은 property에만, value formatting은 aggregation에도 적용된다. Functions가 필요하면 Workshop/Quiver를 쓴다.

Links tree는 linked object를 따라가지만 filter를 받지 않고 정렬도 제한된다. Linked Object View table은 외부 filter를 받을 수 있지만 내부 search/filter를 다른 widget에 publish하지 않는다. Card/list는 selection/Action과 property 표시가 표와 다르다.

Timeline은 timestamp/date로 사건을 보여주고 날짜가 없으면 누락 경고를 낸다. 같은 객체를 여러 날짜로 등록하면 여러 번 나온다. 기본 50개, 추가 scroll은 100개씩이며 filter를 받지 않는다. Grouped Events Timeline/Table은 외부 filter를 받지만 자체 text/date filter를 밖으로 보내지 않는다. Max Number of Events 설정은 문서상 작동하지 않는다. Graphic group 제한은 아래 table 제한과 다르다.

Legacy Edit History widget 문서는 Action 변경만 표시하고 marking property type의 history는 미지원이라고 설명한다. 최신 user-edit-history의 모든 edit 기록 설명과 범위를 구분한다. 원천 dataset 변경 이력을 이 widget에서 보장하지 않으며 Track user edit history 활성화 전 변경도 소급 수집하지 않는다.

## 출처

- [Palantir, widgets-properties-links](https://www.palantir.com/docs/foundry/object-views/widgets-properties-links)
- [Palantir, widgets-visualization](https://www.palantir.com/docs/foundry/object-views/widgets-visualization)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
