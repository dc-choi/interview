---
tags: [ai, skills, kiro, hook]
status: done
verified_at: 2026-10-07
category: "AI엔지니어링(AIEngineering)"
aliases: ["Kiro Hooks", "Kiro Skills", "Kiro Powers"]
---

# Kiro 훅, 스킬과 Powers

[[Agent-Skills|에이전트 스킬]]에서 분리한 Kiro 문서다. 스킬의 정의와 SKILL.md 구조, 점진적 공개, Claude Code와 Codex의 관례 비교, 스킬과 훅의 구분은 그 문서에 두고, 여기서는 Kiro의 Hooks, Skills와 Powers를 다룬다.

## Kiro Hooks의 자동 실행과 차단 경계

2026-10-10 Kiro 공식 문서의 부분 검증이다. IDE 1.0과 CLI 3.0의 현재 형식은 `.kiro/hooks/<id>.json`이며 `version: "v1"`, `hooks` 배열, PascalCase `trigger`, 선택적 정규식 `matcher`와 `action`을 사용한다. 이전 IDE의 설정 예제를 현재 형식으로 복사하지 않는다.
- `command`는 셸 명령을 실행하고 `agent`는 현재 대화에 프롬프트를 전달한다. 저장 후 테스트 생성 요청은 결과를 별도로 확인한다.
- 공식 IDE action 안내에서 명령의 0 이외 종료 코드는 오류를 전달한다. `PreToolUse`에서는 도구 실행을, Prompt Submit에서는 프롬프트 제출을 차단한다. Claude Code의 종료 코드 2 규칙과 구분한다.
- 운영 점검 제안: 테스트 실행과 생성 요청을 나누고, 차단이 필요한 검사는 실제 거부 사례로 확인한다. 사후 검사 실패를 이미 수행된 변경의 자동 취소로 해석하지 않는다.

## Kiro Skills: 이식 가능한 형식과 호스트 동작을 구분한다

이 절은 2026-10-10 Kiro 공식 문서의 부분 검증이다.

- `.kiro/skills/`는 프로젝트 범위, `~/.kiro/skills/`는 전역 범위다. 같은 이름이면 프로젝트 스킬이 우선한다. 전역 폴더 지원은 IDE와 CLI 기준이며 Web과 Mobile까지 확대하지 않는다.
- 이름과 description으로 발견하고, 요청에 맞으면 본문을 읽는다. `/스킬이름`으로 직접 호출할 수도 있다. 카탈로그 비용과 실제 활성화된 본문 비용을 구분한다.
- GitHub에서 가져올 때는 저장소 루트가 아닌 스킬 하위 폴더나 `SKILL.md` URL을 사용한다. 가져오기는 스킬 디렉터리로 복사하는 동작이므로 원본의 후속 변경까지 자동 동기화된다고 가정하지 않는다.
- 공통 형식으로 지침을 옮겨도 스크립트의 실행 도구와 네트워크 요구는 남는다. `compatibility`로 환경 요구를 적고 실제 호스트에서 확인한다.

이식 점검 제안: 지침 로드, 필요한 실행 파일의 존재, 스크립트의 실제 성공을 각각 확인한다. 스킬이 목록에 보이거나 활성화됐다는 사실만으로 작업 완료나 권한 부여를 판단하지 않는다.

## Kiro Powers: 도구와 지침을 함께 활성화한다

이 절은 2026-10-07 Kiro 공식 문서로 확인한 범위다.

Powers는 MCP 도구, 스킬과 지식을 함께 설치하고 작업 맥락에 따라 활성화하는 패키지다. 스킬이 작업 방법을 설명한다면 Power는 그 지침과 연결 도구를 함께 묶는다. 대화의 키워드에 맞는 Power를 로드하므로 모든 연동 문서를 처음부터 넣을 필요가 줄어든다. 실제 토큰 절감과 결과 품질은 작업별로 측정한다.

| 구성 | 역할 |
|---|---|
| `plugin.json` | 필수 manifest, 패키지 식별 정보와 활성화 `keywords` |
| `skills/<작업>/SKILL.md` | 선택한 작업의 지침, 필요하면 scripts와 references 포함 |
| `mcp.json` | 선택적 MCP 서버 연결 설정 |
| `dev.kiro/` | steering 같은 Kiro 전용 확장 |

과거 `POWER.md` 중심 예제를 현재 생성 규격으로 그대로 사용하지 않는다. 현재 공식 생성 가이드는 `plugin.json`을 요구하며 MCP 없는 스킬 전용 Power도 허용한다. 키워드 활성화는 지침을 선택하는 수단이며 생성 코드의 정확성을 보증하지 않는다.

### API 명세 연동에 적용하는 점검 순서

다음은 명세 조회와 코드 생성을 연결할 때의 설계 점검안이다. Power 설치만으로 자동 충족되는 기능은 아니다.

1. 필요한 API의 공식 명세 위치와 버전을 식별한다.
2. 조회 도구로 요청 경로, 필드, 인증과 오류 응답을 확인하고 관련 부분만 사용한다.
3. 지침에는 추측한 필드 사용 금지, 오류 처리와 검증할 응답을 적는다.
4. 생성 코드는 명세와 테스트 응답으로 대조한다. 명세 읽기와 실제 데이터 변경 권한은 구분한다.

## 출처

- [Kiro Docs, Hooks](https://kiro.dev/docs/hooks/)
- [Kiro Docs, Hook actions](https://kiro.dev/docs/hooks/actions/)
- [Kiro Docs, Agent Skills](https://kiro.dev/docs/skills/)
- [Kiro Docs, Powers](https://kiro.dev/docs/powers/)
- [Kiro Docs, Create powers](https://kiro.dev/docs/powers/create/)

## 관련 문서

- [[Agent-Skills|에이전트 스킬 (스킬 정의, SKILL.md 구조, 점진적 공개, 스킬 vs 훅)]]
- [[Claude-Code-Extension-Reference|Claude Code 확장 메커니즘 (종료 코드 2 차단 규칙과 훅 세부 메커니즘)]]
- [[Agent-Context-Budget|에이전트 컨텍스트 예산 (스킬 Catalog-First 로딩)]]
- [[MCP|MCP (외부 경계 확장)]]
