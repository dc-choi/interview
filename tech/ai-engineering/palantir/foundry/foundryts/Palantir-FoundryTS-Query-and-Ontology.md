---
tags: [palantir, foundry, foundryts]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# FoundryTS lazy query와 Ontology 식별자

FoundryTS는 time-series storage를 query하는 Python library다. FunctionNode는 series→series의 lazy 계산이고 SummarizerNode는 최종 summary다. SummarizerNode 뒤에는 FoundryTS 변환을 계속 붙이지 못하므로 DataFrame/Python 결과로 resolve한 뒤 후처리한다.

FoundryTS singleton은 환경변수로 초기화되며 일반적으로 별도 connection instance를 만들 필요가 없다. Functions 안의 예제는 codex-hub/ontology-metadata/OSS URI와 runtime token을 환경에 연결한다. 공개 예제를 자신의 host/token으로 바꾸는 것은 실제 권한 검증을 대신하지 않는다.

## Object와 property

Object(object_type_id).id(primary_key).property(property_id)로 TSP를 참조한다. Object type ID,API name과 RID는 다르며 property도 ID/RID/API name을 섞지 않는다. FoundryObject를 직접 만들기보다 Object.id의 safeguard를 사용한다. complex/template TSP는 dataframe_identifier가 필요할 수 있다.

## Metadata search

fts.search.series는 Ontology의 searchable property 비교로 series reference를 찾는다. series 안의 값 predicate를 검색하는 API가 아니며 그 경우 DSL/time_series_search를 쓴다. object_types로 scope를 좁히고 TSP가 여러 개면 property_type_id 또는 default TSP를 지정한다.

max_results는1~10,000이며 기본10,000이다. 반환 NodeCollection을 전체 Ontology의 무제한 결과로 보지 않는다. TSP 자체는 searchable property가 아니고 검색용 property가 searchable이 아니면 실패한다.

ontology(name,should_normalize=False)는 Property 표현식을 만들고 force_analyze는 deprecated다. template/qualified multi-sync property에는 experimental_enable_complex_properties=True가 필요하다.

## Resolve와 schema

to_dataframe은 Spark DataFrame,to_pandas는 local Pandas다. columns/types는 예상 결과의 flattened schema를 보여 주고 nested key는 dot로 이어진다. SummarizerNode의 to_dict/to_object는 단일 결과 또는 여러 결과 list를 반환한다.

노드 method 문서와 독립 function 문서에는 dsl/scatter signature,window_size 등의 옛 예제가 섞여 있다. sample이 현재 installed library에서 실행 가능하다고 단정하지 말고 실제 signature와 결과 column을 확인한다. series_ids는 계산 tree의 source 식별자이며 결과 품질의 지표가 아니다.

## 출처

- [Palantir, foundryts](https://www.palantir.com/docs/foundry/foundryts/foundryts)
- [Palantir, overview](https://www.palantir.com/docs/foundry/foundryts/overview)
- [Palantir, nodes-function-node](https://www.palantir.com/docs/foundry/foundryts/nodes-function-node)
- [Palantir, nodes-summarizer-node](https://www.palantir.com/docs/foundry/foundryts/nodes-summarizer-node)
- [Palantir, objects-object](https://www.palantir.com/docs/foundry/foundryts/objects-object)
- [Palantir, objects-foundry-object](https://www.palantir.com/docs/foundry/foundryts/objects-foundry-object)
- [Palantir, search-ontology](https://www.palantir.com/docs/foundry/foundryts/search-ontology)
- [Palantir, search-property](https://www.palantir.com/docs/foundry/foundryts/search-property)
- [Palantir, search-search](https://www.palantir.com/docs/foundry/foundryts/search-search)

- [Palantir, FoundryTS overview](https://www.palantir.com/docs/foundry/foundryts)

## 관련 문서

- [[Palantir-FoundryTS]]
- [[Palantir-FoundryTS-Collections-and-Intervals]]
