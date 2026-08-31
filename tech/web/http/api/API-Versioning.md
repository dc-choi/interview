---
tags: [web, http, api, versioning]
status: done
verified_at: 2026-08-31
category: "웹&네트워크(Web&Network)"
aliases: ["API Versioning", "API 버저닝", "URL 버저닝", "헤더 버저닝"]
---

# API 버저닝의 HTTP 표면

API 버저닝에는 두 개의 렌즈가 있다. 하나는 버전 값을 HTTP 메시지의 어디에 싣느냐는 전송 표면 문제이고, 다른 하나는 언제 버전을 올릴지 정하는 설계 정책 문제다. 이 문서는 앞의 것, 즉 경로와 쿼리, Accept, 커스텀 헤더 네 위치의 메커니즘과 캐시, 라우팅, 관측에 미치는 영향만 다룬다. breaking change 판정과 폐기 기간 같은 정책은 별도 렌즈다.

## 버전은 HTTP 메시지의 어디에 실리는가

같은 의도의 요청을 네 가지 표면으로 쓰면 이렇게 갈린다.

```
GET /v1/users/42 HTTP/1.1
Host: api.example.com
```

```
GET /users/42?version=1 HTTP/1.1
Host: api.example.com
```

```
GET /users/42 HTTP/1.1
Host: api.example.com
Accept: application/vnd.example.v1+json
```

```
GET /users/42 HTTP/1.1
Host: api.example.com
API-Version: 1
```

앞의 두 개는 버전이 target URI 안에 있고, 뒤의 두 개는 URI 바깥의 헤더에 있다. 이 구분이 캐시 키, 게이트웨이 라우팅, 로그 노출 전부를 결정한다.

## URL 경로 버저닝 (`/v1/users`)

- **캐시 키가 URI 자체**라서 프록시와 CDN에서 버전별 응답이 자연스럽게 분리된다. 추가 설정이 없어도 v1 응답이 v2 요청에 서빙될 여지가 없다.
- 게이트웨이와 로드밸런서가 **path prefix만 보고 라우팅**할 수 있어 v1과 v2를 다른 배포 단위로 나누기 쉽다. 액세스 로그와 APM 트랜잭션 이름에도 버전이 그대로 남아 별도 계측이 필요 없다.
- 브라우저 주소창과 `curl` 한 줄로 재현되고, 문서와 이슈 리포트에 URL만 붙이면 버전이 특정된다.
- 대가: 같은 개념의 리소스가 버전마다 다른 URI를 갖는다. 식별자 안정성을 중시하는 관점에서는 버전이 올라갈 때 전 엔드포인트의 URI가 통째로 바뀌는 점이 약점이다.

## Media Type 버저닝 (`Accept: application/vnd.example.v1+json`)

- 버전을 **표현(representation) 협상의 일부**로 다룬다. 리소스 URI는 `/users/42`로 고정되고 클라이언트가 원하는 표현만 바꾼다.
- `vnd.`로 시작하는 벤더 트리와 `+json` 구조화 구문 접미사는 RFC 6838이 정의한 형식이다. `Accept: application/json;v=2`처럼 media type 파라미터로 붙이는 변형도 쓰이지만, `v`는 등록된 파라미터가 아니라 서버가 협상 로직을 직접 구현해야 한다.
- 대가 1: 캐시 정합성을 위해 응답에 `Vary: Accept`가 필요하다. RFC 9111은 `Vary`가 지명한 요청 헤더가 원 요청과 모두 일치하지 않으면 저장된 응답을 재검증 없이 쓰지 말라고 규정한다. 이 헤더가 빠지면 캐시는 URI만 보고 버전이 다른 응답을 재사용한다.
- 대가 2: 브라우저 주소창으로 재현되지 않고, 액세스 로그에 버전이 안 보여 관측 설정을 따로 해야 한다.
- 대가 3: 중간 프록시나 SDK가 `Accept`를 기본값으로 덮어쓰면 클라이언트는 조용히 기본 버전으로 넘어간다. 실패가 에러가 아니라 다른 응답 모양으로 나타나서 늦게 발견된다.

