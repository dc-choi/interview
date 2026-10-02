---
tags: [nodejs, express, backend, migration, template]
status: done
verified_at: 2026-10-01
category: "OS - Node.js"
aliases: ["Express Application", "Express 5 애플리케이션"]
---

# Express 애플리케이션과 버전 전환

Express는 Node.js HTTP 요청/응답 객체에 라우팅, 미들웨어와 응답 편의 API를 더하는 프레임워크다. DB 모델, 인증 방식이나 프로젝트 계층을 정해 주지는 않는다. Express 5의 최소 런타임은 Node.js 18이다. 최소 실행 조건과 운영에 사용할 Node.js 지원 버전은 별개로 판단한다.

## 애플리케이션과 서버의 차이

`express()`의 반환값은 요청 handler로 쓸 수 있는 함수다. `http.createServer(app)`와 `https.createServer(options, app)`에 같은 app을 넘길 수 있다. app 자체는 HTTP 서버를 상속하지 않는다.

```js
import express from 'express';

const app = express();
app.get('/', (req, res) => res.send('Hello World'));

const server = app.listen(3000, (error) => {
  if (error) throw error;
});
```

- `app.listen(port, host?, backlog?, callback?)`는 `http.Server`를 반환한다. UNIX socket path도 지원한다. port를 생략하거나 0으로 두면 OS가 포트를 배정한다.
- Express 5에서는 listening 오류도 제공한 callback의 인자로 온다. `EADDRINUSE` 등을 정상 시작과 구별하고, 성공 로그는 오류 확인 뒤 남긴다.
- `req`와 `res`는 Node 객체를 확장한 것이므로 stream/event API도 사용할 수 있다. body parser가 먼저 stream을 소비한 상황은 별도로 고려한다.
- `app.router`는 Express 5의 내장 Router 참조다. Express 3처럼 `app.use(app.router)`로 명시 로딩하는 구조가 아니다.

## 시작과 구조

프로젝트에서 `npm init`으로 `package.json`을 만든 뒤 `npm install express`로 런타임 의존성을 선언한다. `--no-save`는 의존성 목록에 남기지 않는 임시 설치다. 여기서는 개념과 명령을 설명하며 설치나 서버 실행을 전제로 하지 않는다.

`express-generator`는 `app.js`, `bin/www`, `routes`, `views`, `public` 같은 골격을 만들 수 있다. `--view`, `--no-view`, `--css`, `--git`을 선택하지만 이 디렉터리 구조는 Express의 필수 계약이 아니다. 생성된 의존성 버전과 오래된 generator 예제를 Express 5 운영 설정으로 그대로 취급하지 않는다.

공식 예제의 route 분리, MVC, 여러 Router, content negotiation, 파일 다운로드와 세션은 구성 방법을 보여 준다. 예제에 인증이나 DB 연결이 있다고 해서 실제 권한 검증, pool 수명과 운영 보안까지 보장되는 것은 아니다.

## 설정의 범위와 기본값

`app.set(name, value)`로 설정하고 `app.get(name)`으로 읽는다. 인자가 하나인 `app.get('env')`와 handler를 받는 `app.get('/path', handler)`는 용도가 다르다. Boolean 설정은 `enable`/`disable`, 상태 조회는 `enabled`/`disabled`로 표현할 수 있다.

| 설정 | Express 5 기준 계약 |
|---|---|
| `env` | `NODE_ENV`가 없으면 `development` |
| `query parser` | 기본 `simple`, `extended`, `false` 또는 사용자 parser 함수 선택 |
| `etag` | 동적 응답 기본 weak, `false`, `strong`, 사용자 함수 지원. static 설정은 별도 |
| `case sensitive routing` | 대소문자 구별을 활성화할지 결정 |
| `strict routing` | `/foo`와 `/foo/` 구별을 활성화할지 결정 |
| `subdomain offset` | 기본 2, `req.subdomains`의 host 분할 기준 |
| `trust proxy` | 기본 false, 실제 proxy topology에 맞게 설정 |
| `json replacer`, `json spaces` | JSON.stringify의 replacer와 출력 형식 |
| `json escape` | JSON 응답에서 `<`, `>`, `&`를 Unicode escape로 표현 |
| `jsonp callback name` | 기본 `callback` |
| `views`, `view engine` | template 탐색 디렉터리(기본 cwd/views)와 기본 확장자 |
| `view cache` | production에서 template compilation cache 활성화 |
| `x-powered-by` | 기본 true, `app.disable('x-powered-by')`로 제거 |

sub-app은 기본값이 없는 설정을 상속하지만 기본값이 있는 설정은 일반적으로 직접 지정해야 한다. 예외로 `trust proxy`는 기본값이 있어도 상속하고, production의 `view cache`는 상속하지 않는다. Router 옵션과 sub-app 설정 상속을 혼동하지 않는다.

