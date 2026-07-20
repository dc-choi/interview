---
tags: [nestjs, config, env, dotenv, validation]
status: done
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

1. **Joi 스키마** — `validationSchema: Joi.object({ PORT: Joi.number().port().default(3000), ... })`. 기본 동작: 모든 키 optional(필수는 `.required()`), **스키마에 없는 변수 허용(allowUnknown: true)**, 모든 검증 에러 한 번에 보고(abortEarly: false). `validationOptions`로 변경.
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
