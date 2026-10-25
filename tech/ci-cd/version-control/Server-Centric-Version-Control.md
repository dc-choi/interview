---
tags: [cicd, version-control, monorepo, scaling, merge-queue]
status: done
verified_at: 2026-10-26
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Server-centric Version Control", "서버 중심 버전 관리", "Scion"]
---

# 서버 중심 버전 관리

대규모 모노레포에서 이력 조회와 체크아웃을 반복하는 비용이 병목이면, 전체 저장소를 각 작업에 복제하는 방식과 서버 API로 필요한 데이터만 가져오는 방식을 비교한다. 클라이언트의 오프라인 자율성과 중앙 서비스 의존성은 교환 관계다. 병합량이 검사 처리량을 넘으면 병합 전 검사를 어디까지 유지할지도 함께 정한다.

## Scion 사례의 전제

Anthropic의 2026-10-13 발표(10-15 갱신)를 10-16에 대조하고 10-26에 다시 확인했다. 하루 병합이 5월 약 2,500건에서 9월 30,000건 이상으로 늘고 CI 체크아웃이 하루 약 2,500만 회에 이른 특수 부하에서, 5개월에 걸쳐 사내 모노레포를 Git에서 Scion으로 옮겼다는 보고다.

일반 Git 사용을 부정하는 사례가 아니다. Anthropic도 대부분 저장소에는 Git의 분산/오프라인 설계가 적합하다고 구분한다.

## 반복 복제 대신 필요한 연산을 서비스한다

- 서버가 커밋, 병합, 리베이스와 이력 질의를 처리하고 클라이언트는 제한된 캐시와 작업 파일을 유지한다.
- 변경 집합과 내용 주소 기반 데이터로 불변 객체를 공유하고, 이력 검색용 파생 데이터를 별도로 계산한다.
- 파일이 필요하지 않은 CI 작업은 API만 사용하고, 필요한 경우 sparse 또는 지연 materialization으로 읽는 범위를 줄인다.
- 계층별 캐시가 장애 시 상위 저장소로 한꺼번에 몰리지 않도록 실패 영역을 구분한다.

CPU와 메모리 요구량이 이전 Git 미러 인프라의 1/200로 줄었다는 수치는 자체 운영 비교다. 같은 이득을 다른 저장소에 적용하거나 직접 재현했다고 보지 않는다.

## 에이전트 규모의 병합 검증