## 커스텀 헤더 버저닝 (`API-Version: 2`)

- Media Type 방식보다 구현이 단순하다. 문자열 하나만 파싱하면 되고, 게이트웨이에서 헤더 값을 라우팅 키로 쓰기도 쉽다. `API-Version`은 표준 HTTP 의미가 아니라 이 API의 계약으로 정의한 field다.
- 대가: HTTP가 정의한 협상 메커니즘이 아니라서 캐시가 자동으로 인식하지 않는다. `Vary: API-Version`을 직접 걸어야 하고, CDN 쪽에서도 해당 헤더를 캐시 키에 넣도록 설정해야 한다.
- 대가: 헤더 이름 자체가 팀 컨벤션이라 계약 문서에 명시하지 않으면 클라이언트가 알아낼 방법이 없다. OpenAPI 문서에서 파라미터로 기술해 두는 부담이 따라온다.

## Query 버저닝 (`?version=1`)

- 버전이 URI에 드러나 재현과 캐시 키 분리는 경로 방식과 비슷하게 얻는다.
- 대가: 필터, 정렬, 페이지네이션과 **같은 쿼리 공간을 공유**한다. 파라미터 순서가 다르거나 중복으로 들어오거나 값이 비어 있을 때 어떻게 정규화할지 규칙을 따로 정해야 하고, 캐시 키 정규화도 그 규칙을 따라가야 한다.
- 대가: 라우팅 계층이 쿼리를 파싱해야 버전을 알 수 있어, path prefix만 보는 라우팅보다 게이트웨이 설정이 복잡해진다.

## 네 방식 비교

| 축 | URL 경로 | Query | Media Type | 커스텀 헤더 |
|---|---|---|---|---|
| 캐시 키 분리 | URI에 포함되어 기본 분리 | URI에 포함되나 정규화 규칙 필요 | `Vary` 설정에 의존 | `Vary`와 CDN 설정에 의존 |
| `Vary` 필요 여부 | 불필요 | 불필요 | `Vary: Accept` 필요 | `Vary: <헤더명>` 필요 |
| 게이트웨이 라우팅 | path prefix로 단순 | 쿼리 파싱 필요 | media type 파싱 필요 | 헤더 값 매칭으로 단순 |
| 로그와 관측 노출 | 기본 노출 | 기본 노출 | 별도 계측 필요 | 별도 계측 필요 |
| 브라우저, curl 재현 | 주소창으로 가능 | 주소창으로 가능 | 헤더 지정 필요 | 헤더 지정 필요 |
| URI 안정성 | 버전마다 URI 변경 | 쿼리만 변경 | URI 고정 | URI 고정 |
| 클라이언트 구현 부담 | 낮음 | 낮음 | 협상 로직과 SDK 설정 | 헤더 규약 공유 필요 |

실무에서 URL 경로 방식이 널리 쓰이는 이유는 REST 원칙에 더 맞아서가 아니라, 캐시 키와 라우팅과 로그가 추가 설정 없이 한 번에 갈라지기 때문이다.

## 버전 미지정과 미지원 버전의 처리

