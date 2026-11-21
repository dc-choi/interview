---
tags: [cicd, version-control, monorepo, scaling, merge-queue]
status: done
verified_at: 2026-11-21
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Server-centric Version Control", "서버 중심 버전 관리", "Scion", "Rubicon", "Ref-CAS", "에이전트 규모 Git 저장소", "Pando", "Aspen", "ABFS", "CASFS", "지연 체크아웃"]
---

# 서버 중심 버전 관리

대규모 모노레포에서 이력 조회와 체크아웃을 반복하는 비용이 병목이면, 전체 저장소를 각 작업에 복제하는 방식과 서버 API로 필요한 데이터만 가져오는 방식을 비교한다. 클라이언트의 오프라인 자율성과 중앙 서비스 의존성은 교환 관계다. 병합량이 검사 처리량을 넘으면 병합 전 검사를 어디까지 유지할지도 함께 정한다.

사례는 바꾼 층으로 나눠 비교한다. 커밋을 만들고 `clone`과 `push`를 하는 클라이언트와 프로토콜, 객체를 보관하고 전달하며 브랜치를 갱신하는 서버와 저장소, 리뷰와 CI와 `main` 병합의 협업 흐름이다. 아래 Scion은 클라이언트와 프로토콜까지 바꾼 사례이고, 저장 계층 사례들은 Git 명령을 그대로 둔다(GeekNews 2026-11-12 정리의 구분).

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

충돌 없는 병합과 동작하는 병합은 다르다. 한 에이전트가 API 응답 형식을 바꾸고 다른 에이전트가 기존 형식을 전제로 화면을 고치면 Git은 서로 다른 파일의 변경을 충돌 없이 합치지만 화면은 깨질 수 있다. 아래 저장 계층 사례들이 푸시 처리량을 늘려도 합친 상태를 검증하는 비용은 남는다. 여러 PR의 반영 결과로 `main`을 한 번만 갱신하는 Aspen의 방식도 갱신 횟수를 줄일 뿐 그 묶음의 검사를 대신하지 않는다(GeekNews 정리의 예시와 이 문서의 해석).

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
| OpenAI Pando(2026-11-02 글) | 브랜치마다 푸시를 따로 처리해 서로 다른 브랜치의 푸시가 기다리지 않는다. 같은 브랜치의 갱신 순서는 지키지만 여러 브랜치를 함께 읽는 도구는 브랜치마다 다른 시점을 볼 수 있다. 팩파일을 재사용하고 지역 캐시에서 제공해 같은 요청마다 다시 압축하는 일을 줄인다 | 사내 모노레포의 백엔드이며 개발자와 에이전트는 기존 `git clone`과 `git push`를 쓴다. 이전 시스템 대비 푸시 지연 중앙값이 거의 5분의 1로 줄었고 하루 약 1페타바이트를 제공한다고 보고하며, 푸시 처리율은 밝히지 않았다 |
| Cursor Continuity(2026-08-18 글, Origin의 저장 계층) | 푸시를 S3의 변경 로그(WAL)에 기록하고, 서버 디스크의 저장소 사본은 필요하면 다시 만드는 캐시로 쓴다. 로그 색인 갱신은 S3의 compare-and-swap 하나로 직렬화되어 저장소의 모든 푸시가 한 줄로 선다 | 자사 모노레포에서 S3 Standard는 초당 최대 120회, S3 Express One Zone은 300회 넘게 푸시를 받았고, 읽기는 합성 시험에서 복제본 100개까지 선형으로 늘었다고 보고한다 |
| Entire 분산 Git 네트워크(2026-07-08 글) | GitHub를 원본으로 두고 에이전트는 지역 셀의 미러에서 `clone`과 `fetch`를 해 원본의 속도 제한을 피한다. 장애 대비 사본이 아니라 평소 원본으로 가던 읽기 요청을 나누는 사본이다. 미러로 push할 수도 있지만 GitHub에 연결된 브랜치는 GitHub가 허용하는 속도까지이고, `entire/unmirrored/` 접두사 브랜치만 그 지역에 남아 빠르게 받는다 | 미국, EU, 호주(갱신 시점 인도 추가) 지역으로 시작해 신규 사용자는 대기 목록을 거친다. 네이티브 호스팅과 오픈소스 백엔드는 계획이다 |
| Aspen(2026-11-05 공개, Apache-2.0) | Pando 설계를 독립 구현한 Git 서버. 브랜치마다 Postgres 행 하나를 compare-and-swap으로 옮기고 받은 팩을 객체 저장소에 그대로 둔다. 서버 쪽 병합 큐는 PR마다 별도 커밋을 남기되 여러 PR을 반영한 결과로 `main`을 한 번만 갱신한다 | 8코어 서버 한 대, S3 Standard와 4코어 Postgres로 `git.git`의 브랜치 전용 URL에 5분간 초당 567회 푸시를 처리했고(중앙값 208ms), 같은 변경을 `main`에 하나씩 반영하면 초당 약 4회였다. 병합 큐의 수치는 아직 없고 어느 수치도 CI를 포함하지 않는다. pre-alpha다 |

