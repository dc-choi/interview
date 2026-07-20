---
tags: [runtime, nestjs, controller, routing]
status: done
category: "OS & Runtime"
aliases: ["Controller 라우팅과 요청", "Controller Routing"]
---

## Controller 라우팅과 요청 객체

수신 요청을 처리하고 클라이언트에 응답을 다시 보내는 Controller의 라우팅 메커니즘과 요청 객체 접근 방식을 다룬다.

Controller의 목적은 애플리케이션에 대한 특정 요청을 처리하는 것. 라우팅 메커니즘에 따라 각 요청을 처리할 Controller가 결정됨. Controller에는 여러 개의 경로가 있는 경우가 많으며 각 경로마다 다른 작업을 수행.

### 라우팅
라우팅이 성공하면 200 상태 코드를 반환하며, 이 경우 문자열입니다.

왜 이런 일이 발생할까요?

이를 설명하기 위해 먼저 Nest가 응답을 조작하는 데 두 가지 옵션을 사용한다는 개념을 소개할 필요가 있습니다.

1. 표준
    ```
   표준을 사용하면 요청 핸들러가 JavaScript 객체나 배열을 반환하면 자동으로 JSON으로 직렬화됩니다.
   
   그러나 JavaScript 기본 유형(예: 문자열, 숫자, 부울)을 반환하는 경우 Nest는 직렬화를 시도하지 않고 값만 전송합니다.
   
   따라서 응답 처리가 간단해집니다. 값만 반환하면 나머지는 Nest가 처리합니다.
   
   또한 응답의 상태 코드는 201을 사용하는 POST 요청을 제외하고는 기본적으로 항상 200입니다.
   
   핸들러 수준에서 @HttpCode(...) 데코레이터를 추가하여 이 동작을 쉽게 변경할 수 있습니다.
    ```

2. 사용자 정의
    ```
   라이브러리별(예: Express) 응답 객체를 사용할 수 있으며, 메서드 핸들러 시그니처에 @Res() 데코레이터를 사용하여 삽입할 수 있습니다.
   
   이 접근 방식을 사용하면 해당 객체에 의해 노출된 기본 응답 처리 메서드를 사용할 수 있습니다.
   
   예를 들어 Express에서는 response.status(200).send()와 같은 코드를 사용하여 응답을 구성할 수 있습니다.
   
   Nest는 핸들러가 @Res() 또는 @Next()를 사용하는 경우를 감지하여 라이브러리별 옵션을 선택했음을 나타냅니다.
   
   두 가지 접근 방식을 동시에 사용하면 이 단일 경로에 대해 표준 접근 방식이 자동으로 비활성화되고 더 이상 예상대로 작동하지 않습니다.
   
   두 접근 방식을 동시에 사용하려면 @Res({ passthrough: true }) 데코레이터에서 passthrough 옵션을 true로 설정해야 합니다.
    ```

### 요청 객체
핸들러는 종종 클라이언트의 요청 세부 정보에 액세스해야 합니다.

Nest는 기본 플랫폼(기본적으로 Express)에서 요청 객체에 대한 액세스를 제공합니다.

핸들러의 서명에 @Req() 데코레이터를 사용하여 요청 객체를 삽입하도록 Nest에 지시하여 요청 객체에 액세스할 수 있습니다.

요청 매개변수 예제에서와 같이 익스프레스 타이핑을 활용하려면 @types/express 패키지를 설치해야 합니다.

요청 객체는 HTTP 요청을 나타내며 쿼리 문자열, 매개변수, HTTP 헤더 및 본문에 대한 속성을 포함합니다.

대부분의 경우 이러한 속성에 수동으로 액세스할 필요가 없습니다.

대신 바로 사용할 수 있는 @Body() 또는 @Query()와 같은 전용 데코레이터를 사용할 수 있습니다.

아래는 제공되는 데코레이터와 해당 데코레이터가 나타내는 플랫폼별 객체 목록입니다.

