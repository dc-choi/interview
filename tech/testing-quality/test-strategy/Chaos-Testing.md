---
tags: [testing, chaos-engineering, reliability]
status: done
verified_at: 2026-08-31
category: "테스트&품질(Testing&Quality)"
aliases: ["Chaos Testing", "카오스 테스팅", "카오스 엔지니어링"]
---

# 카오스 테스팅 (Chaos Testing)

정상 상태(steady state)를 측정 가능한 출력 지표로 정의하고, 그 상태가 장애 중에도 유지된다는 **가설**을 세운 뒤 실제 장애를 주입해 반증을 시도하는 실험이다. Principles of Chaos Engineering은 카오스 엔지니어링을 난기류 같은 운영 조건을 견디는 시스템의 능력에 확신을 쌓기 위해 시스템 위에서 실험하는 분야로 정의한다. 새 결함을 만들어 내는 활동이 아니라 이미 시스템이 갖고 있는 취약점을 통제된 조건에서 먼저 드러내는 활동이라는 점이 다른 테스트와의 출발점 차이다.

## 다른 테스트가 못 잡는 것

단위, 통합, 계약, E2E가 전부 통과해도 남는 영역은 의존 서비스의 지연과 부분 실패, 재시도 증폭, 폴백 경로의 미동작처럼 **여러 컴포넌트가 동시에 비정상일 때만 나타나는 상호작용**이다. 계층별 초록불의 일반적 사각지대는 [[Test-Pyramid-Blind-Spots|초록불이 못 잡는 것]]에, 계획된 부하 아래에서 지연과 처리량이 SLO를 지키는지 판정하는 일은 [[performance|성능 테스트]]에 있다. 카오스 테스팅은 이 둘과 목적이 갈린다. 부하 테스트가 정상 조건에서 용량을 묻는다면, 카오스 테스팅은 비정상 조건에서 설계한 회복 장치가 실제로 도는지를 묻는다. AWS Well-Architected는 여기서 얻으려는 것을 known-unknowns와 unknown-unknowns라고 부르고, 이미 깨질 줄 아는 대상에는 실험하지 말라고 명시한다.

## 원칙

| 원칙 | 내용 |
|---|---|
| 정상 상태 기반 가설 | 내부 속성이 아니라 시스템의 **측정 가능한 출력**을 본다. 처리량, 에러율, 지연 분위수가 대표 지표이고 CPU 사용률 같은 내부 지표는 정상 상태의 대리 지표로 부적절하다 |
| 실제 이벤트를 변수로 | 실제로 일어나는 사건을 주입하고, 잠재 영향도나 발생 빈도로 우선순위를 매긴다 |
| 운영에서 실행 | 실제로 배포된 시스템과의 관련성을 확보하려면 운영 트래픽 위 실험이 가장 정확하다. 다만 운영은 목표이지 시작점이 아니다 |
| 지속 자동 실행 | 가설을 통과한 실험은 자동 회귀 테스트로 남겨 CI/CD와 그 바깥에서 반복한다 |
| 폭발 반경 최소화 | 단기 악영향의 여지는 두되 그 여파를 최소화하고 가두는 것이 실험 주체의 책임이다 |

## 실험 설계 절차

1. **정상 상태 정의** — 예: 결제 시스템이 성공률 99%로 300 TPS를 처리하고 왕복 500 ms를 유지. 실험 전에 워크로드가 실제로 건강한지부터 확인한다.
2. **가설 문장 작성** — AWS Well-Architected가 제시하는 형태는 특정 장애가 발생하면 해당 워크로드가 어떤 완화 장치로 어떤 지표 영향 범위를 유지한다는 서술이다. 완화 장치를 문장에 못 박는 것이 핵심이라 무엇을 반증하는지가 분명해진다.
3. **주입 대상과 실패 유형 선택** — 과거 포스트모템과 FMEA로 후보를 뽑고 빈도와 영향으로 우선순위를 매긴다.
4. **폭발 반경과 중단 조건 사전 정의** — 대상 인스턴스 비율, 시간창, 트래픽 분기를 정하고, 가드레일 지표가 임계를 넘으면 자동 중단되게 한다. 되돌리는 절차(post action)까지 실험 정의에 포함한다.
5. **주입과 관측** — 대조군과 실험군을 함께 두고 정상 상태 지표를 비교한다.
6. **가설 검증과 개선** — 정상 상태가 깨졌으면 설계를 고치고 같은 실험을 다시 돌린다. 통과한 실험은 자동 회귀로 승격하고 결과 데이터를 기록해 남긴다.

