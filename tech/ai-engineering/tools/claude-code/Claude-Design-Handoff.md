---
tags: [ai, design, prototype, claude-code, handoff, frontend, impeccable]
status: done
verified_at: 2026-10-11
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Design Handoff", "AI 디자인과 구현 인계", "Impeccable", "AI 디자인 기본값 수렴"]
---

# AI 디자인 시스템과 구현 인계

AI로 만든 화면을 구현에 넘길 때는 이미지뿐 아니라 디자인 시스템, 선택한 화면 상태와 동작 의도를 함께 전달한다. 시각 시안과 실행 가능한 서비스의 완료 조건은 별도로 확인한다.

## 디자인 시스템에서 출발한다

색상, 타이포그래피와 컴포넌트 규칙을 공유하면 화면마다 스타일을 다시 설명하는 일을 줄일 수 있다. Claude Design은 코드베이스와 디자인 파일을 읽어 디자인 시스템을 구성하고, 이를 후속 프로젝트에 적용하는 흐름을 제공한다. 텍스트뿐 아니라 이미지, 문서와 웹 캡처를 입력으로 사용할 수 있다.

시스템에 넣을 자료는 사용 권한과 공개 범위를 확인한다. 만들어진 컴포넌트가 기존 코드의 실제 API와 맞는지는 구현 단계에서 대조한다.

## 탐색, 선택과 세부 조정을 나눈다

1. 대상 사용자, 핵심 과업과 필요한 화면을 정한다.
2. 탐색할 차이를 레이아웃, 정보 밀도와 탐색 방식처럼 구체적인 축으로 제한한다.
3. 여러 시안 중 하나를 선택한 뒤 텍스트, 간격과 상태별 표시를 조정한다.
4. 선택한 시안과 남은 결정 사항을 구현 담당자에게 전달한다.

이 순서는 도구 사용을 위한 작업 기준이다. Claude Design은 대화, 요소별 코멘트, 직접 편집과 조절 도구를 지원하지만, 그 기능만으로 요구사항의 누락을 판단해 주지는 않는다.

## 생성 UI가 같은 기본값으로 모이는 문제

이 절은 2026-10-11 Anthropic의 공식 글과 frontend-design 스킬, Impeccable 저장소와 문서, GitHub 제품 페이지를 대조한 부분 검증이다.

지침 없이 LLM에 랜딩 페이지를 맡기면 Inter 글꼴, 흰 배경 위 보라 그라데이션, 최소한의 애니메이션으로 거의 매번 수렴한다는 관찰이 있다(2025-11 Anthropic 글 기준). 이는 분포 수렴(distributional convergence)으로 설명된다. 어디에나 무난한 디자인 선택이 웹 학습 데이터의 다수를 차지하고, 방향을 주지 않으면 모델이 그 확률 높은 중심에서 고른다는 것이다. 당시 제시된 대응은 글꼴, 색과 테마, 움직임, 배경을 구체적으로 지시하는 약 400토큰 분량의 지침을 스킬로 두고 필요할 때만 불러오는 방식이며, 현재 스킬 본문은 이후 개정으로 이보다 길다.

기본값은 시점에 따라 바뀐다. frontend-design 스킬의 2026-06 개정은 AI 생성 디자인이 몰리는 모습으로 따뜻한 크림 배경에 획 대비가 큰 세리프 제목과 테라코타 강조색을 쓴 조합, 거의 검은 배경에 밝은 애시드 그린이나 주홍색 강조색 하나를 둔 조합, 신문형 레이아웃을 들었고, 2026-09-03 개정은 같은 모양의 둥근 카드로 내용을 나누는 SaaS 카드 구성과 주제와 무관한 템플릿 장식을 더했다. 이런 특징은 브리프에 따라 정당한 선택일 수 있지만 이유 없이 나타나면 선택이 아니라 기본값이다.

Impeccable은 지침과 결정적 검사를 묶은 사례다. Paul Bakaus가 Anthropic의 frontend-design 스킬에서 출발해 만든 도구로, 공개된 스킬, 명령, CLI와 탐지 엔진은 Apache-2.0 오픈소스다. 프로젝트 루트에서 `npx impeccable install`로 설치한다.

