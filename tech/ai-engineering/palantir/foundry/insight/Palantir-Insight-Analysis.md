---
tags: [palantir, foundry, insight]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Insight의 분석 경로와 검색 의미

Insight는 Ontology의 객체, 링크와 집합을 path의 step으로 분석한다. Object Explorer가 전체 Ontology 탐색/개별 객체 확인에 적합하다면 Insight는 알고 있는 데이터를 코드 없이 분석하는 흐름에 맞는다. Workbook은 경로와 화면 설정을, published object set은 path의 조회 정의를 재사용하는 resource다.

Link step은 분석 대상을 연결된 타입으로 이동시키고 linked-property filter는 원래 타입을 유지하며 관계 조건만 검사한다. 링크가 목록에 보인다고 일치 객체가 존재하는 것은 아니다. Step은 순서를 바꾸지 못하며 경로 복제 후 추가/삭제/disable로 비교한다. Filter를 link 뒤로 옮기면 의미가 바뀌기 때문이다.

## 검색 조건

is는 raw value의 exact match, starts with는 raw 값의 접두사, contains는 앞선 token 전부 exact 및 마지막 token prefix의 AND다. Contains는 token 순서를 요구하지 않는다. Contains any word from은 token OR, contains phrase는 연속된 순서를 요구한다. Matches terms within은 phrase들을 최대 간격 안에서 찾고 순서 요구를 선택한다.

기본 analyzer는 대소문자를 정규화하고 underscore/period는 token 안에 남기지만 dash는 분리한다. 부분 문자열 검색과 token prefix를 혼동하지 않는다. 단어 내부 substring에는 regex-enabled property와 regex가 필요하다. Leading wildcard는 searchable와 leading-wildcard render hint가 필요하며 원문은 OSv1 reindex를 지정한다. *term*의 양끝 wildcard 조합은 미지원이다. 이 OSv1 절차를 OSv2에 그대로 적용하지 말고 해당 저장소 문서를 확인한다.

## 복사, 참조와 결과 보존

Object set copy는 정의를 복제하므로 원본 정의 변경과 독립적이다. Reference는 원본 조회 정의를 read-only starting block으로 사용하므로 뒤에 step을 추가해도 원본을 수정하지 않는다. Published path 삭제 시 object set을 함께 삭제할지 따로 선택할 수 있다.

Save as list는 결과의 object ID만 고정한다. 분석 step이나 각 property 값의 역사적 snapshot은 보존하지 않는다. 원문에 static copy/snapshot이라는 표현이 있어도 ID 목록 계약을 넘어 값까지 동결됐다고 해석하지 않는다. XLSX export 한도는 200,000 objects다. Interface는 시작 데이터로 사용할 수 있지만 확대된 분석 지원과 AIP Chatbot 연동은 FAQ에서 예정으로 설명한다.

## 출처

- [Palantir, insight](https://www.palantir.com/docs/foundry/insight)
- [Palantir, analysis-panel](https://www.palantir.com/docs/foundry/insight/analysis-panel)
- [Palantir, core-concepts](https://www.palantir.com/docs/foundry/insight/core-concepts)
- [Palantir, faq](https://www.palantir.com/docs/foundry/insight/faq)
- [Palantir, filter-card](https://www.palantir.com/docs/foundry/insight/filter-card)
- [Palantir, getting-started](https://www.palantir.com/docs/foundry/insight/getting-started)
- [Palantir, link-card](https://www.palantir.com/docs/foundry/insight/link-card)
- [Palantir, overview](https://www.palantir.com/docs/foundry/insight/overview)

## 관련 문서

- [[Palantir-Insight]]
- [[Palantir-Object-Explorer-Search]]