## 주입하는 실패 유형

| 유형 | 드러나는 취약점 |
|---|---|
| 네트워크 지연 추가 | 타임아웃 값이 실제 지연 분포보다 관대해 스레드와 커넥션이 묶임 |
| 패킷 손실, 연결 차단 | 재시도 정책이 지터 없이 동시에 몰려 의존 서비스를 2차로 무너뜨림 |
| 인스턴스, 파드 종료 | 헬스체크와 재스케줄 지연, 인플라이트 요청 유실, 세션 고정 의존 |
| CPU, 메모리, 디스크 고갈 | 리소스 압박 아래 GC 지연과 OOM, 로그 디스크가 차서 생기는 연쇄 실패 |
| 의존 서비스 5xx와 타임아웃 | Circuit Breaker 임계 오설정, 폴백 경로가 코드에만 있고 동작하지 않음 |
| 시계 왜곡 | 토큰 만료 판정, 스케줄러 중복 실행, 분산 락 TTL 오동작 |
| DNS 해석 실패 | 이름 해석 실패 시 무한 재시도, DNS 캐시 TTL 가정의 붕괴 |

여기서 검증 대상이 되는 회복 패턴(Timeout, Bulkhead, Circuit Breaker의 상태 전이와 값 선택)은 [[External-Service-Resilience|외부 연동 회복 패턴]]이 정본이고, 재시도 폭주의 통제는 [[Retry-Backoff-Jitter|재시도, 백오프와 지터]], 이런 장애가 왜 커지는지의 기전은 [[Failure-Evolution-Under-Load|부하 아래 장애 진화]]에 있다.

## 도구 지형

| 계층 | 도구 | 성격 |
|---|---|---|
| 관리형 클라우드 | AWS Fault Injection Service | 실험 템플릿에 action, target, stop condition을 정의하고 CloudWatch 알람을 중단 조건으로 연결. 문서 기준 템플릿당 중단 조건은 최대 5개 |
| Kubernetes | Chaos Mesh, LitmusChaos | CRD 기반. Chaos Mesh는 CNCF incubating 프로젝트이고 파드, 네트워크, stress, IO, 시계 왜곡, DNS, 커널, HTTP 장애를 다룬다 |
| 호스트, 인스턴스 | Netflix Chaos Monkey | 운영 환경의 VM과 컨테이너를 무작위 종료. 인스턴스 종료 기능은 Spinnaker로 앱을 관리하는 것이 전제 |
| 애플리케이션 경계 프록시 | Shopify Toxiproxy | TCP 프록시로 `latency`, `bandwidth`, `slow_close`, `timeout`, `reset_peer`, `slicer`, `limit_data` toxic을 붙인다. 프록시 자체는 `enabled: false`로 별도 비활성화할 수 있다. v2.12.0 README 기준이며, 로컬과 통합 테스트에서 의존 하나만 골라 흔들기 좋다 |
| 언어 중립 프레임워크 | Chaos Toolkit | 실험을 선언적으로 기술하고 도구를 드라이버로 붙이는 방식 |

도구는 취향이 아니라 **실행 환경이 정한다**. Kubernetes 위면 Chaos Mesh나 Litmus, AWS 관리형 리소스의 종료와 페일오버까지 다루려면 FIS, 단일 의존의 지연과 타임아웃만 재현하려면 Toxiproxy가 가장 적은 비용으로 끝난다. Well-Architected는 상태 추적, 로그, 롤백과 중단 조건을 갖추지 못한 커스텀 스크립트로 실험하는 것을 권하지 않는다.

## 도입 단계

