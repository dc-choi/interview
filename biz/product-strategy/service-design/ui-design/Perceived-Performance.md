---
tags: [business, product, design, ux, performance]
status: done
category: "비즈니스&제품(Business&Product)"
aliases: ["Perceived Performance", "지각된 성능", "체감 속도", "Skeleton Screen"]
---

# 지각된 성능과 로딩 상태 설계 (Perceived Performance)

지각된 성능은 웹사이트의 성능, 반응성과 신뢰성을 주관적으로 잰 척도로, 사이트가 사용자에게 얼마나 빠르게 보이는지를 뜻한다. 실제 처리 속도보다 정량화하고 측정하기 어렵고, 사용자가 어떻게 느끼는지를 한 번에 평가하는 단일 지표나 테스트는 없다. 같은 시간을 기다려도 그동안 무엇을 보여 주느냐에 따라 사이트가 반응하는 느낌과 사용자가 기다릴 의향이 달라질 수 있다.

## 시간 줄이기와 기다림 보여 주기는 함께 쓴다

- **실제 시간 줄이기**: 첫 화면에서 바로 상호작용할 콘텐츠를 먼저 받고 나머지는 뒤에서 받는다. 첫 로드에 쓰이지 않거나 보이지 않는 이미지, iframe, 미디어와 스크립트는 지연 로드한다. 캐시와 이전 데이터 먼저 표시는 [[React-Server-State-and-API|React server state와 API]]에서 다룬다.
- **기다림 보여 주기**: 요청을 받았다는 피드백, 진행 표시와 스켈레톤으로 시스템 상태를 알린다. MDN은 이렇게 해도 완료 시간은 그대로지만 사이트가 더 잘 반응하는 것처럼 느껴지고 사용자는 작업이 진행 중임을 안다고 설명한다.

둘은 서로를 대신하지 않는다. 스켈레톤 화면은 성능 최적화를 대체하지 않으며, 최적화한 뒤에도 남는 대기에는 무엇을 보여 줄지 정해야 한다. 대기가 1초를 넘을 수 있는데 빈 화면만 두면 로딩 중인지 멈췄는지 구별할 단서가 없어, 적절한 피드백으로 시스템 상태를 적절한 시간 안에 알리라는 Nielsen Norman Group(NN/g)의 첫 번째 사용성 휴리스틱과 어긋난다.

## 대기 시간별 피드백 선택

대기는 사용자가 탭, 클릭이나 키 입력으로 동작을 시작한 순간부터 시작되므로 요청을 받았다는 시각 피드백은 곧바로 준다. 그 뒤의 표시는 예상 대기 길이로 고른다. 아래 표는 NN/g의 응답 시간 기준(1993년, 2014년 보완)과 진행 표시 지침(2014년)을 묶었다. 수십 년 거의 그대로 유지된 경험칙이지 제품의 성능 목표가 아니므로, 응답 목표는 실제 사용자 경로를 측정해 정한다([[UX-Laws|UX 심리학 법칙]]의 도허티 임계와 같은 관점).

| 예상 대기 | 사용자에게 미치는 영향 | 피드백 |
|---|---|---|
| 약 0.1초 이내 | 시스템이 즉시 반응한다고 느끼는 한계 | 결과 표시 외 별도 피드백이 필요 없다 |
| 0.1~1초 | 지연은 알아차리지만 생각의 흐름은 이어지는 한계 | 진행 표시는 보통 필요 없다. 1초 미만 작업에 반복 애니메이션을 띄우면 무엇이 깜박였는지 따라가지 못해 산만하고 불안할 수 있다 |
| 약 1~10초 | 생각의 흐름이 끊길 수 있다 | 진행 표시를 쓴다. 반복 애니메이션(스피너)은 2~10초 작업에 둔다. 전체 페이지 로드라면 스켈레톤도 후보다 |
| 약 10초 이상 | 작업 화면에 주의를 붙잡아 둘 수 있는 한계를 넘어 다른 일을 하고 싶어진다 | 진행률(percent-done) 표시와 대략적인 완료 예상을 주고, 작업을 중단할 수단을 눈에 띄게 둔다 |

