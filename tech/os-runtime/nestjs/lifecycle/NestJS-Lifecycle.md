---
tags: [nestjs, lifecycle, bootstrap, hooks, graceful-shutdown]
status: index
category: "OS & Runtime - NestJS"
aliases: ["NestJS Lifecycle", "Bootstrap", "OnModuleInit"]
---

# NestJS 애플리케이션 라이프사이클 (인덱스)

NestJS 앱은 **Bootstrap → 모듈 초기화 → 요청 처리 → 종료** 순으로 진행. 각 단계에 훅이 있어 DI 컨테이너 위에서 안전하게 초기화, 정리 작업을 끼워 넣을 수 있다.

```
1. NestFactory.create()           → Provider 인스턴스화, DI 그래프 구성
2. 전역 설정 적용                  → useGlobalPipes/Filters/Interceptors, Express 미들웨어
3. OnModuleInit (각 모듈)          → 의존성 그래프 순서대로
4. OnApplicationBootstrap (각 모듈) → 모든 모듈 init 후
5. app.listen()                    → HTTP 서버 시작, 요청 수신
                                   ── 운영 ──
6. SIGTERM/SIGINT
7. OnModuleDestroy (각 모듈, init 역순)
8. OnApplicationShutdown
9. 프로세스 종료
```

| 문서 | 내용 |
|------|------|
| [[NestJS-Lifecycle-Hooks\|부팅과 생명주기 훅]] | Bootstrap 표준 형태, 훅 6종, 실행 순서 (전역 모듈, v11 역순 보장), OnModuleInit vs OnApplicationBootstrap |
| [[NestJS-Lifecycle-Shutdown\|종료와 리소스 정리]] | enableShutdownHooks, Graceful Shutdown, 메모리 누수 방지, 타임아웃, 흔한 실수 |

관련: [[NestJS|NestJS (폴더 인덱스)]], [[NestJS-Module-Dynamic|Dynamic Module (registerAsync 옵션 초기화)]], [[NestJS-Cold-Start-Optimization|Cold Start 최적화 (Lazy Module로 init 비용 분산)]]
