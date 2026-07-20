---
tags: [nestjs, logging, logger, observability]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Logging", "NestJS Logger", "ConsoleLogger"]
---

# NestJS Logging — 내장 Logger와 커스텀 주입

`@nestjs/common`의 `Logger`가 부트스트랩과 예외 표시 같은 **시스템 로깅**을 담당하고, 같은 클래스를 앱 로깅에도 쓴다. 구조화 로깅 일반론은 [[Structured-Logging]], 여기서는 NestJS 배선만.

## 레벨과 기본 설정

- `NestFactory.create(AppModule, { logger: ... })` — `false`(비활성) 또는 레벨 배열.
- 레벨 6종: `fatal`, `error`, `warn`, `log`, `debug`, `verbose`. **캐스케이딩** — `'log'`를 주면 그보다 심각한 `warn`, `error`, `fatal`이 자동 포함된다.
- `new ConsoleLogger({ colors: false, prefix: ..., timestamp: true })` — 색상, 접두사, 직전 로그와의 시간차 표시.

## JSON 로깅

```ts
logger: new ConsoleLogger({ json: true })
```

- `{ level, pid, timestamp, message, context }` 형태 한 줄 JSON — 로그 수집기, 클라우드 플랫폼 연동용.
- `json: true`면 **colors가 자동 비활성** (유효한 JSON 보장). 로컬 디버깅에선 colors를 명시로 다시 켤 수 있다.

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
- `autoFlushLogs: false`(기본 true)로 두면 `Logger.flush()` 수동 호출.
- `useLogger`로 바꾸면 앱 코드의 `new Logger(ctx)` 호출도 그 구현으로 위임된다.

## 외부 로거

파일 로깅, 중앙 수집 연동은 Node 로깅 라이브러리로 완전 커스텀 구현 — 공식 문서가 꼽는 대표는 고성능의 Pino. 수집 파이프라인 설계는 [[Log-Pipeline]].

## 관련 문서

- [[Structured-Logging|구조화 로깅 (JSON 로그 설계 일반론)]]
- [[Correlation-ID|Correlation ID (요청 추적 필드)]]
- [[Log-Pipeline|로그 파이프라인]]
- [[NestJS-Lifecycle|Lifecycle (부트스트랩과 logger 옵션)]]

## 출처
- [NestJS — Logger](https://docs.nestjs.com/techniques/logger)
