---
tags: [business, product, design, ux]
status: done
category: "비즈니스&제품(Business&Product)"
aliases: ["Visual Hierarchy", "시각적 위계"]
---

# 시각적 위계 (Visual Hierarchy)

화면의 각 요소에 중요도를 시각적으로 부여해 사용자의 시선을 의도한 순서로 유도하는 설계 원리. 모든 정보가 같은 크기, 색상, 형태면 사용자가 중요도를 스스로 판별해야 해서 피로가 커진다 — 위계를 정하는 일은 곧 화면에서 무엇이 중요한지를 기획 단계에서 결정하는 일이다.

## 위계를 만드는 5가지 방법

| 방법 | 원리 | 적용 예 |
|---|---|---|
| 크기 | 강조 요소를 더 크게 | 상품명, 가격, CTA 버튼의 크기 차등 |
| 색상 | 포인트 컬러와 대비로 시선 집중 | 할인율에 강렬한 색, 배경과의 대비 조절 |
| 질감 | 입체감, 재질 차이로 구분 | 뱃지, 멤버십 마크의 입체 표현 |
| 공간감 | 원근과 그림자로 깊이 표현 | 떠 있는 카드, 그림자로 층 분리 |
| 형태 | 다른 형태로 차별화 | 브랜드는 원형, 상품은 사각형으로 정보 유형 구분 |

형태 강조의 근거는 **폰 레스토프 효과(Von Restorff effect)** — 비슷한 것들 사이에서 형태가 다른 하나가 기억에 남는다.

## 실무 포인트

- **행동의 차이를 명시한다** — 승인과 반려처럼 결과가 다른 액션은 라벨과 배치로 구분하고 색상을 보조로 쓴다. 색상 대비만으로 오조작 방지를 보장하지 않는다.
- **정보 유형은 형태로 구분** — 같은 그리드 안에서 성격이 다른 항목(브랜드 vs 상품)은 도형 자체를 다르게 하면 라벨 없이도 계층이 읽힌다.
- **커머스 상세 페이지의 정석** — 구매 결정 직결 정보(할인율, 가격)를 크기와 색으로 최상위 위계에 둔다.

## 대시보드 정보 위계

SaaS 대시보드처럼 정보가 빽빽한 화면에서 모든 카드에 강한 보더와 배경색을 주면 중요도 차이가 흐려질 수 있다. 이런 화면을 조정할 때 다음을 실무 가설로 비교한다.

- 영역 구분은 여백과 글자 크기, 굵기로 먼저 비교한다. 패딩도 여백을 만드는 수단이므로 일괄 축소하지 않고, 관련 항목 내부 간격과 그룹 사이 간격을 구분한다. 경계를 읽는 데 필요한 보더와 배경은 남긴다.
- 강조색을 핵심 CTA에 집중하는 안을 비교하되 오류, 경고와 선택 상태의 의미를 지우지 않는다. 상태는 텍스트나 형태로도 식별하게 하고, 그레이스케일을 쓰더라도 텍스트와 배경의 대비를 확인한다.
- 한국어 텍스트는 영문 기준 행간과 자간을 그대로 쓰지 말고 조정한다. 이탤릭 글꼴이 없는 한글 글꼴에 이탤릭을 지정하면 브라우저가 글자를 기울여 합성할 수 있어 어색해지므로, 강조는 굵기로 대신한다.

이 지침은 실무 휴리스틱이다. 결과 화면에서 사용자가 가장 먼저 봐야 할 숫자가 실제로 먼저 읽히는지 확인한다.

접근성의 최소 조건은 미감과 따로 확인한다. 2026-10-07 대조한 WCAG 2.2의 SC 1.4.1은 색만으로 정보를 전달하지 않도록 요구한다. SC 1.4.3의 일반 텍스트 최소 대비는 4.5:1이며, 큰 텍스트는 3:1이다. 큰 텍스트 기준은 18pt 이상 또는 굵은 14pt 이상이다. 비활성 컨트롤, 순수 장식과 로고 등에는 예외가 있으나, 읽어야 할 보조 설명을 장식으로 취급해 흐리게 만들지 않는다.

