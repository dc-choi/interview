---
tags: [nestjs, lifecycle, graceful-shutdown]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Graceful Shutdown", "enableShutdownHooks", "종료와 리소스 정리"]
---

# NestJS 종료와 리소스 정리

종료 신호 처리와 Graceful Shutdown, 리소스 정리 패턴을 다룬다. 훅 종류와 실행 순서는 [[NestJS-Lifecycle-Hooks|부팅과 생명주기 훅]].

## enableShutdownHooks

`enableShutdownHooks()` 호출 안 하면 `OnModuleDestroy`/`OnApplicationShutdown`이 신호로 트리거되지 않음 (`app.close()` 명시 호출 시에는 불림). 컨테이너 환경(K8s SIGTERM)에서 필수. 리스너가 시스템 리소스를 소비해 기본 비활성 — 한 Node 프로세스에 Nest 앱 여러 개를 띄우는 Jest 병렬 테스트에선 리스너 과다 경고가 날 수 있다.

## 메모리 누수 방지 — 구독, 타이머, 이벤트 리스너 정리

장기 실행 Provider가 RxJS Subscription, `setInterval`, 이벤트 리스너를 만들었으면 종료 시 해제 필수. 안 하면 종료가 멈추거나, 핫 리로드 환경(dev)에서 누수 누적.

```ts
@Injectable()
export class OptimizedService implements OnModuleDestroy {
  private subscriptions: Subscription[] = [];
  private timers: NodeJS.Timeout[] = [];

  constructor(private events: EventEmitter2) {
    const sub = someObservable$.subscribe(() => {});
    this.subscriptions.push(sub);

    this.timers.push(setInterval(() => this.tick(), 5000));

    this.events.on('user.created', this.onUserCreated);
  }

  onModuleDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.timers.forEach(t => clearInterval(t));
    this.events.off('user.created', this.onUserCreated);
  }
}
```

REQUEST 스코프 Provider는 요청 종료 시 자동 GC지만, **DEFAULT 스코프(싱글톤)의 부수 효과**는 명시 정리해야 함.

## Graceful Shutdown 패턴

K8s/ECS 환경에서 **롤링 배포 중 in-flight 요청을 안전하게 마무리**하는 패턴.

```ts
// 1. 시그널 수신 시 헬스체크 unhealthy 응답으로 전환
@Injectable()
export class HealthService implements OnModuleDestroy {
  private isShuttingDown = false;

  isHealthy() { return !this.isShuttingDown; }

  onModuleDestroy() {
    this.isShuttingDown = true;
  }
}

// 2. enableShutdownHooks 활성화 → SIGTERM 들어오면
//    - HealthService가 unhealthy로 전환
//    - 로드밸런서가 트래픽 끊음 (헬스체크 실패)
//    - 진행 중 요청 끝나길 대기
//    - DB 연결, 큐 컨슈머 등 정리
```

`process.on('SIGTERM', ...)` 직접 등록도 가능하지만, NestJS 훅이 DI/모듈 의존 순서를 보장.

## 타임아웃, 강제 종료

종료 훅이 무한 대기에 걸리지 않게 외부에서 타임아웃을 강제. K8s `terminationGracePeriodSeconds` 기본 30초 — 이보다 짧게 정리 끝나야 함.

## 흔한 실수

- **enableShutdownHooks 호출 누락**: OnModuleDestroy 안 불림. K8s에서 in-flight 요청이 끊김.
- **OnModuleInit에서 다른 모듈 메서드 호출**: 그 모듈이 아직 init 안 됐을 수 있음. `OnApplicationBootstrap`로 미루기.
- **constructor에서 비동기 초기화**: 생성자는 동기 — `await` 못 씀. `OnModuleInit`으로.
- **종료 훅에서 새 비동기 작업 시작**: 정리 끝나기 전에 새 작업 만들면 영원히 안 끝남. 이미 시작된 작업 마무리만.
- **OnModuleDestroy에서 DB 쓰기 시도하다 연결 이미 끊김**: 다른 Provider의 종료가 먼저 일어났을 수 있음 — 의존성 순서 확인.
- **app.close()가 프로세스를 죽인다고 가정**: 훅만 트리거할 뿐 프로세스는 종료되지 않음 — interval, 장기 백그라운드 작업이 남아 있으면 계속 산다.
- **Keep-Alive 장수명 연결로 종료가 안 끝남**: HTTP 어댑터는 기본으로 응답 종료까지 대기 — enableShutdownHooks를 켰는데 앱이 안 죽거나 --watch 재시작이 멈추면 이 증상. `NestFactory.create(AppModule, { forceCloseConnections: true })`로 연결을 강제 종료.

## 면접 체크포인트

- `enableShutdownHooks()`의 역할 — 시그널 → 종료 훅 트리거
- Graceful Shutdown — 헬스체크 unhealthy 전환 → LB 트래픽 차단 → in-flight 요청 마무리
- K8s `terminationGracePeriodSeconds`와 종료 훅의 관계
- 종료는 init 역순 (v11부터 보장), 전역 모듈은 최후 destroy

## 관련 문서

- [[NestJS-Lifecycle|라이프사이클 인덱스]]
- [[NestJS-Lifecycle-Hooks|부팅과 생명주기 훅]]
- [[Nodejs-Production-Readiness|프로덕션 준비 (terminus 헬스체크)]]

## 출처
- [NestJS — Lifecycle events](https://docs.nestjs.com/fundamentals/lifecycle-events)
- [NestJS — Keep alive connections (FAQ)](https://docs.nestjs.com/faq/keep-alive-connections)
