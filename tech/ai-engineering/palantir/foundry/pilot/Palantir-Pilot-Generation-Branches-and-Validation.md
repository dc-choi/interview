---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pilot 생성, 코드 브랜치와 검증 상태"]
---

# Pilot 생성, 코드 브랜치와 검증 상태

## 생성 계약

Pilot은 OSDK React 기반 standalone app 또는 Workshop의 sandbox custom widget set을 만든다. Ontology architect, frontend builder, seed generator와 조건부 designer/viewer의 책임이 다르다. Blueprint theme은 별도 design specification을 생성하지 않고 Custom components는 디자인 명세를 만들 수 있다.

Act는 변경을 바로 실행하지만 일부 도구/production analysis는 응답을 요구할 수 있다. Plan은 검토 뒤 Execute하며 protected branch에서는 Implement on a branch를 쓴다. Model family와 UI의 selector는 enrollment/version에 의존한다. 목록에서 skill을 고르는 것 자체가 task 실행은 아니다.

Document/PDF/Markdown/text와 이미지, 기존 entity를 context로 전달할 수 있다. Preview element selection, Notepad 첨부와 transcription은 지원 여부를 확인하며 microphone 전사는 보내기 전 검토한다. 첨부 context가 정확한 구현 결과를 보장하지 않는다.

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
