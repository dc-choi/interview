---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Crypto digest와 random bytes"]
---

# Crypto digest와 random bytes

## 설치와 hash

`npx expo install expo-crypto`, `import * as Crypto from 'expo-crypto'`. Android/iOS/tvOS/web/Expo Go에서 digest와 AES APIs를 제공한다. web는 WebCrypto secure origin(localhost/HTTPS)이 필요하다.

digest(algorithm,BufferSource)는 ArrayBuffer, digestStringAsync(algorithm,string,{encoding})는 hex(default) 또는 base64 string을 반환한다. SHA256/384/512는 일반적인 현재 hash 선택이고 SHA1/MD2/MD4/MD5는 legacy 지원과 platform 범위를 구분한다. MD2/4는 iOS, MD5는 Android/iOS이다. digest는 encryption이 나 password hashing 전용 KDF가 아니다.

```ts
const hash = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256, 'example',
  { encoding: Crypto.CryptoEncoding.HEX },
);
```

## Random APIs

getRandomBytes(count)는 synchronous Uint8Array, getRandomBytesAsync는 Promise<Uint8Array>다. count는0~1024이며 범위를 벗어나면 TypeError 다. getRandomValues는 integer TypedArray를 secure random 으로 in-place 채우고 같은 array를 반환한다. randomUUID는 secure-random UUIDv4 string이다.

reference는 getRandomBytes의 legacy remote-debug development 상황에서 Math.random fallback을 설명한다. 해당 경로의 값을 production secret randomness 검증처럼 취급하지 않는다. async/native secure API와 실제 execution 환경을 확인한다.

ERR_CRYPTO_UNAVAILABLE은 web secure origin 제한, ERR_CRYPTO_DIGEST는 잘못된 encoding이다. encoding은 출력 표현이며 hash algorithm을 바꾸는 것이 아니다. AES-GCM key/sealed-data 계약은 [[Expo-SDK-A-Crypto-AES]]에 정리했다.

## 출처

- [Expo Documentation, Crypto](https://docs.expo.dev/versions/latest/sdk/crypto)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
