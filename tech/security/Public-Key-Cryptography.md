---
tags: [security, cryptography, public-key, asymmetric, pki]
status: done
category: "보안(Security)"
aliases: ["Public Key Cryptography", "공개키 암호", "비대칭키 암호"]
---

# 공개키 암호 · 비대칭키 암호

대칭키 암호(AES 같은 하나의 키로 암·복호화)의 **키 분배 문제**를 해결하기 위해 등장. 두 개의 수학적으로 연결된 키를 사용하여 **한 키로 암호화한 것은 다른 키로만 복호화**되도록 설계한다. HTTPS/TLS·SSH·PGP·서명 등 현대 보안의 뼈대.

## 핵심 원리

- **공개키(Public Key)** — 누구에게나 공개. 암호화 또는 서명 검증에 사용
- **개인키(Private Key)** — 소유자만 보관. 복호화 또는 서명 생성에 사용
- 두 키는 수학적 함수로 연결되지만, 공개키에서 개인키를 역산하는 것은 **계산적으로 불가능**해야 한다

## 대칭키 vs 비대칭키

| 축 | 대칭키 (AES 등) | 비대칭키 (RSA/ECC) |
|---|---|---|
| 키 수 | 1개 | 2개(쌍) |
| 속도 | 빠름 | 약 1000배 느림 |
| 키 교환 | 사전 공유 필요 — **핵심 난제** | 공개키는 누구나 받아도 됨 |
| N명 간 관리 | N(N-1)/2개 키 | N쌍(2N개) |
| 용도 | 대용량 데이터 암호화 | 키 교환·서명·인증 |

실무에서는 **하이브리드**로 쓴다: 비대칭키로 세션 키(대칭키)를 안전하게 교환한 뒤, 이후 통신은 빠른 대칭키로.

## 제공하는 두 가지 서비스

### 1. 기밀성(Confidentiality)

송신자가 **수신자의 공개키로 암호화** → 오직 수신자의 개인키로만 복호화 가능.

```
Alice → (message encrypted with Bob's public key) → Bob
Bob: decrypt with his private key
```

### 2. 인증·무결성(Authentication · Integrity) — 디지털 서명

송신자가 **자신의 개인키로 서명** → 수신자가 송신자의 공개키로 검증. 개인키는 본인만 보유하므로 서명 자체가 신원 증명.

```
Alice: sign(message, Alice's private key) → signature
Bob: verify(message, signature, Alice's public key) → 일치 여부
```

실전에서는 메시지 전체가 아니라 **해시값을 서명**해 성능을 확보(RSA-PSS·ECDSA 등).

## 주요 알고리즘

| 알고리즘 | 기반 | 특징 |
|---|---|---|
| **RSA** | 큰 수의 소인수분해 난제 | 가장 보편적, 키 2048/3072/4096 비트 |
| **ECC (ECDSA/Ed25519)** | 타원 곡선 이산 로그 | 짧은 키로 동등 보안(256비트=RSA 3072비트), 모바일·IoT |
| **Diffie-Hellman (DH/ECDH)** | 이산 로그 | **키 교환 전용**(암호화 아님) — TLS 세션 키 합의 |
| **DSA** | 이산 로그 | 서명 전용. 현재는 ECDSA가 대체 |

[[RSA-Encryption|RSA의 구체 동작]]은 별도 문서.

## Man-in-the-Middle(MITM) 공격과 PKI

공개키를 직접 주고받으면 중간자가 **자기 공개키로 바꿔치기**해 도청·변조할 수 있다. 해결책은 **공개키가 진짜 누구의 것인지 증명**하는 메커니즘.

### PKI (Public Key Infrastructure)

- **CA(Certificate Authority)** — 신뢰받는 기관이 "이 공개키는 이 도메인/사람의 것"임을 **인증서**로 서명
- **인증서 체인** — 루트 CA → 중간 CA → 말단 인증서. 브라우저는 루트 CA 목록을 내장
- **CRL/OCSP** — 폐기된 인증서 확인
- HTTPS는 이 구조 위에서 서버 인증서 검증 + 세션 키 교환 수행

### Web of Trust (PGP 스타일)

CA 대신 **개인 간 신뢰 링크**로 공개키 정당성을 검증. 대규모 서비스엔 부적합, 보안 커뮤니티에서 사용.

## 실전 프로토콜에서의 조합

- **TLS/HTTPS** — 서버 인증서(RSA/ECC)로 서버 인증 → ECDHE로 세션 키 합의 → AES-GCM으로 본 데이터 암호화
- **SSH** — 공개키 인증(`~/.ssh/authorized_keys`) + 세션 키 교환
- **JWT (RS256/ES256)** — 서명에 비대칭키 사용 → 발급자만 서명 생성, 모든 서비스가 공개키로 검증
- **암호화폐 지갑** — 개인키가 곧 자산 소유권, 공개키로 주소 파생

## 흔한 오해

- "공개키 암호가 대칭키보다 안전하다" — 동일 보안 수준을 위해 더 긴 키가 필요할 뿐, 본질적으로 우열 관계 아님
- "공개키만 있으면 해독 가능" — 수학적으로 불가능한 것이 전제. 양자 컴퓨터가 현실화되면 RSA·ECC 대체 필요(Post-Quantum Crypto)
- "개인키가 노출되면 회수할 수 있다" — 사실상 불가능. **rotate 후 이전 키 폐기**가 유일한 대응

## 면접 체크포인트

- 대칭키 vs 비대칭키의 역할 분담(왜 하이브리드가 표준인가)
- 기밀성 vs 서명 시 키 사용 방향 차이
- MITM 공격과 PKI·인증서 체인의 관계
- TLS 핸드셰이크에서 비대칭키·대칭키가 각각 어디에 쓰이는가
- Post-Quantum 시대 대비(CRYSTALS-Kyber 등)

## 출처
- [crocus — 공개키 암호 개요](https://www.crocus.co.kr/1236)

## 관련 문서
- [[RSA-Encryption|RSA 암호화]]
- [[HTTPS-TLS|HTTPS · TLS Handshake]]
- [[JWT|JWT]]
- [[Password-Hashing|패스워드 해싱]]
- [[FIDO-Seminar|FIDO · 패스키]]