Pando, Continuity, Entire 미러와 Aspen 행은 GeekNews의 2026-11-12 정리로 처음 모았고, 2026-11-21 각 회사의 원문으로 다시 대조했다(OpenAI 글은 브라우저로 열람). 수치는 모두 각 회사의 자체 보고이며 측정 조건이 서로 달라 직접 비교하지 않는다.

OpenAI의 Pierre 인수 발표(2026-11-04)는 2026-11-21 브라우저로 열어 대조했다. 인수 계획, Code Storage 기능의 Codex 통합, Trees와 Diffs의 오픈소스 유지, 통합하는 동안 기존 고객의 계속 사용, 규제 승인을 포함한 통상의 거래 종결 조건과 종결 전까지 두 회사가 독립적으로 운영된다는 점이 원문에 있다.

GitLab 글은 소스 관리를 빠르게 해도 병목이 CI, 검증, 보안 검토와 배포로 옮겨 간다고 본다. 저장 계층을 바꾸기 전에 위 병합 검증 절의 처리량 문제를 함께 계산한다.

## 작업 사본을 필요할 때 채운다

서버 쪽은 그대로 두고 클라이언트의 파일 시스템에서 체크아웃 비용을 줄이는 방식도 있다. Google이 2026-11-17 오픈소스로 공개한 ABFS는 Linux 커널 모듈로 만든 내용 주소 기반 가상 파일 시스템(CASFS)을 마운트한다. 체크아웃 때는 Git 해시가 붙은 디렉터리 메타데이터만 받아 파일 이름과 크기가 바로 보이고, 파일 내용은 처음 읽을 때 원격 저장소에서 받아 로컬 캐시에 둔다. Git 객체 모델을 그대로 써서 `git`과 `repo` 명령이 평소대로 동작하고, 같은 내용은 캐시에서 한 번만 받으므로 한 장비에 여러 브랜치의 작업 공간을 나란히 마운트해 에이전트가 병렬로 고치고 빌드하게 할 수 있다.

