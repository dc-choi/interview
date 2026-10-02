---
tags: [nestjs, logging, logger, observability]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS Logging", "NestJS Logger", "ConsoleLogger"]
---

# NestJS Logging — 내장 Logger와 커스텀 주입

`@nestjs/common`의 `Logger`가 부트스트랩과 예외 표시 같은 **시스템 로깅**을 담당하고, 같은 클래스를 앱 로깅에도 쓴다. 구조화 로깅 일반론은 [[Structured-Logging]], 여기서는 NestJS 배선만.

## 레벨과 기본 설정

- `NestFactory.create(AppModule, { logger: ... })` — `false`(비활성) 또는 레벨 배열.
- 레벨 6종: `fatal`, `error`, `warn`, `log`, `debug`, `verbose`. **캐스케이딩** — `'log'`를 주면 그보다 심각한 `warn`, `error`, `fatal`이 자동 포함된다.
- `new ConsoleLogger({ colors: false, prefix: ..., timestamp: true })` — 색상, 접두사, 직전 로그와의 시간차 표시. 이 시간차는 같은 프로세스의 다른 ConsoleLogger 호출도 포함하며 한 클래스의 요청 처리 시간은 아니다.
- `@nestjs/common`에서 제공하는 현행 `filterLogLevels('>=warn')`은 threshold 기반 레벨 배열을 만든다. 알 수 없는 단독 문자열은 전체 레벨로 fallback할 수 있지만 연산자 뒤에 잘못된 레벨을 쓰면 오류가 난다.
- 기본 출력은 stdout, error는 stderr다. 로그 필드와 transport를 바꾸는 일은 수집기 설정과 별도로 검증한다.

## JSON 로깅

```ts
logger: new ConsoleLogger({ json: true })
```

- `{ level, pid, timestamp, message, context }` 형태 한 줄 JSON — 로그 수집기, 클라우드 플랫폼 연동용.
- `json: true`면 colors가 기본 비활성이다. 색상을 다시 켜거나 compact 옵션을 바꾸면 수집기가 요구하는 한 줄 strict JSON인지 별도로 확인한다.
- 첫 메시지 뒤 plain object 인자는 기본으로 `params`에 병합한다. `flattenParams: true`일 때 JSON 최상위로 펼치고 예약 필드를 보호한다. 첫 인자의 object는 message이고 배열, class instance와 null 등은 별도 메시지로 출력하므로 호출과 로그 schema를 함께 정한다.
- 마지막 문자열 인자는 context로 해석될 수 있다. 여러 메시지를 전달하면서 의도하지 않게 context가 바뀌지 않도록 호출 signature를 확인한다.

## 앱 로깅 컨벤션

```ts
@Injectable()
class MyService {
  private readonly logger = new Logger(MyService.name);
  doSomething() { this.logger.log('Doing something...'); }
}
```

서비스마다 클래스명을 context 인자로 준 Logger 인스턴스를 두는 것이 표준 — 출력의 `[MyService]` 대괄호 부분이 된다. 시스템 로그와 앱 로그의 포맷이 일치한다.

## 커스텀 로거를 DI로 — bufferLogs + useLogger

`NestFactory.create()`는 모듈 밖에서 일어나 DI에 참여하지 않는다. 커스텀 로거(예: ConfigService를 주입받는 `LoggerService` 구현체)를 시스템 로깅에도 쓰려면:

1. `MyLogger`를 어떤 모듈의 provider로 등록 + export (최소 한 모듈이 import해야 싱글턴이 인스턴스화됨).
2. 부트스트랩에서 연결:

```ts
const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(MyLogger));
```

- `bufferLogs: true` — 커스텀 로거가 붙기 전까지의 로그를 **버퍼링**했다가 초기화 완료 후 그 로거로 출력. 초기화가 실패하면 기본 ConsoleLogger로 폴백해 에러를 찍는다.
- `autoFlushLogs: false`(기본 true)로 두면 `Logger.flush()` 수동 호출. HTTP app과 microservice는 listen 시, standalone context는 `useLogger()` 시 자동 flush한다. 자동 flush를 끄면 `flushLogs()`로 직접 비운다.
- DI로 주입한 logger에서 클래스별 `setContext()`를 사용하면 transient scope로 각각 받아 공유 singleton의 context를 덮어쓰지 않는다.
- `useLogger`로 바꾸면 앱 코드의 `new Logger(ctx)` 호출도 그 구현으로 위임된다.

## 지연 메시지와 관측

기본 text logger에 함수 메시지를 주면 해당 레벨이 활성일 때만 계산하는 lazy logging을 사용할 수 있다. JSON 출력과 외부 LoggerService가 같은 계약을 자동 구현한다고 가정하지 않는다. async 함수를 전달해 logger가 Promise를 기다릴 것이라고 기대하지 않는다.

Observe에 로그를 연결하는 경우에도 LoggerService를 통한 위임 경로를 확인한다. 직접 `console.log()`하거나 별도 logger를 호출한 기록이 Nest의 추적 컨텍스트와 자동 연결된다고 단정하지 않는다. 설정은 [[NestJS-Observability]].

## 외부 로거

파일 로깅, 중앙 수집 연동은 Node 로깅 라이브러리로 완전 커스텀 구현 — 공식 문서가 꼽는 대표는 고성능의 Pino. 수집 파이프라인 설계는 [[Log-Pipeline]].

## 관련 문서

- [[Structured-Logging|구조화 로깅 (JSON 로그 설계 일반론)]]
- [[Correlation-ID|Correlation ID (요청 추적 필드)]]
- [[Log-Pipeline|로그 파이프라인]]
- [[NestJS-Lifecycle|Lifecycle (부트스트랩과 logger 옵션)]]

## 출처
- [NestJS — Logger](https://docs.nestjs.com/application/logger)
