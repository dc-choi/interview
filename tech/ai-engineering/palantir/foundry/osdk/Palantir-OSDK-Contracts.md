---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-18
category: "AI엔지니어링(AIEngineering)"
---

# OSDK의 생성 타입, 권한과 데이터 전달

OSDK는 선택한 Ontology의 Object, Link, Action과 Query에 맞춰 타입과 호출 코드를 생성한다. TypeScript npm, Python pip/Conda, Java Maven과 다른 언어용 OpenAPI를 제공한다. 일반 Platform SDK와 Ontology별 생성 SDK의 역할을 구분한다.

Developer Console에서 앱과 resource subset, generation version을 관리한다. Ontology-as-code와 앱을 함께 version/release하려면 SuperRepo의 local OSDK regeneration 경로도 검토한다. 선택지가 있다는 설명이며 기존 앱을 전환한 구현 결과는 아니다.

## 읽기 권한과 response 이후

OAuth token의 app resource/operation 범위와 실제 사용자/service-user 권한이 함께 제한한다. generated 타입이 존재한다고 runtime read/write가 허용되는 것은 아니다. 이름/description metadata도 생성 패키지와 OpenAPI에 들어가므로 공개해도 되는 내용을 사용한다.

row/column access control은 읽을 수 있는 데이터를 필터링하지만 OSDK response payload와 이후 앱의 처리까지 따라가는 통제는 아니다. downstream 보존이 필요하면 Marking/Classifications 등 해당 보안 모델을 결합한다. UI 필터나 TypeScript 타입을 보안 enforcement로 사용하지 않는다.

## generation과 runtime 버전

TypeScript v2는 Ontology schema/metadata와 `@osdk/client`, `@osdk/oauth` runtime을 분리한다. 생성 SDK와 runtime package를 각각 관리하며 CLI 이름이 latest여도 기존 생성기가1.x면 legacy client 코드가 나올 수 있다. Python2도 Platform SDK와 client를 공유한다.

API response와 SDK가 해석해 반환한 값은 같지 않을 수 있다. aggregate 결과, Result wrapper, Action edits와 query instance를 언어별로 확인한다. `fetchPage` 한 번은 전체 목록 읽기가 아니다.

## Ontology와 앱을 함께 바꾸는 개발 흐름

Developer Console에서 앱을 만든 뒤 언어별로 bootstrap하는 경로와 SuperRepo에서 Ontology를 코드로 관리하는 경로를 구분한다. SuperRepo는 객체 타입, 링크와 Action 정의를 함수 및 프론트엔드와 같은 저장소에 두고, Ontology와 앱을 하나의 산출물로 버전 관리하고 릴리스하려는 경우에 맞는다.

SuperRepo에서는 정의가 바뀔 때 OSDK를 로컬에서 다시 생성한다. 따라서 개별 수정 사이마다 SDK 버전을 재발행하지 않고 새 타입을 사용하는 코드까지 같은 편집과 미리보기 흐름에서 확인할 수 있다. 이는 개발 중 SDK 재생성에 관한 설명이다. 로컬 미리보기를 실제 배포나 운영 권한 검증 완료로 해석하지 않는다.

일반 OSDK 시작 절차에서 Foundry 호스팅은 선택 사항이다. OSDK는 compute module 안에서도 컨테이너 애플리케이션이 Ontology 객체와 상호작용하는 데 사용할 수 있다. SDK 사용 여부, 앱의 호스팅 위치와 실행 환경은 별도 결정이며, 세부 설치와 인증은 각각 [[Palantir-OSDK-Setup]], [[Palantir-OSDK-Authentication]]에서 확인한다.

이 절은 2026-10-18 OSDK overview의 개발 흐름과 사용 환경을 대조한 부분 검증이다.

공개 참조를 학습한 문서이며 실제 enrollment API, load, OAuth나 Action을 실행해 검증한 결과는 아니다.

## 출처

- [Palantir, ontology-sdk](https://www.palantir.com/docs/foundry/ontology-sdk)
- [Palantir, overview](https://www.palantir.com/docs/foundry/ontology-sdk/overview)
- [Palantir, generate-osdk-for-other-languages](https://www.palantir.com/docs/foundry/ontology-sdk/generate-osdk-for-other-languages)

## 관련 문서

- [[Palantir-OSDK]]
- [[Palantir-OSDK-Authentication]]
- [[Palantir-OSDK-Compatibility]]