### 타이포그래피

서체는 인기 순위보다 화면에서 맡을 역할, 실제 문자의 판독성과 배포 조건으로 고른다. 아래는 2026-10-07 제작사 안내와 공식 저장소에서 확인한 특성이다. 특정 서체가 전환율이나 브랜드 평가를 높인다는 효과는 검증하지 않았다.

| 서체 | 확인한 특성과 선택 질문 | 공식 배포처 |
|---|---|---|
| Inter | UI부터 큰 제목까지 쓰도록 설계됐고 text와 display optical size, tabular numbers를 제공한다. 작은 본문과 숫자 열을 실제 화면에서 비교한다 | [Inter](https://rsms.me/inter/) |
| Space Grotesk | Space Mono에서 출발한 비례폭 산세리프다. 고정폭 서체로 오해하지 않고 본문 크기에서 글자 간격과 판독성을 확인한다 | [공식 저장소](https://github.com/floriankarsten/space-grotesk) |
| Instrument Serif | 큰 크기를 위한 폭이 좁은 display serif다. 제목 후보로 검토하고 작은 본문에도 적합하다고 자동 확대하지 않는다 | [공식 저장소](https://github.com/Instrument/instrument-serif) |
| Satoshi, General Sans | Fontshare 공식 목록의 검색 색인에서 배포와 Closed Source 표시를 확인했다. 다른 서체와 라이선스가 같다고 가정하지 않는다 | [Satoshi](https://www.fontshare.com/?q=Satoshi), [General Sans](https://www.fontshare.com/?q=General+Sans) |

Inter, Space Grotesk와 Instrument Serif의 공식 배포는 SIL Open Font License 1.1을 명시한다. Satoshi와 General Sans의 개별 라이선스 전문은 확인하지 못했으므로 허용 범위를 여기서 확정하지 않는다. 상업 이용, 수정, 재배포와 웹폰트 자체 호스팅 조건은 실제로 받을 파일의 라이선스로 확인한다. 비용 없이 내려받을 수 있다는 안내와 오픈소스 여부도 구분한다.

실무 비교는 다음 순서로 진행할 수 있다. 이는 제작사의 성능 보장이 아닌 적용 체크리스트다.

1. 제목, 본문, 버튼과 숫자 표 중 서체가 맡을 역할을 정한다.
2. 실제 문구로 작은 화면과 긴 문장, 숫자와 기호를 비교한다.
3. 한국어가 섞이면 한글 지원을 별도로 확인하고, 함께 쓸 한글 서체의 크기와 굵기, 행간을 맞춘다. 영문 후보를 고르는 것만으로 한글 서체를 대체했다고 보지 않는다.
4. 납품 시 폰트 파일의 출처, 버전과 적용 라이선스를 인계한다. 유행이나 특정 기업의 채택 사례만으로 선택을 확정하지 않는다.

## 텍스트 간격과 가독성 (WCAG 2.2)

행간, 문단 간격, 정렬과 줄 길이도 접근성 기준으로 따로 확인한다. 아래는 2026-10-12 W3C 권고안 WCAG 2.2(2024-12-12판)와 W3C의 Understanding, Techniques 문서로 대조한 내용이다.

- **SC 1.4.12 텍스트 간격(AA)**: HTML과 CSS처럼 해당 텍스트 스타일 속성을 바꿀 수 있는 마크업 기반 기술로 구현한 콘텐츠는 행 높이, 문단 뒤 간격, 자간, 단어 간격을 각각 글꼴 크기의 1.5배, 2배, 0.12배, 0.16배 이상으로 모두 설정하고 다른 스타일 속성은 바꾸지 않았을 때 콘텐츠나 기능을 잃지 않아야 한다. 작성자에게 기본 스타일을 이 값으로 정하거나 값을 바꾸는 수단을 제공하라고 요구하지는 않는다. 이 값은 상한이 아닌 기준선이며, 이 속성 중 하나 이상을 쓰지 않는 언어와 문자 체계는 그 조합에 있는 속성만으로 충족할 수 있다.
- **SC 1.4.8 시각적 표현(AAA)**: 텍스트 블록에 대해 사용자의 전경색과 배경색 선택, 80자 또는 글리프 이하의 줄 폭(CJK는 40), 양쪽 정렬하지 않기, 문단 안 행간 1.5줄(space-and-a-half) 이상과 행간의 1.5배 이상인 문단 간격, 보조 기술 없이 200%까지 확대해도 전체 화면 창에서 한 줄을 읽으려고 가로로 스크롤하지 않기를 달성할 수단이 있어야 한다. 콘텐츠가 이 값을 직접 쓸 필요는 없고 브라우저 같은 사용자 에이전트가 수단을 제공해도 된다. 한중일(CJK) 문자는 비CJK 문자보다 폭이 약 두 배라서 최대 줄 폭이 절반이다. 일부 콘텐츠는 모든 AAA 기준을 충족할 수 없어 W3C는 사이트 전체에 AAA 적합성을 일반 정책으로 요구하는 것을 권장하지 않는다.

홈페이지나 랜딩 페이지를 만들 때는 W3C의 충족 기법과 실패 사례에서 다음을 점검한다. 괄호 안은 W3C 문서 번호다.

- 텍스트 컨테이너에는 늘어날 여유를 두거나 컨테이너 자체가 늘어나게 한다. 문단에 높이를 지정하지 않는 것이 그 예시다(C36). 늘어나지 않는 고정 크기 블록에서 `overflow: hidden`, 절대 위치나 빠듯한 테두리 때문에 간격 조정 뒤 글자가 잘리거나 다른 내용과 겹치면 1.4.12 실패다(F104). 단, 아래 말줄임표 항목처럼 전체 텍스트를 볼 수단이 있으면 예외가 될 수 있다.
- 내비게이션 항목처럼 줄 바꿈하지 않을 짧은 텍스트는 컨테이너를 기본 텍스트 폭보다 넓게 잡거나 텍스트 방향으로 늘어나게 한다. 텍스트와 함께 늘어날 상자는 `display: inline-block`을 쓰고 음수 마진을 두지 않는 방법이 있고, 고정 폭이 꼭 필요하면 C35는 기본 최대 폭보다 20% 넓은 값을 안전한 값으로 제시한다.
- 간격 조정으로 말줄임표가 생겨도 포커스나 활성화 때 전체 텍스트를 보여 주거나, 링크가 포함된 영역이면 링크한 페이지에서 전체 텍스트를 볼 수 있으면 충족할 수 있다. 그런 수단 없이 간격을 바꿀 때만 잘리면 실패다.
- 확대 수준 100%에서 사용자 스타일시트, 북마클릿, 확장 프로그램이나 애플리케이션으로 네 값을 덮어쓴 뒤 잘림, 가림과 누락을 확인한다. 반응형처럼 레이아웃이 여러 개면 레이아웃마다 확인한다(C35, C36, F104).
- 본문은 한쪽 정렬로 둔다. 양쪽 정렬의 고르지 않은 단어 간격은 세로로 흐르는 흰 강(rivers of white)을 만들어 읽기를 어렵게 할 수 있으며, W3C는 `text-align: justify` 같은 양쪽 정렬 텍스트를 1.4.8(AAA) 실패로 든다(F88).
- 1.4.8(AAA)의 충족 기법으로 블록 텍스트의 행간을 CSS로 1.5에서 2 사이로 지정하고(C21), 단 너비는 `max-width: 70em`처럼 상대 단위로 정해 창 크기를 바꿨을 때 줄 길이가 평균 80자 이하가 될 수 있게 한다(C20). C20은 80자만 다루므로 한국어처럼 CJK 문자로 쓴 본문은 1.4.8의 40자 기준으로 확인하고, C21이 다루지 않는 문단 간격(행간의 1.5배 이상)도 따로 확인한다.

대시보드 절의 한국어 행간, 자간 조정은 작성자가 정하는 기본값의 문제다. 1.4.12는 그 기본값과 별개로 사용자가 간격을 키웠을 때 콘텐츠와 기능이 유지되는지를 본다.

## 면접 체크포인트

- 어드민, 백오피스 화면 설계에도 그대로 적용된다 — 운영자가 가장 자주 확인하는 정보와 위험한 액션(삭제, 환불 승인)의 위계, 대비 설계.
- 위계 설계의 전제는 우선순위 정의다 — 화면에서 무엇이 중요한지 답하지 못하면 시각 위계도 못 만든다. 기획의 우선순위 결정([[Product-Roadmap|프로덕트 로드맵]])과 같은 축.

## 출처
- [Carbon Design System, Spacing](https://www.carbondesignsystem.com/building-blocks/foundations/spacing/overview)
- [W3C, Understanding SC 1.4.1: Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- [W3C, Understanding SC 1.4.3: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [W3C, Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C, Understanding SC 1.4.12: Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)
- [W3C, Understanding SC 1.4.8: Visual Presentation](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html)
- [W3C, Technique C36: Allowing for text spacing override](https://www.w3.org/WAI/WCAG22/Techniques/css/C36)
- [W3C, Technique C35: Allowing for text spacing without wrapping](https://www.w3.org/WAI/WCAG22/Techniques/css/C35)
- [W3C, Technique C21: Specifying line spacing in CSS](https://www.w3.org/WAI/WCAG22/Techniques/css/C21)
- [W3C, Technique C20: Using relative measurements to set column widths so that lines can average 80 characters or less when the browser is resized](https://www.w3.org/WAI/WCAG22/Techniques/css/C20)
- [W3C, F104: Failure of Success Criterion 1.4.12 due to clipped or overlapped content when text spacing is adjusted](https://www.w3.org/WAI/WCAG22/Techniques/failures/F104)
- [W3C, F88: Failure of Success Criterion 1.4.8 due to using text that is justified (aligned to both the left and the right margins)](https://www.w3.org/WAI/WCAG22/Techniques/failures/F88)
- [시각적 위계를 만드는 5가지 방법 — 쪼렙 서비스기획자 (Brunch)](https://brunch.co.kr/@b30afb04c9f54dc/49)
- [MDN, font-synthesis-style](https://developer.mozilla.org/en-US/docs/Web/CSS/font-synthesis-style)
- [Inter, LICENSE.txt (SIL Open Font License 1.1)](https://github.com/rsms/inter/blob/master/LICENSE.txt)
- [The Inter typeface family — Inter](https://rsms.me/inter/)
- [Space Grotesk — 공식 프로젝트 저장소](https://github.com/floriankarsten/space-grotesk)
- [Instrument Serif — Instrument](https://github.com/Instrument/instrument-serif)
- [Fontshare, Satoshi 목록](https://www.fontshare.com/?q=Satoshi)
- [Fontshare, General Sans 목록](https://www.fontshare.com/?q=General+Sans)

## 관련 문서
- [[Service-Design-Principles|서비스 설계 원칙 (GOV.UK)]] — 일관성, 디자인 시스템
- [[Pagination-Patterns|페이지네이션 UX 패턴]]
- [[UX-Laws|UX 심리학 10가지 법칙]] — 폰 레스토프 효과 포함 전체 법칙
- [[Responsive-Web-Layout|반응형 웹 레이아웃]] — WCAG 2.2 Reflow(SC 1.4.10) 기준
