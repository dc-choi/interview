---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop comment와 audit copy의 보존 계약"]
---

# Workshop comment와 audit copy의 보존 계약

Comments는 parent object에 붙고 별도 Ontology object가 아니어서 Object Explorer search 대상이 아니다. Parent read 권한을 가진 사용자는 comment를 보고 작성할 수 있으며 자기 comment를 삭제할 수 있다고 설명한다. Property-column 권한과 comment thread 권한을 혼동하지 않는다. 민감 thread는 별도 보호된 proxy object로 분리하는 pattern을 검토한다.

## 검색과 기록 복제

After-comment Action으로 Action Log에 text를 넣으면 append-only 기록이 되어 수정/삭제할 수 없다. Dedicated comment object로 mirror하면 search/workflow가 가능하지만 comment service가 정본이며 mirror object 수정/삭제가 widget comment에 전파되지 않는다. 단순 mirror를 immutable history라고 부르지 않는다.

Parent의 mutable sensitivity field로 row permission이 바뀌어도 이미 append한 log의 예전 sensitivity는 자동 바뀌지 않는다. Mirror를 쓰면 parent sensitivity 변경 Action이 comment object도 같이 갱신하는 등 권한 일관성을 별도 설계한다. 원문 immutable audit 주장과 retention/권한 전파 범위를 나누어 검토한다.

Notification은 comment 작성자 자동 구독, mention 대상 구독/알림 등 side effect가 있다. Default는 Object View link이며 custom은 Action notification side effect다. 알림만을 유일한 task 배정 근거로 삼지 않는다. 자동 Action 기록은 comment service에 임의 comment를 만드는 것과 다르며 Action Log feed로 표현한다.

Comment attachment는200MB 한도이고 큰 file은 media set/reference를 검토한다. Auto-refresh는 미전송 text를 clear할 수 있어 입력 중 refresh pause를 검토한다.

## Edit History

Track user edit history를 enable한 뒤 user property edits만 기록하며 이전 edits와 pipeline edits는 포함하지 않는다. Immutable trail이라는 source 표현을 모든 역사/변경 원천의 완전성으로 확대하지 않는다. Multi-object input은 first object만 표시한다. Action Log Timeline은 명시된 action-log object types를 보여 주는 view다. 실제 comment/알림 발송은 하지 않았다.

## 출처

- [Palantir Workshop, widgets-action-log-timeline](https://www.palantir.com/docs/foundry/workshop/widgets-action-log-timeline)
- [Palantir Workshop, widgets-comments](https://www.palantir.com/docs/foundry/workshop/widgets-comments)
- [Palantir Workshop, widgets-edits-history](https://www.palantir.com/docs/foundry/workshop/widgets-edits-history)

## 관련 문서

- [[Palantir-Workshop]]
