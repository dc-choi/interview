---
tags: [palantir, automate, identity, service-user, history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Automate 실행 identity와 history scope"]
---

# Automate 실행 identity와 history scope

Automation resource의 열람/편집, condition/effect 실행과 history 공개는 다른 권한이다. Project scope로 바꿔도 service identity가 자동 생기는 것은 아니다.

## Owner가 조건과 편집의 권한을 제공한다

Condition과 Action/Logic/Function effect는 owner 권한으로 실행하고 function token/edit history/audit도 owner에 귀속한다. Owner의 submission criteria와 원천 읽기/쓰기 권한이 필요하며 계정을 disable/delete하면 실행이 멈출 수 있다. Notification은 recipient별 권한을 사용하는 별도 경로다.

Edit/save 때 owner를 유지할 수도 있지만 condition/effect 수정에는 ownership takeover가 필요하다. 다음 실행 identity가 바뀌므로 편집권만 보고 저장하지 않는다. Manual run은 initiator로 기록하고 input ObjectSet을 initiator token으로 평가한다. 일반 owner 효과 계약과 manual trigger bypass를 구분해 실제 실행 attribution을 확인한다.

## Project scope는 dependency와 이력 공개의 계약이다

Project scope는 transitive resource를 모두 import하고 run의 marking을 만족한 사용자에게 effect 포함 history를 공유한다. Dependency의 function version 또는 security policy가 바뀌면 automation을 업데이트해 reference를 재import/scope 재생성해야 한다.

확인일 미지원은 deployed/stateful Python, chatbot-as-function, Platform SDK를 쓰는 Python/TSv2, notification, cross-org다. Restricted View는 owner와 history viewer가 모든 row를 읽어야 하며 object security policy도 수정 뒤 재import한다. TSv1 dependency 계산은 best-effort로 누락될 수 있어 current scope를 점검한다.

User scope는 기본 owner만 history를 본다. Shared trigger history는 조건의 marked data를 볼 수 있는 다른 사용자에게 실행 사실만 공유하고 effect status/success/failure/message/log는 owner에게 남긴다. Trigger가 보인다는 것과 실행 내용을 볼 수 있다는 것을 나눈다.

## Service-user ownership은 별도 설정이다

Confidential OAuth client+client-credentials grant로 service user를 만들고 app을 Unrestricted로 구성한다. TPA administrator/Manage OAuth clients가 필요하며 secret은 최초 한 번만 보인다. Service user는 automation 또는 생성 folder Editor와 모든 Action/data 권한을 갖춰야 한다.

새 automation 저장 또는 Manage ownership에서 client ID/secret을 제공해 이전하며 이후 편집 저장에도 credentials가 필요하다. Secret rotation은 기존 owned automation을 깨뜨리지 않는다고 명시한다. 원래 SCIM client 재생성과 같은 무효화 계약으로 일반화하지 않는다.

같은 client를 여러 automation에 쓸 수 있어 최소 권한과 영향 범위를 함께 정한다. 개인에게 되돌릴 때 service user의 필요 권한을 개인이 갖췄는지 확인한다. 이전 이력은 남지만 열람은 scope/marking을 따른다.

## History는 상태 기록과 결과 기록을 나눈다

Triggered/Recovered는 threshold의 False→True/True→False 경계다. Condition edit, subscribe/unsubscribe, pause/mute와 evaluation failure를 별도로 기록한다. Evaluation failed에는 condition 성공 뒤 effect 오류도 포함될 수 있다. Unsubscribed 기간의 user history는 기록/표시되지 않는다.

History는 6개월 보존 후 영구삭제한다. 장기 보존이 필요하면 정상 Action과 failure fallback으로 별도 object를 쓰고 그 object의 정책/marking을 설계한다. History export를 영구 보존이나 모든 실패의 완전 기록 보장으로 해석하지 않는다.

## 구번역 문서의 역할을 구분한다

아래 concept-* 중국어판은 영어 원본을 AIP로 번역했고 정확성 미검증 경고가 있다. Activity 6개월, 사용자별 알림과 recipient permission 설명은 현재 영어 전용 문서로 대조했다. 구판의 save 때 항상 owner 교체는 현재의 선택적 유지/condition-effect 수정 시 takeover 조건과 차이가 있다. 구판을 영어 최신 availability/동작의 보장으로 쓰지 않는다.

## 출처

- [Palantir, Permissions](https://www.palantir.com/docs/foundry/automate/permissions)
- [Palantir, Security](https://www.palantir.com/docs/foundry/automate/security)
- [Palantir, History visibility and scope](https://www.palantir.com/docs/foundry/automate/history-visibility-and-scope)
- [Palantir, Third-party application ownership](https://www.palantir.com/docs/foundry/automate/third-party-app-ownership)
- [Palantir, Automation history](https://www.palantir.com/docs/foundry/automate/history)
- [Palantir, Activity (중국어 기계번역판)](https://palantir.com/docs/zh/foundry/automate/concept-activity/)
- [Palantir, Notification settings (중국어 기계번역판)](https://palantir.com/docs/zh/foundry/automate/concept-notification-settings/)
- [Palantir, Security and permissions (중국어 기계번역판)](https://palantir.com/docs/zh/foundry/automate/concept-security-permissions/)

## 관련 문서

- [[Palantir-Automate-Effects-and-Recovery|실패와 수신자 권한]]
- [[Palantir-SSO-Identity-and-Certificate-Rotation|사용자 계정의 identity]]
- [[Palantir-AIP-Observability|Trace의 독립 권한]]
