---
tags: [palantir, action, webhook, notification, upload, branch]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir Action 외부 효과"]
---

# Action 외부 효과의 실행 순서와 권한 위임

Ontology 편집의 원자성과 webhook, notification, build trigger, media upload의 성공은 서로 다른 계약이다. 업무 정본이 외부에 있으면 무엇을 먼저 실행하고 어느 실패를 사용자에게 보여줄지 선택한다.

## Webhook 두 종류의 실패 경계

| 구분 | Writeback | Side effect |
|---|---|---|
| 실행 순서 | 다른 rule 평가 전 | 객체 편집 후 |
| 실패 | 사용자에게 표시, Ontology 편집 없음 | 이미 성공 메시지가 보였을 수 있음 |
| 개수 | 하나 | 여러 개 |
| 출력값 | 후속 rule에 사용 가능 | 앞선 편집의 입력으로 사용하지 않음 |

Writeback 성공 뒤 Ontology 편집이 실패할 수 있으므로 분산 원자성은 아니다. 여러 side effect의 순서와 list payload 각각의 실행 순서는 보장하지 않는다. 여러 외부 시스템 쓰기나 best-effort 알림에 사용할 때 중복, 부분 성공과 재처리 기준을 별도로 정한다.

Webhook은 Data Connection에서 먼저 구성한다. 필수 입력을 같은 타입 parameter, static 또는 object property로 mapping하거나 반환 타입 구조가 정확히 맞는 함수로 생성한다. 함수가 payload 목록을 반환하면 side-effect webhook을 여러 번 호출할 수 있다. Writeback response는 후속 객체 rule, notification과 side-effect webhook에 쓸 수 있다.

Outbound application으로 인증하는 REST source의 OAuth token 획득/갱신은 Foundry가 관리한다. 호출자 권한, external application의 승인과 외부 계정의 권한이 적절한지는 별도로 확인한다.

## Notification은 변경 전 상태로 내용을 만든다

Notification 전송은 객체 편집 뒤지만 본문은 현재 Action 편집 전 Ontology 상태로 생성한다. 이전 값은 object property에서, 새 값은 parameter에서 가져오는 등 의도적으로 구분한다. 최신 상태를 보게 하려면 객체 링크를 함께 제공한다. Create rule이 만든 객체 링크는 primary key를 사용하며 함수가 만든 신규 객체 링크의 동일 지원을 가정하지 않는다.

수신자는 static user/group, parameter의 user/group ID, object property 또는 함수 결과로 정한다. 이메일 문자열로 직접 보내거나 CC를 지정하는 기능은 없다. Group은 개별 사용자로 풀어 데이터 접근을 검사한다. 실행자에게 수신 user/group 조회 권한도 필요하다.

수신자의 설정에 따라 platform/email/both로 전달되며 꺼 둔 사용자는 전송 알림을 받지 않을 수 있다. Content 함수는 수신자마다 다른 본문, 외부 URL과 관계 탐색 등 복잡한 구성을 지원한다. Template email은 별도 HTML body를 설정할 수 있다.

| 제한 | 확인일 기준 |
|---|---|
| Template 수신자 | 최대 500명 |
| Content 함수 사용 수신자 | 최대 50명, 초과 시 Action 실패 |
| Subject | 250문자 |
| Body | 1,000문자 |
| Custom HTML email body | 51,200문자 |

동적 본문은 렌더링 뒤 한도를 넘으면 말줄임으로 잘린다. Strict/Group redaction을 켜면 custom email 본문 대신 일반 안내와 Foundry 열기 링크가 간다. 조직이 허용한 경우 Action별 redaction 해제가 가능하므로 중앙 설정만 확인하지 않는다.

수신자 데이터 접근은 기본 Require all users에서 한 명이라도 부족하면 편집/전송 모두 거부한다. Require any user는 적어도 한 명이 읽을 수 있을 때 편집하고 권한 있는 수신자에게만 보낸다. 일반 permission 문서의 일부 설명보다 전용 notification 설정의 이 선택을 확인한다. 편집 후 전송 실패는 별도로 남을 수 있으므로 객체 성공과 실제 알림 수신을 구분한다.

## Build trigger는 완료를 기다리지 않는다

Schedule rule은 project-scoped schedule만 참조하고 parameterized schedule의 모든 값을 넘긴다. Build 시작 뒤 schedule run RID를 받아 곧바로 나머지 rule과 Ontology 편집을 수행한다. Build 완료/성공까지 기다리는 계약이 아니다.

