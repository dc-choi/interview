---
tags: [fit, interview, xiilab]
status: done
category: "Interview - Fit"
aliases: ["XIILab JD 기반 기술 질문", "씨이랩 서비스 맥락 질문", "씨이랩 컬처핏"]
---

# 씨이랩 (XIILab) 면접 준비 — JD 기반 기술 / 서비스 맥락 / 컬처핏 질문

> 상위 문서: [[Interview-Prep-XIILab|씨이랩 면접 준비]]
> 범위: Full Stack·React·AI 도메인 관련 JD 중심 질문과 AI 솔루션 서비스 맥락, 컬처핏

---

## JD 기반 기술 질문

### React 경험이 있나? 프론트엔드 어떻게 할 건가?

- **사이드 프로젝트 "출석부" (school-manage)** — React 19 + Vite + TypeScript 기반 풀스택 서비스를 직접 기획→설계→개발→운영. 30개 단체가 실제 사용 중인 프로덕션 앱
- **React 핵심 패턴 실전 적용 경험**:
  - **커스텀 훅 아키텍처**: 도메인별 훅 설계 (`useStudents`, `useAttendance`, `useGroups`, `useDashboardStatistics` 등). 각 훅이 CRUD + 필터링 + 페이지네이션 + 캐시 무효화를 캡슐화
  - **TanStack React Query + tRPC**: 서버 상태 관리. staleTime 5분, 조건부 쿼리(`enabled: !!groupId`), 뮤테이션 후 캐시 무효화(`utils.student.list.invalidate()`)
  - **Radix UI + Tailwind + CVA(shadcn/ui 패턴)**: 접근성 있는 헤드리스 UI 컴포넌트 + 유틸리티 CSS + class-variance-authority
  - **React Router DOM v6**: 클라이언트 사이드 라우팅, URL 기반 검색/필터 상태 동기화(`useSearchParams`)
  - **Context API 기반 인증**: `AuthProvider` + `useAuth()` 훅, 안전 체크(`throw new Error` if used outside provider)
  - **에러 바운더리**: 클래스 기반 `GlobalErrorBoundary` + 라우트 레벨 `RouteErrorFallback`
- **tRPC End-to-End 타입 안전성**: Prisma 스키마 → 백엔드 라우터 → 프론트엔드 훅까지 타입이 자동 전파. REST에서 tRPC로 전환하면서 서버/클라이언트 타입 불일치 문제를 원천 해결
- **실전 UX 패턴**: 3단계 온보딩 플로우, 벌크 작업(일괄 삭제/졸업/등록), Excel 임포트/엑스포트, 캘린더 기반 출석 인터페이스, 역할 기반 UI(관리자/게스트)
- **GA4 애널리틱스 통합**: 중앙화된 analytics 모듈로 가입/로그인/기능 사용 이벤트 추적
- 백엔드 API 설계 시 프론트엔드 협업 경험 있음 (시솔지주: Swagger 문서화 + 일관된 응답 포맷 설계)
- AI 도구(Claude Code)를 적극 활용해 빠르게 학습·구현 — 씨이랩 자체가 AX를 강조하는 회사
- 꼬리 대비:
  - "React 상태관리는 어떻게?" → 서버 상태는 React Query(tRPC), 클라이언트 상태는 Context API + useState. Redux/Zustand 같은 글로벌 상태 라이브러리 없이도 서버 상태와 클라이언트 상태를 명확히 분리하면 충분
  - "컴포넌트 설계 원칙?" → 기능 단위(Feature-Sliced) 폴더 구조. 각 도메인(auth, attendance, student, group)이 자체 hooks/components/utils 보유. 공통 UI만 shared로 분리
  - "성능 최적화 경험?" → React Query staleTime으로 불필요한 리페치 방지, 조건부 쿼리로 의존성 없는 fetch 차단. 랜딩 페이지 리디자인으로 이탈률 81.8%→12.5% 개선
  - "SSR/SSG 경험?" → 출석부는 SPA(Vite). SSR이 필요한 경우 Next.js 활용 가능하나 현재 프로젝트는 인증 기반 앱이라 SPA가 적합

### Full Stack으로 일할 때 프론트/백 우선순위는?

- 기능 단위로 프론트→백 수직 슬라이싱 — 하나의 기능을 API 설계부터 UI까지 한 사람이 일관되게 구현
- 사용자 경험 관점에서 API 설계부터 UI까지 일관성 있게
- 실무: 출석부 프로젝트에서 기획→설계→개발→운영 전 과정 직접 담당, 30개 단체 실서비스 운영 중
- **모노레포 구조**: pnpm workspaces + Turborepo로 `apps/api`(Express+tRPC) + `apps/web`(Vite+React) + `packages/trpc`(공유 라우터) 구성. 프론트/백이 같은 타입을 공유하면서 독립 배포 가능
- 꼬리:
  - "프론트/백 중 어디가 강점?" → 백엔드가 강점이지만 프론트도 직접 프로덕션 서비스를 운영한 경험이 있어 양쪽 모두 기여 가능. 처음에는 백엔드 비중이 높겠지만 점진적으로 풀스택으로 영역 확장
  - "모노레포 장단점?" → 장점: 타입 공유, 의존성 일원 관리, 원자적 커밋. 단점: 빌드 시간 증가, CI 설정 복잡도. Turborepo 캐싱으로 빌드 시간 완화

