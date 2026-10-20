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
| 질감 | 입체감, 재질 차이로 구분 | 배지, 멤버십 마크의 입체 표현 |
| 공간감 | 원근과 그림자로 깊이 표현 | 떠 있는 카드, 그림자로 층 분리 |
| 형태 | 다른 형태로 차별화 | 브랜드는 원형, 상품은 사각형으로 정보 유형 구분 |

형태 강조의 근거는 **폰 레스토프 효과(Von Restorff effect)** — 비슷한 것들 사이에서 형태가 다른 하나가 기억에 남는다.

## 실무 포인트

- **행동의 차이를 명시한다** — 승인과 반려처럼 결과가 다른 액션은 라벨과 배치로 구분하고 색상을 보조로 쓴다. 색상 대비만으로 오조작 방지를 보장하지 않는다.
- **정보 유형은 형태로 구분** — 같은 그리드 안에서 성격이 다른 항목(브랜드 vs 상품)은 도형 자체를 다르게 하면 라벨 없이도 계층이 읽힌다.
- **커머스 상세 페이지의 정석** — 구매 결정 직결 정보(할인율, 가격)를 크기와 색으로 최상위 위계에 둔다.

## 작은 요소의 강조 절제

배지, 할인율, 버튼처럼 작은 요소마다 강조를 더하면 강조끼리 경쟁해 화면의 위계가 흐려지기 쉽다. 아래는 2026-10-20 대조한 내용이며, 강조의 총량을 줄이는 일과 표시의 종류를 구분하는 일은 따로 판단한다. 구매 결정 정보가 한곳에 모이는 상세 페이지와 같은 카드가 반복되는 목록 화면은 강조할 대상의 수가 다르므로, 앞 절의 커머스 상세 페이지 기준을 목록의 모든 카드에 그대로 옮기지 않는다.

