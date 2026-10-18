---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 필수 속성과 mandatory control의 검증 경계

Required property는 OSv2 색인 시 source 값을, Action apply 시 편집 값을 검증한다. schema 저장 성공 뒤에도 기존 null 때문에 색인이 실패할 수 있다. 기본 required array는 비어 있으면 실패하지만 empty array 허용 옵션을 켜면 null만 금지한다. 매핑된 Action parameter를 비우면 빈 배열을 쓸 수 있으므로 필수 사용자 입력을 보장하려면 이 예외를 고려한다.

MDO의 required는 해당 source에 객체가 존재할 때 적용된다. 다른 source에만 행이 있으면 required 속성이 null인 객체가 정상 색인될 수 있다. Action이 그 source에 속한 다른 속성을 처음 만들 때 required 값도 필요해진다. Required를 객체 전체의 무조건적인 non-null 보장으로 해석하지 않는다.

## Mandatory control

OSv2 mandatory control property는 source에 속한 다른 속성을 보호한다. MDO에서는 source별 control을 검토한다. Marking은 모두 충족해야 하고 organization은 지정된 것 중 하나 이상을 충족해야 한다. 둘은 함께 구성할 수 있지만 CBAC classification은 같은 property에서 이 조합과 분리한다.

Allowed marking/organization 또는 maximum classification을 source에 설정한다. 허용되지 않은 기존 값은 색인 실패, 잘못된 편집은 Action 실패로 이어진다. mandatory 값은 null일 수 없지만 허용한 빈 marking/organization 배열은 해당 제약을 모든 사용자가 통과하게 한다. source 없는 기존 편집 객체에 control을 추가할 때는 nullable string array를 만들고 Action으로 backfill한 뒤 control로 바꾸는 절차를 문서가 제시한다. 이는 같은 문서의 RV marking-column 요구와 구분해 source 없는 모델의 예외로 읽는다.

Materialization은 허용 marking/organization 또는 최대 classification의 보수적인 제약으로 보호한다. Action의 mandatory parameter는 marking/classification을 지원하고 organization parameter는 지원하지 않는다. Parameter-level 최대 classification은 제출 전 검증, datasource 제약은 이후 완료 단계의 실패도 낼 수 있어 구분한다.

Marketplace에서는 control의 허용값과 최대 classification이 설치 입력이 된다. 같은 값을 쓰는 여러 속성/parameter는 하나의 설치 입력으로 합쳐질 수 있다. Hidden 기본 표시를 실제 권한 강제로 혼동하지 않는다.

## 출처

- [Palantir, mandatory-control-properties](https://www.palantir.com/docs/foundry/object-link-types/mandatory-control-properties)
- [Palantir, required-properties](https://www.palantir.com/docs/foundry/object-link-types/required-properties)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Functions]]
