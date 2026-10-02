---
tags: [nestjs, runtime, esm, migration, cli]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS v12 업그레이드", "NestJS runtime 요구사항"]
---

# NestJS runtime과 업그레이드

2026-10-01 현재 `docs.nestjs.com`의 기본 문서는 v12이며 Version 11 링크는 이전 버전 문서다. 현재 샘플의 `.js` import, top-level await, Standard Schema 지원을 기존 v11 프로젝트의 설정과 구분한다.

## Node.js와 모듈 형식

| 대상 | 현재 공식 요구사항 |
|---|---|
| Nest v12 애플리케이션 | Node 20.19 이상, 22.x는 22.12 이상. Node 21 제외 |
| CLI binary | Node 20.11 이상과 ICU support. 실제 new/generate/upgrade schematics 조건은 아래와 다름 |
| CLI generator | Node 22.22.3 이상, 24.15 이상 또는 26 이상. 23/25 제외 |
| Jest에서 v12의 ESM package 로드 | Node 24.9 이상과 Jest 30 경로 확인 |

Nest core의 package engine 선언이 `>=20`이어도 v12 package의 ESM을 flag 없이 `require()`하려면 실제로는 위의 minor 조건이 필요하다. CLI 실행 조건과 배포 runtime 조건은 각각 확인한다.

**프레임워크 package가 ESM이라는 사실과 애플리케이션 코드의 ESM 전환은 별개다.** CommonJS 앱도 v12에서 실행할 수 있으며 `nest upgrade`는 앱의 module format을 바꾸지 않는다. AWS Lambda의 Node 20/22/24 runtime은 `require(esm)`을 기본 비활성화하므로 공식 migration은 `NODE_OPTIONS=--experimental-require-module` 설정을 안내한다. 배포 runtime에서 허용하는 옵션도 확인한다.

ESM으로 전환하려면 `package.json`의 `type: module`과 TS `module/moduleResolution: nodenext`를 함께 맞춘다. 상대 import는 emitted 파일을 가리키는 `.js` 확장자를 사용한다. `__dirname`, `__filename`, `require`는 그대로 존재하지 않으므로 `import.meta.dirname`, `fileURLToPath(import.meta.url)`, `createRequire()` 등으로 대체한다. 이 설정은 프로젝트 내 TS 파일 전체에 영향을 준다.

## CLI scaffold와 업그레이드

- `nest new`의 현재 기본 ESM scaffold는 Vitest, CommonJS는 Jest를 사용한다. `@nestjs/testing` 자체는 특정 test runner에 묶이지 않는다. 새 scaffold의 lint는 oxlint, formatting은 Prettier다.
- `nest upgrade --dry-run`으로 package와 기계적 수정 범위를 확인한 뒤 적용한다. core package 버전 일치, TypeScript 6와 관련 flag 변경은 기존 build/test 설정과 함께 검토한다.
- monorepo의 기본 bundler는 Rspack이다. 기존 webpack option은 deprecated이고 `--builder rspack` 경로로 이동한다. 기존 webpack build의 사용자 설정과 asset copy가 저절로 동일해진다고 가정하지 않는다.
- `nest deploy`는 별도 Mau 배포 서비스로 전달하고 첫 사용에 `@nestjs/mau`를 dev dependency로 설치한다. framework의 로컬 실행에 필수인 명령은 아니다.
- CLI의 Observe 질문은 interactive terminal과 noninteractive CI에서 다르게 동작한다. `--observe` 또는 `--no-observe`로 의도를 명시하고 생성된 SDK 설정을 확인한다.

## 빌드, workspace와 생성 코드

