---
tags: [web, https, tls, security, certificate]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["HTTPS와 TLS", "SSL/TLS", "TLS 인증서"]
verified_at: 2026-07-16
---

# HTTPS와TLS핸드셰이크

SSL/TLS는 클라이언트와 서버 사이의 통신을 안전하게 만드는 프로토콜로, 기밀성(남이 내용을 볼 수 없게), 무결성(데이터가 중간에 변조되지 않았음), 서버 인증(접속한 서버가 진짜 그 도메인의 서버인지)을 보장한다. HTTPS는 HTTP에 TLS를 더한 형태다. 이는 네트워크를 오가는 데이터를 보호하는 Encryption in Transit의 대표 구현이며, 디스크나 DB에 저장된 데이터를 보호하는 Encryption at Rest(S3, EBS, RDS의 [[KMS]] 기반 암호화)와는 보호하는 대상이 다르다.

TLS의 핵심 설계는 비대칭키로 신뢰와 키 교환 문제를 풀고, 대칭키로 빠른 통신을 수행하는 하이브리드 구조다. 대칭, 비대칭 원리와 전자서명은 [[Public-Key-Cryptography]].

명칭 정리: SSL은 Netscape가 만든 원조 프로토콜이고, IETF 표준화를 거치며 TLS로 이름이 바뀌었다(SSL 3.0의 후속이 TLS 1.0). SSL이라는 이름이 관용적으로 남아 있을 뿐, SSL 2.0/3.0은 취약점으로 폐기됐고(RFC 6176, RFC 7568) TLS 1.0/1.1도 폐기 권고되어(RFC 8996) 현재 표준은 TLS 1.2/1.3이다.

## HTTPvsHTTPS

| 구분 | HTTP | HTTPS |
|------|------|-------|
| 프로토콜 | 평문 전송 | TLS로 암호화 전송 |
| 포트 | 80 | 443 |
| 보안 | 도청, 변조 가능 | 암호화로 보호 |
| 인증서 | 불필요 | SSL/TLS 인증서 필요 |
| 성능 | 빠름 | 핸드셰이크 오버헤드 있음 (초기 연결 시) |

## 서버인증서와CA

인증서는 이 서버가 정말 해당 도메인의 서버가 맞다는 것을 증명하는 디지털 신분증이다. 클라이언트가 `google.com`에 접속해도 그 서버가 진짜 구글 서버인지 처음에는 알 수 없다. 그래서 신뢰받는 기관인 CA(Certificate Authority)가 서버의 신원을 확인하고 자신의 비밀키로 인증서에 서명해 발급한다. 클라이언트는 미리 신뢰하고 있는 CA의 공개키로 그 서명을 검증한다. 검증이 성공하면 서버를 신뢰할 수 있다고 판단하고 이후 키 교환 절차를 진행한다.

인증서 체인(루트 CA → 중간 CA → 말단 인증서)과 폐기 확인(CRL/OCSP) 등 PKI 일반은 [[Public-Key-Cryptography]], 인증서 자동 발급은 [[ACME-Protocol]].

## TLS핸드셰이크과정

```
클라이언트                          서버
    |--- Client Hello -------->|
    |   (지원하는 cipher suite,   |
    |    랜덤 값)                 |
    |                           |
    |<-- Server Hello ---------|
    |   (선택된 cipher suite,     |
    |    랜덤 값, 인증서)          |
    |                           |
    |--- 인증서 검증 (CA 공개키) -|
    |                           |
    |--- 키 교환 --------------->|
    |   (프리마스터 시크릿)         |
    |                           |
    |<=> 세션 키 생성 ==========>|
    |   (양쪽 동일한 세션 키)      |
    |                           |
    |<=== 암호화 통신 시작 ======>|
```

### 단계별설명
1. **Client Hello**: 클라이언트가 지원하는 cipher suite 목록과 랜덤 값 전송
2. **Server Hello**: 서버가 cipher suite 선택, 자신의 랜덤 값과 인증서 전송
3. **인증서 검증**: 클라이언트가 받은 서버 인증서를 신뢰하는 CA의 공개키로 검증해 서버 신원 확인. 실패하면 브라우저가 연결이 안전하지 않다는 경고를 띄운다
4. **키 교환**: 클라이언트가 프리마스터 시크릿을 서버의 공개키로 암호화하여 전송 (TLS 1.2 이하 RSA 키 교환 기준)
5. **세션 키 생성**: 클라이언트 랜덤 + 서버 랜덤 + 프리마스터 시크릿 → 마스터 시크릿 → **세션 키**
6. **암호화 통신**: 세션 키(대칭키)로 실제 데이터를 암호화

비대칭키는 서버 인증과 세션 키 교환에만 쓰이고, 실제 대량 데이터는 빠른 대칭키(세션 키)로 처리한다. 통신이 끝나면 핸드셰이크와 별개인 Alert 프로토콜(close_notify)로 연결을 닫고 그 연결의 세션 키를 폐기한다(세션 재개용 티켓/PSK는 별도 보관될 수 있음).

위 그림의 키 교환(프리마스터 시크릿을 서버 공개키로 암호화)은 TLS 1.2까지의 RSA 키 교환 기준이다. TLS 1.3은 forward secrecy(순방향 비밀성)를 위해 RSA 키 전송을 제거했다. 인증서 기반 핸드셰이크에서는 (EC)DHE로 키를 합의하고(세션 재개는 PSK 또는 PSK+(EC)DHE — RFC 8446), 이때 서버 인증서의 키는 암호화가 아니라 서명(서버 인증)에 쓰인다. 아래 Cipher Suite 예시의 ECDHE가 그 방식이다.

