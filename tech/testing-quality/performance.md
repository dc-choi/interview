---
tags: [testing]
status: done
verified_at: 2026-08-05
category: "Testing & Quality"
aliases: ["performance"]
---

# Performance Test

이 문서는 성능 테스트의 **유형, 핵심 지표, 부하 모델링, SLO 역산 판정 기준**을 소유한다. 판정을 코드로 박는 k6 threshold 예시와 부하 생성기 자체 병목 확인 절차도 여기서 다룬다. k6 실행법과 도구 비교 상세(도구 선택 축, JMeter, Keploy, 분산 부하)는 [[Load-Test-K6|성능 테스트 도구 (k6, JMeter, Keploy)]]에 있다.

## 유형별 목적과 종료 조건

| 유형 | 묻는 질문 | 부하 모양 | 종료 조건 |
|---|---|---|---|
| Load | 평상시 예상 부하에서 SLO를 지키는가 | 램프업 후 평균 부하 유지 | 정상 구간 전체에서 임계값 통과 |
| Stress | 예상을 넘어선 부하에서 어떻게 깨지는가 | 평균 이상으로 상향 유지 | 열화 지점과 실패 양상을 관측하고 종료 |
| Endurance | 오래 돌려도 성능이 유지되는가 | 평균 부하를 수 시간 이상 유지 | 메모리, 커넥션, 디스크 증가 추세가 평평한지 확인 |
| Spike | 순간 폭주를 견디고 회복하는가 | 짧고 매우 높은 상승 후 즉시 하강 | 폭주 구간 생존과 하강 후 지표 회복까지 |
| Volume | 데이터가 커져도 처리되는가 | 부하보다 데이터 규모를 키움 | 목표 데이터 규모에서 쿼리 지연과 처리량 확인 |

주의할 점은 종료 조건이 시간이 아니라 판정이라는 것이다. 정해진 시간을 채우는 것으로는 통과가 되지 않고, 미리 정한 임계값을 만족했는지로 끝난다. Stress와 Spike는 통과 여부보다 어디서 무엇이 먼저 무너지는지를 남기는 것이 목적에 가깝다.

k6 공식 유형 가이드는 smoke, average-load, stress, soak, spike, breakpoint로 구분한다. 위 표의 Endurance는 k6의 soak에 대응하고, 한계 용량을 찾을 때까지 계속 올리는 breakpoint는 별도 유형으로 다룬다. Volume은 데이터 규모 축이라 k6 유형 가이드에는 별도 항목으로 나오지 않는다.

## 핵심 지표

한 가지 숫자만 보면 해석이 어긋난다. 아래 네 축을 함께 본다.

- **지연 분포** — 평균이 아니라 p95, p99를 본다. 평균은 느린 소수를 지워버리기 때문에 사용자가 실제로 겪는 최악을 감춘다.
- **처리량** — RPS 또는 TPS. 부하를 올렸는데 처리량이 더 오르지 않으면 그 지점이 포화점이다.
- **에러율** — 실패 요청 비율. 지연이 좋아 보여도 에러율이 올랐다면 빠르게 실패하고 있는 것일 수 있다.
- **포화 지표** — CPU, 메모리, 커넥션 풀 사용률, 큐 길이, DB 커넥션 대기. 어디가 먼저 차는지가 병목의 위치를 알려준다. [[Connection-Pool|Connection Pool 사이징]]

## ramp-up과 think time 모델링

**ramp-up**은 목표 부하까지 서서히 올리는 구간이다. k6 문서는 전체 테스트 시간의 5~15% 정도를 ramp-up에 배분하라고 안내하며, 이유를 세 가지로 든다. 시스템이 워밍업하거나 오토스케일할 시간을 주고, 저부하 구간과 평균 부하 구간의 응답 시간을 비교할 수 있게 한다. 세 번째는 Grafana 클라우드 서비스로 테스트를 실행하는 경우에 한해 자동 성능 알림이 시스템의 예상 동작을 학습할 수 있게 한다는 것이다.

다만 ramp-up만 테스트하면 계단식 급증에서만 나타나는 실패 모드를 놓친다. 점진 증가 통과가 스파이크 안전을 보장하지 않으므로 Spike는 별도로 돌린다.

**think time**은 사용자가 다음 요청을 보내기 전에 쉬는 시간이다. k6에서는 iteration 안의 `sleep()`으로 표현한다. 여기에 부하 모델의 함정이 하나 있다.

