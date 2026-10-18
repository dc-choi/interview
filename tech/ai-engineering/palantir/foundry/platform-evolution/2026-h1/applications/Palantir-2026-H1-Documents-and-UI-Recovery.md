---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 문서와 Slate의 저장, 복구와 화면 상태

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## Notepad와 Flow Capture

4월 Notepad의 Solution Designer diagram은 원본 diagram 변경을 자동 반영했다. Gotham file inline mention은 Foundry/Gotham을 모두 쓰는 enrollment가 필요했다. 3월 AIP 함수 메뉴의 최근 3개는 선택 내용과 저장 input format으로 실행하고 output은 기본 input 형식이지만 삽입 때 바꿀 수 있었다.

Flow Capture는 video upload 후 screenshot grid/timestamp/delete 검토 단계를 제공했고 image resize가 Notepad/PDF export에 유지됐다. recording 중 새 tab 링크는 현재 tab 계속 또는 recording context 밖 새 tab을 고르게 했다. unsaved-change dialog는 편집 손실을 막는 수단이며 recording/문서 내용의 정확성을 검증하지 않는다.

문서 restructuring은 Observability category, Global Branch 핵심 개념, Ontology design과 source driver required/recommended properties를 정리했다. permanent redirect 공지와 실제 특정 URL의 현재 도달성은 별개다.

## Slate와 Carbon의 복구 의미

- 2월 Slate Health dialog는 OSDK loading 오류와 config 진입점을 계속 표시했다. 5월 Save as 뒤 SDK 보존과 실패 시 regenerate/refresh 안내, 6월 generation version tag가 추가됐다.
- 3월 Raw JSON editor는 valid/changed일 때 Update를 허용했다. 4월 saved view는 widget type이 바뀌면 이전 state를 덮어쓰지 않는다.
- 5월 container 이동/페이지 전환의 무한 spinner와 version popover 위치, Source Datasets의 Synced/Syncing/Out-of-date/Aborted/Failed/timestamp가 개선됐다.
- 6월 resource delete Undo는 widget뿐 아니라 folder/sync/Function/object context/variable/query/partial/event-action/tab을 지원하고 살아 있는 widget에서 삭제 widget으로 연결된 wiring도 복구했다. toast는 한 번에 하나며 새 삭제가 대체하고 문서 편집이 dismiss한다.
- .slate.json import는 loading 중 input disable, 실패 toast와 열린 dialog에서 retry를 제공했다. 다른 page 이동/Toast 삭제 시 stale toast를 정리했다.
- 3월 Carbon workspace 삭제는 permanent delete 대신 trash로 바뀌어 Compass에서 복구할 수 있게 됐다. archived What's New는 숨기고 4월 Workshop tab 간 filter 변수를 전달했다.

저장 성공, auto-staged version, Undo 가능 범위와 실제 데이터 mutation은 별개의 복구 계층이다. 화면 상태 복원을 외부 시스템 write의 취소로 일반화하지 않는다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [June 18, 2026, Use automation events instead of object executions in Autopilot — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#ea8edda8911ad763b63aadf3a954e03e62d2cca1d06bb94698cb291453f293d5)
- [June 17, 2026, Expanded undo support for all resource deletions in Slate — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#32cc0164b4d00a23f20fdd96ad8fe087dc12d0afd00fd3b1245b83598df64693)
- [June 17, 2026,  Correctly select folders in Slate's tree view — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#adf4706a041d03edc42c1d6e7ed67ae1ffe80f67befbf7c3e2c2f21e706a93a6)
- [June 9, 2026, New Ontology design documentation — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#11c5d2a89948686e532774ace11b2e5985f685a2f88fbd5f3f1c02b84f1d939a)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
