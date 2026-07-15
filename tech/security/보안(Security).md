---
tags: [security]
status: index
category: "보안(Security)"
aliases: ["보안(Security)", "Security Index"]
---

# 보안(Security)

## 목차

- [[Application-Security|애플리케이션 보안 / 시큐어코딩]] — 4대 원칙, 진단 vs 모의해킹, OWASP Top 10, 트렌드 리스크, 클라이언트 불신, 학습 경로
- [[tech/security/auth/인증(Auth)|인증 (Auth)]] — Session, JWT, OAuth2, FIDO, Refresh Token
- [[tech/security/crypto/암호(Crypto)|암호 (Cryptography)]] — 패스워드 해싱, 공개키, RSA
- [[tech/security/web-attacks/웹공격(WebAttacks)|웹 공격 (Web Attacks)]] — CORS, CSRF, XSS, IDOR, SSRF
- [[Actuator-Exposure|Actuator 노출 (Security Misconfiguration)]] — 운영 엔드포인트 노출, 필요한 것만 열기
- [[tech/security/secrets/Secret-Management|시크릿 관리 (Secret Management)]] — Vault, K8s Secret 제거, CSI/Injector/AVP/ESO 주입, Auto Unseal, 동적 시크릿
- [[Supply-Chain-Security|공급망 보안 (Supply Chain)]] — PyPI/npm 공급망 공격, postinstall/.pth, 전이 의존성, AI 네이티브 상방-하방 딜레마, lockfile 핀/대응 플레이북
- [[Network-Perimeter-Security|네트워크 경계 보안]] — 공인 IP 배치 원칙, UTM, 보안 장비 배치 순서, 프록시 방식 WAF와 SSL 종료
- [[LLM-Application-Security|LLM 애플리케이션 보안 (OWASP Top 10 2025)]] — 프롬프트 인젝션, 민감정보 유출, 공급망, 데이터 오염, 출력 처리, 과도한 위임, 시스템 프롬프트 유출, RAG 임베딩, 허위정보, 무제한 소비
- [[tech/security/age-identity-verification/연령신원검증(AgeIdentityVerification)|연령/신원 검증 (Age & Identity Verification)]] — age assurance, IDV, PET, 규제 지형, 제3자 위탁 리스크

## 미작성
- [ ] `SQL-Injection` (작성 예정)
- [ ] TLS config (작성 예정: `TLS-Config`)
- [ ] Rate limit (작성 예정: `Rate-Limit`)
- [x] [[Shield-WAF-NetworkFirewall|WAF]]
- [ ] Audit log (작성 예정: `Audit-Log`)
- [ ] Least privilege IAM (작성 예정: `Least-Privilege-IAM`)
- [ ] Dependency vulnerability scanning (작성 예정: `Dependency-Vulnerability-Scanning`)

## 현장사례
- [[Kakao-Ent-Seminar#보안|카카오엔터 보안]] — 서비스 접근 권한, 네트워크 망 설정
- [[Fintech-Seminar#망분리|금융 망분리]] — 법적 망분리 의무
- [[TS-Backend-Meetup-1#Cryptographic Hash 101|패스워드 해싱]] — Argon2id 우선, scrypt 대안, bcrypt는 입력 길이와 work factor 관리가 필요한 레거시 선택지
