---
tags: [palantir, permissions, security, data-connection]
status: done
verified_at: 2026-10-21
category: "AI엔지니어링(AIEngineering)"
---

# 연결 권한과 데이터 접근의 분리

Agent, Source와 sync는 Foundry 자원이며 Project 권한과 marking을 적용한다. 데이터 소비자에게는 수집 결과를 공유하고, 연결 자원은 신뢰할 파이프라인 개발자에게 제한하는 것이 기본 원칙이다. 아래는 기본 역할이며 custom role이 바꿀 수 있다.

## Agent와 Source

Agent Owner는 재다운로드와 token 재발급을 수행한다. Editor는 Source 배치, agent 설정과 재시작, 공유 및 삭제를 수행한다. Viewer는 설정과 상태를 본다. agent를 만들려면 그 Project의 Editor가 필요하지만(조직 역할 조건은 [[Palantir-Agent-Lifecycle|agent 생명주기]]), Project Owner가 아니면 agent 관리와 다운로드 링크 생성은 막힐 수 있다.

Source Editor는 Source 삭제와 이름 변경, sync 구성, SQL 실행, preview, 공유와 코드 import를 수행한다. Source에 배정한 agent를 바꾸려면 추가하는 모든 agent의 Edit가, Source 설정을 바꾸려면 배정된 agent의 Edit가 함께 필요하다. 원천 credential이 허용하면 sync로 파일 삭제와 DB 변경도 가능하므로 단순 조회 역할이 아니다. Source나 그 Project의 Edit는 Source가 쓰는 원천 계정의 전체 권한을 줘도 되는 사용자에게만 준다.

Source Owner는 Editor 권한을 물려받고, 추가 권한마다 필요한 조건이 다르다.

| 작업 | 필요한 조건 |
| --- | --- |
| export 켜기와 끄기 | Source Owner이면서 `Information Security Officer` enrollment 역할 |
| exportable marking 추가 | Source Owner이면서 각 marking의 Apply marking과 Remove marking 권한 모두 |
| exportable organization 추가 | Source Owner이면서 자기 조직이 아닌 각 조직의 Expand access(자기 조직은 필요 없음) |
| code resource로 import 허용 | Source Owner |

marking과 organization을 exportable로 더하는 데는 `Information Security Officer` 역할이 필요하지 않다. export 상태와 설정 권한은 [[Palantir-Export-State-and-Governance|export 상태와 거버넌스]]를 따른다.

## Source 생성과 Project 배치

나가는 트래픽은 대부분의 환경에서 network egress policy로 통제하라고 안내한다. 조직 단위의 역할 기반 Source 생성은 그 위에 더하는 선택적 통제이고 기본값은 비활성화다. 켜면 `Create Data Connection sources` workflow가 든 조직 역할이 있어야 Source를 만들 수 있으므로, 켜기 전에 Source를 만들 사용자나 group에 그 역할을 먼저 부여한다. 설정은 조직 전체에 적용되며 egress 정책이나 기존 Source의 Project 권한을 대체하지 않는다. 설정 변경에는 해당 조직의 `Manage source creation authorization method` workflow가 필요하고, `Organization administrator` 역할에 기본으로 들어 있다.

| 자원 | 권장 배치 | 고르는 조건 |
| --- | --- | --- |
| Agent | 조직마다 Project 하나에 모두 | 한 그룹이 모든 agent를 관리하고, 모든 Agent Manager와 Source Editor가 모든 agent에 접근해도 될 때 |
| Agent | agent마다 자체 Project | 여러 그룹이 agent를 관리하면서 그룹별 agent 접근을 따로 권한 관리할 때(agent 단위의 세밀한 권한이 가능해진다) |
| Source | Source마다 datasource 계층의 자체 Project, sync 출력 dataset도 같은 Project | 기본 권장 |
| Plugin과 JDBC driver | 조직마다 Project 하나에 모두 | 한 그룹이 모든 agent를 관리하고, 모든 Agent Manager가 모든 plugin과 driver에 똑같이 접근해야 할 때 |
| Plugin과 JDBC driver | 종류마다 자체 Project | 민감한 plugin이나 driver를 따로 권한 관리할 때. agent owner에게 각 Project에서 쓸 수 있는 권한을 준다 |

