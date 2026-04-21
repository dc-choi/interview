---
tags: [business, product, ux, seo, web]
status: done
category: "Business - 제품 전략"
aliases: ["Pagination", "Infinite Scroll", "Load More", "페이지네이션", "무한 스크롤", "로드 더보기"]
---

# 페이지네이션 UX 패턴 (Pagination · Load More · Infinite Scroll)

긴 목록을 여러 화면으로 나눠 보여주는 세 가지 대표 패턴. **사용자가 검색결과의 전체 크기를 인지해야 하는가**, **SEO로 크롤링되어야 하는가**, **결과셋 규모가 얼마나 큰가**가 선택의 핵심 기준이다.

## 세 가지 패턴 비교

| 패턴 | 인터랙션 | 전체 크기 인지 | 페이지 전환 | 대량 결과셋 |
|---|---|---|---|---|
| **Pagination** | '다음'·'이전'·페이지 번호 | ✅ 명확 (N/M 페이지) | 새 페이지 로드 | ✅ OK |
| **Load More** | 버튼 클릭 시 추가 로드 | ⚠️ 총 개수는 표시 가능 | 현재 페이지 유지 | ❌ 한계 |
| **Infinite Scroll** | 스크롤 끝에서 자동 로드 | ❌ 불명확 | 현재 페이지 유지 | ❌ 한계 |

## 각 패턴의 특성

### Pagination

- **장점**: 현재 위치·전체 규모를 숫자로 제공. SEO 친화적 (각 페이지에 고유 URL). 특정 항목으로 되돌아가기 쉬움
- **단점**: 제어가 복잡하게 느껴질 수 있음. 페이지 전환마다 로드 대기. 콘텐츠가 여러 페이지에 분산

### Load More

- **장점**: 단일 페이지 유지로 스크롤 맥락 유지. 총 개수("결과 5,000개 중 20개")를 상단에 표시 가능. 자동 로드가 아니므로 사용자 통제권 유지
- **단점**: 결과가 매우 많으면 DOM이 비대해져 성능 저하. 공유·딥링크 시 위치 복원이 어려움

### Infinite Scroll

- **장점**: 직관적이고 연속적인 탐색. 피드·소셜 타임라인처럼 **전체를 다 보는 게 목적이 아닌** UX에 적합
- **단점**: 끝이 안 보여 **사용자 피로** 유발. 푸터 접근이 어려움(푸터가 계속 밀림). 뒤로가기 시 스크롤 위치 복원이 까다로움. DOM 비대화

## 선택 기준 (상황 → 패턴)

| 상황 | 권장 패턴 | 근거 |
|---|---|---|
| 검색결과·상품 목록처럼 **전체 규모**를 사용자가 알아야 함 | Pagination | 현재 위치/총 페이지 표시 |
| **이커머스 카테고리 페이지**(SEO 중요) | Pagination | 각 페이지 고유 URL로 크롤링 |
| 연속 탐색이 핵심인 **피드·타임라인** | Infinite Scroll | 끝 없는 탐색 맥락 |
| **중간 규모** 결과 + 사용자 통제감 우선 | Load More | 자동 로드 없음, 총 개수 명시 |
| **대규모** 결과셋 | Pagination | Load More / Infinite Scroll은 DOM 한계 |
| **모바일 우선** + 짧은 세션 | Infinite Scroll | 탭·클릭 비용 최소화 |

## SEO 고려사항

### URL 구조

- 각 페이지에 **고유 URL** 부여 (예: `?page=2`, `/category/books?p=2`)
- URL 프래그먼트(`#page=2`) 금지 — 검색엔진이 무시
- 첫 페이지를 다른 페이지의 canonical로 지정하지 말 것 — **각 페이지가 자기 자신을 canonical**로 가져야 함
- 필터·정렬 URL은 `noindex` 또는 `robots.txt`로 색인 제어 (동일 콘텐츠 중복 방지)

### 링크 구조

- **순차적 `<a href>` 링크**로 페이지 간 연결 → 크롤러가 관계를 이해
- 모든 페이지에서 **첫 페이지로 되돌아가는 링크** 제공 → 시작 페이지 중요도 강조
- 제목·설명은 페이지마다 동일해도 OK (검색엔진이 순서로 인식)

### JavaScript 기반 구현 시

Load More·Infinite Scroll은 보통 JS로 구현되는데, **Google 크롤러는 버튼을 클릭하지 않고**, 사용자 인터랙션으로 트리거되는 JS 함수를 실행하지 않는다. 대응:

- **사이트맵 파일**에 모든 페이지 URL을 명시
- **이커머스**는 Google 판매자 센터 피드 활용
- Progressive Enhancement: JS 없이도 페이지네이션 URL이 동작하도록 설계 (push state + 서버 렌더링)

## 접근성 (A11y)

- **Pagination**: 네비게이션은 `<nav aria-label="Pagination">` 역할 명시, 현재 페이지는 `aria-current="page"`
- **Load More**: 버튼 라벨에 다음 로드 개수 명시(`다음 20개 불러오기`), 로드 중 `aria-busy`·라이브 리전으로 상태 공지
- **Infinite Scroll**: **스크린리더 사용자에게 부담**. 최소한 `로드 더보기` 대체 버튼을 함께 제공하거나 키보드 단축키로 다음 배치 로드 지원

## 구현 시 실전 체크

- **스크롤 위치 복원**: 뒤로가기 시 원래 위치로 돌아가야 함. Load More·Infinite Scroll은 상태 관리 필수 (URL 쿼리 파라미터 또는 세션 스토리지)
- **성능**: 결과셋이 수백 개 넘어가면 **virtualization** (react-virtualized, react-window) 필수. 안 하면 DOM 노드 급증
- **프리페치**: 다음 페이지를 백그라운드로 미리 로드 (`<link rel="prefetch">`, 이미지 preload)
- **로딩 상태**: 스켈레톤 UI 또는 스피너로 "로드 중"임을 명확히 — 사용자가 끝에 도달했는지 혼란 방지

## 면접 체크포인트

- 이커머스 카테고리 페이지에 **Pagination을 선택한 이유**를 SEO 관점에서 설명할 수 있어야 함
- Infinite Scroll을 선택했을 때 **접근성·푸터 문제**를 어떻게 해결했는지 구체 사례
- **스크롤 위치 복원**을 어떻게 구현했는지 (URL state, history API, scroll restoration)
- 대량 목록에서 **virtualization**을 적용한 경험

## 관련 문서

- [[PRD-Writing|PRD 작성법]]
- [[User-Feedback|사용자 피드백 관리]]

## 출처

- [사이트에 가장 적합한 UX 패턴 선택 — Google Search Central](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading?hl=ko)
