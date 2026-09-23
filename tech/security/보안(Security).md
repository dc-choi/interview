---
tags: [security]
status: index
category: "보안(Security)"
aliases: ["보안(Security)", "Security Index"]
---

# 보안(Security)

## 목차

- [[Application-Security|애플리케이션 보안 / 시큐어코딩]] — 4대 원칙, 진단 vs 모의해킹, OWASP Top 10, 트렌드 리스크, 클라이언트 불신, 학습 경로
- [[CIA-Triad|CIA Triad (기밀성, 무결성, 가용성)]] — 세 보안 목표, 위협과 통제, 트레이드오프와 가장 약한 고리
- [[Access-Control-Models|접근 제어 모델 (RBAC, ABAC, PBAC)]] — 역할, 속성, 정책의 관계, PAP/PDP/PIP/PEP, 하이브리드 설계와 운영
- [[tech/security/auth/인증(Auth)|인증 (Auth)]] — Session, JWT, OAuth2, Token Exchange, FIDO, Refresh Token, Spring Security
- [[tech/security/crypto/암호(Crypto)|암호 (Cryptography)]] — 패스워드 해싱, 공개키, RSA
- [[tech/security/web-attacks/웹공격(WebAttacks)|웹 공격 (Web Attacks)]] — CORS, CSRF, XSS, SQL Injection, IDOR, SSRF
- [[Actuator-Exposure|Actuator 노출 (Security Misconfiguration)]] — 운영 엔드포인트 노출, 필요한 것만 열기
- [[tech/security/secrets/Secret-Management|시크릿 관리 (Secret Management)]] — Vault, K8s Secret 제거, CSI/Injector/AVP/ESO 주입, Auto Unseal, 동적 시크릿
- [[tech/security/secrets/API-Key-Exposure|API 연동 키 노출과 최소 권한 스코프]] — 자격증명 노출, 권한 범위가 곧 공격 표면, 클라이언트/서버 키 구분, 정상 요청 위장 탐지
- [[tech/security/secrets/Hardcoded-Credentials|하드코딩된 자격증명]] — 소스 접근이 운영 접근이 되는 경로, 증폭 요인(장기 키, 전체 접근, 메신저 공유, 짧은 로그), 시크릿 스캐닝 한계와 임시 자격증명
- [[Supply-Chain-Security|공급망 보안 (Supply Chain)]] — PyPI/npm 공급망 공격, postinstall/.pth, 전이 의존성, AI 네이티브 상방-하방 딜레마, lockfile 핀/대응 플레이북
- [[tech/security/network-security/네트워크보안(NetworkSecurity)|네트워크 보안 (Network Security)]] — 경계 보안과 공인 IP 배치, UTM, 보안 장비 배치 순서, 인라인과 아웃오브패스, 포트 미러링과 TAP, IDS와 IPS, ARP 스푸핑과 DAI, ARP 기반 NAC 차단, 망분리와 망연계
- [[LLM-Application-Security|LLM 애플리케이션 보안 (OWASP Top 10 2025)]] — 프롬프트 인젝션, 민감정보 유출, 공급망, 데이터 오염, 출력 처리, 과도한 위임, 시스템 프롬프트 유출, RAG 임베딩, 허위정보, 무제한 소비
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
