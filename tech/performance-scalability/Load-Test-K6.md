---
tags: [performance, load-test, k6, jmeter, keploy, testing-tools]
status: done
category: "성능&확장성(Performance&Scalability)"
aliases: ["Load Test K6", "성능 테스트 도구", "k6 vs JMeter"]
---

# 성능 테스트 도구, k6, JMeter, Keploy

성능 테스트는 API, 서비스가 **예상 부하에서 SLO를 지키는가**를 확인하는 활동. 도구 선택은 **스크립팅 편의성, 리소스 오버헤드, 분산 부하, 실 트래픽 활용 여부**가 축. 현대 개발자 친화 도구는 **k6**(JS 기반, 경량), 전통 강자는 **JMeter**(GUI, 확장), 신흥 실 트래픽 도구는 **Keploy**(eBPF 기반 자동 생성).

## 성능 테스트 유형

유형 구분(Load, Stress, Endurance, Spike, Volume)과 각 유형의 부하 모양, 종료 조건은 [[performance|성능 테스트 유형]]이 정본이다. 이 문서는 그 시나리오를 **어떤 도구로 돌릴지**에 집중한다.

## 도구 선택 핵심 축

- **스크립팅 언어, 편의성**
- **메모리, CPU 오버헤드**
- **분산 부하 기본 지원 여부**
- **시각화, 리포팅**
- **CI/CD 통합**
- **학습 곡선**
- **실 트래픽 재사용 가능성**

## k6

### 특징

- **JavaScript 기반** 스크립트 — 개발자 친화
- **Go로 작성** → **메모리 사용량 낮음** (약 100MB)
- 초당 **수십만 요청** 처리 가능
- GUI 없음 → 오버헤드 최소
- Grafana, Datadog, Prometheus와 자연스럽게 연동
- `k6 cloud`로 SaaS 분산 부하

### 장점

- **코드로 시나리오** — 버전 관리, 리뷰 가능
- CI/CD 통합 쉬움 (`k6 run` 한 줄)
- 리소스 효율 — 단일 머신에서 큰 부하 생성
- 활발한 생태계, 최신 프로토콜(WebSocket, gRPC) 지원

### 단점

- **기본 분산 부하 미지원** — k6 Operator(Kubernetes) 필요
- JavaScript 모르면 진입장벽
- GUI 부재 → 초보자에게 낯섦

### 예시

