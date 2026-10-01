---
tags: [web, frontend]
status: index
category: "웹&네트워크(Web&Network)"
aliases: ["Frontend", "프론트엔드"]
---

# 프론트엔드

## 목차

- [[React|React]] — UI/state, DOM, 서버 경계, Compiler와 lint
- [[NextJS|Next.js]] — App/Pages Router, 캐시, API, 자산, 테스트와 배포
- [[Browser-Main-Thread|브라우저 메인 스레드]] — 메인 스레드 독점과 long task, 분할과 양보, 배치, 우선순위, Web Workers 오프로딩으로 반응성 유지
  - [[Browser-Main-Thread-Scheduling|메인 스레드 스케줄링]] — 개수와 시간 기준 양보, 양보 도구별 재개 시점, 프레임당 한 번 그리기, 우선순위 큐와 idle-until-urgent, 화면 밖 렌더링 지연
  - [[Browser-Main-Thread-Offloading|메인 스레드 밖으로 보내기]] — 스레드 분담, transform과 FLIP, will-change, 레이아웃 스래싱, 워커와 transferable, 버리기, 합치기, 생략하기
- [[Atomic-Design|Atomic Design과 컴포넌트 계층 규칙]] — 다섯 단계, Atom 범위, Molecule과 Organism 경계, 순수 컴포넌트와 부수 효과 계층, 목록과 모달 배치
- [[In-Browser-Build|브라우저 내 빌드 런타임]] — esbuild-wasm 브라우저 컴파일, import map 의존성 해석, 로드 타임을 빌드 타임으로 옮겨 프리뷰 가속

## 관련 문서

- [[Browser-URL-Flow|브라우저 URL 처리 흐름]]
- [[Browser-DOM-Manipulation-and-Safety|DOM 조작과 안전성]]
- [[TS-React-Type-Contracts|React와 TypeScript 타입 계약]]
