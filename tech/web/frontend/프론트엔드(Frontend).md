---
tags: [web, frontend]
status: index
category: "웹&네트워크(Web&Network)"
aliases: ["Frontend", "프론트엔드"]
---

# 프론트엔드

## 목차

- [[Code-Driven-Motion-Graphics|코드 기반 모션 그래픽과 영상 출력]] — 화면 렌더러와 파일 처리의 역할, 프레임 기반 시간 제어와 출력 검수, 자체 GPU 엔진(raea)의 영상과 게임 출력, 에이전트용 프레임 추출과 자동 검사
- [[Frontend-Framework-Evaluation|프론트엔드 도구 평가]] — AI 개발 비용의 실험 조건, Pico CSS 종료와 유지보수 책임




- [[WebGPU-Cross-Runtime|WebGPU 코드 공유]] — vgpu, WGSL 모듈과 환경별 초기화
- [[Web-3D-Adoption|웹 3D 채택의 장벽과 AI 코딩 이후의 변화]] — 보안 경계, 기기 호환성과 구현 난이도, WebGPU 지원 범위, three.js 다운로드 증가를 읽는 법, 개인 3D 공간 사례와 도입 전 점검
- [[Desktop-App-Runtime-Choices|데스크톱 앱 런타임 선택]] — Electron의 다중 프로세스, 시스템 WebView의 엔진 차이, 네이티브 GPU UI의 성숙도와 메모리 비교 조건
- [[Cross-Platform-Keyboard|플랫폼별 키보드 입력]] — 문자 입력, 단축키와 기본 편집 보존
- [[URL-Embedded-Documents|URL에 담긴 문서]] — 사본 공유, fragment와 저장 경계

