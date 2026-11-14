---
tags: [web, frontend]
status: index
category: "웹&네트워크(Web&Network)"
aliases: ["Frontend", "프론트엔드"]
---

# 프론트엔드

## 목차

- [[Code-Driven-Motion-Graphics|코드 기반 모션 그래픽과 영상 출력]] — 화면 렌더러와 파일 처리의 역할, 프레임 기반 시간 제어와 출력 검수
- [[Frontend-Framework-Evaluation|프론트엔드 도구 평가]] — AI 개발 비용의 실험 조건, Pico CSS 종료와 유지보수 책임




- [[WebGPU-Cross-Runtime|WebGPU 코드 공유]] — vgpu, WGSL 모듈과 환경별 초기화
- [[Desktop-App-Runtime-Choices|데스크톱 앱 런타임 선택]] — Electron의 다중 프로세스, 시스템 WebView의 엔진 차이, 네이티브 GPU UI의 성숙도와 메모리 비교 조건
- [[Cross-Platform-Keyboard|플랫폼별 키보드 입력]] — 문자 입력, 단축키와 기본 편집 보존
- [[URL-Embedded-Documents|URL에 담긴 문서]] — 사본 공유, fragment와 저장 경계

- [[Bootstrap-6-Migration|Bootstrap 6 전환]] — alpha 기준 반응형 클래스, CSS 토큰, ESM과 브라우저 호환성
- [[Responsive-Web-Layout|반응형 웹 레이아웃]] — 콘텐츠 기준 분기, 표 스크롤, 안전 영역과 모달 메뉴의 포커스
- [[Swiper-Carousel|Swiper 이미지 슬라이드]] — 자산과 모듈 구성, 자동 재생 옵션, 포커스와 정지 제어
- [[Agent-Friendly-Websites|에이전트 친화적 웹사이트]] — 화면, DOM과 접근성 트리의 의미 일치, 버튼의 키보드 동작과 레이아웃 안정성
- [[Frontend-Rendering-Models|프런트엔드 렌더링과 상호작용 모델]] — hydration, islands, resumability와 서버 HTML 조각 교체
- [[TTFB-and-Search-Crawling|TTFB와 검색 크롤링]] — 첫 바이트의 구성 단계와 거리 지연, LCP와의 관계, 크롤러가 읽는 HTML, 응답 시간에 따른 크롤링 한도, 정적 생성과 CDN
- [[Foldable-Web-Layout|폴더블 웹 레이아웃]] — 자세와 뷰포트 구획의 구분, 경첩 공간, 점진적 적용과 접근성
- [[React|React]] — UI/state, DOM, 서버 경계, Compiler와 lint
- [[React-Native|React Native]] — Guides, [[RN-Components|컴포넌트]], [[RN-APIs|API와 전역 객체]], [[RN-Architecture|아키텍처]], 개발 환경과 플랫폼 확장
- [[Expo|Expo]] — Home/Guides/EAS/Reference/Learn, SDK API, Expo UI와 앱 배포
- [[NextJS|Next.js]] — App/Pages Router, 캐시, API, 자산, 테스트와 배포
- [[Browser-Main-Thread|브라우저 메인 스레드]] — 메인 스레드 독점과 long task, 분할과 양보, 배치, 우선순위, Web Workers 오프로딩으로 반응성 유지
  - [[Browser-Main-Thread-Scheduling|메인 스레드 스케줄링]] — 개수와 시간 기준 양보, 양보 도구별 재개 시점, 프레임당 한 번 그리기, 우선순위 큐와 idle-until-urgent, 화면 밖 렌더링 지연
  - [[Browser-Main-Thread-Offloading|메인 스레드 밖으로 보내기]] — 스레드 분담, transform과 FLIP, will-change, 레이아웃 스래싱, 워커와 transferable, 버리기, 합치기, 생략하기
- [[Atomic-Design|Atomic Design과 컴포넌트 계층 규칙]] — 다섯 단계, Atom 범위, Molecule과 Organism 경계, 순수 컴포넌트와 부수 효과 계층, 목록과 모달 배치
- [[Design-System-Lint|디자인 시스템 lint]] — 테마 토큰과 공용 컴포넌트 계약 위반 검출, `@shadcn/lint` 여섯 규칙과 예외 설정, 진단을 AI 수정 입력으로 쓰는 루프, 단계적 도입과 CI 게이트, 토큰 생성과 화면 대비 검증의 경계
- [[In-Browser-Build|브라우저 내 빌드 런타임]] — esbuild-wasm 브라우저 컴파일, import map 의존성 해석, 로드 타임을 빌드 타임으로 옮겨 프리뷰 가속

## 관련 문서

- [[Browser-URL-Flow|브라우저 URL 처리 흐름]]
- [[Browser-DOM-Manipulation-and-Safety|DOM 조작과 안전성]]
- [[TS-React-Type-Contracts|React와 TypeScript 타입 계약]]
