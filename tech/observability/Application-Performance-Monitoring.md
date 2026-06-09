---
tags: [observability, apm, performance, metric, slow-query]
status: done
category: "관측가능성(Observability)"
aliases: ["APM", "Application Performance Monitoring", "성능 모니터링"]
---

# Application Performance Monitoring (APM)

요청 단위 지연, 처리량, 에러율을 코드 레벨로 추적하는 관측 계층. 로그, 메트릭, 트레이스를 **요청 흐름**으로 묶어서 보여주는 것이 핵심 차별점. NewRelic, DataDog, Elastic APM, Sentry Performance, Grafana Tempo 등이 대표.

## 측정 기본기 — `process.hrtime.bigint()`

`Date.now()`는 ms 단위 + 시스템 시간 보정 영향. 실제 처리 시간은 **단조 증가 시계**(monotonic clock)로 측정.

```ts
const start = process.hrtime.bigint();
// ... 작업 ...
const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
```

`bigint`로 ns 정밀도, ms 변환 시 `Number()`. 1초 미만 작업이면 ms 분해능 충분.

## 요청 단위 측정 — Interceptor 패턴

NestJS 기준 Interceptor에서 시작, 종료 시점을 캡처해 메트릭 수집.

```ts
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(private metrics: MetricsService, private logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = process.hrtime.bigint();
    const request = context.switchToHttp().getRequest();
    const route = request.route?.path ?? request.url;

    return next.handle().pipe(
      tap(() => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        this.metrics.recordRequestDuration(request.method, route, durationMs);
        if (durationMs > 1000) this.logger.warn(`Slow request: ${request.method} ${route} ${durationMs}ms`);
      }),
    );
  }
}
```

`tap`은 성공만 — 에러 케이스도 잡으려면 `finalize` 또는 `catchError` 추가.

## 핵심 지표 (RED/USE)

| 모델 | 지표 | 용도 |
|------|------|------|
| **RED** | Rate, Errors, Duration | 사용자 영향 — 외부 노출 서비스 |
| **USE** | Utilization, Saturation, Errors | 자원 제약 — 시스템 내부 |

API 레벨은 RED, 인프라 레벨은 USE. APM은 보통 RED를 중심으로.

## 분포 측정 — 평균이 아닌 백분위

평균 응답시간은 **외곽값을 가린다**. 운영 SLO는 **P95, P99** 기준.

- P50(중앙값) — 일반적 사용자 경험
- P95 — 상위 5%가 겪는 지연 (SLO 자주 잡는 지점)
- P99 — 1% 극단 (장애 신호)
- P99.9 — Tail latency, 시스템 한계

평균은 같은데 P99이 튀는 패턴이 자주 있음 — GC pause, lock contention, slow query, 외부 호출 timeout.

## Slow Query, Slow Request 감지

| 임계값 패턴 | 조치 |
|-------------|------|
| 단일 요청 > 1s | 로그 warn + 트레이스 ID 함께 |
| P95 > 임계값 N분간 | 알람 (PagerDuty, Slack) |
| 같은 endpoint에서 P99 ≫ P95 | 특정 조건의 사용자만 느림 — 데이터 분포 의심 |

알람이 오면 트레이스 ID로 분산 트레이싱(OpenTelemetry)에서 풀 스팬 확인 → 어느 구간(DB, 외부 호출, CPU)이 원인인지 확정.

## APM 라이브러리 통합

```ts
@Injectable()
export class APMService {
  startTransaction(name: string) {
    return apm.startTransaction(name);   // NewRelic, DataDog, Elastic API 동일 형태
  }
  recordCustomMetric(name: string, value: number) {
    apm.recordMetric(name, value);
  }
}
```

대부분 **자동 계측**(HTTP, DB, Redis 클라이언트 자동 hook) + **커스텀 트랜잭션** API 제공. 자동 계측만으로도 80% 커버되고, 도메인 핵심 작업만 커스텀 추가.

## OpenTelemetry — 벤더 중립

특정 APM 벤더 종속을 피하려면 OTel SDK로 계측 → OTel Collector를 통해 Tempo, Jaeger, DataDog, NewRelic 어디든 송출.

```ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: 'http://otel-collector:4318/v1/traces' }),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

## 비용, 카디널리티 관리

APM은 데이터량이 비용에 직결. 카디널리티 폭발(예: `user_id`, `request_id`를 라벨로) → 메트릭 시리즈 수가 폭증.

| 룰 | 적용 |
|----|------|
| 라벨은 **유한 집합** (method, status, route 템플릿) | OK |
| 무한 집합(user_id, request_id, trace_id) | 메트릭 라벨 X — 트레이스/로그로 |
| 트레이스는 **샘플링** (예: 1%, 또는 에러 100% + 일반 1%) | 비용 ↓, 중요 트레이스 보존 |
| 로그는 **레벨 + retention 정책** | INFO 단기, ERROR 장기 |

## 흔한 실수

- **`Date.now()`로 측정 → 시스템 시간 보정 시 음수** 또는 부정확. `process.hrtime.bigint`.
- **평균만 모니터링 → P99 폭주 못 잡음**. 백분위 알람 필수.
- **메트릭에 user_id 라벨** → 카디널리티 폭발, 비용, 쿼리 성능 악화. 트레이스로.
- **자동 계측만 켜두고 도메인 트랜잭션 안 만듦** → 비즈니스 단위 지연 추적 불가. 핵심 use-case는 커스텀 transaction.
- **Tail latency 무시**: P99, P99.9가 기능 신뢰의 진짜 지표. 5xx보다 사용자가 더 자주 겪는 문제.
- **Slow query 알람 임계값을 1번 잡고 그대로**: 트래픽, 데이터 늘면 정상 P95가 임계 넘기 시작 → 동적 임계값 또는 정기 재조정.

## 면접 체크포인트

- `process.hrtime.bigint` vs `Date.now` — 단조 시계의 의미
- Interceptor 패턴으로 요청 단위 지연 측정
- RED vs USE — API 레벨과 인프라 레벨 모니터링 모델
- 평균이 아닌 백분위(P95, P99, P99.9)를 봐야 하는 이유 — Tail latency
- 카디널리티 폭발 — user_id를 메트릭 라벨로 두면 안 되는 이유
- 트레이스 샘플링 전략 — 에러 100% + 일반 N%
- OTel + Collector — 벤더 중립 구조
- 자동 계측 + 커스텀 transaction 조합 — 도메인 단위 가시성

## 관련 문서

- [[Logs-vs-Metrics|로그 vs 메트릭 vs 추적]]
- [[Container-Monitoring|컨테이너 모니터링]]
- [[Metric-Layer-Mismatch|메트릭 측정 레이어 함정]]
- [[Incident-Detection-Logging|장애 감지, 로깅]]
- [[Ops-Level-Indicator|운영 레벨 지표]]
- [[SLI-SLO|SLI / SLO / Error budget]]
- [[OpenTelemetry|OpenTelemetry와 분산 트레이싱]]
