---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 접근 통제, Checkpoint와 보안 검사의 변화

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## 권한과 요청 화면의 구분

- 2월 rule-based group membership은 authentication provider별 rule을 login 때 평가하는 경로로 소개됐다. 기존 asynchronous user manager와 지원 조건을 구분한다.
- 2월 Project Owner의 excluded group은 해당 Project의 access request form에서 요청을 숨기는 정책이다. 다른 Project에서 같은 group에 가입하면 그 group이 가진 모든 Project 접근을 얻을 수 있다. 권한 회수나 group 존재 은닉을 보장하지 않는다.
- 3월 Project template는 기존/새 marking, allowed/prohibited marking constraints와 viewer/editor/owner group 관리 권한을 묶었다. constraint를 위반한 파일 저장을 막는 정책과 Project role은 별도다.
- 5월 custom Org/enrollment role은 세부 workflow 권한을 분리했다. 7월 guest membership view에는 Org settings Viewer, 관리에는 Org Admin이 필요했다.
- 7월 member discovery 기본 활성화는 끌 수 있지만 admin/app 기능의 membership 사용을 모두 없애지 않았다.
- 10월 service user의 primary Org 및 guest 동작은 Org marking 자동 부여와 별개로 바뀌었다. service user의 실제 역할/Project permission은 계속 필요했다.

## Checkpoint 수집과 해석

- 1월 function-backed export, 2월 Submit Action와 2FA reset, 3월 Walkthrough 시작, 6월 API usage metrics export, 7월 Create Issue 신규 UI 등 checkpoint type이 확대됐다.
- 2월 Hubble Export sunset 예고 후 3월 Object Set Export가 GA로 대체하며 동등 configuration을 자동 migration했다.
- 3월 disabled configuration은 사용자에게 checkpoint를 보여주지 않는다. infinite scroll은 처음 20개를 넘는 record 탐색을 개선했다.
- 4월 최근 free-text 응답 선택은 기본 5개, 설정 최대 10개였다. Approvals task metadata/link와 configuration duplication도 추가됐다.
- 8월 selected group condition은 group 자체뿐 아니라 소속 member까지 조건 매칭에 포함할지 설정하도록 확장됐다. 새 조건에서는 member 포함이 기본 활성화된다. 모든 member가 동시에 조건을 충족해야 한다는 의미가 아니다.
- 9월 Package Product는 Package Static Dataset으로 이름/정책이 바뀌고 built-in acknowledgement 대체 경로가 있었다.
- 12월 complex multi-filter와 URL 공유는 time filter를 제외하는 제약이 있었으며 SDK retrieval은 당시 향후 기능이었다. Checkpoint는 특정 interaction의 설명/승인을 수집하는 수단이며 모든 API 접근을 자동 차단하는 보편 보안 계층이 아니다.

## 자동 검사와 coverage

3월 Sensitive Data Scanner는 column별 issue를 dataset 한 건으로 합칠 수 있게 했다. 7월 unprocessed/skipped 상태와 daily/weekly/monthly schedule을 드러내고 기존 recurring을 continuous로 명칭 정리했다.

9월 media scan GA는 이미지/문서 OCR과 audio transcription 뒤 regex를 적용했다. 기존 resource type은 opt-in이며 비용 때문에 one-time/periodic을 continuous보다 고려하도록 했다. marking 제안이나 탐지가 개인정보 전체 식별/제거를 보장하지 않는다.

9월 Code Scanning GA는 admin enable 후 commit마다 findings로 checks를 실패시키는 기본값과 warning/report 설정을 제공했다. scanner 결과와 실제 배포 gate 정책을 함께 확인한다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [December 9, 2025, Review checkpoint records with new filtering capabilities — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#aa2613d0-8bcb-4eb7-9021-26fffb04542f)
- [March 11, 2025, Project templates now support Markings and Project constraints — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#5ea022f5-c14e-468c-a3a5-a5fd5a37ae92)
- [September 2, 2025, Scan sensitive images, documents, and audio files using Sensitive Data Scanner's media set scanning feature — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#6d273953-4bb5-45a0-ba71-f45c4d932d5f)
- [July 22, 2025, Sensitive Data Scanner now supports scheduled scans — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#54b14ff1-b6c6-454f-ac65-b75b553e0be5)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
