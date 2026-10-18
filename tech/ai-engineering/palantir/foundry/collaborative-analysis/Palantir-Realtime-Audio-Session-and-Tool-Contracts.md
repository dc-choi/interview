---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry realtime audio 세션과 도구 경계"]
---

# Foundry realtime audio 세션과 도구 경계

## 사용자 권한과 모델에게 보이는 데이터

공식 tutorial은 OSDK 사용자 OAuth, unrestricted custom application과 language-model-service:use-model scope, enrollment의 활성 realtime model을 전제로 한다. 예시 gpt-realtime-2/whisper-1와 Agents SDK 호출은 확인한 Foundry 문서의 예이며 모든 환경의 지원/SDK 최신성을 보장하지 않는다.

Browser는 Foundry WebSocket proxy로 연결하며 enrollment에 따라 OpenAI Direct/Azure 경로를 전달한다. 브라우저 WebSocket은 custom Authorization header 대신 Bearer-<token> subprotocol을 사용한다. Token은 DevTools에 보일 수 있는 credential이며 로그/사용자 문자열로 노출하지 않는다. 장시간 세션은 연결 시작 token의 만료에 따라 재연결이 필요할 수 있다.

Tool execute는 browser의 OSDK client와 사용자 token으로 실행된다. 모델은 Ontology 자체를 직접 보는 대신 tool이 반환한 데이터만 받는다. Query filter/반환 속성과 Action write를 개발자가 정하고 표준 Foundry permission/validation이 적용된다. 모델이 음성 의도를 해석했다는 사실을 사용자 권한이나 중요한 쓰기 의도의 검증으로 혼동하지 않는다.

## 연결과 audio 준비

session.connect 반환은 audio 송수신 준비 완료가 아니다. 예제는 session.created 뒤 첫 session.updated를 기다리고200 ms 후 준비 완료로 처리하며10초 timeout을 둔다. 이 수치는 tutorial의 완충값이지 서비스 SLA가 아니다. SDK/connect reject와 timeout 이후 transport 정리는 실제 구현에서 별도 확인해야 한다.

입력은24 kHz 16-bit PCM chunk이며 mic capture와 playback queue 구현은 tutorial 범위 밖이다. Audio event는 재생 queue에 넣고 audio_interrupted에서 queue를 비워 중단을 반영한다. Server VAD threshold0.8/silence500 ms/padding300 ms는 예시 설정이다. Transcription과 speech-to-speech output, tool result와 영속 Ontology 기록은 별도 데이터 경로다.

useInsecureApiKey flag는 SDK의 browser guard를 조정하는 예제이며 Foundry credential을 공개해도 된다는 뜻이 아니다. tracingDisabled도 앱 로그와 브라우저 관측까지 모두 없앤다는 보장은 아니다. Tool stub의 synthetic product 결과는 실제 query 구현으로 바꿔야 한다.

## 음성 수집의 수명

원문은 녹음/전사 전에 관할과 조직 정책에 맞는 고지/동의, retention 설계를 요구한다. Mic permission UI와 대화 상대 전체의 동의는 다르다. 여기서는 법적 충족 여부를 판단하거나 실제 녹음, provider 연결과 tool write를 수행하지 않았다.

## 출처

- [Palantir realtime-audio, realtime-audio](https://www.palantir.com/docs/foundry/realtime-audio)
- [Palantir realtime-audio, build-a-voice-enabled-osdk-application](https://www.palantir.com/docs/foundry/realtime-audio/build-a-voice-enabled-osdk-application)
- [Palantir realtime-audio, overview](https://www.palantir.com/docs/foundry/realtime-audio/overview)

## 관련 문서

- [[Palantir-Collaborative-Analysis]]