### tRPC를 왜 선택? REST와 비교하면?

- **문제**: REST API에서 프론트/백 간 타입 불일치가 런타임 에러로 이어지는 경험. 엔드포인트 변경 시 Swagger 문서 수동 갱신 필요
- **tRPC 선택 이유**:
  - 코드 생성 없이 TypeScript 타입이 자동 전파 → 컴파일 타임에 API 변경 감지
  - React Query와 네이티브 통합 → 캐싱/리페치/뮤테이션 자동 관리
  - 모노레포에서 `@school/trpc` 패키지로 라우터 정의를 공유 → 프론트에서 `trpc.student.list.useQuery()` 형태로 타입세이프 호출
- **REST 대비 트레이드오프**: tRPC는 TypeScript 모노레포 전용(외부 클라이언트에는 부적합). 외부 API 제공이 필요하면 REST/GraphQL 병행
- 꼬리:
  - "GraphQL과 비교하면?" → GraphQL은 스키마 정의+코드 생성 필요, 오버페칭 해결에 강점. tRPC는 TypeScript 프로젝트에서 가장 가볍게 E2E 타입 안전성 확보. 외부 클라이언트가 없으면 tRPC가 생산성 최고
  - "tRPC에서 인증/인가는?" → tRPC middleware에서 JWT 토큰 검증 → context에 사용자 정보 주입 → 각 procedure에서 context.user 참조

### 사일런트 토큰 리프레시 어떻게 구현?

- tRPC 클라이언트 레벨에서 401 응답 인터셉트 → refresh token으로 새 access token 발급 → 원래 요청 재시도
- **핵심**: 동시 요청 시 refresh 중복 호출 방지 — 공유 Promise로 첫 번째 refresh만 실행, 나머지는 같은 Promise를 await
- access token은 sessionStorage, refresh token은 httpOnly cookie
- 꼬리:
  - "왜 sessionStorage?" → 탭 간 격리(보안), XSS 취약점은 있지만 httpOnly cookie는 CSRF 리스크. 트레이드오프 인지하고 선택. refresh token이 httpOnly cookie이므로 access token 탈취 시에도 재발급 차단 가능
  - "무한 루프 방지?" → refresh 실패 시(refresh token도 만료) 로그아웃 처리. refresh 요청 자체에는 인터셉터 미적용

### DB 모델링 접근법? 정규화 vs 비정규화 기준?
> 관련: [[Index|인덱스]], [[SQL|SQL]]

- 도메인 모델 기반 설계 → 3NF 기본 → 조회 성능 필요 시 비정규화
- 실무: 시솔지주에서 MongoDB→MySQL 마이그레이션
  - MongoDB 스키마리스 구조를 MySQL 정규화 스키마로 재설계
  - 배치 프로세스로 100만 건 데이터 무중단 마이그레이션 도구 자체 개발
  - 데이터 정합성 검증 포함

### AWS 클라우드 아키텍처 설계 경험?

- 시솔지주: AWS LightSail → EC2+RDS 전환
- 트라이포드랩: 단일 EC2 → CloudFront+ALB+NLB+ECS Fargate 아키텍처 직접 설계
- 고객사 On-Premise 마이그레이션: AWS 클라우드 → CentOS 7.1 환경으로 전환, Nginx 리버스 프록시+PM2 무중단 구성

### 테스트 코드 어떻게 작성하나?
> 관련: [[Service-Layer-Testing|서비스레이어테스트]], [[Test-Fixture|테스트픽스처]], [[Test-Isolation|테스트격리]]

- 시솔지주: Mocha+Chai로 테스트 0→1 도입
  - SonarQube 웹 대시보드로 팀 전체 코드 품질 지표 공유
  - PR 연동하여 커버리지 60% 미달 시 머지 불가 → 최종 70% 달성
  - CBT 특성상 오발송 시 막대한 손실 가능해서 안정성 확보가 최우선
- 트라이포드랩: jest+supertest
  - 발주 자동화 Batch에서 스케줄링과 핵심 비즈니스 로직 분리하여 독립적으로 검증 가능하게 설계
- 꼬리: 유닛(서비스 로직) → 통합(API 엔드포인트) → E2E 순서로 피라미드 구조 지향

### AI 도구를 업무에 어떻게 활용하나?

- Claude Code를 일상적으로 사용
- 코드 작성, 리뷰, 디버깅, 문서화에 활용
- 면접 준비 문서 자체도 Claude Code 스킬로 자동 생성하는 시스템 구축
- 출석부 프로젝트에서 AI 기반 Spec-Driven Development 워크플로우 도입으로 생산성 향상
- 씨이랩의 AX 방향과 직접 일치

### DRI로 일한 경험? 문제 정의부터 해결까지 주도한 사례?

