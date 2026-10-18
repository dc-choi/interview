---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Object View 내장 앱, 미디어와 댓글

Object Explorer Comments Helper와 Workshop Comments widget은 별개다. Legacy comments는 object property writeback이 아니며 source dataset 변경 시 feed가 사라질 수 있다. 검색/분석 가능한 기록이 필요하면 Action으로 저장한다. Linked Files 업로드도 object property로 저장되지 않고 매번 destination을 선택한다. 첨부 재사용은 Action attachment 모델을 검토한다.

Attachment media는 object 권한을 따르는 경로이고 dataset URL media는 object와 media 위치 양쪽 접근이 필요하다. Transaction URL과 branch view URL은 고정/변경 시점이 다르다. Legacy PDF 경로는 /api/dataproxy, 다른 media 예제는 /api/web/dataproxy로 구분한다. External iframe은 보안 정책과 embedding 허용을 확인해야 하며 embedded=true는 UI만 조정한다.

## Slate 메시지 연결

페이지 도입부는 Slate가 cross-filter를 못 한다고 하지만 상세 Slate widget 절은 postMessage 기반 공유를 명시한다. 단순 iframe embedding과 전용 Slate widget을 구분한다. 기본 objectId/objectTypeId와 custom parameter는 Slate Variable을 만들어 받아야 한다.

ACTIVE_FILTERS_UPDATED는 전체 filter, ACTIVE_FILTERS_BY_OBJECT_TYPE_ID_UPDATED는 type별/global filter를 전달한다. 초기 준비 완료 후 REQUEST_ACTIVE_FILTERS 또는 REQUEST_ACTIVE_FILTERS_BY_OBJECT_TYPE을 보내 state를 요청한다. OPEN_OBJECT_BY_RID, OPEN_OBJECT_BY_PRIMARY_KEY, OPEN_NEW_SEARCH_FOR_OBJECT_SET, PUBLISH_OBJECT_SET_FILTER, CLEAR_PUBLISHED_FILTERS와 REFRESH_OBJECT_VIEW를 지원한다. 마지막 publish는 같은 widget의 이전 filter를 교체하므로 Slate가 자기 filter state를 관리해야 한다.

메시지 prefix는 HUBBLE_SLATE_WIDGET // 이며 실제 payload shape와 debugging toolbar의 validation을 확인한다. 외부 메시지를 임의 코드/권한 지시로 해석하지 않는다. Hyperlink widget의 single-brace template와 iframe/sidebar의 double-brace template도 서로 다르다.

## 출처

- [Palantir, comment-on-objects](https://www.palantir.com/docs/foundry/object-views/comment-on-objects)
- [Palantir, widgets-apps-files](https://www.palantir.com/docs/foundry/object-views/widgets-apps-files)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
