---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Legacy Object View 필터와 레이아웃

Legacy widget tab은 새로 만들 수 없지만 기존 tab을 legacy editor로 편집한다. Widget은 object/link data 설정과 visual 설정을 분리하며 title이 있어야 저장한다. YAML을 복사해 재사용할 수 있지만 대상 type/link/권한을 다시 맞춘다. config-widgets는 영어 원문 미확보로 공식 중국어 기계번역을 읽었고 config-legacy-object-views 영어 문서와 비교했다.

필터는 보통 current object가 아닌 linked object에 적용된다. Cross-section filtering을 켜고, tab 간에는 동일한 case-sensitive filterSet을 둔다. 사용자 local filter는 object 이동/새로고침 뒤 유지되지 않는 경우가 있다. Multiselect는 값 사이 OR, linked sidebar는 같은 property의 값 OR와 다른 property 사이 AND다. 기본 option 수는 100이다. Dropdown은 단일 선택이며 All이 있어도 Active Filters에서 지워지지 않아 dropdown에서 직접 All을 골라야 한다.

Button filter는 기본 off, numeric bound는 inclusive다. 사용하지 않는 기본 0 bound를 지워야 의도한 한쪽 범위가 된다. Filter Sandbox는 내부 cross-filter를 격리하고 ID가 같으면 다른 sandbox/tab과 공유한다. Filter Container는 사전 정의 filter용이다. Subscribe/Publish 둘 다 off면 predefined만 내부 적용, subscribe만 켜면 외부를 수신, publish만 켜면 내부 동적 filter를 외부에 보내고 내부에는 적용하지 않는다. 둘 다 켜도 predefined는 외부에 전파하지 않는다. Active Filters에서 default 제거는 별도 toggle에 달린다.

Conditional Container는 위부터 첫 조건만 표시한다. Property 조건은 current 또는 single-linked object만 가능하고 array/linked aggregation은 지원하지 않는다. Boolean 입력 true/yes/1 외에는 false로 해석하므로 문자열 오타에 주의한다. Filter 기반 조건은 cross-filtering이 필요하다.

Horizontal relative sizing과 pixel sizing을 구분한다. 과한 중첩 tab은 탐색을 어렵게 한다. Markdown property template는 case-sensitive {{propertyName}}이고 property 값의 HTML은 escape한다. Sanitized HTML 허용 설정을 property HTML 실행 허용으로 해석하지 않는다.

## 출처

- [Palantir, config-legacy-object-views](https://www.palantir.com/docs/foundry/object-views/config-legacy-object-views)
- [Palantir, config-widgets](https://palantir.com/docs/zh/foundry/object-views/config-widgets/)
- [Palantir, widgets-filtering](https://www.palantir.com/docs/foundry/object-views/widgets-filtering)
- [Palantir, widgets-layout](https://www.palantir.com/docs/foundry/object-views/widgets-layout)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
