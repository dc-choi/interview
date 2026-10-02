---
tags: [security, cryptography, public-key, asymmetric, pki, key-distribution, forward-secrecy, bitcoin]
status: done
verified_at: 2026-10-03
category: "보안(Security)"
aliases: ["Public Key Cryptography", "공개키 암호", "비대칭키 암호"]
---

# 공개키 암호, 비대칭키 암호

대칭키 암호(AES 같은 하나의 키로 암, 복호화)의 키 분배 문제를 줄이는 공개키 기반 기법이다. 공개키와 개인키의 쌍을 쓰지만 용도는 알고리즘과 방식에 따라 암호화, 키 합의와 서명으로 나뉜다. ECDSA와 Ed25519는 서명 방식이므로 공개키로 데이터를 암호화하는 기능이 없다. HTTPS/TLS, SSH와 PGP는 목적에 맞는 기법을 조합한다.

2026-10-03 검증은 RSA의 용도 분리, TLS RFC, PKI 신원 검증과 키 유출 대응에 한정한다. 비트코인 구현, 양자내성 표준 전체와 실제 서비스 배포는 이번 검증 범위에 포함하지 않는다.

## 기초 용어와 분류

- **평문(Plaintext)** — 암호화되지 않은 원본 데이터
- **암호문(Ciphertext)** — 암호 알고리즘과 키로 변환되어 제3자가 읽을 수 없는 데이터
- **암호화(Encryption) / 복호화(Decryption)** — 평문을 암호문으로, 암호문을 다시 평문으로 되돌리는 변환
- **암호 알고리즘** — 변환 절차의 정의. 알고리즘 자체는 공개하고 키만 비밀로 유지하는 것이 현대 암호의 전제(Kerckhoffs 원칙 — AES, RSA 모두 공개 알고리즘)

암호로 지키려는 성질은 내용을 숨기는 기밀성, 변조를 탐지하는 무결성과 상대의 신원을 확인하는 인증이다. 인증된 상대에게 어떤 접근을 허용할지는 별도의 인가 판단이다([[Access-Control-Models|접근 제어]]). 보안 목표 전체의 CIA(기밀성, 무결성, 가용성)와 겹치지만 가용성은 운영과 설계로 지킨다([[CIA-Triad|CIA 삼원칙]]).

해시와 암호 기법은 복호화 가능 여부와 제공하는 기능으로 구분한다.

| 분류 | 복호화 | 대표 | 주 용도 |
|---|---|---|---|
| 단방향 (해시) | 불가 | SHA-256, Argon2id | 무결성 검증(SHA-256), 비밀번호 저장(Argon2id — 범용 해시는 부적합) → [[Password-Hashing]] |
| 양방향 — 대칭키 | 같은 키로 | AES (취약점이 발견된 DES를 대체한 현 표준) | 대용량 데이터 암호화 |
| 공개키 기반 기법 | 암호화 방식에만 복호화가 있음 | RSA, ECDH, ECDSA, Ed25519 | 암호화, 키 합의, 서명 — 방식별 용도를 구분 |

해시는 엄밀히는 키로 되돌릴 수 있는 암호화가 아니라 일방향 요약 함수지만, 관용적으로 단방향 암호화라고도 부른다.

## 핵심 원리

- **공개키(Public Key)** — 공개할 수 있는 키. 방식에 따라 암호화, 서명 검증이나 키 합의에 사용
- **개인키(Private Key)** — 소유자가 보호하는 키. 방식에 따라 복호화, 서명 생성이나 키 합의에 사용
- 두 키는 수학적으로 연결되지만, 안전한 방식과 키 길이에서 공개키로부터 개인키를 계산하는 공격은 현실적으로 실행하기 어려워야 한다

## 공개망에서 키를 나누는 문제

