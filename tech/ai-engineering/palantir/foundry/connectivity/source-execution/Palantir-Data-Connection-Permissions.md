---
tags: [palantir, permissions, security, data-connection]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 연결 권한과 데이터 접근의 분리

Agent, Source와 sync는 Foundry 자원이며 Project 권한과 marking을 적용한다. 데이터 소비자에게는 수집 결과를 공유하고, 연결 자원은 신뢰할 파이프라인 개발자에게 제한하는 것이 기본 원칙이다. 아래는 기본 역할이며 custom role이 바꿀 수 있다.

## Agent와 Source

Agent Owner는 재다운로드와 token 재발급을 수행한다. Editor는 Source 배치, agent 설정과 재시작, 공유 및 삭제를 수행한다. Viewer는 설정과 상태를 본다. Project Editor는 agent를 만들 수 있지만 Project Owner가 아니면 agent 관리와 다운로드 링크 생성은 막힐 수 있다.

Source Editor는 sync 구성, SQL 실행, preview, 공유와 코드 import를 수행한다. 원천 credential이 허용하면 파일 삭제와 DB 변경도 가능하므로 단순 조회 역할이 아니다. Source Owner는 code import와 export 설정을 허용하며, export marking 설정에는 해당 marking 제거 권한이 추가로 필요하다.

조직 단위 Source 생성 역할은 선택적이며 기본값은 비활성화다. 이를 켜도 egress 정책이나 기존 Project 권한을 대체하지 않는다. Agent와 driver를 한 Project에 모으는 방식은 같은 관리자가 모두 접근해도 될 때만 적합하다. 독립적인 관리 경계가 필요하면 Project를 분리한다.

## Sync와 코드 저장소

| 작업 | 기본 권한 |
| --- | --- |
| Sync 보기 | Source와 output dataset 모두 View |
| Sync 편집/삭제 | Source와 output dataset 모두 Edit |
| Sync 실행 | Output dataset Edit |
| Source를 코드에 가져오기 | Source Editor |
| 이미 Source를 가져온 코드의 build 실행 | Code resource Editor, Source 권한은 별도로 필요하지 않음 |
| 코드에서 Source 제거 | Source 또는 code resource Editor |

코드 저장소 Editor는 가져온 Source의 연결 정보와 secret을 사용자 코드로 읽을 수 있다. Source 공유와 저장소 공유를 따로 검토하면 이 권한 전이를 놓칠 수 있다. UI에서 credential을 가리는 것만으로 저장소 편집자의 접근을 막지는 못한다.

## Marking과 webhook 이력

Source에 적용한 Organization과 security markings는 sync 결과 dataset으로 전파된다. 수집 뒤 dataset에만 marking을 붙이는 방식은 Source 자체 접근을 보호하지 못한다. 민감도가 섞인 Source는 접근 가능한 데이터 전체에 필요한 marking을 적용하고, 검증된 downstream transform에서 제거한다.

Webhook 권한은 Source에서 상속한다. 설정과 직접 실행에는 Editor가 필요하지만 Action을 통한 실행은 예외다. 기본적으로 실행자만 전체 입력과 응답을 본다. `webhooks:read-privileged-data`를 역할에 추가하면 접근 가능한 webhook의 전체 이력을 볼 수 있으므로 token과 민감 응답의 저장 설정도 함께 확인한다.

## 출처

- [Palantir, Data Connection permissions reference](https://www.palantir.com/docs/foundry/data-connection/permissions)

## 관련 문서

- [[Palantir-Source-Identity-and-Code|코드의 credential 접근]]
- [[Palantir-Webhook-Execution-Contracts|Webhook 실행과 이력]]
- [[Palantir-Data-Connectivity|데이터 연결]]

공식 기본 역할을 확인했다. 실제 enrollment의 custom role과 권한 전이는 시험하지 않았다.