배치를 정할 때는 Project 권한이 자원 권한으로 이어지는 경로를 함께 본다. Agent가 든 Project의 Editor는 그 agent에서 실행되는 새 Source와 sync를 만들 수 있고, Source가 든 Project의 Editor는 sync를 만들고 고치며 webhook을 만들어 다른 곳에서 쓰게 구성할 수 있다. Source를 agent에 배치하려면 그 agent의 Editor가 필요하다. Plugin과 driver를 Project 하나로 모으는 공식 권장 절차는 agent별 폴더를 만들어 현재 plugin과 driver를 옮기고, 자산마다 정본 사본 하나를 Project 루트로 옮긴 뒤 각 agent가 루트 사본을 쓰게 바꾸고 agent별 폴더를 폐기하는 순서다.

Plugin과 driver의 Owner는 Editor 권한을 물려받는다. Editor는 삭제할 수 있지만 어느 agent에도 배정되지 않은 경우에만 삭제된다. Viewer는 보기와 다운로드를 하며, agent에 plugin을 추가하려면 그 agent의 Editor도 필요하다.

## Sync와 코드 저장소

| 작업 | 기본 권한 |
| --- | --- |
| Sync 보기 | Source와 output dataset 모두 View |
| Sync 편집/삭제 | Source와 output dataset 모두 Edit |
| Sync 실행 | Output dataset Edit |
| Source를 코드에 가져오기 | Source Editor |
| 이미 Source를 가져온 코드의 build 실행 | Code resource Editor, Source 권한은 별도로 필요하지 않음 |
| 코드에서 Source 제거 | Source 또는 code resource Editor |

코드 저장소 Editor는 가져온 Source의 연결 정보와 secret을 사용자 코드로 읽을 수 있다. Source 공유와 저장소 공유를 따로 검토하면 이 권한 전이를 놓칠 수 있고, UI에서 credential을 가리는 것만으로는 저장소 편집자의 접근을 막지 못한다(설계 해석).

## Marking과 webhook 이력

Source에 적용한 Organization과 security markings는 sync 결과 dataset으로 전파된다. 수집 뒤 dataset에만 marking을 붙이는 방식은 Source 자체 접근을 보호하지 못한다. Source는 민감도가 섞이기 쉬우므로 Source로 접근할 수 있는 데이터 전체에 해당하는 Organization과 marking을 Source에 적용하고, downstream transform에서 정제한 뒤 marking을 제거한다.

Webhook 권한은 연결된 Source에서 모두 상속한다. 설정 보기에는 Source View가, 생성과 수정, 삭제와 Action에서 쓰도록 구성하는 일에는 Source Edit가 필요하다. 실행에도 Source Edit가 필요하고 Action을 통한 실행만 예외다. Functions 저장소에서 webhook을 쓰는 권한은 external functions 권한 문서를 따로 본다. 기본적으로 실행한 사용자만 Data Connection의 history 탭에서 응답을 본다. `webhooks:read-privileged-data`를 역할에 추가하면 접근 가능한 모든 webhook의 전체 요청과 응답 이력을 볼 수 있다. 공식 권장 구성은 이 권한을 담은 새 역할(Webhook Privileged Data Viewer)을 만들어 전체 이력이 필요한 사용자에게 해당 Source에서 부여하는 것이다. token과 민감 응답의 저장 설정도 [[Palantir-Webhook-Execution-Contracts|Webhook 실행과 이력]]에 따라 함께 확인한다.

## 출처

- [Palantir, Data Connection permissions reference](https://www.palantir.com/docs/foundry/data-connection/permissions)

## 관련 문서

- [[Palantir-Source-Identity-and-Code|코드의 credential 접근]]
- [[Palantir-Webhook-Execution-Contracts|Webhook 실행과 이력]]
- [[Palantir-Data-Connectivity|데이터 연결]]
- [[Palantir-Export-State-and-Governance|export 상태와 거버넌스]]

2026-10-21 수집한 Data Connection permissions reference 본문 전체(기본 역할, Source 생성 설정, 권장 배치)와 대조했다. 실제 enrollment의 custom role, 권한 전이와 Control Panel 설정 변경은 시험하지 않았다.