- **기본 버전을 둘 것인가**: 버전 없는 요청을 최신으로 해석하면 클라이언트 수정 없이 동작이 바뀌는 사고가 생긴다. 최초 버전으로 고정하면 오래된 계약을 무기한 부양하게 된다. 신규 API는 버전 명시를 요구하고, 기존 API는 기본 버전을 최초 버전으로 못 박는 쪽이 사고가 적다.
- **버전 중립 라우트**: 헬스 체크, 메타데이터, 인증 콜백처럼 계약이 버전과 무관한 엔드포인트는 버전 축에서 빼 둔다. NestJS의 `VERSION_NEUTRAL`이 이 자리를 담당한다.
- **버전 선택 오류의 응답 코드**는 버전을 어디에 실었느냐와 오류 종류로 갈린다.
  - 경로 버전이 라우트 자체에 없으면 `404`가 자연스럽다.
  - 쿼리나 `API-Version` header가 문법에 맞지 않으면 `400`과 `invalid_api_version` 같은 오류 코드를 준다. 문법은 맞지만 지원하지 않는 버전이면 `400`과 `unsupported_api_version`처럼 별도 코드로 구분한다. HTTP 상태를 같게 쓰더라도 두 원인을 섞지 않는다.
  - `Accept`로 협상했는데 만족할 표현이 없고 기본 표현도 줄 생각이 없다면 `406`이다. MDN은 406 대신 기본 표현을 `200`으로 주는 편이 나은 경우가 많다고 본다.
- 어느 코드를 쓰든 **오류 본문에 지원 버전 목록을 실어 준다**. 406 본문 형식은 표준으로 정해진 것이 없으므로 팀의 에러 응답 규약을 따른다.

## 폐기 신호의 HTTP 표면

버전을 내리는 시점을 응답 헤더로 미리 알린다. 정책이 아니라 신호 규격만 여기서 다룬다.

- **`Deprecation`** (RFC 9745, 2025년 3월, Standards Track): 리소스가 폐기되었거나 폐기될 시점을 Structured Field의 Date로 싣는다. 예: `Deprecation: @1688169599`.
- **`Sunset`** (RFC 8594, 2019년 5월, Informational): 리소스가 응답하지 않게 될 시점을 HTTP-date로 싣는다. 예: `Sunset: Sat, 31 Dec 2018 23:59:59 GMT`. RFC 9745는 `Sunset` 값이 `Deprecation` 값보다 이르면 안 된다고 규정한다.
- **`Link`**: 두 RFC가 각각 `deprecation`, `sunset` 링크 관계 타입을 정의한다. 마이그레이션 문서를 가리키는 데 쓴다. 예: `Link: <https://developer.example.com/deprecation>; rel="deprecation"; type="text/html"`.
- **`Warning`** 헤더는 쓰지 않는다. RFC 9111이 생성도 노출도 널리 되지 않는다는 이유로 폐기했다.

```
HTTP/1.1 200 OK
Deprecation: @1688169599
Sunset: Sun, 31 Dec 2023 23:59:59 GMT
Link: <https://developer.example.com/v2-migration>; rel="deprecation"; type="text/html"
```

## 캐시와 중간 시스템에서 실제로 깨지는 지점

- **`Vary` 누락**: 헤더 기반 버저닝에서 가장 흔한 사고다. v1과 v2가 같은 URI를 쓰는데 `Vary`가 없으면, 공유 캐시에 먼저 들어간 v1 응답이 v2 클라이언트에 그대로 서빙된다. 스키마가 달라 클라이언트 파싱이 깨지지만 상태 코드는 200이라 알림이 안 울린다.
- **CDN 캐시 키 커스터마이즈**: `Vary`를 붙였다고 끝이 아니라 CDN 쪽 설정도 맞춰야 한다. CloudFront는 cache policy에 넣은 header의 전체 값을 캐시 키에 쓴다. 따라서 버전 값은 `1`, `2`처럼 유한하고 정규화된 집합으로 제한한다. `Accept`의 media type과 q값 조합처럼 값 종류가 많으면 같은 표현도 여러 캐시 엔트리로 갈려 hit ratio가 떨어질 수 있다.
- **중간 계층의 헤더 제거**: 인증 프록시, WAF, 사내 게이트웨이가 `API-Version`을 전달하지 않으면 버전 지정이 사라지고 기본 버전으로 폴백한다. 커스텀 헤더 방식을 고를 때는 요청 경로 위의 모든 홉이 그 헤더를 통과시키는지 먼저 확인한다.
- 캐시의 기본 동작과 조건부 요청은 [[HTTP-Caching]]에 정리되어 있다.

