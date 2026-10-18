---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# AVEVA PI와 WFS의 시계열, 공간 추출

AVEVA PI는 PI Web API로 point/attribute 값과 metadata를 읽는다. Basic과 Kerberos를 구별하며 Kerberos의 agent 조건을 확인한다. static attribute는 최신 bulk 값용이며 temporal/streaming 범위로 확대하지 않는다.

## PI target와 상태

dynamic AF path/tag filter와 static name/WebID target을 나눈다. incremental은 WebID별 마지막 timestamp를 저장하고 경계 overlap을 제외하는 조건을 확인한다. 대량 파일은 disk partition으로 메모리 사용을 줄이고 WebID cache는 설정 변경과 TTL에 따라 갱신한다.

streaming channel은 heartbeat로 liveness를 확인하고 target 재탐색 주기를 설정한다. backlog 채우기를 켰는지에 따라 중단 구간 복구가 달라지므로 restart 성공만으로 모든 과거 데이터가 채워졌다고 간주하지 않는다.

공식 backlog 설정 화면에서 비동기 실행은 live data 재개를 앞당기는 대신 record 순서를 보장하지 않는다. 과거 조회 duration은 양수이며 최대 24시간이다. 이 설정을 사용하는 downstream은 도착 순서를 event 발생 순서로 간주하지 않는다. (2026-10-18 [공식 설정 화면](https://www.palantir.com/docs/resources/foundry/available-connectors/pi-streaming-backlog.png) 확인)

## WFS의 범위와 한계

WFS connector는 1.1.0, 기본 443과 무인증/GEOAxIS certificate 조건을 따른다. query parameter는 기본 uppercase이며 lowercase toggle과 header override를 구별한다.

기본 결과는 ID와 JSON properties다. schematized output은 추가 처리와 비표준 schema 호환 비용을 고려한다. batch 기본 1,000, 초당 요청 기본 10은 해당 connector 설정이지 모든 WFS server의 quota가 아니다.

일반 page-number pagination이 아니라 geographic batch를 사용하며 최소 약 10km x 10km 분할 경계가 있다. 한 지역의 feature가 batch를 초과하면 실패할 수 있다. 복잡한 geometry에는 작은 batch가 유리하지만 밀집 지역에는 더 큰 batch가 필요할 수 있다. GetFeature가 매번 0을 반환하면 종료 조건으로 처리하는 안내를 확인한다.

## 출처

- [Palantir, pi](https://www.palantir.com/docs/foundry/available-connectors/pi)
- [Palantir, wfs](https://www.palantir.com/docs/foundry/available-connectors/wfs)

## 관련 문서

- [[Palantir-Connector-Contracts]]
