---
tags: [ai, design, prototype, claude-code, handoff]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Design Handoff", "AI 디자인과 구현 인계"]
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
- 인계 후 남은 요구사항과 완료 증거를 코드 변경 단위로 설명할 수 있는가?

위 항목은 구현 검토 기준이며 디자인 도구가 자동으로 보장하는 기능 목록은 아니다. 발표 자료와 서비스 구현은 각각의 완료 조건으로 검수한다.

## 출처

- [Introducing Claude Design by Anthropic Labs — Anthropic](https://www.anthropic.com/news/claude-design-anthropic-labs)
- [Claude Design now stays on brand for daily work — Anthropic](https://claude.com/resources/articles/claude-design-stays-on-brand-for-daily-work)
- [Remotion, Composition](https://www.remotion.dev/docs/terminology/composition)
- [Remotion, Don't use CSS animations in Remotion](https://www.remotion.dev/docs/troubleshooting/css-animations)
- [Remotion, Importing .srt subtitles into Remotion](https://www.remotion.dev/docs/captions/importing)
- [Remotion, Render your video](https://www.remotion.dev/docs/render)

## 관련 문서

- [[Claude-Code-Business-Automation|문서와 시각 산출물 자동화]]
- [[Claude-Code-Workflows|개발 워크플로우와 완료 조건]]
- [[Agent-Spec-Writing|에이전트에 전달할 요구사항 작성]]
