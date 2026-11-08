---
tags: [ai, agent, figma, design, handoff, skills]
status: done
verified_at: 2026-11-08
category: "AI엔지니어링(AIEngineering)"
aliases: ["Figma Design Agent", "Figma agent", "Figma 디자인 에이전트", "Figma skills"]
---

# Figma 디자인 에이전트와 스킬

Figma 디자인 에이전트는 Figma Design 파일 안에서 대화로 화면을 만들고 고치는 에이전트다. 스킬은 그 에이전트에게 팀의 작업 방식을 한 번 가르쳐 두고 슬래시 명령으로 다시 부르는 재사용 지시문이다. Figma MCP 서버는 외부 에이전트가 자기 실행 환경에서 Figma 파일을 읽어 코드로 옮기는 통로이며, 2026-03-24 beta로 공개된 `use_figma` 도구로 캔버스의 디자인 자산을 만들고 고칠 수도 있다. 이 도구는 원격 MCP 서버 전용이고, 공개 당시 beta 동안 무료이며 이후 사용량 기반 유료로 바뀐다고 안내되었다. 같은 캔버스를 다뤄도 실행 위치가 다르다. MCP 쪽은 [[Claude-Code-Business-Automation|Claude Code 업무 자동화]]의 시각 산출물 절에 있는 레퍼런스 고정 단계를 본다.

## 에이전트가 파일에서 하는 일

- **호출:** 레이어를 선택하고 Agents를 누르거나 Cmd/Ctrl + Enter로 캔버스 위 입력창을 연다. 왼쪽 탐색의 Agents는 고정 사이드바를 연다. 여러 요청을 동시에 실행할 수 있고 각 요청은 캔버스에 진행 표시를 남긴다.
- **지원 작업:** 새 화면 생성, auto layout과 간격 같은 레이아웃 수정, 컴포넌트 인스턴스와 메인 컴포넌트 편집, 스타일과 변수, 대량 콘텐츠 교체, 이미지, 레이어 이름 정리, 라이브러리와 다른 파일 검색, 댓글 검토와 추가가 도움말의 지원 목록에 있다.
- **디자인 피드백:** 접근성 피드백과 여러 페르소나 관점의 디자인 비평을 요청할 수 있다.
- **미지원과 예정:** 에셋 내보내기와 막대 차트, Sankey 같은 데이터 기반 다이어그램 생성은 지원하지 않으며, 다이어그램은 FigJam의 Figma AI로 안내한다. 벡터 편집, 아이콘 생성, slots와 프로토타입 인터랙션은 예정 항목이다.
- **되돌리기:** Undo는 가장 최근 변경을 되돌리고 Stop은 실행 중인 작업을 멈춘다. 에이전트가 바꾼 내용은 되돌릴 수 있다.

## 권한과 대화 공개 범위

- Full seat이고 파일 편집 권한이 있어야 에이전트에게 편집을 시킬 수 있다. View, Dev, Collab seat이나 보기 권한만 있으면 대화는 되지만 편집은 시킬 수 없고, Draft 파일에서는 누구나 편집을 요청할 수 있다.
- 2026-06-23부터 Figma Design에서 새로 만든 대화는 기본으로 공유된다. 공유 대상은 공식 문서끼리 다르게 적는다. 에이전트 사용 도움말은 Full seat과 편집 권한을 가진 사람으로, 대화 공개 범위 도움말은 파일에 접근할 수 있는 모든 사람으로 적으므로 파일 접근자 전체가 볼 수 있다고 가정한다. 그 전 대화는 공개로 바꾸지 않는 한 비공개로 남는다. More options에서 Shared chat과 Private chat을 고를 수 있고 공개 범위는 대화를 만든 사람만 바꾼다. 이 변경 기능의 대상 plan은 Professional, Education(K-12 제외), Organization, Enterprise로 Starter가 빠져 있다. 민감한 정보를 다루면 비공개로 둔다.
- 웹 검색은 Professional, Education(K-12 제외), Organization, Enterprise plan과 파일 편집 권한이 필요하다.
- 에이전트가 쓰는 credit은 작업 복잡도에 따라 달라지며 도움말은 수치 한도를 적지 않는다.
- 제공 plan은 출처마다 표현이 다르다. 2026-11-08 확인한 도움말은 Starter, Professional, Education(K-12 제외), Organization, Enterprise를 사용 대상으로 적고 일부 기능은 무료 Starter에서 쓸 수 없다고 한다. 2026-07-01 블로그는 Professional 이상 Full seat 대상 open beta이고 beta 동안 무료라고 적었다. 현재 과금은 plan 화면에서 다시 확인한다.

## 스킬

