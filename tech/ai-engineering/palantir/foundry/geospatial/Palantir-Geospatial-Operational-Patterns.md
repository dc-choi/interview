---
tags: [palantir, foundry, geospatial]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 지리 분석과 실시간 추적의 설계 선택

공통 상황도는 경계/시설/위험과 알림을 합치고, 현장 작업 계획은 작업 구역/자산/인력 위치를 승인과 배정까지 연결한다. 공급망 분석은 공급자/창고/차량과 제약을 함께 시뮬레이션한다. 지도 표시만으로 업무 변경과 승인 절차가 만들어지는 것은 아니다.

## 시계열 경로 선택

Gaia에는 geotemporal series, Foundry Map에는 latitude/longitude의 time-series property와 track object 경로를 사용한다. 둘을 동시에 구현할 수 있지만 FAQ는 양쪽 지도에서 객체가 read-only이고 Action을 실행할 수 없다고 제한한다. 추가 측정값과 위치를 함께 관측하는지, 지도 제품과 enrollment가 무엇인지 먼저 정한다. Geotemporal 기능은 beta이며 enrollment마다 availability가 다르다.

Sync의 필수 schema는 1~100자 series ID, event timestamp, GeoPoint다. 선택 altitude는 meter HAE를 가정한다. Static property도 모든 incoming observation에 넣는다. Downsampling에서 static을 덜 샘플링할 수 있으며 integration 설명은 최신 static 값을 series의 모든 관측에 적용한다고 하므로 과거 값 보존이 필요하면 live로 모델링한다.

## 구성과 배포

Pipeline Builder에서 batch 또는 streaming sync를 만들고 series/timestamp/position을 매핑한다. Observation schema를 비우면 mapped property로 생성한다. Geotemporal Series interface를 sync가 참조하고 object type이 같은 interface를 구현한다. GTSR은 deployed sync RID와 series ID를 연결한다. Object type당 최대1개, array는 허용하지 않는다.

Save와 Deploy를 구분하며 replay는 재처리 범위와 배포 시간을 늘린다. Gaia 접근에는 Gotham이 필요하다. Advanced geotemporal은 MRS가 있어도 type mapping이 필수다. Observation log의 rolling window와 refresh를 통해 과거/신규 관측을 보고 특정 관측 위치로 이동한다. 전체 source history가 화면에 자동 모두 로드되는 것은 아니다.

## 출처

- [Palantir, data-modeling](https://www.palantir.com/docs/foundry/geospatial/data-modeling)
- [Palantir, example-workflows](https://www.palantir.com/docs/foundry/geospatial/example-workflows)
- [Palantir, example_workflows](https://www.palantir.com/docs/foundry/geospatial/example_workflows)
- [Palantir, faq](https://www.palantir.com/docs/foundry/geospatial/faq)
- [Palantir, geotemporal-series-overview](https://www.palantir.com/docs/foundry/geospatial/geotemporal-series-overview)
- [Palantir, integrate-geotemporal-series-with-the-ontology](https://www.palantir.com/docs/foundry/geospatial/integrate-geotemporal-series-with-the-ontology)

## 관련 문서

- [[Palantir-Geospatial]]
- [[Palantir-Geotemporal-Series]]
- [[Palantir-Map]]
