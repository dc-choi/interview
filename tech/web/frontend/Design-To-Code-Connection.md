---
tags: [web, frontend, design-system, figma, design-token, ai-agent]
status: done
verified_at: 2026-11-18
category: "웹&네트워크(Web&Network)"
aliases: ["Design to Code Connection", "디자인과 코드 연결", "Figma Code Connect", "Design Tokens Format"]
---

# 디자인 산출물과 코드 컴포넌트의 연결

AI로 만든 기획서 HTML, 화면 이미지나 시안은 프로토타입에 머물기 쉽다. 역할별로 나뉜 전문성, 사람마다 다른 스펙 정리 방식, 프롬프트로 세부를 제어하기 어려운 점, 개발 산출물과의 연결을 처음부터 고려하지 않는 점이 함께 작용한다. 결과물이 서비스의 컴포넌트와 토큰을 모르는 것도 그중 하나다. 화면을 그림으로 베낀 결과는 다시 디자인하고 마크업해야 한다. 디자인 도구의 요소와 코드의 컴포넌트, 토큰을 1:1로 대응시켜 두면 AI도 사람과 같은 블록으로 화면을 다시 조립하고, 사람은 처음부터 만드는 대신 결과를 검토하고 보정한다.

## 세 가지 연결 고리

| 고리 | 무엇을 맞추는가 | 대표 수단 |
|---|---|---|
| 어휘 | 컴포넌트를 언제, 무엇을 위해, 어떻게 쓰는지 | 컴포넌트 명세 문서(예: `DESIGN.md`) |
| 값 | 색, 글꼴, 간격, radius와 테마, 반응형 분기 | 디자인 토큰 파일 |
| 대응 | 디자인 도구의 컴포넌트와 코드 컴포넌트, 속성과 prop | Figma Code Connect 같은 매핑 |

세 고리를 갖추면 사람과 AI가 같은 규칙으로 화면을 일관되게 조립할 수 있다. 명세가 없으면 AI가 컴포넌트를 잘못된 맥락에 쓰고, 토큰이 없으면 값이 화면마다 어긋나며, 대응이 없으면 디자인 결과를 코드로 옮길 때 다시 해석해야 한다.

## 토큰 값은 표준 형식으로 둔다

W3C Design Tokens Community Group은 2025-10-28에 형식 명세의 안정 버전 2025.10을 Final Community Group Report로 냈다. Format, Color, Resolver 세 모듈로 구성된다. W3C 표준이나 표준화 트랙 문서가 아니라는 점은 명세 자체에 적혀 있다.

- 토큰: `$value`가 있는 객체가 토큰이며 필수 속성은 `$value`뿐이다. `$type`은 선택이고, 없으면 참조한 토큰이나 가장 가까운 상위 그룹에서 정한다. 어느 쪽으로도 정해지지 않으면 그 토큰은 무효다. 도구가 값 내용을 보고 타입을 추측해서는 안 된다. `$description`, `$deprecated`, `$extensions`도 둘 수 있다.
- 별칭: `"{color.brand}"`처럼 중괄호로 다른 토큰을 참조하고, JSON Pointer를 쓰는 `$ref` 참조도 있다. 토큰과 그룹 이름에는 `{`, `}`, `.`를 쓸 수 없고 `$`로 시작할 수도 없다.
- 파일: 확장자는 `.tokens` 또는 `.tokens.json`을 권장하고, media type은 `application/design-tokens+json`을 쓰도록 권한다.
- 테마: light/dark 같은 여러 맥락은 Format이 아니라 Resolver 모듈이 다룬다. 토큰 집합과 맥락별 modifier, 적용 순서를 `.resolver.json`에 정의한다.

컴포넌트 안에 토큰을 내재화하면 버튼 하나도 색, 글꼴, 간격, radius를 같은 기준으로 받고, 테마와 기기별 분기도 토큰 단계에서 정해진다. 표준 형식은 디자인 도구, 변환기와 코드 사이에서 같은 파일을 읽게 하는 데 의미가 있다. 실제로 쓰는 도구가 어느 버전과 모듈을 지원하는지는 따로 확인한다.

## Figma Code Connect

Code Connect는 저장소의 컴포넌트와 Figma 디자인 파일의 컴포넌트를 연결한다. CLI로 게시한 연결은 Dev Mode Inspect 패널에서 자동 생성 코드 예시 대신 디자인 시스템의 실제 코드 스니펫을 보여 준다. 2026-11-18 Figma 공식 문서 기준이다.