```javascript
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = { vus: 100, duration: '30s' };

export default function () {
  const res = http.get('https://api.example.com/users');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

## JMeter

### 특징

- **Apache 프로젝트** — 1998년부터 유지보수
- **Java 기반**, XML로 저장되는 테스트 플랜
- **GUI 제공** — Test Plan 조립
- **분산 부하 기본 지원** (Controller-Worker)
- 플러그인 생태계 방대

### 장점

- **GUI 시나리오 구성** — 비개발자, QA도 사용 가능
- 풍부한 문서, 서적, 커뮤니티
- 다양한 프로토콜(JDBC, JMS, FTP 등) 기본 지원
- 분산 부하 기본 제공

### 단점

- **메모리 사용량 높음** (약 600MB)
- GUI 모드에서 성능 테스트 시 **리소스 오버헤드** 큼 — 실 테스트는 비GUI(`jmeter -n`)로
- XML 저장 → **가독성, Git 리뷰 어려움**
- JavaScript, JSON 중심 시대에 **투박함**

## k6 vs JMeter 비교

| 축 | k6 | JMeter |
|---|---|---|
| 스크립트 | JavaScript | XML (GUI 편집) |
| 메모리 | ~100MB | ~600MB |
| 최대 부하 | 수십만 RPS (단일 머신) | 제한됨(워커 필요) |
| 분산 부하 | 외부 서비스 필요 | 기본 지원 |
| Git 리뷰 | 쉬움 (JS) | 어려움 (XML) |
| CI 통합 | 쉬움 | 가능하지만 복잡 |
| 학습곡선 | 개발자에게 낮음 | GUI 유저에게 낮음 |
| 진영 | 개발자, DevOps | QA, 전통 기업 |

### 선택 가이드

- **k6 추천**: 개발자 팀, GitOps, CI/CD 통합, 메모리 효율 중요
- **JMeter 추천**: QA 팀, GUI 선호, 분산 부하 즉시 필요, 다양한 프로토콜(JDBC, JMS 등)
- 많은 조직이 **이행 중** — JMeter에서 k6로

## Keploy (실 트래픽 기반)

### 특징

- **eBPF 기반 네트워크 트래픽 캡처**
- 실제 API 호출을 **자동 기록** → 테스트 케이스 + Mock 데이터 생성
- **코드 수정 불필요** — `keploy record`로 기록, `keploy test`로 재생
- 언어, 프레임워크 무관 (네트워크 레이어에서 동작)

### 강점

- **실제 사용 시나리오** 기반 → 단위 테스트보다 현실적
- 최대 90% 커버리지 목표 가능
- DB, Message Queue(PostgreSQL, MongoDB, Kafka, RabbitMQ)도 **결정론적 재현**
- Statement/Branch Coverage + **API Schema, 비즈니스 유스케이스** 커버리지 동시 측정

### 한계

- eBPF 의존 → **Linux 환경**에서 우위, macOS, Windows는 제한적
- 복잡한 상태 의존 테스트는 여전히 수동 케이스 필요
- 생산 환경 적용 전 **민감 데이터 필터링** 필요
- 기존 테스트 스위트를 **대체**하지 않고 **보완**

### 용도

- 레거시 시스템의 **초기 테스트 커버리지** 빠르게 확보
- **API 회귀 테스트** 자동화
- 프로덕션 트래픽 패턴을 **CI에 재현**

## 3가지 도구의 역할

| 도구 | 주 역할 |
|---|---|
| **k6** | 계획된 부하 시나리오, SLO 검증 |
| **JMeter** | QA 주도 성능 테스트, 다양한 프로토콜 |
| **Keploy** | 실 트래픽 기반 테스트 자동 생성, 회귀 |

셋은 **경쟁이 아니라 보완**이다 — k6로 SLO 부하, Keploy로 회귀, JMeter로 특수 프로토콜.

## 실전 설계

- **유형과 지표 축**: [[performance|성능 테스트 유형]] 참고. 이 절은 도구 측 설정만 다룬다.
- **k6가 방출하는 기본 메트릭**: `http_req_duration`은 요청 전체 소요를 trend로, `http_req_failed`는 실패 비율을 rate로 내보낸다. threshold 표현식은 이 메트릭 이름 위에 건다.
- **환경 분리**: Load는 Staging, Stress와 Endurance, Spike는 전용 환경, Production은 Canary, Shadow로 제한적

## 흔한 실수

- **로컬 머신에서 본격 부하 테스트** — CPU 포화로 왜곡된 결과
- **단일 지표만 봄** (RPS만) — P99, 에러율 동반 확인 필수
- **Warm-up 없이** 측정 — JIT, 캐시 초기화 구간 포함해서 평균 왜곡
- **데이터 같은 값 반복** — 캐시에 히트 → 실제와 다름
- **GUI JMeter로 실 테스트** — JMeter 자체가 병목
- **SLO 없이 측정** — 기준이 없으면 숫자가 해석 불가
- **램프업 시나리오만 테스트** — 스텝 급증에서만 나는 커넥션 폭증과 Full GC를 못 본다 ([[Capacity-Planning|캐퍼시티 플래닝]])

## 면접 체크포인트

- k6와 JMeter의 **구조적 차이**(언어, 메모리, GUI, 분산)
- 본인 팀에 맞는 도구 선택 근거
- Keploy가 기존 성능 테스트와 다른 **트래픽 소스** 관점
- 성능 테스트 유형 5가지(Load, Stress, Endurance, Spike, Volume)와 판정 기준은 [[performance|성능 테스트 유형]]
- k6의 `http_req_duration`, `http_req_failed`가 각각 무엇을 재는지
- 로컬이 아닌 **전용 환경**에서 테스트하는 이유

## 출처
- [velog yongtae923 — k6 vs JMeter](https://velog.io/@yongtae923/k6-vs-JMeter)
- [keploy GitHub](https://github.com/keploy/keploy)

## 관련 문서
- [[Latency-Optimization|레이턴시 최적화]]
- [[Connection-Pool|Connection Pool 사이징]]
- [[performance|성능 테스트 유형]]
- [[CPU-Bound-Vs-IO-Bound|CPU-Bound vs I/O-Bound]]
- [[First-Come-Coupon-Patterns|선착순 이벤트 패턴]]
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
