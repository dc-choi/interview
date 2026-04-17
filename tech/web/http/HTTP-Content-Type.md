---
tags: [web, http, content-type, mime, rest]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["HTTP Content-Type", "Content-Type", "MIME Type"]
---

# HTTP Content-Type · MIME Type

`Content-Type` 헤더는 **요청/응답 본문의 미디어 타입(MIME Type)을 알려주는 메타 정보**다. 수신 측이 바디를 어떤 형식으로 파싱할지 결정하는 단서이며, 잘못 지정하면 JSON 요청이 쿼리 파라미터로 해석되거나 파일 업로드가 깨지는 등 프로토콜 호환성이 곧바로 무너진다.

## 표현 헤더 (Representation Headers)

`Content-Type`은 **표현 헤더(Representation Headers)** 그룹에 속한다. 이 그룹은 메시지 바디의 데이터를 **어떻게 해석할지**에 필요한 메타데이터를 묶은 것으로:

| 헤더 | 역할 |
|---|---|
| `Content-Type` | 데이터의 미디어 타입 (JSON·HTML·이미지 등) |
| `Content-Encoding` | 압축·인코딩 방식 (`gzip`, `br`, `deflate`) |
| `Content-Language` | 자연어 (`ko`, `en-US`) |
| `Content-Length` | 본문 바이트 수 |

이 헤더들의 공통 역할은 **바디 자체를 설명**하는 것. 요청·응답 메시지의 **전송 방식**을 결정하는 것이 아니라, 바디에 담긴 **데이터**를 수신 측이 올바르게 해석하도록 돕는다.

혼동 포인트: `Transfer-Encoding: chunked` 같은 **전송 헤더(Transport Headers)**는 "어떻게 운송할지"를 결정 → 표현 헤더와 층위가 다름. 표현 헤더는 hop-by-hop이 아니라 end-to-end 의미.

## 형식

```
Content-Type: <type>/<subtype>; <parameter>=<value>
```

- 예: `application/json; charset=utf-8`, `multipart/form-data; boundary=----Web...`
- 등록 기관: IANA가 공식 MIME Type 목록 관리(`type/subtype`)
- `x-`로 시작하는 것은 **비표준**(예: `application/x-www-form-urlencoded`은 관습적으로 널리 쓰이지만 x-prefix 비표준 네이밍)

## 주요 타입 맵

| 카테고리 | 대표 타입 | 용도 |
|---|---|---|
| **application** | `application/json` | REST API 기본 페이로드 |
| | `application/xml` | SOAP·레거시 연동 |
| | `application/x-www-form-urlencoded` | HTML form submit(기본) — `key=value&key=value` |
| | `application/octet-stream` | 형식 불명 바이너리 |
| | `application/pdf`, `application/zip` | 문서·압축 |
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

- 현대 REST API 표준. 중첩·배열·타입(숫자/불리언/null) 표현 가능
- Spring `@RequestBody`, Express `express.json()`, NestJS `ValidationPipe` 등이 파싱

### `application/x-www-form-urlencoded`

```
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

name=dc&age=26
```

- HTML form의 기본. URL 쿼리 스트링과 동일 인코딩(`%20`·`+` 등)
- **대용량·바이너리 부적합** — base64 확장 없이는 파일 전송 불가. 첨부는 `multipart/form-data` 사용
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

- 필드마다 서브 Content-Type을 가질 수 있어 텍스트·바이너리 혼합 가능
- boundary 문자열은 바디 안에 등장해선 안 됨(충돌 방지)

## 자주 생기는 장애 패턴

- **`Content-Type` 누락** — Express/Spring에서 JSON 파서가 동작하지 않아 `req.body`가 비어 있음
- **클라가 JSON을 보냈는데 헤더는 form-urlencoded** — 서버가 key=value 파서로 해석하여 400/422
- **charset 미지정** — 비영문 텍스트에서 깨짐. `application/json`은 UTF-8이 기본이지만 다른 타입은 명시 필요
- **boundary 잘못** — multipart 업로드 전체가 실패
- **Content-Type 기반 content negotiation 남용** — REST에서는 보통 JSON 하나로 통일. 여러 타입을 제공해야 하면 Accept와 조합

## 면접 체크포인트

- `Content-Type`과 `Accept`의 차이(요청 바디 vs 받고 싶은 응답)
- JSON과 form-urlencoded의 적합 영역과 구조적 차이
- 파일 업로드에 `multipart/form-data`가 필요한 이유
- REST API에서 `application/json` + UTF-8이 기본인 이유
- Content negotiation이 언제 유용하고 언제 과한가
- **표현 헤더 vs 전송 헤더** 차이 (바디 설명 vs 운송 방식)

## 출처
- [6991httam — REST API Content-Type 설정](https://6991httam.medium.com/rest-api-content-type-%EC%84%A4%EC%A0%95-c903e06a9936)
- [yunzema — HTTP Content-Type 정리](https://yunzema.tistory.com/186)

## 관련 문서
- [[REST|REST API]]
- [[HTTP-Status-Code|HTTP Status Code · Header]]
- [[HTTP-Seminar|HTTP 버전별 진화와 핵심 요소]]
