---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 속성 타입과 저장 형태의 제약

Base type은 저장 가능한 값과 검색/편집 연산을 정한다. dataset field type의 Map/Binary를 그대로 Ontology base type으로 사용할 수 없다. Vector, media reference, geospatial, time series, cipher와 struct는 추가 계약을 갖는다.

String/Integer/Short는 일반적인 키 후보다. Date/Timestamp는 저장 정밀도와 충돌, Boolean/Byte는 좁은 값 범위, Long은 JavaScript 정밀도 때문에 primary key로 권장하지 않는다. Float/Double/Decimal, 배열, struct, vector와 참조형은 primary key가 될 수 없다. 배열 안 null과 OSv2 중첩 배열도 지원하지 않는다. Vector/time series를 모든 base type과 같은 배열로 취급하지 않는다.

Ontology geopoint 문자열은 `latitude,longitude`이며 GeoJSON의 좌표 순서와 다르다. 표시된 좌표나 시간의 문자열을 저장 식별자로 그대로 사용하면 정밀도와 순서 오류를 낼 수 있다.

Media reference는 MIME type, media set RID, view RID와 item RID로 외부 media를 가리킨다. Backing column 매핑 외에 Capabilities의 media source 설정이 필요하며 여러 source라면 upload destination을 지정한다. 참조 속성의 접근 권한은 원본 media 권한을 대신하지 않는다.

## 문서 지원표의 차이

Property metadata는 Byte/Float/Short의 Action 미지원과 Vector의 TSv1 KNN 전용, 차원 2,048을 설명한다. Properties overview는 Byte를 Integer parameter로 할당한다고 설명하며 최신 Functions는 v2 KNN을 다룬다. 따라서 해당 표를 모든 언어/버전의 지원 한계로 확장하지 않는다. Action의 최신 supported property types와 생성 SDK를 함께 확인한다.

## 출처

- [Palantir, base-types](https://www.palantir.com/docs/foundry/object-link-types/base-types)
- [Palantir, properties-overview](https://www.palantir.com/docs/foundry/object-link-types/properties-overview)
- [Palantir, property-metadata](https://www.palantir.com/docs/foundry/object-link-types/property-metadata)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Functions]]
