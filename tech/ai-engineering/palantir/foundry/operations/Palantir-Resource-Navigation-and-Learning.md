---
tags: [palantir, foundry]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 자원 탐색과 학습 자료 연결

## 자원과 Project

Resource는 dataset, repository, analysis와 app 같은 플랫폼 산출물이며 내부 파일을 포함할 수도 있다. RID는 앱 간 공통 식별자다. Project는 자원을 묶어 권한과 협업, usage와 health metadata를 관리하고 내부 folder로 구조화한다. 새 산출물은 개인 project에 기본 생성될 수 있으므로 공유 운영 위치를 확인한다.

## 탐색 동선

Sidebar는 Home, Search, Notifications, Recent, Files, Applications와 즐겨찾기, Assist/Support/Account를 연결한다. Cmd/Ctrl+O는 sidebar, Cmd/Ctrl+J는 Quicksearch, Cmd/Ctrl+U는 Assist를 연다. UI와 권한에 따라 Control Panel/Carbon workspace 가시성은 달라진다.

Quicksearch의 jump-to는 빠른 이동을, full results는 필터와 metadata를 통한 발견을 지원한다. Favorite은 앱뿐 아니라 resource와 object에도 둘 수 있다. Recent는 최근 20개 자원을 보여 준다. 즐겨찾기나 검색에서 보인다는 사실을 편집 권한으로 간주하지 않는다.

Notifications의 platform/email 전달 설정은 전역과 유형별로 조절한다. 실제 email 전달은 allowlist와 suppression 등의 별도 조건을 따른다. AIP Assist가 현재 앱 문맥을 감지한다는 설명은 작업 중인 모든 데이터에 접근한다는 뜻이 아니다.

## 학습 자원의 노출

Examples는 reference workflow, tutorial과 starter kit를 제공한다. Bring your own data 표시가 있는 사례는 실제 자기 데이터 설치 흐름을 지원하고 Walkthrough는 제작 단계를 학습하는 데 쓴다.

Training은 Palantir Learning 과정을 연결한다. 조직의 Notepad 문서를 노출하려면 Training application이라는 tag category를 만들고 그 아래 tag를 문서에 붙인다. 사용자에게 접근 가능한 문서만 표시되므로 태그가 접근 권한을 대신 주지는 않는다.

## 출처

- [Palantir Foundry, orientation-and-nav](https://www.palantir.com/docs/foundry/getting-started/orientation-and-nav/)
- [Palantir Foundry, projects-and-resources](https://www.palantir.com/docs/foundry/getting-started/projects-and-resources/)
- [Palantir Foundry, quicksearch](https://www.palantir.com/docs/foundry/getting-started/quicksearch/)
- [Palantir Foundry, start-with-examples](https://www.palantir.com/docs/foundry/getting-started/start-with-examples/)
- [Palantir Foundry, training-application](https://www.palantir.com/docs/foundry/getting-started/training-application/)

## 관련 문서

- [[Palantir-Foundry-Operations]]