- package script의 `nest build`/`nest start`는 local CLI를 사용한다. global CLI로 실행한 generator와 프로젝트 build의 버전이 같다고 가정하지 않는다. `nest start`는 build 후 Node 실행이고 배포에서는 실제 emitted entry 경로를 확인한다.
- standard mode의 기본은 tsc, monorepo는 Rspack이다. `nest generate app/library`는 canonical `src`/`test` 구조의 프로젝트를 monorepo로 이동시키므로 변경 전 `--dry-run`과 백업을 사용한다. 비표준 구조에는 변환이 실패하거나 불완전할 수 있다.
- monorepo는 root package/dependencies를 공유한다. application은 main entry를, library는 index export를 가지며 단독 실행하지 않는다. TS paths와 런타임/test runner alias 해석은 별개라 Jest moduleNameMapper, Vitest resolve.alias도 맞춘다.
- project compilerOptions는 global compilerOptions와 merge되지 않는다. project assets 배열이 global을 대체하므로 공통 assets/library assets를 명시한다. assets는 sourceRoot 아래에 두고 incremental compile의 변경에는 watchAssets가 필요하다. 최상위 watchAssets가 asset별 값을 덮어쓴다.
- SWC는 type check를 하지 않는다. `--type-check`는 tsc noEmit과 plugin metadata 생성을 병행하며 metadata의 런타임 로드도 필요하다. v12 Rspack은 SWC를 내장하므로 기존 webpack swc-loader recipe를 기본 monorepo 설정으로 복제하지 않는다. `.swcrc.module`은 앱의 module 형식 추론을 덮어쓴다.
- `nest g resource`는 transport/DTO/service/spec의 틀을 만드는 **ORM 독립 generator**다. 생성된 placeholder 메서드가 실제 CRUD를 수행하지 않으며 `+id` 숫자 변환도 유효성 검사가 아니다. pipe/schema와 persistence를 별도로 연결한다.
- upgrade는 알려진 package/기계적 변경을 처리하되 lifecycle, pipe, logging 같은 동작 차이는 경고로 남긴다. ESM/Vitest/oxlint로 앱을 자동 전환하지 않는다. global CLI는 local dependency 업데이트와 별도로 먼저 업데이트해야 upgrade 명령을 사용할 수 있다.
- `nest deploy`는 Mau CLI로 인자를 전달한다. CI에서는 설치 질문을 하지 못하므로 `@nestjs/mau`를 미리 설치해야 한다. 구매 서비스의 배포 설정은 해당 프로젝트의 선택 사항이다.

## 개발 hot reload의 종료 계약

공식 hot-reload recipe는 webpack/CommonJS의 기존 경로다. v12의 기본 Rspack/ESM과 구분한다. HMR dispose callback은 async `app.close()`를 자동 기다리지 않으므로 종료 Promise를 hot data에 저장하고 다음 bootstrap이 이를 await한 뒤 listen해야 포트 중복을 피한다. `forceCloseConnections`는 개발 중 열린 연결을 끊을 수 있지만 운영 drain을 대신하지 않는다. bundle에 파일이 남지 않는 ORM glob과 static asset 복사도 확인한다.

## 런타임 계약이 달라지는 지점

| 변경 | 확인할 계약 |
|---|---|
| Standard Schema | parameter schema metadata만으로 검증하지 않는다. ValidationPipe/SerializerInterceptor를 실제 등록한다. 기존 class-validator/class-transformer 경로도 계속 지원한다 |
| config validation | Standard Schema 지원. 기존 Joi는 v18 이상, 라이브러리 옵션은 `validationOptions.libraryOptions`로 이동 |
| optional DI | subclass가 부모 constructor parameter 타입을 물려받아도 `@Optional()` marker는 다시 선언해야 한다 |
| NATS v3 | `nats` 대신 `@nats-io/transport-node`. 직접 helper import는 `@nats-io/nats-core`; custom deserializer는 전체 message의 `json()`을 읽는다 |
| GraphQL v14 | GraphiQL 기본 UI, `subscriptions-transport-ws` 제거. `graphql-ws`로 protocol/client까지 맞춘다 |
| lifecycle | component hierarchy에 따른 순서 변경. import 배열의 우연한 순서에 initialization/teardown을 의존하지 않는다 |
| Terminus | legacy `HealthIndicator`/`HealthCheckError` 대신 `HealthIndicatorService.check().up()/down()/attempt()` |
| WebSocket | request-scoped Gateway는 socket 연결 단위 수명. global Guard/Pipe/Interceptor와 Filter 적용 범위를 구분한다 |
| routing | duplicate/shadow 진단과 specificity 정렬은 opt-in. Fastify에서는 duplicate 진단만 같은 의미다 |
| logging | ConsoleLogger의 message 뒤 plain object는 구조화 params가 기본. `structuredParams: false`는 이전 동작 복원 |

