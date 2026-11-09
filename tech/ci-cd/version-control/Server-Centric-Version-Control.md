---
tags: [cicd, version-control, monorepo, scaling, merge-queue]
status: done
verified_at: 2026-11-02
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Server-centric Version Control", "서버 중심 버전 관리", "Scion", "Rubicon", "Ref-CAS", "에이전트 규모 Git 저장소"]
---

# 서버 중심 버전 관리

대규모 모노레포에서 이력 조회와 체크아웃을 반복하는 비용이 병목이면, 전체 저장소를 각 작업에 복제하는 방식과 서버 API로 필요한 데이터만 가져오는 방식을 비교한다. 클라이언트의 오프라인 자율성과 중앙 서비스 의존성은 교환 관계다. 병합량이 검사 처리량을 넘으면 병합 전 검사를 어디까지 유지할지도 함께 정한다.

## Scion 사례의 전제

Anthropic의 2026-10-13 발표(10-15 갱신)를 10-16에 대조하고 10-26과 11-02에 다시 확인했다. 하루 병합이 5월 약 2,500건에서 9월 30,000건 이상으로 늘고 CI 체크아웃이 하루 약 2,500만 회(개발 환경, 에이전트 샌드박스와 연구 작업 제외)에 이른 특수 부하에서, 5개월에 걸쳐 사내 모노레포를 Git에서 Scion으로 옮겼다는 보고다. main 브랜치 이력만 100GB에 가깝고 압축한 작업 사본도 25GB를 넘는다. 이 CI 체크아웃을 단순하게 내려받으면 하루 600PB가 넘는 git 트래픽이 된다는 것은 추산이다.

일반 Git 사용을 부정하는 사례가 아니다. Anthropic도 대부분 저장소에는 Git의 분산/오프라인 설계가 적합하다고 구분한다.

## 반복 복제 대신 필요한 연산을 서비스한다

- 서버가 커밋, 병합, 리베이스와 이력 질의를 처리하고 클라이언트는 제한된 캐시와 작업 파일을 유지한다.
- 변경 집합과 내용 주소 기반 데이터로 불변 객체를 공유하고, 이력 검색용 파생 데이터를 별도로 계산한다.
- 파일이 필요하지 않은 CI 작업은 API만 사용하고, 필요한 경우 sparse 또는 지연 materialization으로 읽는 범위를 줄인다.
- 계층별 캐시가 장애 시 상위 저장소로 한꺼번에 몰리지 않도록 실패 영역을 구분한다. Scion은 각 계층이 99%를 넘는 캐시 적중률을 유지하고, 장기 상태가 필요 없어 필요할 때 늘리기 쉽다고 보고한다.

CI와 연구 작업의 체크아웃이 분 단위에서 초 단위로 100배 규모로 빨라지고 CPU와 메모리 요구량이 이전 Git 미러 인프라의 1/200로 줄었다는 수치는 자체 운영 비교이고, 캐시 적중률도 자체 보고 값이며 측정 기간과 방법은 밝히지 않았다. 같은 이득을 다른 저장소에 적용하거나 직접 재현했다고 보지 않는다.

## 에이전트 규모의 병합 검증

