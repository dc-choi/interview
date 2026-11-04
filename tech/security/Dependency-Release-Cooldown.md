---
tags: [security, supply-chain, dependency-management, python, nodejs]
status: done
verified_at: 2026-11-04
category: "보안(Security)"
aliases: ["Dependency Release Cooldown", "Dependency Cooldown", "Minimum Release Age", "의존성 릴리스 쿨다운", "의존성 쿨다운"]
---

# 의존성 릴리스 쿨다운

의존성 릴리스 쿨다운은 레지스트리에 새로 게시된 버전을 일정 기간 설치 후보에서 빼는 정책이다. 악성 버전이 올라온 뒤 탐지되어 내려가기까지의 구간을 피하는 것이 목적이다. lockfile과 해시 고정은 이미 고정한 결과가 바뀌지 않게 지키지만, 처음 lock하거나 갱신해 다시 고정하는 순간 어떤 버전을 받아들일지는 정하지 않는다. 쿨다운은 그 순간을 겨냥한다.

## 고정, 해시, 쿨다운이 막는 단계

| 통제 | 막는 것 | 막지 못하는 것 |
|---|---|---|
| lockfile 버전 고정 | 설치할 때마다 범위 안의 최신 버전이 새로 들어오는 것 | lock하거나 갱신할 때 받아들인 악성 버전 |
| 해시 검증 | 고정한 뒤 같은 버전의 파일이 바뀌거나 다른 파일이 내려오는 것 | lock할 때 기록한 악성 파일 |
| 릴리스 쿨다운 | 게시 직후 아직 탐지되지 않은 버전을 고르는 것 | 기간이 지난 뒤에도 탐지되지 않은 버전, 이미 설치된 환경 |

