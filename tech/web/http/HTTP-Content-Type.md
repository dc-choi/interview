---
tags: [web, http, content-type, mime, rest]
status: done
verified_at: 2026-08-04
category: "웹&네트워크(Web&Network)"
aliases: ["HTTP Content-Type", "Content-Type", "MIME Type"]
---

# HTTP Content-Type, MIME Type

`Content-Type` 헤더는 **요청/응답 본문의 미디어 타입(MIME Type)을 알려주는 메타 정보**다. 수신 측이 바디를 어떤 형식으로 파싱할지 결정하는 단서이며, 잘못 지정하면 JSON 요청이 쿼리 파라미터로 해석되거나 파일 업로드가 깨지는 등 프로토콜 호환성이 곧바로 무너진다.

## 표현 메타데이터와 인접 Field

`Content-Type`, `Content-Encoding`, `Content-Language`는 선택된 Representation을 해석하는 메타데이터다. `Content-Length`는 문맥에 따라 실제 message content나 선택된 Representation의 예상 길이를 나타낸다.

| 헤더 | 역할 |
|---|---|
| `Content-Type` | 데이터의 미디어 타입 (JSON, HTML, 이미지 등) |
| `Content-Encoding` | 압축, 인코딩 방식 (`gzip`, `br`, `deflate`) |
| `Content-Language` | 자연어 (`ko`, `en-US`) |
| `Content-Length` | 문맥에 따른 content 또는 선택된 표현의 예상 octet 수 |

앞의 세 Field는 content를 어떻게 해석할지 알려 준다. `Content-Length`는 HTTP/1.1에서 message framing에도 관여하므로 단순한 표현 형식 정보로만 분류하지 않는다.

혼동 포인트: `Transfer-Encoding: chunked`는 HTTP/1.1의 현재 hop에서 메시지 경계를 정하는 transfer coding이다. `Content-Encoding: gzip`처럼 Representation 자체에 적용되는 end-to-end coding과 구분한다.

## 형식

```
Content-Type: <type>/<subtype>; <parameter>=<value>
```

- 예: `application/json`, `text/plain; charset=utf-8`, `multipart/form-data; boundary=----Web...`
- 등록 기관: IANA가 공식 MIME Type 목록 관리(`type/subtype`)
- `x-` prefix만 보고 현재 등록 여부를 판단하지 않는다. `application/x-www-form-urlencoded`는 이름에 `x-`가 남아 있지만 IANA에 등록됐고 HTML 표준이 form encoding 알고리즘을 정의한다.

## 주요 타입 맵

| 카테고리 | 대표 타입 | 용도 |
|---|---|---|
| **application** | `application/json` | HTTP API에서 흔한 구조화 페이로드 |
| | `application/xml` | SOAP, 레거시 연동 |
| | `application/x-www-form-urlencoded` | HTML form submit(기본) — `key=value&key=value` |
| | `application/octet-stream` | 형식 불명 바이너리 |
| | `application/pdf`, `application/zip` | 문서, 압축 |
| **multipart** | `multipart/form-data` | **파일 업로드** — 필드마다 boundary로 분리 |
| | `multipart/mixed` | 여러 타입 복합 전송(메일 첨부) |
| **text** | `text/html`, `text/plain`, `text/css`, `text/csv` | 텍스트 포맷 |
| **image/audio/video** | `image/png`, `image/jpeg`, `audio/mpeg`, `video/mp4` | 미디어 |
| **event stream** | `text/event-stream` | Server-Sent Events |

## 요청 vs 응답

- **요청 헤더 `Content-Type`** — 클라이언트가 보내는 **바디 포맷**
- **요청 헤더 `Accept`** — 클라이언트가 받기를 원하는 **응답 포맷**. 서버는 content negotiation으로 적절한 포맷을 선택
- **응답 헤더 `Content-Type`** — 서버가 돌려주는 **바디 포맷**

## JSON vs Form Encoded

가장 자주 혼동되는 두 타입.

### `application/json`