- **closed model** (`ramping-vus` 등 VU 기반): k6 문서 표현대로 이전 iteration이 끝나야 다음 iteration이 시작된다. 응답이 느려지면 iteration이 길어지고 새 iteration의 도착률이 떨어진다. 즉 대상 시스템이 힘들어질수록 부하가 저절로 줄어든다(coordinated omission).
- **open model** (`constant-arrival-rate`, `ramping-arrival-rate`): 도착률을 iteration 소요 시간과 분리한다. 대상 시스템의 응답 시간이 부하에 영향을 주지 않는다.

실제 트래픽이 사용자 수로 제한되는 형태면 closed, 외부에서 초당 몇 건이 꽂히는 형태면 open이 현실에 가깝다. 판단이 서지 않으면 arrival rate 기반을 기본으로 두는 편이 지연 왜곡이 적다.

## SLO 대비 판정 기준

숫자를 눈으로 보고 괜찮다고 말하는 순간 성능 테스트는 회귀 방지 장치가 되지 못한다. 기준을 코드로 박아 CI가 판정하게 한다. k6는 이를 threshold로 제공한다.

```javascript
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95%가 200ms 미만
    http_req_failed: ['rate<0.01'],    // 에러율 1% 미만
  },
};
```

- threshold를 만족하지 못하면 k6는 0이 아닌 종료 코드로 끝난다. 그대로 CI 실패로 이어진다.
- `abortOnFail`을 주면 임계값이 깨지는 즉시 테스트를 중단할 수 있다. 다만 k6 클라우드 실행에서는 threshold 평가가 60초 주기라 중단이 그만큼 늦어질 수 있다.
- 임계값은 SLO에서 역산한다. 서비스 SLO가 p99 500ms라면 테스트 임계값은 그보다 여유를 둔 값으로 잡아 회귀를 먼저 잡는다. [[Ops-Level-Indicator|운영 수준 지표]]

## 부하 생성기 자체 병목 확인

측정값이 나빠졌을 때 원인이 대상 시스템이 아니라 부하를 만드는 쪽인 경우가 흔하다. 이걸 걸러내지 않으면 존재하지 않는 병목을 몇 시간씩 쫓는다.

확인 순서:

1. **생성기 리소스** — k6 문서 기준으로 CPU는 80% 미만, 메모리는 90% 미만을 유지해야 한다. 메모리가 넘쳐 스왑이 시작되면 결과와 안정성이 함께 망가진다.
2. **VU당 메모리** — 단순한 테스트는 VU당 약 1~5MB, 파일 업로드나 큰 모듈을 쓰면 VU당 수십 MB까지 간다. 1000 VU면 1~5GB가 기본 소요다.
3. **네트워크 한계** — 트래픽이 1Gbit/s에서 평평하게 붙어 있으면 대상이 아니라 NIC가 한계다.
4. **파일 디스크립터와 포트** — `socket: too many open files`가 뜨면 fd가 고갈된 것이다. Linux에서는 `ulimit -n` 상향, `net.ipv4.ip_local_port_range` 확장, `net.ipv4.tcp_tw_reuse` 활성화로 커넥션 재사용과 포트 범위를 넓힌다.
5. **불필요한 작업 제거** — `discardResponseBodies: true`로 응답 본문을 메모리에 올리지 않는다.

같은 부하 스크립트를 생성기 대수만 늘려 돌렸을 때 처리량이 비례해 늘어난다면 이전 결과는 생성기 한계였다는 신호다.

## 면접 체크포인트

- 5가지 유형 각각의 목적과 무엇을 보고 끝낼지
- 평균이 아니라 p95, p99를 보는 이유
- closed model에서 응답이 느려지면 부하가 저절로 줄어드는 현상과 arrival rate 기반이 필요한 상황
- ramp-up을 두는 이유와 그것만으로 Spike를 대신할 수 없는 이유
- SLO에서 역산한 threshold로 CI 판정을 자동화하는 방식
- 결과를 믿기 전에 부하 생성기가 병목이 아닌지 확인하는 절차

## 출처

- [Grafana k6 공식 문서, Test types](https://grafana.com/docs/k6/latest/testing-guides/test-types/)
- [Grafana k6 공식 문서, Average-load testing](https://grafana.com/docs/k6/latest/testing-guides/test-types/load-testing/)
- [Grafana k6 공식 문서, Thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)
- [Grafana k6 공식 문서, Open and closed models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)
- [Grafana k6 공식 문서, Running large tests](https://grafana.com/docs/k6/latest/testing-guides/running-large-tests/)

## 관련 문서

- [[Test-Pyramid|테스트 피라미드 (성능 테스트의 파이프라인 위치)]]
- [[Test-Isolation|테스트 격리]]
- [[HTTP-API-Integration-Testing|HTTP API 통합 테스트]]
- [[Load-Test-K6|성능 테스트 도구 (k6, JMeter, Keploy)]]