- 10초 미만이어도 문서나 레코드 묶음처럼 처리 개수가 정해진 작업은 진행률 표시를 쓸 수 있다.
- 완료 예상은 대략으로 알린다. 정확한 시간을 약속하면 언젠가 빗나가 신뢰가 떨어진다. 비율을 계산하기 어려우면 단계 수를 보여 준다.
- NN/g가 소개한 웹페이지 로딩 실험에서 움직이는 피드백 막대를 본 참가자는 아무 진행 표시도 보지 않은 참가자보다 만족도가 높았고, 평균 3배 더 오래 기다릴 의향을 보였다.
- NN/g의 2014년 진행 표시 지침과 2023년 스켈레톤 지침은 모두 반복 애니메이션(스피너)이 2~10초 대기에 가장 알맞다고 본다. 2023년 지침은 10초 미만이면 스켈레톤과 스피너를 모두 쓸 수 있고 1초 미만이면 둘 다 필요 없다고도 적으므로, 1~2초 구간은 권장이 아니라 허용 범위로 읽는다. 아래 M3 loading indicator의 5초는 그 컴포넌트에만 해당한다.

컴포넌트는 진행량을 아는지로 고른다. Material 3 사양을 따르는 Material Components for Android 문서(2026-10-20 확인)는 진행량과 대기 시간을 알면 determinate를, 모르면 indeterminate를 쓰라고 하며, indeterminate에서 determinate로 전환할 수 있다. 같은 라이브러리의 loading indicator 문서 기준으로 M3 Expressive의 loading indicator는 5초 안에 끝나는 짧은 대기용이고, indeterminate에서 determinate로 바뀔 수 있는 작업에는 progress indicator를 쓴다. 같은 종류의 작업은 앱 안에서 선형과 원형 중 한 가지로만 표시한다. Material Web은 진행 표시에 aria-label로 이름을 붙이라고 안내한다.

## 스켈레톤 화면의 조건과 한계

스켈레톤 화면은 최종 페이지의 레이아웃을 흉내 낸 와이어프레임 형태의 자리 표시로 페이지가 로딩 중임을 알린다. 회색 상자로 콘텐츠와 이미지 자리를 표시하는 정적형, 그라데이션이나 요소가 나타났다 사라지는 맥박형 움직임을 넣은 애니메이션형, 헤더와 푸터 같은 틀만 그리는 프레임형이 있다. 아래 조건은 NN/g 지침(2023-06-04 게시, 2026-09-02 재검토)에서 확인했다.

- **전체 페이지 로드에 쓴다.** 다운로드, 업로드, 파일 변환 같은 처리에는 맞지 않고 혼란을 줄 수 있으므로 진행 막대나 단계형 마법사를 쓴다.
- **대기 10초 미만에 쓴다.** 1초 안에 뜨는 페이지에는 스켈레톤도 스피너도 필요 없고, 10초를 넘는 페이지는 진행 막대로 남은 시간을 알린다.
- **기다리는 범위로 고른다.** 동영상이나 대시보드 카드처럼 한 모듈만 기다리면 스피너, 전체 화면이 로딩 중이면 스켈레톤이 낫다. 10초 미만이면 둘 다 쓸 수 있다.
- **프레임형은 피한다.** 헤더, 푸터와 배경만 그리는 스켈레톤은 레이아웃 정보를 주지 않아, 오래 기다린 사용자가 페이지가 고장 났다고 여기고 떠날 수 있다.
- **애니메이션은 득실을 함께 본다.** 맥박형 애니메이션은 스피너처럼 사용자를 붙잡아 긴 로딩의 체감을 줄이는 쪽으로 쓰이지만, 산만하거나 거슬릴 수 있고 일부 사용자에게 접근성 문제를 만들 수 있다.

