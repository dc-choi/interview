---
tags: [security, encryption, storage, hardware, authentication]
status: done
verified_at: 2026-11-02
category: "Security - 암호"
aliases: ["Encrypted Storage Authentication", "암호화 저장장치의 인증 경계", "FU100", "TSD303"]
---

# 암호화 저장장치의 인증 경계

저장장치의 인증은 사용자를 허용하는 절차이고, 암호화는 원시 저장 데이터를 키 없이 읽기 어렵게 하는 보호다. 지문을 통과해야 USB가 보인다는 사실만으로 내부 저장매체까지 암호화됐다고 판단하지 않는다.

## 분리해서 확인할 세 경로

| 경로 | 확인할 것 |
|---|---|
| 저장 | 원시 매체의 데이터가 암호문인지, 키가 매체와 같은 곳에 노출되는지 |
| 인증 | 입력 비밀번호나 지문을 어디서 검사하고 어떤 연산을 허용하는지 |
| 복호화 | 실제 키를 누가 보유하고 어떤 비밀번호나 숨은 계정으로 얻을 수 있는지 |

인증 화면만 우회했을 때 복호화가 실패할 수도 있고, 다른 계정의 고정 비밀번호가 같은 콘텐츠 키를 열 수도 있다. UI의 허용/거부, 장치 내부의 검사와 실제 복호화 결과를 따로 측정한다.

## 사례: 인증과 암호화가 엇갈린 USB 제품

2026-11-02 발표자의 공개 슬라이드와 후속 직접 분석을 대조했다. 결과는 분석한 제품과 빌드의 관측이며 모든 저장장치에 대한 결론이 아니다.

- **ThinkPlus FU100:** 발표 슬라이드는 SD 카드에 데이터 암호화가 없고 지문은 USB 연결을 여는 역할이라고 설명한다. 케이스를 열어 매체를 읽는 공격은 화면 인증을 거치지 않는다. 에폭시로 카드 탈착을 어렵게 하는 임시 조치를 암호화 추가와 같은 해결로 보지 않는다.
- **ThinkPlus TSD303:** 저장 데이터는 암호화했지만 정상 비밀번호를 장치가 PC로 평문 전송했다. 첫 수정에서도 PC가 복구 가능한 키로 비밀번호를 가려 보내는 문제가 남았고, 발표자는 최종 수정에서 입력 비밀번호를 장치가 검증하도록 바뀐 것을 확인했다. 슬라이드는 기존 장치에 수정본을 적용하려면 서비스가 필요하다고 밝힌다. 현재 교체/서비스 절차는 Lenovo 공지 본문 접근 실패로 재확인하지 못했다.
- **후속 소프트웨어 분석:** Binary Ninja의 2026-10-22 연구는 NetacFileLock의 고정 콘텐츠 키와 로그의 비밀번호, SecZure의 숨은 계정이 여는 같은 콘텐츠 키 등을 직접 확인했다. 제품별로 다른 실패 원인이며, 분석에 Codex를 썼다는 사실 자체를 취약점 증명으로 계산하지 않는다.

## 운영과 도입 체크포인트

1. 모델, 펌웨어와 관리 소프트웨어 버전을 함께 기록한다.
2. 비밀번호를 틀리게 입력한 시험과 원시 매체를 읽는 시험을 구분한다.
3. USB 전송, 앱 메모리와 로그에 정상 비밀번호나 복호화 키가 남는지 확인한다.
4. 키를 하드코딩하거나 모든 장치가 같은 키를 사용하는지 확인한다.
5. 암호화 제품이라도 복구 계정, 백업 키와 관리자의 접근 경로를 점검한다.
6. 수정 뒤 기존 데이터가 새 키로 보호됐는지와 반품 때의 데이터 처리 절차를 별도로 확인한다.

위 항목은 검토 제안이다. 실제 장치를 분해하거나 제품 소프트웨어, 복호화 도구와 에이전트를 실행하지 않았다.

## 출처

- [Breaking Encrypted USB Drives with Time-Travel Debugging — RE//verse, Xusheng Li](https://github.com/xusheng6/breaking_encrypted_USB_drives_with_TTD/blob/main/Breaking_Encrypted_USB_Drives_v2.pdf) — 2026-03 발표 슬라이드의 FU100, TSD303와 수정 경과 대조
- [Discovering a Backdoor and Flaws in More Encrypted USB Drives — Binary Ninja, Xusheng Li](https://binary.ninja/2026/10/22/breaking-more-encrypted-usb-drives-with-ai.html) — 2026-10-22 후속 직접 분석
- [Lenovo, LEN-210545](https://support.lenovo.com/us/en/product_security/LEN-210545) — 확인 후보. 2026-11-02 도구에서 본문을 가져오지 못해 현행 서비스 절차의 근거로 사용하지 않았다.
- GeekNews, 2026-11-02 10:50 사용자 제공 발췌 — 제품 사례와 후속 연구의 계기 자료

## 관련 문서

- [[Hardware-Wallet-Physical-Trust|하드웨어 지갑의 물리적 신뢰 경계]]
- [[Cryptographic-Randomness|암호학적 난수]]
- [[HSM-Key-Custody|HSM과 서명 키 관리]]
- [[암호(Crypto)|암호 인덱스]]
