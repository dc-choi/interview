---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Object View 구성과 권한

Standard Object View는 schema의 prominent/normal/hidden과 media/time-series/geospatial 표시를 따른다. Configured view는 Workshop 기반으로 업무에 맞게 꾸미며 생성하면 default가 된다. Standard는 계속 남고 toggle할 수 있지만 문서는 Workshop에서 toggle 미지원이라고 명시한다. Full은 상세 화면, panel은 instance 또는 같은 type의 object set을 다룬다. Set panel의 기본 Charts는 최대 5개, List는 최대 3개 property를 보인다.

자동 생성된 기본 configured view는 schema 변경을 따라가지만 한 번 편집하면 user-managed가 되어 이후 변경을 수동 반영한다. Tab별 Workshop module과 전체 tab structure가 별도다. Tab 삭제는 소유한 module도 삭제할 수 있다. Canvas resolution은 편집 preview이며 실제 host/device 크기를 강제하지 않는다.

Legacy datasource-derived 권한은 Object View Admin과 backing source 중 하나의 Editor가 필요하다. Ontology role은 object type Ontology Editor, project model은 해당 project Editor로 편집한다. Managed module은 object type 권한을 따라가며 standalone으로 변환하면 별도 권한을 관리해야 한다. View 접근 권한을 내장된 모든 데이터/앱 접근과 동일시하지 않는다.

use-object-views-in-platform의 영어 URL은 확보되지 않아 공식 중국어 기계번역을 사용했다. 원문도 번역 정확성 미검증을 표시하므로 최신 영어 config-overview의 project model과 비교해 읽는다.

## 출처

- [Palantir, object-views](https://www.palantir.com/docs/foundry/object-views)
- [Palantir, config-object-views](https://www.palantir.com/docs/foundry/object-views/config-object-views)
- [Palantir, config-overview](https://www.palantir.com/docs/foundry/object-views/config-overview)
- [Palantir, config-panel-views](https://www.palantir.com/docs/foundry/object-views/config-panel-views)
- [Palantir, overview](https://www.palantir.com/docs/foundry/object-views/overview)
- [Palantir, standard-object-views](https://www.palantir.com/docs/foundry/object-views/standard-object-views)
- [Palantir, use-full-views-in-platform](https://www.palantir.com/docs/foundry/object-views/use-full-views-in-platform)
- [Palantir, use-object-views-in-platform](https://palantir.com/docs/zh/foundry/object-views/use-object-views-in-platform/)
- [Palantir, use-panel-views-in-platform](https://www.palantir.com/docs/foundry/object-views/use-panel-views-in-platform)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
