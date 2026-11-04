---
tags: [network, ipv6, mobility, ldpc, relay]
status: done
verified_at: 2026-11-04
category: "Web - 네트워크"
aliases: ["Mobile Network Continuity", "이동 환경의 통신 연속성"]
---

# 이동 환경의 통신 연속성

이동 중 연결 품질은 주소 체계, 이동성 처리, 오류 정정과 중계 경로를 나누어 이해한다. 각 기술이 해결하는 문제가 다르므로 한 기술의 지원 여부로 영상통화의 무중단을 보장하지 않는다.

## 주소 공간과 이동성은 별개다

IPv6는 IPv4의 32비트 주소를 128비트로 확장한다. 표현 가능한 비트 조합은 유한한 `2^128`개이며, 주소 확장 자체가 무선 구간의 손실이나 연결 전환 지연을 없애지는 않는다. 모든 비트 조합이 단말에 배정 가능한 유니캐스트 주소라는 뜻도 아니다.

Mobile IPv6(RFC 6275)는 이동한 노드를 home address로 식별하면서 현재 접속 위치의 care-of address로 패킷을 전달하는 프로토콜이다. 이동해도 모든 주소가 그대로라는 설명은 부정확하다.

- home agent를 통한 양방향 터널링에서는 home address로 온 패킷을 현재 care-of address로 전달한다.
- route optimization에서는 상대 노드에 바인딩을 등록해 현재 위치로 직접 전달할 수 있다.
- 새 주소 설정과 Binding Update 같은 절차가 필요하다. 프로토콜의 연결 유지 목적을 전환 시간 0이나 손실 0의 보장으로 읽지 않는다.

이는 Mobile IPv6의 동작 설명이다. 특정 지하철이나 통신사의 이동통신망이 이 프로토콜을 사용한다는 증거는 아니다.

## LDPC는 정정 능력과 복호 조건을 함께 본다

LDPC(Low-Density Parity-Check)는 희소한 패리티 검사 행렬을 사용하는 오류 정정 부호다. 복호기는 반복 계산으로 비트를 추정하며, 반복 횟수가 부족하면 수렴하지 않을 수 있다. MathWorks 구현은 패리티 검사를 만족하거나 최대 반복 횟수에 도달하면 복호를 끝내도록 구성할 수 있다.

따라서 LDPC를 사용하면 원하는 수준까지 손실을 줄일 수 있다고 조건 없이 단정하지 않는다. 적용 시에는 부호와 채널 조건, 복호 알고리즘과 반복 횟수를 고정하고 잔여 오류율 및 처리 지연을 측정한다(검증 제안). 무선 복호의 오류와 응용 프로그램의 데이터 유실도 구분한다.

## 멀티홉 중계는 경로를 늘리지만 자원도 쓴다

멀티홉 중계는 여러 중계 구간을 거쳐 데이터를 전달한다. 여러 네트워크 연결을 갖는 multihoming과 같은 용어가 아니다.

5G NR의 IAB(Integrated Access and Backhaul)는 무선 접속 기술을 백홀에도 사용하는 사례다. Ericsson의 2020년 구조 설명은 같은 주파수를 사용하는 in-band 구성에서 노드 내부 간섭을 피하기 위해 송수신 시간을 분리하는 half-duplex 제약을 설명한다. 중계기를 추가했다고 모든 사용자의 속도가 증가하는 것은 아니며, 접속 구간과 백홀의 자원 배분을 함께 확인한다.

## 적용 점검

- 주소 유지, 무선 오류 정정과 중계 경로 중 어떤 문제를 다루는지 먼저 구분한다.
- 이동 전후의 연결 전환 시간, 손실률, 처리량과 응용 지연을 각각 잰다.
- 특정 망의 채택 기술과 장비 성능은 사업자 자료나 실측으로 확인한다.

2026-11-04 아래 원문으로 기술의 역할과 제약을 대조했다. 실제 망 구성, 장비 지원과 영상통화 품질은 시험하지 않았다.

## 출처

- [RFC Editor, RFC 8200: Internet Protocol, Version 6 (IPv6) Specification](https://www.rfc-editor.org/rfc/rfc8200) — 주소 크기.
- [RFC Editor, RFC 6275: Mobility Support in IPv6](https://www.rfc-editor.org/rfc/rfc6275) — home address, care-of address, 터널링과 바인딩.
- [MathWorks, Block Codes](https://www.mathworks.com/help/comm/ug/block-codes.html) — LDPC 반복 복호와 종료 조건.
- [Integrated access and backhaul – a new type of wireless backhaul in 5G — Ericsson](https://www.ericsson.com/en/reports-and-papers/ericsson-technology-review/articles/introducing-integrated-access-and-backhaul) — 멀티홉과 in-band 자원 공유의 제약. 2020년 구조 설명 범위.

## 관련 문서

- [[Wireless-Multiple-Access|무선 다중접속과 공간 다중화]]
- [[Network-Layer|네트워크 계층]]
- [[Satellite-Direct-to-Device|위성 직접 연결]]
- [[Self-Organizing-Network|SON과 무선 자원 관리]]
