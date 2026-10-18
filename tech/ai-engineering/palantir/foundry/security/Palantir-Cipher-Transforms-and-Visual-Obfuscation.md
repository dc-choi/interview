---
tags: [palantir, cipher, transforms, visual-obfuscation]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Cipher transform과 image obfuscation"]
---

# Cipher transform과 visual obfuscation

Cipher bulk operation을 배포할 때 실제 결과가 생성되는 시점, license/key 접근과 output 형태를 함께 검증한다. Code Repositories/Pipeline Builder preview는 실제 Cipher output 대신 placeholder를 보여준다. 암호화/복호화 결과는 build로 확인해야 한다.

## Column과 Python string API를 구분한다

Pipeline Builder/Contour는 Data Manager 또는 Admin license를 사용한다. Decrypt license는 암호화한 channel과 같아야 한다. Pipeline 자동 생성은 String column만 선택하므로 다른 type은 명시적으로 cast하고 후속 plaintext type을 보존한다. Contour의 Cipher board가 포함된 path는 dataset으로 저장할 수 없다.

Python transforms는 `bellaso-python-lib`와 Admin license를 사용한다. `EncrypterInput`, `DecrypterInput`, `HasherInput`을 transform input으로 선언한다. Incremental에서는 이 license input을 모두 `snapshot_inputs`로 지정해야 한다.

0.75.0부터 기존 API는 deprecated이며 향후 제거 대상으로 안내한다. Column 경로의 encrypt/decrypt/hash는 `encrypt_column`/`decrypt_column`/`hash_column`, regex match는 `encrypt_all_matches_column`/`hash_all_matches_column`, image는 `obfuscate_image`/`deobfuscate_image`로 구분한다. Deprecated가 현재 즉시 사라졌다는 뜻은 아니다.

String-level `encrypt_string`, `decrypt_string`, `hash_string`와 match variant는 plain Python string을 받는다. PySpark Column API와 같은 타입이 아니므로 nested array 변환 등에 예제를 적용할 때 실제 값의 실행 위치와 타입을 확인한다. Source의 sample snippet에 있는 import/구문/인자 불일치까지 검증된 production 코드로 복사하지 않는다.

## Visual obfuscation은 픽셀을 바꾼다

Visual Obfuscation은 channel seed로 polygon 내부 RGB를 scramble하는 deterministic/reversible operation이다. 화면 위에 가림막만 올리는 방식이 아니다. 해당 guide는 PNG만 지원하며 lossless 보존이 복원에 중요하다.

Code Repositories에서 encryption/key access가 있는 Admin license로 media set input/output과 polygon을 처리한다. Output PNG media set을 먼저 생성한다. 전체 media listing을 driver collect하는 튜토리얼은 대규모 영상/이미지 corpus의 처리 용량을 보장하지 않는다.

Workshop Image Display에서의 복원은 beta 경로다. Image object와 polygon object를 many-to-one으로 연결하고 polygon ID, image path, channel RID, JSON 좌표와 선택적 label을 저장한다. 좌표 serialization 예시에는 구분 기호 누락이 있을 수 있어 유효한 JSON과 이미지 좌표계를 검증한다. Operational decrypt license로 선택 영역을 복원한다.

Polygon/seed/원본 image 경로를 보존할 정책을 함께 정한다. 권한 있는 사람이 복원할 수 있다는 설계이므로 irreversibly anonymized image와 다르다. License 통제, cell/operation audit와 실제 output bytes의 보호를 각각 확인한다.

## 출처

- [Palantir, Apply Cipher operations](https://www.palantir.com/docs/foundry/cipher/apply-operations)
- [Palantir, Visual obfuscation](https://www.palantir.com/docs/foundry/cipher/visual-obfuscation)
- [Palantir, Getting started with Cipher](https://www.palantir.com/docs/foundry/cipher/getting-started)

## 관련 문서

- [[Palantir-Cipher-Channels-and-Licenses|Channel과 license]]
- [[Palantir-Media-Extraction-and-Evidence|Media의 원본과 파생물]]
- [[Palantir-Incremental-Transactions-and-Compaction|Incremental input 계약]]
