---
tags: [security, hardware-wallet, attestation, supply-chain]
status: done
verified_at: 2026-10-28
category: "보안(Security)"
aliases: ["Hardware Wallet Physical Trust", "하드웨어 지갑의 물리적 신뢰 경계"]
---

# 하드웨어 지갑의 물리적 신뢰 경계

하드웨어 지갑의 보안은 키를 보관하는 칩뿐 아니라 화면, 입력 장치와 유통 경로에도 의존한다. 정품 칩이라는 증명과 장치 전체에 부품이 추가되지 않았다는 증명은 다르다.

## 정품 인증이 확인하는 범위

2026-10-28 Ledger Donjon의 위협 모델 기준, Genuine Check는 Secure Element의 정품 여부를 인증한다. 제조 단계에서 칩이 만든 공개키에 Ledger가 서명하고, 이후 서버가 보낸 challenge에 대한 칩의 서명과 인증 정보를 검증한다.

원래 Secure Element를 그대로 둔 채 도청 부품을 추가하면 이 검사를 통과할 수 있다. 공식 문서는 이러한 물리적 변경을 탐지하지 못하며 장치의 물리적 유통 이력도 검증하지 않는다고 명시한다. 봉인과 정상 동작 역시 부품 무결성을 입증하는 독립 검사가 아니다. [정품 인증의 범위](https://donjon.ledger.com/threat-model/device-genuineness/)

| 확인한 사실 | 그 사실만으로 확인되지 않는 것 |
|---|---|
| 정품 Secure Element 인증 통과 | 화면 배선이나 주변 부품에 도청 장치가 없는지 |
| 거래 화면이 정상적으로 보임 | 화면으로 전달되는 정보가 다른 회로에도 복사되는지 |
| 정상 포장과 봉인 | 출고 후 재포장이나 물리적 변경이 없었는지 |

## 화면 경로가 비밀의 출력 경로가 된다

화면은 거래 내용을 확인하고 승인하는 보안 경계다. PC 화면의 정보와 실제 서명 대상을 구분하려면 장치의 표시와 입력도 신뢰할 수 있어야 한다. [화면과 입력의 보안 목적](https://donjon.ledger.com/threat-model/device-secure-display-and-inputs/)

Nano X 임플란트 분석 사례에서는 Secure Element 자체를 깨는 대신 OLED로 향하는 SPI 통신을 관찰했다. 초기 설정 때 표시되는 복구 단어를 화면 데이터에서 재구성하고 별도 셀룰러 회선으로 전송하는 구조다. 같은 분석에 초기 표본은 작은 배터리로 공간을 확보했고 이후 표본은 기존 배터리를 유지한 사례가 있어, 배터리 크기 하나로 변조 여부를 판정할 수 없다. 이는 조사된 표본의 동작이며 모든 제품과 유통 사고에 동일한 회로가 쓰였다는 뜻은 아니다. [하드웨어 분석](https://www.tibane.net/research/ledger-nano-x-implant)

이 사례의 핵심은 암호 알고리즘의 파괴 없이도 비밀이 표시되는 주변 경로에서 노출될 수 있다는 점이다. 인터넷에 직접 연결하지 않는 사용 방식만으로 장치 안의 독립 통신 부품까지 배제할 수 없다.

## 위협 모델에 적용하는 질문

다음은 위 인증 범위와 분석 사례에서 도출한 설계 검토 항목이다.

- 인증서와 challenge가 어느 부품의 신원을 증명하는가?
- 비밀이 칩 밖으로 나오는 화면, 입력과 배선은 어떤 신뢰 경계에 속하는가?
- 구매, 반품과 재판매 과정에서 장치를 바꿀 수 있는 주체는 누구인가?
- 검사 성공을 장치 전체의 안전 판정으로 확대하고 있지 않은가?
- 관측한 표본, 제조사가 확인한 사고와 추정 피해 규모를 분리했는가?

실제 장치 분해나 침해 판정은 수행하지 않았다. 이 문서는 인증의 보장 범위와 공개 분석의 공격 경로만 다룬다.

## 출처

- [Ledger Donjon, Genuineness](https://donjon.ledger.com/threat-model/device-genuineness/)
- [Ledger Donjon, Secure Display and Inputs](https://donjon.ledger.com/threat-model/device-secure-display-and-inputs/)
- [Ledger Nano X: the spy implant — Tibane Labs](https://www.tibane.net/research/ledger-nano-x-implant)
- [Reverse Engineering a Ledger Nano X Hardware Implant — Grand Idea Studio](https://grandideastudio.com/portfolio/security/ledger-hardware-implant/)

## 관련 문서

- [[Security-Architecture-and-Threat-Modeling|보안 아키텍처와 위협 모델링]]
- [[Supply-Chain-Security|공급망 보안]]
- [[Public-Key-Cryptography|공개키 암호]]