GitHub merge queue는 PR의 변경을 최신 base와 큐 앞 PR들의 변경에 합친 상태로 필수 검사를 돌린다. Only merge non-failing pull requests를 Yes로 두면 모든 PR이 필수 검사를 통과해야 병합되고, No로 두면 필수 검사에 실패한 PR도 그룹의 마지막 PR이 통과하는 한 그 그룹에 넣을 수 있다([[Development-Workflow#Merge queue가 보장하는 것|merge queue가 보장하는 것]]). 아래 Scion 글의 설명은 이 제품이 아니라 merge queue 일반과 사내 모노레포에 관한 것이며, Claude Code 팀 사례의 글은 merge queue 제품을 밝히지 않는다.

- 사내 모노레포를 Scion으로 옮긴 Anthropic은 에이전트 규모에서는 제대로 된 merge queue가 별 의미가 없다고 본다. 테스트 중에 수백, 수천 건이 병합될 수 있다면 CI가 무엇을 뜻하느냐고도 반문하는데, 이 수는 측정값으로 제시된 것이 아니다. merge queue에 전역 저장소 잠금을 거는 업계 관행을 효과적으로 재현하지 못해, 대신 병합 뒤 자동 테스트와 배포 전 자동 테스트에 투자했다.
- Anthropic은 이 방식에서는 동시 변경끼리 충돌할 수 있지만 Claude가 대개 사람이 충돌을 알아차리는 것보다 빨리 고칠 수 있다고 설명한다. 충돌 빈도나 수정 시간 수치가 없는 자체 설명이다.
- Anthropic은 사내 코드 리뷰 도구 Antique의 merge queue 상태를 원격 측정과 로그로 지켜보는 Claude(superfan)도 소개하므로, 큐를 없앴다기보다 큐에 전역 저장소 잠금을 걸지 못했다는 뜻으로 읽힌다(이 문서의 해석). 모노레포와 분리된 저장소를 쓰는 Claude Code 팀은 merge queue에서 통합 결과를 다시 검사한다고 밝혔다([[Code-Review-AI-Agent-Operations|에이전트 시대 코드 리뷰 운영]]).
- 커밋을 잠금 없이 가볍게 만드는 원칙과, changeset 생성과 별개로 Spanner 단일 행의 compare-and-swap으로 처리하는 ref 이동은 저장과 쓰기 경로의 설계이며 위의 merge queue 전역 저장소 잠금과는 별개다(이 문서의 구분). Scion은 main과 release branch 외의 ref를 권장하지 않는다.
- Anthropic은 자동 bisect와 revert 파이프라인 같은 사내 도구도 저렴한 프로그래밍 방식의 source control 접근이 없으면 이 규모에서 실용적이지 않다고 설명한다.

다음은 Anthropic이 설명한 Scion 절차가 아니라 이 문서의 해석과 권고다. 병합될 정확한 상태의 검사가 끝날 때까지 main을 붙잡아 두는 잠금이 없으면 변경은 검사받은 main과 다른 main 위에 병합될 수 있고, 동시에 병합된 변경의 조합은 병합 전에 함께 검사되지 않을 수 있다. 그런 조합의 문제는 병합 뒤 검사로 찾아 고치거나 되돌리고 배포 전 검사로 다시 걸러야 한다. 병합량이 큐의 검사 처리량 안에 있는 팀은 merge queue나 최신 base 검사를 유지하는 편이 단순하다. 처리량이 모자라면 병합 전 검사를 덜어내기 전에 동시 빌드 수(GitHub에서는 1~100)와 CI 용량부터 늘린다. GitHub의 한 번에 병합할 PR 수는 merge_group 빌드를 합치지 않으므로 검사 횟수를 줄이지 않고, base에 함께 병합되는 PR 단위를 정해 병합 뒤 CI나 배포가 도는 횟수에 영향을 준다. 그래도 병합 뒤 검증으로 옮기려면 배포 전 관문, 원인 변경을 자동으로 찾고 되돌리는 경로와 충돌을 빨리 고칠 주체를 먼저 갖춘다.

## Git 프로토콜을 유지한 채 저장 계층을 바꾼다

Scion처럼 클라이언트 모델까지 바꾸는 대신, 클라이언트와 전송 프로토콜은 Git 그대로 두고 서버의 저장과 계산 구조만 바꾸는 접근도 있다. 에이전트가 각자 브랜치를 만들어 쉬지 않고 푸시하면 한 저장소의 쓰기가 짧은 폭주에서 지속 부하로 바뀌고, 푸시마다 CI, 배포와 다른 에이전트의 읽기가 뒤따른다. 에이전트는 푸시 결과를 기다리므로 커밋 지연도 처리량만큼 중요하다.

| 설계 요소 | 하는 일 | 확인할 점 |
|---|---|---|
| 불변 객체와 가변 ref의 분리 | 내용 주소로 이름 붙은 pack과 색인은 객체 저장소에 두고, ref와 pack 목록만 작은 합의 그룹이 관리한다 | 객체 업로드가 ref 갱신보다 먼저 끝나 ref가 내구성 있는 객체만 가리키는가 |
| ref 단위 compare-and-swap | 트랜잭션이 바꾸는 ref만 잠그고 기대값을 확인한 뒤 복제본 과반수가 기록하면 확정한다 | 같은 ref를 다투다 진 푸시를 거절하는지, 재시도하는지 |
| 버전 비교 읽기 | 저장소 버전(마지막 로그 순번)이 같으면 ref 목록을 보내지 않는다 | 읽기가 쓰기보다 훨씬 많을 때 바뀌지 않은 저장소의 읽기 비용 |
| 버릴 수 있는 계산 노드 | 읽기와 쓰기를 맡는 노드의 로컬 디스크는 다시 만들 수 있는 캐시다 | 정확성이 특정 노드에 의존하지 않는가 |
| 뒤에서 도는 compaction | 푸시마다 늘어나는 pack을 lease를 잡은 별도 노드가 합친다 | 합친 pack의 객체가 입력과 같은지 검증하는가 |
| 필요한 범위만 읽기 | 전체 클론 대신 필요한 파일과 이력만 요청한다 | 기존 partial clone과 sparse checkout으로 충분하지 않은가 |
| 고객별 배포 분리 | 다른 고객의 사용량이 영향을 주지 않게 배포를 나눈다 | 운영 비용과 데이터 위치 요구 |

Git 객체는 내용 주소라 두 작성자가 같은 객체를 조율 없이 써도 충돌하지 않는다([[Git-Object-Format|Git 객체 형식]]). 그래서 직렬화가 필요한 곳은 ref 이동뿐이고, 에이전트가 서로 다른 브랜치에 푸시하는 동안에는 대부분 서로 기다리지 않는다. 같은 브랜치를 다투면 여전히 하나만 이긴다.

**사례 비교.** 각 회사의 자체 발표이며 직접 재현하지 않았다. GitHub, GitLab, ERSC와 Pierre의 글은 2026-11-09 대조했다.

| 사례 | 공개한 구조 | 상태와 수치 |
|---|---|---|
| GitHub Rubicon(2026-11-05 글) | Spokes가 라우팅하고 가상 복제본이 읽기와 쓰기를 맡는다. pack과 색인은 Azure Blob Storage, ref와 pack 목록은 Ref-CAS에 둔다. compaction 노드가 shard별 lease를 잡고 pack을 합친다 | 제한된 비공개 프리뷰이며 넓은 출시는 글 게시 시점 기준 이듬해(2027년) 초 계획이다. 내부 시험에서 한 저장소에 에이전트 5,000개와 초당 푸시 7,200회를 처리했다고 보고하지만 읽기 지연 수치와 시험 조건은 밝히지 않았다. 같은 ref 경쟁에서 진 푸시의 처리도 글에 없다 |
| GitLab 차세대 SCM(2026-10-13 글) | Git 프로토콜을 유지하고 공유 객체 저장소 위에 수평 확장하는 무상태 계산을 둔다. 에이전트는 필요한 파일과 이력만 요청한다. 고객이 관리하는 S3 호환 저장소와 폐쇄망도 대상이다 | 비공개 베타. 초기 내부 시험의 최고치로 작업 완료 최대 50배, 토큰 최대 절반, 네트워크 트래픽 최대 1/1,000을 보고하지만 작업, 저장소 크기와 동시성 조건은 밝히지 않았다 |
| ERSC(2026-09-10 글) | 일반 git 클라이언트와 Git 프로토콜로 접속하고, 서버는 Git 저장소가 아닌 자체 저장 엔진을 Git bridge 뒤에 둔다. 고객마다 배포를 나눈다. jj 사용자는 Git 백엔드로 같은 서버를 쓴다 | 저장소 기능은 베타 신청 단계이고 성능 수치는 없다. jj 고유 프로토콜 bridge는 계획이다 |
| Pierre Code Storage(2025-10-14 공개) | 애플리케이션이 저장소를 필요할 때 만들고 푸시하는 white-label Git 계층이며, 분산 quorum 기반이라고 소개한다 | OpenAI가 Pierre 인수 계획을 발표했고, Code Storage 기능을 Codex에 통합하며 기존 고객은 기능이 옮겨질 때까지 계속 쓸 수 있다 |

OpenAI 발표 원문은 2026-11-09 HTTP 403으로 대조하지 못했다. 인수 계획, Codex 통합, Trees와 Diffs의 오픈소스 유지, 기존 고객의 계속 사용은 InfoWorld 보도(2026-11-06)로 확인했고, 규제 승인 등 거래 종결 조건은 GeekNews 요약에만 있다.

GitLab 글은 소스 관리를 빠르게 해도 병목이 CI, 검증, 보안 검토와 배포로 옮겨 간다고 본다. 저장 계층을 바꾸기 전에 위 병합 검증 절의 처리량 문제를 함께 계산한다.

## 선택 기준

먼저 checkout 횟수, 저장소 크기와 작업별 필요 범위를 측정한다. 기존 Git의 partial/shallow clone, sparse checkout과 캐시로 해소 가능한지도 본다. Git 매뉴얼의 `scalar`(2.53.0 문서 기준, 2.56.0까지 변경 없음)는 대형 저장소용 고급 설정과 백그라운드 maintenance를 적용하고, `scalar clone`은 기본으로 commit과 tree 객체만 받고 sparse-checkout을 초기화한다. 중앙 서비스로 옮기면 가용성, IAM, 복구, 외부 협업과 이력 내보내기가 설계 비용에 추가된다.

## 출처

- [Redesigning source control at Anthropic — Anthropic Engineering](https://www.anthropic.com/engineering/redesigning-source-control)
- [GitHub Docs, Managing a merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
- [Git, scalar](https://git-scm.com/docs/scalar)
- [How the Claude Code team does code review — claude.dev, Addy Osmani, Morgan Westlee Lunt, Qing Wang](https://claude.dev/blog/solving-code-review-at-anthropic/)
- [Inside GitHub's new Git storage architecture — GitHub Blog, Karthik Raman, Brian Celenza](https://github.blog/engineering/architecture-optimization/inside-githubs-new-git-storage-architecture/) — 2026-11-05 게시. Rubicon의 객체와 ref 분리, Ref-CAS, compaction, 시험 수치와 출시 상태를 2026-11-09 대조
- [Scaling Git for the agentic software factory — GitLab, Bill Staples](https://about.gitlab.com/blog/scaling-git-for-the-agentic-software-factory/) — 2026-10-13 게시. 구조, 베타 상태와 최고치 조건을 2026-11-09 대조
- [What comes after git — ERSC, Steve Klabnik](https://ersc.io/blog/what-comes-after-git) — 2026-09-10 게시. Git bridge, 고객별 배포와 jj 지원 계획을 2026-11-09 대조
- [Introducing Code Storage — Pierre Computer Company](https://code.storage/changelog/introducing-code-storage) — 2025-10-14 게시. 제품 정의를 2026-11-09 대조
- [OpenAI buys tiny software developer to improve Codex — InfoWorld, Maxwell Cooter](https://www.infoworld.com/article/4245719/openai-buys-tiny-software-developer-to-improve-codex.html) — 2026-11-06 보도. OpenAI 발표 원문(https://openai.com/index/openai-to-acquire-pierre/)은 2026-11-09 HTTP 403으로 미대조
- [OpenAI, Pierre Computer Company 인수 예정 — GeekNews](https://news.hada.io/topic?id=36621) — 거래 종결 조건의 출처

## 관련 문서

- [[Development-Workflow#Merge queue가 보장하는 것|merge queue의 보장과 설정]]
- [[Code-Review-AI-Agent-Operations|에이전트 시대 코드 리뷰 운영]]
- [[Version-Control-Tooling|버전 관리 도구 선택]]
- [[Monorepo-CICD|모노레포 CI/CD]]
- [[Open-Source-License-Review|호스팅과 라이선스의 경계]]
