---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# OSDK 생성 실패와 타입 지원표의 충돌

unsupported-types 문서는 지원하지 않는 Object property를 건너뛰고 error log를 남기는 경우와 Action/Function 때문에 패키지 생성 자체가 실패하는 경우를 구분한다. 빠진 property를 null 값이거나 원본에 없는 데이터로 해석하지 않는다.

## 목록과 버전별 참조의 충돌

확인일 일반 미지원표는 TypeScript property의 Cipher/Marking/Vectors, Python의 Cipher/Marking/Media/Struct(일부Beta예외)/Vector, Java의 TimeSeries/Cipher/Vector를 열거한다.

그러나 Python2 참조는 Media를 직접 읽고 Marking/Vector를 AllowBetaFeatures 안에서 읽는 예제를 제공하며, TypeScript2 참조도 vector 기반 nearestNeighbors를 안내한다. 일반 목록과 언어별 현재 참조가 일치하지 않는다. 일반 표를 그대로 언어 전체의 확정 미지원으로 기록하지 않고 실제 생성기/runtime version, in-platform generated 문서와 생성 log를 확인한다.

## Action과 Function

일반표는 TypeScript Action parameter의 InterfaceObjectSet/MarkingList, Python의 ObjectSet을 미지원으로 설명한다. OAuth2 outbound webhook을 가진 Action도 사전 사용자 authorization이 필요한 이유로 제한한다고 안내한다. 현재 사용 환경의 생성/실행 지원을 확인하기 전 export나 Action의 성공을 추정하지 않는다.

Function의 일반 TypeScript 미지원 output은 Principal/User/Notification/OntologyEdit/ClassificationMarking이다. Python input/output 일반표에는 ObjectSet, AnonymousCustomType/CustomType, GeoShape, Group, MandatoryMarking, ModelGraph, Notification/OntologyEdit/Principal/User, Range, TimeSeries,2D/3D aggregation 계열이 나열된다. Java 일반표는 유사 목록에 ClassificationMarking을 더한다.

Python2 참조는 ObjectSet,2D/3D aggregation과 map query output을 실제 instance로 지원한다고 별도로 설명한다. 따라서 이 일반표와도 충돌하며 version별 query schema가 판단 근거다. 객체 property, Action parameter와 Function input/output의 지원을 하나로 합치지 않는다.

## Media의 상세 참조와 일반 언어표

Functions의 현재 media 상세 문서는 TypeScript2와 Python에서 media upload/read와 Beta transformation을 설명한다. TypeScript의 full metadata는 @osdk/client2.56.0이상, transformAndWait는 @osdk/api2.55.0이상의 unstable export를 요구한다. 이전 helper는 긴 experimental 이름과 mediaReference 인자를 썼으며 현재는 media 인자를 받는다.

Python은 transform_and_wait/async_transform_and_wait로 job을 제출하고 완료까지 polling한다. timeout과 job FAILED는 다른 실패이며 변환 결과 bytes를 Media로 반환하려면 다시 upload한다. PDF OCR은 page별 호출이므로 한 페이지 결과를 전체 문서 결과로 오해하지 않는다. full metadata는 media type별 union을 좁혀 읽으며 unknown은 SDK가 아직 모르는 type, untyped는 platform의 일반 file type이다.

반면 Functions language-feature-support 일반표는 document/audio operation을 미지원으로 표시한다. 일반표와 상세 문서의 시점/기능 범위가 일치하지 않으므로 Beta 여부, package version과 실제 generated API를 기준으로 확인한다. TypeScript1의 MediaItem API와 TypeScript2/Python의 Media transformation API도 구분한다.

## OpenAPI

Struct/Vector는 first-class 대신 any로 표현될 수 있다. 스펙을 export하고 client가 생성됐다는 사실이 강한 타입 지원이나 runtime roundtrip을 보장하지 않는다. 실제 parameter format과 null/array/precision을 별도로 대조한다.

기존 앱 migration은 새 generated SDK와 runtime dependency, serializer, error/response shape까지 확인한다. 이 문서는 충돌을 보존한 학습 결과이며 특정 version 조합을 실행 검증한 지원표가 아니다.

## 출처

- [Palantir, unsupported-types](https://www.palantir.com/docs/foundry/ontology-sdk/unsupported-types)
- [Palantir, python-osdk](https://www.palantir.com/docs/foundry/ontology-sdk/python-osdk)
- [Palantir, typescript-osdk](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk)
- [Palantir, generate-osdk-for-other-languages](https://www.palantir.com/docs/foundry/ontology-sdk/generate-osdk-for-other-languages)

- [Palantir, Functions media 상세](https://www.palantir.com/docs/foundry/functions/media/)
- [Palantir, Functions language feature support](https://www.palantir.com/docs/foundry/functions/language-feature-support/)

## 관련 문서

- [[Palantir-OSDK]]
- [[Palantir-OSDK-Python-Migration]]
- [[Palantir-OSDK-TypeScript-Migration]]
