---
tags: [palantir, gotham, api, oauth, pagination]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Gotham API 클라이언트 계약"]
---

# Gotham API 클라이언트 계약

Gotham REST API는 객체 데이터베이스 RevDB 등을 HTTP로 다룬다. Foundry API나 Defense OSDK와 이름이 비슷해도 경로, 데이터 모델과 지원 범위를 구별해야 한다. 아래는 2026-10-16 공식 문서의 계약이며 실제 API 호출 검증은 아니다.

## 인증 주체와 API 경로

환경의 hostname과 HTTPS를 사용하며, 각 요청에 Bearer token을 전달한다. 개발용 사용자 토큰은 해당 사용자의 권한으로 동작한다. 공유 저장소나 프로덕션 앱에 넣지 않고 필요 없어지면 폐기한다.

프로덕션 연동은 사용자를 대신하는 authorization code 방식과 서비스 사용자를 사용하는 client credentials 방식을 구분한다. 앱에 허용된 scope와 데이터 접근 권한도 별개다. Defense OSDK는 의미가 명시된 인터페이스 계층이며, 실제 제공 여부는 환경에서 확인한다.

OpenAPI 정의는 인증된 `/api/gotham/openapi` 경로로 제공한다. 공개 안내의 호환성 검사는 Java generator와 Jersey2 조합에 한정된다. 다른 언어의 생성 클라이언트까지 검증됐다고 해석하지 않는다. 정의 파일의 구조도 릴리스 사이에 바뀔 수 있다.

## 페이지 크기와 종료 조건

다중 결과는 `nextPageToken`을 따라 반복 조회한다. GET의 다음 토큰은 query parameter, POST는 request body에 둔다. 같은 조회 조건과 페이지마다 인증을 유지한다. 응답에서 다음 토큰이 사라지면 종료한다.

공통 설명의 `pageSize`는 요청 크기 제안이다. 실제 결과 수가 더 적거나 많을 수 있으므로 요청 개수와 같지 않다는 이유만으로 끝내지 않는다. 개별 endpoint가 별도의 최대값을 설명하면 그 계약도 함께 확인한다. 페이지 사이의 스냅샷 일관성이나 토큰 유효기간은 이 공통 안내만으로 보장되지 않는다.

## 오류를 상태와 본문으로 읽는다

보통 오류에는 `errorCode`, `errorName`, `errorInstanceId`와 parameters가 있다. 그러나 모든 오류가 JSON 본문을 가진다는 보장은 없다. 404, 414, 429, 431과 503 등은 HTTP 상태만으로도 처리할 수 있어야 한다.

- 401은 인증 정보의 누락이나 유효성, 403은 접근 허용 범위를 확인한다.
- 400, 415와 422는 인자, 조합, 콘텐츠 타입과 처리 가능성을 확인한다.
- 429는 요청률을 줄이고, 503은 서비스 가용성을 확인해 재시도를 결정한다.
- 쓰기 재시도는 해당 endpoint의 멱등성과 부분 성공 계약부터 확인한다.

객체 타입이나 속성 유효성 오류와 권한 오류를 같은 빈 결과로 바꾸면 원인을 숨긴다. 연합 원천의 객체를 수정할 수 없는 경우도 별도 오류가 있다. 관측값 쓰기의 공통 오류 안내는 잘못된 입력이 하나라도 있으면 모두 쓰지 않는다고 설명하지만, 개별 쓰기 endpoint는 실패 목록 이외의 관측값이 저장되는 부분 성공을 설명한다. 전체 거부로 단정하지 말고 실제 버전의 응답과 저장 결과를 확인한다.

## 안정 버전과 preview

비호환 변경은 URL 버전을 바꾼다. 안정 endpoint를 교체하거나 없앨 때는 최소 12개월 전 안내하고 그동안 지원과 SLA를 유지한다는 공개 정책이다. 폐기 예정 응답은 `deprecation` header로 알린다.

Public Preview는 프로덕션용이 아니며 `preview=true`로 명시적으로 사용한다. 사전 안내 없이 변경하거나 제거될 수 있으므로 안정 버전의 12개월 정책을 적용하지 않는다. 문서 URL의 v1/v2 여부만으로 endpoint의 안정성을 판단하지 않는다.

## 출처

- [Palantir, Gotham API Introduction](https://www.palantir.com/docs/gotham/api/general/overview/introduction)
- [Palantir, Gotham API Authentication](https://www.palantir.com/docs/gotham/api/general/overview/authentication)
- [Palantir, Gotham API Getting started](https://www.palantir.com/docs/gotham/api/general/overview/getting-started)
- [Palantir, Gotham API Paging](https://www.palantir.com/docs/gotham/api/general/overview/paging)
- [Palantir, Gotham API Errors](https://www.palantir.com/docs/gotham/api/general/overview/errors)
- [Palantir, Write observations](https://www.palantir.com/docs/gotham/api/geotime-resources/observations/write-observations)
- [Palantir, Gotham API Versioning](https://www.palantir.com/docs/gotham/api/general/overview/versioning)

## 관련 문서

- [[Palantir-Defense-OSDK|명시적 인터페이스와 Defense OSDK]]
- [[Gotham-Map-Structure-and-Geometry|지도 구조와 API 경계]]
- [[Gotham-Inbox-Message-Delivery|메시지 검증과 부분 실패]]
