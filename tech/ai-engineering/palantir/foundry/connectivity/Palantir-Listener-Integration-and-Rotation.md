---
tags: [palantir, listeners, integration, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Listener 연결과 endpoint 교체

외부 서비스의 이벤트 발행, Foundry ingress, Listener 활성화와 downstream 처리 상태를 따로 확인한다. Endpoint URL을 만들었다는 사실만으로 연결이 완성되지는 않는다.

## Subdomain과 무중단 교체

Listener는 하나의 subdomain에만 mount할 수 있지만 하나의 subdomain은 여러 Listener를 받을 수 있다. 문서상 enrollment당 최대 세 subdomain이며, 생성에는 ISO 승인, mount에는 관리자 승인이 필요하다. FedRAMP와 on-prem 환경은 self-service 제공 여부를 확인한다.

Custom ingress는 primary domain과 별도로 허용 범위를 정한다. Inherited ingress는 부모의 변경을 따르지만 생성 후 custom ingress로 바꿀 수 없다. 기존 Listener의 subdomain을 바꾸면 이전 경로가 즉시 중지되고 새 mount 승인 전까지 downtime이 생긴다. Subdomain 도입 전 Listener의 별도 migration 기능과 혼동하지 않는다.

Endpoint rotation은 새 endpoint와 만료 예정인 기존 endpoint를 함께 유지하고 발신자를 옮긴 뒤 이전 endpoint를 삭제하는 방식이다. 동시에 최대 두 endpoint, 만료일이 없는 active endpoint는 최대 하나다. 만료 전에는 기한을 늘릴 수 있지만 만료 후에는 날짜를 수정할 수 없다. Subdomain 변경과 달리 이 교체 절차는 무중단 이전을 지원한다.

## 서비스별 연결 조건

| 서비스 | 확인할 계약 |
| --- | --- |
| Google Pub/Sub | Push subscription의 인증용 service account, optional audience/shared secret을 Listener와 일치시킨다. Payload는 base64로 들어온다. Provider IP 변경에 맞춰 ingress를 유지한다. |
| Jira Cloud | 관리자 권한으로 event를 선택하고 Listener를 연결한다. 가이드는 signing secret 없이도 설정 가능하다고 하지만 서명 검증과 동등한 보장으로 보지 않는다. |
| Slack | 앱의 Signing Secret으로 검증하고 Listener를 먼저 활성화한 뒤 Request URL 검증을 수행한다. Event와 scope 변경 후 앱 설치를 갱신한다. |

Slack 문서의 이미지 alt text 일부는 Client Secret이라고 표현하지만 단계 본문은 Signing Secret을 요구한다. 서로 다른 secret을 혼동하지 않는다. 이 문서는 Palantir 측 연결 절차를 학습한 것이며 외부 서비스의 최신 UI와 정책은 실제 설정 시 다시 확인한다.

## Chatbot 연결에서 빠뜨리기 쉬운 것

Slack bot 예제는 Listener, 응답을 쓰는 Slack Source, AIP chatbot function, 이벤트 처리 function과 Automate를 연결한다. Source의 export와 code import를 허용하고 API name을 설정한다. Bot 메시지를 다시 처리하지 않도록 `bot_id`를 제외한다.

예제의 bot 필터는 재귀 응답을 막지만 중복 event 처리까지 막지는 않는다. Automate의 at-least-once와 외부 API 재시도를 고려하면 event 식별자 기반 중복 제어와 응답 결과 확인이 추가로 필요하다. 예제는 `chat.postMessage` 응답 성공 여부를 검사하지 않는다. 이는 코드에서 확인한 적용상의 한계다.

대화 기억은 자동으로 이어지지 않는다. Chatbot 출력의 session RID를 사용자/대화 단위로 보관하고 후속 입력에 전달하는 설계가 필요하다. 가이드는 Slack에서 XML citation 링크를 피하려고 citation을 끄지만 이를 모든 chatbot의 권장 설정으로 확대하지 않는다.

## Public API로 직접 push하기

외부 시스템을 수정할 수 있다면 Stream RID, branch와 인증 token을 사용해 push한다. 운영에는 client credentials 기반 application을 권장하고 personal token은 시험 용도로 구분한다. Application의 `api:use-streams-write` operation 허용과 Stream Editor 권한을 모두 설정한다.

Schema, throughput과 partition key를 생성 시 정한다. Key는 여러 partition에서 해당 ID의 순서를 위한 것이며 전체 stream의 단일 순서를 뜻하지 않는다. Developer Console에서 Application permissions를 선택한 경로와 Control Panel에서 grant를 별도 활성화하는 경로를 구분한다.

## 출처

- [Palantir, Listener subdomains](https://www.palantir.com/docs/foundry/data-connection/listeners-subdomains)
- [Palantir, Google Pub/Sub listener](https://www.palantir.com/docs/foundry/data-connection/listeners-google-pub-sub)
- [Palantir, Jira listener](https://www.palantir.com/docs/foundry/data-connection/listeners-jira)
- [Palantir, Slack listener](https://www.palantir.com/docs/foundry/data-connection/listeners-slack)
- [Palantir, AI-powered Slack bot](https://www.palantir.com/docs/foundry/data-connection/listeners-slack-bot)
- [Palantir, Push data into a stream](https://www.palantir.com/docs/foundry/data-connection/push-based-ingestion)

## 관련 문서

- [[Palantir-Listener-Processing-and-Security|수신 보안과 처리 보장]]
- [[Palantir-Data-Connectivity|데이터 연결]]

실제 메시지를 보내거나 외부 앱을 변경하지 않았다. 본문과 예제의 계약만 검토했다.