- [[HTML-Document-Structure-and-Forms|HTML 기초: 문서 구조, 의미 요소와 폼]] — DOCTYPE과 lang, void 요소와 문자 참조, 랜드마크, alt와 자동 재생, GET 폼의 쿼리 직렬화, 기본 제출 버튼, pattern과 우회 가능한 클라이언트 검증, Nu 검사기
- [[CSS-Selectors-Cascade-and-Inheritance|CSS 기초: 적용 위치, 선택자, 캐스케이드와 상속]] — style 속성과 외부 시트, 선택자 종류, 캐스케이드 비교 순서와 명시도, 상속과 초기값, 브라우저 기본 스타일, CSSOM의 style과 getComputedStyle
- [[Bootstrap-6-Migration|Bootstrap 6 전환]] — alpha 기준 반응형 클래스, CSS 토큰, ESM과 브라우저 호환성
- [[Responsive-Web-Layout|반응형 웹 레이아웃]] — 콘텐츠 기준 분기, 표 스크롤, 안전 영역과 모달 메뉴의 포커스
- [[Swiper-Carousel|Swiper 이미지 슬라이드]] — 자산과 모듈 구성, 자동 재생 옵션, 포커스와 정지 제어
- [[Agent-Friendly-Websites|에이전트 친화적 웹사이트]] — 화면, DOM과 접근성 트리의 의미 일치, 버튼의 키보드 동작과 레이아웃 안정성
- [[UI-Behavior-Primitives|UI 동작 프리미티브]] — ARIA 역할과 직접 구현할 동작, 콤보박스와 복합 위젯의 포커스 계약, UI SDK의 동작 조합과 다섯 프레임워크 어댑터, 패턴 검사와 스크린 리더 확인의 경계
- [[Agent-Platform-Knowledge-Skills|코딩 에이전트의 웹 플랫폼 지식 스킬]] — Modern Web Guidance의 검색형 지침, 저장소 지침의 Baseline 목표와 기본값, 조건부 폴리필, 정적 현대화 스캔과 보정된 평가
- [[Frontend-Rendering-Models|프런트엔드 렌더링과 상호작용 모델]] — hydration, islands, resumability와 서버 HTML 조각 교체
- [[Fine-Grained-Reactivity|세밀한 반응성: 시그널 그래프와 비동기]] — 컴포넌트 재실행과 식 단위 갱신, Solid 2.0의 비동기 보류와 경쟁 처리, 낙관적 갱신, 서버 함수의 보안 경계, 안정된 진단 코드
- [[TTFB-and-Search-Crawling|TTFB와 검색 크롤링]] — 첫 바이트의 구성 단계와 거리 지연, LCP와의 관계, 크롤러가 읽는 HTML, 응답 시간에 따른 크롤링 한도, 정적 생성과 CDN, 요청 때 만든 HTML을 길게 캐시하고 쓰기 때 전체를 비우는 구조
- [[Performance-Budget-and-Design-Decisions|성능 예산과 디자인 결정]] — 속도를 정하는 다섯 층, LCP 이미지의 지연 로딩 금지와 fetchpriority, Core Web Vitals 기준과 예산표, Lighthouse 제한 조건, 첫 카드 지연 로딩 사례
- [[Streaming-Markdown-Rendering|스트리밍 Markdown 렌더링]] — 생성 중인 AI 응답의 확정 경계와 증분 갱신, 뒤에 오는 링크 정의, 미완성 문법의 표시용 보정, WAT 렌더러 Words, 원문 HTML과 외부 이미지 제한
- [[Foldable-Web-Layout|폴더블 웹 레이아웃]] — 자세와 뷰포트 구획의 구분, 경첩 공간, 점진적 적용과 접근성
- [[React|React]] — UI/state, DOM, 서버 경계, Compiler와 lint
- [[React-Native|React Native]] — Guides, [[RN-Components|컴포넌트]], [[RN-APIs|API와 전역 객체]], [[RN-Architecture|아키텍처]], 개발 환경과 플랫폼 확장
- [[Expo|Expo]] — Home/Guides/EAS/Reference/Learn, SDK API, Expo UI와 앱 배포
- [[NextJS|Next.js]] — App/Pages Router, 캐시, API, 자산, 테스트와 배포
- [[Browser-Main-Thread|브라우저 메인 스레드]] — 메인 스레드 독점과 long task, 분할과 양보, 배치, 우선순위, Web Workers 오프로딩으로 반응성 유지
  - [[Browser-Main-Thread-Scheduling|메인 스레드 스케줄링]] — 개수와 시간 기준 양보, 양보 도구별 재개 시점, 프레임당 한 번 그리기, 우선순위 큐와 idle-until-urgent, 화면 밖 렌더링 지연
  - [[Browser-Main-Thread-Offloading|메인 스레드 밖으로 보내기]] — 스레드 분담, transform과 FLIP, will-change, 레이아웃 스래싱, 워커와 transferable, 버리기, 합치기, 생략하기
- [[Atomic-Design|Atomic Design과 컴포넌트 계층 규칙]] — 다섯 단계, Atom 범위, Molecule과 Organism 경계, 순수 컴포넌트와 부수 효과 계층, 목록과 모달 배치
- [[Storybook|Storybook]] — story, args와 Controls, Autodocs, 웹 컴포넌트의 Custom Elements Manifest, play 함수와 axe-core 접근성 검사의 단계적 도입
- [[Design-System-Lint|디자인 시스템 lint]] — 테마 토큰과 공용 컴포넌트 계약 위반 검출, `@shadcn/lint` 여섯 규칙과 예외 설정, 진단을 AI 수정 입력으로 쓰는 루프, 단계적 도입과 CI 게이트, 토큰 생성과 화면 대비 검증의 경계
- [[Design-To-Code-Connection|디자인 산출물과 코드 컴포넌트의 연결]] — 컴포넌트 명세, DTCG 2025.10 토큰 형식과 Resolver, Figma Code Connect와 MCP 연동, 커스텀 영역만 검수하는 흐름, 도구가 사람마다 갈라질 때 일관성을 지키는 공용 층
- [[In-Browser-Build|브라우저 내 빌드 런타임]] — esbuild-wasm 브라우저 컴파일, import map 의존성 해석, 로드 타임을 빌드 타임으로 옮겨 프리뷰 가속

## 관련 문서

- [[Browser-URL-Flow|브라우저 URL 처리 흐름]]
- [[Browser-DOM-Manipulation-and-Safety|DOM 조작과 안전성]]
- [[TS-React-Type-Contracts|React와 TypeScript 타입 계약]]
