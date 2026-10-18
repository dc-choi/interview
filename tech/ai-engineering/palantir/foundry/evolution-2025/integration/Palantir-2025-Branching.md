---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 Foundry Branching과 부작용 격리의 발전

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## 지원 범위의 단계적 확대

- 1월 30일 Foundry Branching 베타는 Pipeline Builder/Ontology/Workshop을 한 branch에서 변경하고 branch Action을 Main과 격리했다. 초기 활성화는 Palantir 문의와 제한 사용자 시험을 권했다.
- 당시 Code Repositories dataset branching은 Experimental, TypeScript Function은 개발 중이었다. Main user edit를 branch로 가져올 수 없었고 Workshop 안의 Quiver 등 비지원 요소는 Main 정보를 표시했다.
- 4월/5월 공지는 기본 비활성화 베타와 사용자 opt-in을 설명했다. 4월 Python transforms repo가 추가됐고, 9월 TypeScript 1 Function branch 베타가 뒤따랐다.
- 7월 Main user edit의 branch indexing이 선택 기능으로 추가됐다. 초기 미지원 문장을 2025년 전체 계약으로 일반화하지 않는다.
- 9월 TypeScript 1 branch Function은 prerelease로 Action/Workshop에서 사용하고 Main merge 뒤 stable release와 usage를 연결했다. 다른 repo 지원을 일괄 보장하지 않았다.
- 12월 non-branch-aware Workshop 요소에는 경고가 추가됐다. 경고가 있다고 해당 요소의 데이터를 branch로 격리하는 것은 아니다.

## Merge, build와 되돌리기의 의미

- 1월 Pipeline Builder branch를 다른 branch 버전으로 reset하는 동작은 되돌릴 수 없다고 명시됐다.
- 3월 enrollment 기본 Main 보호는 **새 pipeline만** 대상이다. 기존 pipeline과 다른 branch는 별도 설정한다.
- 4월 merge의 All affected와 Modified only build 선택에서 후자는 downstream을 수동 build해야 할 수 있다.
- 8월 Build nothing과 Merge first then build가 추가됐다. merge 성공을 모든 downstream 데이터 갱신 완료로 취급하지 않는다.
- 7월 Workshop branch protection은 reviewer 자격/수/기여자 승인 정책을 Project에서 설정했다. 10월 Ontology branch protection은 새 Project 기반 permission 모델로 옮긴 resource 범위를 확인해야 했다.
- 11월 Ontology rebase without proposal은 Main과 branch 상태, conflict를 확인하게 했지만 복잡한 schema migration와 datasource 교체는 미지원이었다.
- Branch에서 resource Remove는 branch 변경을 버리고 Main 상태로 돌아가는 의미로 소개됐다. resource 자체 삭제와 구분한다.

## 외부 부작용

10월 branch Action의 webhook/notification은 기본 skip하고 toast를 표시했다. 외부 호출을 포함한 Functions on Objects는 Action 전체가 실패했다. Action별 opt-in과 notification 수신자의 branch owner/default 선택이 따로 있다. Branch 격리를 외부 시스템까지 자동 rollback하는 계약으로 해석하면 안 된다.

4월 platform version switch의 stable/beta/prior는 UI 선택이었다. 저장한 변경은 유지하며 backend나 데이터 rollback을 뜻하지 않는다. rollout 중에만 prior 버전으로 돌아갈 수 있는 조건도 별도로 확인한다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [April 29, 2025, Foundry Branching available the week of May 12, 2025 [Beta] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#7c75ef01-f8dc-4f22-8e55-0da577b5b197)
- [October 23, 2025, Side effects via actions can now be enabled on branches — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#11558000-dd42-476e-99c7-a5039a1f6d18)
- [April 17, 2025, Foundry Branching [Beta] now supports transform code repositories — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#ace71d71-3dda-4578-a56e-2157afc91f92)
- [January 30, 2025, Test your changes in Pipeline Builder, the Ontology, and Workshop with Foundry Branching [Beta] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#7f86a093-99de-40b7-802e-df2f66072642)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
