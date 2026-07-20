---
tags: [runtime, nestjs]
status: done
category: "OS & Runtime"
aliases: ["Custom Provider", "DI Deep Dive"]
---

# Custom Provider & DI Deep Dive

## 의존성 주입 동작 방식

1. 자신이 어떤 의존성을 주입 받아야 하는지 기록
2. 프로바이더 간 의존성 관계 기록
3. 실제 의존성 주입

## 메타데이터

- 보통 **데코레이터**와 연관지어 사용
- 트랜스파일링 과정에서도 메타데이터를 주입해줌
- 타입, 파라미터, 반환값에 대한 메타데이터 기록 가능
- 주로 **타입과 파라미터**를 활용

## 프로바이더 토큰

프로바이더는 **토큰**으로 구분한다.

| 토큰 종류 | 설명 |
|---|---|
| 문자열 | 문자열 기반 토큰 |
| 심볼 | Symbol 기반 토큰 |
| 생성자(클래스) | 클래스 그 자체를 토큰으로 사용 |

NestJS는 파라미터를 통해 어떤 클래스의 객체/토큰을 원하는지 판단한다.
`@Inject()` 데코레이터는 셀프 파라미터를 사용한다.

- **인터페이스는 토큰이 될 수 없다**: TS 타입과 인터페이스는 컴파일 시 지워져 런타임 토큰이 못 된다. 인터페이스 계약으로 주입하려면 문자열이나 Symbol 토큰을 만들고(`const LOGGER_SERVICE = Symbol('LOGGER_SERVICE')`), `{ provide: LOGGER_SERVICE, useClass: PinoLoggerService }`로 묶은 뒤 소비 측에서 `@Inject(LOGGER_SERVICE)`로 받는다. 클린 아키텍처의 포트 주입이 이 조합이다.

## 커스텀 프로바이더 4형태

표준 형태 `providers: [CatsService]`는 `{ provide: CatsService, useClass: CatsService }`의 축약이다. provide(토큰)와 생성 방법을 분리하면 네 가지가 열린다.

| 형태 | 하는 일 | 대표 용도 |
|---|---|---|
| `useValue` | 준비된 값을 그대로 바인딩 | 상수, 설정 객체, 외부 라이브러리 인스턴스, 테스트 mock 교체 |
| `useClass` | 토큰이 가리킬 구현 클래스를 동적으로 결정 | 환경별 구현 교체(개발용 vs 운영용), 인터페이스 토큰에 구현 연결 |
| `useFactory` | 팩토리 함수의 반환값을 프로바이더로 | 다른 프로바이더에 의존하는 동적 생성(DB 커넥션 등). async 팩토리면 Promise가 resolve될 때까지 의존 클래스의 인스턴스화를 기다린다 — DB 연결이 서기 전에 요청을 받지 않게 앱 시작을 지연시키는 용도 |
| `useExisting` | 기존 프로바이더의 별칭 토큰 | 같은 인스턴스를 두 토큰으로 접근(싱글턴 스코프면 동일 인스턴스 보장) |

- `useFactory`의 `inject` 배열은 팩토리 인자로 넘길 프로바이더 목록이다 — 순서대로 인자에 대응하고, `{ token, optional: true }`로 지정한 항목은 없으면 undefined로 들어온다.
- 커스텀 프로바이더를 다른 모듈에 공개할 때 exports에는 그 **토큰**을 싣는다.

## 의존성 처리 과정

1. **모듈 등록**: 모든 모듈을 순회하여 컨테이너에 등록
2. **의존성 트리 생성**: 모듈의 의존관계에 대한 트리 구축
3. **인스턴스 래퍼**: 각 프로바이더에 대한 인스턴스 래퍼 사용

## Cannot resolve dependency 진단

`Nest can't resolve dependencies of the <provider> (?). Please make sure that the argument <unknown_token> at index [<index>] is available in the <module> context.` — 가장 흔한 DI 에러. 메시지의 세 슬롯(누가, 어떤 토큰을, 어느 모듈에서)을 읽으면 원인이 좁혀진다.

