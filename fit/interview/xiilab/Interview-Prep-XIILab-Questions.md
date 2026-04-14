---
tags: [fit, interview, xiilab]
status: done
category: "Interview - Fit"
aliases: ["XIILab 역질문", "씨이랩 면접 체크리스트"]
---

# 씨이랩 (XIILab) 면접 준비 — 역질문 & 체크리스트

> 상위 문서: [[Interview-Prep-XIILab|씨이랩 면접 준비]]
> 범위: 면접관에게 던질 역질문, 복습 영역, 과제 대비, 어필 포인트, 주의사항

---

## 역질문 (나 → 면접관)

### 기술/아키텍처
1. **"현재 제품의 기술 스택이 어떻게 구성되어 있나요? 프론트엔드와 백엔드 비중은?"** — 온보딩 계획 수립
2. **"X-AIVA, Xniper 등 제품별로 팀이 나뉘어져 있나요, 하나의 팀이 여러 제품을 담당하나요?"** — 업무 범위 파악
3. **"AI 모델 팀과 Product Engineer 사이의 협업은 어떻게 이루어지나요?"** — AI 도메인 이해도 + 협업 방식
4. **"Claude Code 외에 팀에서 활용하는 AI 도구가 더 있나요?"** — AX 문화 깊이 파악 + 관심 어필

### 팀/조직
5. **"R&D Group의 팀 규모와 구성이 어떻게 되나요?"** — 포지션과 성장 환경
6. **"코드 리뷰 프로세스와 배포 주기는?"** — 개발 문화
7. **"DRI 문화에서 과제의 범위와 책임은 어떻게 정해지나요?"** — 실제 운영 방식

### 성장/기대치
8. **"이 포지션에서 초기 3개월간 기대하는 역할과 성과는?"** — 현실적 기대치
9. **"Product Engineer로서 장기적으로 어떤 성장 경로가 가능한가요?"** — 커리어 방향
10. **"현재 팀에서 가장 시급한 기술적 챌린지는?"** — 입사 후 기여 포인트 파악

---

## 면접 준비 체크리스트

### 보강이 필요한 기술 영역

**프론트엔드 (React) — 출석부 프로젝트 기반**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| React 커스텀 훅 패턴 (useStudents, useAttendance 등 도메인 훅 설계) | 출석부 소스 | [ ] |
| React Query + tRPC (서버 상태 관리, 캐시 무효화, 조건부 쿼리) | 출석부 소스 | [ ] |
| tRPC E2E 타입 안전성 (모노레포 타입 공유, REST→tRPC 전환 이유) | 출석부 소스 | [ ] |
| 인증 흐름 (Context 기반 AuthProvider, 사일런트 토큰 리프레시, 중복 방지) | 출석부 소스 | [ ] |
| 컴포넌트 설계 (Feature-Sliced 구조, Radix UI + Tailwind + CVA) | 출석부 소스 | [ ] |
| 에러 처리 (GlobalErrorBoundary, RouteErrorFallback) | 출석부 소스 | [ ] |
| React Router DOM v6 (URL 기반 필터/검색 상태 동기화) | 출석부 소스 | [ ] |

**DB / 성능 최적화**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| 트랜잭션/격리수준 (RR vs RC, gap lock, Phantom Read) | [[Transactions\|트랜잭션]], [[Isolation-Level\|격리수준]] | [ ] |
| 인덱스/실행계획 (카디널리티, 선택도, 커버링, 복합 인덱스) | [[Index\|인덱스]], [[Execution-Plan\|실행계획]] | [ ] |
| DB 모델링·정규화 (3NF, 비정규화 기준) | [[Index\|인덱스]], [[SQL\|SQL]] | [ ] |
| Prisma ORM 심화 (app-level join, relationLoadStrategy) | [[ORM\|ORM]] | [ ] |

**아키텍처 / 설계 패턴**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| 클린 아키텍처 (Controller→UseCase→DomainService→Repository) | (외부 자료) | [ ] |
| 비동기 처리 패턴 (큐+워커+알림, DLQ, 멱등성) | [[Messaging-Patterns\|메시징패턴]], [[Delivery-Semantics\|전달보장]], [[Idempotency-Key\|멱등성]] | [ ] |

**NestJS / Node.js**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| NestJS 심화 (DI/IoC 컨테이너, 모듈, 라이프사이클) | [[NestJS\|NestJS]], [[Request-Lifecycle\|요청라이프사이클]] | [ ] |
| Node.js 이벤트 루프/libuv | [[Event-Loop\|이벤트루프]], [[libuv\|libuv]], [[Thread-vs-Event-Loop\|스레드vs이벤트루프]] | [ ] |
| Node.js 비동기 프로그래밍 심화 | [[Async-Programming\|비동기프로그래밍]], [[Async-Internals\|비동기내부구조]] | [ ] |

