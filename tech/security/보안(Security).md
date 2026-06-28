---
tags: [security]
status: index
category: "보안(Security)"
aliases: ["보안(Security)", "Security"]
---

# 보안(Security)

## 목차

- [[tech/security/auth/인증(Auth)|인증 (Auth)]] — Session, JWT, OAuth2, FIDO, Refresh Token
- [[tech/security/crypto/암호(Crypto)|암호 (Cryptography)]] — 패스워드 해싱, 공개키, RSA
- [[tech/security/web-attacks/웹공격(WebAttacks)|웹 공격 (Web Attacks)]] — CORS, CSRF, XSS
- [[tech/security/secrets/Secret-Management|시크릿 관리 (Secret Management)]] — Vault, K8s Secret 제거, CSI/Injector/AVP/ESO 주입, Auto Unseal, 동적 시크릿
- [[Supply-Chain-Security|공급망 보안 (Supply Chain)]] — PyPI/npm 공급망 공격, postinstall/.pth, 전이 의존성, AI 네이티브 상방-하방 딜레마, lockfile 핀/대응 플레이북
- [[tech/security/age-identity-verification/연령신원검증(AgeIdentityVerification)|연령/신원 검증 (Age & Identity Verification)]] — age assurance, IDV, PET, 규제 지형, 제3자 위탁 리스크

## 미작성
- [ ] [[Token-Revocation|Token Revocation]]
- [ ] [[SQL-Injection]]
- [ ] [[SSRF]]
- [ ] [[JWT-Security|JWT security]]
- [ ] [[TLS-Config|TLS config]]
- [ ] [[Rate-Limit|Rate limit]]
- [ ] [[WAF]]
- [ ] [[Audit-Log|Audit log]]
- [ ] [[Least-Privilege-IAM|Least privilege IAM]]
- [ ] [[Dependency-Vulnerability-Scanning|Dependency vulnerability scanning]]

## 현장사례
- [[Kakao-Ent-Seminar#보안|카카오엔터 보안]] — 서비스 접근 권한, 네트워크 망 설정
- [[Fintech-Seminar#망분리|금융 망분리]] — 법적 망분리 의무
- [[TS-Backend-Meetup-1#Cryptographic Hash 101|패스워드 해싱]] — argon2/balloon 권장, SHA-256/bcrypt 부적합