인터넷은 경로상의 장비나 공격자가 트래픽을 보거나 가로챌 수 있는 공용망이다. 대칭키로 통신하려면 암호문을 보내기 전에 같은 키를 상대에게 먼저 건네야 한다. 키를 평문으로 보내면 경로에서 가로챌 수 있고, 키를 암호화해 보내려면 그 암호화에 쓸 키가 또 필요해 같은 문제가 되풀이된다. 전화나 우편처럼 다른 경로로 미리 나누는 방법은 처음 접속하는 불특정 다수에게 쓸 수 없다.

비대칭키는 키를 둘로 나눠 이 순환을 끊는다. 받는 쪽이 키 쌍을 만들고 암호화 키만 내보낸다. 관찰자가 이 키와 암호문을 모두 가로채도 짝인 복호화 키 없이는 평문을 계산적으로 얻기 어렵다(OAEP 같은 안전한 패딩으로 구현한 경우). 암호화 키는 공개해도 되므로 공개키, 복호화 키는 소유자만 가지므로 개인키라고 부른다(비밀키라고도 하지만 비밀키는 대칭키를 가리키는 경우가 많아 이 문서는 개인키로 쓴다). 공개키로 암호화한 송신자 자신도 그 암호문을 되돌리지 못하므로 원본은 송신자가 따로 보관한다. 이 대응은 기밀성 용도에 해당하며, 서명에서는 키를 쓰는 방향이 반대다(아래 디지털 서명). 서명을 개인키로 암호화한다고 설명하기도 하지만 RSA 표준(RFC 8017)도 암호화 방식과 서명 방식을 별도 연산으로 정의하고, ECDSA나 Ed25519처럼 암호화 연산이 없는 서명도 있어 비유로만 받아들인다.

이 설명은 엿보기만 하는 관찰자 기준이다. 공개키를 바꿔치기하는 능동 공격자 앞에서는 받은 공개키가 진짜인지가 새 문제로 남고, 미리 배포된 루트 CA 키에서 출발하는 PKI가 이를 푼다(아래 MITM과 PKI). 순환이 사라지는 것이 아니라, 미리 나눠 둘 대상이 소수의 신뢰 기준점으로 줄어드는 셈이다.

## 대칭키 vs 비대칭키

| 축 | 대칭키 (AES 등) | 비대칭키 (RSA/ECC) |
|---|---|---|
| 키 수 | 1개 | 2개(쌍) |
| 속도 | 빠름 | 느림 — 배수는 연산 종류, 키 길이, 하드웨어 가속에 따라 크게 달라져 단일 수치로 단정하지 않는다 |
| 키 교환 | 사전 공유 필요 — **핵심 난제** | 공개키는 누구나 받아도 됨 |
| N명 간 관리 | N(N-1)/2개 키 | N쌍(2N개) |
| 용도 | 대용량 데이터 암호화 | 키 교환, 서명, 인증 |

대칭키의 대표인 AES는 128비트 블록 단위로 동작하고 키 길이는 128, 192, 256비트 세 가지다(FIPS 197). 키가 길수록 보안 강도가 높고 라운드 수가 늘어 연산이 조금 더 든다. 사람이 입력한 비밀번호를 그대로 키로 쓰지 않는다. 온라인 암호화 도구처럼 비밀번호를 받는 곳도 내부에서는 솔트와 반복 연산을 거친 키 유도 함수(KDF)로 정해진 길이의 키를 만든다. 비밀번호가 약하면 키 길이와 무관하게 추측 공격에 무너지므로 강도는 비밀번호의 엔트로피가 결정한다([[Password-Hashing|패스워드 해싱]]). 기밀성만 있는 모드보다 무결성까지 확인하는 AES-GCM 같은 AEAD 모드를 쓴다([[TLS-Config|TLS 설정]]).

실무에서는 **하이브리드**로 쓴다: 비대칭키로 세션 키(대칭키)를 안전하게 교환한 뒤, 이후 통신은 빠른 대칭키로.

## 제공하는 두 가지 서비스

