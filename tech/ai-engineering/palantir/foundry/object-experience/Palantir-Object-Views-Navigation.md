---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Object View 프로필, Tab과 앱 연결

Profile은 group의 hubble:isProfile=true와 displayName으로 정의하며 반영에 최대 5분, view당 최대 10개다. isDiscoverable=true면 비회원도 profile을 볼 수 있다. 한 profile group에만 속한 사용자에게 default가 적용된다. Tab visibility는 profile/property/link-target type 접근에 따라 결정한다. 표시 숨김은 데이터 접근 통제가 아니다.

Managed Workshop tab은 view 권한을 따라가고 재사용하지 못한다. Standalone module은 여러 view에 재사용하지만 자체 접근 권한을 맞춰야 한다. Parameter의 external ID와 module interface 변수를 일치시킨다. 현재 object를 external ID object의 ObjectSet으로 전달하는 legacy 절차는 중국어 공식 기계번역 페이지로 확보했으며 최신 host 지원을 확인한다.

Sidebar는 비어 있지 않은 app/action group을 publish해야 표시된다. Embedded app의 권한이 없더라도 card 자체는 보일 수 있다. Workshop/Slate는 current property, linked set와 static value를 parameter로 전달하며 application link는 새 browser tab으로 열린다. URL template의 {{parameterName}}과 objectId/objectTypeId, encoding 옵션을 구분한다.

Cross-tab legacy filtering은 같은 case-sensitive filterSet을 사용해야 한다.

## Object View URL과 임베딩 경로

2026-10-24 공식 URL 생성 문서에서 다음 경로와 표시 옵션을 대조했다. 위의 profile, tab과 sidebar 설정은 이번 검증 범위에 포함하지 않았다.

| 목적 | 경로와 동작 |
|---|---|
| 객체 타입과 기본 키로 연결 | `/workspace/hubble/external/object/v0/<object-type-id>?<primary-key-property-id>=<primary-key-property-value>` |
| RID로 Object Explorer 안에서 열기 | `/workspace/hubble/external/search/v2/?objectId=<objectRid>`. 기본 키 값에 특수문자가 있을 수 있으면 이 방식을 권장한다 |
| Explorer의 추가 wrapper 없이 열기 | `/workspace/hubble/objects/<objectRid>` |
| iframe에 독립 Object View 임베딩 | `/workspace/object-view/<objectRid>`. Workspace sidebar 없이 열린다 |

독립 경로에 `shouldHideHeader=true`를 붙이면 header를 숨기고, `inDarkMode=true`를 붙이면 다크 모드로 연다. 두 옵션을 함께 쓰는 예는 `/workspace/object-view/<objectRid>?shouldHideHeader=true&inDarkMode=true`다. 댓글과 Object Explorer 탐색 시작 같은 header 기능은 `/workspace/hubble/*` 경로와 다를 수 있다.

일반 임베딩 안내의 `embedded=true`도 Workspace sidebar를 숨기는 옵션이지만, 객체를 iframe에 넣는 경우에는 독립 경로를 사용하라는 구체적인 안내를 따른다. 표시 옵션을 접근 권한의 대체 수단으로 사용하지 않는다. 실제 임베딩과 권한 동작은 시험하지 않았다.

## 출처

- [Palantir, config-app-sidebar](https://www.palantir.com/docs/foundry/object-views/config-app-sidebar)
- [Palantir, config-profiles](https://www.palantir.com/docs/foundry/object-views/config-profiles)
- [Palantir, config-tabs](https://www.palantir.com/docs/foundry/object-views/config-tabs)
- [Palantir, config-workshop-tabs](https://palantir.com/docs/zh/foundry/object-views/config-workshop-tabs/)
- [Palantir, generate-urls](https://www.palantir.com/docs/foundry/object-views/generate-urls)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
