---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-11-08
---

# Restricted View와 다중 datasource의 권한 계약

RV는 dataset의 행 정책을 객체에 연결한다. OSv1에서는 객체 타입과 정책을 통과하면 RV 자체의 가시성이 필요하지 않을 수 있지만 OSv2에서는 RV 가시성도 필요하다. OSv1의 granular edit/edit-policy-property 설정은 직접 편집이 허용된 구형 구성에만 해당한다. OSv2와 Actions-only 구성의 편집 권한은 Action에서 관리한다.

RV로 행 단위 제한을 구현할 때는 Ontology Manager에서 객체 타입의 backing datasource로 RV만 선택한다. 데이터소스에서 권한을 물려받는 구성에서 일반 dataset이 backing이면 객체를 보려면 dataset 자체도 볼 수 있어야 한다. Object/property security policy는 backing datasource 권한과 별개로 객체 접근을 정하는 대안 경로이며 [[Palantir-Security-and-Governance]]에서 다룬다.

OSv2 객체 타입에서는 RV datasource 정책과 object/property security policy에 색인 제약이 있다. 정책의 비교 피연산자는 배열 원소를 포함해 `String`이나 `Boolean` 원시 타입이어야 하고, 작다, 작거나 같다, 크다, 크거나 같다 같은 순서 비교는 지원하지 않는다. Timestamp, date와 numeric 속성도 정책이 참조하지 않으면 색인할 수 있다.

적용 판단: 피연산자 타입 제한이므로 numeric, date나 timestamp 속성을 정책에서 쓰면 범위 비교뿐 아니라 동등 비교도 이 제약에 걸린다. OSv2로 옮길 때 같은 조건을 문자열이나 boolean 비교로 표현할 수 있는지 먼저 검토한다.

OSv1 등록 뒤 RV 정책을 바꾸면 Phonograph 등록의 Update가 필요하다. 갱신하지 않으면 최신 데이터를 예전 정책으로 노출할 수 있다. OSv2는 정책 전파를 자동으로 처리한다.

정책에 쓰는 객체 속성을 Action으로 바꾸면 객체를 볼 수 있는 사용자가 달라질 수 있다. backing RV 행의 값은 그대로일 수 있으므로 원천 행 접근과 편집된 객체 접근을 혼동하지 않는다.

## MDO

Column-wise MDO는 여러 dataset/RV의 컬럼을 같은 객체에 연결한다. OSv2에서만 지원하며 stream과 row-wise MDO는 지원하지 않는다. row 단위 합집합 권한은 가능한 경우 RV로 표현한다.

사용자가 source 일부를 볼 수 없거나 특정 primary key가 source에 없으면 해당 속성이 null로 나타난다. 스키마 권한이 있으면 속성 이름은 여전히 보인다. null을 실제 원천 결측으로 단정하지 않는다.

기본키 외 각 속성은 하나의 source에서만 공급해야 한다. 같은 RV 정책을 쓰더라도 policy property를 여러 source에 중복 매핑할 수 없다. source마다 별도 속성을 둔다. Object storage에 sync하는 source는 타입당 최대 70개이며 media/time series sync는 이 수에 포함하지 않는다.

MDO는 user edit와 materialization을 지원한다. 하나의 업무 객체로 이해하는 데이터는 MDO가 편리하며, 독립 객체 사이 관계를 표현하려면 link가 적절하다. link 탐색 비용과 속성 필터 비용의 차이도 함께 검토한다.

## 출처

- [Palantir, configuring-rv-access-controls](https://www.palantir.com/docs/foundry/object-permissioning/configuring-rv-access-controls)
- [Palantir, multi-datasource-objects](https://www.palantir.com/docs/foundry/object-permissioning/multi-datasource-objects)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Ontology-Guides]]
- [[Palantir-Functions]]