| 데코레이터                   | 설명          | 플랫폼 객체                          |
|-------------------------|-------------|---------------------------------|
| @Request(), @Req()      | 요청 객체       | req                             |
| @Response(), @Res()     | 응답 객체       | res                             |
| @Next()                 | 다음 미들웨어     | next                            |
| @Session()              | 세션 객체       | req.session                     |
| @Param(key?: string)    | 경로 매개변수     | req.params / req.params[key]    |
| @Query(key?: string)    | 쿼리 문자열      | req.query / req.query[key]      |
| @Body(key?: string)     | 요청 본문       | req.body / req.body[key]        |
| @Headers(name?: string) | HTTP 헤더     | req.headers / req.headers[name] |
| @Ip()                   | 클라이언트 IP 주소 | req.ip                          |
| @HostParam()            | 호스트 매개변수    | req.params                      |

기본 HTTP 플랫폼에서의 타이핑과의 호환성을 위해 Nest는 @Res() 및 @Response() 데코레이터를 제공합니다. 

Res()는 @Response()의 별칭일 뿐입니다. 둘 다 기본 네이티브 플랫폼 응답 객체 인터페이스를 직접 노출합니다.

이를 사용할 때는 기본 라이브러리의 타이핑도 가져와야 최대한 활용할 수 있습니다.

메서드 핸들러에 @Res() 또는 @Response()를 삽입하면 해당 핸들러에 대해 Nest를 라이브러리 전용 모드로 전환하고 응답을 관리할 책임이 있다는 점에 유의하세요.

이 경우 응답 객체(예: res.json(...) 또는 res.send(...))를 호출하여 일종의 응답을 발행해야 하며, 그렇지 않으면 HTTP 서버가 중단됩니다.

### 경로 매개변수
정적 경로를 사용하는 경로는 요청의 일부로 동적 데이터를 받아들여야 하는 경우 작동하지 않습니다.

매개변수가 있는 경로를 정의하려면 경로 경로에 경로 매개변수 토큰을 추가하여 URL에서 동적 값을 캡처할 수 있습니다.

그런 다음 메서드 서명에 추가해야 하는 @Param() 데코레이터를 사용하여 이러한 경로 매개변수에 액세스할 수 있습니다.

매개변수가 있는 경로는 정적 경로 뒤에 선언해야 합니다.

이렇게 하면 매개변수화된 경로가 정적 경로로 향하는 트래픽을 가로채는 것을 방지할 수 있습니다.

Param() 데코레이터는 메소드 매개변수를 장식하는 데 사용되며, 경로 매개변수를 메소드 내에서 장식된 메소드 매개변수의 속성으로 액세스할 수 있도록 합니다.

또는 특정 매개변수 토큰을 데코레이터에 전달하고 메서드 본문 내에서 이름으로 경로 매개변수를 직접 참조할 수 있습니다.

nestjs/common 패키지에서 Param을 가져옵니다.

### Raw body — 웹훅 서명 검증

웹훅 HMAC 서명 검증은 **파싱된 JSON이 아니라 직렬화 전 원문 바이트**로 해시를 계산해야 한다. `NestFactory.create(AppModule, { rawBody: true })`로 켜고, 핸들러에서 `@Req() req: RawBodyRequest<Request>`로 받아 `req.rawBody`(Buffer)를 쓴다 — 내장 body parser가 켜져 있어야 동작 (`bodyParser: false`면 불가).

### 와일드카드 라우트
경로 끝의 `*`는 이후의 어떤 문자 조합과도 매칭된다. `@Get('abcd/*')`는 abcd/, abcd/123, abcd/abc 전부에 걸린다. 하이픈과 점은 문자 그대로 해석된다.

Express v5부터 순수 Express 라우팅은 named wildcard(`abcd/*splat`, 이름은 임의)를 요구하지만, Nest가 호환층을 제공해 `*`를 그대로 쓸 수 있다. 경로 중간의 `*`는 Express에선 named wildcard가 필수이고 Fastify는 아예 지원하지 않는다.