## 면접 체크포인트

- URL 경로 버저닝이 실무에서 편한 진짜 이유는 REST스러움이 아니라 캐시 키, 라우팅, 로그가 추가 설정 없이 버전별로 갈라진다는 운영상의 이점이다.
- Media Type 버저닝에서 `Vary: Accept`가 필수인 이유는, 캐시가 URI만으로 응답을 재사용하기 때문이다. RFC 9111은 `Vary`가 지명한 헤더가 일치할 때만 재검증 없이 재사용하도록 규정한다.
- 경로에 없는 버전은 404, 협상 헤더에 대체 표현이 없으면 406이다. 쿼리와 `API-Version` header는 malformed와 syntactically valid but unsupported를 오류 코드로 구분한다.
- 폐기는 문서 공지가 아니라 응답 헤더로 전달할 수 있다. `Deprecation`(RFC 9745)으로 폐기 시점을, `Sunset`(RFC 8594)으로 종료 시점을, `Link`로 마이그레이션 문서를 알린다.
- GraphQL은 버전을 올리는 대신 필드 단위 `@deprecated`로 스키마를 진화시킨다. HTTP 버저닝의 캐시와 라우팅 문제는 피하지만, 폐기 추적과 사용 계측을 스키마 계층에서 직접 떠안는다.
- 모바일처럼 클라이언트를 강제로 올릴 수 없는 환경에서는 구버전이 오래 살아남으므로, 방식 선택보다 여러 버전을 동시에 운영할 수 있는 구조인지가 먼저다.

## 출처
- [RFC 9745, The Deprecation HTTP Response Header Field](https://www.rfc-editor.org/rfc/rfc9745.html)
- [RFC 8594, The Sunset HTTP Header Field](https://www.rfc-editor.org/rfc/rfc8594.html)
- [RFC 9111, HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html)
- [RFC 6838, Media Type Specifications and Registration Procedures](https://www.rfc-editor.org/rfc/rfc6838.html)
- [RFC 6648, Deprecating the X- Prefix](https://www.rfc-editor.org/rfc/rfc6648.html)
- [RFC 9205, Building Protocols with HTTP](https://www.rfc-editor.org/rfc/rfc9205.html)
- [MDN, Accept 헤더](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Accept)
- [MDN, Vary 헤더](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Vary)
- [MDN, 406 Not Acceptable](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/406)
- [MDN, HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
- [Amazon CloudFront Developer Guide, Control the cache key with a policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html)

## 관련 문서
- [[API-Conventions-Operations|API 실무 컨벤션 (버저닝 3전략 요약, 메서드 의미, 인증 헤더)]]
- [[Controller-Routing|NestJS 버저닝 구현 (enableVersioning, @Version, VERSION_NEUTRAL)]]
- [[HTTP-Caching|HTTP 캐싱과 조건부 요청 (Cache-Control, Vary, 캐시 키)]]
- [[Content-Negotiation|콘텐츠 협상 (Accept, q 가중치, 표현 선택)]]
- [[HTTP-Content-Type|Content-Type과 media type]]
- [[HTTP-Status-Code|HTTP 상태 코드 (400, 404, 406의 의미)]]
- [[REST|REST, RESTful API (자원 모델과 안티패턴)]]
- [[API-Documentation|API 문서화 (OpenAPI에 버저닝 정책 기술)]]
- [[GraphQL-Schema-Design|GraphQL 스키마 설계 (@deprecated로 버저닝 회피)]]
- [[Mobile-App-Architectures|모바일 앱 개발 방식 (다중 클라이언트 버전 공존)]]
- [[Schema-Versioning|DB 스키마 버전 관리 (다른 계층의 전후방 호환)]]
- [[API-Versioning-Design|API 버저닝 설계 정책 (breaking 판정, 폐기 거버넌스)]]