- **지침:** 스킬은 방향을 정한 뒤 UI를 편집하기 직전에 `reference/craft-floor.md`를 읽도록 지시한다. 이 문서는 품질 하한, 절대 금지 항목과 탐지기가 잡지 못하는 습관을 담고, 계획만 하는 작업에서는 읽지 않는다. 모델이 따르는 지시라 강제는 아니며, 읽었는지 확인하는 장치는 없다. 기계적으로 검사할 수 있는 항목만 훅이 켜져 있을 때 검사된다([[Harness-Gate-Placement|게이트 배치]]).
- **결정적 탐지:** CLI와 브라우저 확장은 LLM과 API 키 없이 규칙으로 파일이나 URL을 검사한다. URL 검사는 로컬에 설치된 Chrome, Chromium 또는 Edge를 쓰며, CORS를 허용하지 않는 교차 출처 CSS는 읽지 못한다. 규칙 수는 자주 바뀐다. README는 2026-09-07 판에서 61개였고, 2026-10-05와 2026-10-07에 규칙을 하나씩 은퇴시켜 2026-10-11 확인 기준 59개다.
- **훅:** Claude Code, Codex, GitHub Copilot과 Grok Build에서는 프로젝트 훅이 편집 뒤 탐지 결과를 에이전트에 돌려준다. 이 훅들은 편집을 막지 않으며 Grok Build는 턴이 끝날 때 결과를 전달한다. Cursor는 편집 뒤 검사 대신 쓰기 전에 제안된 내용을 검사해, 문제를 찾으면 그 쓰기를 막고 에이전트가 고치게 한다. Codex는 `/hooks`에서 프로젝트 훅을 승인해야 하고, Grok Build는 `/hooks-trust`나 `--trust`로 프로젝트 훅을 신뢰해야 하며, GitHub Copilot CLI는 `.github/hooks/impeccable.json`이 기본 브랜치에 커밋된 뒤에 훅을 실행한다. 설치나 업데이트 때 `--no-hooks`를 주면 그 실행에서만 훅 설치를 건너뛰고, 이미 설치된 검사는 `/impeccable hooks off`로 끄며, 각 도구 설정의 훅 항목까지 지우려면 `/impeccable hooks reset`을 쓴다.
- **명령:** 2026-10-11 README 기준 audit, bolder, quieter 등 24개 명령이 있다(예: `/impeccable audit`, 2026-10-01 `generate` 추가 전에는 23개). 웹 프로젝트에서 audit은 접근성, 성능, 테마, 반응형, 구현 무결성 5개 영역을 각각 0~4점(합계 20점)으로 매겨 심각도 순 보고서를 내고 코드는 고치지 않는다. 총점이 높아도 출시를 막을 수준의 문제가 남을 수 있다. 네이티브 앱은 플랫폼별 항목으로 검사한다.
- **제공 경로:** GitHub Copilot 앱에는 Impeccable 디자인 스킬이 실험 기능으로 들어 있어 Settings의 Experimental 탭에서 켠다. 소개 페이지는 탐지기와 훅을 언급하지 않는다.

한 기본값을 피하도록 지시하면 다른 기본값으로 옮겨 갈 수 있다. Impeccable의 변경 기록은 2026-04-30에 SaaS 크림 룩에서 벗어날 때마다 잡지 표지풍으로 기우는 2차 반사를 막는 항목을 넣었고, 2026-05에 이탤릭 세리프 제목(05-04)과 크림 배경(05-28)을 잡는 탐지 규칙을 더했다. 2026-05-28에는 약 190개 표본 분석으로 스킬 자신의 문구가 결함을 만든다고 보고, 극단적 자간과 이탤릭 세리프 히어로를 유도하던 범주별 미감 레시피를 걷어냈다.

다음은 위 동작을 바탕으로 한 운영 제안이다.