## CipherSuite

암호화 통신에 사용할 알고리즘 조합을 정의:

```
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
 │     │     │        │     │     │
 │     │     │        │     │     └─ 해시 알고리즘
 │     │     │        │     └─ 암호화 모드
 │     │     │        └─ 대칭 암호화 알고리즘 (데이터 암호화)
 │     │     └─ 인증 알고리즘 (서버 인증)
 │     └─ 키 교환 알고리즘
 └─ 프로토콜
```

| 구성요소 | 역할 | 예시 |
|---------|------|------|
| 키 교환 | 세션 키를 안전하게 공유 | ECDHE, DHE, RSA |
| 인증 | 서버(또는 클라이언트) 신원 확인 | RSA, ECDSA |
| 대칭 암호화 | 실제 데이터 암호화 | AES-128, AES-256, ChaCha20 |
| 해시 | 무결성 검증 | SHA-256, SHA-384 |

## 자체서명(Self-Signed)인증서

CA 없이 자신의 개인키로 직접 서명해 만든 인증서. openssl로 개인키와 CSR(인증서 서명 요청)을 만들고 그 개인키로 서명하면 된다.

```bash
# san.cnf 에 subjectAltName(DNS:localhost, IP:127.0.0.1) 확장을 정의해 둔다
openssl req -new -newkey rsa:2048 -nodes -keyout server.key -out server.csr -config san.cnf
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt -extfile san.cnf -extensions v3_ext
```

실무 디테일 둘. 호스트명 검증은 인증서의 SAN(Subject Alternative Name) 기준이라(크롬은 CN 폴백을 제거했다) 자체서명이라도 설정 파일에 `subjectAltName = DNS:localhost, IP:127.0.0.1`을 넣어야 하고, `openssl x509 -req`는 CSR의 확장을 기본으로 복사하지 않으므로 서명 단계에서 `-extfile`로 확장을 다시 지정해야 SAN이 인증서에 실린다. 서버가 실제로 내놓는 인증서는 `openssl s_client -connect host:443` 출력을 `openssl x509 -noout -subject -issuer`로 파이프해 확인할 수 있다 — subject와 issuer가 같으면 자체서명이다.

암호화 통신 자체는 성립하지만, 브라우저가 신뢰하는 CA 체인에 연결되지 않으므로 서버 신원이 보증되지 않는다. 그래서 브라우저는 안전하지 않은 연결 경고를 띄우고, curl은 `-k`(신뢰 검사 생략) 없이는 거부한다. 용도는 로컬과 내부 테스트까지. 공개 서비스는 CA 발급을 쓰고(자동 발급은 Let's Encrypt → [[ACME-Protocol]]), 로컬 개발에서 경고 없는 HTTPS가 필요하면 mkcert(로컬 CA를 OS 신뢰 저장소에 등록)를 쓴다.

## 면접포인트
- "HTTPS가 느린 이유?" → 초기 TLS 핸드셰이크 오버헤드. TLS 1.3에서는 1-RTT로 개선
- "SSL과 TLS의 차이?" → 같은 계보의 프로토콜. Netscape의 SSL이 IETF 표준화로 TLS가 됐고, SSL 2.0/3.0과 TLS 1.0/1.1은 폐기되어 현재 표준은 TLS 1.2/1.3
- "대칭키와 비대칭키를 왜 같이 쓰나?" → 비대칭키로 서버를 인증하고 세션 키(대칭키)를 안전하게 교환, 이후 빠른 대칭키로 통신
- "인증서로 무엇을 검증하나?" → CA가 비밀키로 서명한 인증서를 CA 공개키로 검증해 서버 신원 확인 (도메인이 진짜 그 서버인지)
- "Encryption at Rest와 in Transit 차이?" → 저장 데이터 암호화(디스크, DB, [[KMS]]) vs 전송 데이터 암호화(TLS)
- "HTTPS만 하면 보안 끝?" → XSS, CSRF 등 애플리케이션 레벨 공격은 별도 방어 필요

## 출처
- [RFC 8996 — Deprecating TLS 1.0 and TLS 1.1 (SSL 2.0/3.0 폐기 이력 포함) — IETF](https://datatracker.ietf.org/doc/html/rfc8996)
- [HTTPS 원리 이해하기 — brunch @growthminder](https://brunch.co.kr/@growthminder/79)
- [AWS 기초 보안: 암호화, 대칭키/비대칭키, SSL/TLS 인증서 — YouTube](https://www.youtube.com/watch?v=VvacoRwYGZc&list=PLfth0bK2MgIYuFahPhXTpTomkwVx5Fl-v&index=7)
- [웹보안 — 딩코딩코 (개발자 취업 필수 개념 강의)](https://fern-freeze-290.notion.site/37aade118e3680908aeee8bb5a517c7d)
- [dingco-web-security — dingcodingco (GitHub, 강의 실습 소스)](https://github.com/dingcodingco/dingco-web-security)

## 관련 문서
- [[Public-Key-Cryptography|공개키 암호, PKI]]
- [[ACME-Protocol|ACME Protocol, Let's Encrypt 인증서 자동화]]
- [[KMS|AWS KMS (Encryption at Rest)]]
- [[DNS|DNS]]
- [[Browser-URL-Flow|브라우저 URL 입력 흐름]]
