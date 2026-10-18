---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Streaming 색인과 Direct datasource

일반 Funnel streaming은 입력 arrival order를 보존하며 source timestamp로 자체 재정렬하지 않는다. Upstream에서 PK partition과 event-time window를 구성한다. Partial row patch를 지원하지 않아 전체 객체를 upstream에서 해결해야 한다. Stream source를 명시하지 않으면 archive를 batch로 색인해 중복 PK 오류를 낼 수 있다. Many-to-many link는 지원하지만 MDO, 일반 stream type의 edit/materialization은 미지원이다.

문서 제한은 record 1 MB, property 250개, 기본 throughput 2 MB/s/type이다. 기본 exactly-once checkpoint는 1초 주기이며 처리량/실제 종단 지연 보장은 아니다. At-least-once는 지연을 줄이는 대신 object-set automation이 중복 발동할 수 있다. 설정 변경은 job을 재시작한다. 일반 stream job을 사용자가 cancel할 수 없다는 제한과 프로토타입 비용을 고려한다.

Retention window는 삭제 시한 보장이 아니다. 범위 밖 객체는 best effort로 나중에 제거하고 기본 약 2주 replacement 때 window부터 replay한다. 다른 stream으로 변경할 때는 새 stream historical replay 완료 후 source를 바꾸고 replacement fully indexed 후 원래 stream을 종료한다. FAQ의 transient retry는 약 5분, terminal validation은 새 data/policy 후 재시도다.

## Direct datasource beta

현재 writer는 Pipeline Builder뿐이다. 처리량을 일부 양보해 low-latency write와 streaming edit를 제공한다. Source timestamp property를 설정하면 그 이후 direct write에서 기존 값보다 이른 timestamp의 write를 drop한다. 이미 들어간 역순 데이터를 고치려면 replay가 필요하다.

Replay는 기존 객체 view 전체를 즉시 지운다. 배경 완성 후 swap하는 일반 replacement와 다르며 새 view가 비거나 불완전할 수 있다. 첫 배포/replay의 Funnel setup timeout이 retry limit에 걸리면 failed job을 rebuild하고 replay를 반복하지 않는다. Data/schema/latest edit liveness, Flink metrics와 invalid-write 로그를 함께 본다. Data liveness가 최신이어도 일부 invalid row가 drop될 수 있다.

일반 streaming 문서에는 stream metric 미지원 문장과 Stream bubble에서 metric 조회하는 절차가 함께 있다. 동일 범위의 완전한 지원 표로 합치지 않고 enrollment/경로별 확인 대상으로 둔다. Workshop 외 live-refresh 제한도 최신 OSDK subscription 지원과 별도 범위로 읽는다.

## 출처

- [Palantir, direct-datasources](https://www.palantir.com/docs/foundry/object-indexing/direct-datasources)
- [Palantir, faq](https://www.palantir.com/docs/foundry/object-indexing/faq)
- [Palantir, funnel-streaming-pipelines](https://www.palantir.com/docs/foundry/object-indexing/funnel-streaming-pipelines)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
