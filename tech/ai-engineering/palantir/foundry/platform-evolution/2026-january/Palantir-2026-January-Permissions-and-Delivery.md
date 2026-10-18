---
tags: [palantir, release-history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 권한과 제품 배포의 초기 계약

2026년1월 릴리스 당시 변경의 설계 함의다. 현재 지원/배포 조건은 기능별 문서와 실제 환경에서 다시 확인한다.

## 변경 승인의 경계

1월 Object View branch 지원은 구조(tabs/visibility)와 Workshop 내용을 분리해 수정/preview/rebase할 수 있게 했다. 당시 approval은 미지원이라 자동 승인됐고 legacy tab은 branch에서 편집할 수 없었다. 이후의 승인 기능과 혼용하지 않는 역사적 제약이다.

Store의 새 product version 승인은 draft 작성자와 다른 store editor가 하도록 잠글 수 있으며 marketplace:finalize-block-set operation이 필요했다. Store Editor라는 이름만으로 해당 operation을 추정하지 않는다. Checkpoint scope 구성도 선택 단계에서 권한을 검사하며, Cipher checkpoint를 취소하면 값이 encrypted로 남도록 수정됐다.

Support type은 L1만 L2로 escalation하도록 적용 사용자를 제한할 수 있지만 reporter는 변경된 support type을 볼 수 있다. Control Panel의 user group과 viewer group,initial assignee를 별도 표시한 것도 적용 권한/열람/담당자의 구분을 돕는다. Analyst/AIP 열기 checkpoint는 rule을 구성해야 작동한다.

## Project와 space 권한

1월21일 이후 신규 Ontology의 기본 권한은 Compass project 기반으로 전환하는 안내였다. 기존 Ontology의 자동 migration을 뜻하지 않으며 opt-out 설정도 있었다. 당시 CBAC/default Ontology는 미지원 예외였다. 이를 현재 모든 배포에 같은 제약이 남았다는 주장으로 쓰지 않는다.

Custom space role은 workflow grant를 조합하지만 frozen이므로 default role에 새 workflow가 추가돼도 자동 상속하지 않는다. 새 capability 사용 전에 custom role에 필요한 operation을 별도로 검토한다.

Media reference property는 source별 inherited marking을 설정한다. 단순 UI 접근과 어떤 media marking을 상속할지의 계약을 분리한다. Action override copy/paste도 알려진 parameter ID만 자동 채우고 알 수 없는 ID는 수동 mapping 또는 criteria 폐기를 요구한다.

## Folder tracking과 설치 입력

DevOps folder tracking은 new version 시작/refresh 때 지정 folder의 자원을 발견해 packaging한다. Filesystem에 없는 function/health check 등은 별도 settings로 포함하고 ignored subfolder로 실험 출력을 제외한다. 수동 output과 병행할 수 있으며 migration preview로 자동/수동 잔류를 확인한다.

Disable folder tracking으로 manual 관리로 되돌릴 수 있다. Folder에 새 자원이 생겼다는 사실이 즉시 배포됐다는 뜻은 아니다. Slate Marketplace parameter는 install 시 조절 가능한 variable이며 global/shared variable은 당시 대상이 아니었다. Developer Console 문서 재분류도 기능 자체의 변경으로 간주하지 않는다.

## 출처

- [Palantir Foundry, Release notes 2026](https://www.palantir.com/docs/foundry/announcements/release-notes/2026/)

## 관련 문서

- [[Palantir-2026-January-Platform-Evolution]]
