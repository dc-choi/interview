---
tags: [palantir, gotham, geotime, observation, streaming]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Gotham 시공간 관측 데이터 계약"]
---

# Gotham 시공간 관측 데이터 계약

Observation은 특정 시각과 위치에서 확보한 하나의 관측이고, Track은 같은 대상에 대한 관측의 시계열이다. 한 Track에 관측이 하나만 있을 수도 있다. 아래는 2026-10-16 공개 문서에서 확인한 저장, 조회와 구독 계약이며 실제 API 검증은 아니다.

## 관측 식별과 스키마

Track은 `sourceSystemId`, `collectionId`, `observationSpecId`, `trackId`의 네 값으로 식별한다. `trackId` 문자열 하나를 원천과 스키마를 넘는 전역 식별자로 쓰지 않는다. Track RID에는 이 식별 범위가 담긴다.

Observation Spec은 시각, 위치, Track ID와 동적 속성의 모양을 정의한다. 적재 전에 관리 도구로 Spec을 정의해야 하며, 새 관측이 기존 Spec과 맞지 않으면 색인되지 않는다. 저장 성공과 검색 색인 반영을 같은 완료 조건으로 취급하지 않는다.

Static property는 Track 안에서 일정할 것으로 기대하는 값, live property는 자주 바뀔 것으로 기대하는 값이다. 이 분류 자체가 정적 값의 불변성을 강제한다는 보장은 없다. 위치와 시각, 동적 속성, 화면 스타일도 별개다. 표시 아이콘이나 색상은 대상의 정체나 사실의 확실성을 증명하지 않는다.

## Track 선택 기간과 반환 이력 기간

| 조건 | 적용 대상 |
|---|---|
| `query.time` | 가장 최근 관측 시각이 포함 범위 안에 있는 Track 선택 |
| `historyWindow` | 선택된 Track에서 반환할 관측 이력의 범위 |
| `observationSpecId` | 해당 Spec에 맞는 관측으로 제한 |

두 시간 조건은 독립적이다. 최근에 활동한 Track의 오래된 이력을 읽는 경우, Track 선택 범위만 넓히거나 좁혀서는 이력 범위를 제어할 수 없다. `query.time`과 생략한 `historyWindow`에는 각각 최근 7일 기본값을 설명한다. 다음 페이지는 `nextPageToken`으로 이어간다.

공개 문서 내부에는 불일치가 있다. 이력 endpoint의 본문은 두 시간 조건을 분명히 나누지만, `historyWindow` 필드 설명에는 Track 선택 설명을 반복하고 요청 예시는 이를 `query` 내부에 넣는다. 요청 스키마는 `historyWindow`를 `query`와 같은 최상위 수준에 둔다. 한 예시만 복사하지 않고 배포 환경의 명세와 응답으로 확인해야 한다.

위치 검색 polygon은 첫 점과 마지막 점이 같고, 최소 4개 점을 반시계 방향으로 나열한다. Gaia annotation의 닫히지 않은 polygon 입력과 같은 규칙으로 처리하지 않는다.

## 연결과 동일 개체 판정

Track과 Object 또는 두 Track 사이의 연결은 양방향이다. 연결해도 각 Track은 남고 새 통합 객체를 만들지 않는다. A와 B, B와 C가 연결돼도 A와 C의 관계를 자동 생성하지 않는다. 연결 해제도 해당 관계에만 적용한다.

이는 객체 resolution과 다르다. 경로나 시각이 비슷해서 연결한 두 Track을 같은 실세계 개체로 확정하거나, 관계의 추이성을 전제해 병합하지 않는다.

## 쓰기 결과와 문서의 충돌

Write Observations endpoint는 쓰지 못한 관측과 사유만 반환하며, 응답에 없는 관측은 backing store에 기록됐다고 설명한다. 반면 공통 오류 문서의 유효하지 않은 관측 오류는 아무 관측도 쓰지 않았다고 설명한다. 부분 실패 응답과 요청 전체 오류라는 서로 다른 경로일 가능성은 있지만, 공개 문서만으로 그 경계를 확정할 수 없다.

호출자는 실제 응답 형태와 오류를 구분하고 항목별 결과를 보존해야 한다. 전체 재전송의 멱등성이나 중복 제거 보장은 이 계약에 없으므로, 실패한 항목을 확인하지 않고 요청 전체를 반복하는 방식은 피한다. 성공 응답만으로 후속 검색이나 구독에 즉시 나타난다고 단정하지 않는다.

## 실시간 구독은 과거 복구와 구별한다

WebSocket은 Observation Spec별로 연결하고 Bearer token을 subprotocol로 전달한다. Beta 상태이므로 `preview=true`가 필요하며 변경되거나 제거될 수 있다. 연결 뒤 `subscribe` 요청이 성공하면 UUID를 돌려주고, 실패하면 ID 없이 오류 목록을 준다.

같은 연결에서 여러 구독을 만들 수 있다. 이후 `data`는 구독 ID와 새로 적재된 관측을 전달하고 `unsubscribe`는 해당 구독을 해제한다. 연결 성공과 구독 승인, 데이터 수신은 서로 다른 단계다.

이 문서는 재접속 후 재생, 전달 순서, 중복 없는 전달과 유실 복구를 보장하지 않는다. Sub-second 용도를 설명하지만 지연 SLA로 확대하지 않는다. Python 예시의 구독 JSON 문자열에는 닫는 중괄호가 하나 더 있어 그대로 실행 가능한 예제로 취급하지 않는다.

## 출처

- [Palantir, Observation basics](https://www.palantir.com/docs/gotham/api/geotime-resources/observations/observation-basics)
- [Palantir, Observation linking basics](https://www.palantir.com/docs/gotham/api/geotime-resources/observation-linking/observation-linking-basics)
- [Palantir, Search latest observations](https://www.palantir.com/docs/gotham/api/geotime-resources/observations/search-latest-observations)
- [Palantir, Search observation histories](https://www.palantir.com/docs/gotham/api/geotime-resources/observations/search-observation-histories)
- [Palantir, Write observations](https://www.palantir.com/docs/gotham/api/geotime-resources/observations/write-observations)
- [Palantir, Subscribe to incoming observations](https://www.palantir.com/docs/gotham/api/geotime-resources/observations/subscribe-to-incoming-observations)
- [Palantir, Gotham API Errors](https://www.palantir.com/docs/gotham/api/general/overview/errors)

## 관련 문서

- [[Gotham-API-Client-Contracts|페이지, 오류와 preview]]
- [[Gotham-RevDB-Identity-and-Mutations|객체 resolution과 원천 보존]]
- [[Gotham-Map-Structure-and-Geometry|지도 좌표와 polygon 규칙]]
- [[Palantir-Observation-and-Evidence-Modeling|관측과 증거 모델링]]