Android 17 AOSP는 Git 저장소 1,084개, 일반 파일 약 162만 개, 소스 161GB와 빌드 출력 155GB 규모다. 저장소 README의 측정(64 vCPU VM, 3회 평균)에서 `repo sync` 체크아웃 36분 19초가 빈 로컬 캐시 마운트 7.4초, 캐시가 찬 마운트 3.6초로 줄었다. 제작자 측정이며 재현하지 않았다. 대가도 README가 밝힌다. 원격 캐시에 크게 기대는 네트워크 파일 시스템이라 클라이언트가 늘 온라인이고 네트워크가 좋아야 하며, 캐시 서버 여러 개를 운영하고 감시할 인력과 초기 계산 자원, 큰 캐시 저장 공간이 든다. 커널 모듈은 제한된 커널 버전에서만 빌드하고 시험했다. 빌드 결과 재사용은 [[Monorepo-CICD#선언한 입력만 보는 캐시 키와 숨은 의존성|숨은 의존성을 검증하는 빌드 캐시]]에서 다룬다.

## 선택 기준

먼저 checkout 횟수, 저장소 크기와 작업별 필요 범위를 측정한다. 기존 Git의 partial/shallow clone, sparse checkout과 캐시로 해소 가능한지도 본다. Git 매뉴얼의 `scalar`(2.53.0 문서 기준, 2.56.0까지 변경 없음)는 대형 저장소용 고급 설정과 백그라운드 maintenance를 적용하고, `scalar clone`은 기본으로 commit과 tree 객체만 받고 sparse-checkout을 초기화한다. 중앙 서비스로 옮기면 가용성, IAM, 복구, 외부 협업과 이력 내보내기가 설계 비용에 추가된다. 리뷰의 대화와 편집 기록을 Git 밖(DeltaDB, 별도 체크포인트 ref)에 두는 도구를 쓰면 저장소 이전과 미러링 때 그 기록이 함께 옮겨지는지도 확인한다([[Agent-Session-History#Git 밖에 남는 작업 기록|Git 밖에 남는 작업 기록]]).

## 출처

- [Redesigning source control at Anthropic — Anthropic Engineering](https://www.anthropic.com/engineering/redesigning-source-control)
- [GitHub Docs, Managing a merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
- [Git, scalar](https://git-scm.com/docs/scalar)
- [How the Claude Code team does code review — claude.dev, Addy Osmani, Morgan Westlee Lunt, Qing Wang](https://claude.dev/blog/solving-code-review-at-anthropic/)
- [Inside GitHub's new Git storage architecture — GitHub Blog, Karthik Raman, Brian Celenza](https://github.blog/engineering/architecture-optimization/inside-githubs-new-git-storage-architecture/) — 2026-11-05 게시. Rubicon의 객체와 ref 분리, Ref-CAS, compaction, 시험 수치와 출시 상태를 2026-11-09 대조
- [Scaling Git for the agentic software factory — GitLab, Bill Staples](https://about.gitlab.com/blog/scaling-git-for-the-agentic-software-factory/) — 2026-10-13 게시. 구조, 베타 상태와 최고치 조건을 2026-11-09 대조
- [What comes after git — ERSC, Steve Klabnik](https://ersc.io/blog/what-comes-after-git) — 2026-09-10 게시. Git bridge, 고객별 배포와 jj 지원 계획을 2026-11-09 대조
- [Introducing Code Storage — Pierre Computer Company](https://code.storage/changelog/introducing-code-storage) — 2025-10-14 게시. 제품 정의를 2026-11-09 대조
- [OpenAI buys tiny software developer to improve Codex — InfoWorld, Maxwell Cooter](https://www.infoworld.com/article/4245719/openai-buys-tiny-software-developer-to-improve-codex.html) — 2026-11-06 보도
- [OpenAI, Pierre Computer Company, Inc. 인수 예정 — OpenAI](https://openai.com/ko-KR/index/openai-to-acquire-pierre/) — 2026-11-04 게시. 2026-11-21 브라우저로 열어 인수 범위, 오픈소스 유지, 기존 고객과 거래 종결 조건 대조
- [OpenAI, Pierre Computer Company 인수 예정 — GeekNews](https://news.hada.io/topic?id=36621) — 계기 자료. 거래 종결 조건은 위 OpenAI 원문으로 대조
- [OpenAI의 Git 확장 — OpenAI](https://openai.com/ko-KR/index/scaling-git-at-openai/) — 2026-11-02 게시. 2026-11-21 브라우저로 열어 브랜치별 갱신, 팩 재사용과 지역 캐시, 보고 수치 대조
- [Git at any scale — Cursor](https://cursor.com/blog/git-at-any-scale) — 2026-08-18 게시. 2026-11-21 Continuity의 WAL과 캐시 구조, compare-and-swap 직렬화와 처리량 대조
- [An Entirely New Git Hosting Network — Entire](https://entire.com/blog/an-entirely-new-git-hosting-network) — 2026-07-08 게시, 08-28 수정. 2026-11-21 지역 미러의 읽기 분산, push 경로와 지역 대조
- [Aspen: scaling agentic commits beyond what Git was built for — Reason Machines](https://reasonmachines.com/blog/aspen) — 2026-11-05 게시. 2026-11-21 설계, 측정 조건과 수치, 병합 큐와 pre-alpha 상태 대조
- [Accelerating development for massive Git repositories — Google Developers Blog, The Android ABFS Team](https://developers.googleblog.com/accelerating-development-for-massive-git-repositories/) — 2026-11-17 게시. CASFS의 지연 로딩, AOSP 규모와 병렬 작업 공간을 2026-11-21 대조
- [ABFS: Another Build File Service — GitHub, google/abfs](https://github.com/google/abfs) — 체크아웃 측정 조건과 도입이 어려운 조건을 2026-11-21 대조
- [초대형 Git 저장소의 개발 속도 높이기 — GeekNews](https://news.hada.io/topic?id=37552) — 학습 계기
- [AI 시대, git push 앞뒤에서 바뀌는 것들 — GeekNews](https://news.hada.io/article/git-push-in-the-agent-era) — 2026-11-12 GeekNews 아티클(토픽 37034). 세 층 구분, 충돌 없는 병합의 동작 검증 예시, Pando, Continuity, Entire 미러와 Aspen을 처음 모은 출처. 각 회사 원문은 2026-11-21 대조

## 관련 문서

- [[Development-Workflow#Merge queue가 보장하는 것|merge queue의 보장과 설정]]
- [[Code-Review-AI-Agent-Operations|에이전트 시대 코드 리뷰 운영]]
- [[Version-Control-Tooling|버전 관리 도구 선택]]
- [[Monorepo-CICD|모노레포 CI/CD]]
- [[Open-Source-License-Review|호스팅과 라이선스의 경계]]
- [[Agent-Session-History|에이전트 세션 기록의 보존과 Git 밖의 작업 기록]]