스트리밍처럼 첫 로드 중 영역별로 채워지는 fallback은 전체 페이지 로드의 일부로 보고, 상호작용 뒤 한 모듈만 다시 받을 때는 스피너나 기존 내용을 흐리게 두는 방식을 쓰는 해석이 위 조건과 맞는다. 이는 적용 해석이다.

스켈레톤이 대기를 짧게 느끼게 한다는 설명은 NN/g 지침에 있지만 참고 문헌으로 든 연구의 결과는 함께 제시되지 않는다. 그 연구인 Mejtoft 외(2018)의 초록은 스켈레톤이 스피너보다 체감 속도의 평균 점수가 높았지만 유의한 차이는 보이지 못했다고 적는다. Viget의 2017년 모바일 테스트(136명)는 같은 길이의 대기에서 스켈레톤의 체감 대기가 스피너와 빈 화면보다 길었다고 보고했지만 유의성 검정은 제시하지 않았다. 근거가 적고 결과가 엇갈리므로 어느 쪽이 더 빠르게 느껴진다고 단정하지 않는다.

### 공간 예약

- 스켈레톤의 크기와 배치는 최종 UI와 맞춘다. 늦게 들어온 콘텐츠가 기존 내용을 밀어내면 페이지가 아직 로딩 중인 것처럼 느껴지고 CLS도 나빠진다.
- 이미지와 동영상에는 width와 height 속성을 넣거나 CSS aspect-ratio로 자리를 잡는다. 높이가 달라질 수 있는 영역은 min-height로 최소 공간을 잡고 필요하면 늘어나게 한다.
- 화면 위아래에 끼어드는 배너처럼 나중에 나타나는 UI는 자리 표시나 스켈레톤으로 공간을 미리 잡거나, 문서 흐름 밖에서 콘텐츠 위에 겹쳐 띄운다. 광고처럼 비어 올 수 있는 영역은 예약한 공간을 접지 말고 자리 표시를 남긴다.
- 클릭 뒤 네트워크 요청이 오래 걸릴 수 있으면 곧바로 공간을 만들고 로딩 표시를 띄운다. 로딩 중임을 모르는 사용자는 기다리며 다른 것을 누르려다 움직이는 요소를 잘못 누를 수 있다.

## 측정

Core Web Vitals는 실제 로딩, 상호작용 반응성과 시각적 안정성을 측정한다. 아래 기준은 2026-10-20 확인한 web.dev 문서(Web Vitals 2024-10-31 갱신판과 지표별 문서)다. web.dev는 정의와 기준값을 안정적으로 유지하고, 바꿀 때는 사전 예고를 거쳐 예측 가능한 연 단위 주기로 바꾼다고 설명한다.

| 지표 | 보는 것 | 좋음 | 나쁨 |
|---|---|---|---|
| LCP | 뷰포트에서 가장 큰 이미지, 텍스트 블록, 동영상이 그려진 시각 | 2.5초 이하 | 4초 초과 |
| INP | 방문 중 클릭, 탭, 키보드 상호작용이 다음 화면을 그리기까지의 지연 | 200ms 이하 | 500ms 초과 |
| CLS | 예상하지 못한 레이아웃 이동으로 본 시각적 안정성 | 0.1 이하 | 0.25 초과 |

판정은 모바일과 데스크톱을 나눠 페이지 로드의 75번째 백분위로 한다. 점수는 사용자 상호작용의 영향을 받으므로 전체 그림은 현장 측정으로 확인한다. 방문이 적어 공개 현장 데이터가 없는 신규 사이트는 직접 수집한 현장 데이터로 확인하고 실험실 측정은 원인 진단에 쓴다.