스킬은 평이한 문장으로 쓴 Markdown 지시문 파일이다. 채팅에서 `/`로 부르고, 팀이나 조직에 게시하면 같은 프롬프트를 사람마다 다시 쓰지 않는다. 에이전트에게 디자인 프레임이나 단계를 주어 스킬 초안을 만들게 한 뒤 미리보기로 확인하고 Markdown 편집기로 고칠 수 있다. 스킬은 팀, 조직이나 Figma Community에 게시할 수 있고, 공개 스킬은 Figma Community의 AI skills 페이지에서 찾아 쓸 수 있다.

UI 개발과 핸드오프에 닿는 공개 스킬의 예는 다음과 같다. 에이전트의 기본 기능이 아니라 개별 작성자(Figma 직원 포함)가 만든 스킬이므로 내용과 갱신 여부를 직접 확인한다.

| 스킬 | 하는 일 | 개발에 쓰는 지점 |
|---|---|---|
| `/ui-state-expander` | 화면, 컴포넌트, 흐름을 loading, empty, error, disabled, 부분 데이터와 예외 상태로 펼치고 trigger, 문구, 전환과 구현 메모를 붙인다 | 정상 화면만 받은 구현에서 빠지는 상태를 개발 전에 드러낸다 |
| `/superfuture-design-review` | UX 휴리스틱, 접근성, 위계와 인터랙션 기준으로 검토해 blocker, 권장 수정, 잘된 점으로 나눈다 | 디자이너가 없는 팀의 1차 검토 |
| `/make-a-type-scale` | 선택한 텍스트로 type scale을 만들고 맞는 font 변수를 생성한다 | 글자 크기 규칙을 변수로 고정 |
| `/component-handoff` | 컴포넌트나 컴포넌트 세트를 미리보기, variant 표, 권장과 금지, 상태별 인터랙션과 구조 설명을 담은 문서 프레임으로 만든다 | 구현자나 코딩 에이전트에게 넘길 명세 |
| `/create-color` | 선택한 컴포넌트를 색 명세로 만든다. 보이는 fill, stroke, shadow가 어느 토큰이나 스타일에 대응하는지 정리하고 하드코딩 색을 표시하며 variant와 상태별로 문서화한다 | 구현자에게 넘길 색 명세와 토큰 누락 점검 |

## 운영 체크포인트

- 에이전트가 만든 상태 화면과 리뷰는 제안이다. 문구와 상태 전이는 실제 API 오류, 권한과 업무 규칙과 대조한 뒤 확정한다.
- 핸드오프 프레임은 화면과 상태의 정본일 뿐이다. 데이터, API와 분석 정의는 원래 출처에 두고 링크한다([[Product-Design-Workflow-and-Handoff|프로덕트 디자인 핸드오프]]).
- 대화가 파일 접근자에게 기본 공유되므로 고객 데이터나 미공개 기획을 다루는 대화는 비공개로 바꾸고, 팀 게시 스킬에 내부 정보를 넣지 않는다.
- 스킬은 지시문이라 같은 이름이어도 작성자가 바꾸면 결과가 달라진다. 팀 표준으로 쓰려면 검토한 사본을 팀에 게시한다(적용 제안).

## 출처

- [Figma Help Center, Work with the Figma agent in design files](https://help.figma.com/hc/en-us/articles/37998629035799-Work-with-the-Figma-agent-in-design-files)
- [Figma Help Center, Manage chat visibility for the Figma agent](https://help.figma.com/hc/en-us/articles/41272399602583)
- [Figma Help Center, Find and use skills from the Figma Community](https://help.figma.com/hc/en-us/articles/42287852075543-Find-and-use-skills-from-the-Figma-Community)
- [Figma Developer Docs, Figma MCP server tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
- [Agents, meet the Figma canvas — Figma Blog](https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/) — 2026-03-24
- [Got skills? Make the Figma agent a better collaborator — Figma Blog](https://www.figma.com/blog/got-skills-make-the-figma-agent-a-better-collaborator/) — 2026-07-01
- [Try these 10 skills—and show off your own — Figma Blog](https://www.figma.com/blog/try-these-10-skills-and-show-off-your-own/) — 2026-08-13
- [디자인 몰라도 되는 시대, Figma AI 에이전트 직접 써봤습니다 — ZeroCho TV](https://www.youtube.com/watch?v=QalGd9uErFA) — 2026-10-28, Figma 후원 사용 후기

## 관련 문서

- [[Product-Design-Workflow-and-Handoff|프로덕트 디자인 워크플로와 개발 핸드오프]]
- [[Claude-Code-Business-Automation|Claude Code 업무 자동화]]
- [[AI-Work-Tool-Selection|업무 병목에 맞는 AI와 협업 도구 선택]]