참조를 처음 추가하거나 rule을 수정할 때 schedule 실행 권한을 검사한다. 이후 실행자는 Action submission criteria를 통과하면 schedule 자체 권한 없이 trigger할 수 있다. 따라서 이 연결은 실행 권한을 Action 관리자에게 위임한다. Run RID를 객체 String property에 기록하고 resource RID formatting으로 Running/Ignored/Failed/Succeeded를 표시하면 후속 상태를 연결할 수 있다.

## Branch는 외부 시스템을 자동 복제하지 않는다

Action이 수정하는 모든 object type을 branch에 색인해야 편집을 시험할 수 있다. 색인하지 않으면 valid Action이어도 편집 없이 read-only 안내가 나온다. Function의 branch awareness와 관계없이 branch Action의 객체 쓰기는 branch에만 남으며 main merge에 편집을 가져가지 않는다.

기본적으로 branch의 webhook/notification은 실행하지 않고 external call을 하는 function-backed Action은 전체 실패한다. 각각 명시적으로 허용할 수 있지만 허용하면 main과 같은 external endpoint를 호출하므로 production에 영향을 줄 수 있다. Notification은 branch owner로 돌리거나 원 수신자를 유지하도록 선택한다.

Test run도 외부 호출 전체를 막지 않는다. Ontology 편집, 후행 webhook/notification/build는 생략하지만 결과 계산에 필요한 writeback webhook, 함수와 payload/수신자/본문 생성 함수의 external call은 확인 후 실행될 수 있다. Form layout에서 저장된 설정과 현재 사용자/branch로 시험하며 table layout이나 unsaved 상태는 지원하지 않는다.

## Attachment와 media set은 보존 경로가 다르다

Attachment는 form에 추가할 때 즉시 업로드하며 성공 제출 뒤 객체 권한으로 접근한다. 취소/실패, 객체 삭제와 속성 삭제로 연결을 잃은 파일은 직접 도달할 수 없고 이후 자동 영구 삭제된다. 파일 한도는 200MB, lifetime 동안 연결할 수 있는 객체는 최대 10개다. 기존 객체를 삭제해도 사용한 연결 수가 되돌아가지 않으며 다시 업로드하면 새 attachment가 된다. 단일 backing column은 String, 다중은 Array이며 property와 parameter는 Attachment 타입을 사용한다.

Media reference 업로드는 성공한 Action 뒤 media set에 영속화되고 포맷 변환도 그 뒤 수행된다. 대부분 use case에는 transformation/preview와 전문 포맷을 제공하는 media reference가 권장된다. 최초 object/action 연결 때 media set Edit 권한을 검사하고 이후 업로드는 Action submission criteria로 허용하므로 사용자가 media set 직접 권한이 없어도 가능하다. 참조 추가가 권한 위임이라는 점과 파일 읽기 권한은 함께 검토한다.

## 출처

- [Palantir, Side effects](https://www.palantir.com/docs/foundry/action-types/side-effects-overview)
- [Palantir, Webhooks](https://www.palantir.com/docs/foundry/action-types/webhooks)
- [Palantir, Set up a webhook](https://www.palantir.com/docs/foundry/action-types/set-up-webhook)
- [Palantir, Notifications](https://www.palantir.com/docs/foundry/action-types/notifications)
- [Palantir, Set up a notification](https://www.palantir.com/docs/foundry/action-types/set-up-notification)
- [Palantir, Trigger schedule build](https://www.palantir.com/docs/foundry/action-types/trigger-schedule-build)
- [Palantir, Branching action types](https://www.palantir.com/docs/foundry/action-types/branching-action-types)
- [Palantir, Test run](https://www.palantir.com/docs/foundry/action-types/test-run)
- [Palantir, Upload attachments](https://www.palantir.com/docs/foundry/action-types/upload-attachments)
- [Palantir, Upload media](https://www.palantir.com/docs/foundry/action-types/upload-media)
- [Palantir, October 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-10)

## 관련 문서

- [[Palantir-Actions-and-Functions|트랜잭션과 실행 권한]]
- [[Palantir-Action-Observability-and-Recovery|실패 관측과 복구]]
- [[Palantir-Security-and-Governance|데이터 접근과 후속 이용]]
- [[Palantir-Data-Pipeline-Operations|Build와 데이터 반영]]
