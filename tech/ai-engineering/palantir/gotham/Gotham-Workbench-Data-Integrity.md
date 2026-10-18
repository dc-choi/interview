---
tags: [palantir, gotham, api, concurrency, provenance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Gotham Workbench API 무결성과 변경 계약"]
---

# Gotham Workbench API 무결성과 변경 계약

Workbench API에서 재사용할 핵심은 객체, 컬렉션, 증거 참조와 수정 버전의 경계를 유지하는 것이다. 아래는 2026-10-16 공개 v1/v2 데이터 계약에서 확인한 식별, 보안, 출처와 동시 수정 조건이다. 실제 API나 운영 동작을 시험한 기록은 아니다.

## 버전 이름과 경로를 따로 읽는다

| 구분 | 문서와 계약 차이 |
|---|---|
| v1 | `/api/gotham/v1/twb/...`, 일부 operation/type 이름 끝에 `V2`가 붙음 |
| v2 | `/api/v2/targetWorkbench/...`, read/write OAuth scope를 명시 |
| 생성 응답 | v1은 RID 중심 응답, v2는 생성 객체 응답 |
| 수정 응답 | 여러 endpoint가 빈 성공 응답을 사용 |

타입 이름의 `V2`는 URL API 버전과 같지 않다. 문서 URL의 버전 구간을 바꾸는 것만으로 런타임 경로, 응답과 권한 계약이 이행됐다고 보지 않는다. 각 endpoint의 preview 표시도 개별 확인해야 한다.

Board, item과 관련 목록의 RID는 다른 자원이다. 일부 board 응답은 branch와 item을 결합한 식별자를 사용하므로 item RID 하나로 덮어쓰지 않는다. 표시 이름, 사용자 정의 식별자와 backing object reference도 각각의 의미를 유지한다.

## Scope, 자원 권한과 저장 공간

v2 OAuth 앱은 조회에 `api:target-read`, 수정에 `api:target-write` scope를 요청한다. Scope만으로 해당 자원의 읽기, 쓰기나 소유 권한이 생기지는 않는다. Archive 의미를 가진 delete operation에는 소유 권한 조건이 별도로 있다.

보안 모델은 portion marking과 Foundry `spaceRid`를 포함한다. Board 생성의 space 기본값은 사용자의 공간이 하나일 때 그 공간을 사용하는 조건부 기본값이다. 여러 공간에서도 같은 선택이 자동 적용된다고 가정하지 않는다. 잘못된 marking, 공간과 자원 권한 오류는 서로 구분한다.

공개 v2 delete operation의 설명은 archive다. HTTP DELETE라는 이유만으로 물리 삭제, 복구 가능 여부나 보관 기간을 확정하지 않는다.

## 수정은 부분 patch인지 먼저 확인한다

Board와 관련 목록의 일부 modify 계약은 현재 상태를 설정하며, 전달하지 않은 기존 필드를 제거한다고 명시한다. 일반적인 선택 필드 patch처럼 생략을 보존으로 해석하면 데이터가 사라질 수 있다.

예외도 있다. 이미 설정한 연결 필드는 지우거나 다른 값으로 바꿀 수 없다는 계약이 있고, OpenAPI가 지원하지 않는 board 필드는 유지한다고 설명한다. 설명에 쓰인 `hptl`과 요청 필드 `highPriorityTargetList`의 이름도 같지 않다. 모든 자원의 생략 의미를 하나의 공통 update 규칙으로 만들지 않는다.

증거 메타데이터 수정은 description, confidence, source 등 지정 필드의 생략을 삭제로 설명한다. v2는 location도 이 규칙을 명시한다. 필요한 값을 다시 읽고 보존할 필드를 포함한 뒤 수정 결과를 확인해야 한다.

## Revision과 retry 식별자는 목적이 다르다

조회는 `baseRevisionId`를 반환하고 수정은 자신이 읽은 버전을 함께 보낸다. 동시 변경 이후의 연산 변환과 충돌을 설명하며, 오래된 버전은 v1의 `RevisionTooOld`, v2의 `RevisionOutdated` 등 개별 계약을 따른다. 오래된 요청에 최신 버전 숫자만 붙여 반복하면 다른 사용자의 변경 의도를 놓칠 수 있다.

`clientId`는 같은 클라이언트의 재시도 충돌을 구분하고 해당 클라이언트에 같은 연산을 다시 방송하지 않기 위한 값이다. 세션마다 임의 식별자를 고르며 여러 세션에서 같은 값을 유지할 필요는 없다고 설명한다. 모든 쓰기 요청에 적용되는 영구 멱등 키라는 보장은 아니다.

Revision의 타입은 자원에 따라 정수이거나 문자열이며, 일부 문자열 스키마의 예시는 숫자를 쓴다. 이 불일치를 임의의 숫자 변환으로 숨기지 않는다. 요청 예시에 필수 revision이 빠지거나 schema에 없는 필드가 들어간 경우도 있어 예시만으로 클라이언트를 생성하지 않는다.

## 위치, 증거와 AI 출처를 분리한다

수동 위치, Track reference와 backing object reference는 서로 다른 위치 원천이다. 연결된 추적 객체가 backing object와 일치해야 하는 검증 조건도 있다. 위치 스키마의 경위도, 수평 오차, HAE/MSL/AGL 높이와 선형 오차를 각각 보존한다. 서로 다른 높이 기준을 같은 elevation 숫자로 합치지 않는다.

일부 v1 예시는 높이를 숫자로, 상세 스키마는 높이와 오차를 담는 객체로 표현한다. 다른 예시의 원형 영역도 좌표 객체 스키마와 다르다. 데이터 형식의 불일치를 기록하고 실제 환경 명세로 확인한다.

증거는 관측, 객체, 문서, 미디어, 메시지 또는 자유 텍스트 같은 서로 다른 출처를 참조한다. 이름과 설명, `validTime`, 위치, confidence와 원천 식별자를 분리한다. Confidence의 범위나 확률 해석은 명시되지 않으므로 예시 숫자를 확률로 정규화하지 않는다.

자동화 출처에는 알고리즘명, AI 사용 유형, 모델, prompt, debug log, 설정 객체와 agent version 같은 메타데이터를 담을 수 있다. 이런 필드가 존재한다는 사실은 모델의 실제 실행, 추론의 진실성이나 결과의 검증을 증명하지 않는다. Prompt와 debug log도 원천 데이터와 별도로 접근 통제하고, 자유 텍스트 출처를 검증된 사실과 구별해야 한다.

## 출처

- [Palantir, Create a Target](https://www.palantir.com/docs/gotham/api/target-workbench/target/create-target)
- [Palantir, Modify a Target](https://www.palantir.com/docs/gotham/api/target-workbench/target/modify-target)
- [Palantir, Load Target](https://www.palantir.com/docs/gotham/api/target-workbench-v2-resources/targets/load-target)
- [Palantir, Modify Target](https://www.palantir.com/docs/gotham/api/target-workbench-v2-resources/targets/modify-target)
- [Palantir, Create Target Board](https://www.palantir.com/docs/gotham/api/target-workbench-v2-resources/target-boards/create-target-board)
- [Palantir, Modify Target Board](https://www.palantir.com/docs/gotham/api/target-workbench-v2-resources/target-boards/modify-target-board)
- [Palantir, Delete Target Board](https://www.palantir.com/docs/gotham/api/target-workbench-v2-resources/target-boards/delete-target-board)
- [Palantir, Modify High Priority Target List](https://www.palantir.com/docs/gotham/api/target-workbench-v2-resources/high-priority-target-lists/modify-high-priority-target-list)
- [Palantir, Modify Target Intel Target](https://www.palantir.com/docs/gotham/api/target-workbench-v2-resources/targets/modify-target-intel-target)

## 관련 문서

- [[Gotham-API-Client-Contracts|공통 API와 버전 계약]]
- [[Gotham-RevDB-Identity-and-Mutations|원천별 변경과 식별]]
- [[Gotham-Geotime-Observation-Contracts|시공간 관측과 Track]]
- [[Palantir-Observation-and-Evidence-Modeling|관측, 해석과 증거]]
