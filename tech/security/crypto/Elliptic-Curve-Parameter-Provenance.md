---
tags: [security, cryptography, elliptic-curve, provenance, nist]
status: done
verified_at: 2026-10-24
category: "보안(Security)"
aliases: ["Elliptic Curve Parameter Provenance", "타원곡선 파라미터의 출처"]
---

# 타원곡선 파라미터의 출처와 검증 경계

타원곡선의 공개 파라미터를 어떻게 골랐는지와 사용자의 개인키를 알아낼 수 있는지는 다른 질문이다. 공개 파라미터의 생성 경로를 재현해도 개인키 복구나 암호 해독을 뜻하지 않는다.

## seed와 키를 구분한다

NIST SP 800-186은 소수체 위의 의사난수 Weierstrass 곡선에 대해 소수 p, 계수 a와 b, 기준점 G, 차수 n 등과 함께 160비트 Seed를 제시한다. Seed는 부록 C.3의 SHA-1 기반 곡선 생성 절차에 쓰는 공개 입력이다. 곡선 계수의 생성 입력과 기준점, 사용자별 비밀키를 같은 값으로 취급하지 않는다.

검증 질문도 나눈다.

- **값의 일치:** 제시된 생성 절차가 표준에 적힌 공개 seed를 다시 만드는가?
- **선택의 설명:** 가능한 후보 중 특정 후보를 선택하거나 건너뛴 이유까지 확인됐는가?
- **보안성:** 알려진 공격, 구현과 키 관리까지 포함해 안전성을 평가했는가?

첫 질문에 답했다고 나머지 질문까지 해결되지는 않는다.

## 공개 seed 재현 사례

2026-10-16 공개된 NIST 곡선 seed 연구에서 P-256의 20바이트 후보 생성은 `srand48(871696354)`로 초기화한 뒤 `lrand48() >> 23`의 결과를 20개씩 모으는 방식으로 설명된다. 초기값은 1997-08-16 01:52:34 UTC의 Unix timestamp다. 1부터 센 1,842번째 후보는 다음 표준 seed와 일치한다.

```text
C49D3608 86E70493 6A6678E1 139D26B7 819F7E90
```

2026-10-24에 공개된 생성식으로 이 후보를 계산하고 NIST SP 800-186의 P-256 Seed와 대조했다. 이 확인은 한 후보의 값 재현이며, 연구의 역추적 과정 전체나 곡선의 보안성을 독립 증명한 결과는 아니다.

## 재현 뒤에도 남는 질문

- P-256에서는 더 이른 876번째 후보도 조건에 맞는 곡선을 만들지만 건너뛴 이유는 확인되지 않았다.
- P-224, P-256, P-384와 P-521의 기준점 생성 방법과 B-163의 seed 출처는 해당 연구에서 미해결로 남았다.
- 공개된 값만으로 과거에 생성기를 몇 번 실행했는지 알 수 없다.

따라서 생성 경로의 투명성이 높아졌다는 결과를 모든 백도어 가능성의 부재 증명으로 확대하지 않는다. 반대로 예측 가능한 생성기로 공개 seed를 재현했다는 사실을 개인키 난수 생성에도 같은 방식을 써도 된다는 권고로 해석하지 않는다. 변경 판단에서는 공개 파라미터의 출처, 실제 취약점과 구현의 키 관리 문제를 분리한다.

## 출처

- [NIST, SP 800-186: Recommendations for Discrete Logarithm-based Cryptography: Elliptic Curve Domain Parameters](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-186.pdf) — 3.2.1과 3.2.1.3의 공개 파라미터 및 P-256 Seed
- [Claude reveals ECDSA curve origins — Anthropic](https://www.anthropic.com/research/ecdsa-curve-origins) — 2026-10-16 공개 연구, 생성식과 미해결 범위

## 관련 문서

- [[Public-Key-Cryptography|공개키 암호와 키의 역할]]
- [[TLS-Config|TLS 설정과 암호 구성]]
