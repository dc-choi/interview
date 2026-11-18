---
tags: [security, crypto, key-management, hsm]
status: index
category: "Security - 암호"
aliases: ["Key Management", "키 관리", "암호 키 관리"]
---

# 키 관리

키를 어디에 두고, 누가 쓰게 하며, 어떻게 바꾸고 없애는지를 다루는 문서 모음이다. 애플리케이션 비밀 값의 보관은 [[Secret-Management|비밀 관리]]에, 인증서 갱신은 [[PKI-TLS|PKI와 TLS]]에 있다.

## 목차

- [x] [[HSM-Key-Custody|HSM과 서명 키 관리 (비추출 키, 다계층 접근 제어, 고가용성, 키 수명 주기)]] — 서명 서비스 악용과 위임 철회, 출금 중단과 온체인 권한의 구분
- [x] [[HSM-Signing-Operations|HSM 서명 시스템 운영과 무중단 키 전환 (PKCS #11 세션, fallback, 관측, RS256에서 ES256, kid 전환)]]
- [x] [[Crypto-Shredding|Crypto-shredding (cryptographic erase, 키 계층과 파기 범위, 평문과 키 사본, 백업과 한계)]]

## 관련 문서

- [[암호(Crypto)|암호 인덱스]]