- 설정 방식: CLI는 저장소에서 로컬로 실행하며 속성 매핑과 동적 예시를 정의해 `npx figma connect publish`로 게시한다. 게시에는 Code Connect 쓰기 권한이 있는 access token이 필요하다. UI 방식은 Figma 안에서 GitHub 연결이나 경로 입력으로 컴포넌트를 잇지만 속성 매핑과 동적 예시를 아직 지원하지 않는다. Inspect 패널에는 코드 스니펫 대신 파일명과 컴포넌트명, AI 생성 스니펫 미리보기만 보인다.
- 속성 매핑: 현재 유지되는 방식은 템플릿 파일(`.figma.ts` 또는 `.figma.js`)이며 프레임워크와 무관하게 쓴다. 템플릿에서 `figma.selectedInstance`의 `getEnum`, `getBoolean`, `getString`으로 Figma의 variant와 속성을 읽어 코드 prop으로 옮긴다. React, SwiftUI, Compose 등 프레임워크별 parser의 `figma.enum`, `figma.boolean` 문법은 더 이상 갱신하거나 지원하지 않는다고 문서가 밝히므로 새로 도입할 때 쓰지 않는다.
- AI 에이전트 연동: Figma MCP 서버는 연결된 컴포넌트를 `<CodeConnectSnippet>`으로 감싸 import 문과 스니펫, 속성 매핑을 에이전트에 넘긴다. UI로 만든 연결은 기본 사용법만 생성해 넘긴다. 에이전트가 화면을 그림 대신 검증된 컴포넌트 단위로 코드화하게 만드는 핵심 경로다.
- 요금제: Professional, Organization, Enterprise 등 요금제의 Full 또는 Dev seat에서 쓴다. Professional은 활성 라이브러리 하나와 활성 프레임워크 하나로 제한되고, 활성이 아닌 프레임워크의 연결은 MCP 서버가 반환하지 않는다.

## 사람의 역할을 바꾸는 흐름

1. 입력 전환: 기획서 HTML, 스펙 문서와 화면 이미지를 디자인 도구에서 컴포넌트와 토큰으로 다시 조립한다. 그림을 베끼는 것이 아니라 명세된 블록으로 재구성한다.
2. 보정: 설계자는 정의된 블록을 쓰고 간격과 배치를 조정하는 데 집중한다. 디자인 도구는 자유도가 높아 컴포넌트를 변형하거나 배치 규칙을 어기기 쉬우므로, 규칙 위반을 알려 주는 디자인 도구 플러그인 같은 넛지를 둔다.
3. 코드 생성: 매핑된 컴포넌트는 정해진 코드로, 매핑되지 않은 서비스 고유 영역은 커스텀 컴포넌트로 만든다.
4. 차이 확인: 생성한 화면과 디자인 원본의 차이를 비교해 사람이 확인한다.
5. 검수 범위 축소: 컴포넌트를 변형하지 않고 배치 규칙을 지켰다면 이미 검수한 디자인 시스템 컴포넌트는 다시 보지 않고 커스텀 영역 중심으로 디자인 검수한다.

디자인 시스템 사용률 100%를 목표로 둬도 실제로는 서비스 고유 영역이 남는다. 그래서 커스텀 영역을 만드는 경로와 그 영역만 검수하는 절차를 함께 설계해야 한다.

## 트레이드오프

- 준비 비용: 명세, 토큰, 컴포넌트 정의를 맞추는 일의 대부분은 설계와 개발 관점을 맞추는 협의다. 도구보다 이 합의가 오래 걸린다.
- 프로세스 전환의 현실: 기존 역할 분담 위에서 이미 일하는 조직은 스펙에서 바로 코드로 가는 방식으로 한 번에 바꾸기 어렵다. 익숙한 디자인 도구를 중심에 두고 단계 사이만 자동화해 구성원이 자동화를 먼저 경험하게 하고, 그동안 디자인 시스템 자산을 쌓아 스펙에서 코드로 바로 가는 방식에 다가가는 전략을 쓸 수 있다.
- 도구 의존: 디자인 도구 중심 흐름은 그 도구의 요금제, 매핑 기능 범위와 MCP 연동에 묶인다. 명세와 토큰 파일은 도구 밖에서도 쓸 수 있는 형태로 유지한다.
- 검증 경계: 매핑이 맞아도 상호작용, 엣지 케이스, 크로스 브라우징과 접근성은 컴포넌트 구현에서 따로 보장해야 한다. 정적 검사는 [[Design-System-Lint|디자인 시스템 lint]]가, 화면 검증은 별도 실측이 맡는다.

## 도구가 사람마다 갈라질 때의 일관성

팀 전체가 같은 도구를 같은 순서로 쓰던 방식이 흩어지고 있다는 관찰이 있다. 디자이너마다 스케치, 프롬프트, 구현과 리뷰에 서로 다른 도구를 조합하고, 생각은 메모 앱에 둔다. 2026-11 한 디자인 리더십 칼럼은 그 원인을 새 도구의 우수성보다 사용법을 발견하기 어려운 데서 찾는다. 기능이 프롬프트 뒤에 숨고 바뀐 점이 문서화되지 않아, 각자 작동하는 조각을 모아 자기만의 도구 체인을 만든다는 것이다. 정량 근거 없는 실무자의 관찰이지만 판단에 쓸 구분을 준다.

