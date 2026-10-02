---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Updates manifest와 asset 무결성"]
---

# Expo Updates manifest와 asset 무결성

## Manifest

Manifest는 다음 필드로 앱 코드와 asset을 묶는다.

| 필드 | 의미 |
| --- | --- |
| `id` | manifest를 유일하게 식별하는 UUID |
| `createdAt` | 최신 update 선택에 쓰는 생성 시각, ISO 8601 형식 |
| `runtimeVersion` | 필요한 네이티브 구성을 표현하는 문자열 |
| `launchAsset` | 앱 실행 진입점인 특수 asset |
| `assets` | 이미지, 폰트, 코드 등 update가 사용하는 asset 배열 |
| `metadata` | 로컬 필터에 사용하는 string-valued 사전 |
| `extra` | 프로젝트 ID 등 선택적 부가 설정 |

`launchAsset`을 포함한 asset을 실행 전에 다운로드하고 asset key와 로컬 파일 위치를 연결하는 것이 권고된다. `metadata`는 응답의 `expo-manifest-filters`를 통과해야 한다.

## Asset

Asset은 `key`, `contentType`, `url`과 선택적인 `hash`, `fileExtension`으로 표현한다. `hash`는 Base64URL 인코딩 SHA-256이다. `fileExtension`은 점을 포함한 확장자이며 launchAsset에서는 무시하므로 생략이 권고된다.

클라이언트는 asset URL에 GET을 요청하고 지원하는 MIME type과 압축 형식을 알린다. extensions part의 `assetRequestHeaders`가 asset key별 헤더를 지정하면 해당 요청에 포함해야 한다.

서버는 같은 URL의 asset을 바꾸거나 제거해서는 안 된다. 과거 update도 나중에 다운로드할 수 있기 때문이다. 이 불변성을 전제로 긴 cache lifetime과 immutable 캐시를 사용할 수 있다. 지원하는 압축만 선택하며 미압축 응답도 가능하다.

규약의 Asset 타입은 hash를 optional로 표시하지만 asset 응답 절은 manifest hash와 실제 파일 hash 검증을 의무화한다. 무결성 검증을 생략해도 된다고 해석하지 말고, 자체 서버는 검증 가능한 hash를 제공하도록 구현한다.

## Directive와 extensions

Directive는 `type`과 선택적인 `parameters`, `extra`를 가진다. EAS의 `rollBackToEmbedded`는 다운로드한 update 대신 바이너리에 포함된 update를 사용하도록 지시한다. 특정 서비스의 directive 종류와 protocol이 허용하는 확장성을 구분한다.

Extensions의 `assetRequestHeaders`는 asset key에서 string key/value 헤더 사전으로 연결된다. update 요청에 저장되는 서버 지정 헤더와 asset별 요청 헤더는 역할이 다르다.

## Code signing

서명 검증을 사용하는 클라이언트는 manifest/directive를 사용하거나 해당 asset을 다운로드하기 전에 대응 인증서로 서명을 확인해야 한다. 인증서는 신뢰하는 self-signed root이거나 신뢰 root로 이어지는 chain이어야 한다. root는 앱이나 OS에 내장되어 있어야 한다.

Manifest 서명은 그 안의 hash와 실제 asset 검증을 통해 asset까지 보호한다. HTTPS 전송 보호, manifest 서명과 파일 hash 검증은 서로 다른 확인 단계다. 출처가 맞는 manifest라도 호환되지 않는 runtime의 update를 실행해도 된다는 뜻은 아니다.

## 출처

- [Expo Documentation, Expo Updates v1](https://docs.expo.dev/technical-specs/expo-updates-1)

## 관련 문서

- [[Expo-Specifications]]

- [[Expo]]
