---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["AppIntegrity token과 hardware attestation"]
---

# AppIntegrity token과 hardware attestation

## 설치와 server trust boundary

`npx expo install @expo/app-integrity`, `import * as AppIntegrity from '@expo/app-integrity'`. Android/iOS native API를 제공하는 alpha library 다. token 생성은 client, authenticity 검증과 허용 판단은 server에서 한다. API 성공만으로 요청을 trusted로 처리하지 않는다.

## Android Play Integrity standard flow

prepareIntegrityTokenProviderAsync(cloudProjectNumber)로 provider를 준비한다. 중요 action의 canonical request hash를 requestIntegrityCheckAsync(requestHash)에 전달하고 반환 token string을 backend로 보낸다. server가 token을 decrypt/verify 하고 app/account/device verdict와 요청 hash를 대조한다.

```ts
await AppIntegrity.prepareIntegrityTokenProviderAsync(projectNumber);
const token = await AppIntegrity.requestIntegrityCheckAsync(requestHash);
// 실제 요청/hash와 함께 서버 검증
```

provider가 만료되어 ERR_APP_INTEGRITY_PROVIDER_INVALID이면 provider를 다시 준비한다. weak network/provider error와 악의적 요청을 같은 상태로 처리하지 않도록 재시도/거부 정책을 둔다.

Android hardware attestation 경로는 isHardwareAttestationSupportedAsync로 지원 확인, generateHardwareAttestedKeyAsync(alias,challenge)로 Keystore key 생성, getAttestationCertificateChainAsync(alias)로 base64 X509 chain을 받아 server 검증한다. GrapheneOS 등 secure distribution 용도이며 Play Integrity verdict와 같은 결과가 아니다.

## iOS App Attest key lifecycle

registered App ID와 App Attest capability/entitlement가 필요하다. isSupported를 확인하고 simulator/대부분 app extensions는 우회 정책을 둔다. unsupported를 검증 성공으로 기록하지 않는다.

1. user account와 device 별 generateKeyAsync로 keyId를 만든다.
2. keyId는 persistent storage에 보관한다. private key는 Secure Enclave에 남고 JS에 반환되지 않는다.
3. server가 최소16bytes entropy의 one-time challenge를 발급한다.
4. attestKeyAsync(keyId,challenge) 반환 object를 keyId와 함께 server에서 검증한다.
5. 검증된 key로 generateAssertionAsync(keyId,clientDataString)을 호출하고 중요 request+challenge와 assertion을 server에서 검증한다.

SERVER_UNAVAILABLE은 같은 key로 나중에 재시도하고 다른 attestation 오류는 keyId를 폐기한 뒤 새 key policy를 따른다. 여러 user가 한 key를 재사용하지 않는다. key는 일반 update에서 유지되지만 reinstall/migration/backup restore에서는 재생성한다. App Clip/full app은 shared container에 keyId를 보관할 수 있다.

assertion의 string parameter이 름이 challenge 여도 실제 서명 입력은 요청과 one-time challenge를 포함한 client data 일 수 있다. server와 exact serialization/hash 규칙을 맞추고 replay 방지를 검증한다. 반복 key 생성과 대규모 rollout은 platform quota/위험 정책을 고려한다.

## 출처

- [Expo Documentation, AppIntegrity](https://docs.expo.dev/versions/latest/sdk/app-integrity)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