- **0단계 전제조건** — 정상 상태 지표와 알람([[SRE|SRE 지표 체계]]), 배포 되돌리기, 장애 대응 절차와 포스트모템([[RCA-Postmortem|RCA와 포스트모템]])이 없으면 시작하지 않는다. 관측이 없으면 실험은 그냥 장애다.
- **1단계 스테이징 게임데이** — 운영에 가까운 사전 프로덕션에서 수동으로 돌린다. Well-Architected는 운영 이전에 비운영 환경에서 먼저 재현하고, 중단 조건 임계가 실제로 발동하는지를 여기서 확인하라고 명시한다. 진입 조건은 전제조건 충족.
- **2단계 운영 소규모** — 근무 시간과 저피크 시간대, 소수 인스턴스나 합성 트래픽 대상, 수동 승인 아래 실행한다. 운영, 고객 지원 등 관련 팀에 실행 시점과 예상 영향을 미리 알리고 이상 신호를 알릴 경로를 준다. 진입 조건은 1단계 실험이 중단 조건까지 검증되어 재현 가능한 상태.
- **3단계 상시 자동화** — 가설을 통과한 실험을 CI/CD 파이프라인과 그 바깥에서 정기 실행해 회귀를 막는다. 진입 조건은 2단계 실험이 자동 롤백과 결과 기록까지 코드로 관리되는 상태.

## 흔한 실수

- 관측 없이 주입한다. 정상 상태 지표와 알람이 없으면 결과를 판정할 수 없고 실험이 사고가 된다.
- 폭발 반경과 중단 조건을 정하지 않는다. 사전에 정의하지 않은 실험은 되돌릴 계획이 없는 실험이다.
- 이미 아는 취약점을 확인만 한다. 깨질 줄 아는 대상에 실험하면 새 정보가 나오지 않는다.
- 일회성 게임데이로 끝낸다. 실험을 코드로 관리하지 않으면 재현도 회귀 방지도 안 된다.
- 결과가 액션 아이템으로 이어지지 않는다. 반증된 가설은 설계 개선과 재실험으로 닫아야 한다.

## 면접 체크포인트

- 부하 테스트와 카오스 테스팅의 목적 차이 — 정상 조건의 용량 판정과 비정상 조건의 회복 장치 검증
- 정상 상태 지표를 무엇으로 잡는가 — 출력 지표(에러율, 처리량, 지연 분위수)이고 CPU 같은 내부 지표가 아닌 이유
- 폭발 반경과 자동 중단 조건을 실험 전에 정의하는 이유와 되돌리기 계획의 위치
- 도입 전제조건이 없는 조직에서 무엇부터 하는가 — 지표와 알람, 롤백, 장애 대응 절차가 0단계인 이유
- 조직에서 카오스 테스팅을 optional로 두는 판단 근거 — 관측과 대응 체계를 갖추기 전에는 투자 대비 위험이 크다

## 출처

- [Principles of Chaos Engineering](https://principlesofchaos.org/)
- [AWS Well-Architected Framework 신뢰성 원칙, REL12-BP04 Test resiliency using chaos engineering](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_testing_resiliency_failure_injection_resiliency.html)
- [AWS 문서, What is AWS Fault Injection Service?](https://docs.aws.amazon.com/fis/latest/userguide/what-is.html)
- [Chaos Mesh 문서, Chaos Mesh Overview](https://chaos-mesh.org/docs/)
- [Netflix/chaosmonkey — GitHub](https://github.com/Netflix/chaosmonkey)
- [Shopify/toxiproxy v2.12.0 README — GitHub](https://github.com/Shopify/toxiproxy/tree/v2.12.0)

## 관련 문서

- [[Test-Pyramid-Blind-Spots|초록불이 못 잡는 것 (계층별 테스트의 사각지대)]]
- [[performance|성능 테스트 (유형별 종료 조건과 SLO 역산 판정)]]
- [[Load-Test-Automation|부하 테스트 자동화 (CI 파이프라인 판정)]]
- [[External-Service-Resilience|외부 연동 회복 패턴 (카오스 실험이 검증하는 대상)]]
- [[Retry-Backoff-Jitter|재시도, 백오프와 지터]]
- [[Failure-Evolution-Under-Load|부하 아래 장애 진화 (재시도 증폭과 열화 사다리)]]
- [[Graceful-Shutdown|Graceful Shutdown (인스턴스 종료 주입이 검증하는 경로)]]
- [[SRE|SRE (에러 버짓과 위험 탐지 지표)]]
- [[RCA-Postmortem|RCA와 포스트모템 (실험 후보의 출처)]]
- [[N-1-Capacity-Headroom|N-1 헤드룸 (노드 상실 실험의 용량 전제)]]
- [[DR-Strategy|DR 전략 (정기 DR 드릴과의 관계)]]
- [[Nodejs-Production-Readiness|Node.js 운영 준비 상태]]
