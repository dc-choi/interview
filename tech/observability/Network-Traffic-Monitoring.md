---
tags: [observability, network, traffic, monitoring, dashboard]
status: done
category: "관측가능성(Observability)"
aliases: ["Network Traffic Monitoring", "네트워크 트래픽 모니터링"]
---

# 네트워크 트래픽 모니터링

게이트웨이(프록시, 라우터)를 지나는 트래픽을 도메인, IP, 노드 차원으로 집계해 시각화하는 모니터링이다. 요청 단위로 애플리케이션 내부를 보는 [[Application-Performance-Monitoring|APM]]과 달리 네트워크 흐름 단위로 어디에서 어디로 얼마나 흘렀는지를 본다. 홈랩과 사내 게이트웨이 트래픽 가시화와 외부로 나가는 연결 분석에 쓰고, 임계 기반 알림을 붙여야 이상 트래픽 탐지로 확장된다.

## 수집 채널 — 실시간과 폴링

게이트웨이가 노출하는 API에 따라 수집 채널이 갈린다.

- WebSocket 스트림을 노출하는 게이트웨이는 밀리초 지연의 실시간 수집이 가능하다.
- HTTP API만 노출하면 폴링으로 수집하며 초 단위 갱신 지연이 생긴다.
- 수집 채널은 게이트웨이 종류에 따라 고정되고, 실패하면 백오프 재연결로 버틴다. 자동 강등은 패널에서 브라우저로 밀어주는 실시간 채널 쪽에서 일어난다 — 실시간 경로가 막히면 초 단위 폴링으로 내려가되 핵심 대시보드 기능은 유지한다. 실시간성을 부가 기능으로 두고 채널 단절이 전체 기능 상실로 번지지 않게 하는 [[External-Service-Resilience|graceful degradation]] 설계다.

## 에이전트 push 토폴로지

중앙 대시보드가 각 게이트웨이에 직접 접속하는 대신, 게이트웨이 근처 장비(공유기, 리눅스 박스)에 에이전트를 두고 중앙 패널로 push하게 할 수 있다.

- NAT나 방화벽 뒤의 게이트웨이도 중앙에서 인바운드 개방 없이 수집할 수 있다. pull 모델이 방화벽 뒤 대상의 scrape 실패를 놓치는 문제([[Prometheus|Prometheus]]의 흔한 함정)를 push로 우회하는 구조다.
- 에이전트별 토큰 인증으로 수집원을 식별하고 서로 다른 게이트웨이 종류를 에이전트마다 붙일 수 있다.
- 웹 UI와 실시간 스트림 endpoint를 분리해 두고 reverse proxy에서 같은 도메인의 경로 라우팅(웹 경로와 WS 전용 경로)으로 묶는다. 내부 API 포트는 외부에 열지 않고 같은 오리진 경로로 처리하며 에이전트는 별도 포트가 아니라 패널의 HTTP 경로로 보고한다.

## 저장 구조 — 임베디드 기본, 열지향 이중 쓰기

- 기본은 임베디드 DB(SQLite)로 설정과 집계를 모두 담아 배포를 단순하게 유지한다.
- 트래픽이 커지면 장기 집계용 열지향 DB(ClickHouse)를 이중 쓰기(dual-write)로 추가한다. 한 수집기가 두 저장소를 모두 소유하는 단일 기록자 구조라, 별개 시스템 간 이중 쓰기 gap을 [[CDC-Debezium|CDC]]로 없애는 문제와는 층위가 다르다. 배치 버퍼가 두 저장소에 함께 flush하고, 열지향 쪽은 소량 쓰기를 모아 병합하는 완충 계층(buffer 테이블)을 앞에 둔다.
- 연속 쓰기 실패가 임계에 도달하면 열지향 저장소를 unhealthy로 표시하고 열지향 단독 기록 모드였더라도 임베디드 쓰기를 다시 켜 수집이 끊기지 않게 한다. 복구가 확인되면 healthy로 되돌린다. 대기 배치가 상한을 넘으면 열지향 쓰기 배치를 버리는 백프레셔도 함께 둔다.
- 읽기 소스는 스위치로 제어한다. 이관은 이중 쓰기 관찰과 읽기 전환까지를 기본으로 하고 이력 이관과 단독 전환은 선택 단계로 둔다. 이 순서의 일반형은 [[ClickHouse|ClickHouse]] 운영 패턴 절을 정본으로 한다.

## 분석 차원

| 차원 | 집계 내용 |
|---|---|
| 도메인 | 트래픽량, 연결 수, 연관 IP 목록 |
| IP | ASN, 지리 위치, 연관 도메인 |
| 프록시 노드 | 노드별 트래픽과 연결 분포 |
| 시간 | 30분, 1시간, 24시간 등 구간별 추세 (저장은 분 단위, 장기 보존은 시간 단위 집계 — [[Long-Term-Retention|다운샘플링]]) |