### 1. 기밀성(Confidentiality)

송신자가 **수신자의 공개키로 암호화** → 오직 수신자의 개인키로만 복호화 가능.

```
Alice → (message encrypted with Bob's public key) → Bob
Bob: decrypt with his private key
```

### 2. 인증, 무결성(Authentication, Integrity) — 디지털 서명

송신자가 **자신의 개인키로 서명** → 수신자가 송신자의 공개키로 검증. 개인키가 보호되고 검증에 쓴 공개키가 그 주체의 것임을 인증서 등으로 확인했다면, 해당 키로 서명했다는 인증 근거가 된다(아래 MITM과 PKI). 서명만으로 사람의 의도나 모든 업무 권한까지 증명하지는 않는다.

```
Alice: sign(message, Alice's private key) → signature
Bob: verify(message, signature, Alice's public key) → 일치 여부
```

RSA-PSS와 ECDSA는 메시지의 해시를 서명 처리에 사용한다. 검증은 서명을 복호화해 원문을 꺼내는 과정이 아니라 메시지, 서명, 공개키를 넣어 맞는지 판정하는 연산이다. 안전한 방식과 보호된 개인키를 전제로, 내용을 바꾸거나 공격자의 키로 서명하면 원래 공개키로 검증되지 않는다. 공개키 바꿔치기에는 인증서와 신원 검증이 필요하고, 개인키 유출이나 구현 결함은 별도의 통제가 필요하다. RSA의 수학적 연산만 그대로 쓰는 textbook RSA는 안전한 암호화나 서명 방식이 아니다. RFC 8017은 OAEP와 PSS를 각각 암호화와 서명 방식으로 정의하며, 새 애플리케이션에서는 한 RSA 키 쌍을 여러 방식에 함께 쓰는 것을 권장하지 않는다([[RSA-Encryption|RSA 암호화]]).

## 주요 알고리즘

| 알고리즘 | 기반 | 특징 |
|---|---|---|
| **RSA** | 큰 수의 소인수분해 난제 | 가장 보편적, 키 2048/3072/4096 비트 |
| **ECC (ECDSA/Ed25519)** | 타원 곡선 이산 로그 | 짧은 키로 동등 보안(256비트=RSA 3072비트), 모바일, IoT |
| **Diffie-Hellman (DH/ECDH)** | 이산 로그 | **키 교환 전용**(암호화 아님) — TLS 세션 키 합의 |
| **DSA** | 이산 로그 | 서명 전용. FIPS 186-5(2023)부터 새 서명 생성에는 승인되지 않으며 ECDSA, EdDSA 등이 대체 |

[[RSA-Encryption|RSA의 구체 동작]]은 별도 문서.

## 공개키만으로 주고받는 단순 모델과 한계

원리만 보면 공개키 암호만으로 양방향 통신을 할 수 있다.

1. 양쪽이 각자 키 쌍을 만든다. 키는 두 쌍, 네 개다.
2. 서로 공개키를 보낸다.
3. 보낼 때는 상대의 공개키로 암호화하고, 받은 암호문은 자기 개인키로 복호화한다.

실제 프로토콜은 이 형태를 그대로 쓰지 않는다.

