---
tags: [nodejs, express, cookie, session, security]
status: done
verified_at: 2026-10-01
category: "OS - Node.js"
aliases: ["Express Cookies and Sessions", "Express 쿠키와 세션"]
---

# Express 쿠키와 세션

쿠키 파싱, 쿠키 발급과 세션 저장은 서로 다른 역할이다. Express의 `res.cookie`는 Set-Cookie를 작성하며 cookie-parser는 받은 Cookie를 해석한다. 인증 상태를 저장하는 방식은 cookie-session 또는 express-session 등의 별도 계약을 따른다.

## cookie-parser

`cookieParser(secret?, options?)`는 `req.cookies`를 채운다. secret을 제공하면 `req.secret`, `req.signedCookies`도 사용한다. options의 `decode`로 값 decoding을 지정할 수 있다.

- `s:` prefix의 signed cookie는 검증 후 cookies에서 signedCookies로 이동한다. 잘못된 서명은 공격자가 보낸 값을 반환하지 않고 false가 된다.
- `j:` prefix의 JSON cookie는 JSON.parse 결과로 변환한다. 파싱이 실패하면 원래 문자열이 남으므로 결과 타입을 확인한다.
- secret 배열이면 순서대로 검증하여 key rotation을 지원한다.
- `JSONCookie`/`JSONCookies`는 값/객체의 JSON 변환, `signedCookie`/`signedCookies`는 값/객체의 서명 검증 helper다. 객체 helper 중에는 전달한 객체를 수정하는 함수도 있으므로 copy/변환 경계를 확인한다.
- 서명은 무결성 보호다. 값의 암호화나 cookie 탈취/재사용 방지가 아니다.

## 발급과 삭제

`res.cookie(name, value, options)`는 문자열 또는 JSON으로 직렬화한 객체를 cookie로 보낸다. `signed: true`는 cookie-parser에 준 secret을 사용한다. `encode` 기본값은 encodeURIComponent이며 동기 함수만 지원한다.

`path` 기본값은 `/`다. `domain`, `expires`, `maxAge`, `secure`, `httpOnly`, `sameSite`, `partitioned`, `priority`를 목적에 맞춰 지정한다. Express의 maxAge는 **밀리초**이며 HTTP의 Max-Age 초 단위와 구분한다. 여러 res.cookie 호출은 여러 Set-Cookie를 만든다.

Express 5의 `res.clearCookie(name, options)`는 expires/maxAge를 무시하고 지난 만료일을 보낸다. 발급한 Domain/Path 등의 scope를 맞춰야 한다. cookie 삭제와 서버 세션/토큰 무효화는 별도로 수행한다. 브라우저 속성의 의미와 공격 모델은 [[Cookie]], [[CSRF]]를 따른다.

## 두 세션 방식의 차이

| 항목 | cookie-session | express-session |
|---|---|---|
| cookie 내용 | session 데이터 전체와 서명 | session ID |
| 데이터 저장 | client | server store |
| 크기 | browser cookie 한도와 매 요청 전송 비용 | store 용량/접근 비용 |
| 값의 비밀성 | 서명만, client가 읽을 수 있음 | cookie에는 ID만, 상태는 server |
| 폐기/재사용 | server 검증 정책 별도 | store의 destroy/TTL 정책 |
| 여러 instance | 동일 검증 key와 세션 계약 | 공유 store와 일관된 secret |

## cookie-session 수명

`cookieSession({ name, keys, ...cookieOptions })`는 `req.session`에 세션 객체를 두고 데이터가 변경됐을 때 header 전송 시 Set-Cookie를 만든다. 빈 세션 생성만으로 cookie를 발급하지 않으며 변경 없이 읽기만 하면 자동 sliding expiry가 발생하지 않는다.

`keys[0]`으로 새 값을 서명하고 나머지 key로 이전 값을 검증한다. `secret`은 keys가 없을 때 단일 key 역할이다. key는 저장소에 literal로 두지 않는다. `signed`와 `httpOnly`는 기본 true이며 SameSite, secure, scope는 직접 확인한다.

`req.sessionOptions`는 생성 옵션의 shallow clone으로 현재 요청의 cookie 정책을 바꿀 수 있다. `isChanged`, `isNew`, `isPopulated`로 상태를 확인한다. `req.session = null`은 cookie session을 제거한다.

cookie-session은 암호화하지 않으므로 비밀값을 넣지 않는다. cookie 만료만으로 복사한 signed session의 replay가 막히지 않으므로 필요하면 server가 검증할 expires/version/폐기 정책을 둔다. 값의 일부를 변경해 cookie 수명을 연장하는 경우도 session 자체의 유효 기간과 구별한다.

데이터를 인코딩한 전체 cookie가 browser 한도를 넘으면 저장이 거절되거나 이전 값이 계속 쓰일 수 있다. 규격의 4096byte 권고를 모든 browser의 동일한 실사용 한도로 간주하지 않는다. 큰 상태는 server 데이터로 옮긴다.

## express-session 설정

`session(options)`는 cookie에 SID만 저장하고 state는 store에 둔다. 1.5.0 이후 cookie-parser는 필수 의존 middleware가 아니며 두 middleware의 secret이 다르면 문제가 생길 수 있다. 기본 MemoryStore는 디버깅/개발용으로 운영과 multi-process 확장에 사용하지 않는다.

