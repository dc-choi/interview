---
tags: [database, modeling, eav]
status: done
category: "Data & Storage - RDB"
aliases: ["EAV Modeling", "EAV 속성 모델링"]
---

# EAV 속성 모델링

속성 종류가 사용자 정의로 늘어나고 정의 자체를 관리해야 할 때 entity, attribute definition과 value를 분리한다. 고정된 핵심 속성을 모두 EAV로 바꾸지는 않는다.

## 조건 조합과 타입 비용

색상=빨강과 크기=큰 값은 서로 다른 EAV row다. 각 조건에서 `(attribute_id, value, entity_id)` 후보를 구한 뒤 entity별 EXISTS 또는 self join으로 AND를 구성한다. 조건 수만큼 lookup/join 비용이 늘 수 있으며 한 row에 두 속성 조건을 동시에 걸면 만족하지 않는다.

모든 값을 text로 저장하면 숫자 정렬이 사전순이 되고 단위, 범위와 date 검증이 약해진다. 타입별 value column/table, typed expression index 또는 별도 핵심 column을 비교한다. pivot 집계는 entity key로 group하고 attribute별 조건부 집계를 하되 entity-attribute 유일성과 다중 값 정책을 먼저 정한다.

## Attribute definition의 계약

정의 table에는 안정적인 attribute id, 의미, type, 단위, 필수 여부, 허용 값과 version을 둔다. 이를 입력 form에 활용할 수 있지만 UI metadata와 DB 무결성은 별도다. 상품군별 옵션이나 사용자 정의 설문처럼 정의가 데이터인 요구에 적합하며 definition 변경 뒤 기존 value의 해석과 migration 책임도 관리한다.

## 출처
- [인프런, EAV 실무 활용 사례](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402015)
- [인프런, EAV 실습 - 쇼핑몰 상품 속성 관리](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402012)
- [인프런, EAV 패턴 개선 - 속성 정의 테이블](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402013)
- [인프런, EAV의 장단점과 사용 시 주의사항](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402014)
- [인프런, EAV의 한계와 JSON의 필요성](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402018)
- [인프런, JSON 설계의 장단점과 한계](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402026)


## 관련 문서

- [[Flexible-Attribute-Modeling]]
- [[Normalization]]