- **속도와 길이**: 공개키 연산은 대칭키보다 느리고, RSA는 한 번에 모듈러스보다 짧은 메시지만 암호화한다. RFC 8017의 RSAES-OAEP는 메시지 길이를 `k - 2hLen - 2`바이트 이하로 제한하므로 2048비트 키(k = 256)와 SHA-256(hLen = 32)이면 190바이트다. 그래서 공개키로는 세션 키만 다루고 데이터는 대칭키로 암호화한다(하이브리드).
- **공개키의 진위**: 교환 단계에서 받은 공개키가 정말 상대의 것인지 확인할 수단이 없다. 중간자가 양쪽에 자기 공개키를 건네면 오가는 암호문을 모두 풀고 다시 암호화해 넘길 수 있다. 인증서와 PKI가 이 문제를 푼다(아래 MITM과 PKI).
- **전방 비밀성**: 서버 인증서의 장기 공개키로 세션 키의 재료인 프리마스터 시크릿을 암호화해 보내는 방식(정적 RSA 키 전송)은 짝인 서버 개인키가 나중에 유출되면 녹화해 둔 과거 트래픽까지 풀린다. TLS 1.3은 정적 RSA와 정적 Diffie-Hellman 암호 스위트를 없애고, 공개키 기반 키 교환이 모두 전방 비밀성을 제공하도록 했다. RFC 8446에서 도입해 이를 대체한 RFC 9846(2026-07)에도 그대로 있으며, RFC 9846은 연결 사이의 key share 재사용도 금지한다. TLS 1.2에서도 RFC 10015(2026-07)가 RSA 키 교환 스위트와 유한체 Diffie-Hellman 스위트(정적 DH와 임시 DHE 모두)를 금지하고 정적 ECDH 스위트는 쓰지 않도록 권고한다. 그래서 TLS 1.2에서 전방 비밀성이 필요하면 ECDHE 스위트를 쓴다. 이 금지는 (D)TLS 1.2에만 적용되며 TLS 1.3의 FFDHE는 허용된다.

