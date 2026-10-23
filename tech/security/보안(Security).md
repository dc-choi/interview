---
tags: [security]
status: index
category: "보안(Security)"
aliases: ["보안(Security)", "Security Index"]
---

# 보안(Security)

## 목차

- [[Elliptic-Curve-Parameter-Provenance|타원곡선 파라미터의 출처]] — 공개 seed 재현과 개인키 복구의 구분, 미해결 선택 과정
- [[Security-Architecture-and-Threat-Modeling|보안 아키텍처와 위협 모델링]] — 데이터 흐름, 신뢰 경계, 자원별 접근과 통제 검증
- [[Forensic-Watermarking|포렌식 워터마킹]] — 배포본 식별, 변형 내성, 검출과 행위 판단의 구분
- [[Coding-Agent-Package-Hallucination|코딩 에이전트의 패키지 환각 공격]] — 규칙 파일 인젝션과 의존성 대체, 알아채고도 따른 사례, 탐지기의 미탐과 오탐, 리뷰 시점별 점검
- [[Smart-Contract-Reentrancy|스마트 컨트랙트 재진입과 상태 일관성]] — 외부 호출, 상태 변경 순서, 가드의 범위와 산술 버전 경계
- [[AI-Content-Provenance|AI 콘텐츠의 워터마크와 출처 증명]] — 통계적 텍스트 신호, C2PA, 숨은 문자와 탐지 결과의 한계
- [[Adversarial-Examples-Decision-Based-Attacks|적대적 예제와 결정 기반 공격]] — 위협 모델과 쿼리 예산, Boundary Attack과 HopSkipJumpAttack, 잠재 공간 변형, 상태 기반 탐지와 강건성 평가 도구
- [[Agent-Execution-Isolation|에이전트 실행 격리]] — MXC 백엔드별 강제 범위, 내부자 위험과 공개 모델의 조건부 백도어
- [[Enterprise-Browser-Control|기업용 브라우저 통제]] — Firefox Enterprise의 관리 위치와 early access
- [[Bot-Traffic-Operations|봇 트래픽 운영]] — 요청 로그와 사용자 분석, 차단과 부하 측정
- [[Signed-Payload-Deserialization|서명된 페이로드 역직렬화]] — 키 유출과 객체 복원 위험
- [[FIDO-WebAuthn#보안성과 사용자 통제권을 따로 평가한다|패스키 논쟁의 구분]] — 피싱 저항, 인증기 증명과 이전/복구

- [[Inline-vs-Out-of-Path#AI 런타임 검사: API 판정과 실제 차단|AI 런타임 검사 위치]] — 네트워크 인라인과 애플리케이션 검사 API, TLS 가시성, 스트리밍 전달과 차단 시점
- [[Grafana-Shared-Dashboard-Security|Grafana 공유 대시보드 보안]] — 일시정지와 토큰 폐기, 데이터 소스 설정 노출, 브랜치별 수정 기준
- [[Synthetic-Data-Privacy|합성 데이터와 개인정보 보호]] — 합성과 익명성의 구분, DP 보장과 정확도 검증
- [[SSH-Authentication|SSH 인증]] — 서버 인증과 사용자 인증의 분리, 키 교환, 호스트 키 검증
- [[OpenSSF-Scorecard|OpenSSF Scorecard]] — 저장소 보안 관행 평가, 검사별 근거와 총점의 한계
- [[Application-Security|애플리케이션 보안 / 시큐어코딩]] — 4대 원칙, 진단 vs 모의해킹, OWASP Top 10, OWASP API Security Top 10:2023, 트렌드 리스크, 클라이언트 불신, 비밀번호 확인 UI와 서버 검증 계약, 학습 경로
- [[CIA-Triad|CIA Triad (기밀성, 무결성, 가용성)]] — 세 보안 목표, 위협과 통제, 트레이드오프와 가장 약한 고리
- [[Security-Policy-and-Assessment|보안 정책과 점검]] — 자산과 위험, 역할별 교육, 점검 범위와 증거, Prowler와 Service Screener, 예외 처리와 재점검
- [[Security-Incident-Response|보안 사고 대응]] — NIST CSF 2.0 수명주기, 로그 상관분석, 자동 차단의 실행 경계, AI 리포트의 페이지 수집과 필드 매핑, 증거 보존과 복구 조건
- [[Access-Control-Models|접근 제어 모델 (RBAC, ABAC, PBAC)]] — 역할, 속성, 정책의 관계, PAP/PDP/PIP/PEP, 하이브리드 설계와 운영
- [[tech/security/auth/인증(Auth)|인증 (Auth)]] — Session과 비밀번호 변경 재인증, JWT, OAuth2, Token Exchange, FIDO, Refresh Token, Spring Security의 자동 로그인 저장소와 검증
- [[tech/security/crypto/암호(Crypto)|암호 (Cryptography)]] — 패스워드 해싱, 공개키, RSA
- [[Certificate-Lifecycle-Management|인증서 수명주기 관리]] — 인벤토리, 공인 TLS 유효기간 단축, 갱신 후 적용 확인과 복구 경계
- [[tech/security/web-attacks/웹공격(WebAttacks)|웹 공격 (Web Attacks)]] — CORS, CSRF, XSS, SQL Injection, Command Injection, 파일 업로드, IDOR, SSRF
- [[Actuator-Exposure|Actuator 노출 (Security Misconfiguration)]] — 운영 엔드포인트 노출, 필요한 것만 열기
- [[tech/security/secrets/Secret-Management|시크릿 관리 (Secret Management)]] — Vault, K8s Secret 제거, CSI/Injector/AVP/ESO 주입, Auto Unseal, 동적 시크릿
- [[tech/security/secrets/API-Key-Exposure|API 연동 키 노출과 최소 권한 스코프]] — 자격증명 노출, 권한 범위가 곧 공격 표면, 클라이언트/서버 키 구분, 정상 요청 위장 탐지
- [[tech/security/secrets/Hardcoded-Credentials|하드코딩된 자격증명]] — 소스 접근이 운영 접근이 되는 경로, 증폭 요인(장기 키, 전체 접근, 메신저 공유, 짧은 로그), 시크릿 스캐닝 한계와 임시 자격증명
- [[Supply-Chain-Security|공급망 보안 (Supply Chain)]] — PyPI/npm 공급망 공격, postinstall/.pth, 전이 의존성, AI 네이티브 상방-하방 딜레마, lockfile 핀/대응 플레이북
- [[Open-Source-License-Review|오픈소스 라이선스 검토]] — MIT/Apache 고지, GPL 전달 조건, AGPL 네트워크 조건, SaaS와 납품, SPDX/SBOM의 판단 범위
- [[tech/security/network-security/네트워크보안(NetworkSecurity)|네트워크 보안 (Network Security)]] — 경계 보안과 공인 IP 배치, UTM, 보안 장비 배치 순서, 인라인과 아웃오브패스, 포트 미러링과 TAP, IDS와 IPS, ARP 스푸핑과 DAI, ARP 기반 NAC 차단, 망분리와 망연계
- [[LLM-Application-Security|LLM 애플리케이션 보안 (OWASP Top 10 2025, 2026판 순위 변경)]] — 프롬프트 인젝션, Spotlighting과 Instruction Hierarchy의 한계, Dual-LLM과 CaMeL 격리, 가드의 한계, 적응형 공격과 Rule of Two, 민감정보 유출, 공급망, 출력 처리, 과도한 위임, RAG 임베딩, 허위정보, 무제한 소비
- [[tech/security/age-identity-verification/연령신원검증(AgeIdentityVerification)|연령/신원 검증 (Age & Identity Verification)]] — age assurance, IDV, PET, 규제 지형, 제3자 위탁 리스크

## 보강 체크리스트
- [x] [[SQL-Injection|SQL Injection (유형, prepared statement 원리, TypeORM 바인딩, 식별자 자리 한계)]] — 기존 보강: [[Security-Headers#정적 검사 + SQL Injection은 별개|보안 헤더 계층의 범위]], [[Prepared-Statement-Cache#서버 동작|Prepared Statement 기본]]
- [x] [[TLS-Config|TLS config]] — 기존 보강: [[HTTPS-TLS|TLS 핸드셰이크와 버전]], [[Security-Headers#HSTS — HTTPS 강제|HSTS]]
- [x] [[Rate-Limiting|Rate limit 정책 설계 (알고리즘, 계층, 분산 환경, 429 응답)]]
- [x] [[Shield-WAF-NetworkFirewall|WAF]]
- [x] [[Audit-Log|Audit log]] — 기존 보강: [[CloudTrail-Config|AWS API 감사]], [[Secret-Management#운영 필수 항목|Vault Audit Log]], [[Deployment-Automation-ChatOps#보안|ChatOps 감사 로그]]
- [x] [[IAM-Best-Practices#모범 사례|Least privilege IAM]] / [[IAM-Policy|정책 평가와 권한 경계]]
- [x] [[Dependency-Vulnerability-Scanning|Dependency vulnerability scanning]] — 기존 보강: [[Dependency-Management#취약점 스캔|Dependabot, Snyk와 언어별 도구]], [[DevOps-vs-DevSecOps#SCA (의존성)|SCA의 파이프라인 위치]], [[Supply-Chain-Security#방어|공급망 방어]]

## 현장사례
- [[IDOR#실제 사례 — 대규모 API 인가 유출|강남언니 API 인가 유출]] — 객체 수준 인가 부재, 과다 데이터 노출, 형제 엔드포인트 재접근
- [[API-Key-Exposure#사례 — 결제 연동키 노출로 결제내역 조회|토스페이먼츠 결제내역 조회]] — 연동키 노출, 시스템 침입 없는 데이터 유출, 과도한 권한 스코프
- [[Hardcoded-Credentials#사례 — 하드코딩된 운영 접속키로 3954만 계정 유출|티빙 계정 유출]] — 소스 코드 내 운영 접속키, 개발 환경에서 운영 인프라로 이동, 1차 차단 뒤 다른 키로 재반출
- [[Kakao-Ent-Seminar#보안|카카오엔터 보안]] — 서비스 접근 권한, 네트워크 망 설정
- [[Fintech-Seminar#망분리|금융 망분리]] — 법적 망분리 의무 (개념과 현행 규정 범위는 [[Network-Separation|망분리와 망연계]])
- [[TS-Backend-Meetup-1#Cryptographic Hash 101|패스워드 해싱]] — Argon2id 우선, scrypt 대안, bcrypt는 입력 길이와 work factor 관리가 필요한 레거시 선택지
