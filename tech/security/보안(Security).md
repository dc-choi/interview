---
tags: [security]
status: index
category: "보안(Security)"
aliases: ["보안(Security)", "Security"]
---

# 보안(Security)

## 인증
- [x] [[tech/security/auth/Session|Session]] / [[tech/security/auth/JWT|JWT]]
- [x] [[tech/security/auth/OAuth2|OAuth2 / OIDC]]
- [x] [[tech/security/auth/FIDO-Seminar|FIDO & 패스키(Passkey)]]
- [x] [[tech/security/auth/Refresh-Token-Rotation|Refresh Token Rotation]]
- [ ] [[Token-Revocation|Token Revocation]]

## 암호
- [x] [[tech/security/crypto/Password-Hashing|패스워드 해싱 (argon2, Salt, TLS)]]
- [x] [[tech/security/crypto/Public-Key-Cryptography|공개키 암호 · 비대칭키 (대칭/비대칭 하이브리드, PKI, MITM)]]
- [x] [[tech/security/crypto/RSA-Encryption|RSA 암호화 (소인수분해 난제, 키 생성·암복호·서명, OAEP/PSS 패딩)]]

## 웹 공격
- [x] [[tech/security/web-attacks/CSRF|CSRF Protection]]
- [x] [[tech/security/web-attacks/CORS|CORS / CSP]]
- [x] [[tech/security/web-attacks/XSS|XSS]]

## 현장사례
- [[Kakao-Ent-Seminar#보안|카카오엔터 보안]] — 서비스 접근 권한, 네트워크 망 설정
- [[Fintech-Seminar#망분리|금융 망분리]] — 법적 망분리 의무
- [[TS-Backend-Meetup-1#Cryptographic Hash 101|패스워드 해싱]] — argon2/balloon 권장, SHA-256/bcrypt 부적합, Salt 오해

## 웹/앱 보안 (미작성)
- [ ] [[SQL-Injection]]
- [ ] [[SSRF]]
- [ ] [[JWT-Security|JWT security]]
- [ ] [[Secret-Management|Secret management (KMS / Vault)]]
- [ ] [[TLS-Config|TLS config]]
- [ ] [[Rate-Limit|Rate limit]]
- [ ] [[WAF]]
- [ ] [[Audit-Log|Audit log]]
- [ ] [[Least-Privilege-IAM|Least privilege IAM]]
- [ ] [[Dependency-Vulnerability-Scanning|Dependency vulnerability scanning]]
