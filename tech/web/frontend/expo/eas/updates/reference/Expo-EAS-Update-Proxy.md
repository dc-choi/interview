---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update manifest와 asset proxy"]
---

# EAS Update manifest와 asset proxy

request proxy는 자체 server를 경유해 headers/logging/security/IP 익명화 정책을 적용한다. manifest와 asset 경로는 별도 upstream으로 전달하며 protocol headers와 URL 내용을 보존해야 한다. logging 자체가 익명화를 보장하지 않으므로 보존 정책을 따로 정한다.

## Forwarding contract

| Proxy | Upstream | 전달 대상 |
| --- | --- | --- |
| Manifest | u.expo.dev | path/query 전체와 expo-/eas- prefix headers |
| Assets(JS/images/fonts) | assets.eascdn.net | path/query 전체, expo-/eas- prefix, authorization, a-im |

body/response status/content와 asset patch 협상도 깨뜨리지 않도록 proxy 동작을 확인한다. 원문이 열거한 headers를 임의 삭제하거나 path를 축약하면 selection/download가 달라질 수 있다.

## Config와 metadata 확인

```json
{"cli":{"updateAssetHostOverride":"updates-asset-proxy.example.com","updateManifestHostOverride":"updates-manifest-proxy.example.com"}}
```

eas.json의 host override에 실제 proxy hostname을 넣고 update:configure로 반영한다. --environment를 지정해 test update를 publish하고 Dashboard platform의 View Metadata에서 manifestHostOverride/assetHostOverride를 확인한다. 현재 binary의 request URL/native config까지 검증하며 새 native 설정이 필요하면 rebuild한다. proxy 장애, TLS/cache/CORS/인증 정책과 signing 검증을 함께 고려한다.

## 출처

- [Expo Documentation, Request proxying](https://docs.expo.dev/eas-update/request-proxying)

## 관련 문서

- [[Expo-EAS-Update-Debug]]
- [[Expo-EAS-Update-Code-Signing]]
