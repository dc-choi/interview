---
tags: [nodejs, express, http, validation, upload]
status: done
verified_at: 2026-10-01
category: "OS - Node.js"
aliases: ["Express Request and Body", "Express 요청 파싱"]
---

# Express 요청 입력과 업로드

`req.params`, `req.query`, `req.body`는 서로 다른 입력 위치다. 파싱은 입력 형식을 해석하는 단계이고 신뢰할 값인지 확인하는 검증과 권한 검사는 다음 단계다. 사용자가 보낸 값에 바로 `.toString()`, `.trim()` 등을 호출하지 않는다.

## URL과 요청 속성

| 속성 | 의미 |
|---|---|
| `originalUrl` | query를 포함한 원래 URL, mount로 url을 바꿔도 유지 |
| `baseUrl` | 이번 요청에 실제 매칭한 Router mount prefix |
| `url` | Node 속성, 현재 middleware에 전달된 URL. mount prefix 제거 가능 |
| `path` | query 없는 현재 path, mount 내부에서는 prefix 제외 |
| `params` | 매칭 경로의 값. wildcard는 배열, 선택 구간 미매칭 key는 없음 |
| `query` | 설정한 query parser 결과, Express 5에서는 getter |
| `body` | 일치하는 body parser 실행 뒤의 결과, 미파싱은 undefined |
| `method`, `route` | HTTP method와 현재 매칭된 Route 정보 |
| `app`, `res` | 현재 app과 대응 response 참조 |

예를 들어 `/admin/new?sort=desc`를 `/admin`에 mount한 middleware 안에서는 `baseUrl='/admin'`, `path='/new'`, `originalUrl='/admin/new?sort=desc'`다.

query parser 기본값은 `simple`이다. 중첩 객체가 필요할 때 `extended` 또는 제한한 사용자 parser를 선택한다. `false`는 query 파싱을 끄며 빈 객체를 반환한다. `req.query`를 수정해 정규화하려 하지 말고 검증한 값을 별도 객체로 만든다. query 배열, 반복 key와 객체 형태를 기대한 단일 문자열과 구별한다.

`req.host`는 port를 포함하고 `hostname`은 제외한다. `protocol`, `secure`, `ip`, `ips`는 proxy 신뢰 설정에 영향을 받는다. `subdomains`는 기본 offset 2에 따라 host를 분리한다. 이 값들을 그대로 tenant 권한이나 redirect 허용의 근거로 삼지 않는다.

## header, 협상과 cache 검사

- `req.get(field)`/`header(field)`는 대소문자를 구별하지 않고 header를 읽으며 없으면 undefined다. Referer/Referrer 표기는 둘 다 처리한다.
- `req.is(type)`는 요청 Content-Type 검사다. 일치 값, false 또는 body가 없을 때 null을 반환한다. 요청의 Accept를 검사하는 함수가 아니다.
- `req.accepts(types)`는 Accept에서 제공 가능한 최선의 표현을 선택하며 없으면 false다. 이 경우 app이 406 응답을 정한다.
- `acceptsCharsets`, `acceptsEncodings`, `acceptsLanguages`는 해당 Accept 계열을 확인한다. `acceptsLanguages()`는 인자 없이 허용 언어 배열을 반환한다.
- `req.fresh`/`stale`은 응답 cache freshness 판단이다. 요청 `Cache-Control: no-cache`는 fresh를 false로 만든다. 사용자 인증이나 DB 데이터 최신성의 판정이 아니다.
- `req.range(size, { combine })`는 Range를 파싱해 배열을 반환한다. `-2`는 malformed, `-1`은 unsatisfiable이므로 배열 접근 전 구별한다. `combine`은 인접/겹친 범위를 합친다.
- `req.xhr`는 `X-Requested-With: XMLHttpRequest`의 표시일 뿐 인증 근거가 아니며 fetch 요청 전체를 의미하지도 않는다.

## parser 선택과 타입

| parser | 기본 Content-Type | req.body 결과 |
|---|---|---|
| `express.json()` | application/json | JSON 객체/배열, strict false이면 다른 JSON 값도 허용 |
| `express.raw()` | application/octet-stream | Buffer |
| `express.text()` | text/plain | 문자열 |
| `express.urlencoded()` | application/x-www-form-urlencoded | form key/value 객체 |

내장 parser는 body-parser에 기반한다. parser를 소비 route보다 먼저 두되 route별 필요한 종류만 장착할 수 있다. multipart는 이 parser들의 대상이 아니며 Multer 등 별도 도구가 필요하다.

Content-Type이 `type` 조건과 다르거나 읽을 body가 없으면 parser는 req.body를 채우지 않는다. `type`은 MIME/확장자/배열/함수로 선택할 수 있고 `application/*+json`처럼 vendor JSON 타입을 명시할 수 있다. `*/*`로 모든 입력을 같은 형식으로 해석하지 않는다.

parser 여러 개를 쌓았다고 항상 원하는 body가 되는 것은 아니다. `Buffer.isBuffer`와 `typeof`를 포함해 실제 결과 타입을 확인한다. 앞 middleware가 stream을 이미 소비하거나 `req.setEncoding()`을 호출했으면 byte parser가 오류를 낼 수 있다.

## 제한과 세부 옵션