도메인과 IP처럼 무한 집합인 차원을 그대로 집계할 수 있는 것은 저장이 집계 테이블이기 때문이다. 라벨 기반 TSDB에서는 같은 차원이 시계열 폭발을 일으키므로 라벨로 넣지 않는다 ([[Cardinality|카디널리티 관리]]).

지리 정보는 온라인 API 조회와 로컬 MMDB(GeoLite2 등) 파일 중 선택한다. 로컬 파일은 외부 의존과 지연이 없지만 갱신을 직접 관리해야 한다.

## 트레이드오프

- 실시간 스트림은 지연이 낮지만 게이트웨이와 수집기 양쪽에 상시 연결 부하를 더한다. 대시보드 용도에는 초 단위 폴링으로 충분한 경우가 많다.
- 이중 쓰기는 저장소 간 정합성 관리 비용이 생긴다. 자동 폴백 후 열지향 쪽 누락 구간의 재적재 기준을 정해야 한다 (재처리와 DLQ 설계는 [[Log-Pipeline|로그 파이프라인]]).
- 임베디드 DB는 단일 노드 집계에는 충분하지만 보존 기간과 카디널리티가 커지면 집계 지연이 먼저 온다. 전환 시점은 쿼리 지연으로 판단한다.
- 도메인과 IP 차원의 수집은 사용자 활동 기록이고 IP와 행동 이력의 결합은 준식별자다. 보존 기간과 접근 통제를 정하고 시작한다 ([[PII-Masking|PII 마스킹]]).

## 운영 체크포인트

- [ ] 패널 실시간 채널 단절 시 대시보드가 폴링으로 강등되는지 확인했는가
- [ ] 에이전트 토큰의 발급, 회수 절차가 있는가
- [ ] 이중 쓰기 폴백 후 누락 구간 처리 기준이 있는가
- [ ] 대시보드만 보지 않도록 이상 트래픽 임계 알림을 연결했는가
- [ ] 트래픽 기록의 보존 기간과 접근 통제를 정했는가

## AWS 워크로드의 TCP 흐름 관측

앞 절의 게이트웨이 대시보드와 별개로, Amazon CloudWatch Network Flow Monitor는 워크로드에 설치한 에이전트가 실제 TCP 흐름의 성능 지표를 수집하는 방식이다. 다음 내용은 2026-10-14 AWS 공식 문서로 확인했다. 기존 게이트웨이 구현 설명까지 재검증한 것은 아니므로 문서 전체의 `verified_at`은 추가하지 않는다.

- 에이전트는 RTT, 재전송, 재전송 타임아웃과 전송 바이트를 집계한다. Workload insights에서 재전송, 타임아웃과 전송량의 상위 기여 흐름을 보고, 조사할 범위를 좁혀 monitor를 만든다.
- monitor의 지표는 `AWS/NetworkFlowMonitor` namespace에서 조회한다. `RoundTripTime`은 마이크로초 단위 평균이며, 항상 계산되는 지표가 아니므로 빈 구간을 지연 0으로 읽지 않는다.
- `HealthIndicator`는 선택한 기간과 monitor의 흐름에 관련된 AWS 네트워크 문제를 나타낸다. `100`은 Degraded, `0`은 Healthy다. 100을 건강 점수로 해석하면 의미가 반대가 된다.
- Healthy는 해당 범위에서 AWS 네트워크 문제가 감지되지 않았다는 뜻이다. 이를 애플리케이션 전체 정상의 증거로 확대하지 않고 요청 오류, 지연과 워크로드 자원을 함께 조사한다.

운영에서는 재전송 증가만으로 특정 가용 영역 전체의 장애를 확정하지 않는다. 영향받은 흐름과 시간 범위, NHI를 먼저 대조하고, 복구 조치 뒤 애플리케이션의 오류율과 지연도 확인한다. 지표 수집과 알람 구성은 별도이며, monitor를 만들었다는 사실만으로 장애 알림이 설정됐다고 보지 않는다.

## 관련 문서

- [[Application-Performance-Monitoring|APM]]
- [[Container-Monitoring|컨테이너 모니터링]]
- [[ClickHouse|ClickHouse]]
- [[Long-Term-Retention|메트릭 장기 보존]]
- [[Log-Pipeline|중앙 집중식 로그 파이프라인]]
- [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark (패킷 단위 분석)]]
- [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치 (아웃오브패스 센서)]]

## 출처

- [neko-master - 네트워크 트래픽 시각화 및 분석용 대시보드 — GeekNews](https://news.hada.io/topic?id=31816)
- [neko-master — GitHub](https://github.com/foru17/neko-master)
- [AWS CloudWatch, What is Network Flow Monitor?](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-NetworkFlowMonitor-What-is-NetworkFlowMonitor.html)
- [AWS CloudWatch, Evaluate network flows with workload insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-NetworkFlowMonitor-configure-evaluate-flows.html)
- [AWS CloudWatch, View Network Flow Monitor metrics in CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-NetworkFlowMonitor-cw-metrics.html)
