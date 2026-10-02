---
tags: [expo, expo-integrations, tooling]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Bun package manager와 Hermes runtime"]
---

# Expo Bun package manager와 Hermes runtime

Bun은 development script와 package installation, Hermes는 기기의 JavaScript engine이다. 두 runtime을 구분하며 Bun으로 install했다고 앱의 Hermes bytecode/runtime이 교체되는 것은 아니다.

## Bun과 EAS dependency

bun create expo-app/bun run/bun expo install을 사용할 수 있어도 template download에 npm pack을 쓰는 create/prebuild에는 Node LTS가 여전히 필요하다. 원문의 최소4배 startup 성능 문구는 환경 benchmark가 아니므로 일반적인 보장으로 사용하지 않는다.

EAS는 lockfile로 package manager를 선택한다. Bun>=1.2는 bun.lock, 이전은 bun.lockb이며 서로 다른 package manager lockfile을 섞지 않는다. build profile의 bun version으로 reproducible toolchain을 고정한다. 원문 bun1.0.0은 예제값이다.

Bun의 installed package lifecycle script 정책 때문에 postinstall이 필요한 package는 trustedDependencies에 직접 실행 대상 package를 추가한다. transitive packageB가 script를 갖는다면 packageA가 아니라 B가 대상이다. Sentry source map upload 실패는 @sentry/cli postinstall 실행 여부가 원인일 수 있다. lockfile/node_modules 삭제와 재설치는 source의 troubleshooting 예제이지 항상 먼저 할 작업은 아니다. 실제 package manager/version과 재현 오류를 확인한다.

## Hermes와 OTA 호환성

Hermes는 Expo default engine이며 ahead-of-time bytecode로 startup/메모리를 최적화한다. app config jsEngine을 hermes/jsc로 고르고 ios/android에서 override할 수 있다. native engine 변경은 binary rebuild가 필요하다.

EAS Update/export는 Hermes bytecode와 source map을 만든다. Hermes bytecode format은 engine version별로 달라 RN/Hermes 변경 뒤 오래된 binary가 새 bytecode를 받으면 launch crash가 날 수 있다. SDK46 이후 Hermes는 RN에 bundled되므로 RN/native dependency와 runtimeVersion을 함께 바꾸거나 fingerprint policy로 compatibility 경계를 관리한다.

## Device에서 debugging

expo start의 J 또는 DevTools는 device Hermes engine에 Chrome DevTools Protocol로 연결한다. desktop Chrome tab에서 JS를 대신 실행하는 remote debugging과 달라 JSI/Reanimated device runtime을 유지한다. No compatible apps이면 Hermes 설정, debug binary, dev-server WebSocket 연결을 확인한다.

/json/list endpoint의 inspector array가 비면 reload/localhost/tunnel로 reachable server를 확인한다. 예전 ABI47 sample의 endpoint 값을 현재 engine version으로 해석하지 않는다. Release map upload와 debug inspector 연결은 별도 검증이며 생산 crash를 debugger에서 재현했다는 사실만으로 OTA compatibility가 확인되는 것은 아니다.

## 출처

- [Expo Documentation, Using Bun](https://docs.expo.dev/guides/using-bun)
- [Expo Documentation, Using Hermes engine](https://docs.expo.dev/guides/using-hermes)

## 관련 문서

- [[Expo-Integrations-Error-Replay]]
- [[Expo-Integrations-Upgrade]]
- [[Expo-Integrations-Troubleshooting]]