- **도구 표준화의 한계**: 같은 파일, 라이브러리와 리뷰 절차로 일관성을 얻던 방식은 도구가 사람마다 다르면 작동하지 않는다. 도구 사용은 의무화할 수 있어도 실제 작업 방식까지 강제할 수는 없다. 뛰어난 실무자는 더 효율적이라고 느끼면 의무를 돌아간다는 지적도 있다.
- **도구 아래의 공용 층**: 토큰과 컴포넌트는 쉬운 층이다. 왜 그렇게 정했는지, 제품이 무엇을 위한 것인지, 어떤 느낌이어서는 안 되는지 같은 맥락은 사람의 머리와 아무도 열지 않는 문서에 머물기 쉬운 어려운 층이다. 결정을 내리는 방식도 이 층에 적어 둔다.
- **모든 도구가 읽는 형태**: 이 층은 스케치 도구, 프롬프트 도구와 코딩 에이전트 어디서든 읽혀야 한다. 한 인터페이스로만 소비되는 디자인 시스템은 고객이 하나뿐이다. 위의 어휘, 값과 대응 고리를 도구 밖의 파일로 두는 이유와 같다.
- **검수 대상은 출력**: 작업 흐름은 흩어져도 출시한 결과는 한 조직의 한 관점으로 보여야 한다. 누가 어떤 도구를 썼는지보다 결과가 공용 층을 지켰는지를 본다.

## 사례

NAVER Engineering Day 발표 기준으로, 서비스가 많은 한 금융 서비스 조직은 서비스별이 아니라 디자인 시스템 단계에서 문제를 풀었다. 컴포넌트 명세를 `DESIGN.md`로, 토큰을 DTCG 형식 기반 파일로 정리하고 Figma 컴포넌트와 코드 모듈을 Code Connect로 이었다. 화면 이미지를 Figma 화면으로, Figma 화면을 마크업으로 바꾸는 Claude Code 플러그인과 마크업 차이 비교 도구, 규칙 위반을 알리는 Figma 플러그인을 제공했다. 시연에서는 한 화면의 Figma 구성에 10분 안팎, 한 페이지의 마크업 생성에 5분 정도가 걸렸다고 소개했다. 이 수치는 해당 조직의 시연 조건이며 일반적인 소요 시간이 아니다.

## 체크포인트

- AI 산출물이 프로덕션에 바로 쓰이지 못하는 이유(조직과 스펙 정리 방식의 차이, 컴포넌트와 토큰을 모르는 그림 수준 결과)
- 어휘, 값, 대응의 세 고리가 각각 없을 때 생기는 문제
- DTCG 형식에서 토큰의 필수 속성, 별칭 문법, 테마를 다루는 모듈
- Code Connect의 CLI와 UI 방식 차이, MCP 서버에 넘어가는 정보의 차이
- 커스텀 영역만 검수하도록 범위를 줄이는 조건
- 도구가 사람마다 다를 때 도구 표준화 대신 일관성을 지키는 층과, 그 층을 도구 밖에 두는 이유

## 출처

- [AI 산출물이 프로덕션이 되기까지, AI와 디자인시스템이 함께 일하는 법 — NAVER D2](https://www.youtube.com/watch?v=yY5qf14ddgY)
- ['x is dead' is dead — Design Leadership Memos, Stuart Frisby](https://www.designleadershipmemos.com/p/x-is-dead-is-dead) — 2026-11-09 칼럼, 2026-11-18 본문 대조. 도구 분산의 원인, 표준화의 한계와 공용 층 주장은 데이터 없는 실무자 견해
- [“X는 죽었다”는 말은 죽었다 — GeekNews](https://news.hada.io/topic?id=37382) — 2026-11-18 소개 글, 원문 식별에 사용
- [Figma, Code Connect Introduction](https://developers.figma.com/docs/code-connect/)
- [Figma, Code Connect Quickstart guide](https://developers.figma.com/docs/code-connect/quickstart-guide/)
- [Figma, Comparing Code Connect UI and Code Connect CLI](https://developers.figma.com/docs/code-connect/comparing-cc/)
- [Figma, Connecting React components](https://developers.figma.com/docs/code-connect/react/)
- [Figma, Code Connect integration](https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/)
- [Figma Help Center, Code Connect](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect)
- [Design Tokens Community Group, Technical Reports](https://www.designtokens.org/technical-reports/)
- [Design Tokens Community Group, Design Tokens 2025.10](https://www.designtokens.org/TR/2025.10/)
- [Design Tokens Community Group, Design Tokens Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/)
- [Design Tokens Community Group, Design Tokens Resolver Module 2025.10](https://www.designtokens.org/TR/2025.10/resolver/)

## 관련 문서

- [[Design-System-Lint|디자인 시스템 lint (토큰과 컴포넌트 계약의 정적 검사)]]
- [[Claude-Design-Handoff#디자인 시스템에서 출발한다|DESIGN.md로 넘기는 디자인 시스템]]
- [[Atomic-Design|Atomic Design과 컴포넌트 계층 규칙]]
- [[Storybook|Storybook (컴포넌트 문서와 접근성 검사)]]
