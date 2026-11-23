---
tags: [security, crypto, post-quantum, bitcoin, public-key, ecdsa, schnorr]
status: done
verified_at: 2026-11-23
category: "Security - 암호"
aliases: ["Bitcoin Quantum Exposure", "비트코인 양자 위협", "BIP 360", "P2MR", "Pay-to-Merkle-Root", "Long Exposure Attack", "Short Exposure Attack"]
---

# 비트코인의 양자 위협: 공개키 노출 기간과 BIP 360

비트코인은 secp256k1 타원곡선 위의 ECDSA와 Schnorr 서명으로 소유를 증명한다([[Institutional-Digital-Asset-Wallet|기관용 디지털 자산 지갑]]). 충분한 규모의 양자 컴퓨터가 Shor 알고리즘으로 타원곡선 이산로그를 풀면 공개키에서 개인키를 계산할 수 있다([[PQC-Migration#무엇이 언제 위험한가|PQC 전환]]). 그래서 위험의 크기는 알고리즘 하나가 아니라 **어떤 코인의 공개키가 얼마나 오래 공개돼 있느냐**로 나뉜다.

## 공개키가 노출되는 기간으로 공격을 나눈다

BIP 360은 양자 공격을 노출 기간으로 둘로 나눈다.

- **장기 노출 공격(long exposure attack)**: 공개키나 사용한 출력의 스크립트처럼 체인에 드러난 데이터를 대상으로, 거래 확정에 걸리는 시간보다 오래 노출된 공개키를 공격하는 경우다. 공격자는 시간을 두고 개인키를 계산할 수 있다.
- **단기 노출 공격(short exposure attack)**: 대부분의 비트코인 거래는 사용할 때 공개키를 드러낸다. 거래가 mempool에서 확정되지 않은 짧은 시간 안에 공격해야 하므로 BIP는 이 공격에 더 빠른 양자 컴퓨터가 필요하다고 적는다. 계산한 개인키로 같은 코인을 쓰는 다른 거래를 먼저 확정시키는 방식을 떠올리면 된다(해석).

## 출력 유형별 노출

BIP 360(2026-11-23 대조, Draft)은 장기 노출 공격에 근본적으로 취약한 출력으로 다음을 든다.

| 출력 | 장기 노출에 취약한 이유(배경 설명) |
| --- | --- |
| P2PK | 출력 스크립트에 공개키 자체가 들어 있다. 초기 채굴 보상이 이 형태다 |
| 재사용한 출력 | 한 번 사용한 주소의 공개키가 체인에 남으므로 같은 주소로 다시 받은 코인은 처음부터 키가 드러난 상태다 |
| P2TR(Taproot, `bc1p`) | 출력이 tweak한 공개키를 담아 사용 전부터 키가 드러난다 |

같은 BIP의 출력 유형 표는 P2MS(bare multisig)도 취약으로 표시한다. 출력 스크립트에 공개키들이 그대로 들어 있기 때문이다(배경 설명).

P2PKH와 P2WPKH는 공개키의 해시를, P2SH와 P2WSH는 스크립트의 해시를 출력에 두므로 사용 전에는 키가 드러나지 않는다. BIP 표는 이들과 P2MR을 조건부(No*)로 두고, 스크립트가 공개키를 드러내는 순간부터는 장기 노출에 취약해질 수 있다고 적는다. 같은 BIP는 확장 공개키(xpub)와 지갑 descriptor를 공유해도 양자에 취약한 키 정보가 드러난다고 적는다.

운영 관점의 해석: 주소 재사용을 피하고, 사용한 주소에 잔액을 남기지 않으며, xpub을 외부 서비스에 넘길 때 그 노출을 키 공개와 같은 위험으로 다룬다. 이것은 장기 노출을 줄일 뿐 단기 노출 공격까지 막지는 않는다.

## BIP 360: Pay-to-Merkle-Root(P2MR)

BIP 360은 P2TR과 거의 같은 기능을 하되 **key path 사용을 제거한** 새 출력 유형 P2MR을 제안한다. 내부 공개키와 tweak 단계를 빼고 출력이 스크립트 트리의 Merkle root에만 commit하므로, 출력을 만든 시점에 공개키가 드러나지 않는다.

- 계층은 consensus(soft fork)이고 SegWit version 2를 써서 mainnet 주소가 `bc1z`로 시작한다. BIP 340, 341, 342(Schnorr와 Taproot)를 전제한다.
- 상태는 Draft다(2026-11-23 대조, 버전 0.12.1). 번호 배정(Assigned)은 2024-12-18이다. 실제 비트코인에서 쓰려면 구현과 네트워크의 soft fork 활성화가 필요하며, BIP 본문에는 활성화 방법과 시점이 없다(2026-11-23 대조).
- **양자 내성 서명을 추가하지 않는다.** BIP는 장기 노출 공격 방어가 비트코인의 양자 내성 서명 활성화에 의존하지 않지만, 사용자가 공개키 재사용 같은 안전하지 않은 관행으로 공개키를 드러내지 않아야 한다고 설명한다. ML-DSA와 SLH-DSA는 앞으로 검토할 예시로만 언급한다.
- **단기 노출 공격은 P2MR만으로 막지 못한다.** BIP는 이 공격을 향후 양자 내성 서명의 활성화로 완화할 수 있고, 완전한 방어에는 양자 내성 서명이 필요할 수 있다고 적는다.

정리하면 P2MR은 스크립트가 공개키를 드러내기 전까지(재사용하지 않는 한) 새로 받는 코인의 장기 노출을 피하게 하고, 이후 양자 내성 서명을 스크립트 경로에 넣을 자리를 만드는 단계다. 이미 공개키가 드러난 P2PK, P2MS, P2TR과 재사용 출력의 코인은 소유자가 새 출력으로 옮기지 않는 한 노출된 상태로 남는다(해석). 이미 노출된 코인을 소각할지 같은 논의는 BIP 360의 범위 밖이다.

## 판단 체크포인트

- 양자 위험을 말할 때 공개키가 드러난 코인(장기 노출)과 사용 순간의 키(단기 노출)를 나눠 말하는가?
- 테스트넷이나 별도 체인에서 양자 내성 서명을 시연한 사례를 비트코인 본체가 이미 안전해졌다는 근거로 쓰지 않는가? 본체 적용은 구현과 네트워크의 soft fork 활성화가 필요하다(BIP 360은 2026-11-23 대조 기준 Draft).
- Q-Day의 날짜보다 그 전에 출력 유형과 서명 체계를 바꾸고 코인을 옮길 수 있는가를 기준으로 보는가? 필요 자원 추정이 내려가는 추세는 [[PQC-Migration#무엇이 언제 위험한가|PQC 전환]]에 있다.
- 지갑이나 수탁 서비스를 평가할 때 주소 재사용, xpub 공유와 Taproot 사용 정책을 양자 노출 관점에서 확인하는가?

## 출처

- [Bitcoin Improvement Proposals, BIP 360: Pay-to-Merkle-Root (P2MR)](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki)
- [Bitcoin Improvement Proposals, BIP 16: Pay to Script Hash](https://github.com/bitcoin/bips/blob/master/bip-0016.mediawiki)
- [Bitcoin Improvement Proposals, BIP 141: Segregated Witness (Consensus layer)](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki)

## 관련 문서

- [[PQC-Migration|양자내성암호(PQC) 전환]]
- [[Public-Key-Cryptography|공개키 암호]]
- [[Institutional-Digital-Asset-Wallet|기관용 디지털 자산 지갑]]
- [[Bitcoin-Halving-and-Holding-Routes|비트코인 반감기와 보유 경로]]
