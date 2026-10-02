---
tags: [nestjs, axios, http-client, rxjs]
status: done
verified_at: 2026-08-26
category: "OS & Runtime - NestJS"
aliases: ["NestJS HTTP Module", "@nestjs/axios", "HttpService"]
---

# NestJS HTTP Module — @nestjs/axios

아웃바운드 HTTP 호출용으로 Axios를 래핑한 `HttpModule`/`HttpService`. **모든 메서드가 AxiosResponse를 Observable로 감싸 반환**한다 — Promise가 아니다. got, undici 같은 다른 클라이언트를 직접 쓰는 것도 공식적으로 무방.

## 사용 계약

```ts
@Module({ imports: [HttpModule.register({ timeout: 5000, maxRedirects: 5 })] })
// register 옵션은 Axios 생성자로 직통. ConfigService 의존이면 registerAsync + useFactory.

constructor(private readonly httpService: HttpService) {}

findAll(): Observable<AxiosResponse<Cat[]>> {
  return this.httpService.get('http://localhost:3000/cats');
}
```

## Observable → Promise — firstValueFrom

async/await 코드에서는 rxjs의 `firstValueFrom`(또는 `lastValueFrom`)으로 변환하고, 에러는 `catchError` 오퍼레이터에서 AxiosError로 받는 것이 공식 예시 패턴:

```ts
const { data } = await firstValueFrom(
  this.httpService.get<Cat[]>(url).pipe(
    catchError((error: AxiosError) => { throw new InternalServerErrorException(); }),
  ),
);
```

## axiosRef — Promise 기반 탈출구

`httpService.axiosRef`는 하부 AxiosInstance에 접근하는 속성이다. `httpService.axiosRef.get(...)` 같은 요청 메서드가 Promise를 반환하므로 Observable 래핑 없이 사용할 수 있다. Axios 인터셉터 같은 고유 기능도 이 인스턴스에서 설정한다.

## 현재 fetch 기반 HttpClient

2026-10-01 현재 guide의 기본 설명은 `@nestjs/http-client`다. 기존 `@nestjs/axios`도 제공되므로 Axios 문서를 삭제하거나 자동 전환으로 해석하지 않는다. `HttpClientModule.register({ baseUrl, name, timeout })`로 client를 등록하고, 이름 있는 client는 `@InjectHttpClient(name)`로 주입한다. 주입된 `HttpClient`의 `get`/`post` 같은 요청 메서드가 Promise를 반환한다. `forRoot()`는 global 기본값만 만들고 client 자체나 baseUrl을 등록하지 않는다.

| 계약 | HttpClient의 의미 |
|---|---|
| URL | 상대 경로를 baseUrl에 붙여 기존 path prefix를 유지. baseUrl이 있으면 다른 origin의 absolute URL은 거부 |
| params/query | params는 encode한 `:name` path segment, query는 query string. 누락, 불필요한 key와 endpoint를 옮기는 빈 값/dot segment는 거부 |
| body | json 또는 body 중 하나. GET/HEAD body는 거부. generic 응답 타입은 runtime 검증을 실행하지 않음 |
| header | 계층별 merge, null로 기본 header 제거. response header는 web Headers의 get() |
| timeout | 기본 0(무제한), 설정은 **attempt마다** interceptor와 body 읽기까지 포함. stream/Response는 header 수신까지 |
| cancellation | AbortSignal로 전체 deadline/cancel. 취소는 재시도하지 않음 |
| retry | 기본 idempotent method에 최대 3회. transient network/timeout과 408/429/500/502/503/504. POST/PATCH는 별도 멱등성 계약 후 opt-in |

- retry 설정은 field별 merge지만 methods/statusCodes 목록은 교체된다. `retryIf`는 이미 허용한 범위를 좁힐 뿐 넓히지 않는다. stream body는 재전송할 수 없어 retry하지 않는다. Retry-After가 cap을 넘으면 즉시 실패를 돌려준다. 여러 service hop의 retry는 호출 수를 곱하므로 적용 계층을 정한다.
- `HttpResponseError`, `HttpTimeoutError`, `HttpNetworkError`, `HttpParseError`를 구분한다. 그대로 handler 밖으로 나오면 500이다. `toHttpException()`은 주로 502/504로 매핑하고 upstream body는 기본 숨긴다. 선택 status의 forward와 기본 5xx logging 여부는 API 계약에 맞춘다. WS/RPC는 transport 예외로 따로 변환한다.
- client interceptor는 첫 항목이 바깥이며 root interceptor가 먼저, **attempt마다 다시** 실행한다. status 판정 전 Response를 보므로 4xx/5xx도 받는다. 오류 객체의 URL query가 가려지고 body/header는 non-enumerable이어도 직접 추출해 로그하면 비밀값이 노출될 수 있다.
- cross-origin redirect는 authorization/cookie 외 custom secret header를 유지할 수 있다. API key client는 redirect:error 같은 정책을 검토한다. undici dispatcher가 pool/proxy/TLS를 제어하고 Node http.Agent와 호환되지 않는다.
- stream을 전달할 때 fetch가 압축을 해제하므로 upstream content-length를 StreamableFile length에 그대로 복사하지 않는다. stream timeout 이후 다운로드 제한은 signal로 관리한다.
- RxJS `defer`는 subscribe 때 시작하지만 Promise를 감싼 Observable의 unsubscribe가 네트워크 호출을 자동 취소하지 않는다. AbortController를 teardown에 연결한다. test의 stub은 attempt마다 새 Response를 반환해야 이미 읽은 body를 재사용하지 않는다.

## 관련 문서

- [[NestJS-AOP-Interceptor-Patterns|Interceptor 패턴 (외부 API 조건부 재시도)]]
- [[NestJS-AOP-Interceptor-Observable-Design|Observable 설계 (왜 Promise가 아닌가)]]

## 출처
- [NestJS — HTTP client](https://docs.nestjs.com/application/http-client) (fetch 기반 현재 경로와 Axios migration)
- [NestJS — HTTP module (v11)](https://docs.nestjs.com/v11/techniques/http-module) (기존 Axios 계약)
