---
tags: [python, ruff, lint, quality, upgrade]
status: done
verified_at: 2026-10-24
category: "테스트&품질(Testing&Quality)"
aliases: ["Ruff 업그레이드 검증", "Ruff Upgrade Validation"]
---

# Ruff 업그레이드 검증

린터 업그레이드 뒤 경고가 줄어도 코드 품질이 좋아졌다는 뜻은 아니다. 검사 대상 파일, Python 기준 버전, 활성 규칙과 진단 동작이 같았는지 먼저 확인한다. 자동 수정 제안의 표시와 실제 코드 변경도 별도로 본다.

## 버전 변화와 프로젝트 설정을 구분한다

아래는 2026-10-09 발표된 Ruff 0.17.0 릴리스에서 확인한 변화다. 이후 버전 전체의 기본값으로 일반화하지 않는다.

| 항목 | 0.17.0 변화 | 확인할 영향 |
|---|---|---|
| Python 기준 | 버전 미설정 시 기본 대상은 3.10에서 3.11, 구문 오류 검사 기준은 3.14에서 3.15로 변경 | 실제 지원 Python과 `target-version`, `requires-python`을 대조한다 |
| 기본 규칙 | `DTZ001`, `DTZ005`, `DTZ006`, `DTZ007`, `DTZ011`, `DTZ012`, `DTZ901` 제외, `F406` 활성화 | 명시적으로 고른 규칙과 기본 규칙을 구분한다 |
| 수정 제안 | 기본 `full` 출력에 unsafe와 수동 검토용 제안도 표시 | 표시만으로 unsafe 수정이 적용되지는 않는다 |
| JUnit | `<testsuite>`의 `disabled` 대신 `skipped`, 루트 `<testsuites>`에도 `skipped` 추가 | 결과를 소비하는 CI 보고서 파서를 확인한다 |
| conda-forge | Python 의존성 제거로 `python -m ruff`, `import ruff` 불가 | 해당 설치 방식은 PATH의 `ruff`를 호출한다. PyPI와 standalone 설치는 이 변경 대상이 아니다 |
| 편집기 | `ruff-lsp` 지원 제거, VS Code 확장은 native server 사용 | `ruff.nativeServer` 설정은 deprecated 상태이며 무시된다 |

기본 규칙에서 제외됐다는 것은 규칙이 삭제됐다는 뜻이 아니다. 프로젝트가 해당 규칙을 명시적으로 선택했는지 실효 설정으로 확인한다.

## 같은 코드에서 검사 조건을 비교한다

적용 제안: 같은 커밋과 작업 디렉터리에서 기존 버전과 새 버전을 비교한다. 먼저 자동 수정을 끈 진단 결과를 확보하고 파일별 규칙 코드의 추가, 제거와 위치 변화를 본다. 경고 총수만 비교하면 검사 범위 축소와 실제 오탐 수정을 구분하기 어렵다.

대표 파일이 `src/example.py`인 프로젝트의 확인 명령 예시다. 실제 파일 경로로 바꿔 사용한다.

```bash
ruff --version
ruff check --show-settings src/example.py
ruff check --show-files .
ruff check --no-fix --output-format json .
```

Ruff는 일반적으로 파일에 가장 가까운 설정을 사용하며 상위 설정을 암묵적으로 합치지 않는다. 상속하려면 `extend`를 쓴다. `target-version`이 없으면 설정 탐색 방식에 따라 `requires-python`의 최소 호환 버전을 추론할 수 있지만, 설정 파일을 직접 전달한 경우에는 빠진 값을 추론하지 않는다. 같은 저장소라도 실행 위치와 설정 전달 방식이 달라졌는지 확인한다.

## 제안 표시와 수정 적용을 분리한다

기본 자동 수정은 safe로 분류된 수정만 적용한다. unsafe 수정에는 명시적 허용이 필요하고, 수동 검토 전용 제안은 허용해도 자동 적용되지 않는다. 규칙별 안전 분류를 설정으로 바꿀 수 있으므로 프로젝트의 재분류 설정도 확인한다. JSON 출력은 수정 제안을 모두 표시하며 `applicability`로 적용 분류를 제공한다.

검증 순서는 진단 차이 확인, 수정 diff 검토, 영향받는 동작의 테스트다. 린트 통과는 지원 Python에서의 실행이나 예외 처리 보존까지 증명하지 않는다. 이 문서는 공식 안내를 대조한 점검 절차이며, 특정 저장소의 업그레이드와 CI 실행을 검증한 결과는 아니다.

## 출처

- [Release 0.17.0 — Astral, Ruff](https://github.com/astral-sh/ruff/releases/tag/0.17.0) — 2026-10-24 변경 항목 대조
- [Astral Ruff, Configuring Ruff](https://docs.astral.sh/ruff/configuration/) — 설정 탐색, Python 버전 추론과 CLI 옵션
- [Astral Ruff, The Ruff Linter](https://docs.astral.sh/ruff/linter/) — safe/unsafe 수정, 수동 검토 제안과 JSON의 applicability

## 관련 문서

- [[테스트&품질(Testing&Quality)|테스트와 품질 인덱스]]
- [[Requirements-Traceability|요구사항 추적성]] — 검사 도구 통과와 요구사항 검증의 구분
