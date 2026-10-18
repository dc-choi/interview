---
tags: [palantir, cipher, encryption, license]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Cipher channel과 license 권한"]
---

# Cipher channel과 license

Cipher는 transport/storage encryption 위에 업무별 field 보호를 더한다. Channel은 algorithm/key/secret 규약을 가진 resource, license는 한 channel의 어떤 operation을 쓸 수 있는지 정하는 resource다. License View 권한을 주면 허용된 operation을 사용할 수 있으므로 파일 공유를 단순 열람 권한으로 취급하지 않는다.

## Algorithm은 필요한 비교와 복원 의미로 고른다

지원 예는 probabilistic AES_GCM_SIV, deterministic AES_SIV(AES-256-SIV), pepper를 사용하는 SHA-256/SHA-512 hashing, reversible visual obfuscation이다. 동일 channel/key의 deterministic 결과는 join/aggregation에 활용할 수 있지만 값의 빈도와 equality가 드러난다. Low-cardinality나 알려진 분포에서는 probabilistic 경로의 tradeoff를 검토한다.

Hash는 암호 연산으로 복호화할 수 없고 encryption은 허가된 복원을 지원한다. Hash/deterministic encryption을 비식별화 완료로 간주하지 않는다. Channel UI의 stretching derivation 또는 직접 key 입력은 형식과 요구 length를 실제 검증한다. 문서의 문자열 길이 설명만으로 cryptographic key bytes를 추정하지 않는다.

Cipher value는 `CIPHER::<channel-rid>::<encrypted-value>::CIPHER` 형태로 channel 정보를 포함한다. 이 표기와 ciphertext 접근만으로 decrypt가 허용되지 않으며 관련 license가 필요하다.

## License 종류는 실행 위치와 위험이 다르다

| 종류 | 사용할 경로 | 통제 특성 |
|---|---|---|
| Operational User | Object UI, Functions의 개별 값 | Cell audit, 선택적 개인별 rate limit, key 직접 접근 없음 |
| Data Manager | Pipeline Builder/Contour의 column bulk | Bulk encrypt/hash/decrypt, cell audit/rate limit 경로와 다름 |
| Admin | Code Repositories의 bulk/코드 작업 | Cryptographic key 접근을 실질적으로 부여 |

Operational rate를 넘으면 정한 기간이 reset될 때까지 차단한다. Encryption/hashing과 decryption permit은 별도로 정한다. Functions/direct API처럼 prompt를 보여줄 수 없는 환경에서 checkpoint가 설정돼 있으면 bypass 허용 license가 필요하다. Bypass해도 cell audit와 rate limit은 남는다.

Admin license는 높은 신뢰를 필요로 한다. Python code에서 같은 operation을 한다는 이유로 Data Manager license를 그대로 사용할 수 없으며 license file의 이동/공유도 접근 범위를 바꾼다.

## Ontology의 선택적 복호화와 수정

Property type을 Cipher text로 지정하고 Plaintext Type, 빈/평문 field 수정에 쓸 Default Encryption Channel을 설정한다. Encrypted Value renderer에서 적절한 Operational license와 justification으로 개별값을 본다. 예전 string RID Renderer보다 CipherText property 경로를 사용한다.

Functions는 `decryptAsync()`와 `updateAsync()`를 사용한다. Update는 OntologyEditFunction/Edits 선언 후 Action으로 apply해야 하며 function preview는 실제 object를 수정하지 않는다. Optional property의 undefined 처리도 필요하다. Inline editable type class는 OSv1/API-edit 제약이 있어 권장 기본 경로와 구분한다.

민감 raw dataset의 Marking을 가진 채 obfuscate하고 필요한 안전 데이터만 파생한 뒤 승인된 unmarking으로 소비 Project에 공유한다. License 접근과 파생물의 Marking 제거는 서로 다른 승인 경계다.

## Marketplace는 key를 복제하지 않는다

Packaged channel은 algorithm을 유지하지만 설치할 때 새 key를 생성한다. 설치본이 원본 ciphertext를 같은 key로 해독하거나 deterministic join할 수 있다고 가정하지 않는다. License의 expiration date는 설치일 기준으로 재설정되지 않고 원래 날짜를 유지한다. 설치 당시 이미 만료되었는지도 확인한다. Cipher 기반 dataset의 지속 갱신에는 별도 schedule이 필요하다.

## 출처

- [Palantir, Cipher](https://www.palantir.com/docs/foundry/cipher)
- [Palantir, Cipher core concepts](https://www.palantir.com/docs/foundry/cipher/core-concepts)
- [Palantir, Getting started with Cipher](https://www.palantir.com/docs/foundry/cipher/getting-started)
- [Palantir, Decrypt individual values](https://www.palantir.com/docs/foundry/cipher/decrypt-individual-values)
- [Palantir, CipherText in Functions and Actions](https://www.palantir.com/docs/foundry/cipher/ciphertext-in-functions-and-actions)
- [Palantir, Example Cipher workflow](https://www.palantir.com/docs/foundry/cipher/example-use-case)
- [Palantir, Cipher Marketplace](https://www.palantir.com/docs/foundry/cipher/cipher-marketplace)

## 관련 문서

- [[Palantir-Cipher-Transforms-and-Visual-Obfuscation|Bulk 변환과 image obfuscation]]
- [[Palantir-Checkpoint-Scope-and-Evidence|정당화와 감사]]
- [[Palantir-Pipeline-Markings-and-Declassification|파생물 접근 확대]]
