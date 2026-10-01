---
tags: [nestjs, config, env, dotenv, validation]
status: done
verified_at: 2026-09-30
category: "OS & Runtime - NestJS"
aliases: ["NestJS Configuration", "@nestjs/config", "ConfigModule"]
---

# NestJS Configuration — @nestjs/config

`@nestjs/config`는 dotenv 기반 설정 모듈. `ConfigModule.forRoot()`가 프로젝트 루트의 `.env`를 파싱해 `process.env`와 병합하고, 그 결과를 `ConfigService.get()`으로 읽는다.

## 로드와 우선순위

- **런타임 환경변수(셸 export) > .env 파일** — 같은 키가 양쪽에 있으면 런타임이 이긴다 (dotenv 충돌 규칙).
- `envFilePath`: 단일 경로 또는 배열. 배열에서 같은 변수가 여러 파일에 있으면 **앞의 파일이 우선**.
- `ignoreEnvFile: true` — .env를 읽지 않고 런타임 환경변수만 사용.
- `isGlobal: true` — 전역 모듈로 등록해 다른 모듈에서 import 불필요.
- 부트스트랩 전에 env가 필요하면(`NestFactory.createMicroservice` 인자 등) Node 20+의 `node --env-file` 옵션으로 앱 시작 전에 로드.

## process.env 직접 참조가 실패하는 두 가지 이유

설정값이 적용되지 않는 증상은 원인이 다른 두 종류로 나뉜다.

| 구분 | 원인 | 증상 | 해결 |
|---|---|---|---|
| DI 가시성 | `ConfigService`를 주입받는 provider의 module에서 ConfigModule이 보이지 않음 | 부팅 시 의존성 해석 오류 | `isGlobal: true` 또는 그 module의 `imports: [ConfigModule]` |
| 평가 시점 | `@Module()` 데코레이터 인자에서 `process.env`를 읽음 | 값이 `undefined`로 고정되어 토큰 발급 실패, 발급과 검증의 키 불일치로 401, DB URI 누락 | DI 시점에 읽는 `registerAsync`, `forRootAsync` |

평가 시점 오류는 `isGlobal`로 고쳐지지 않는다. `@Module({ imports: [JwtModule.register({ secret: process.env.JWT_SECRET })] })`의 인자는 그 파일이 로드되어 데코레이터가 평가되는 순간 계산된다. `app.module.ts`가 import한 하위 module 파일은 AppModule의 데코레이터보다 먼저 평가되므로, AppModule의 `ConfigModule.forRoot()`가 `.env`를 적재하기 전에 `process.env.JWT_SECRET`을 읽는다. 셸이나 `--env-file`로 이미 들어온 변수만 예외다.

- 하위 module의 `imports` 배열 앞쪽에 `ConfigModule.forRoot()`를 두면 동작하는 것은 같은 배열에서 앞 원소가 먼저 평가되기 때문이다. 2026-09-30 확인한 @nestjs/config master(12.0.1) 소스의 `forRoot()`는 async지만, `validationSchema`가 없거나 `validate` 함수를 쓰면 `.env` 파싱과 `process.env` 할당이 첫 `await` 전에 동기로 끝난다. `validationSchema`를 지정하면 스키마 검증을 await한 뒤 할당하므로 같은 배열 앞에 두어도 뒤 원소가 값을 보지 못할 수 있다. 순서에 기대는 방식은 옵션 하나로 깨진다.
- 설정에 의존하는 동적 module은 DI 시점에 값을 읽는다.

```ts
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.getOrThrow<string>('JWT_SECRET'),
  }),
}),
```

- 발급과 검증이 같은 키 소스를 쓰게 한다. passport-jwt 전략도 생성자에서 `ConfigService`를 주입받아 `secretOrKey`를 같은 키로 읽는다. 두 키가 다르면 서명 검증이 실패해 인증이 모두 401이 된다.
- module 로드 전에 값이 꼭 필요하면 `--env-file`이나 아래 `ConfigModule.envVariablesLoaded`를 쓴다.
- `.env`는 프로세스 시작 때 적재되므로 값을 바꾸면 프로세스를 다시 시작해야 반영된다.

## 커스텀 설정 파일과 네임스페이스

- `load: [factory]` — 중첩 설정 객체를 반환하는 팩토리 등록 (yaml 파일 로드 등도 이 안에서).
- `registerAs('database', () => ({ host: ... }))` — 네임스페이스 설정. `configService.get('database.host')` 점표기로 접근.
- **강타입 주입**: `@Inject(databaseConfig.KEY)` + `ConfigType<typeof databaseConfig>` — 문자열 키 없이 팩토리 반환 타입 그대로.
- `databaseConfig.asProvider()` — 네임스페이스 설정을 다른 모듈의 `forRootAsync()`에 바로 전달하는 프로바이더로 변환 (`TypeOrmModule.forRootAsync(databaseConfig.asProvider())`) — useFactory/inject 보일러플레이트 제거.
- `ConfigModule.forFeature(config)` — 기능 모듈별 부분 등록. 단 forFeature는 모듈 init 중 실행되고 **모듈 init 순서는 비결정**이라, 다른 모듈이 생성자에서 그 값에 접근하면 미초기화일 수 있다 → `onModuleInit()`에서 접근.

