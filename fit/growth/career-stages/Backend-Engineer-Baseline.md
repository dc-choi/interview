---
tags: [growth, career-stages, backend, checklist]
status: done
category: "Growth - 커리어 단계"
aliases: ["Backend Engineer Baseline", "백엔드 엔지니어 기본 역량"]
---

# 백엔드 엔지니어 기본 역량 체크리스트

"코드를 짜는 것"만이 백엔드가 아니다. **한 서비스를 처음부터 운영까지 끌고 갈 때 반드시 다뤄야 하는 최소 결정·구현 항목**. 신입~주니어가 사수 없이 혼자 해야 하는 상황에서 어디를 놓치기 쉬운지 체크하는 용도.

각 항목은 **"답할 수 있어야 함 / 실제 해본 적 있어야 함"** 두 수준을 혼합. 면접에서는 보통 답변 가능 수준, 실무에서는 실제 실행 수준을 요구.

## 1. 버전 관리 · 개발 프로세스

- [ ] **Git 기본** — branch·commit·PR·merge·rebase·cherry-pick 차이, conflict 해결
- [ ] **버전 관리 호스팅 선택** — GitHub/GitLab/Bitbucket 장단점
- [ ] **브랜치 전략** — GitHub Flow · Git Flow · Trunk-Based 구분과 팀 규모별 적합성
- [ ] **커밋 메시지 컨벤션** — Conventional Commits, 이슈 번호 연결
- [ ] **이슈 트래커 워크플로** — 이슈 생성 → 할당 → 브랜치 → PR → 리뷰 → 머지 → 클로즈
- [ ] **코드 리뷰** — Pn룰 ([[Code-Review-Pn-Priority]]), 피드백 작성 원칙 ([[Code-Review-Reviewer-Guide]])
- [ ] **master 안정성 원칙** — 항상 배포 가능한 상태 유지

## 2. API 설계

- [ ] **REST 원칙** — 6가지 제약, URI 설계 규칙, 상태 코드 컨벤션 ([[REST]])
- [ ] **API 스타일 선택** — REST vs GraphQL vs gRPC ([[API-Comparison]])
- [ ] **직렬화 포맷** — JSON vs XML vs Protobuf 선택 기준
- [ ] **멱등성** — 어느 메서드가 멱등인지, Idempotency Key 패턴 ([[Idempotency]])
- [ ] **페이지네이션** — offset vs cursor 기반
- [ ] **에러 응답 표준** — 본문 구조·상태 코드·에러 코드 설계
- [ ] **API 문서화** — OpenAPI/Swagger, 자동 생성 vs 수기, 버저닝

## 3. 인증 · 인가

- [ ] **Session vs JWT** 장단점, 선택 기준 ([[Session]], [[JWT]])
- [ ] **OAuth2 플로우** — Authorization Code·Implicit·Client Credentials 차이 ([[OAuth2]])
- [ ] **Refresh Token Rotation** ([[Refresh-Token-Rotation]])
- [ ] **Password Hashing** — argon2·bcrypt 비교, Salt·Pepper ([[Password-Hashing]])
- [ ] **다중 서버 세션 관리** — Sticky·Clustering·External Store

## 4. 기술 스택 · 프로젝트 구조

- [ ] **언어·프레임워크 선택** — 팀 숙련도·생태계·성능 요구 기준
- [ ] **의존성 관리** — lock 파일, 버전 고정 전략, 취약점 스캔
- [ ] **프로젝트 구조** — Layered·Hexagonal·Clean 적합성 판단 ([[Layered-Clean-Hexagonal]])
- [ ] **설정 관리** — 환경별 분리, 시크릿 관리 (12-Factor App)
- [ ] **로깅·검증·예외 처리** 표준 결정

## 5. 데이터베이스

- [ ] **RDBMS vs NoSQL** 선택 기준 ([[MySQL-vs-PostgreSQL]])
- [ ] **스키마 설계** — 정규화 vs 반정규화 트레이드오프 ([[Schema-Design]])
- [ ] **인덱스 설계** — 복합 인덱스 순서, 커버링 인덱스 ([[Index]], [[Covering-Index]])
- [ ] **트랜잭션·격리 수준** ([[Transactions]], [[Isolation-Level]])
- [ ] **Lock** — 공유·배타·Gap·Next-Key ([[Lock]], [[MySQL-Gap-Lock]])
- [ ] **PK 생성 전략** — Auto Increment vs UUID vs ULID ([[Primary-Key-Strategy]])
- [ ] **대용량 스키마 변경** ([[Schema-Migration-Large-Table]])
- [ ] **백업·복원** — RTO/RPO 개념 ([[MySQL-Backup]])

## 6. 인프라 · 배포

