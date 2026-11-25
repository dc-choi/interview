---
tags: [security, dependency, sca, osv-scanner, gitlab-ci, devsecops, vulnerability-management]
status: done
verified_at: 2026-11-18
category: "보안(Security)"
aliases: ["Dependency Patch Cycle", "의존성 패치 사이클", "패치 반영 지연", "OSV-Scanner fix", "Guided Remediation"]
---

# 의존성 패치 반영 지연과 CI 패치 사이클

수정 버전이 공개된 뒤에도 그 버전이 우리 저장소의 lockfile에 들어가기까지는 별도의 시간이 걸린다. 패치가 언제 나올지는 메인테이너가 정하지만, 나온 패치를 얼마나 빨리 반영할지는 사용하는 조직이 정한다. 이 문서는 그 구간을 줄이는 CI 기반 반영 절차를 다룬다. 스캔 표면, 데이터 소스와 우선순위의 일반 원칙은 [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]]에 있다.

## 반영이 늦어지는 이유

### 조직이 통제할 수 없는 구간

- **패치 개발:** 제보된 취약점은 메인테이너가 검증하고 고쳐야 한다. 실습 글은 이 일을 대개 자원봉사 메인테이너가 맡아 시간이 더 걸린다고 설명한다. AI로 찾는 속도가 빨라져도 이 단계는 같은 비율로 빨라지지 않는다. Anthropic의 공개 대시보드는 2026-11-02 기준 오픈소스 프로젝트 680곳에 취약점 5,087건을 알렸고 그중 패치됐다고 파악한 것이 629건이라고 적는다. 같은 페이지는 패치 수가 패치를 만드는 데 걸리는 시간 때문에 늦게 따라오는 지표이고, 패치가 나왔다는 사실이 널리 설치됐다는 보장도 아니라고 적는다. 5,087건 중 3,225건은 외부 보안업체의 검토 없이 메인테이너에게 바로 보내 오탐이 섞일 수 있다고 표시한다.
- **비공개 조율:** 조율된 공개 관행에서는 수정과 공개 사이에 시차가 있다. Anthropic 정책은 업계 표준인 90일 기한을 따르되 90일과 패치 공개 중 먼저 오는 시점에 공개하고, 패치가 나온 뒤에는 보통 45일을 기다려 전체 기술 세부를 게시한다. Project Zero는 2026-11-18 확인한 정책에서 수정 시점과 관계없이 90일째 공개하는 Full 90을 쓰며 기한을 단계적으로 줄일 계획이다(일정은 [[Vulnerability-Operations-AI-Agents#공개 기한이 짧아지면 패치 격차가 드러난다|공개 기한 단축과 패치 격차]]).
- **권고문 전 공백:** OSV-Scanner 같은 의존성 스캐너는 새 취약점을 찾는 도구가 아니라, 공개된 취약점 데이터베이스의 항목을 우리 의존성 목록과 대조하는 도구다. 수정 커밋이나 릴리스가 먼저 나오고 권고문이 아직 없으면 스캐너는 그 취약점을 보고하지 않는다. 이 구간은 업그레이드 주기, 입력 검증과 네트워크 차단처럼 권고문에 기대지 않는 통제로 대비한다(운영 제안).

### 조직이 줄일 수 있는 구간

- **영향 파악 부족:** 무엇이 들어 있는지 모르면 영향을 판단할 수 없다. 복사한 코드, 벤더 코드 직접 포함이나 AI 생성 코드처럼 패키지 매니저를 거치지 않고 들어온 구성요소는 매니페스트와 lockfile만 읽는 스캐너에 보이지 않는다.
- **전이 의존성:** 직접 고르지 않은 패키지라 책임자와 영향 범위가 불분명하다.
- **호환성 부담:** 수정이 메이저 버전에만 있으면 코드 변경 검토가 필요해 반영이 미뤄지기 쉽다.

이 세 가지는 정해진 주기로 진단하고, 수정 결과를 MR로 검증하고, 반영한 상태를 게이트로 지키는 절차로 줄일 수 있다.

## 다섯 단계 패치 사이클

인포그랩의 2026-10 실습 글이 제시한 구성이다. 각 도구의 동작은 아래 공식 문서와 대조했다.

1. **진단:** CI에서 OSV-Scanner로 lockfile을 검사한다. 처음에는 job에 `allow_failure: true`를 붙여 결과만 보는 리포트 모드로 시작해, 기존 부채 때문에 모든 MR이 막히지 않게 한다.
2. **자동 수정과 검증:** 사람이 로컬에서 `osv-scanner fix`로 수정한 lockfile을 MR로 올리고, CI 테스트를 통과하면 머지한다. 변경 범위가 작은 전략부터 쓴다.
3. **예외 기록:** 메이저 업그레이드가 필요해 바로 고치지 못하는 항목은 `osv-scanner.toml`에 ID, 만료일과 사유를 적는다. 사유에는 결정한 사람과 재검토 날짜를 남긴다.
4. **MR 게이트:** 예외까지 반영해 결과가 0건이 되면 `allow_failure` 줄을 지우고 GitLab의 Merge checks에서 Pipelines must succeed를 켠다. 실습 글은 `[skip ci]`로 게이트를 우회하지 못하도록 Skipped pipelines are considered successful을 꺼 둔다. 이 게이트는 lockfile 전체의 결과를 0건으로 유지하는 작은 프로젝트의 구성이라, 새 권고문이 공개되면 관련 없는 MR도 막힌다. 저장소가 크거나 기존 부채가 많으면 [[Dependency-Vulnerability-Scanning#파이프라인 통합|파이프라인 통합 절]]처럼 MR이 새로 들이는 취약점만 막고 기준을 심각도, 악용 신호와 수정 가능 여부의 조합으로 잡는다.
5. **정기 스캔:** 커밋이 없으면 파이프라인도 돌지 않으므로, 예약 파이프라인으로 기본 브랜치를 매일 다시 검사한다. 새 권고문이나 만료된 예외가 실패로 드러나면 채팅 알림을 받는다.

실습 글의 결과(2026-10-02 기준, 2021-01-01 시점 버전으로 고정한 작은 npm 프로젝트, OSV-Scanner v2.6.0)는 첫 스캔에서 패키지 16개 중 4개, 8건이었다. in-place 수정 뒤 4건, `--upgrade-config=minor`로 메이저 업그레이드를 막은 relax 수정 뒤 3건이 남았고, 남은 3건은 jsonwebtoken의 메이저 업그레이드로만 고칠 수 있어 예외로 기록했다. 첫 스캔부터 두 번째 수정 MR 머지까지 약 40분이었다. 한 프로젝트의 실습 결과이므로 일반적인 소요 시간이나 감소율로 읽지 않는다.

## OSV-Scanner guided remediation

`osv-scanner fix`는 공식 문서에서 experimental로 분류되며 minor 버전 업데이트만으로 바뀌거나 사라질 수 있다(2026-11-18 확인).

| 전략 | 생태계와 입력 | 동작 | 위험 |
|---|---|---|---|
| in-place | npm `package-lock.json` | 기존 버전 제약을 지키는 범위에서 lockfile의 취약 버전을 바꾼다 | 위험이 작지만 고칠 수 있는 수가 적다 |
| relax (문서 표의 relock) | npm `package.json`과 lockfile | 직접 의존성의 버전 제약을 올리고 의존성 그래프 전체를 다시 계산한다 | 그래프가 크게 바뀔 수 있다 |
| override | Maven `pom.xml` | `<dependencyManagement>`로 버전을 덮어쓴다 | 다른 의존성과 호환되지 않으면 앱이 깨질 수 있다. 비대화형 모드만 지원 |

- **수정 범위 조절:** `--upgrade-config`는 허용할 최대 업그레이드 수준을 `major`, `minor`, `patch`, `none` 중에서 정하고, 패키지명을 붙이면 그 패키지에만 적용한다. 기본값은 `major`라 지정하지 않으면 메이저 업그레이드도 허용된다. `--max-depth=1`은 직접 의존성만, `--ignore-dev`는 devDependencies 전용 취약점을 제외하고, `--no-introduce`는 새 취약점을 들이는 패치를 뺀다. `--min-severity`는 CVSS 점수가 없는 항목을 제외하지 않는다.
- **설치는 따로 한다:** relax는 기존 `package-lock.json`과 `node_modules/`를 지우고 `npm install --package-lock-only`로 lockfile을 다시 만든다. npm의 두 전략 모두 의존성을 설치하지 않으므로 `npm ci`로 설치한 뒤 테스트한다. 실행 전에 매니페스트와 lockfile을 커밋하거나 백업한다.
- **신뢰할 수 없는 프로젝트에 돌리지 않는다:** 문서는 `fix`가 패키지 매니저로 하여금 프로젝트에 지정된 스크립트를 실행하거나 외부 레지스트리를 따라가게 할 수 있다고 경고한다. 미러나 사설 레지스트리를 쓰면 `--data-source=native`가 필요하다.
- **설정 파일과 따로 논다:** `fix`는 `osv-scanner.toml`을 읽지 않는다. 예외로 둔 취약점은 `--ignore-vulns`로 따로 넘긴다.
- **도구 결과는 영향 판단이 아니다:** 실습에서 relax로 올린 jws 3.2.3이 고친 권고문(GHSA-869p-cjfg-cm3x)은 `jws.verify()` 인터페이스를 쓰는 사용자는 영향이 없고 jsonwebtoken 사용자가 여기에 해당한다고 적는다. 스캔 결과 감소와 실제 위험 감소를 구분하고 권고문의 영향 조건을 함께 읽는다.

## 예외와 게이트 운영

- **예외 형식:** 2026-11-18 확인한 설정 문서는 `[[IgnoredVulns]]` 아래 `id`, 선택적 만료일 `effectiveUntil`, `reason`을 쓰며 만료일이 지나면 무시가 더는 적용되지 않는다고 적는다. 실습 글의 예시는 만료 키를 `ignoreUntil`로 쓰는데, 2026-11-18 main 브랜치 소스에서 이 키는 `effectiveUntil`로 대체된 폐기 예정 키로 남아 아직 읽히고 경고를 낸다. 새 설정은 `effectiveUntil`을 쓰고, 만료된 예외가 실제로 스캔 실패로 되돌아오는지 시험해 둔다(운영 제안).
- **설정 범위:** `osv-scanner.toml`은 스캔한 파일과 같은 디렉터리에만 적용되고 하위 디렉터리로 전파되지 않는다. `--config`로 파일을 지정하면 모든 파일에 그 설정을 쓰고 각 디렉터리의 `osv-scanner.toml`은 무시한다. 모노레포에서 예외가 적용되지 않는 원인이 될 수 있다. 취약점 하나를 무시하면 그 alias로 보는 항목도 함께 무시된다.
- **재검토일은 도구 밖에 둔다:** 도구가 관리하는 것은 만료일뿐이다. 재검토일은 이슈 마감일이나 팀 일정에 따로 등록한다.
- **우선순위:** 실습 글은 처리할 항목이 많으면 실제 악용(KEV), 악용 가능성(EPSS), 심각도(CVSS) 순으로 보라고 제안한다. 여기에 외부 도달 가능성과 런타임 의존성 여부 같은 노출 경로를 함께 본다. 세 지표의 의미는 [[Dependency-Vulnerability-Scanning#우선순위 — CVSS 점수만으로 줄 세우면 실패한다|우선순위 절]]에 있다.
- **예약 파이프라인의 권한:** GitLab 예약 파이프라인은 스케줄 소유자의 권한으로 실행되고, 사람이 수동으로 돌리면 실행한 사람의 권한을 쓴다. 소유자가 차단되거나 프로젝트에서 빠지면 스케줄이 비활성화될 수 있으므로, 정기 스캔이 조용히 멈추지 않았는지 마지막 실행 시각을 확인한다(운영 제안).
- **폐쇄망:** `--offline`은 로컬 DB를 내려받거나 갱신하지 않는다. `--offline-vulnerabilities`와 `--download-offline-databases`를 함께 쓰면 DB를 받거나 갱신한다. DB를 들여오는 주기만큼 새 권고문의 탐지가 늦어진다.

## 보고와 경보를 받는 메인테이너와 배포판의 부담

사용하는 조직이 줄일 수 있는 구간 앞에는 메인테이너와 배포판이 감당하는 구간이 있다. 아래는 Gentoo 개발자의 2026-10-27 개인 블로그 글이 지적한 내용이며, 수치 근거가 없는 경험과 의견이다.

- **걸러 낸 뒤에도 판단이 남는다:** AI의 도움으로 누구나 보안 보고를 하게 되면서 보고가 크게 늘었다. 명백히 무효한 보고를 버린 뒤에도 메인테이너는 남은 보고의 중요도를 정하고, 제안된 수정이 맞는지와 기존 기능을 깨지 않는지 확인하거나 거절 이유를 설명해야 한다. 커널과 OpenSSH가 겪은 같은 흐름은 [[Coordinated-Vulnerability-Disclosure#AI 도구로 찾은 버그를 공개 보고로 다루는 프로젝트|조율된 취약점 공개]]에 있다.
- **취약점인지는 사용 방식이 정한다:** ReDoS 같은 성능 버그가 취약점인지는 공격 경로와 소프트웨어의 사용 방식에 달렸다. 사용자가 직접 입력한 위험한 명령을 셸이 실행했다는 식의 억지스러운 보고도 있고, 사용자의 비밀을 드러낼 수 있는 타이밍 공격처럼 심각한 보고도 있다. 이 판단에는 깊은 전문 지식이 필요하고, 메인테이너의 판단이 사용자의 기대와 다를 수 있다([[Regex-Engine-Attack-Surface#시간 고갈과 메모리 손상은 다른 문제다|정규식 엔진의 공격면]]).
- **스캐너는 영향 여부를 모른다:** CVE가 붙으면 점수가 지나치게 높게 매겨질 수 있고, 스캐너는 수정될 때까지 경보를 낸다. 사용자는 질문, 항의, 비난이나 포크로 압박한다. 글쓴이는 Gentoo에 영향이 없는 취약점(취약한 의존성의 내장 사본을 이미 분리한 경우 등)에도 스캐너 오탐을 피하려고 불필요한 보안 안정화를 했고, 오래된 패키지로 보고되지 않도록 실제 변경이 없거나 Gentoo에 해당하지 않는 버전 올림도 했다고 적는다.
- **수정만 따로 받을 길이 없다:** 많은 프로젝트에 LTS나 보안 브랜치가 없고 변경을 최소화한 보안 릴리스를 내지 못해, 보안 수정이 새 기능, 폐기와 API 변경에 섞여 나온다. 대규모 재작성 도중이나 충분히 시험하지 않은 코드와 함께 보안 릴리스가 나오기도 하고, 사용자는 취약한 버전을 벗어나려고 큰 API 변경을 받아들여야 한다. 위 [[Dependency-Patch-Cycle#조직이 줄일 수 있는 구간|호환성 부담]]의 메인테이너 쪽 원인이다.
- **악순환:** 따라가지 못한 사람들이 남의 코드에 기대는 대신 코드를 더 많이 내장하고, 내장 사본이 늘면 패치할 곳도 늘어 부담이 다시 커진다는 것이 글의 결론이다. 내장 사본이 수정 반영을 늦추는 경로는 [[Compressed-Input-Decoder-Security|압축 입력 디코더 보안]]의 Brotli 사례에 있다.

사용하는 쪽에서 할 수 있는 일(운영 제안): 영향 없음으로 판단한 경보는 근거와 함께 위 예외 형식(만료일, 사유)으로 남겨 같은 경보를 되풀이해 처리하지 않는다. 수정이 메이저 버전에만 있으면 업그레이드 비용과 함께 업스트림 보안 브랜치나 배포판 백포트가 있는지 확인한다. 메인테이너에게 보고할 때는 영향 조건, 재현과 수정안을 붙여 판단 비용을 줄인다([[Coordinated-Vulnerability-Disclosure#대량 발견은 재현, 경로 검증과 패치를 붙여 보고한다|대량 발견의 보고]]).

## 출처

- [Anthropic, Coordinated vulnerability disclosure dashboard](https://red.anthropic.com/2026/cvd/) — 2026-11-02 기준 집계
- [Anthropic, Coordinated vulnerability disclosure for Claude-discovered vulnerabilities](https://www.anthropic.com/coordinated-vulnerability-disclosure)
- [Google Project Zero, Vulnerability Disclosure Policy](https://projectzero.google/vulnerability-disclosure-policy.html)
- [OSV-Scanner, Guided Remediation](https://google.github.io/osv-scanner/experimental/guided-remediation/)
- [OSV-Scanner, Configuration](https://google.github.io/osv-scanner/configuration/)
- [OSV-Scanner, Offline Mode](https://google.github.io/osv-scanner/usage/offline-mode/)
- [GitLab Docs, Scheduled pipelines](https://docs.gitlab.com/ci/pipelines/schedules/)
- [GitLab Docs, Auto-merge](https://docs.gitlab.com/user/project/merge_requests/auto_merge/) — Pipelines must succeed와 skipped pipeline 설정
- [google/osv-scanner, internal/config/ignores.go](https://github.com/google/osv-scanner/blob/main/internal/config/ignores.go) — `ignoreUntil` 폐기 예정 키, 2026-11-18 main 기준
- [Improper HMAC Signature Verification in auth0/node-jws (GHSA-869p-cjfg-cm3x) — GitHub, auth0/node-jws](https://github.com/auth0/node-jws/security/advisories/GHSA-869p-cjfg-cm3x)
- [OSV-Scanner와 GitLab CI로 취약점 패치 반영을 앞당기는 5단계 — 인포그랩](https://insight.infograb.net/blog/2026/10/07/patch-cycle/) — 다섯 단계 구성과 실습 결과
- [The next circle of security hell — Retroactively fixing the world, Michał Górny](https://blogs.gentoo.org/mgorny/2026/10/27/the-next-circle-of-security-hell/) — 2026-10-27 게시된 Gentoo 개발자의 개인 의견 글, 2026-11-25 본문 대조. 메인테이너와 배포판의 부담 절의 근거
- GeekNews, 2026-11-24 제공 요약: 보안 지옥의 다음 단계 (토픽 번호 미확인, 원문 식별에 사용)

## 관련 문서

- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]] — 스캔 표면, 데이터 소스, 우선순위, PR 게이트와 전체 스캔
- [[Coordinated-Vulnerability-Disclosure|조율된 취약점 공개]] — 공개 일정과 엠바고
- [[Vulnerability-Operations-AI-Agents|취약점 운영과 AI 에이전트]] — 찾는 속도와 처리 속도의 차이, 패치 격차
- [[Dependency-Release-Cooldown|의존성 릴리스 쿨다운]] — 자동 업데이트에서 새 버전을 받는 시점
- [[보안(Security)|보안 인덱스]]