- **강조의 총량:** NN/g(2021-01-17)는 모든 요소에 대비를 주면 아무것도 눈에 띄지 않고, 값이나 채도가 비슷한 색을 많이 쓰면 요소 사이의 위계가 덜 인식되는 경우가 많다고 설명한다. 단순한 화면은 주색 2개와 보조색 2개, 복잡한 화면은 대비 변형 3개 이하로 두고 크게 키울 요소는 최대 2개로 제한하라고 권한다. NN/g(1999-10-16)는 모든 것을 강조하면 아무것도 강조되지 않는다고 하면서도 모든 요소를 똑같이 밋밋하게 만드는 것 역시 그만큼 나쁘다고 본다. 중요도를 여러 단계의 강조나 서로 다른 아이콘으로 나눠 보여 주는 방식은 대개 과하고 사용자가 이해하는 데 품이 많이 든다고 평가한다.
- **상태 표시의 의미와 개수:** GOV.UK Design System은 태그를 상태 표시에만 쓰고 같은 태그를 여러 곳에 쓰면 색을 일관되게 유지하라고 한다. 태그가 늘수록 사용자가 기억하기 어려우므로 통할 만한 최소 개수의 상태로 시작해 사용자 조사로 필요가 확인될 때 늘리라고 하고, 끝낸 부분에만 완료 태그를 붙이면 태그가 없는 부분은 미완료로 이해되듯 상태 하나로 충분한 경우도 있다고 설명한다. Atlassian은 New, Premium 같은 프로모션 라벨까지 포함한 Lozenge를 정확하고 일관되게 쓰고 색은 라벨의 의미에 맞춰 고르라고 하며, 채운 아이콘을 남용하면 중요한 상태 표시의 효과가 줄어든다고 경고한다.
- **구분은 강조와 다르다:** NN/g(2016-08-07)가 모바일 화면의 커머스 목록 2개와 주식 표 2개로 96명을 시험한 연구에서는 표시 종류마다 고유한 아이콘과 색을 함께 준 조건이 측정한 모든 UX 지표에서 가장 좋았고, 텍스트만으로 구분한 조건보다 항목을 약 37% 빨리 찾았다. 색만으로 구분하면 색각 이상 사용자에게 실패할 위험이 있고 해석도 갈릴 수 있다고 본다.
- **배지라는 이름의 범위:** Material Components for Android 문서는 배지를 내비게이션 항목과 아이콘에 붙어 알림, 개수, 상태 정보를 보여 주는 요소로 설명한다. 비슷한 짧은 라벨을 GOV.UK는 Tag, Atlassian은 Lozenge로 다루고, Atlassian은 분류만 하는 설명 메타데이터에는 Tag를 쓰라고 한다. 구현이나 수정을 요청할 때는 컴포넌트 이름과 함께 표시의 의미와 색 규칙을 적는다([[UI-Terminology|UI 용어 정리]]).
- **목록 항목의 일관성:** NN/g(2020-09-06)는 크기를 일관되게 쓰면 유형 묶음이 바로 보여 페이지를 훑기 쉬워진다며 상품 목록 페이지의 항목을 같은 크기와 형태로 두는 예를 들고, 크기나 형태가 다른 항목은 상품 묶음에 속하지 않는 것처럼 눈에 띈다고 설명한다. 같은 색 버튼은 같은 중요도로 인식되므로 주요 행동에는 별도 색을 남겨 두라고 한다. Baymard(2023-08-22)는 비슷한 상품의 목록 항목에 같은 속성을 일관되게 넣고 각 정보 요소를 글자 크기, 색, 굵기와 간격 등으로 구분하라고 권하며, 벤치마크 사이트의 64%가 앞의 기준을, 40%가 뒤의 기준을 충족하지 못했다고 보고한다.
- **썸네일과 그리드:** NN/g(2022-07-17)는 그리드가 일관된 기준점으로 읽기와 훑어보기를 돕고 반복되는 행을 쓰는 모듈 그리드가 커머스와 목록 페이지에 잘 맞는다고 설명한다. 상품 이미지 일부만 여백 쪽에 붙는 배치는 이미지에 집중하거나 빠르게 훑기 어렵게 하고 일부 상품에 주의를 더 끈다고 지적하며, 타당한 이유가 있으면 가끔 그리드를 깨도 된다고 덧붙인다. NN/g(2022-02-27)는 특히 상품 수가 적은 사이트라면 목록 페이지의 상품 사진을 일관되게 두라고 하며, 사진이 똑같을 필요는 없지만 배경, 방향, 맥락, 조명과 배율의 스타일이 일관되면 훑어보고 비교하기 쉽다고 본다. Shopify 도움말은 컬렉션 페이지에서 이미지를 같은 크기로 보이게 하려면 대표 이미지의 가로세로 비율을 일관되게 맞추라고 안내한다. 정사각형처럼 특정 비율을 요구하는 기준은 확인하지 못했다.

**적용 예시(커머스 상품 카드):** 위 자료를 상품 카드에 옮긴 적용 제안이다. 가격과 할인율 중 먼저 읽혀야 할 값과 주 행동 버튼에만 강조색을 두는 안을 비교하고, 찜과 장바구니 버튼이 같은 색이면 같은 중요도로 읽힌다는 점을 함께 본다. 리퍼 상품, 새 상품 같은 상태 배지는 종류와 색, 아이콘을 정해 고정하고, 대부분이 새 상품이라면 예외인 리퍼 상품만 표시하는 안을 검토한다. 판매 수처럼 상태가 아닌 정보는 배지 대신 보조 텍스트로 두는 안을 비교하고, 썸네일은 한 비율로 맞춰 그리드에 정렬한다.