- **1순위 확인**: `<provider>`가 해당 모듈 providers 배열에 있는가. 프로바이더를 imports 배열에 잘못 넣으면 `<module>` 자리에 프로바이더 이름이 찍힌다.
- **Feature 모듈과 Root 모듈에 같은 프로바이더 중복 선언** — Nest가 두 번 인스턴스화를 시도한다. 재선언 대신 그 프로바이더를 담은 모듈을 Root의 imports에 넣는다.
- `<unknown_token>`이 `dependency` → 생성자 DI 순환이 아니라 **TS 파일 순환 import**. 모듈 파일이 토큰 상수를 선언하면서 프로바이더를 import하고, 프로바이더는 그 상수를 모듈 파일에서 도로 import하는 패턴이 단골 — 상수를 별도 파일로 분리하고, 배럴(index.ts) 경유 import가 순환을 만드는지도 본다 ([[NestJS-Circular-Dependency-Overview|순환 의존성]]).
- `<unknown_token>`이 `Object` → 인터페이스/타입으로 주입한 것 (위 "인터페이스는 토큰이 될 수 없다"). 클래스 참조를 직접 import하거나 @Inject() 커스텀 토큰을 쓴다. 클래스 프로바이더를 `import type`으로만 가져와도 런타임에 지워져 같은 증상.
- `<unknown_token>` = `<provider>` 자신 → **self-injection은 허용되지 않는다**.
- `<unknown_token>`이 `ModuleRef` (모노레포) → `@nestjs/core`가 두 벌 로드된 것 (하위 패키지의 중첩 node_modules). Yarn workspaces는 nohoist, pnpm은 peerDependencies 선언 + dependenciesMeta injected로 단일화한다.
- **NEST_DEBUG 환경변수** (Nest 8.1.0+) — truthy 문자열로 설정하면 의존성 해결 과정이 로깅된다: 호스트 클래스(노랑), 주입 토큰(파랑), 탐색 대상 모듈(보라) 순으로 추적.
- **Devtools 부분 그래프** (core 9.3.10+) — `NestFactory.create(..., { snapshot: true, abortOnError: false })`로 띄우고 bootstrap의 catch에서 `PartialGraphHost.toString()`을 graph.json으로 저장하면, 부팅 실패 시점까지의 부분 의존성 그래프를 Devtools(Preview 모드)에 올려 실패 모듈을 시각적으로 짚을 수 있다. DevtoolsModule은 introspection용 HTTP 서버(포트 8000)를 추가로 열고 Sandbox는 인증 우회 코드 실행까지 허용하므로 **프로덕션에서는 절대 켜지 않는다**.
- 관련 옵션으로 `preview: true`를 주면 **컨트롤러, 인핸서, 프로바이더의 생성자와 라이프사이클 훅을 실행하지 않고** DI 그래프만 구성한다 — DB 연결 없이 CI에서 그래프를 뽑는 용도. 그래프를 커밋/PR마다 발행해 diff 리포트를 만들면 코드리뷰가 놓치는 구조 변화(엔드포인트의 가드 제거, 깊은 프로바이더의 스코프 변경, 모듈 전역화로 인한 edge 폭증)가 드러난다 (발행/리포트는 Devtools Enterprise 기능).

## 관련 문서
- [[Provider]]
- [[Injection-Scopes|Injection Scopes]]
- [[Module-reference|모듈 참조]]
- [[Clean-Architecture-NestJS|클린 아키텍처의 포트 주입 (Symbol 토큰 실전)]]

## 출처
- [NestJS — Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS — Asynchronous providers](https://docs.nestjs.com/fundamentals/async-providers)
- [NestJS — SQL (TypeORM) recipe](https://docs.nestjs.com/recipes/sql-typeorm) (useFactory DB 커넥션 배선의 정본 예시)
- [NestJS — Common errors (FAQ)](https://docs.nestjs.com/faq/common-errors)
- [NestJS — Devtools overview](https://docs.nestjs.com/devtools/overview)
- [NestJS — Devtools CI/CD integration](https://docs.nestjs.com/devtools/ci-cd-integration)
