---
tags: [security, crypto, public-key, rsa, elliptic-curve, post-quantum]
status: index
category: "Security - 암호"
aliases: ["Public Key", "공개키 암호 문서 모음", "비대칭키 문서 모음"]
---

# 공개키 암호

공개키 암호의 원리와 알고리즘별 문서 모음이다. 인증서와 TLS 운영은 [[PKI-TLS|PKI와 TLS]]에, 양자키분배와의 비교는 [[Quantum-Key-Distribution|양자키분배]]에 있다.

## 목차

- [x] [[Public-Key-Cryptography|공개키 암호, 비대칭키 (기초 용어, 단방향/양방향 분류, 키 분배 문제, 대칭/비대칭 하이브리드, PKI, MITM, 암호화폐 개인키)]]
- [x] [[RSA-Encryption|RSA 암호화 (소인수분해 난제, 키 생성, 암복호, 서명, OAEP/PSS 패딩)]]
- [x] [[Elliptic-Curve-Parameter-Provenance|타원곡선 파라미터의 출처]] — 공개 seed 재현, 개인키와의 구분, 선택 과정과 보안 증명의 한계
- [x] [[PQC-Migration|양자내성암호(PQC) 전환]] — HNDL과 서명 위협, ML-KEM과 ML-DSA 크기, NIST, 미국, 영국, 한국 일정, 암호 인벤토리와 CBOM, 우선순위, 하이브리드, 암호 민첩성
- [x] [[PQC-Discovery-and-Execution|PQC 전환 실행]] — 자산 목록과 암호 목록의 차이, CycloneDX 1.6에 담는 인벤토리 레코드, 수명주기별 발견과 정규화, 에이전트 기반 전환과 발견으로 하는 검증, 시작 순서, 암호가 숨어 있는 업무 흐름

## 관련 문서

- [[암호(Crypto)|암호 인덱스]]