조립한 목록은 실제 상품명과 가격을 넣은 상태에서 흐리게 보거나 눈을 가늘게 떠 강조가 의도한 곳에 모이는지 확인한다. NN/g(2021-01-17)는 이 방법이 디자인에서 강조된 요소와 바탕에 깔린 위계를 드러낸다고 설명한다. 템플릿만이 아니라 채워질 콘텐츠까지 고려하고, 의도대로 읽히는지는 대상 사용자 테스트로 확인하라고 권한다.

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
| Pretendard | Inter, 본고딕(Source Han Sans)과 M PLUS 1p를 바탕으로 다듬은 한글 포함 서체로 9가지 굵기와 가변 글꼴, 웹폰트 용량을 줄이는 동적 서브셋을 제공한다(2026-10-12 확인). 한글과 라틴 문자가 섞인 실제 문구에서 크기와 굵기의 균형을 비교한다 | [공식 저장소](https://github.com/orioncactus/pretendard) |

Inter, Space Grotesk와 Instrument Serif의 공식 배포는 SIL Open Font License 1.1을 명시한다. Pretendard의 LICENSE도 SIL Open Font License 1.1이며 바탕 서체들의 저작권 고지를 함께 담고, README는 글꼴 단독 판매를 제외한 상업적 사용, 수정과 재배포를 허용한다고 안내한다. Satoshi와 General Sans의 개별 라이선스 전문은 확인하지 못했으므로 허용 범위를 여기서 확정하지 않는다. 상업 이용, 수정, 재배포와 웹폰트 자체 호스팅 조건은 실제로 받을 파일의 라이선스로 확인한다. 비용 없이 내려받을 수 있다는 안내와 오픈소스 여부도 구분한다.

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

## UI 스타일과 반투명 재질

플랫, 머티리얼, 글래스모피즘, 뉴모피즘, 네오브루탈리즘처럼 이름이 붙은 스타일은 많지만 업무 화면에서 정할 것은 이름보다 어느 층에 어떤 강도로 적용할지다. 테마는 다음 순서로 정할 수 있다. 이는 적용 제안이다.

1. 첫인상, 기존 로고와 대표색을 따를지, 브랜드를 얼마나 드러낼지, 주 사용 환경, 피할 색과 글자 인상을 먼저 정한다.
2. 이유가 다른 후보 2~3개를 실제 화면 전체에 적용해 비교한다. 대표색은 주요 버튼, 선택 상태와 링크처럼 의미가 있는 곳에 한정하는 안을 검토한다.
3. 스타일 이름만 AI에게 전하면 기본 컴포넌트에 강조색만 바뀐 결과가 나오거나 해석이 어긋날 수 있다. 그 스타일의 구현 전략과 적용 범위를 예시로 먼저 받아 합의한 뒤 적용한다([[Claude-Design-Handoff|생성 UI의 기본값 수렴]]).

반투명 재질은 뒤의 내용이 비쳐야 효과가 나서 데이터를 읽는 면과 부딪히기 쉽다. 2026-10-12에 대조한 플랫폼 지침도 적용 층을 제한한다.

- **Apple HIG(2025-09-09 갱신):** Liquid Glass는 탭 바와 사이드바 같은 조작과 내비게이션 층에 쓰고 콘텐츠 층에는 쓰지 않으며, 사용자 지정 컨트롤에도 아껴 쓰라고 한다. 콘텐츠 층에는 표준 재질을 쓰고, 더 불투명한 두꺼운 재질이 가는 글자와 세밀한 요소의 대비에 유리하다고 설명한다. 투명도 감소나 대비 증가 설정을 켜면 모양이 달라진다.
- **Microsoft Acrylic(2026-10-02 갱신):** 컨텍스트 메뉴, 플라이아웃, 비모달 팝업 같은 일시적 표면과 콘텐츠 위에 겹치는 보조 패널에 권하고, 콘텐츠를 구획하는 세로 패널에는 불투명 배경을 권한다. 앱의 넓은 배경에는 데스크톱 Acrylic을 깔지 말라고 한다. Acrylic 위의 강조색 텍스트는 권하지 않고 하이퍼링크도 피하라고 하며, 사용자가 투명 효과를 끄거나 배터리 절약 모드가 켜지면 단색으로 바뀐다.
- **NN/g(2024-06-07):** 글래스모피즘을 아껴 쓰고 텍스트 대비 기준을 지키며, 배경이 복잡할수록 흐림을 키우라고 권한다.

업무 대시보드라면 헤더, 내비게이션, 필터와 팝업처럼 조작과 일시적 표면에 절제해 쓰고 표와 데이터 카드는 불투명하게 두는 구성이 이 지침과 맞는다. 요약 카드처럼 콘텐츠에 가까운 영역에 쓰려면 읽기 대비를 먼저 확인하고, 대표색 링크를 반투명 면 위에 둘 때도 대비를 따로 측정한다. 웹의 `prefers-reduced-transparency` 미디어 쿼리는 MDN 기준 실험적 기능이고 널리 쓰이는 브라우저 일부에서 동작하지 않으므로, 이 설정에 기대지 말고 기본 상태에서 대비 기준을 충족시킨다.

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
- [Pretendard — 공식 프로젝트 저장소](https://github.com/orioncactus/pretendard) — 2026-10-12 README와 LICENSE 확인
- [Apple Human Interface Guidelines, Materials](https://developer.apple.com/design/human-interface-guidelines/materials) — 2026-10-12 확인, 2025-09-09 Liquid Glass 지침 갱신판
- [Microsoft Learn, Acrylic material](https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic) — 2026-10-12 확인, 2026-10-02 갱신판
- [Glassmorphism: Definition and Best Practices — Nielsen Norman Group, Megan Brown](https://www.nngroup.com/articles/glassmorphism/)
- [MDN, prefers-reduced-transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency) — 2026-10-12 확인, Experimental과 Limited availability 표시
- [YouTube, 양실장의 바이브코딩대학, 직장인 2시간 필수 투자) 평생 써먹는 바이브코딩 자동화 대시보드 설계부터 구축까지](https://www.youtube.com/watch?v=sozxBiyc3qQ) — 2026-08-20 공개 강의, 1:49:25~2:04:32의 테마 결정 인터뷰와 절제형 글래스모피즘 적용 시연. 스타일 이름은 발표자가 화면에 띄운 블로그 목록에서 나왔으므로 재질 지침은 위 공식 문서와 NN/g로 대조했다.
- [Visual Hierarchy in UX: Definition — Nielsen Norman Group, Kelley Gordon](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/) — 2021-01-17 게시
- [Prioritize: Good Content Bubbles to the Top — Nielsen Norman Group, Jakob Nielsen](https://www.nngroup.com/articles/prioritize-good-content-bubbles-to-the-top/) — 1999-10-16 게시
- [Visual Indicators to Differentiate Items in a List — Nielsen Norman Group, Aurora Harley](https://www.nngroup.com/articles/visual-indicators-differentiators/) — 2016-08-07 게시
- [Similarity Principle in Visual Design — Nielsen Norman Group, Aurora Harley](https://www.nngroup.com/articles/gestalt-similarity/) — 2020-09-06 게시
- [Using Grids in Interface Designs — Nielsen Norman Group, Kelley Gordon](https://www.nngroup.com/articles/using-grids-in-interface-designs/) — 2022-07-17 게시
- [6 Tips for Product Photos on Listing Pages — Nielsen Norman Group, Kate Moran](https://www.nngroup.com/articles/product-photos-listing-pages/) — 2022-02-27 게시
- [2 Key Design Principles for Product Listing Information (64% Get at Least 1 Wrong) — Baymard Institute, Iva Olah](https://baymard.com/blog/list-item-design-ecommerce) — 2023-08-22 게시
- [GOV.UK Design System, Tag](https://design-system.service.gov.uk/components/tag/) — 2026-10-20 확인
- [Atlassian Design System, Lozenge](https://atlassian.design/components/lozenge/usage) — 2026-10-20 확인, Usage 탭
- [Material Components for Android, Badges](https://github.com/material-components/material-components-android/blob/master/docs/components/BadgeDrawable.md) — 2026-10-20 확인. Material Design 3 사양 페이지는 본문을 불러오지 못해 이 구현 문서로 대조했다
- [Shopify Help Center, Product media types](https://help.shopify.com/en/manual/products/product-media/product-media-types) — 2026-10-20 확인

## 관련 문서
- [[Service-Design-Principles|서비스 설계 원칙 (GOV.UK)]] — 일관성, 디자인 시스템
- [[Pagination-Patterns|페이지네이션 UX 패턴]]
- [[UX-Laws|UX 심리학 10가지 법칙]] — 폰 레스토프 효과 포함 전체 법칙
- [[Responsive-Web-Layout|반응형 웹 레이아웃]] — WCAG 2.2 Reflow(SC 1.4.10) 기준
- [[Backoffice-Workflow-Design|업무용 제품의 처리 흐름 설계]] — 정보 구조, 화면별 목표와 업무 대시보드의 테마 결정 순서