## ConfigService.get

- `get<T>(key, default?)` — 점표기로 중첩 접근, 두 번째 인자로 기본값.
- `{ infer: true }` — 환경변수 인터페이스나 커스텀 설정 타입에서 반환 타입을 자동 추론 (점표기 중첩 경로도 추론).
- `skipProcessEnv: true` (forRoot 옵션) — 커스텀 설정 파일 값만 보고 process.env는 무시.
- `cache: true` (forRoot 옵션) — process.env 접근은 느리므로 캐시해 get 성능 향상.

## 시작 시 검증 — 잘못된 설정이면 부팅 실패

필수 환경변수 누락, 형식 위반을 **앱 시작 시점에 예외로** 끊는 것이 표준. 두 방식:

1. **Standard Schema 호환 스키마** — @nestjs/config 12.0.0부터 `validationSchema`에 Zod, Valibot, ArkType 같은 Standard Schema 구현을 사용할 수 있다. 스키마에 없는 변수는 허용하고 실패한 변수는 모두 모아 보고하며, 라이브러리별 옵션은 `validationOptions.libraryOptions`에 둔다. Joi는 Standard Schema를 구현한 v18 이상에서 동작하고, 이 경우 `allowUnknown: true`, `abortEarly: false`가 기본이다. @nestjs/config 4.x 이하의 Joi 전용 API에서는 옵션을 `validationOptions` 바로 아래에 뒀다.
2. **커스텀 validate 함수** — `validate(config)`가 환경변수 객체를 받아 검증. class-validator + plainToInstance 조합이 공식 예시.

- `validatePredefined: false` — 모듈 import 전에 이미 설정된 process.env 변수(`PORT=3000 node main.js`의 PORT 같은)는 검증에서 제외.

## 기타

- `expandVariables: true` — .env 안에서 `${APP_URL}` 형태의 변수 확장 (dotenv-expand).
- `ConfigModule.envVariablesLoaded` — Promise. await하면 .env 로드 완료가 보장된 뒤 process.env를 읽을 수 있다 (동적 모듈 선택 등).
- `ConditionalModule.registerWhen(FooModule, 'USE_FOO')` — env 값 조건으로 모듈 로드 (두 번째 인자로 `(env) => boolean` 커스텀 조건 가능). ConfigModule이 함께 로드돼 있어야 하고, 기본 5초(옵션으로 조정) 안에 env 로드가 안 되면 부팅 실패.
- main.ts(모듈 밖)에서는 `app.get(ConfigService)`로 꺼내 사용.

## 관련 문서

- [[NestJS-Module-Dynamic|Dynamic Module (forRoot/forRootAsync 컨벤션)]]
- [[Custom-Provider|Custom Provider (토큰 주입, useFactory)]]
- [[NestJS-Lifecycle|Lifecycle (모듈 init 순서)]]

## 출처
- [NestJS — Configuration](https://docs.nestjs.com/techniques/configuration)
- [NestJS — Configuration source](https://raw.githubusercontent.com/nestjs/docs.nestjs.com/master/content/application/configuration.md)
- [config.module.ts — nestjs/config GitHub](https://github.com/nestjs/config/blob/master/lib/config.module.ts) (`forRoot`의 동기 할당과 `validationSchema` await 순서)
- [jwt-module-options.interface.ts — nestjs/jwt GitHub](https://github.com/nestjs/jwt/blob/master/lib/interfaces/jwt-module-options.interface.ts) (`registerAsync`의 `imports`, `inject`, `useFactory`)
- [인프런, 윤상석, NestJS와 DB 연결하기, 환경 변수 설정](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83828)
- [인프런, 윤상석, Swagger API 보안 설정 & 로그인 API 프론트엔드와 연결](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=84078)
- [인프런, 윤상석, JWT와 로그인 서비스 & 순환 참조 모듈](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83832)
- [인프런, 윤상석, passport와 인증 전략 & Custom decorator](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83833)
- [인프런, 윤상석, AWS-SDK를 사용하여 S3에 업로드 보충강의](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=95255)
- [인프런, 윤상석, MVC 패턴, 프로젝트 셋업](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=86917)
- [인프런, 윤상석, AWS RDS MySQL 구축 및 NestJS + TypeORM 프로젝트 셋업 (old)](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=87485)