그래서 인증서 기반 전체 핸드셰이크에서 TLS 1.3은 서버의 장기 키를 인증서로 보증해 서명(인증)에 쓰고, 세션 키는 연결마다 새로 만드는 임시 키 교환((EC)DHE 등)으로 합의한다. PSK만 쓰는 세션 재개(psk_ke)와 0-RTT 데이터는 이 전방 비밀성을 온전히 얻지 못한다([[TLS-Config#세션 재개와 0-RTT|TLS 세션 재개와 0-RTT]]). RFC 9846에서도 서버는 항상 인증되고 클라이언트 인증은 선택이라, 브라우저 같은 클라이언트는 보통 인증서 없이 접속하고 사용자 인증은 애플리케이션 계층의 로그인이나 토큰으로 한다. 공개키 쌍을 만들어 교환하는 것만으로 PKI라고 부르기도 하지만, PKI는 공개키의 주인을 인증서로 보증하는 기반 구조를 가리킨다.

## Man-in-the-Middle(MITM) 공격과 PKI

공개키를 직접 주고받으면 중간자가 **자기 공개키로 바꿔치기**해 도청, 변조할 수 있다. 해결책은 **공개키가 진짜 누구의 것인지 증명**하는 메커니즘.

### PKI (Public Key Infrastructure)

- **CA(Certificate Authority)** — 신뢰받는 기관이 "이 공개키는 이 도메인/사람의 것"임을 **인증서**로 서명
- **인증서 체인** — 루트 CA → 중간 CA → 말단 인증서. 브라우저는 루트 CA 목록을 내장
- **서비스 신원 확인** — 신뢰 체인이 유효해도 접속하려는 이름과 인증서의 서비스 식별자가 일치해야 한다(RFC 9525). SNI 전달만으로 이 검사가 이뤄지는 것은 아니다([[TLS-Config#클라이언트와 업스트림 검증|TLS 클라이언트 검증]])
- **CRL/OCSP** — 폐기된 인증서 확인. 공개 웹 PKI는 CA/Browser Forum Baseline Requirements(SC063, 2024-03-15 시행)부터 CA의 CRL 발행이 필수이고 OCSP는 선택이다. 단, 유효기간이 짧은 Short-lived Subscriber Certificate(2026-03-15 이후 발급분은 7일 이하)는 CA가 폐기를 지원하지 않아도 되고 인증서에 CRL 배포 지점을 넣지 않아도 된다(Subscriber 인증서의 CRL 배포 지점은 Short-lived가 아니고 OCSP 주소도 없을 때만 필수다)
- HTTPS는 이 구조 위에서 서버 인증서 검증 + 세션 키 교환 수행

### Web of Trust (PGP 스타일)

CA 대신 **개인 간 신뢰 링크**로 공개키 정당성을 검증. 대규모 서비스엔 부적합, 보안 커뮤니티에서 사용.

## 실전 프로토콜에서의 조합

- **TLS/HTTPS** — 인증서 기반 연결은 서버 인증서(RSA/ECC)로 인증하고 ECDHE 등(하이브리드 KEM 포함)으로 키를 합의한 뒤 AES-GCM 같은 AEAD로 데이터를 보호한다. 새 TCP 기반 HTTPS 연결에서는 TCP 연결 뒤 TLS 핸드셰이크가 진행된다. 0-RTT를 쓰지 않으면 핸드셰이크를 마친 뒤 HTTP 요청을 보내며, 재개와 early data의 예외는 [[TLS-Config#세션 재개와 0-RTT|TLS 세션 재개와 0-RTT]]를 본다. HTTP/3는 QUIC 핸드셰이크에 TLS 1.3이 통합된다. 네트워크 보호 단계이며 DOM, CSSOM, 레이아웃과 페인트로 이어지는 렌더링 방식을 바꾸지 않는다
- **SSH** — 공개키 인증(`~/.ssh/authorized_keys`) + 세션 키 교환
- **JWT (RS256/ES256)** — 서명에 비대칭키 사용 → 발급자만 서명 생성, 모든 서비스가 공개키로 검증
- **암호화폐** — 개인키로 거래에 서명해 장부에 기록된 코인을 옮길 권한을 증명(아래)

## 암호화폐에서 개인키의 역할

코인이 곧 개인키라는 설명은 절반만 맞다. 비트코인을 기준으로 보면 다음과 같다.

- **암호화가 아니라 서명**: 비트코인 거래는 공개 장부에 기록돼 누구나 읽는다. 거래에서 공개키 암호는 내용을 숨기는 데가 아니라 쓸 권한을 증명하는 서명에 쓰인다. 서명은 secp256k1 곡선의 ECDSA이고, Taproot(BIP 341) 출력은 BIP 340 Schnorr 서명을 쓴다.
- **코인은 서명의 연쇄이자 장부의 출력**: 백서는 전자 코인을 디지털 서명의 연쇄로 정의한다. 소유자는 이전 거래의 해시와 다음 소유자의 공개키에 서명해 코인을 넘긴다. 구현에서 잔액은 아직 쓰이지 않은 거래 출력(UTXO)의 합이고, 각 출력은 잠금 조건을 가진다. P2PKH 출력은 공개키 해시로 잠기며, 쓰려면 그 해시와 일치하는 공개키와 짝인 개인키로 만든 서명을 함께 낸다.
- **지갑은 키 모음**: 비트코인 개발자 가이드는 지갑 파일의 핵심을 개인키의 모음으로 설명한다. 코인은 지갑이 아니라 장부에 있고, 지갑은 그 출력을 쓸 키를 보관한다. HD 지갑은 루트 시드 하나에서 키를 파생하므로, 루트 시드나 그 시드를 만드는 BIP39 니모닉(암호문구를 썼다면 그것까지)과 같은 지갑 프로그램의 파생 설정을 함께 보존하면 이후에 만든 키도 다시 파생할 수 있다.
- **결과**: 개인키를 가진 사람은 누구나 유효한 서명을 만들 수 있어, 키가 유출되면 남이 그 코인을 옮길 수 있다. 백서는 신뢰할 제3자 없이 당사자끼리 직접 거래하고, 되돌리기가 계산적으로 비현실적인 거래를 목표로 한다. 그래서 유출된 키로 나간 거래를 취소해 줄 중앙 기관이 없다. 키나 그 키를 파생할 시드를 백업하기 전에 잃으면 그 키로 잠긴 코인은 대개 영구히 쓸 수 없다.

정확한 표현은 개인키가 코인이라는 것이 아니라, 개인키가 장부에 기록된 코인을 옮길 권한을 증명하는 수단이라는 것이다. 멀티시그처럼 여러 키나 추가 조건을 요구하는 잠금도 있다. 과거 블록을 바꾸려면 그 뒤 블록의 작업 증명까지 다시 해야 한다. 정직한 노드가 연산력의 과반을 가진 동안 공격자가 따라잡을 확률은 뒤에 쌓인 블록 수에 따라 지수적으로 줄어, 충분히 깊이 묻힌 기록의 변조는 비현실적이다. 최근 블록은 소수 공격자도 뒤집을 확률이 남는다(백서 4절, 11절). 이 구조는 [[Checksum-and-Hash#해시 체인과 블록체인|해시 체인과 블록체인]].

## 흔한 오해

- "공개키 암호가 대칭키보다 안전하다" — 동일 보안 수준을 위해 더 긴 키가 필요할 뿐, 본질적으로 우열 관계 아님
- "공개키만 있으면 해독 가능" — 안전한 방식과 키 길이에서 공격이 계산적으로 비현실적이라는 전제이며 수학적 불가능을 뜻하지 않는다. 충분한 규모의 양자 컴퓨터는 RSA, ECC의 기반 난제를 위협하므로 양자내성 기법을 검토한다(Post-Quantum Crypto)
- "요청마다 비대칭키와 대칭키를 번갈아 쓴다" — 비대칭 연산은 연결 수립 시 핸드셰이크(인증과 키 합의)에 쓰이고, 그 연결의 이후 요청과 응답은 합의한 대칭 세션 키로 암호화한다
- "개인키가 노출되면 회수할 수 있다" — 공격자가 가진 사본을 회수했다고 보장할 수 없다. 키를 교체하고 기존 키의 사용과 검증 신뢰를 제거한다. TLS 인증서라면 CA의 폐기 절차도 확인하며, 로컬 키 파일 삭제만으로 공격자의 사본이나 이미 발급한 자격증명이 무효화되지는 않는다([[Secret-Management|시크릿 관리]])

## 면접 체크포인트

- 공개망에서 대칭키 분배가 되풀이되는 문제인 이유, 비대칭키가 이를 줄이는 방식과 남는 공개키 진위 문제
- 대칭키 vs 비대칭키의 역할 분담(왜 하이브리드가 표준인가)
- 단순 공개키 교환 모델의 세 한계와 각각의 해법(속도와 길이는 하이브리드, 공개키 진위는 인증서와 PKI, 전방 비밀성은 임시 키 교환)
- 기밀성 vs 서명 시 키 사용 방향 차이
- MITM 공격과 PKI, 인증서 체인의 관계
- TLS 핸드셰이크에서 비대칭키, 대칭키가 각각 어디에 쓰이는가
- 비트코인에서 개인키가 하는 일(서명으로 UTXO를 쓸 권한 증명)과 지갑이 실제로 보관하는 것
- Post-Quantum 시대 대비(키 수립은 FIPS 203의 키 캡슐화 메커니즘 ML-KEM으로 CRYSTALS-Kyber에서 파생, 서명은 FIPS 204의 ML-DSA와 FIPS 205의 SLH-DSA)

## 출처
- [공개키 암호(Public Key Cryptography) — Crocus (Internet Archive 사본)](https://web.archive.org/web/20240616224244/https://www.crocus.co.kr/1236)
- [웹보안 — 딩코딩코 (개발자 취업 필수 개념 강의)](https://fern-freeze-290.notion.site/37aade118e3680908aeee8bb5a517c7d)
- [비대칭키 작동구조와 코인의 실체 — 널널한 개발자 TV](https://www.youtube.com/watch?v=z5RN8XKLDd8)
- [비대칭키가 인터넷 환경에서 사용되는 기본 원리 — 널널한 개발자 TV](https://www.youtube.com/watch?v=jyZ7TQaFy_o)
- [암호학1 - 수업소개 — 생활코딩](https://www.youtube.com/watch?v=NBrcJSkgYmA)
- [암호학1 - 양방향 암호화 방식, 대칭키 방식 — 생활코딩](https://www.youtube.com/watch?v=0nPDwJPxOVQ)
- [암호학1 - 비대칭키(공개키 방식), 기밀성을 위해서 사용하기 — 생활코딩](https://www.youtube.com/watch?v=MR4sCU82tgo)
- [암호법1 - 비대칭키(공개키), 전자 서명하는 방법 — 생활코딩](https://www.youtube.com/watch?v=O7SiDuTCysM)
- [브라우저 렌더링 파이프라인에서 HTTPS 위치 — Threads, 2weekhun](https://www.threads.com/@2weekhun/post/DbZPqiNCuv-)
- [NIST, FIPS 197: Advanced Encryption Standard (AES)](https://csrc.nist.gov/pubs/fips/197/final)
- [IETF, RFC 8017: PKCS #1: RSA Cryptography Specifications Version 2.2](https://www.rfc-editor.org/rfc/rfc8017.html)
- [IETF, RFC 8032: Edwards-Curve Digital Signature Algorithm (EdDSA)](https://www.rfc-editor.org/rfc/rfc8032.html)
- [IETF, RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446.html)
- [IETF, RFC 9846: The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc9846.html)
- [IETF, RFC 9001: Using TLS to Secure QUIC](https://www.rfc-editor.org/rfc/rfc9001.html)
- [IETF, RFC 5246: The Transport Layer Security (TLS) Protocol Version 1.2](https://www.rfc-editor.org/rfc/rfc5246.html)
- [IETF, RFC 10015: Deprecating Obsolete Key Exchange Methods in TLS 1.2 and DTLS 1.2](https://www.rfc-editor.org/rfc/rfc10015.html)
- [IETF, RFC 9525: Service Identity in TLS](https://www.rfc-editor.org/rfc/rfc9525.html)
- [CA/Browser Forum, Baseline Requirements for TLS Server Certificates](https://cabforum.org/working-groups/server/baseline-requirements/requirements/)
- [NIST, FIPS 186-5: Digital Signature Standard (DSS)](https://csrc.nist.gov/pubs/fips/186-5/final)
- [Bitcoin: A Peer-to-Peer Electronic Cash System — Satoshi Nakamoto](https://bitcoin.org/bitcoin.pdf)
- [Bitcoin Developer Guide, Transactions](https://developer.bitcoin.org/devguide/transactions.html)
- [Bitcoin Developer Guide, Wallets](https://developer.bitcoin.org/devguide/wallets.html)
- [Bitcoin BIPs, BIP 340: Schnorr Signatures for secp256k1](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki)
- [Bitcoin BIPs, BIP 341: Taproot: SegWit version 1 spending rules](https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki)
- [NIST, FIPS 203: Module-Lattice-Based Key-Encapsulation Mechanism Standard](https://csrc.nist.gov/pubs/fips/203/final)
- [NIST, FIPS 204: Module-Lattice-Based Digital Signature Standard](https://csrc.nist.gov/pubs/fips/204/final)
- [NIST, FIPS 205: Stateless Hash-Based Digital Signature Standard](https://csrc.nist.gov/pubs/fips/205/final)

## 관련 문서
- [[RSA-Encryption|RSA 암호화]]
- [[HTTPS-TLS|HTTPS, TLS Handshake]]
- [[JWT|JWT]]
- [[Password-Hashing|패스워드 해싱]]
- [[FIDO-WebAuthn|FIDO2, WebAuthn (공개키 기반 인증)]]
- [[Checksum-and-Hash|체크섬과 해시 (해시 체인과 블록체인)]]
- [[TLS-Config|TLS Config (전방 비밀성, 세션 재개)]]