- **LCP**: 실제 콘텐츠가 그려지면 더 큰 요소로 값이 갱신된다. CSS 그라데이션은 LCP 후보가 아니고(배경 이미지는 url()로 불러온 것만 후보), Chromium 계열은 엔트로피가 낮은 자리 표시 이미지도 콘텐츠가 아닌 것으로 보고 뺀다. 스켈레톤을 띄웠다고 LCP가 좋아졌다고 보지 않는다.
- **INP**: 네트워크 응답 같은 상호작용의 최종 결과가 아니라 다음 페인트가 막힌 시간을 본다. web.dev는 복잡한 상호작용일수록 무언가 진행 중임을 알리는 초기 시각 피드백을 빨리 보여 주라고 안내하므로 클릭 직후 초기 시각 피드백을 그리는 설계와 맞는다. 작업 완료 시간은 API와 서버 지연으로 따로 측정한다.
- **체감**: 지표가 좋아져도 사용자가 빠르다고 느끼는지는 별개의 질문이다. 로딩 화면을 바꾼 효과는 사용자 테스트로 따로 확인한다.

## 적용 예시: 상품 목록 홈페이지

외주로 만드는 상품 목록 홈페이지라면 다음 순서로 정할 수 있다. 위 지침을 조합한 적용 제안이다.

1. 실제 시간을 먼저 줄인다. 첫 화면의 배너와 첫 줄 상품을 먼저 받고 화면 밖 이미지는 지연 로드한다.
2. 헤더와 내비게이션은 바로 그린다. 상품 그리드를 클라이언트에서 받아 1초를 넘길 수 있으면 첫 화면에 들어갈 카드 수와 비율에 맞춘 스켈레톤 카드를 둔다. 상품 이미지에는 width와 height 또는 aspect-ratio를 준다.
3. 필터나 정렬을 바꾸면 클릭 즉시 선택한 필터를 표시하고, 기존 목록은 높이를 유지한 채 흐리게 두는 식으로 요청을 받았음을 알린다. 대기가 1초를 넘을 수 있을 때만 진행 표시를 더한다. 목록 전체를 다시 받으면 목록 영역에, 위젯 하나만 다시 받으면 그 모듈 안에 스피너를 두는 것으로 충분하다([[NextJS-Interactive-Feedback|Next.js 상호작용 피드백]]).
4. 관리자 화면의 상품 이미지 업로드는 스켈레톤이 아니라 진행률 막대로 보여 주고, 여러 파일이면 처리한 개수를 알린다.
5. 배포 뒤 LCP, INP와 CLS를 현장 데이터로 확인하고, 로딩 화면의 체감 효과는 사용자 테스트로 본다.

## 트레이드오프

| 선택 | 얻는 것 | 비용과 위험 |
|---|---|---|
| 빈 화면 | 구현할 것이 없다 | 로딩 중인지 알 수 없다. 오래 기다린 사용자는 고장으로 여기고 떠날 수 있다 |
| 스피너 | 단순하고 모듈 단위로 붙이기 쉽다 | 얼마나 기다릴지 알려 주지 않는다. 1초 미만이면 깜박이고, 10초를 넘으면 진척이 없다고 느껴 조바심이 커진다 |
| 스켈레톤 | 화면 구조를 먼저 보여 주고 공간을 예약한다 | 최종 레이아웃을 흉내 내야 해 함께 관리해야 하고, 크기가 어긋나면 교체할 때 레이아웃 이동이 생긴다 |
| 진행률 막대 | 진행한 양과 남은 양을 알려 준다 | 진행량을 계산하기 어렵고, 빗나간 예상은 신뢰를 떨어뜨린다 |

## 적용 점검