`app.on('mount', parent => ...)`는 sub-app이 부모에 장착될 때 호출된다. `app.mountpath`는 장착 패턴 또는 배열이고 `req.baseUrl`은 이번 요청에서 실제 매칭한 prefix다. 여러 단계 장착에서 `app.path()`보다 요청의 `baseUrl`로 현재 경로를 판단하는 편이 명확하다.

## 템플릿 엔진과 locals

`app.engine(ext, renderFn)`의 엔진 함수는 `(filePath, options, callback)` 계약을 따르며 `callback(error, html)`로 결과를 전달한다. 엔진의 `__express` 또는 해당 계약에 맞는 함수를 등록하고 `views`, `view engine`을 지정한다.

- `res.render(view, locals?)`는 기본적으로 HTML을 보낸다. callback을 제공하면 HTML을 직접 보내야 한다.
- `app.render(view, locals?, callback)`는 문자열 생성용이며 자체적으로 HTTP 응답을 보내지 않는다.
- `view cache`는 template의 로딩/컴파일 결과를 캐시한다. 요청마다 달라지는 렌더링 결과를 통째로 저장하는 응답 캐시가 아니다.
- `app.locals`는 app 수명 동안 유지하고 `res.locals`는 요청/응답 한 번에만 유효하다. 사용자별 상태를 `app.locals`에 두지 않는다.
- view 경로와 locals의 key를 사용자 입력으로 직접 선택하게 하지 않는다. 엔진이 key를 옵션으로 해석하거나 파일/모듈을 읽을 수 있다. HTML escaping도 엔진 계약으로 확인한다.
- 단순 HTML 파일 제공은 `sendFile`, 여러 asset은 `static`의 역할이다. 템플릿 엔진을 거칠 필요가 없다.

## TypeScript와 API 확장

Express는 자체 타입 정의를 번들하지 않는다. `typescript`, `@types/express`, `@types/node`를 개발 의존성으로 사용하고 middleware도 타입 번들 여부를 확인한다. inline handler는 문맥에서 타입을 추론할 수 있고 분리된 handler는 `RequestHandler`, 오류 handler는 `ErrorRequestHandler` 등으로 계약을 드러낸다.

`Request<{ userId: string }>` 같은 타입은 런타임 입력 검증을 대신하지 않는다. `declare global { namespace Express { interface Request { user?: User } } }`처럼 declaration merging으로 확장하되 middleware가 모든 요청에 실행되지는 않으므로 추가 속성을 optional로 표현하고 사용 전에 검사한다.

Node의 native TypeScript 실행은 Express의 최소 Node 조건과 다르다. 공식 설치 문서의 기준은 Node.js 22.18.0 이상 또는 23.6.0 이상, TypeScript 5.8 이상이다. type stripping은 type checking을 하지 않는다. `npx tsc`로 검사하고 Node가 지울 수 없는 enum, namespace, parameter property와 모듈 해석 조건을 별도로 확인한다.

`express.request`/`express.response`를 바꾸면 같은 프로세스의 모든 app에 영향을 준다. 필요한 확장은 `app.request`/`app.response` 수준을 우선한다. `this`가 req/res를 가리키는 prototype method는 일반 함수를 사용한다. TypeScript augmentation은 타입을 알려 줄 뿐 실제 method를 구현하지 않는다. getter는 재정의할 수 있지만 `baseUrl`, `originalUrl`처럼 요청 처리 중 직접 할당되는 속성을 같은 방식으로 바꾸려 해서는 안 된다.

## DB와 생태계의 경계

DB 연결은 해당 Node driver/client의 책임이다. Express 자체에는 model, transaction, ORM과 connection pool 계약이 없다. 요청 오류를 Express 오류 흐름에 연결하고, 재사용할 client/pool과 종료 정리를 애플리케이션 수명에 맞춰 구성한다. SQL 입력은 parameter binding을 사용한다.

공식 DB 통합 페이지의 MongoDB v2/v3, callback 기반 Redis와 Elasticsearch type 예제는 오래된 API를 포함한다. DB 제품 선택이나 최신 driver 구현의 정본으로 쓰지 않고 현재 driver 문서를 대조한다. Express에서 DB에 접근할 수 있다는 점과 driver의 현재 서명은 구분한다.

Express 프로젝트는 `expressjs`, `pillarjs`, `jshttp`의 여러 패키지로 이루어진다. `router`, `send`, `finalhandler`, `parseurl` 등의 역할은 framework 내부 구성을 이해하는 데 유용하지만 app이 이들 모두를 직접 의존해야 하는 것은 아니다. 문제는 영향을 받는 패키지 저장소에 재현 가능한 입력, 예상/실제 결과와 버전을 제시하고, 보안 취약점은 공개 issue 대신 해당 저장소의 비공개 security advisory 경로를 사용한다.

