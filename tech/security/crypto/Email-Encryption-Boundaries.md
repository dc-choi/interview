---
tags: [security, email, encryption, tls, openpgp, smime]
status: done
verified_at: 2026-11-02
category: "Security - 암호"
aliases: ["Email Encryption Boundaries", "이메일 암호화의 보호 범위", "MTA-STS", "SMTP DANE", "제로 액세스 암호화"]
---

# 이메일 암호화: 전송, 저장과 종단의 보호 범위

이메일은 작성 기기, 발신 서비스, 중계 서버, 수신 서비스와 수신 기기를 지난다. 암호화 여부는 이 경로의 어느 구간과 어떤 데이터에 적용되는지로 설명한다. 네트워크 도청, 디스크 도난, 서비스 운영자의 열람과 단말 침해는 서로 다른 위협이다.

## 보호하는 구간과 키 보유자를 묻는다

| 방식 | 주로 보호하는 범위 | 남는 경계 |
|---|---|---|
| 기기와 서비스 사이 TLS | 해당 연결에서 전송되는 데이터 | TLS가 끝나는 서비스는 평문을 처리할 수 있음 |
| 서버 사이 SMTP TLS | 각각의 MTA 연결 | 중계와 수신 서버에서 평문 처리 가능, 기회적 TLS의 강등 위험 |
| 디스크/저장 암호화 | 저장매체를 분리해 읽는 공격 | 서비스를 장악해 복호화 키나 평문 처리 경로를 사용하면 별도 위험 |
| 제로 액세스 저장 암호화 | 서비스가 저장된 본문을 복호화할 키를 보유하지 않는 구성 | 수신 순간의 처리, 발신자 측 사본과 메타데이터는 별도 확인 |
| 종단 간 암호화(E2EE) | 송신 종단에서 수신 종단까지 보호한 본문과 첨부 | 종단 기기와 키, 수신자의 재공유, 보호하지 않은 헤더 |

서비스가 키를 가지고 암호문을 복호화할 수 있다면 저장 암호화만으로 서비스 침해나 데이터 제출 요구에 대한 보호가 보장되지 않는다. E2EE도 법적 의무 자체를 없애는 기능은 아니며, 서비스가 실제로 보유한 메타데이터와 계정 기록은 따로 확인한다.

## SMTP의 기회적 TLS를 보완한다

서버 간 STARTTLS가 기회적으로 사용되면 공격자가 TLS 협상이나 서버 탐색을 방해해 평문 전송을 유도할 수 있다. 다음 두 방식은 송신 서버가 수신 도메인의 요구를 알아내고 인증된 TLS를 요구하게 하는 접근이다.

- **MTA-STS(RFC 8461):** 수신 도메인이 HTTPS로 제공하는 정책에 TLS와 허용 MX 조건을 선언한다. `enforce` 정책의 조건을 만족하지 못하면 전송을 실패 또는 지연시킨다. 정책을 처음 알아내는 단계와 캐시, 정책 만료의 조건도 확인한다.
- **SMTP DANE(RFC 7672):** DNSSEC으로 검증한 TLSA 레코드를 이용해 SMTP 서버의 인증 조건을 확인한다. DNSSEC 검증과 TLSA 처리 지원이 전제이며 모든 도메인에 자동 적용되지는 않는다.

이는 서버 사이 전송의 보호다. 수신 서버가 내용을 읽을 수 없는 종단 간 암호화로 바뀌는 것은 아니다.

## 제로 액세스와 종단 간 암호화를 구분한다

제로 액세스는 서비스의 저장 구조에 관한 설명이고, E2EE는 메시지 경로의 양 끝에 관한 설명이다. 외부에서 TLS로 들어온 메일을 서버가 수신 후 사용자 공개키로 암호화하면 저장 사본에는 제로 액세스를 적용할 수 있어도 수신 순간까지 E2EE였던 것은 아니다.

2026-11-02 Proton 공식 문서는 외부 서비스에서 들어오는 일반 메일은 TLS 전송 후 제로 액세스로 저장하며, 외부 발신 서비스에 사본이 남을 수 있다고 설명한다. Proton끼리 또는 적절한 PGP 구성의 통신과 일반 외부 메일을 같은 보호 범위로 묶지 않는다. 이 구분은 해당 제품 설명이며 다른 서비스의 키 보관 설계를 보장하지 않는다.

OpenPGP(RFC 9580)와 S/MIME 4.0(RFC 8551)은 메시지 암호화와 서명의 표준이다. 암호화만 했다고 발신자의 신원을 검증한 것은 아니므로 키의 소유자와 신뢰 경로도 확인한다. 제목, 발신/수신 주소와 전달에 필요한 메타데이터의 보호 범위는 실제 클라이언트와 프로토콜 구성별로 확인한다.

## 운영 체크포인트

- 어느 홉에서 TLS가 종료되고, 본문을 읽을 수 있는 주체는 누구인가?
- 외부 주소로 보내는 순간 E2EE가 유지되는가, TLS로 바뀌는가?
- 키 분실과 계정 복구가 기존 암호문 복구에 어떤 영향을 주는가?
- 메일 검색, 미리보기, 알림, 백업과 포워딩이 평문 사본을 남기는가?
- 본문과 첨부뿐 아니라 제목과 메타데이터의 보관 정책도 확인했는가?

## 출처

- [IETF, RFC 8461: SMTP MTA Strict Transport Security](https://www.rfc-editor.org/rfc/rfc8461)
- [IETF, RFC 7672: SMTP Security via Opportunistic DANE TLS](https://www.rfc-editor.org/rfc/rfc7672)
- [IETF, RFC 9580: OpenPGP](https://www.rfc-editor.org/rfc/rfc9580)
- [IETF, RFC 8551: S/MIME Version 4.0 Message Specification](https://www.rfc-editor.org/rfc/rfc8551)
- [Proton, How Proton Mail messages are encrypted](https://proton.me/support/proton-mail-encryption-explained)
- [Proton, What is zero-access encryption?](https://proton.me/learn/encryption/types-of-encryption/zero-access)
- GeekNews, 2026-11-02 11:10 사용자 제공 발췌 — 계기 자료. 원 아티클 URL은 제공되지 않아 특정 글 전체를 확인했다고 보지 않는다.

## 관련 문서

- [[HTTPS-TLS|HTTPS와 TLS]]
- [[TLS-Config|TLS 설정]]
- [[Public-Key-Cryptography|공개키 암호와 서명]]
- [[암호(Crypto)|암호 인덱스]]