```
POST /users HTTP/1.1
Content-Type: application/json

{"name":"dc","age":26}
```

- 현대 HTTP API에서 흔한 선택이다. REST 제약이 JSON을 필수 형식으로 정하는 것은 아니다. 중첩, 배열, 숫자, 불리언과 null을 표현할 수 있다.
- Spring `@RequestBody`, Express `express.json()`, NestJS `ValidationPipe` 등이 파싱

### `application/x-www-form-urlencoded`

```
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

name=dc&age=26
```

- HTML form의 기본 encoding이다. 공백은 보통 `+`, 그 밖의 문자는 form algorithm에 따라 percent-encode한다.
- Query처럼 보이지만 RFC 3986의 일반 Query 문법과 같은 개념은 아니다. URL API와 Framework가 제공하는 전용 encoder를 사용한다.
- **대용량, 바이너리 부적합** — 임의 binary를 직접 표현하는 형식이 아니며 text 변환은 크기와 처리 비용을 늘린다. 첨부는 `multipart/form-data`를 사용한다.
- Spring `@ModelAttribute`/`@RequestParam`, Express `express.urlencoded()` 등이 파싱

## 파일 업로드: `multipart/form-data`

```
POST /upload HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitBoundary123

------WebKitBoundary123
Content-Disposition: form-data; name="file"; filename="photo.jpg"
Content-Type: image/jpeg

<binary bytes>
------WebKitBoundary123
Content-Disposition: form-data; name="caption"

hello
------WebKitBoundary123--
```

- 필드마다 서브 Content-Type을 가질 수 있어 텍스트, 바이너리 혼합 가능
- boundary 문자열은 바디 안에 등장해선 안 됨(충돌 방지)

## 자주 생기는 장애 패턴

- **`Content-Type` 누락** — Express/Spring에서 JSON 파서가 동작하지 않아 `req.body`가 비어 있음
- **클라가 JSON을 보냈는데 헤더는 form-urlencoded** — 서버가 key=value 파서로 해석하여 400/422
- **문자 encoding 오해** — Internet 사이에서 교환하는 JSON text는 UTF-8을 사용하고 `application/json` 등록에는 `charset` parameter가 정의돼 있지 않다. 다른 text media type은 각 등록 정의를 확인한다.
- **boundary 잘못** — multipart 업로드 전체가 실패
- **Content-Type 기반 content negotiation 남용** — REST에서는 보통 JSON 하나로 통일. 여러 타입을 제공해야 하면 Accept와 조합

## 면접 체크포인트

- `Content-Type`과 `Accept`의 차이(요청 바디 vs 받고 싶은 응답)
- JSON과 form-urlencoded의 적합 영역과 구조적 차이
- 파일 업로드에 `multipart/form-data`가 필요한 이유
- JSON의 wire encoding이 UTF-8이며 `application/json`에 `charset` parameter가 정의되지 않은 이유
- Content negotiation이 언제 유용하고 언제 과한가
- **표현 메타데이터 vs 전송 coding** 차이 (content 해석 vs HTTP/1.1 hop의 운송 방식)

## 출처
- 김영한 강사, [클라이언트에서 서버로 데이터 전송](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61368)
- 김영한 강사, [표현](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61375)
- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 8259, JSON](https://www.rfc-editor.org/rfc/rfc8259.html)
- [IANA, application/x-www-form-urlencoded](https://www.iana.org/assignments/media-types/application/x-www-form-urlencoded)
- [WHATWG HTML, URL-encoded form data](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#url-encoded-form-data)
- [6991httam — REST API Content-Type 설정](https://6991httam.medium.com/rest-api-content-type-%EC%84%A4%EC%A0%95-c903e06a9936)
- [yunzema — HTTP Content-Type 정리](https://yunzema.tistory.com/186)

## 관련 문서
- [[REST|REST API]]
- [[HTTP-Status-Code|HTTP Status Code, Header]]
- [[HTTP-Seminar|HTTP 버전별 진화와 핵심 요소]]
