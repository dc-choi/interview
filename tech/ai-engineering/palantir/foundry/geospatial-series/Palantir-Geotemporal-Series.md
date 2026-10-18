---
tags: [palantir, foundry, geotemporal-series]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 위치와 시간 관측을 Ontology에 연결하기

Geotemporal series는 entity의 timestamp와 지리적 위치를 observation으로 저장한다. 위치가 없는 측정값은 일반 time series가 맞다. 비행, 이동 동물, 배송 추적처럼 경로 자체가 질문의 대상일 때 사용한다.

구형 geotemporal-series 경로는 정확성 미검증 중국어 번역으로 복구했다. 이후 영어 geospatial의 data-modeling과 integration 원문으로 schema, ID와 GTSR 계약을 대조했다. 기능은 beta이며 enrollment별 availability가 다르다. 지도별 선택과 type mapping은 [[Palantir-Geospatial-Operational-Patterns]]를 따른다.

## 객체와 sync의 역할

Geotemporal-series object type은 출발/도착 같은 metadata와 GTSR(geotemporal series reference) property를 가진다. Dataset/stream-backed sync는 관측을 전용 저장소로 색인하고 GTSR로 해당 series를 조회하게 한다. Pipeline Builder geotemporal-series output과 필요시 object output을 설정한다.

Series ID는 sync 내에서 유일해야 하고 같은 series의 모든 값은 같은 sync에 둔다. 항공편 번호만으로 여러 날짜를 합치지 않도록 출발/도착/날짜를 포함하는 식별 전략을 검토한다. 충돌은 최신 위치와 경로를 섞는다.

## Observation schema

필수값은 1~100자 string series ID, sensor event timestamp, 위도/경도 GeoPoint다. 선택적 Double altitude는 meter 단위이며 렌더링에서는 HAE(ellipsoid 기준 높이)를 가정한다. 지표면 상대 높이와 혼동하지 않는다.

속도/방향처럼 observation마다 변하는 속성은 dynamic이다. 변하지 않는 정보는 객체 metadata에 두는 것이 기본이다. 검색을 위해 observation에 중복 저장해야 하면 static으로 표시해 압축/downsampling 방식을 알려줄 수 있다. Static 표시가 매 observation의 값 입력 의무를 없애지는 않는다.

## 출처

- [Palantir, Data modeling](https://www.palantir.com/docs/foundry/geospatial/data-modeling/)
- [Palantir, Integrate geotemporal series](https://www.palantir.com/docs/foundry/geospatial/integrate-geotemporal-series-with-the-ontology/)

- [Palantir, geotemporal-series](https://palantir.com/docs/zh/foundry/geotemporal-series/)
- [Palantir, concepts-glossary](https://palantir.com/docs/zh/foundry/geotemporal-series/concepts-glossary/)
- [Palantir, data-modeling](https://palantir.com/docs/zh/foundry/geotemporal-series/data-modeling/)
- [Palantir, faq](https://palantir.com/docs/zh/foundry/geotemporal-series/faq/)
- [Palantir, integrating-geotemporal-series-with-the-ontology](https://palantir.com/docs/zh/foundry/geotemporal-series/integrating-geotemporal-series-with-the-ontology/)
- [Palantir, overview](https://palantir.com/docs/zh/foundry/geotemporal-series/overview/)

## 관련 문서

- [[Palantir-Time-Series]]
- [[Palantir-Map]]
