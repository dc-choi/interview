---
tags: [nestjs, axios, http-client, rxjs]
status: done
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

register 옵션으로 부족하거나 Observable 래핑 없이 쓰고 싶으면 `httpService.axiosRef`로 **하부 AxiosInstance에 직접 접근** — 반환이 Promise라 평범한 axios처럼 쓴다 (인터셉터 등 axios 고유 기능 설정도 이 경로).

## 관련 문서

- [[NestJS-AOP-Interceptor-Patterns|Interceptor 패턴 (외부 API 조건부 재시도)]]
- [[NestJS-AOP-Interceptor-Observable-Design|Observable 설계 (왜 Promise가 아닌가)]]

## 출처
- [NestJS — HTTP module](https://docs.nestjs.com/techniques/http-module)