- [ ] **Compute 선택** — VM vs 컨테이너 vs 서버리스 ([[Cloud-Service-Models]])
- [ ] **Docker** — 이미지·컨테이너·Dockerfile 작성 ([[Docker]])
- [ ] **CI/CD 파이프라인** — 빌드·테스트·배포 자동화
- [ ] **배포 전략** — Blue-Green, Canary, Rolling
- [ ] **IaC** — Terraform/CDK ([[IaC]])
- [ ] **네트워크** — VPC, Subnet, Security Group 개념
- [ ] **Reverse Proxy / Load Balancer** ([[Reverse-Proxy]], [[Load-Balancer]])
- [ ] **DNS·HTTPS** 설정 ([[HTTPS-TLS]])

## 7. 테스트 · 품질

- [ ] **단위 vs 통합 vs E2E** 구분과 비중 ([[TDD-BDD]], [[Test-Pyramid]])
- [ ] **테스트 더블** — Mock·Stub·Fake 차이 ([[Classicist-vs-Mockist-Testing]])
- [ ] **Testcontainers** — 실제 DB 기반 통합 테스트 ([[TestContainers-Integration]])
- [ ] **Fixture 전략** — 테스트 격리·재현성 ([[Test-Fixture]], [[Test-Isolation]])
- [ ] **커버리지 목표** — 어느 선이 적정한가, 함정 이해
- [ ] **CI에서 테스트 게이트** — PR 머지 전 의무 통과

## 8. 관측 · 안정성

- [ ] **로그 vs 메트릭 vs 추적** ([[Logs-vs-Metrics]])
- [ ] **구조화 로깅** — JSON 포맷, Correlation ID ([[Structured-Logging]])
- [ ] **헬스 체크** — liveness vs readiness
- [ ] **모니터링 스택** — Prometheus + Grafana, ELK, CloudWatch
- [ ] **외부 서비스 장애 대응** — 타임아웃·서킷 브레이커·벌크헤드 ([[External-Service-Resilience]])
- [ ] **알림 설계** — Symptom 기반, 알림 피로 방지
- [ ] **Graceful Shutdown** ([[Graceful-Shutdown]])

## 9. 성능 · 확장

- [ ] **Scale Up vs Scale Out** 선택 기준 ([[Scale-Up-vs-Out]])
- [ ] **캐싱 전략** — Cache Aside·Write Through·Stampede ([[Cache-Strategies]], [[Cache-Stampede]])
- [ ] **N+1 회피** ([[JPA-Persistence-Context]])
- [ ] **Connection Pool 사이징** ([[Connection-Pool]])
- [ ] **실행 계획 분석** ([[Execution-Plan]])
- [ ] **부하 테스트** — k6·JMeter ([[Load-Test-K6]])

## 10. 보안

- [ ] **OWASP Top 10** 수준 인식 (SQL Injection, XSS, CSRF)
- [ ] **CORS** — Simple/Preflight/Credential ([[CORS]])
- [ ] **Rate Limiting** ([[Rate-Limiting]])
- [ ] **HTTPS/TLS** — 인증서 관리·TLS 1.2+ 강제
- [ ] **시크릿 관리** — Vault, AWS Secrets Manager
- [ ] **Least Privilege IAM** 원칙

## 함정 — 혼자 할 때 빠지기 쉬운 실수

- 단일 서버로 시작해서 **Stateless 설계를 놓침** → 나중에 Scale Out 못 함
- 테스트 없이 시작 → 리팩토링 불가 → 썩어가는 코드
- 로그만 있고 메트릭 없음 → 이상 감지 늦음
- 배포 자동화 없이 수동 SSH → 사람 실수로 장애
- 환경 변수·시크릿을 코드에 하드코딩 → 커밋 실수로 유출
- 백업 없음 또는 복원 테스트 안 해본 백업 → 유사시 무용
- CORS·CSRF·Rate Limit 같은 기본 방어 누락

## 레벨별 기대치

| 단계 | 기대 수준 |
|---|---|
| 신입~주니어 | 위 항목 **답할 수 있어야 함**. 실무는 사수 가이드 하에 수행 |
| 미드 (3~5년) | 대부분 항목을 **직접 결정·구현·운영** 경험 보유 |
| 시니어 | 항목들 간 **트레이드오프를 팀에 설명**하고 조직 표준 제시 |

사수 없는 환경이면 이 기준으로 스스로 진단하고 보완. 다 안다고 답만 할 수 있어도 면접 통과는 되지만, 실제 제품 운영 때는 **실제로 해본 적 있는** 깊이가 필요.

## 면접 체크포인트

- 체크리스트의 10개 영역을 한 줄씩 설명 가능
- 자신이 경험한 영역 vs 이론만 아는 영역 솔직히 구분
- "이 항목 놓쳐서 생긴 장애" 사례를 최소 하나
- 성장 경로 — 현재 위치와 다음 보완할 영역

## 출처
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 (17부작 시리즈 + 커리큘럼)](https://velog.io/@city7310/series/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8)

## 관련 문서
- [[Backend-Developer-Career-Overview|백엔드 개발자 진로 개요]]
- [[Tool-Mastery-Levels|개발 도구 숙련도 5단계]]
- [[Dreyfus-Skill-Model|Dreyfus 기술 습득 모형]]
- [[Developer-Growth-Stages|개발자 성장 단계]]
