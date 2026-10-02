---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["AES-GCM key와 sealed data"]
---

# AES-GCM key와 sealed data

## Key와 binary input

AESEncryptionKey.generate는 기본256bit, AES128/192/256을 받는다. AES192는 Android/Apple이며 web에서는 미지원이다. import는 Uint8Array 또는 hex/base64 string을 받고 key size를 검증한다. key.bytes/encoded는 export 결과 Promise 다. key material은 ciphertext와 별도 보호 저장소에 보관한다.

AES BinaryInput은 Uint8Array/ArrayBuffer 또는 base64 string이다. 평문 string을 base64로 착각하지 않는다. arbitrary Unicode text는 TextEncoder bytes를 사용하면 btoa/atob의 Latin1 제약을 피할 수 있다.

```ts
const key = await Crypto.AESEncryptionKey.generate();
const plaintext = new TextEncoder().encode('한국어 예제');
const sealed = await Crypto.aesEncryptAsync(plaintext, key);
const decoded = await Crypto.aesDecryptAsync(sealed, key);
```

## Encrypt/decrypt options

aesEncryptAsync는 AESSealedData, aesDecryptAsync는 기본 bytes 또는 output base64를 반환한다. additionalData는 암호화하지 않는 authenticated data이며 decrypt에 도 동일하게 전달한다. nonce는 generated length(default12bytes) 또는 explicit bytes 다. 같은 key에서 nonce를 재사용하지 않는다. tagLength default/recommended16bytes이며 Apple encryption에서는 항상16 으로 고정된다.

## Sealed data serialization

AESSealedData는 IV+ciphertext+authentication tag를 가진다. combinedSize/ivSize/tagSize는 bytes 다. combined(encoding)는 합친 representation, iv/tag는 해당 부분, ciphertext({encoding,includeTag})는 cipher bytes와 optional tag 다.

fromCombined(binary,{ivLength,tagLength})는 default12/16 길이로 parse 한다. fromParts는 iv,ciphertext,tag 또는 iv,ciphertextWithTag,tagLength overload 다. wire format에서 IV/tag 길이를 함께 관리하고 provider 마다 자동으로 같다고 가정하지 않는다. supported tag lengths는16/15/14/13/12/8/4 bytes이며 짧은 tag는 별도 보안 조건이 필요하므로 기본16을 유지한다.

## 파일 저장 예제의 수정점

sealed.combined() bytes를 File에 저장하고 key.encoded('hex')를 SecureStore에 저장할 수 있다. 읽을 때 key import, AESSealedData.fromCombined(file.bytes()), aesDecryptAsync(sealedData,key) 순서다. 원문의 load 예제 마지막은 미정의 data를 사용하므로 실제 생성한 sealedData를 전달한다. Paths.cache 파일은 OS가 지울 수 있어 영구 ciphertext storage가 아니다. key loss/rotation, corrupted tag와 authentication failure를 복구 정책에 포함한다.

## 출처

- [Expo Documentation, Crypto](https://docs.expo.dev/versions/latest/sdk/crypto)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
