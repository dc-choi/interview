---
tags: [nodejs, express, middleware, cors, compression, timeout]
status: done
verified_at: 2026-10-01
category: "OS - Node.js"
aliases: ["Express Middleware Integrations", "Express 미들웨어 통합"]
---

# Express 미들웨어 통합 계약

middleware package는 생성 함수를 호출해 얻은 middleware를 app/Router에 장착한다. package import, 옵션으로 생성, `app.use`로 stack에 등록하는 단계를 구분한다. 필요한 route와 등록 순서를 명시하고 모든 package를 기본 구성으로 넣지는 않는다.

## CORS

`cors()`는 response header와 preflight 응답으로 browser JavaScript의 cross-origin 응답 공유 정책을 전달한다. simple 요청은 응답 읽기가 허용되지 않아도 server에 도착해 변경 작업이 실행될 수 있다. 반면 preflight가 필요한 CORS 요청은 브라우저의 허가 확인이 실패하면 본 요청을 보내지 않는다. non-browser client는 이 제한을 따르지 않으므로 server의 인증과 인가를 대체하지 않는다.

2026-10-02 부분 검증: 위 문단의 요청 전송과 응답 공유 구분을 WHATWG Fetch 명세와 cors 공식 구현으로 대조했다. 다른 middleware 절이나 배포 설정을 다시 검증한 기록은 아니다.

기본값은 origin `*`, methods `GET,HEAD,PUT,PATCH,POST,DELETE`, preflightContinue=false, optionsSuccessStatus=204다. cookie credential이 필요하면 구체적인 origin 허용과 credentials=true를 함께 정하고 browser의 credentials 설정과 cookie SameSite/Secure도 맞춘다.

| 옵션 | 의미 |
|---|---|
| `origin` | 문자열, Boolean, RegExp, 배열 또는 origin callback |
| `methods` | preflight에서 허용할 method 목록, 실제 권한 검사가 아님 |
| `allowedHeaders` | 허용 request header, 생략하면 요청한 header를 반영 |
| `exposedHeaders` | browser JS에 노출할 custom response header |
| `credentials` | Allow-Credentials 표시 |
| `maxAge` | preflight cache 기간 |
| `preflightContinue` | OPTIONS 응답 뒤 다음 handler에 처리 전달 |
| `optionsSuccessStatus` | legacy client를 위한 204 대체 상태 |

`origin: true`는 요청 origin을 반사한다. 인증 API의 허용 목록을 대신하지 않는다. `origin(origin, cb)`의 origin은 header 없는 요청에서 undefined일 수 있고 `cb(error, decision)`으로 결과를 전달한다. 전체 옵션을 요청별로 계산할 때는 `cors((req, cb) => cb(null, options))` 계약을 사용한다.

`app.use(cors(options))`는 통과하는 route의 preflight도 처리한다. route별로 장착하면 같은 path의 OPTIONS도 연결한다. Express 5의 catch-all OPTIONS path는 이름 있는 `/{*splat}`을 사용하고 오래된 `app.options('*', ...)` 예제를 복제하지 않는다. 단순히 OPTIONS를 인증으로 막아 실제 credential 요청 이전 단계가 실패하지 않도록 순서를 확인한다.

## compression

`compression(options)`은 Content-Type의 압축 가능성, client Accept-Encoding과 옵션을 기준으로 gzip/deflate/Brotli를 선택한다. `Cache-Control: no-transform` 응답은 압축하지 않는다.

- `filter(req, res)`는 압축 후보 여부이고 `compression.filter(req, res)`로 기본 Content-Type 필터를 재사용할 수 있다.
- `threshold` 기본값은 1kb다. header 전송 시 길이를 모르면 threshold 이상으로 가정하므로 엄격한 크기 거부 조건은 아니다.
- zlib `level`은 0~9와 기본 -1을 지원한다. 높을수록 일반적으로 압축률과 작업 시간이 함께 늘고 `memLevel`, `windowBits`, `chunkSize`, `strategy`는 메모리/알고리즘을 조정한다.
- `brotli`는 해당 압축 옵션, `enforceEncoding`은 Accept-Encoding이 없을 때 기본 encoding(기본 identity)이다.
- middleware가 추가하는 `res.flush()`는 압축한 일부 출력을 즉시 client로 내보내도록 한다.

SSE는 작은 메시지가 buffer에 머무르면 지연될 수 있다. 메시지 뒤 flush하거나 해당 route의 압축을 제외하고 앞단 proxy buffering까지 확인한다. disconnect 시 interval 등의 자원도 정리한다. 압축 수준을 올리는 것보다 앞단의 기존 압축과 중복되지 않는지 먼저 확인한다.

## request timeout과 작업 취소

`connect-timeout`의 `timeout(time, { respond })`는 시간 초과 시 req의 timeout event를 발생시키고 기본적으로 status=503과 timeout 표시를 가진 오류를 next에 전달한다. number는 ms, string은 기간 문자열이다.

`req.timedout`은 시간 초과 상태이며 `req.clearTimeout()`은 이 타이머를 제거한다. library가 응답을 보냈다고 실행 중인 DB query, 외부 HTTP 요청이나 CPU 작업까지 취소되지는 않는다.

