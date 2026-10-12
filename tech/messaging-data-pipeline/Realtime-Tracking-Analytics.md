---
tags: [data-pipeline, streaming, tracking, kafka, analytics]
status: done
verified_at: 2026-10-13
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Realtime Tracking Analytics", "실시간 추적 데이터 파이프라인"]
---

# 실시간 추적 데이터 파이프라인

위치 센서의 연속 측정값을 통계와 사용자 화면으로 전달하는 파이프라인은 수집, 처리, 저장과 소비를 구분한다. 센서 데이터가 도착했다는 사실, 통계가 계산됐다는 사실, 외부 사용자가 조회할 수 있다는 사실은 서로 다른 완료 지점이다.

## 측정값에서 조회 결과까지

| 단계 | 책임 | 설계할 때 확인할 질문 |
|---|---|---|
| 수집 | 현장 시스템의 측정값을 받아 처리 경로로 전달 | 센서 보정과 클라우드 수신 중 어디서 문제가 생겼는가? |
| 처리 | 규칙 기반 계산이나 모델 추론으로 파생 통계 생성 | 어떤 입력과 계산 결과를 다음 단계에 넘기는가? |
| 저장 | 원본, 파생 통계와 분석용 데이터를 조회 목적에 맞게 보관 | 원본 재조회, 최신 통계 조회와 과거 집계가 같은 접근 패턴인가? |
| 소비 | 분석가의 대시보드와 외부 파트너의 API 제공 | 데이터가 저장됐어도 화면이나 API에서 아직 보이지 않는가? |

이 구분은 단계마다 서비스를 하나씩 만들어야 한다는 뜻이 아니다. 책임과 완료 조건을 먼저 구분하고, 독립적인 확장이나 장애 격리가 필요할 때 배포 단위를 나눈다.

## 브로커로 처리 단계를 연결한다

Kafka 기반 구조에서는 수집기가 입력 토픽에 이벤트를 기록하고, 처리기가 소비한 뒤 다음 단계의 토픽에 결과를 기록할 수 있다. 원본 저장, 통계 계산과 결과 전달을 분리하면 서로 다른 언어의 처리기도 메시지 계약으로 연결할 수 있다.

Kafka 4.1 공식 문서 기준, 이벤트는 소비 직후 삭제되지 않으며 토픽별 보존 설정에 따라 다시 읽을 수 있다. 순서는 파티션 안에서 기록된 순서를 기준으로 한다. 여러 파티션에 분산된 센서 이벤트의 발생 시각 순서까지 자동으로 맞춰 주는 것으로 해석하지 않는다.

설계 시에는 입력 식별자, 측정 시각과 처리 단계의 완료 기준을 정한다. 늦게 온 측정값을 통계에 반영하는 방식은 [[Stream-and-Batch-Processing|스트림과 배치 처리]]의 event time과 정정 경로로 연결한다. 브로커의 재읽기 기능만으로 외부 저장소의 중복 쓰기가 해결되는 것은 아니므로 재처리의 멱등성도 확인한다.

## 저장과 소비의 접근 패턴

원본 좌표를 다시 조회하는 요청, 특정 대상의 최신 통계를 읽는 요청과 여러 기간을 묶는 분석 쿼리를 구분한다. 같은 데이터에서 출발해도 인덱스와 조회 방식이 달라질 수 있다. 저장소를 추가할지는 [[Polyglot-Persistence|여러 저장소의 정본과 동기화 비용]]을 먼저 따진다.

### 공개 구현 사례

AWS의 NFL Next Gen Stats 영상 공개 기준(2026-02-02), 현장 서버에서 보낸 추적 데이터는 Java 수신 서버와 Kafka를 거쳐 Java, Node.js, Python 처리기로 전달된다. 이는 공개된 구현 사례이며 특정 서비스의 현재 배포를 확인한 결과는 아니다.

- 원본 추적 데이터는 초기 MongoDB 저장에서 Cassandra 활용으로 확장했고 S3를 백업에 사용한다.
- 파생 통계의 실시간 저장에는 MongoDB를, QuickSight 분석에는 PostgreSQL을 사용한다.
- 외부 방송 파트너는 API를 통해 결과를 받아 그래픽에 활용하며, 분석가는 대시보드로 다른 조건의 통계를 탐색한다.

이 사례가 Cassandra의 모든 쿼리 지연이 일정하다거나 모든 파이프라인에 여러 DB가 필요하다는 근거는 아니다. 영상에 소개된 MSK, DocumentDB와 Keyspaces 같은 관련 서비스 설명도 실제 채택 사실과 구분한다.

## 운영에서는 속도와 데이터 품질을 함께 본다

엔지니어링의 처리 상태, QA의 측정값과 이벤트 품질 확인, 분석가의 결과 해석은 서로 다른 책임이다. 작은 팀에서는 한 사람이 맡더라도 점검 항목을 분리할 수 있다. 처리 지연이 짧다는 이유만으로 통계의 의미가 올바르다고 판정하지 않는다.

다음은 위 구조를 다른 서비스에 적용할 때의 점검안이다.

1. 센서 수신부터 파생 통계 저장, 대시보드와 API 조회까지 단계별 시각을 비교한다.
2. 입력 누락과 보정 문제, 계산 실패, 저장 지연과 조회 실패를 구분한다.
3. 재처리한 결과가 중복 생성되거나 기존 최신값을 과거 값으로 덮어쓰지 않는지 확인한다.
4. 외부 파트너가 내부 저장소에 직접 접속하지 않고 정한 API 계약과 접근 제어를 거치도록 설계한다.

API Gateway 같은 관리형 진입점의 도입만으로 인증과 접근 제어가 완성되는 것은 아니다. 실제 API 유형과 설정은 [[API-Gateway|API Gateway]]에서 따로 확인한다. 이 문서의 점검안은 운영 실험 결과나 지연 SLA를 뜻하지 않는다.

## 출처

- [Going Deep: AWS + NFL Next Gen Stats — AWS](https://aws.amazon.com/sports/nfl/going-deep/)
- [How AWS Captures Every Play — Amazon Web Services](https://www.youtube.com/watch?v=tG_GlFFoc-M)
- [The Storage Playbook — Amazon Web Services](https://www.youtube.com/watch?v=ntz36SUsUrE)
- [Game Day Ops — Amazon Web Services](https://www.youtube.com/watch?v=dreUomzuUhc)
- [Apache Kafka 4.1 Documentation, Introduction](https://kafka.apache.org/41/getting-started/introduction/)

## 관련 문서

- [[Stream-and-Batch-Processing|스트림과 배치 처리]]
- [[Polyglot-Persistence|여러 저장소의 정본과 동기화]]
- [[MQ-Kafka|Kafka]]
- [[Idempotent-Consumer|멱등 소비자]]
- [[API-Gateway|API Gateway]]
