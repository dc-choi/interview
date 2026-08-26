---
tags: [nestjs, lifecycle, graceful-shutdown]
status: done
verified_at: 2026-08-26
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

`enableShutdownHooks()`만으로 readiness 전파 대기까지 생기지는 않는다. Nest의 종료 순서는 `OnModuleDestroy` → `BeforeApplicationShutdown` → HTTP/WebSocket adapter dispose → `OnApplicationShutdown`이다. 따라서 request가 쓰는 DB pool을 `OnModuleDestroy`에서 먼저 닫으면 아직 처리 중인 요청이 실패할 수 있다.

안전한 순서는 다음처럼 배포 환경과 함께 구성한다.

1. `OnModuleDestroy`에서 readiness를 false로 바꾸고 새 background job과 queue 소비를 중단한다.
2. `BeforeApplicationShutdown`에서 readiness probe와 load balancer 전파 시간을 제한된 범위로 기다린다.
3. Nest가 HTTP adapter를 닫아 새 연결을 막고 진행 중인 요청이 끝나기를 기다린다.
4. `OnApplicationShutdown`에서 DB pool, Redis subscriber처럼 request-critical 리소스를 닫는다.

전파 대기 시간과 전체 deadline은 health check 주기, load balancer 설정, K8s `terminationGracePeriodSeconds`로 정한다. 직접 `process.on('SIGTERM', ...)`를 함께 등록해 같은 리소스를 두 번 닫지 말고, 종료 조정자를 한 곳에 둔다.

## 타임아웃, 강제 종료

종료 훅이 무한 대기에 걸리지 않게 외부에서 타임아웃을 강제. K8s `terminationGracePeriodSeconds` 안에 정리를 끝내도록 종료 시간을 설계한다. `forceCloseConnections: true`는 deadline을 넘긴 연결을 끊는 fallback으로만 사용하며, 활성 요청을 중단할 수 있으므로 정상 drain 설정으로 설명하지 않는다.

## 흔한 실수

- **enableShutdownHooks 호출 누락**: OnModuleDestroy 안 불림. K8s에서 in-flight 요청이 끊김.
- **OnModuleInit에서 다른 모듈 메서드 호출**: 그 모듈이 아직 init 안 됐을 수 있음. `OnApplicationBootstrap`로 미루기.
- **constructor에서 비동기 초기화**: 생성자는 동기 — `await` 못 씀. `OnModuleInit`으로.
- **종료 훅에서 새 비동기 작업 시작**: 정리 끝나기 전에 새 작업 만들면 영원히 안 끝남. 이미 시작된 작업 마무리만.
- **OnModuleDestroy에서 DB 쓰기 시도하다 연결 이미 끊김**: 다른 Provider의 종료가 먼저 일어났을 수 있음 — 의존성 순서 확인.
- **app.close()가 프로세스를 죽인다고 가정**: 훅만 트리거할 뿐 프로세스는 종료되지 않음 — interval, 장기 백그라운드 작업이 남아 있으면 계속 산다.
- **Keep-Alive 장수명 연결로 종료가 안 끝남**: HTTP 어댑터는 기본으로 활성 응답 종료를 기다린다. 먼저 요청 deadline과 전체 종료 deadline을 두고, `forceCloseConnections: true`는 시간이 끝난 뒤 요청 중단을 감수하는 fallback으로만 사용한다.

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
