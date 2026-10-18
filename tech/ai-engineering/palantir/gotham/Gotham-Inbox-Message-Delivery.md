---
tags: [palantir, gotham, messaging, validation]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Gotham Inbox 메시지 전달 계약"]
---

# Gotham Inbox 메시지 전달 계약

Inbox의 일괄 메시지 요청은 입력 검증 실패와 전송 중 충돌을 다르게 처리한다. 2026-10-16 공개 계약 기준이며 실제 메시지를 보내거나 수신 권한을 시험한 기록은 아니다.

## 전체 거부와 부분 성공

메시지 하나의 검증이 실패하면 아무 메시지도 보내기 전에 전체 요청이 실패한다. 반면 기존 메시지와 충돌해 보내지 못한 경우에는 성공 목록과 실패 목록을 응답한다. 요청 성공 여부만 확인하면 누락된 메시지를 놓칠 수 있다.

성공 목록은 요청에서 보낸 순서를 유지하고 각 메시지의 `sourceId`를 돌려준다. 실패 항목도 식별자와 충돌 사유를 가진다. 다만 공개 입력 스키마에는 sourceId 지정 필드가 보이지 않는다. 출력의 중복 식별자 오류를 근거로 호출자가 임의의 멱등 키를 넣을 수 있다고 추정하지 않는다.

## 수신자와 콘텐츠 보호

호출자는 지정된 외부 알림 생산자 그룹에 포함돼야 한다. 수신 그룹은 이름과 realm으로 식별하며 realm을 생략하면 호출자의 realm을 사용한다. 다른 realm의 같은 이름 그룹을 대상으로 삼을 때는 이를 명시해야 한다.

발신자 표시명, 제목과 본문은 정적 텍스트이고 메시지 수준의 보안을 적용한다. 본문은 일반 텍스트, 공백 유지와 Markdown 렌더링 방식을 구분한다. 표시된 발신자 이름을 인증된 호출자 신원과 같은 것으로 해석하지 않는다.

이 endpoint는 preview이며 `preview=true`가 필요하다. 공개 입력 정의에서 `messages`와 수신 그룹 배열이 선택으로 표시돼 있어도 비어 있는 요청의 실질 동작까지 이 문서만으로 확정하지 않는다.

## 출처

- [Palantir, Send Inbox Messages](https://www.palantir.com/docs/gotham/api/inbox-resources/messages/inbox-send-messages)

## 관련 문서

- [[Gotham-API-Client-Contracts|오류, 인증과 preview]]
- [[Palantir-Security-and-Governance|표시 정보와 접근 통제의 구별]]
