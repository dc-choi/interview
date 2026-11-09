---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-11-09
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pilot 생성, 코드 브랜치와 검증 상태"]
---

# Pilot 생성, 코드 브랜치와 검증 상태

## 생성 계약

Pilot은 OSDK React 기반 standalone app 또는 Workshop의 sandbox custom widget set을 만든다. Ontology architect, frontend builder, seed generator와 조건부 designer/viewer의 책임이 다르다. Blueprint theme은 별도 design specification을 생성하지 않고 Custom components는 디자인 명세를 만들 수 있다.

Act는 변경을 바로 실행하지만 일부 도구/production analysis는 응답을 요구할 수 있다. Plan은 검토 뒤 Execute하며 protected branch에서는 Implement on a branch를 쓴다. Model family와 UI의 selector는 enrollment/version에 의존한다. 목록에서 skill을 고르는 것 자체가 task 실행은 아니다.

## 첨부 context

Prompt에 관련 context를 함께 주면 Pilot의 결과가 좋아진다. Context는 Pilot이 기존 자산을 재사용하고 설계 의도를 읽게 하는 입력이다. 다만 첨부했다고 의도한 구현이 나온다고 가정하지 말고 생성 결과를 다시 확인하는 편이 안전하다(운영 판단이며 공식 문서의 진술은 아니다).

| 첨부 | 쓰는 경우 | 확인할 점 |
| --- | --- | --- |
| Ontology entity(object type, action type, Function) | 기존 data model을 확장하거나 연동해 중복 entity 생성을 피한다 | Chat panel의 Add에서 종류를 고른 뒤 검색해 선택한다. Function은 제공될 때만 고를 수 있다. 첨부한 entity는 prompt 입력란 아래 tag로 표시되고 tag마다 edit 권한 표시가 붙는다. Welcome 화면에서는 Add context로 object type이나 action type을 열어 Select, Confirm selection으로 붙이며, action selector는 영향받는 object type으로 거를 수 있다 |
| 문서(PDF, Markdown, plain text, ZIP) | 요구사항, 명세, data dictionary, API reference, 내보낸 데이터 파일이나 기존 프로젝트 source | Add의 Files, chat panel로 끌어 놓기, clipboard 붙여 넣기로 올린다. 외부 프로젝트 이전은 [[Palantir-Pilot-Project-Import\|별도 import 절차]]를 따른다 |
| 이미지 | 기존 화면 screenshot, wireframe과 mockup, 색과 component style 같은 design system 참고 | Frontend 생성의 시각 요소에 반영된다 |
| Notepad 문서 | 기존 문서의 특정 절을 요구사항으로 삼을 때 | Add에 항목이 있을 때만 쓰고 문서를 어떻게 쓸지 prompt에 적는다. 없으면 지원 파일 형식으로 첨부한다 |
| Preview element 선택 | 특정 UI 요소만 고칠 때 | Repository의 preview 기능에 달려 있다. 없으면 요소를 글로 설명하거나 screenshot을 붙인다 |
| 음성 받아쓰기 | Prompt를 말로 입력할 때 | 전사 기능이 있을 때만 쓰며 microphone 권한이 필요하다. 녹음과 전사를 끝내고 전사문을 검토, 수정한 뒤 보낸다 |

Prompt 품질이 생성 결과의 품질을 좌우한다. 공식 문서가 권하는 작성 원칙은 네 가지다.

- **Data model을 구체적으로 적는다:** entity, 속성, 관계와 상태값을 쓴다. 예를 들어 project tracker라면 project의 이름, 설명, 상태(Active, Completed, On Hold)와 우선순위, 마감일이 있는 task 목록까지 적는다.
- **화면만이 아니라 사용자 workflow도 적는다:** 상태와 담당자로 task 거르기, 상태 열 사이 drag, 기한 초과 알림처럼 사용자가 할 수 있어야 하는 일을 쓴다.
- **첨부 내용을 prompt에서 가리킨다:** 첨부한 wireframe을 dashboard layout으로 쓰라는 식으로 무엇이 들었고 어떻게 쓸지 적는다.
- **점진적으로 반복한다:** 핵심 기능부터 만들고 후속 prompt로 기능을 더한다.

