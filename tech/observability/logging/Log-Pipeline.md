---
tags: [observability, logging, pipeline, backpressure, retention]
status: done
category: "관측가능성(Observability)"
aliases: ["Log Pipeline", "로그 파이프라인", "중앙 집중식 로깅"]
---

# 중앙 집중식 로그 파이프라인

중앙 집중식 로깅은 여러 애플리케이션과 인프라에서 생성된 로그를 공통 파이프라인으로 모아 검색, 분석, 보존하는 방식이다. 핵심은 저장소 하나를 만드는 것이 아니라 **로그가 밀리거나 목적지가 고장 나도 유실을 통제하고 다시 처리할 수 있는 흐름**을 만드는 것이다.

## 왜 필요한가

- 서버와 계정마다 접속하지 않고 하나의 시간축에서 장애를 조사한다.
- 공통 필드와 보존 정책을 적용해 서비스별 로그 편차를 줄인다.
- 운영 검색, 보안 감사, 장기 보관처럼 서로 다른 소비 목적을 분리한다.
- 수집량, 처리 지연, 실패 건수를 관측해 로그 시스템 자체의 장애를 발견한다.

중앙화만으로 요청 흐름이 자동 연결되지는 않는다. 애플리케이션이 `trace_id`, `span_id`, `request_id`를 남기고 전파해야 로그와 추적을 오갈 수 있다. 자세한 계측은 [[Correlation-ID]]와 [[OpenTelemetry]]를 따른다.

## 기본 구조

```text
Source -> Collector -> Transport or Buffer -> Processor -> Search Store
                                               |              |
                                               v              v
                                            DLQ/Archive    Query/Dashboard
```

| 단계 | 책임 | 대표적인 실패 |
|---|---|---|
| Source | 앱, 컨테이너, 로드 밸런서, DB가 이벤트 생성 | 로그 미활성화, 필드 누락, 시간 불일치 |
| Collector | 파일이나 표준 출력을 읽고 배치와 재시도 | 로컬 버퍼 고갈, 파일 회전 누락 |
| Transport/Buffer | 생산자와 처리 속도를 분리하고 재생 구간 제공 | backlog 증가, 보존 기간 만료 |
| Processor | 파싱, 정규화, 마스킹, 보강, 라우팅 | 스키마 오류, 변환 예외 |
| Search Store | 색인, 검색, 집계, 보존 계층 관리 | mapping 충돌, 429, 저장소 부족 |
| Query/Dashboard | 탐색, 시각화, 알림 | 고비용 쿼리, 잘못된 집계 |

Collector와 중앙 버퍼는 같은 것이 아니다. Fluent Bit의 로컬 파일시스템 버퍼는 짧은 네트워크 장애를 흡수하지만 노드가 사라지는 장애까지 보장하지 않는다. 공유 스트림이나 객체 저장소는 생산자와 소비자를 더 강하게 분리하고 재생 범위를 넓힌다.

## 전달 경로 선택

| 경로 | 지연 | 내구성과 재생 | 운영 비용 | 적합한 상황 |
|---|---|---|---|---|
| Direct | 가장 낮음 | 목적지와 로컬 버퍼에 의존 | 구성 단순 | 소량, 일부 유실 허용, 빠른 실험 |
| Stream buffer | 초 단위 | 보존 기간 안에서 재소비 가능 | 파티션, 처리량, lag 관리 | 실시간 검색, 지속적인 대량 로그 |
| Object storage | 분 단위 이상 | 원본 보관과 대량 재처리에 강함 | 파일 크기와 파티션 설계 필요 | 감사, 장기 보관, 비용 우선 |

선택 기준은 제품명이 아니라 다음 요구사항이다.

- 장애 감지까지 허용 가능한 최대 지연
- 목적지 중단 시 버텨야 하는 시간과 최대 backlog
- 재처리 가능한 원본의 위치와 보존 기간
- 중복, 순서 역전, 일부 유실을 허용할 수 있는지
- 일일 수집량, 평균 레코드 크기, peak 배율, 검색 보존 기간

실무에서는 최근 로그를 검색 저장소에 두고 전체 원본이나 저빈도 로그를 객체 저장소에 보관하는 혼합 구조가 흔하다. 모든 로그를 고성능 검색 계층에 영구 보관할 필요는 없다.

## 중복과 순서를 전제로 설계한다

재시도 가능한 전달 계층은 중복을 만들 수 있다. 예를 들어 Amazon Data Firehose는 일부 목적지에 at-least-once 전달을 사용하므로 타임아웃 뒤 재전송된 레코드가 중복될 수 있다.

- 가능하면 생산 시점에 안정적인 `event_id`를 만든다.
- 검색 저장소의 문서 ID나 처리 단계의 멱등성 키로 `event_id`를 사용한다.
- `event_time`과 `ingested_at`을 분리해 지연 도착을 식별한다.
- 전체 순서를 가정하지 말고 서비스, 스트림 키, trace처럼 필요한 범위만 순서를 보장한다.
- 재처리는 같은 입력을 여러 번 실행해도 결과가 깨지지 않도록 만든다.

