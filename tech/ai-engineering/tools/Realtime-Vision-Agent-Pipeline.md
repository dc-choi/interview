---
tags: [ai, realtime, video, audio, multimodal, webrtc]
status: done
verified_at: 2026-11-04
category: "AI엔지니어링(AIEngineering)"
aliases: ["Realtime Vision Agent Pipeline", "실시간 영상 에이전트 파이프라인", "Vision Agents"]
---

# 실시간 영상 에이전트의 전송과 추론 분리

실시간 영상 에이전트는 통화의 오디오와 영상 입력을 모델에 전달하고 응답을 돌려준다. 미디어 전송, 프레임 처리와 모델 추론은 서로 다른 역할이다. 영상 통화 연결이 빨라도 모델의 해석과 응답 생성이 같은 시간 안에 끝난다는 뜻은 아니다.

## 구성 요소

| 요소 | 책임 | 확인할 점 |
|---|---|---|
| 미디어 전송 | 통화 연결과 오디오, 영상 트랙 전달 | 전송 제공자, 연결 실패와 재연결 |
| 영상 processor | 프레임 분석 또는 변환 | 실제 처리한 프레임과 사용한 모델 |
| 대화 모델 | 입력 해석과 응답 생성 | 선택한 모델이 받는 입력과 응답 방식 |
| 음성 처리 | 전사와 합성, 발화 종료 판단 | 별도 STT/TTS 조합인지 실시간 음성 모델인지 |

전송, 모델과 processor를 따로 선택하면 각 단계의 역할과 지연을 나눠 볼 수 있다. 플러그인이 있다는 사실만으로 모든 조합이 호환된다고 가정하지 않고 선택한 구성으로 확인한다(설계 점검).

## 구현 사례: Vision Agents

2026-11-04 공식 저장소와 제품 문서 기준으로 Vision Agents는 Python 기반 오픈소스 프레임워크다. `Agent`에 전송 계층인 `edge`, 대화 모델인 `llm`과 영상 처리용 `processors`를 조합한다. 공식 예제에는 Stream 전송, Gemini 실시간 모델과 YOLO pose processor를 결합한 구성이 있다.

별도 STT, 텍스트 LLM과 TTS를 연결하는 구성도 제공한다. 실시간 음성 모델을 쓰는 구성에서는 별도 STT/TTS가 필요하지 않을 수 있으므로 모델과 플러그인의 계약을 확인한다. 프레임워크의 통합 기능과 개별 모델의 입력 지원 범위는 구분한다.

## 지연과 비용 점검

다음은 적용 시 확인할 항목이며 이 문서에서 측정한 성능이 아니다.

- 통화 연결 시간, 미디어 전달 지연, 프레임 처리 시간과 첫 응답 재생 시간을 나눠 잰다.
- 모델에 보내는 FPS를 올릴 때 비용과 관찰 품질이 어떻게 달라지는지 확인한다. 전송이 빠르다는 수치를 전체 응답 지연으로 사용하지 않는다.
- 오픈소스 프레임워크와 전송, 추론 서비스의 이용 조건을 따로 확인한다. 무료 체험 안내를 전체 운영비가 없다는 뜻으로 해석하지 않는다.
- 실제 카메라 입력, 끼어들기와 연결 복구는 설치 후 검증할 항목이다. 이 문서에서는 설치와 실통화 시험을 하지 않았다.

## 출처

- [Open Vision Agents by Stream — GitHub, GetStream](https://github.com/GetStream/Vision-Agents/blob/main/README.md)
- [Open Vision Agents by Stream: Open Source SDK for Building Low-Latency Vision AI Apps — Stream](https://getstream.io/blog/vision-agents-by-stream/)
- [Vision Agents, Simple Agent Example](https://github.com/GetStream/Vision-Agents/blob/main/examples/01_simple_agent_example/README.md)

## 관련 문서

- [[Realtime-Voice-Architecture|실시간 음성 에이전트의 대화와 작업 분리]]
- [[Realtime-Communication-Comparison|실시간 통신 기술 비교]]
- [[Multimodal-Video-Retrieval|멀티모달 영상 검색]]
