---
tags: [palantir, foundry, release-history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["2024 Ontology identity와 편집 이력"]
---

# 2024 Ontology identity와 편집 이력

2024년 공식 release note의 역사적 변경 기록이다. 현재 지원과 기본값은 해당 제품의 최신 계약을 다시 확인한다.

## Schema 의미의 구분

8월에는 required property와 value type, interface가 도입/확장됐다. Required는 null과 array의 empty를 검증하고 backing data와 Action edit에 적용한다. Value type은 metadata/constraint를 가진 semantic wrapper다. Schema/type validation을 업무적 진실이나 이메일 실재성 검증과 동일하게 보지 않는다.

Interface는 구현 object type의 공통 property/link API를 제공한다. Concrete object로 사용할 때의 local API명과 interface로 사용할 때의 API명을 구분한다. 10-22에는 shared property의 inherited API name을 concrete type에서 참조하는 방식을 제거하고 interface를 공통 API 표면으로 권장했다. 11월 Actions on interfaces와 upsert가 추가됐다고 기록하므로 8월 beta의 미지원 설명을 연말까지 그대로 적용하지 않는다.

Property RID 보존 migration fix, edit-only title key, multi-datasource 변경과 invalid key reference 검증은 identity와 표시명을 분리할 필요를 보여 준다. Primary key/type 변경은6월 기록에서 기존 edit 삭제를 요구한다. 이를 단순 column rename과 동일한 무손실 작업으로 보지 않는다.

## Datasource와 edit 충돌

3월 beta와5월 발표는 기본 apply user edits, 대안 most recent value를 설명한다. 후자는 Date가 아닌 Timestamp property가 필요하고 property를 backing하는 각 datasource별 전략이 적용된다. 5-19의 GA 표현과5-23 상세의 limited beta 표현이 함께 존재하므로 당시 모든 enrollment에서 동일하게 제공됐다고 정규화하지 않는다.

8월 Pipeline Builder-owned Ontology를 Builder/Manager 양쪽에서 편집하도록 바뀌며 conflict/validation/schema migration 선택(drop edits 또는 cast)이 추가됐다. 당시 stream-backed object edit는 지원하지 않고 batch-backed만 지원한다고 명시한다. 이 역사적 제한을 최신 기능 부재로 단정하지 않는다.

## 어떤 변경을 감사할 수 있는가

3월 Edits History widget은 OSv1만 지원했지만10-07/10-22에는 OSv2 지원을 발표했다. OSv2는 Track user edit history 활성화 이후 Action으로 변경한 property만 기록하며 활성화 이전, pipeline 변경과 OSv1에서 이관한 과거 이력은 포함하지 않는다. History widget 표시만으로 전기간 변경이 보존됐다고 보고하지 않는다.

Requires action log는 해당 object를 편집하는 Action의 log rule을 요구한다. Action log, user edit history, raw datasource transaction과 외부 side effect는 다른 증거다. Interface Active 삭제 제한/Active OSv2 edit 일괄삭제 제한도 모든 경로의 삭제 불가능 보증은 아니다.

## 출처

- [Palantir, 2024 release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2024)
- [Palantir, 2024 release notes](https://www.palantir.com/docs/foundry/release-notes/2024)

## 관련 문서

- [[Palantir-Platform-Evolution-2024]]
