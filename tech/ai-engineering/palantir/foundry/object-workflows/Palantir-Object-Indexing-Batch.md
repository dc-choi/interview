---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Funnel batch 색인과 데이터 검증

Funnel은 datasource diff의 changelog, PK로 user edit와 합치는 merge, 저장소 형식 index 생성, search node에 내려받는 hydration을 수행한다. 중간 dataset은 Funnel 소유이고 사용자 접근 대상이 아니다. Index job 성공만으로 조회 준비가 끝난 것은 아니다. Live는 원천 변경과 편집 영속화를 처리하고 replacement는 schema 변경을 배경에서 준비한 뒤 완성된 새 상태로 전환한다.

OSv2는 원천 transaction 종류와 관계없이 변경분을 기본 증분 색인한다. 한 transaction의 PK 중복은 실패하고 transaction 사이 중복은 최신 transaction이 이긴다. is_deleted 이름만으로 삭제하지 않으며 legacy OSv1 changelog metadata가 선언해야 삭제 column으로 처리한다. 원문 window 예제는 delete row를 걸러내므로 기존 객체 tombstone 전파를 보장하는 예제로 사용하지 않는다.

View에 deletion column이 있으면 full reindex한다. Dedup column 순서가 transaction 순서와 어긋나면 incremental window 밖의 더 큰 값을 놓칠 수 있다. 최신 view retention 삭제도 증분 결과를 어긋나게 할 수 있어 full reindex를 검토한다. 기본 80% 행 변경, schema replacement 또는 사용자 요청이면 full reindex한다.

## 검증과 제한

Batch 위반은 job 실패, stream 위반 record는 drop이다. 실수/geopoint/geoshape/array/time-series PK는 불가하다. Schema/type coherence를 매 sync 검사하고 NaN/무한대, empty string, nested array와 array null element를 허용하지 않는다고 설명한다. Empty string을 무조건 null로 바꾸는 OSv1 관행과 구분한다.

String 12 MB, array 100,000 element 제한은 문서상 우선 batch에 적용하며 streaming까지 이미 같은 제한이라고 단정하지 않는다. 큰 binary는 media reference, 거대한 관계는 link로 모델링한다. Geo point는 괄호 없는 lat,long 문자열이다. NOT 조건의 non-empty/required 설명은 실제 mandatory-control empty collection 허용 조건과 함께 검증해야 한다.

Monitoring view로 live/replacement job과 sync propagation delay를 본다. Backing source View 권한으로 Datasources failed job/Builds에서 원인을 확인한다.

## 출처

- [Palantir, object-indexing](https://www.palantir.com/docs/foundry/object-indexing)
- [Palantir, data-restrictions](https://www.palantir.com/docs/foundry/object-indexing/data-restrictions)
- [Palantir, funnel-batch-pipelines](https://www.palantir.com/docs/foundry/object-indexing/funnel-batch-pipelines)
- [Palantir, overview](https://www.palantir.com/docs/foundry/object-indexing/overview)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