- 네 parser의 `limit` 기본값은 `100kb`다. number는 byte, string은 bytes 단위 문자열이다. 큰 본문은 decode/변환 메모리와 지연을 늘리므로 요청별 실제 필요에 맞춰 제한한다.
- `inflate` 기본 true는 compressed body를 해제하고 false이면 거부한다. 현재 Express 5/body-parser는 gzip, deflate와 Brotli 입력을 지원한다. 응답 압축과는 다른 계약이다.
- JSON의 `strict` 기본 true는 배열/객체만 허용한다. `reviver`는 JSON.parse의 변환 함수, `defaultCharset`은 기본 utf-8이다.
- text의 `defaultCharset`은 utf-8이고 URL-encoded는 utf-8/iso-8859-1을 지원한다. `charsetSentinel`, `interpretNumericEntities`는 form charset/문자 참조 처리에 사용하는 옵션이다.
- URL-encoded의 `extended` 기본 false다. true는 중첩 객체/배열 표현을 허용한다. `parameterLimit` 기본 1000, `depth` 기본 32이며 필요한 깊이와 field 수를 최소화한다.
- `verify(req, res, buf, encoding)`는 파싱 전 Buffer를 검사하고 throw로 중단할 수 있다. webhook 검증처럼 원래 byte가 중요하면 JSON 재직렬화 결과를 서명 검증 입력으로 쓰지 않는다. provider가 요구하는 원본과 decompression 조건을 따로 확인한다.

## parser 오류를 업무 오류와 구별

body-parser 오류의 `type`, `status`/`statusCode`, `expose`로 분류한다. message 문자열 matching에 의존하지 않고, 오류의 body 원문을 응답이나 로그로 노출하지 않는다.

| 오류 | 기본 응답/뜻 |
|---|---|
| `entity.parse.failed` | 400, 형식을 파싱할 수 없음 |
| `entity.verify.failed` | 403, verify 검사 실패 |
| `request.aborted` | 400, body 읽기 완료 전 client 중단 |
| `request.size.invalid` | 400, Content-Length와 byte 길이 불일치 |
| `entity.too.large`, `parameters.too.many` | 413, 크기/parameter 수 제한 초과 |
| `charset.unsupported`, `encoding.unsupported` | 415, charset/content encoding 거부 |
| `stream.encoding.set`, `stream.not.readable` | 500, stream 소비 순서/설정 문제 |
| URL-encoded depth 초과 | 400, 허용한 중첩 범위 초과 |

parser의 오류도 마지막 Express 오류 middleware로 전달한다. 애플리케이션이 없는 body를 정상 기본값으로 쓸지 400/415로 거부할지는 endpoint 계약에서 정한다.

## Multer의 multipart 계약

Multer는 multipart/form-data만 처리한다. form의 `enctype`과 파일 input의 name이 server가 선택한 fieldname과 맞아야 한다. text field는 `req.body`, 파일은 `req.file` 또는 `req.files`로 들어온다.

| 선택 | 결과와 제한 |
|---|---|
| `single(name)` | 한 파일, req.file |
| `array(name, maxCount)` | 같은 field 파일 배열, req.files |
| `fields([{ name, maxCount }])` | field별 파일 배열 객체 |
| `none()` | text만, 파일을 보내면 LIMIT_UNEXPECTED_FILE |
| `any()` | 모든 파일 배열, 업로드 전용 route에서만 사용 |

Multer를 global middleware로 등록하지 않는다. 인증/권한과 업로드 제한을 route에 먼저 적용하고 받은 파일을 책임지고 처리한다.

`dest`를 지정하면 disk에 저장하고 `storage`로 DiskStorage/MemoryStorage를 선택할 수 있다. 아무 storage 옵션도 없으면 메모리에 보관한다. MemoryStorage의 `buffer`는 전체 파일이므로 동시 요청 수와 크기가 메모리에 직접 영향을 준다.

DiskStorage의 `destination(req, file, cb)`를 함수로 제공하면 directory 생성도 app 책임이다. 문자열 destination은 Multer가 생성한다. `filename` 기본값은 확장자 없는 임의 이름이며 확장자를 자동으로 붙이지 않는다. callback은 `cb(error, value)` 형식이다. client가 보낸 part 순서에 따라 이 callback에서 `req.body`가 아직 완성되지 않을 수 있다.

파일 metadata의 `originalname`, `mimetype`, `encoding`은 신뢰할 검증 결과가 아니다. `size`, disk의 `path`/`destination`/`filename`, memory의 `buffer`를 구분하고 저장 이름을 client path에 맡기지 않는다. `preservePath` 사용은 특히 제한한다. 파일명 part charset 기본값인 `defParamCharset='latin1'`도 client encoding 계약에 맞춰 확인한다.

`limits`는 `fileSize`, `files`, `fields`, `parts`, `fieldNestingDepth` 등 finite 한도를 지정한다. 기본값 중 fileSize/files/fields/parts/nesting depth는 Infinity여서 안전한 운영 한도를 대신하지 않는다. `fieldNameSize`는 100byte, `fieldSize`는 1MB, `headerPairs`는 2000이 기본이다.

`fileFilter(req, file, cb)`에서 `cb(null, true)`는 수락, false는 skip, error는 실패다. `multer.MulterError`와 일반 오류를 구별하되 모든 실패를 Express 오류 흐름으로 넘긴다. MIME/content 검사, 악성 파일, 저장 위치와 공개 다운로드 권한은 [[File-Upload-Security]]의 기준을 함께 적용한다.

## 출처

- [Express, Request Object](https://expressjs.com/en/5x/api/request/)
- [Express, Express Object](https://expressjs.com/en/5x/api/express/)
- [Express, body-parser](https://expressjs.com/ko/resources/middleware/body-parser/)
- [Express, multer](https://expressjs.com/ko/resources/middleware/multer/)
- [Express, Upgrade to Express v5](https://expressjs.com/en/guide/migrating-5/)

## 관련 문서

- [[HTTP-Content-Type|Content-Type과 본문 형식]]
- [[Content-Negotiation|HTTP 표현 협상]]
- [[File-Upload-Security|파일 업로드 보안]]
- [[Express-Routing-and-Middleware|라우팅과 오류 처리]]
- [[Express-Operations-and-Security|proxy 신뢰]]