top-level timeout은 이미 다음 middleware로 넘긴 제어를 회수하지 못한다. 뒤의 async 작업 완료 후 timedout 상태를 확인해 중복 응답을 막고 해당 client/driver의 cancellation과 deadline으로 실제 자원 사용도 제한한다. body 읽기, socket과 upstream timeout은 별도 계층의 계약이다. `respond:false`이면 오류 응답도 app이 책임진다.

## method-override

지원하지 않는 client의 POST를 PUT/DELETE 등으로 해석할 때 `methodOverride(getter, { methods })`를 사용한다. 기본 getter는 X-HTTP-Method-Override, override를 허용하는 원래 method는 기본 `['POST']`다. `methods:null`로 모든 method에 열면 cache 의미와 보안 문제가 생길 수 있다.

getter 문자열이 `X-`로 시작하면 header, 아니면 query key다. 함수 getter는 `(req, res)`에서 override method를 반환한다. method가 Node에서 지원되면 `req.method`를 바꾸고 이전 값은 `originalMethod`에 남긴다.

body에서 `_method`를 읽는다면 body parser 뒤에, CSRF/권한/route처럼 최종 method를 알아야 하는 계층 앞에 둔다. 여러 override middleware의 마지막 결과가 우선할 수 있으므로 수신 method와 effective method를 혼동하지 않는다.

## virtual host

`vhost(hostname, handle)`는 Host가 맞으면 `(req, res, next)` handler에 넘긴다. 문자열의 `*`는 해당 hostname 부분에서 한 개 이상 문자를, RegExp는 대소문자를 구별하지 않는 전체 hostname 매칭을 수행한다.

`req.vhost.host`는 port 포함 host, `hostname`은 port 제외, 숫자 key는 wildcard/capture 값, length는 capture 수다. hostname routing은 tenant 인증이나 사용자 파일 권한을 자동으로 보장하지 않는다. rewrite하는 app은 originalUrl을 보존하고 filesystem root와 사용자 이름 검증을 따로 적용한다.

## 정적 보조 기능

`serve-favicon(pathOrBuffer, { maxAge })`는 기본 `/favicon.ico`를 제공한다. icon을 memory에 보관하고 내용 기반 ETag, cache header를 보낸다. maxAge 기본값은 1년(ms)이며 logger 앞에 두면 favicon 요청 logging을 생략할 수 있다. 다른 vendor icon URL까지 처리하는 기능은 아니다.

`serve-index(root, options)`는 directory 목록 페이지를 제공한다. 파일 body를 보내는 static과 다르므로 필요한 경우 static 뒤에 배치한다. 비공개 directory나 내부 파일 이름을 드러내지 않도록 path와 인증 범위를 제한한다.

- `hidden` 기본 false, `icons` 기본 false, `view` 기본 tiles이며 details도 지원한다.
- `filter(filename, index, files, dir)`는 목록 항목 필터다. 파일 접근 권한의 대체가 아니다.
- `stylesheet`는 CSS, `template`는 파일 또는 `(locals, callback)` renderer다. directory, fileList, path, style 등의 locals로 HTML을 만들며 escaping과 파일 경로를 확인한다.
- static의 `index:false`는 directory index **파일** 자동 전송을 끄는 값이다. 별도로 장착한 serve-index의 목록 페이지까지 끄지는 않는다.

## 타입과 버전의 경계

공식 middleware 페이지는 각 package의 README와 버전을 함께 제공하지만 Express 5 버전과 middleware 버전은 동일하지 않다. 설치된 package, runtime과 타입 정의의 서명을 함께 확인한다. 현재 문서의 여러 middleware는 자체 타입을 포함하지 않아 별도 `@types/...`가 필요하다.

공식 예제의 오래된 wildcard, callback과 생성 코드도 현재 route 문법/stream/error 계약과 대조한다. middleware 목록의 추천이나 외부 link는 보안, 지원 수명과 운영 준비의 보증이 아니다. body-parser/Multer, 쿠키/세션, logging/개발 오류 처리의 상세 계약은 아래 연결을 따른다.

## 출처

- [Express, Middleware](https://expressjs.com/ko/resources/middleware/)
- [Express, cors](https://expressjs.com/ko/resources/middleware/cors/)
- [WHATWG, Fetch Standard, CORS-preflight fetch](https://fetch.spec.whatwg.org/#cors-preflight-fetch)
- [Express, compression](https://expressjs.com/ko/resources/middleware/compression/)
- [Express, timeout](https://expressjs.com/ko/resources/middleware/timeout/)
- [Express, method-override](https://expressjs.com/ko/resources/middleware/method-override/)
- [Express, vhost](https://expressjs.com/ko/resources/middleware/vhost/)
- [Express, serve-favicon](https://expressjs.com/ko/resources/middleware/serve-favicon/)
- [Express, serve-index](https://expressjs.com/ko/resources/middleware/serve-index/)

## 관련 문서

- [[CORS|CORS 보안 모델]]
- [[Express-Request-and-Body|body-parser와 Multer]]
- [[Express-Cookies-and-Sessions|cookie/session middleware]]
- [[Express-Response-and-Files|serve-static과 file API]]
- [[Express-Operations-and-Security|morgan, response-time와 errorhandler]]
- [[Server-Sent-Events|Server-Sent Events]]