- 탐지 결과는 이미 알려진 흔적에 대한 회귀 검사로 쓰고 디자인 품질 판정으로 쓰지 않는다. 브리프가 의도한 선택이면 이유를 남기고 예외로 둔다. Impeccable은 `npx impeccable ignores`로 규칙, 파일, 값 단위 예외를 기록하고, 값 단위 예외에는 `--reason`으로 사유를 남긴다.
- 이 탐지기는 프로젝트와 무관하게 미리 정한 규칙으로 패턴을 찾는다. 프로젝트가 정한 테마 토큰과 컴포넌트 계약을 코드가 지키는지는 [[Design-System-Lint|디자인 시스템 lint]]처럼 프로젝트 규칙을 검사하는 도구로 따로 확인한다.
- 설치는 지원 도구에 프로젝트 훅을 함께 넣고, 엔진이 실행기 옆에 없으면 처음 실행 때 네이티브 엔진을 `~/.impeccable/bin/`에 내려받는다. Claude Code에서는 설치된 명령 훅이 모델 도구 승인과 별개로 돌아, 실행기 명령을 거부해도 첫 편집이나 Stop 이벤트에서 엔진을 내려받을 수 있다. 외부 스킬과 플러그인을 들일 때처럼 설치되는 파일, 훅이 실행하는 명령과 끄는 방법을 먼저 확인한다([[Agent-Skills#설치 경로와 신뢰 — 표면마다 따로, 출처는 먼저|스킬 설치의 신뢰 경계]], [[Claude-Code-Customization#플러그인 — 확장을 묶어 설치하는 단위|플러그인의 보안 경계]]).
- 이번에 확인한 개선 근거는 제작자 쪽 분석이고 GitHub 소개 문구에도 측정값이 없다. 독립 평가는 찾지 못했으므로 자기 화면에서 적용 전후를 비교하고 사람이 브리프와 대조해 판정한다.

## 내보내기와 구현 인계

Claude Design은 PDF, PowerPoint와 HTML로 내보내거나 Canva 등 연결된 도구로 전달할 수 있다. Claude Code에는 디자인을 인계해 기존 작업을 이어 가는 흐름을 제공한다. 2026-10-06 확인한 공식 안내에는 `/design-sync`를 통한 디자인 시스템 반영과 `/design`을 통한 디자인 프로젝트 생성, 편집과 동기화가 설명돼 있다. 로컬 환경에서 해당 기능을 직접 실행해 확인한 기록은 아니다.

다음 구분은 결과 검토에 사용할 기준이다.

| 전달물 | 확인할 내용 |
|---|---|
| PDF, PowerPoint | 페이지 넘침, 글꼴, 정렬과 편집 필요성 |
| HTML 또는 인터랙티브 프로토타입 | 화면 전환과 표시 상태, 테스트용 데이터의 범위 |
| 구현 인계 자료 | 선택한 컴포넌트, 반응형 규칙, 실제 API와 연결할 지점 |

클릭 시 화면이 바뀌는 것만으로 인증, 데이터 저장이나 외부 결제가 구현됐다고 판단하지 않는다. 프로토타입에서 가정한 동작을 실제 코드, API와 테스트로 이어서 확인한다.

## 웹 애니메이션을 영상으로 인계하기

브라우저에서 움직이는 시안과 배포할 영상 파일은 별도 산출물이다. Remotion으로 옮기는 경우에는 React 컴포넌트에 화면 크기, FPS와 길이를 지정한 composition을 만들고 렌더링한다. 기존 HTML을 전달한 사실만으로 이 변환이 끝났다고 보지 않는다.

- **시간 기준:** Remotion 애니메이션은 `useCurrentFrame()`에서 얻은 프레임으로 상태를 계산한다. CSS `animation`, `transition`이나 `setTimeout`에 의존한 움직임은 렌더링 시 깜빡임이나 잘못된 진행 상태를 만들 수 있어 그대로 옮기지 않는다.
- **자막 입력:** `@remotion/captions`의 `parseSrt()`로 기존 SRT를 읽을 수 있다. 음성과 시간 정보가 있는 자막을 함께 전달하면 장면을 맞출 기준이 생긴다. 이 입력만으로 문맥에 맞는 연출이 자동 보장되지는 않는다.
- **결과 확인:** Studio나 CLI에서 렌더링한 파일을 직접 재생해 자막 시점, 음성과 장면 전환, 글꼴과 줄바꿈을 확인한다. 미리보기에서 보였다는 사실과 최종 파일의 검수 완료를 구분한다.

위 흐름은 디자인 인계에 Remotion의 공식 렌더링 원리를 적용한 작업 제안이다. Claude Design과 Remotion 사이의 자동 변환이나 특정 내보내기 기능을 보장하는 설명은 아니다. 2026-10-06에 Remotion의 composition, 자막 가져오기와 렌더링 문서를 대조했으며 실제 영상 제작 성능은 측정하지 않았다.

## 구현 전 확인할 경계

- 로딩, 빈 결과, 권한 부족과 오류 상태가 정의됐는가?
- 화면 크기가 바뀌거나 텍스트가 길어져도 핵심 과업을 수행할 수 있는가?
- 키보드 이동, 초점과 레이블을 포함한 접근성을 확인했는가?
- 디자인에서 사용한 예시 데이터와 운영 데이터의 구분이 명확한가?
- 브리프가 요구하지 않은 흔한 기본값(글꼴, 배경, 카드 중첩)을 이유 없이 그대로 쓰지 않았는가?
- 인계 후 남은 요구사항과 완료 증거를 코드 변경 단위로 설명할 수 있는가?

위 항목은 구현 검토 기준이며 디자인 도구가 자동으로 보장하는 기능 목록은 아니다. 발표 자료와 서비스 구현은 각각의 완료 조건으로 검수한다.

## 출처

- [Introducing Claude Design by Anthropic Labs — Anthropic](https://www.anthropic.com/news/claude-design-anthropic-labs)
- [Claude Design now stays on brand for daily work — Anthropic](https://claude.com/resources/articles/claude-design-stays-on-brand-for-daily-work)
- [Remotion, Composition](https://www.remotion.dev/docs/terminology/composition)
- [Remotion, Don't use CSS animations in Remotion](https://www.remotion.dev/docs/troubleshooting/css-animations)
- [Remotion, Importing .srt subtitles into Remotion](https://www.remotion.dev/docs/captions/importing)
- [Remotion, Render your video](https://www.remotion.dev/docs/render)
- [Improving frontend design through Skills — Anthropic](https://claude.com/blog/improving-frontend-design-through-skills)
- [frontend-design SKILL.md, 2026-09-03 판 — GitHub, anthropics/skills](https://github.com/anthropics/skills/blob/41bbe19d/skills/frontend-design/SKILL.md)
- [Update frontend-design skill (#1293) — GitHub, anthropics/skills](https://github.com/anthropics/skills/commit/2235be7c) — 2026-06 개정
- [pbakaus/impeccable — GitHub](https://github.com/pbakaus/impeccable)
- [pbakaus/impeccable README, 2026-09-07 판 — GitHub](https://github.com/pbakaus/impeccable/blob/ec0928d7/README.md) — 규칙 61개 시점
- [Retire the layout-transition rule (#978) — GitHub, pbakaus/impeccable](https://github.com/pbakaus/impeccable/commit/d98b0be4e18321903b13e69c2f2b5df064cb7623)
- [impeccable SKILL.md — GitHub, pbakaus/impeccable](https://github.com/pbakaus/impeccable/blob/main/.claude/skills/impeccable/SKILL.md)
- [craft-floor.md — GitHub, pbakaus/impeccable](https://github.com/pbakaus/impeccable/blob/main/.claude/skills/impeccable/reference/craft-floor.md)
- [hooks.md — GitHub, pbakaus/impeccable](https://github.com/pbakaus/impeccable/blob/main/.claude/skills/impeccable/reference/hooks.md)
- [Impeccable, FAQ](https://impeccable.style/faq)
- [Changelog — Impeccable](https://impeccable.style/changelog)
- [Impeccable, Automatic design checks](https://impeccable.style/docs/hooks)
- [Impeccable, Run a detector scan](https://impeccable.style/docs/detector)
- [Impeccable, audit](https://impeccable.style/docs/audit)
- [GitHub Copilot app — GitHub](https://github.com/features/ai/github-app)
- [Impeccable Kills AI Design Slop — Better Stack](https://www.youtube.com/watch?v=J1RYxganY20) — 2026-10-10 업로드, 규칙 수 61개는 당시 README의 59개와 다르며 효과 주장의 근거로 사용하지 않음

## 관련 문서

- [[Claude-Code-Business-Automation|문서와 시각 산출물 자동화]]
- [[Claude-Code-Workflows|개발 워크플로우와 완료 조건]]
- [[Agent-Spec-Writing|에이전트에 전달할 요구사항 작성]]
- [[AI-Slop-Quality-Gate|AI 슬롭과 판단 관문]] — 정적 규칙과 사람 판정의 한계
- [[Design-System-Lint|디자인 시스템 lint]] — 테마 토큰과 컴포넌트 계약의 정적 검사
- [[Agent-Skills|에이전트 스킬]] — 필요할 때 불러오는 지침