**인프라 / DevOps**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| Docker 멀티스테이지 빌드 / .dockerignore 최적화 | [[Multi-Stage-Build\|멀티스테이지빌드]] | [ ] |
| 모니터링 (Prometheus+Thanos, Loki, Grafana Alerting, SLO 기반 경보) | [[Incident-Detection-Logging\|장애탐지·로깅]], [[Log-Pipeline\|로그파이프라인]] | [ ] |

**테스트 / 품질**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| 테스트 전략 (피라미드, 유닛→통합→E2E, SonarQube 커버리지 관리) | [[Service-Layer-Testing\|서비스레이어테스트]], [[Test-Fixture\|픽스처]], [[Test-Isolation\|격리]] | [ ] |

### 과제 대비
> 1차 면접에 과제가 포함됨 — Full Stack 과제일 가능성 높음

- [ ] 출석부 프로젝트 코드 리뷰 — 면접에서 설명할 수 있도록 핵심 패턴 정리 (tRPC 설정, 커스텀 훅, 인증 흐름)
- [ ] React + Vite + TypeScript 프로젝트 빠른 셋업 연습 (10분 이내)
- [ ] React ↔ Express/NestJS API 연동 CRUD 빠르게 구현하는 연습
- [ ] AI 도구(Claude Code) 활용한 프론트엔드 개발 연습
- [ ] Radix UI + Tailwind 컴포넌트 빠르게 조합하는 연습

### 강하게 어필할 포인트
1. **Node.js(NestJS) + MySQL** — JD 자격요건과 정확히 일치
2. **React 프로덕션 경험** — 사이드 프로젝트 출석부를 React 19 + tRPC로 직접 개발·운영, 30개 단체 실서비스. 커스텀 훅 아키텍처, 서버 상태 관리, 인증 흐름, GA4 통합까지 프론트엔드 전 영역 경험
3. **DRI 경험** — Prisma 성능 문제 로그 분석→공식 문서 검토→82~90% 개선, 하코 3000명 커뮤니티 발표. 모니터링 인프라 필요성 제기→GPL 스택 직접 구축
4. **제품 전 과정 참여** — PMF → 대형 고객사(제약바이오 280억, F&B 2000억) PoC 성공 → 운영 최적화 (우대사항과 직접 연결)
5. **정량적 성과** — 슬로우쿼리 99.3%(15.4ms→0.1ms), API 82~90% 향상, Docker 43.6%(909→513MB), 배포 26.3% 단축, 재고관리 95.8% 절감, 발주 완전 자동화
6. **인프라·모니터링** — 단일 EC2→ALB+NLB+ECS Fargate 직접 설계, Read Replica(조회 40%↑, CPU 30%↓), SLO 기반 경보 7개 지표 체계 구축
7. **AI 도구 활용** — Claude Code 일상적 사용, 커스텀 스킬/훅/MCP 서버 구축, AI 기반 Spec-Driven Development 워크플로우 도입 (씨이랩 AX 문화와 직접 연결)
8. **FIDO 서버 팀 리드** — 담당자 퇴사 후 3개월 내 팀 리드+인증 통과. 오픈소스 규격 미준수 발견→커뮤니티 기여. 주도적 문제해결+빠른 학습 능력 증명
9. **커뮤니티 기여** — 하코 3000명 발표, 카카오테크 캠퍼스 백엔드 멘토, FIDO 오픈소스 이슈 생성

### 주의사항
> [[FIT#면접 현장 주의사항|면접 현장 주의사항]] 참고

- **React 경험을 자신감 있게 어필** → 출석부 프로젝트가 30개 단체 실서비스 운영 중인 프로덕션 앱임을 강조. "사이드 프로젝트"라는 단어만으로 끝내지 말고 구체적 기술(React 19, tRPC, React Query, 모노레포)과 규모(30개 단체) 언급
- **Full Stack 지원이므로 프론트/백 균형 있게 어필** → 백엔드 강점 + 프론트엔드 실전 경험을 모두 보여주기. "백엔드만 잘한다"로 들리지 않도록
- **"성급함" 단점 → 기술적 실행 판단 예시로 한정** (이썸테크 6개월 퇴사와 연결하지 않기)
- **CTO 목표 → "권한"이 아니라 "영향력"과 "기여의 크기"로 표현**
- **DRI 문화 어필 시 구체적 사례로** → "주도적입니다"가 아니라 "이런 문제를 발견하고 이렇게 해결했습니다"
- **1차는 과제+실무 면접** — 기술 답변과 실제 코딩 역량에 집중

---

## 관련 문서
- [[Interview-Prep-XIILab|씨이랩 면접 준비 (인덱스)]]
- [[Interview-Prep-XIILab-JD|JD 분석 & FIT 답변]]
- [[Interview-Prep-XIILab-Tech-Resume|이력서 기반 기술 질문]]
- [[Interview-Prep-XIILab-Tech-JD|JD 기반 기술·서비스·컬처핏 질문]]