## Express 4에서 5로 전환

경로 매칭과 body/parser 동작은 단순 패키지 버전 교체로 끝나지 않는다. codemod는 기계적 서명 변환을 돕지만 route 매칭, 잘못된 입력, 오류 전달과 응답 결과를 검증해야 한다.

| 이전 API/가정 | Express 5 계약 |
|---|---|
| `app.del()` | `app.delete()` |
| `app.param(fn)`, `router.param(fn)` | 제거. 이름과 callback을 명시 |
| `req.param(name)` | `params`, `query`, `body` 중 실제 출처를 명시 |
| `acceptsCharset/Encoding/Language` | `acceptsCharsets/Encodings/Languages` |
| `res.send/json/jsonp(body, status)` | `res.status(status).send/json/jsonp(body)` |
| `res.send(number)`로 상태 전달 | `sendStatus(code)`, 숫자 본문은 의도를 명시해 JSON/문자열로 전달 |
| `res.redirect(url, status)` | `res.redirect(status, url)` |
| `redirect('back')`, `location('back')` | magic value 제거. 이동 목적지를 검증해 명시 |
| `res.sendfile()` | `res.sendFile()` |
| file/static의 `hidden`, `from` | `dotfiles`, `root`로 전환 |
| `express.static.mime` | 제거, 필요한 MIME 조회는 별도 API |
| 이름 없는 `*`, `?` 선택 구간 | 이름 있는 wildcard와 brace 구간 |
| 반환된 Promise 오류를 직접 전달 | Express 5가 rejection 전달, callback/timer 오류는 여전히 직접 전달 |
| parser 전 `req.body`가 빈 객체 | `undefined` |
| writable `req.query`, 기본 extended | getter, 기본 simple |
| wildcard 문자열/미매칭 key | wildcard 배열/미매칭 key 생략 |
| `router.param`의 이름 배열 | 불가, 각각 등록. `app.param`은 배열 지원 |
| `clearCookie`의 expires/maxAge | 무시, 발급 범위 옵션으로 삭제 |

`res.status`는 정수 100~999만 허용하고 `res.vary`는 field 생략 시 오류를 낸다. Express 5의 `.js` file MIME은 `text/javascript`이며 MIME DB 갱신으로 patch/minor에서도 MIME이 달라질 수 있다. 정적 파일/숨김 디렉터리, proxy, template와 cookie 동작을 포함해 전환을 확인한다.

Express 3에서 4로의 Connect 의존성 제거와 middleware 분리는 역사적 변화다. 당시 `express.session`, `express.logger` 등은 현재 내장 API가 아니며 Express 4/5에는 필요한 별도 middleware를 연결한다. 오래된 migration 예제의 `bodyParser()`나 `multer()` 전체 장착을 현재 방식으로 복제하지 않는다.

## 출처

- [Express, Installing](https://expressjs.com/ko/5x/starter/installing/)
- [Express, Hello world](https://expressjs.com/ko/5x/starter/hello-world/)
- [Express, Application generator](https://expressjs.com/ko/5x/starter/generator/)
- [Express, FAQ](https://expressjs.com/ko/5x/starter/faq/)
- [Express, Application Object](https://expressjs.com/en/5x/api/application/)
- [Express, Using template engines](https://expressjs.com/ko/5x/guide/using-template-engines/)
- [Express, Developing template engines](https://expressjs.com/ko/5x/advanced/developing-template-engines/)
- [Express, Overriding the Express API](https://expressjs.com/ko/5x/guide/overriding-express-api/)
- [Express, Database integration](https://expressjs.com/ko/guide/database-integration/)
- [Express, Upgrade to Express v5](https://expressjs.com/en/guide/migrating-5/)
- [Express, Moving to Express 4](https://expressjs.com/ko/guide/migrating-4/)
- [Express, Examples](https://expressjs.com/ko/5x/starter/examples/)
- [Express, Resources](https://expressjs.com/ko/resources/)
- [Express, Community](https://expressjs.com/ko/resources/community/)
- [Express, Glossary](https://expressjs.com/ko/resources/glossary/)
- [Express, Contributing](https://expressjs.com/ko/resources/contributing/)
- [Express, Utilities](https://expressjs.com/ko/resources/utils/)

## 관련 문서

- [[Express-Routing-and-Middleware|라우팅과 오류 전달]]
- [[Express-Operations-and-Security|운영과 신뢰 경계]]
- [[Hono|Web 표준 기반 서버와 비교]]
- [[Apollo-Server|GraphQL 서버와 프레임워크 통합]]
