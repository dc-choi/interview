---
tags: [palantir, foundry, time-series]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry derived series, 버전과 접근 권한"]
---

# Foundry derived series, 버전과 접근 권한

Derived series는 저장된 관측 결과가 아니라 read time에 실행하는 재사용 계산 논리다. Input series와 논리를 바꾸면 결과가 바뀔 수 있으므로 resource, logic template, bound object type과 version을 따로 관리한다.

## Template와 단일 series

Templated derived series는 한 root object 관점의 TSP/linked sensor 논리를 같은 타입의 객체에 반복 적용한다. Single derived series는 같은 Ontology의 여러 객체를 함께 사용할 수 있다. Quiver 전체 card 지원 목록과 derived-series 지원 목록은 다르다.

Derived resource RID는 name/description 등 resource metadata이고 codex template(Logic RID)는 runtime 계산 논리 참조다. Bound object type은 저장 후 바꿀 수 없으며 해당 타입에서만 template를 resolve한다. Quiver에서 생성한 derived series도 생성 후 source analysis와 연결되지 않아 Catalog의 management page에서 관리한다.

## 버전과 Ontology 저장

Manual 저장은 TSP에 raw series ID 대신 template RID를 넣는다. `templateRid`/`templateVersion`을 가진 JSON 참조는 특정 version을 고정한다. Qualified raw-series ID와 template JSON은 다른 형식이다. Raw/derived 값을 한 TSP에서 섞을 수 있지만 derived template를 qualified series ID로 감싸지 않는다.

Manual unpinned reference는 논리 저장이 바로 반영될 수 있다. Automatic saving은 특정 version을 참조하므로 Save와 Deploy가 구분된다. Dynamic root scope에 새 객체가 들어와도 sensor object가 자동으로 이미 생성된 것은 아니며 Ontology status를 보고 redeploy한다.

Automatic saving은 sensor type, String primary key, OSv2, edits enabled가 필요하다. Templated는 root one→sensor many의 단일 link가 필요하고 scope 선택은 5,000 object 제한이다. Property mapping은 string/Boolean만 지원한다.

Create/modify/delete Action types는 각각 단일 rule이며 parameter constraint/override와 parameter-based submission criterion 제약이 있다. Unused required parameter나 unmapped property를 요구하면 사용할 수 없다. 실제 Action submission permission을 만족해야 한다.

Resource를 지워도 생성한 sensor object는 삭제되지 않는다. Ontology 삭제/배포와 resource 삭제를 분리한다. Workshop Derived Series widget은 sensor-bound series만 지원하고 type/root/sensor 설정에 맞는 resource만 보여 준다. Widget이 표시하지 않는 것을 resource가 없다는 근거로 쓰지 않는다.

## 읽기 권한의 여러 경로

TSP 조회는 object/property 접근과 모든 backing sync datasource의 권한을 요구한다. Sync는 input dataset marking을 상속한다. Sync 자체는 restricted view로 backing할 수 없어 granular row permission과 같은 방식으로 처리하지 못한다.

고급 구성에서 sync marking 상속을 TSP 경로에서 끊으면 TSP를 통한 읽기는 object/property permission으로 제어할 수 있다. 이때 직접 sync 조회는 여전히 원래 marking을 만족해야 한다. 경로별 enforcement 차이를 먼저 검토해야 하며 marking 제거를 보편적 설정으로 권장하지 않는다.

Derived series를 읽으려면 그 논리가 참조한 모든 input TSP에도 접근할 수 있어야 한다. Resource 생성/수정은 bound type edit permission이, manual Ontology 저장은 backing datasource와 Ontology edit 권한이 필요하다.

Automatic saving의 Ontology status는 사용자가 볼 수 있는 object를 기준으로 계산한다. Restricted view로 일부 root/sensor만 보는 사용자가 전체 scope를 관리하면 잘못된 상태 판단이 생길 수 있으므로 scope 전체와 관련 sensor 접근을 확인한다. 실제 권한과 Action을 실행해 검증한 것은 아니다.

## 변경 호환성

Nested derived series는 source TSP 삭제, sensor 이름 변경과 numeric→categorical 변경의 영향을 downstream으로 전파할 수 있다. Source 논리 수정 전 의존 consumer와 pinned version을 확인한다. 영어 `setup-derived-series` 대신 확보한 중국어 경로에는 공식 AIP 미검증 번역 경고가 있으며 이전 Quiver 생성 흐름을 보존한다. 현재 Catalog/management 계약과 구분해 사용한다.

## 출처

- [Palantir Time series, derived-series-common-questions](https://www.palantir.com/docs/foundry/time-series/derived-series-common-questions)
- [Palantir Time series, derived-series-create](https://www.palantir.com/docs/foundry/time-series/derived-series-create)
- [Palantir Time series, derived-series-overview](https://www.palantir.com/docs/foundry/time-series/derived-series-overview)
- [Palantir Time series, derived-series-permissions](https://www.palantir.com/docs/foundry/time-series/derived-series-permissions)
- [Palantir Time series, derived-series-widget](https://www.palantir.com/docs/foundry/time-series/derived-series-widget)
- [Palantir Time series, manage-derived-series](https://www.palantir.com/docs/foundry/time-series/manage-derived-series)
- [Palantir Time series, manual-ontology-saving](https://www.palantir.com/docs/foundry/time-series/manual-ontology-saving)
- [Palantir Time series, setup-derived-series (중국어 AIP 미검증 번역)](https://palantir.com/docs/zh/foundry/time-series/setup-derived-series/)
- [Palantir Time series, time-series-permissions](https://www.palantir.com/docs/foundry/time-series/time-series-permissions)

## 관련 문서

- [[Palantir-Time-Series]]
- [[Palantir-Quiver-Time-Series-Interpolation-and-Aggregation]]
- [[Palantir-Time-Series-Identity-Schema-and-Sync|Foundry 시계열 identity, schema와 sync]]
- [[Palantir-Time-Series-Indexing-Performance-and-Usage|Foundry 시계열 색인, hydration과 사용량]]
- [[Palantir-Time-Series-Alerting-State-and-Replay|Foundry 시계열 alerting의 상태, 지연과 재평가]]
- [[Palantir-Time-Series-Functions-and-Calculation-Semantics|Foundry 시계열 함수와 계산 의미]]
