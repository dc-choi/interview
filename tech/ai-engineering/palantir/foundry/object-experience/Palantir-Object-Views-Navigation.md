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

Object link는 /workspace/hubble/external/object/v0/<type>?<pk>=<value> 또는 objectRid 기반 external/search/v2 route를 쓴다. 특수문자가 있는 PK에는 RID 경로를 권장한다. /workspace/hubble/objects/<RID>와 embedded=true는 wrapper/sidebar를 줄이는 표시 옵션이며 인가를 바꾸지 않는다. Cross-tab legacy filtering은 같은 case-sensitive filterSet을 사용해야 한다.

## 출처

- [Palantir, config-app-sidebar](https://www.palantir.com/docs/foundry/object-views/config-app-sidebar)
- [Palantir, config-profiles](https://www.palantir.com/docs/foundry/object-views/config-profiles)
- [Palantir, config-tabs](https://www.palantir.com/docs/foundry/object-views/config-tabs)
- [Palantir, config-workshop-tabs](https://palantir.com/docs/zh/foundry/object-views/config-workshop-tabs/)
- [Palantir, generate-urls](https://www.palantir.com/docs/foundry/object-views/generate-urls)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