일괄 package 교체 뒤 성공적으로 부팅된 것만으로 message protocol, schema 출력, health status와 종료 순서가 같은지 알 수는 없다. 사용하는 transport와 build, test, 배포 runtime의 계약을 해당 버전에서 검증한다.

## 관련 문서

- [[Injection-Scopes|DI 수명]], [[Provider|Provider와 Optional DI]]
- [[NestJS-GraphQL-Schema-Mapping|GraphQL 스키마와 드라이버]]
- [[NestJS-WebSocket-Gateway-Connection-and-Authorization|Gateway 수명과 인증]]
- [[NestJS-Lifecycle-Hooks|초기화 훅]], [[NestJS-Configuration|설정 검증]]
- [[NestJS-OpenAPI|API 계약]], [[NestJS-Microservices|메시지 transport]]

## 배포 산출물과 환경

production에서는 빌드된 진입점을 실행한다. root의 추가 TypeScript 파일과 tsconfig의 include/rootDir 때문에 `dist/main.js` 대신 `dist/src/main.js`가 될 수 있으므로 build 결과와 실행 경로를 대조한다. `nest start`는 빌드 후 시작하므로 이미 빌드한 immutable image를 실행하는 계약과 구분한다. `NODE_ENV=production`은 종속 패키지의 debug, template cache와 개발용 store 방어 등에 영향을 준다.

공식 Deployment 페이지의 단순 Dockerfile은 빌드와 실행을 한 stage에서 설명하는 예시다. 실제 배포에서는 lockfile 기반 재현 가능한 설치, 빌드용 의존성과 실행 산출물, assets, secret과 종료 신호 전달을 프로젝트 조건에 맞게 확인한다. Node image 버전은 framework/CLI/runtime의 요구를 함께 만족해야 한다. `EXPOSE` 선언만으로 외부 traffic routing이 구성되지 않는다.

수평 확장 때 session, job lease, file storage와 subscription 상태가 인스턴스 로컬에 남지 않는지 확인한다. health check는 [[NestJS-Reliability]], logs와 tracing은 [[NestJS-Logging]], [[NestJS-Observability]], 파일 보관은 [[NestJS-File-Storage]]에 연결한다. Mau는 공식 AWS 배포 서비스이며 CLI의 deploy wrapper와 서비스의 운영 계약을 구분한다. 여기서는 구매/계정 생성이나 배포를 수행한 기록을 남기지 않는다.

## 출처

- [NestJS Documentation, First steps](https://docs.nestjs.com/first-steps)
- [NestJS Documentation, Migration guide](https://docs.nestjs.com/migration-guide)
- [NestJS — CLI overview](https://docs.nestjs.com/cli/overview)
- [NestJS — CLI usage](https://docs.nestjs.com/cli/usages)
- [NestJS — CLI scripts](https://docs.nestjs.com/cli/scripts)
- [NestJS — Workspaces](https://docs.nestjs.com/cli/monorepo)
- [NestJS — Libraries](https://docs.nestjs.com/cli/libraries)
- [NestJS — CRUD generator](https://docs.nestjs.com/recipes/crud-generator)
- [NestJS — SWC](https://docs.nestjs.com/recipes/swc)
- [NestJS — Hot reload](https://docs.nestjs.com/recipes/hot-reload)

- [NestJS — Deployment](https://docs.nestjs.com/deployment)
