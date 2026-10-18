---
tags: [palantir, foundry, api, workbench, workflow]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 Workbench Board API"]
---

# Workbench Board 객체 추가와 상태 이동

Board Object는 Workbench Board에 배치한 Foundry Object다. 객체를 board workflow에 연결하는 작업과 이미 있는 board item의 상태를 옮기는 작업을 구분한다. 같은 object RID라도 board 참여 상태가 다를 수 있다.

## 두 명령의 입력과 효과

| 명령 | PUT 경로 | stateId 계약 |
|---|---|---|
| 추가 | `/api/v2/workbench/boards/{boardRid}/objects/add` | 선택적, 생략하면 설정 순서의 첫 default state |
| 이동 | `/api/v2/workbench/boards/{boardRid}/objects/move` | 목적지 state가 필수 |

두 endpoint 모두 body에 objectRids 목록을 받으며 `api:workbench-write` scope와 Preview opt-in `preview=true`가 필요하다. boardRid는 필수 path parameter다. 성공 응답은 상세 item 목록이 아닌 EmptySuccessResponse다.

추가는 Foundry 객체를 board에 연결해 workflow에서 추적하게 한다. 이동은 기존 board item의 식별자와 edit history를 보존한다. 따라서 상태 이동을 객체 제거/재추가와 같은 효과로 대체하지 않는다.

추가에서 stateId를 생략할 수 있다는 것은 board에 default state가 없을 때도 성공한다는 뜻이 아니다. 그 경우 BoardHasNoDefaultState가 발생한다. 임의의 stateId를 사용하면 BoardStateNotFound가 된다.

## 객체 타입, 보안과 자원 상태를 나누어 검사한다

추가할 객체는 board가 요구하는 object type 또는 interface를 구현해야 한다. board에 interface type 자체가 설정되지 않았다면 BoardInterfaceTypeNotSet, 객체가 맞지 않으면 ObjectTypeNotSupported가 된다.

ObjectSecurityNotSatisfied는 객체가 board의 보안 조건을 충족하지 못한 상태다. Add/MoveBoardObjectsPermissionDenied의 실행 권한 거부와 구분한다. 단순히 write scope를 얻었다는 이유로 모든 객체를 어떤 board에나 넣을 수 있는 것은 아니다.

ObjectNotFound는 객체 부재 또는 접근 불가를 포함한다. BoardExceededItemLimit는 currentItems와 maxItems 문맥을 제공한다. 목록에 여러 객체를 넣을 수 있다는 사실만으로 오류 시 전체 batch의 원자성을 보장한다고 전제하지 않는다. 이 명세는 그 보장을 설명하지 않는다.

## 재시도 전에 현재 참여 상태를 본다

이미 board에 있는 객체를 add하면 ObjectAlreadyOnBoard conflict가 발생한다. 응답을 잃어 같은 add를 다시 전송할 때 이를 무조건 미실행으로 해석하지 않는다. 반면 move 대상이 board에 없으면 ObjectNotOnBoard다.

BoardOperationNotSupported는 해당 board에서 요청 작업을 할 수 없다는 입력/기능 제약이며 일시적인 서버 장애와 다르다. 공통 인증, throttling과 Preview 안정성은 [[Palantir-API-Client-Contract]]를 따른다.

공식 두 endpoint의 전체 schema를 대조했으며 실제 board 추가/이동, 보안 조건과 여러 객체 요청의 실패 효과는 시험하지 않았다.

## 출처

- [Palantir, Board Object basics](https://www.palantir.com/docs/foundry/api/v2/workbench-v2-resources/board-objects/board-object-basics)
- [Palantir, Add Board Objects](https://www.palantir.com/docs/foundry/api/v2/workbench-v2-resources/board-objects/add-board-objects)
- [Palantir, Move Board Objects](https://www.palantir.com/docs/foundry/api/v2/workbench-v2-resources/board-objects/move-board-objects)

## 관련 문서

- [[Palantir-Application-APIs]]
- [[Palantir-API-Client-Contract]]
- [[Palantir-Workshop-Applications]]