로그의 원본과 검색용 문서는 역할이 다르다. 검색용 문서는 파싱과 보강으로 바뀔 수 있으므로, 규제나 완전 재구성이 중요하면 변경되지 않은 원본도 별도로 보존한다.

## 역압력과 실패 처리

목적지 처리량이 수집 속도보다 낮으면 backlog가 증가한다. 큐를 추가하는 것만으로 해결되지 않으며 결국 저장 공간이나 보존 기간에 닿는다.

1. Collector의 메모리와 파일시스템 버퍼 상한을 정한다.
2. Buffer의 age, bytes, records, 소비 lag를 감시한다.
3. Processor의 처리량, 재시도, 변환 실패를 분리해 측정한다.
4. OpenSearch의 bulk latency, 429, write rejection, shard skew를 감시한다.
5. 재시도 불가능한 레코드는 원인과 원본을 함께 DLQ에 남긴다.
6. DLQ를 고친 뒤 누가 어떤 범위로 재생할지 runbook을 만든다.

메모리 전용 버퍼는 빠르지만 프로세스 장애 때 유실될 수 있다. 파일시스템 버퍼는 내구성을 높이지만 디스크가 가득 차면 입력 중단이나 오래된 chunk 폐기가 발생할 수 있다. 버퍼 사용량과 drop 지표도 서비스 지표처럼 알람해야 한다.

## 스키마와 인덱스 설계

공통 필드는 검색 경험과 상관분석의 계약이다.

```text
@timestamp, observed_at, service.name, service.version,
deployment.environment, cloud.account.id, cloud.region,
severity_text, body, trace_id, span_id, request_id
```

- 원문 전체를 동적 mapping에 맡기지 말고 공통 schema와 index template을 둔다.
- 고카디널리티 식별자는 메트릭 label이 아니라 로그 field로 둔다.
- 사용자 입력과 stack trace처럼 큰 문자열은 검색할 필드와 원문 보관 필드를 구분한다.
- 날짜 또는 rollover 기준으로 인덱스를 나누고 보존 정책으로 hot, warm, delete를 자동화한다.
- parser나 schema 변경은 새 버전 인덱스에서 검증한 뒤 alias를 전환한다.

OpenSearch의 shard, rollover, storage tier는 [[OpenSearch-Index-Lifecycle]]을 참고한다.

## 보안과 거버넌스

- 민감정보는 가능한 한 생성 또는 처리 단계에서 마스킹한다. [[PII-Masking]]
- 수집, 처리, 검색, 대시보드 권한을 분리하고 서비스와 환경별 최소 권한을 적용한다.
- 전송 중과 저장 시 암호화하고 암호화 키와 백업 저장소의 수명주기를 관리한다.
- 로그 본문뿐 아니라 DLQ, 원본 archive, dashboard export에도 같은 통제를 적용한다.
- 보존 기간은 디버깅 편의가 아니라 법적 요구, 사고 조사 기간, 재처리 필요성, 비용으로 정한다.

## 운영 체크리스트

- [ ] 각 소스의 로그 생성과 전달 기능이 실제로 활성화됐는가
- [ ] peak 유입량에서 Collector와 Buffer가 drop 없이 버티는가
- [ ] 목적지를 중단했을 때 backlog가 쌓이고 복구 후 정상 배출되는가
- [ ] 중복 전달과 순서 역전에도 검색 결과가 깨지지 않는가
- [ ] parser 오류와 권한 오류가 DLQ와 알람으로 드러나는가
- [ ] DLQ와 원본 archive에서 선택 범위를 재생해 봤는가
- [ ] 검색 보존 기간과 원본 보존 기간이 각각 자동 적용되는가
- [ ] `trace_id`로 로그와 trace를 왕복할 수 있는가
- [ ] 파이프라인 자체의 lag, drop, retry, DLQ, 429 대시보드가 있는가
- [ ] 소스부터 검색 화면까지 end-to-end 지연 SLO를 측정하는가

## 관련 문서

- [[Centralized-Logging-with-OpenSearch|AWS Centralized Logging with OpenSearch]]
- [[Structured-Logging|Structured logging]]
- [[Correlation-ID|Correlation ID와 Trace ID]]
- [[OpenTelemetry|OpenTelemetry와 분산 추적]]
- [[Logs-vs-Metrics|로그, 메트릭, 추적의 역할]]
- [[Kinesis|Amazon Kinesis]]

## 출처

- [Fluent Bit buffering - Official Manual](https://docs.fluentbit.io/manual/administration/buffering-and-storage)
- [Fluent Bit backpressure - Official Manual](https://docs.fluentbit.io/manual/administration/backpressure)
- [Amazon Data Firehose delivery semantics - AWS Documentation](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html)
- [Amazon Data Firehose delivery failures - AWS Documentation](https://docs.aws.amazon.com/firehose/latest/dev/retry.html)
- [OpenSearch Ingestion pipeline features - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/osis-features-overview.html)
- [TS Backend Meetup 1 로그 적재 비용 개선기](https://woowa.tech/ts-backend-meetup-1)