## 코드와 Ontology를 별도로 merge한다

Pilot code branch는 repository file을 버전 관리한다. Ontology deployment branch와 proposal은 별도다. Saved Pilot version은 release가 아니며 별표는 아직 version으로 저장되지 않은 상태다. Discard/rollback은 미저장 작업을 잃을 수 있고 protected branch의 rollback은 branch를 만드는 경로를 사용한다.

Proposal에는 source/destination branch와 실제 파일 diff를 확인한다. 자동 conflict 해결과 review comment 반영 뒤에도 결과와 checks를 다시 확인한다. Policy는 승인 필요, reject 시 merge 금지, 새 commit 시 승인 무효화를 정할 수 있다. 코드 merge만으로 Ontology 배포나 preview 데이터 원본이 바뀌지 않는다.

## 성공 표시는 각 범위만 증명한다

Deployability는 Ontology deployment dry run이다. Deployable이어도 Ontology type check/edit-permission 오류와 dependency/dev-server/CI 오류가 남을 수 있다. 해당 상태를 별도로 확인한다. Diagnostics는 최신 500줄이며 전체 log는 Code에서 확인한다.

Widget parameter/event를 바꾸면 Reload widget dev mode가 필요하다. Reset으로 입력란이 비어도 실행 widget이 이전 설정을 유지할 수 있다. Container를 채우는 widget은 Auto(max) 높이가 0일 수 있어 Flex/Absolute와 실제 View를 확인한다. Dev mode를 pause/stop하지 않으면 발행 버전을 골라도 개인 개발 override가 남는다.

Seed와 production branch에서 입력, 완료 전환, 필터, reload 후 지속성, 삭제를 확인하는 원문 tutorial은 검증 절차의 예다. 여기서는 실제 앱 생성, 코드 실행과 레코드 변경을 수행하지 않았다.

## 출처

- [Palantir pilot, pilot](https://www.palantir.com/docs/foundry/pilot)
- [Palantir pilot, branches-and-proposals](https://www.palantir.com/docs/foundry/pilot/branches-and-proposals)
- [Palantir pilot, build-a-widget](https://www.palantir.com/docs/foundry/pilot/build-a-widget)
- [Palantir pilot, build-an-application](https://www.palantir.com/docs/foundry/pilot/build-an-application)
- [Palantir pilot, deploy-a-widget](https://www.palantir.com/docs/foundry/pilot/deploy-a-widget)
- [Palantir pilot, deploy-an-application](https://www.palantir.com/docs/foundry/pilot/deploy-an-application)
- [Palantir pilot, getting-started](https://www.palantir.com/docs/foundry/pilot/getting-started)
- [Palantir pilot, models-and-modes](https://www.palantir.com/docs/foundry/pilot/models-and-modes)
- [Palantir pilot, ontology-tab](https://www.palantir.com/docs/foundry/pilot/ontology-tab)
- [Palantir pilot, overview](https://www.palantir.com/docs/foundry/pilot/overview)
- [Palantir pilot, provide-context](https://www.palantir.com/docs/foundry/pilot/provide-context)
- [Palantir pilot, troubleshooting](https://www.palantir.com/docs/foundry/pilot/troubleshooting)
- [Palantir pilot, tutorial-todo-application](https://www.palantir.com/docs/foundry/pilot/tutorial-todo-application)
- [Palantir pilot, work-with-data](https://www.palantir.com/docs/foundry/pilot/work-with-data)
- [Palantir pilot, workspace-overview](https://www.palantir.com/docs/foundry/pilot/workspace-overview)

## 관련 문서

- [[Palantir-Pilot]]