- **Prisma 성능 문제**: 로그 분석으로 4개 개별쿼리 직접 발견 → 공식 문서 검토 → relationLoadStrategy 적용 → 82~90% 성능 개선. 하코 3000명 커뮤니티에서 이 주제로 발표
- **모니터링 인프라**: CloudWatch 한계(쿼리 성능, 비용) 직접 분석 → Datadog/NewRelic/ELK 대안 비교 → GPL 스택 자체 호스팅 결정 → 직접 구축. SLO 기반 경보 체계 정착
- **FIDO 서버**: 담당 개발자 퇴사 후 팀 리드 직접 맡음 → 3개월 내 FIDO Spec 처음부터 학습 → 인증 통과. 오픈소스 라이브러리 규격 미준수 발견 → GitHub 이슈 생성으로 커뮤니티 기여

---

## 서비스 맥락 질문

### CCTV 영상분석 서비스에서 실시간 데이터를 웹에 보여줘야 한다면?

- WebSocket/SSE로 실시간 스트리밍, 대시보드 React 컴포넌트 설계
- 대량 이벤트는 백엔드에서 집계 후 전송 — 클라이언트 부하 최소화
- 실무 연결: 트라이포드랩에서 IoT 디바이스 실시간 데이터 수신 처리 경험 (디바이스 타임아웃 1초, 전송 주기 4시간)
- 꼬리: "이벤트가 너무 많으면?" → 백엔드에서 시간 윈도우 기반 집계, 클라이언트에는 변경분만 전송

### 제조 공정 QA/QC 데이터를 대시보드로 제공한다면 설계는?

- 시계열 데이터 → 배치 집계 + 실시간 알림 분리
- 대시보드는 집계 데이터 조회(Read Replica 활용), 이상 감지 시 실시간 알림
- 실무 연결: 트라이포드랩에서 Read Replica 도입으로 조회 40% 향상, DB CPU 30% 감소한 경험 동일 패턴

### 고객사마다 다른 요구사항을 하나의 제품으로 대응하려면?

- 클린 아키텍처 기반 모듈 분리 경험 활용
  - Controller → UseCase → DomainService → Repository 계층 분리
  - 도메인 로직은 공유, 고객사별 커스텀은 UseCase 레벨에서 분기
- 실무 연결: 트라이포드랩에서 대형 고객사(제약바이오 280억, F&B 2000억) PoC 시 동일 구조로 유연하게 대응

### AI 모델 결과를 사용자에게 보여주는 UI/UX를 설계한다면?

- 비동기 Job 패턴: 요청 접수(즉시 jobId 반환) → 큐 → 워커(AI 처리) → 완료 알림
- Job 테이블: status(pending→processing→done/failed), progress(%), error_message
- 상태 알림: 초기엔 폴링, 트래픽 커지면 WebSocket 전환
- 실무 연결: 발주 자동화에서 동일 비동기 처리 패턴 (EventBridge → SQS → 워커)

### 서비스 장애 시 대응 프로세스?

- 실제 경험 기반:
  1. Grafana Alerting이 Slack/팀별 라우팅으로 자동 알림 (Error rate 1% `for:5m`, Event Loop Lag 100ms 3분 등 SLO 기반 임계값)
  2. 대시보드에서 영향 범위 파악 — TraceId로 요청 단위 로그+메트릭 연계 조회
  3. 롤백(ECS Rolling Update 이전 태스크로 복귀) or 핫픽스 판단
  4. 근본 원인 분석 — Loki 로그+Prometheus 메트릭 교차 분석
  5. 재발 방지 — 알림 임계값 조정, 테스트 케이스 추가, 포스트모템 공유

---

## 컬처핏 / 소프트스킬 질문

- [ ] 장단점 — [[FIT-Questions-Growth#본인의 장단점|FIT]] 실행력/성급함
- [ ] 동료 갈등 — [[FIT|FIT]] 참고
- [ ] 기획자 충돌 — [[FIT-Questions-Motivation#기획자와 의견 충돌 사례|FIT]] 참고
- [ ] 긴급 이슈 판단 — [[FIT-Questions-Motivation#긴급 이슈 동시 발생 시 판단 기준|FIT]] 비즈니스 임팩트 기준
- [ ] 성장 목표 — [[FIT-Questions-Growth#장기적으로 어떤 개발자가 되고 싶은가요?|FIT]] 개발 리드 → CTO
- [ ] **추가**: "새로운 기술(React 등)을 어떻게 학습하나?" → AI 도구 활용 + 공식 문서 + 작은 프로젝트로 빠르게 실전 적용
- [ ] **추가**: "AI 도구를 활용한 구체적 경험은?" → Claude Code로 코드 작성·리뷰·디버깅, 커스텀 스킬/훅/MCP 서버 구축으로 개발 워크플로우 자동화

---

## 관련 문서
- [[Interview-Prep-XIILab|씨이랩 면접 준비 (인덱스)]]
- [[Interview-Prep-XIILab-JD|JD 분석 & FIT 답변]]
- [[Interview-Prep-XIILab-Tech-Resume|이력서 기반 기술 질문]]
- [[Interview-Prep-XIILab-Questions|역질문 & 체크리스트]]