해시는 고정할 때 받은 파일과 지금 받는 파일이 같은지만 확인한다. 고정할 때 악성 파일을 받았다면 그 파일의 해시가 기준으로 기록되고 이후 설치도 그 파일을 통과시킨다(검증 방식에서 도출한 해석). lockfile과 해시 검사 옵션은 [[Dependency-Management|의존성 관리]], 침해 뒤의 대응은 [[Supply-Chain-Security#대응 플레이북 (사고 발생 시)|공급망 보안의 대응 플레이북]]을 따른다.

[[Supply-Chain-Security#사례|공급망 보안의 사례]]에 기록한 2026년 LiteLLM(PyPI)과 axios(npm)의 악성 버전은 공급자 기록 기준으로 수십 분에서 약 3시간 사이에 내려갔다. 이 사례들에서는 하루 쿨다운이면 악성 버전이 설치 후보에서 빠졌을 것이다(기록된 시간에서 계산한 해석). pnpm 문서도 악성 릴리스가 대개 몇 시간 안에 제거된다는 점(설정 문서는 1시간 안이라고 적는다)을 하루 기본 지연의 근거로 든다. 탐지가 기간보다 늦으면 쿨다운은 효과가 없으므로 침해 확률을 낮추는 장치로 본다.

## 설치 도구별 설정

2026-11-04 각 도구의 공식 문서와 변경 이력 기준이다. 이름, 단위와 기본값이 도구와 버전마다 다르므로 사용하는 버전의 문서를 다시 확인한다. pnpm은 pnpm.io의 현재 문서 기준이며 설정이 추가된 버전과 이전 기본값은 확인하지 못했다.

| 도구 | 설정 | 값과 비교 기준 | 업로드 시각 정보가 없을 때 | 예외 |
|---|---|---|---|---|
| uv | `exclude-newer`, CLI `--exclude-newer`, 환경 변수 `UV_EXCLUDE_NEWER` | RFC 3339 시각, `7 days` 같은 기간, `P7D` 같은 ISO 8601 기간. 상대 기간은 0.9.17(2025-12-09) 변경 이력에 추가됐다. 패키지 버전의 출시일이 아니라 배포 파일마다의 업로드 시각과 비교한다 | 기본으로 PEP 700 `upload-time`이 없는 배포 파일은 쓸 수 없는 것으로 본다. 예외 칸의 패키지 `false`나 인덱스별 설정이 있으면 달라진다 | `exclude-newer-package`(0.8.4부터)로 패키지별 기준을 주거나 `false`로 면제한다. 패키지별 해제는 0.9.25 변경 이력에 있다. 인덱스별 `exclude-newer`도 둘 수 있다 |
| pip | `--uploaded-prior-to`, 환경 변수 `PIP_UPLOADED_PRIOR_TO` | ISO 8601 날짜와 시각(26.0, 2026-01-30부터), 일 단위 기간 `PnD`(26.1, 2026-04-26부터) | User Guide는 즉시 오류로 실패한다고 적는다. 옵션 레퍼런스는 업로드 시각을 제공하는 인덱스에서만 효과가 있다고만 적는다 | 로컬 파일, `--find-links` 디렉터리와 VCS 요구사항은 대상 밖이다. 설정 파일의 기간은 명령줄 `P0D`로 끈다. 패키지별 면제는 공식 문서에서 확인하지 못했다 |
| pnpm | `minimumReleaseAge` | 버전이 게시된 뒤 지난 시간을 분 단위로 본다. 기본값 1440(1일). 전이 의존성을 포함한 모든 의존성에 적용한다 | `minimumReleaseAgeIgnoreMissingTime` 기본값 `true`라 검사를 건너뛴다 | `minimumReleaseAgeExclude`에 패키지 이름, `@myorg/*` 같은 패턴, 특정 버전을 적는다 |
| npm | `min-release-age`, `before` | `min-release-age`는 레지스트리에 나온 지 지정한 일수가 지난 버전만 쓴다(11.10.0, 2026-02-11부터). `before`는 지정한 날짜와 그 이전에 있던 버전만 쓴다 | 문서에서 확인하지 못했다 | `min-release-age-exclude`(11.17.0부터)에 이름과 minimatch 패턴을 적는다. 이름이 맞는 패키지만 면제되고, 그 의존성은 패턴에 맞지 않는 한 정책을 계속 따른다 |

### uv의 기간 값과 lockfile

- 기간 값은 해석할 때의 현재 시각을 기준으로 한 시각으로 바뀐다. `uv.lock`을 쓰면 계산한 시각이 lockfile에 기록되고, 시간이 흘렀다고 lockfile이 갱신되지는 않는다. `--upgrade`나 `--refresh` 등으로 새로 해석할 때 그 시각을 다시 계산한다. uv는 새 버전이 게시됐다는 이유만으로 lockfile을 오래됐다고 보지 않는다.
- 절대 시각으로 적은 값은 움직이지 않는다. 의존성을 갱신할 때 기준 시각을 함께 옮기지 않으면 쿨다운이 아니라 오래된 시점에 고정한 상태가 된다(운영 주의). 로컬 날짜는 CLI 인자로 받고 설정 파일에서는 받지 않는다(환경 변수는 확인하지 못했다). 기간은 하루를 24시간으로 계산하며 월과 연 단위는 받지 않는다.
- 레지스트리에서 읽는 패키지에만 적용된다. 해석이 실패할 때 오류 메시지는 제외된 배포 파일을 언급하지 않으므로, 설치할 버전이 없다는 오류가 나면 쿨다운으로 빠진 버전인지 먼저 확인한다.

아래 예의 전역 기간 값은 0.9.17, 패키지별 `false`는 0.9.25 변경 이력 이후의 기능이다. 패키지별 기간 값과 인덱스별 설정이 추가된 버전은 확인하지 못했다.

```toml
[tool.uv]
exclude-newer = "7 days"
exclude-newer-package = { setuptools = "30 days", my-internal-pkg = false }
```

### pip

- `--uploaded-prior-to P7D`는 업로드된 지 최소 7일이 지난 배포 파일만 고려한다. 시각에 시간대를 적지 않으면 로컬 시간대로 해석하므로 장비 사이의 일관성을 위해 UTC(`Z`)나 오프셋을 붙인다.
- 26.2(2026-07-29)부터 `-r pylock.toml`의 upload-time 필드와 함께 동작하고, `pip list --outdated`도 이 옵션을 반영한다.
- pip 문서는 기간이 새 패키지를 피해 공급망 공격을 막는 데 도움이 되지만 보안 수정도 늦춘다고 경고하고, Dependabot이나 pip-audit 같은 취약점 스캔과 함께 쓰라고 권한다.

### pnpm과 npm

- pnpm의 기본값 1440분은 엄격하지 않다. 범위 안에 조건을 만족하는 버전이 없으면 조건을 만족하지 않는 버전으로 물러나 설치를 이어간다. `minimumReleaseAge`를 `pnpm-workspace.yaml`, 전역 `config.yaml`, `PNPM_CONFIG_*` 환경 변수나 명령줄로 명시하면 `minimumReleaseAgeStrict`가 기본으로 켜져 해석이 실패한다. 이 설정은 `.npmrc`가 아니라 `pnpm-workspace.yaml`이나 전역 `config.yaml`에 둔다.
- pnpm은 레지스트리 메타데이터에 게시 시각(`time`)이 없으면 기본으로 검사를 건너뛴다. 게시 시각을 확인할 수 없는 패키지를 설치하지 않고 해석을 실패시키려면 `minimumReleaseAgeIgnoreMissingTime: false`로 둔다. 게시 시각을 주지 않는 레지스트리에서는 `minimumReleaseAgeExclude`에 넣지 않은 패키지의 설치가 모두 실패할 수 있다(해석). `trustLockfile` 기본값(`false`)에서는 install할 때 lockfile 항목에도 다시 적용한다.
- npm은 `min-release-age`와 `before`가 같은 설정 출처에 함께 있으면 `before`를 따른다. 쿨다운이 `npm audit fix`의 수정 버전을 막으면 취약한 버전을 유지하고 경고한 뒤 0이 아닌 종료 코드로 끝난다(현재 v11, v12 문서 기준. 이 경고는 11.18.0 변경 이력에 추가됐고 이전 버전의 동작은 확인하지 못했다). 수정을 받으려면 그 패키지를 `min-release-age-exclude`에 넣거나 기간을 줄이거나 `before` 날짜를 늦춘다.

pnpm 예처럼 값을 명시하면 엄격 모드가 기본으로 켜진다. npm 예의 `min-release-age-exclude`는 11.17.0 이후 설정이다.

```yaml
# pnpm-workspace.yaml
minimumReleaseAge: 10080 # 분 단위, 7일
minimumReleaseAgeExclude:
  - '@myorg/*'
```

```ini
# .npmrc
min-release-age=7
min-release-age-exclude[]=@myorg/*
```

### 업데이트 봇과의 차이

Dependabot과 Renovate의 cooldown은 업데이트 PR을 여는 시점을 늦추고, 설치 도구의 쿨다운은 해석할 때의 후보를 거른다. lockfile 없이 설치하는 CI나 새로 lock하는 개발자 장비는 봇의 cooldown을 거치지 않으므로 두 층을 따로 본다(이 문서의 구분). 봇이 보안 업데이트 PR을 열어도 설치 도구의 쿨다운이 그 수정 버전을 거를 수 있으므로 예외 경로로 처리한다(npm은 audit fix 차단으로 문서화돼 있고, 다른 도구는 해석 규칙에서 도출한 추론). Renovate의 `minimumReleaseAge`는 pnpm 설정과 이름만 같은 PR 단계의 설정이다. 봇별 기본값과 설정은 [[Dependency-Vulnerability-Scanning#파이프라인 통합|의존성 취약점 스캔의 파이프라인 통합]]을 따른다(봇 동작은 그 문서의 2026-08-31 확인 기준).

## 운영 기준

아래는 공식 문서의 동작을 바탕으로 한 운영 제안이다.

- **기간 값을 쓴다.** 절대 시각은 갱신 때마다 함께 옮겨야 하고, 잊으면 오래된 시점 고정이 된다.
- **예외 경로를 미리 정한다.** 심각한 취약점의 수정 버전처럼 기다릴 수 없으면 그 패키지만 면제하고(pnpm은 특정 버전만 면제할 수 있다), 변경 이력과 diff를 사람이 확인한 뒤 해시 검사를 유지한 채 받는다. 면제는 그 수정 버전이 쿨다운 기간을 넘긴 뒤 제거한다. pnpm은 기본으로 lockfile 항목에도 기간을 다시 적용하므로 너무 일찍 지우면 다음 설치가 실패하거나 범위 안의 이전 버전으로 다시 해석될 수 있다(위반 시 동작은 확인하지 못함). 면제를 지운 뒤 lockfile diff에서 수정 버전이 유지되는지 확인한다. pip은 패키지별 면제를 확인하지 못했고, 명령줄 `P0D`는 그 실행 전체의 기간을 끈다.
- **업로드 시각이 없는 인덱스의 처리를 도구별로 확인한다.** uv는 기본으로 그 배포 파일을 쓰지 않고, pip은 26.3 User Guide 기준 오류로 멈추며, pnpm은 기본으로 검사를 건너뛴다. 같은 기간을 설정해도 사설 레지스트리에서의 결과가 다르다.
- **쿨다운 뒤에 남는 위험을 줄인다.** 쿨다운은 침입 확률을 낮출 뿐 실행된 악성 코드를 막지 않는다. 그 코드가 읽을 수 있는 비밀의 범위는 키 분리와 최소 권한 스코프로 줄인다([[API-Key-Exposure|API 연동 키 노출과 최소 권한 스코프]]). 여러 공급자 키를 한 프로세스에 모으는 [[LLM-Gateway|LLM 게이트웨이]]는 이 범위가 넓어지기 쉽다(구조에서 도출한 해석).

## 면접 체크포인트

- 해시 고정이 처음 고정한 악성 버전을 막지 못하는 이유와 쿨다운이 겨냥하는 시점
- uv의 기간 값이 lockfile에 기록되는 방식과 다시 계산되는 시점
- 업로드 시각 정보가 없는 레지스트리에서 uv, pip, pnpm의 동작 차이
- 쿨다운이 보안 수정까지 늦출 때의 예외 경로와 취약점 스캔의 역할

## 출처

- [uv, Settings — exclude-newer, exclude-newer-package](https://docs.astral.sh/uv/reference/settings/) — 2026-11-04 값 형식, 패키지별 `false`, 기간 해석 규칙과 비교 기준 대조
- [uv, Resolution — Dependency cooldowns, Reproducible resolutions](https://docs.astral.sh/uv/concepts/resolution/) — 2026-11-04 기간의 기준 시각과 lockfile 기록, `upload-time` 요구, 인덱스별 설정, 오류 메시지와 레지스트리 한정 대조
- [uv, Commands — --exclude-newer](https://docs.astral.sh/uv/reference/cli/) — CLI의 로컬 날짜와 `UV_EXCLUDE_NEWER`
- [uv, Locking and syncing](https://docs.astral.sh/uv/concepts/projects/sync/) — 새 버전 게시만으로 lockfile을 오래됐다고 보지 않는 조건
- [uv 0.9.x 변경 이력 — Astral](https://github.com/astral-sh/uv/blob/main/changelogs/0.9.x.md) — 0.9.17 기간 지원, 0.9.25 패키지별 해제
- [uv 0.8.x 변경 이력 — Astral](https://github.com/astral-sh/uv/blob/main/changelogs/0.8.x.md) — 0.8.4 `exclude-newer-package`
- [pip, pip install — --uploaded-prior-to](https://pip.pypa.io/en/stable/cli/pip_install/) — 2026-11-04 v26.3 문서, 값 형식과 환경 변수
- [pip, User Guide — Filtering by Upload Time](https://pip.pypa.io/en/stable/user_guide/) — 허용 형식과 시간대, 기간, 메타데이터가 없을 때, 대상 밖 입력, 보안 수정 지연 경고
- [Changelog — pip](https://pip.pypa.io/en/stable/news/) — 26.0, 26.1, 26.2 변경
- [pnpm, Settings](https://pnpm.io/settings) — 2026-11-04 `.npmrc`에서 읽는 항목의 범위와 설정 파일 위치
- [pnpm, Settings — Dependency Resolution](https://pnpm.io/settings/dependency-resolution) — 2026-11-04 `minimumReleaseAge` 계열의 기본값, 엄격 모드, 게시 시각 누락, `trustLockfile`과 설정 위치
- [pnpm, Supply Chain Security](https://pnpm.io/supply-chain-security) — 하루 기본값과 1주 설정 예, 지연의 근거
- [npm Docs, config (v11)](https://docs.npmjs.com/cli/v11/using-npm/config) — `before`, `min-release-age`, `min-release-age-exclude`와 audit fix 동작
- [npm Docs, config (v12)](https://docs.npmjs.com/cli/v12/using-npm/config) — v11과 같은 설명 확인
- [Changelog (v11) — npm Docs](https://docs.npmjs.com/cli/v11/using-npm/changelog) — 11.10.0, 11.17.0, 11.18.0 변경
- [의존성 고정을 모르면 API 키가 먼저 털린다 — 길리랩 - 실전 구현 랩](https://www.youtube.com/watch?v=nYP-ZgTIaSg) — 고정, 검증, 쿨다운과 키 분리를 단계별로 나눈 점검 구성의 계기. 도구 동작은 위 공식 문서로 대조

## 관련 문서

- [[Supply-Chain-Security|공급망 보안]] — 공격 경로, 산출물 검증과 사고 대응
- [[Dependency-Management|의존성 관리]] — lock 파일 3계층, uv의 `--locked`와 해시 검사 모드
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]] — 업데이트 봇의 cooldown과 스캔
- [[API-Key-Exposure|API 연동 키 노출과 최소 권한 스코프]]
- [[LLM-Gateway|LLM 게이트웨이]]
- [[tech/os-runtime/nodejs/Security|Node.js 보안 모범 사례]] — npm `min-release-age`와 install script 기본 차단
- [[AI-Accelerated-Threat-Defense|악용 시간 단축과 AI 공격에 대비하는 방어]] — 업데이트 관찰 기간의 효과와 한계
- [[보안(Security)|보안 인덱스]]
