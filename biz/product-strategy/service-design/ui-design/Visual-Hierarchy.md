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

- **기능의 대비만큼 시각 대비를** — 상충하는 두 액션(구매 vs 판매, 승인 vs 반려)은 색상 대비를 크게 줘서 오조작을 막는다.
- **정보 유형은 형태로 구분** — 같은 그리드 안에서 성격이 다른 항목(브랜드 vs 상품)은 도형 자체를 다르게 하면 라벨 없이도 계층이 읽힌다.
- **커머스 상세 페이지의 정석** — 구매 결정 직결 정보(할인율, 가격)를 크기와 색으로 최상위 위계에 둔다.

## 대시보드 정보 위계

SaaS 대시보드처럼 정보가 빽빽한 화면에서 모든 카드에 강한 보더와 배경색을 주면 중요도 차이가 흐려질 수 있다. 이런 화면을 조정할 때 다음을 실무 가설로 비교한다.

- 영역 구분은 보더, 패딩, 배경색을 최소화하고 여백과 글자 크기, 굵기로 위계를 표현한다.
- 강조색은 화면의 핵심 CTA에만 쓰고, 나머지 정보의 중요도는 그레이스케일 안의 명도 차이로 나눈다.
- 한국어 텍스트는 영문 기준 행간과 자간을 그대로 쓰지 말고 조정한다. 이탤릭 글꼴이 없는 한글 글꼴에 이탤릭을 지정하면 브라우저가 글자를 기울여 합성할 수 있어 어색해지므로, 강조는 굵기로 대신한다.

이 지침은 실무 휴리스틱이다. 결과 화면에서 사용자가 가장 먼저 봐야 할 숫자가 실제로 먼저 읽히는지 확인한다.

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

## 면접 체크포인트

- 어드민, 백오피스 화면 설계에도 그대로 적용된다 — 운영자가 가장 자주 확인하는 정보와 위험한 액션(삭제, 환불 승인)의 위계, 대비 설계.
- 위계 설계의 전제는 우선순위 정의다 — 화면에서 무엇이 중요한지 답하지 못하면 시각 위계도 못 만든다. 기획의 우선순위 결정([[Product-Roadmap|프로덕트 로드맵]])과 같은 축.

## 출처
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