GitHub merge queue는 PR의 변경을 최신 base와 큐 앞 PR들의 변경에 합친 상태로 필수 검사를 돌린다. Only merge non-failing pull requests를 Yes로 두면 모든 PR이 필수 검사를 통과해야 병합되고, No로 두면 필수 검사에 실패한 PR도 그룹의 마지막 PR이 통과하는 한 그 그룹에 넣을 수 있다([[Development-Workflow#Merge queue가 보장하는 것|merge queue가 보장하는 것]]). 아래 Scion 글의 설명은 이 제품이 아니라 merge queue 일반과 사내 모노레포에 관한 것이며, Claude Code 팀 사례의 글은 merge queue 제품을 밝히지 않는다.

- 사내 모노레포를 Scion으로 옮긴 Anthropic은 에이전트 규모에서는 제대로 된 merge queue가 별 의미가 없다고 본다. 테스트 중에 수백, 수천 건이 병합될 수 있다면 CI가 무엇을 뜻하느냐고도 반문하는데, 이 수는 측정값으로 제시된 것이 아니다. merge queue에 전역 저장소 잠금을 거는 업계 관행을 효과적으로 재현하지 못해, 대신 병합 뒤 자동 테스트와 배포 전 자동 테스트에 투자했다.
- Anthropic은 이 방식에서는 동시 변경끼리 충돌할 수 있지만 Claude가 대개 사람이 충돌을 알아차리는 것보다 빨리 고칠 수 있다고 설명한다. 충돌 빈도나 수정 시간 수치가 없는 자체 설명이다.
- Anthropic은 사내 코드 리뷰 도구 Antique의 merge queue 상태를 원격 측정과 로그로 지켜보는 Claude(superfan)도 소개하므로, 큐를 없앴다기보다 큐에 전역 저장소 잠금을 걸지 못했다는 뜻으로 읽힌다(이 문서의 해석). 모노레포와 분리된 저장소를 쓰는 Claude Code 팀은 merge queue에서 통합 결과를 다시 검사한다고 밝혔다([[Code-Review-AI-Agent-Operations|에이전트 시대 코드 리뷰 운영]]).
- 커밋을 잠금 없이 가볍게 만드는 원칙과, changeset 생성과 별개로 Spanner 단일 행의 compare-and-swap으로 처리하는 ref 이동은 저장과 쓰기 경로의 설계이며 위의 merge queue 전역 저장소 잠금과는 별개다(이 문서의 구분). Scion은 main과 release branch 외의 ref를 권장하지 않는다.
- Anthropic은 자동 bisect와 revert 파이프라인 같은 사내 도구도 저렴한 프로그래밍 방식의 source control 접근이 없으면 이 규모에서 실용적이지 않다고 설명한다.

다음은 Anthropic이 설명한 Scion 절차가 아니라 이 문서의 해석과 권고다. 병합될 정확한 상태의 검사가 끝날 때까지 main을 붙잡아 두는 잠금이 없으면 변경은 검사받은 main과 다른 main 위에 병합될 수 있고, 동시에 병합된 변경의 조합은 병합 전에 함께 검사되지 않을 수 있다. 그런 조합의 문제는 병합 뒤 검사로 찾아 고치거나 되돌리고 배포 전 검사로 다시 걸러야 한다. 병합량이 큐의 검사 처리량 안에 있는 팀은 merge queue나 최신 base 검사를 유지하는 편이 단순하다. 처리량이 모자라면 병합 전 검사를 덜어내기 전에 동시 빌드 수(GitHub에서는 1~100)와 CI 용량부터 늘린다. GitHub의 한 번에 병합할 PR 수는 merge_group 빌드를 합치지 않으므로 검사 횟수를 줄이지 않고, base에 함께 병합되는 PR 단위를 정해 병합 뒤 CI나 배포가 도는 횟수에 영향을 준다. 그래도 병합 뒤 검증으로 옮기려면 배포 전 관문, 원인 변경을 자동으로 찾고 되돌리는 경로와 충돌을 빨리 고칠 주체를 먼저 갖춘다.

## 선택 기준

먼저 checkout 횟수, 저장소 크기와 작업별 필요 범위를 측정한다. 기존 Git의 partial/shallow clone, sparse checkout과 캐시로 해소 가능한지도 본다. Git 매뉴얼의 `scalar`(2.53.0 문서 기준, 2.56.0까지 변경 없음)는 대형 저장소용 고급 설정과 백그라운드 maintenance를 적용하고, `scalar clone`은 기본으로 commit과 tree 객체만 받고 sparse-checkout을 초기화한다. 중앙 서비스로 옮기면 가용성, IAM, 복구, 외부 협업과 이력 내보내기가 설계 비용에 추가된다.

## 출처

- [Redesigning source control at Anthropic — Anthropic Engineering](https://www.anthropic.com/engineering/redesigning-source-control)
- [GitHub Docs, Managing a merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
- [Git, scalar](https://git-scm.com/docs/scalar)
- [How the Claude Code team does code review — claude.dev, Addy Osmani, Morgan Westlee Lunt, Qing Wang](https://claude.dev/blog/solving-code-review-at-anthropic/)

## 관련 문서

- [[Development-Workflow#Merge queue가 보장하는 것|merge queue의 보장과 설정]]
- [[Code-Review-AI-Agent-Operations|에이전트 시대 코드 리뷰 운영]]
- [[Version-Control-Tooling|버전 관리 도구 선택]]
- [[Monorepo-CICD|모노레포 CI/CD]]
- [[Open-Source-License-Review|호스팅과 라이선스의 경계]]
