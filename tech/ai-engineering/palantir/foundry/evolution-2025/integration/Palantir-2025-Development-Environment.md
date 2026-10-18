---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 Python 개발 환경과 preview의 정확성 조건

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## Workspace와 로컬 개발을 구분하기

- 1월 Python transforms in VS Code Workspaces 베타는 IDE, terminal, Git, type hint와 full-dataset preview를 묶었다. Code Workspaces 활성 Organization에서 기본 제공되는 베타였으며 일부 preview component는 미지원이었다.
- 3월 로컬 VS Code extension 베타는 Control Panel 권한과 별도 local preview 활성화를 요구했다. 최초 extension은 플랫폼에서 내려받고 당시 VS Code Marketplace에는 없었다.
- 2월 25일 persistent Spark session은 **debug run을 제외**했다. sample-less input cache는 Python template `>=1.866.0`, extension release `0.267.0` 경로에서 소개됐다.
- 3월 view/object materialization preview가 추가됐지만 dataset view input은 sampled였다. full-dataset preview라는 일반 기능 이름만으로 모든 input이 원본 전체라고 가정하지 않는다.
- 4월 incremental preview GA는 Spark/lightweight, VS Code workspace/local 환경, file transforms와 output 읽기를 지원하고 semantic version/retention 등 build flag를 반영했다. snapshot 실행은 snapshot처럼, incremental 실행은 incremental처럼 해석해야 한다.
- 7월 Spark preview runtime configuration은 Spark 설정을 바꾸며 resource allocation은 workspace 설정에서 바꾼다.
- 10월 lightweight preview는 build engine를 사용해 PySpark 의존을 줄였다. 속도 향상 수치는 workload에 따른 공지의 주장이다.

## 개발 편의와 재현성

- 2월 unit test integration, 3월 Checks 탭, 4월 settings.json/keybindings 동기화, Vim binding, workspace build monitoring이 추가됐다.
- 6월 debugger dataframe inspection과 Python 3.12 repo/workspace preview/check/build 권장이 소개됐다. 이는 2025년 권장 버전이며 현재 지원 수명과 같지 않다.
- 7월 environment debugger graph와 lockfile CodeLens는 dependency 경로를 추적한다. template upgrade와 런타임 library 버전을 함께 확인한다.
- 7월 코드 정의 filter는 실험 기능으로 parameter가 없고 restart 시 초기화됐으며 raw file filter는 Spark에 제한됐다. 12월에는 bool/int/float/string parameter, drag ordering와 local persistence, Spark/Polars/LazyPolars/pandas 지원으로 바뀌었다.
- 12월 file filter는 regex/glob, limit와 수동 선택, 중간 결과 확인을 추가했다. 이전 실험 제약을 최신 기능에 그대로 적용하거나 반대로 새 기능을 옛 버전에 소급하지 않는다.
- 8월 local development/VS Code 권한은 외부 clone 권한과 통합됐다. 소스가 로컬에 존재할 수 있다는 보안 의미도 확인한다.
- 6월 workspace의 데이터 파일 scan은 흔한 extension을 탐지해 secure folder로 옮기도록 돕는다. 비밀/데이터의 commit 방지를 자동 보장하는 기능으로 보지 않는다.

## Notebook 별도 제약

10월 Jupyter Restricted View output mode는 restart 후에도 유지되고 dataset/model/telemetry/artifact publishing을 막았다. 사용자별 Dash/Streamlit 인터페이스와 SparkSQL/PyArrow 경로가 추가됐으며 11월 Snowflake virtual read/write, 12월 여러 snippet과 SQL dependency 설치가 확대됐다. Notebook의 interactive 권한과 publish 가능 여부를 나눠 확인한다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [July 1, 2025, Limit batch size of incremental inputs to save time and compute costs — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#87337acd-3338-40be-90db-2cdbab199e76)
- [December 18, 2025, Control transform preview inputs with code-defined filtering — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#13588279-7b4f-41a3-9570-d674aa5a78d0)
- [January 14, 2025, Use Python Transforms in VS Code Workspaces [Beta] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#7312a8ca-094a-4d79-a8b9-78ded71bbdd4)
- [November 11, 2025, Code with AIP in Jupyter Code and RStudio Workspaces — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#0dff8a25-5b1e-4811-8b3b-9d3a6f7ff4a2)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