- 대기 시간을 줄이는 작업과 대기를 보여 주는 작업을 따로 정했는가
- 동작 직후 요청을 받았다는 피드백이 보이고, 1초 미만 동작에서 스피너가 깜박이지 않는가
- 진행량을 아는지에 따라 determinate와 indeterminate를 골랐는가
- 스켈레톤은 전체 화면 로드(첫 로드 중 영역별 fallback 포함)에만 쓰고, 상호작용 뒤 한 모듈만 다시 받을 때는 스피너나 기존 내용 흐리게 두기를 쓰며, 최종 UI와 같은 크기로 공간을 예약했는가
- 업로드와 변환에 진행률이나 단계 수를 보여 주고, 10초를 넘는 작업에는 대략적인 완료 예상과 중단 수단이 있는가
- 같은 종류의 작업에 같은 표시를 쓰고 진행 표시에 이름을 붙였는가
- LCP, INP와 CLS를 75번째 백분위 현장 데이터로 보고, 체감 효과는 사용자 테스트로 따로 확인하는가

## 출처

- [Response Times: The 3 Important Limits — Nielsen Norman Group, Jakob Nielsen](https://www.nngroup.com/articles/response-times-3-important-limits/) — 1993년 게시, 2014년 보완
- [Progress Indicators Make a Slow System Less Insufferable — Nielsen Norman Group, Katie Sherwin](https://www.nngroup.com/articles/progress-indicators/) — 2014-10-26 게시
- [Skeleton Screens 101 — Nielsen Norman Group, Samhita Tankala](https://www.nngroup.com/articles/skeleton-screens/) — 2023-06-04 게시, 2026-09-02 재검토
- [10 Usability Heuristics for User Interface Design — Nielsen Norman Group, Jakob Nielsen](https://www.nngroup.com/articles/ten-usability-heuristics/) — 1994-04-24 게시, 2024-01-30 재검토
- [The effect of skeleton screens: Users' perception of speed and ease of navigation — ACM Digital Library, Thomas Mejtoft, Arvid Långström, Ulrik Söderström](https://doi.org/10.1145/3232078.3232086) — 2018년 ECCE 발표, 초록만 확인
- [A Bone to Pick with Skeleton Screens — Viget](https://www.viget.com/articles/a-bone-to-pick-with-skeleton-screens/) — 2017-10-19 게시, 유의성 검정 미제시
- [MDN, Perceived performance](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/Perceived_performance) — 2026-09-04 수정판
- [Web Vitals — web.dev](https://web.dev/articles/vitals) — 2024-10-31 갱신
- [Largest Contentful Paint (LCP) — web.dev](https://web.dev/articles/lcp) — 2025-09-04 갱신
- [Interaction to Next Paint (INP) — web.dev](https://web.dev/articles/inp) — 2025-09-02 갱신
- [Cumulative Layout Shift (CLS) — web.dev](https://web.dev/articles/cls) — 2023-04-12 갱신
- [Optimize Cumulative Layout Shift — web.dev](https://web.dev/articles/optimize-cls) — 2025-02-07 갱신
- [Material Components for Android, Progress indicators](https://github.com/material-components/material-components-android/blob/master/docs/components/ProgressIndicator.md) — 2026-10-20 확인
- [Material Components for Android, Loading indicators](https://github.com/material-components/material-components-android/blob/master/docs/components/LoadingIndicator.md) — 2026-10-20 확인
- [Material Web, Progress indicators](https://material-web.dev/components/progress/) — 2026-10-20 확인

## 관련 문서

- [[UX-Laws|UX 심리학 10가지 법칙]] — 도허티 임계를 역사적 휴리스틱으로 보는 응답 시간 관점
- [[Pagination-Patterns|페이지네이션 UX 패턴]] — 추가 로드의 로딩 상태와 접근성
- [[React-Server-State-and-API|React server state와 API]] — 대기를 줄이는 cache, prefetch와 loading 분기
- [[NextJS-Streaming|Next.js Streaming과 Suspense 배치]] — fallback 크기 예약과 지표별 측정
- [[NextJS-Interactive-Feedback|Next.js 상호작용 피드백]] — 기존 내용을 유지하며 대기를 알리는 필터 패턴
- [[Visual-Hierarchy|시각적 위계]]
- [[UI-Screen-Design|화면 UI 설계]]
