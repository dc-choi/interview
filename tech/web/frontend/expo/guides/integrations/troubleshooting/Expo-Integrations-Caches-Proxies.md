---
tags: [expo, expo-integrations, troubleshooting]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo bundler cache와 proxy 진단"]
---

# Expo bundler cache와 proxy 진단

stale transform/cache와 network/proxy는 다른 원인이다. source의 전체 초기화 명령을 그대로 한꺼번에 실행하기보다 가장 좁은 원인부터 확인한다. 문서 작업에서 dependencies/cache/device/network 설정을 삭제하거나 바꾸지 않았다.

## Cache 층위

| 대상 | source 명령과 의미 |
| --- | --- |
| Metro transform | expo start --clear, React Native CLI start --reset-cache |
| Watchman | watchman watch-del-all, 모든 watch reset |
| haste-map/metro-cache | OS temp의 해당 cache 제거 |
| dependency directory | node_modules 삭제 후 현재 package manager로 재설치 |
| package download cache | yarn cache clean 또는 npm cache clean --force, global cache 영향 |

workspace에서는 package별 node_modules도 있을 수 있다. source macOS/Linux의 $TMPDIR가 비었거나 엉뚱한 값이면 glob 삭제 범위가 바뀌므로 실제 directory를 확인한다. native rebuild cache나 app storage와 Metro cache를 구분한다.

Windows source는 rm와 cmd del을 섞고 `%localappdata%Temphaste-map-*`처럼 separator가 빠진 command를 제공한다. 실행 가능한 공통 Windows script로 복제하지 않는다. 사용하는 PowerShell/cmd/Git Bash와 실제 TEMP 경로를 확인한 뒤 해당 파일/directory 삭제 문법을 쓴다. cmd del은 directory recursive deletion 자체를 대신하지 않는다.

## Corporate proxy 경로

원문의 macOS Sierra 예제는 system HTTP/HTTPS→127.0.0.1:8888 Charles→corporate upstream proxy 구조다. system PAC를 끄고 수동 localhost proxy를 사용할 때 원래 PAC/address를 보존한다. Charles external proxy에 corporate auth를 넣고 localhost/*.local bypass를 설정해 dev server가 외부 proxy로 돌지 않게 한다.

HTTPS interception에는 macOS/iOS simulator root certificate trust가 필요할 수 있다. 이것은 upstream TLS를 단순 무시하는 것과 다르며 회사의 허용된 certificate/path로 설정한다. simulator Reset Content and Settings는 모든 data를 지워 certificate 문제의 첫 조치로 쓰지 않는다. Sierra UI와 exp.host old endpoint 설명은 현재 OS/Expo endpoint의 사실로 보장하지 않는다.

CLI는 system proxy를 자동으로 따르지 않을 수 있어 npm/git/HTTP_PROXY/HTTPS_PROXY/ALL_PROXY와 lowercase variant를 각각 확인한다. 원문의 npm http_proxy/https_proxy keys는 현재 npm config의 proxy/https-proxy 지원과 구분한다. proxy를 끄거나 network location을 바꾸면 shell와 tool proxy도 해제해야 하며 Charles가 꺼져 있으면 localhost proxy 경로는 실패한다. 인증정보를 shell history/repo/Vault에 평문으로 남기지 않는다.

## 출처

- [Expo Documentation, Clear bundler caches on macOS and Linux](https://docs.expo.dev/troubleshooting/clear-cache-macos-linux)
- [Expo Documentation, Clear bundler caches on Windows](https://docs.expo.dev/troubleshooting/clear-cache-windows)
- [Expo Documentation, Troubleshooting proxies](https://docs.expo.dev/troubleshooting/proxies)

## 관련 문서

- [[Expo-Integrations-Troubleshooting]]
- [[Expo-Integrations-Bun-Hermes]]