Express v5는 경로 문법 외에 **쿼리 파서 기본값도 바꿨다** — qs 대신 simple 파서라 `filter[where][name]=John`, `item[]=1` 같은 **중첩 객체와 배열 쿼리스트링이 파싱되지 않는다**. v4 동작이 필요하면 `NestFactory.create<NestExpressApplication>(...)` 후 `app.set('query parser', 'extended')`. 옵셔널 파라미터도 `?` 대신 중괄호 문법(`/:file{.:ext}`)이고 경로 내 정규식 문자는 미지원.

### API 버저닝 (HTTP 앱 전용)

`app.enableVersioning({ type: VersioningType.URI })`로 켠다. 전략 4종:

| 타입 | 버전 위치 |
|------|----------|
| URI (기본) | 경로 — 전역 prefix 뒤, 컨트롤러 경로 앞에 자동 삽입. 기본 접두사 `v`(`/v1/...`), `prefix` 옵션으로 변경/비활성 |
| Header | 커스텀 요청 헤더 |
| Media Type | `Accept: application/json;v=2` |
| Custom | 요청에서 버전을 추출하는 함수 직접 제공 |

- 버전 지정: 컨트롤러 `@Controller({ version: '1' })`, 라우트 `@Version('2')`, 배열로 다중 버전(`['1', '2']`).
- `VERSION_NEUTRAL` — 요청의 버전과 무관하게(버전 없는 요청 포함) 매칭. URI 버저닝에선 경로에 버전이 없다.
- `defaultVersion` — enableVersioning 옵션. 버전 명시가 없는 컨트롤러/라우트 전체의 기본값 (배열, VERSION_NEUTRAL 가능).
- 미들웨어도 `forRoutes({ path, method, version })`로 특정 버전에만 적용 가능.

어떤 전략을 고를지(경로 명시 권장, 쿼리스트링 비권장)는 [[REST]]의 버전 관리 원칙 참조.

### 모듈 레벨 경로 prefix — RouterModule

컨트롤러마다 `/dashboard` 같은 prefix를 반복하는 대신, `RouterModule.register([{ path: 'dashboard', module: DashboardModule, children: [...] }])`(@nestjs/core)로 **모듈 단위에 경로 계층을 부여**할 수 있다 — 그 모듈의 모든 컨트롤러가 prefix를 상속하고, children 중첩으로 트리 구성이 된다 (HTTP 앱 전용).

앱 전체 prefix는 `app.setGlobalPrefix('api')` — `{ exclude: [{ path: 'health', method: RequestMethod.GET }] }`로 **헬스체크 같은 라우트를 prefix에서 제외**할 수 있다.

### 서브 도메인 라우팅
Controller 데코레이터는 호스트 옵션을 사용하여 들어오는 요청의 HTTP 호스트가 특정 값과 일치하도록 요구할 수 있습니다.

Fastify는 중첩 라우터를 지원하지 않으므로 하위 도메인 라우팅을 사용하는 경우 기본 Express 어댑터를 대신 사용하는 것이 좋습니다.

경로 경로와 마찬가지로 호스트 옵션은 토큰을 사용하여 호스트 이름에서 해당 위치의 동적 값을 캡처할 수 있습니다.

이러한 방식으로 선언된 호스트 매개변수는 메서드 시그니처에 추가해야 하는 @HostParam() 데코레이터를 사용하여 액세스할 수 있습니다.

## 관련 문서
- [[Controller-Response|Controller 리소스와 응답 처리]]
- [[Controller|Controller (인덱스)]]
- [[Provider]]
- [[Injection-Scopes|Injection Scopes]]

## 출처
- [NestJS — Controllers](https://docs.nestjs.com/controllers)
- [NestJS — Versioning](https://docs.nestjs.com/techniques/versioning)
- [NestJS — Router module](https://docs.nestjs.com/recipes/router-module)
- [NestJS — Global prefix (FAQ)](https://docs.nestjs.com/faq/global-prefix)
- [NestJS — Raw body (FAQ)](https://docs.nestjs.com/faq/raw-body)
- [NestJS — Migration guide (v11)](https://docs.nestjs.com/migration-guide)