| 옵션 | 판단 기준 |
|---|---|
| `secret` | 필수, HMAC-256 서명에 최소 32byte entropy 권고. 배열 첫 key 서명/전체 key 검증 |
| `name` | 기본 connect.sid, 같은 hostname의 앱은 cookie 이름/scope 충돌 확인 |
| `store` | 공유 저장소의 TTL, touch, 오류와 동시성 계약 확인 |
| `genid(req)` | 충돌 없는 추측하기 어려운 SID 생성, 기본 uid-safe |
| `resave` | false를 우선 검토, store의 touch/만료 갱신 지원에 따라 결정 |
| `saveUninitialized` | false면 변경 없는 신규 세션 저장을 줄임 |
| `rolling` | 기존 세션의 SID cookie를 매 응답 갱신, 기본 false |
| `proxy` | undefined면 Express trust proxy, true/false로 override 가능 |
| `unset` | 기본 keep. req.session 삭제/null 시 destroy이면 응답 끝에 store 삭제 |

`resave: true`는 수정하지 않은 병렬 요청이 다른 요청의 수정 내용을 덮어쓰는 race를 만들 수 있다. false도 모든 store의 동시 수정 충돌을 해결하지 않으므로 실제 store의 update semantics를 확인한다. store에 touch가 없고 TTL 연장을 저장으로 처리해야 하는 경우에는 설정 근거가 달라진다.

resave/saveUninitialized의 암묵 기본값 사용은 deprecated다. 목적에 맞는 값을 명시한다. rolling을 켜도 saveUninitialized=false의 빈 신규 세션에 cookie가 생기는 것은 아니다.

cookie 기본값은 path=/, httpOnly=true, secure=false, maxAge=null이다. `maxAge`를 ms로 지정하고 expires와 함께 지정하면 옵션 작성 순서의 마지막 값이 반영되므로 둘을 중복 지정하지 않는다. 현재 문서의 cookie 옵션은 객체 또는 요청에서 객체를 반환하는 callback이다.

`secure: true`는 HTTPS 조건이 필요하며 proxy가 TLS를 종료하면 trust proxy를 정확히 설정한다. `secure: 'auto'`는 판단한 connection security를 따르지만 HTTPS에서 발급한 cookie는 HTTP 요청에서 보이지 않는다. 현재 middleware의 `sameSite: 'auto'`는 secure이면 None, 아니면 Lax로 선택하므로 일반적인 인증 cookie 정책과 같은 것으로 가정하지 않는다.

## session API와 저장 완료

- `regenerate(cb)`는 새 SID와 Session을 만들고 완료 뒤 callback을 호출한다. 로그인/권한 상승에서 fixation 방어에 사용한다.
- `destroy(cb)`는 store의 세션을 없애고 req.session을 해제한다. cookie 삭제도 의도한 scope에 맞춰 처리한다.
- `reload(cb)`는 store 상태를 다시 읽는다.
- `save(cb)`는 현재 데이터를 저장한다. 일반 응답의 변경 상태는 자동 저장하지만 redirect, 장시간 요청이나 WebSocket 전환 전에 저장 완료가 필요하면 callback을 기다린다.
- `touch()`는 cookie maxAge를 갱신한다. store의 TTL 갱신은 store.touch 계약과 함께 확인한다.
- `req.sessionID`와 `session.id`는 SID 참조다. `cookie.maxAge`는 남은 ms, `originalMaxAge`는 원래 TTL이다.

로그인에서는 인증 성공 후 regenerate, 필요한 사용자 식별자 저장, save 완료, redirect 순서를 지킨다. 오류 callback에서 next(err)만 호출하고 계속 진행하지 않도록 return한다. 로그아웃에서는 session 상태 무효화가 저장/삭제된 뒤 응답을 완료한다.

## store 계약

store는 EventEmitter이며 `get(sid, cb)`, `set(sid, session, cb)`, `destroy(sid, cb)`가 필수다. get은 미존재를 null/undefined로, 오류를 첫 callback 인자로 전달한다. `touch(sid, session, cb)`는 idle expiry 갱신을 위한 권장 method다. all/clear/length는 선택 API이며 운영 관리 용도로 쓰면 권한을 별도로 제한한다.

호환 store 목록에 등록됐다는 사실만으로 선택을 확정하지 않는다. TTL, concurrency, 재시도, 장애 시 인증 처리와 multi-instance 일관성은 선택한 store의 정본과 실제 구성으로 확인한다.

## 출처

- [Express, Response](https://expressjs.com/en/5x/api/response/)
- [Express, cookie-parser](https://expressjs.com/ko/resources/middleware/cookie-parser/)
- [Express, cookie-session](https://expressjs.com/ko/resources/middleware/cookie-session/)
- [Express, session](https://expressjs.com/ko/resources/middleware/session/)
- [Express, Production best practices: security](https://expressjs.com/ko/advanced/best-practice-security/)

## 관련 문서

- [[Cookie|HTTP Cookie]]
- [[Session|세션 저장과 인증]]
- [[CSRF|상태 변경 요청 보호]]
- [[Express-Operations-and-Security|proxy와 운영 신뢰 경계]]
