---
tags: [ai, speech-to-text, whisper, youtube, tools]
status: done
verified_at: 2026-09-24
category: "AI엔지니어링(AIEngineering)"
aliases: ["Local Speech-to-Text", "로컬 음성 인식", "영상 전사", "STT"]
---

# 로컬 음성 인식으로 영상 전사하기

강연이나 강의 영상을 학습 문서의 입력으로 쓰려면 먼저 텍스트가 필요하다. 텍스트를 얻는 경로는 사람이 단 자막, 플랫폼 자동 자막, 직접 음성 인식(STT) 세 가지이며 품질과 적용 범위가 크게 다르다. 이 문서는 세 경로의 차이, Apple Silicon Mac에서 쓸 수 있는 로컬 음성 인식 엔진의 동작과 실측 결과를 정리한다. 실제 구현은 [[Video-Transcript-Pipeline|영상 전사 파이프라인 구현]]에 있다.

## 텍스트를 얻는 세 경로

### YouTube 자막의 구조

- yt-dlp 메타데이터는 사람이 단 자막(`subtitles`)과 자동 자막(`automatic_captions`)을 다른 목록으로 준다. 자동 자막은 YouTube의 음성 인식 결과다.
- 자동 자막에는 원어 인식 트랙(`ko-orig`처럼 `-orig`로 끝남)과 다른 언어를 기계 번역한 트랙이 섞인다. 한국어 인식 트랙이 없는 영상의 자동 `ko`는 영어 인식 결과의 번역본일 수 있으므로 원어 트랙을 지정해야 한다. 시험한 영상 1편에서는 번역 트랙을 연달아 요청하자 HTTP 429로 실패했다.
- 자동 자막 vtt는 앞 문장을 다음 자막에 다시 싣는 롤링 형식이라 태그만 지우면 같은 문장이 반복된다. 실측에서 글자 수가 약 2.9배로 부풀었다. json3 형식은 중복이 없어 `events[].segs[].utf8`을 이어 붙이면 된다.
- 한국어 자동 자막에는 문장 부호가 사실상 없고 기술 용어 오인식이 많다. 토스 SLASH 24 발표에서는 SAGA가 사과, 2PC가 투피, 트랜잭션이 트랜지션으로 적혔다. 청중 소음이 있는 10분 테코톡에서는 QUIC 11회가 모두 킥 등으로 적혔다.
- 자막이 없으면 yt-dlp는 종료 코드 0으로 끝나고 파일만 만들지 않는다. 성공 여부는 결과 파일로 판정한다.

### 자막 기반 요약 서비스의 한계

자막 기반 요약 서비스는 YouTube 자막을 가져와 서버의 LLM으로 요약한다. 틸노트 클립 v3.17 클라이언트 코드(2026-09-23 확인)가 그 예다.

- 데스크톱 영상의 요약 경로는 브라우저에서 스크립트 패널 DOM을 먼저 읽고, 실패하면 YouTube 내부 player API를 안드로이드 클라이언트로 호출해 자막 트랙을 받는다. 수동 자막과 자동 자막을 구분하지 않는다.
- 추출한 자막을 머리말과 줄마다 붙는 시각을 포함해 60,000자에서 잘라 서버로 보내고, 요약 프롬프트와 모델은 서버에 있다.
- 오디오 캡처나 음성 인식 코드가 없어 자막이 없는 영상은 처리하지 못한다.

따라서 원천 텍스트의 품질은 YouTube 자막과 같고, 서비스가 더하는 것은 요약 단계다. 자막을 직접 받거나 직접 음성 인식을 하면 60,000자 절단 없이 전체 텍스트를 얻을 수 있다. 요청 제한과 인식 오류는 별개 문제다.

## 음성 인식의 동작 원리

### Whisper 계열

- Whisper는 오디오를 30초 창으로 나눠 인코더가 음향 특징을 만들고, 디코더가 텍스트 토큰을 생성하는 인코더-디코더 모델이다. 앞 창의 결과를 다음 창의 문맥으로 넘겨 문장을 잇는다.
- large-v3-turbo는 large-v3를 가지치기해 디코더를 32층에서 4층으로 줄이고 추가 학습한 모델이다. 인코더 구조는 같고, 품질 저하가 작은 대신 생성이 훨씬 빠르다.
- 대표 실패는 두 가지다. 무음이나 박수 구간에 없던 자막 크레딧("한글자막 by ...")이나 영상 끝 인사를 지어내는 환각, 같은 문장을 여러 번 이어 쓰는 반복 루프다. mlx-whisper 실측에서는 이전 창의 문맥 전달(`condition_on_previous_text`)을 끄자 루프가 사라졌다.

### VAD(음성 구간 검출)

- VAD는 오디오에서 말소리 구간만 골라 인식기에 넘긴다. 무음과 박수 구간이 인식기에 들어가지 않아 환각이 크게 줄어든다. whisper.cpp는 VAD 옵션을 내장했고 Silero 모델 파일은 따로 받는다.
- 대가도 있다. 기본값(임계값 0.50, 앞뒤 여유 30ms)은 청중 환호와 겹친 발표 첫머리 발화를 통째로 지웠다. 임계값을 0.25로 낮추고 여유를 300ms로 늘리자 첫 문장에서 지워진 글자가 25자에서 16자로 줄었지만, 환호와 겹친 문장은 짧게 축약된 채 남았다.
- 반주가 깔린 노래는 말소리로 보지 않을 수 있다. 시험한 노래 영상 1편에서는 구간이 0개였다.

### 어휘 힌트(initial prompt)

- Whisper에 제목이나 용어 목록을 프롬프트로 주면 해당 표기로 적을 확률이 올라간다. whisper.cpp는 `--carry-initial-prompt`로 매 창에 같은 힌트를 붙일 수 있다. mlx-whisper에는 매 창 고정 옵션이 없어, 문맥 전달을 끄면 첫 창에만, 켜면 이전 텍스트와 함께 밀려날 때까지만 적용된다.
- 효과는 제한적이고 부작용이 있다. 기본 VAD 실행에 제목 프롬프트를 더한 개선의 약 40%는 퀵을 QUIC으로 적은 표기 차이였다. 퀵을 QUIC으로 통일해 비교하면 프롬프트 없는 채택 설정(12.7%)이 프롬프트 실행(13.0%)보다 낮았다. 첫 창의 실제 발화 "1.1과 2"가 제목 표기 "HTTP/2"로 바뀌기도 했고, mlx-whisper에서는 첫 30초가 "Q."의 반복으로 무너졌다. 전사를 LLM이 다시 읽고 교정한다면 기본으로 끄는 편이 안전하다.

## Apple Silicon 로컬 엔진 비교 (2026-09 기준)

| 엔진 | 가속 | 특징 | 주의 |
|---|---|---|---|
| whisper.cpp (whisper-cli) | Metal | MIT, brew 설치, VAD 옵션, 매 창 프롬프트 유지, 기본 빔 서치 5 | Core ML 가속은 소스 빌드 필요 |
| mlx-whisper | MLX | 빠름 | 빔 서치 미구현(온도 0에서 greedy), CLI의 온도 fallback이 사실상 없어 반복 루프 발생 |
| Qwen3-ASR 1.7B (mlx-audio) | MLX | Apache-2.0, 한국어 공식 지원 | 기본 실행은 30초 청크 단위 시각(ForcedAligner를 붙이면 단어 단위), 프롬프트를 넣으면 짧은 마지막 청크에 프롬프트가 그대로 출력 |
| Apple SpeechTranscriber | 시스템 | macOS 26 API 내장(언어 모델은 첫 사용 때 내려받음), 약 125배속 | 한국어 용어 인식이 약함, 200초 시험에서 문맥 문자열 효과 없음(문서상 바이어싱은 DictationTranscriber) |
| faster-whisper, whisperX | CPU | 파이썬 생태계 | Mac에서는 CPU만 사용 |

NVIDIA Parakeet v3와 Canary v2는 한국어를 지원하지 않는다. 한국어를 지원하는 NVIDIA Nemotron 3.5 ASR은 200초 구간만 시험했다. 한국어 파인튜닝 Whisper와 WhisperKit은 후보였지만 실행하지 않았다.

## 실측 결과

M2 24GB 팬리스 MacBook Air에서 2026-09-23과 24일에 측정했다. 문자 오류율(CER)은 사람이 단 자막이 있는 10분 테코톡(시리즈 이름) 1편(858초, 약 14분, 정답 4,663자)을 기준으로 했다. NFKC 정규화와 소문자화 뒤 문자와 숫자만 남겨 문자 단위 편집 거리를 셌다. 용어 정확 표기는 정답에 나온 기술 용어 28개(142회)를 원어나 표준 표기로 적은 비율이며, 퀵은 QUIC의 정확 표기로 세지 않는다.

| 설정 | CER | 용어 정확 표기 | 비고 |
|---|---|---|---|
| YouTube 자동 자막 | 35.6% | 29.6% | 문장 부호 없음 |
| whisper.cpp turbo + VAD(0.25, 300ms), 프롬프트 없음 | 13.7% | 80.3% | 채택 설정 |
| whisper.cpp turbo + 기본 VAD | 15.3% | 76.1% | 첫머리 발화 삭제 |
| whisper.cpp turbo, VAD 없음 | 14.5% | 80.3% | 박수 구간 자막 크레딧 환각 |
| whisper.cpp turbo + 기본 VAD + 제목 프롬프트(carry) | 13.0% | 85.2% | 개선분 상당수가 표기 차이, 발화 변형 |
| mlx-whisper turbo | 13.6% | 80.3% | 이 실행은 정상, mlx-whisper 전체 7회 중 5회 루프나 환각 |
| whisper.cpp large-v3 + 기본 VAD + 제목 프롬프트(carry) | 14.9% | 90.1% | turbo보다 수 배 느림 |
| mlx-whisper large-v3 | 22.3% | 81.0% | 반복 루프 4건 |
| Qwen3-ASR 1.7B 8bit | 15.5% | 78.9% | 토스 발표에서 힌트 없이 SAGA 25회 중 17회(다른 엔진 0~3회) |
| Apple SpeechTranscriber | 20.9% | 43.7% | 858초를 7초에 처리 |

- 영상 1편 기준이라 상위 설정 사이의 1~2%p 차이는 잡음 범위다. 구간 단위 부트스트랩에서 13.0% 설정과 13.6%, 14.5%, 14.9% 설정의 차이는 95% 구간이 0을 포함했다. YouTube 자동 자막, Qwen3, Apple, mlx large-v3, 기본 VAD(15.3%)와의 차이는 유의했다. 채택 설정(13.7%)은 이 비교 뒤에 따로 측정해 부트스트랩에 넣지 않았다. 채택 VAD에 프롬프트를 더한 조합은 측정하지 않았고, 프롬프트 실행은 모두 `--carry-initial-prompt`를 썼다.
- 수동 자막도 발화 일부가 빠져 있어 완전한 정답이 아니다.
- 속도는 식은 상태에서 whisper.cpp turbo가 오디오 길이의 약 0.08배, 발열로 느려지면 0.12~0.21배였다. 14분 영상 전사가 약 80초, 20분 영상이 다운로드 포함 약 2분 40초, 84분 세미나 전사가 약 16분(다운로드와 변환 포함 약 17분) 걸렸다.

## 선택 기준

- 기본은 whisper.cpp turbo + VAD(0.25, 300ms)다. 정확도는 상위권과 구분되지 않는다. 반복 루프와 환각은 mlx-whisper보다 적었고 14~20분 영상에서는 나오지 않았지만, 84분 세미나에서 한 문장 6회 반복이 1건 나와 반복 축소 후처리를 둔다. 같은 판과 설정으로 다시 실행했을 때 출력이 바이트 단위로 같았고, 파이썬 환경 없이 brew CLI와 모델 파일로 돈다.
- 핵심 도메인 용어가 계속 틀리면 Qwen3-ASR로 한 번 더 전사해 대조한다. 토스 발표 추정치에서 용어 우위가 있었지만 그 절반쯤이 사가 한 단어이고, 정답이 있는 테코톡에서는 우위가 없어 기본 엔진으로 쓸 근거는 부족하다.
- 빠른 훑어보기에는 Apple SpeechTranscriber가 맞지만 학습 문서의 입력으로는 용어 품질이 부족하다.
- 사람이 단 자막은 용어 표기가 정확한 편이지만 발화 누락이 있다. 한국어 기술 발표 2편 기준으로, 자동 자막만 있으면 음성 인식이 낫다.
- 클라우드 STT는 오디오를 외부로 보내는 대신 장비 성능과 무관하다. 2026-09-23과 24일 공식 요금 기준 비교는 다음과 같다.

| 서비스 | 요금 | 어휘 힌트 |
|---|---|---|
| Deepgram Nova-3 | 분당 0.0043달러(사전 녹음, 단일 언어, 종량제) | keyterm, 분당 0.0013달러 추가 |
| OpenAI gpt-transcribe | 분당 약 0.0045달러(예상 비용 표기) | prompt, keywords |
| ElevenLabs Scribe v2 | 시간당 0.22달러 | keyterm, 시간당 0.05달러 추가 |
| Google Chirp 3 | 분당 0.016달러(V2 표준, 월 50만 분 이하, 요금표는 chirp 표기), dynamic batch 분당 0.003달러 | 문구 적응 |
| CLOVA Speech 장문 | 15초당 5원(15초 단위 올림), Free 플랜 월 20분 무료 | boostings |
| 리턴제로 | 시간당 1,000원(VAT 별도), 가입 시 600분 무료 | keywords |

## 운영 체크포인트

- 전사문에는 화면의 슬라이드와 코드가 없다. 발표가 화면 위주면 핵심 내용이 빠진다.
- 청중 소리와 겹친 발화는 VAD 설정에 따라 빠지거나 축약될 수 있다.
- 이 M2 Air에서는 연속 실행이나 84분 오디오에서 인코더가 1.9~2.3배 느려졌다. 긴 영상은 백그라운드로 돌린다.
- 음성 인식 결과의 음차(퀵은 QUIC)와 비슷한 단어 오인식(사과 패턴은 사가 패턴)은 문맥과 공식 문서로 교정하고, 교정할 수 없는 내용은 문서에 옮기지 않는다.

## 출처

- [whisper.cpp — GitHub, ggml-org](https://github.com/ggml-org/whisper.cpp)
- [whisper.cpp 모델 파일 — Hugging Face, ggerganov](https://huggingface.co/ggerganov/whisper.cpp)
- [whisper-large-v3-turbo — Hugging Face, openai](https://huggingface.co/openai/whisper-large-v3-turbo)
- [mlx-whisper — GitHub, ml-explore](https://github.com/ml-explore/mlx-examples/tree/main/whisper)
- [mlx-audio — GitHub, Blaizzy](https://github.com/Blaizzy/mlx-audio)
- [Qwen3-ASR — GitHub, QwenLM](https://github.com/QwenLM/Qwen3-ASR)
- [Qwen3-ASR Technical Report — arXiv](https://arxiv.org/abs/2601.21337)
- [parakeet-tdt-0.6b-v3 — Hugging Face, nvidia](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3)
- [canary-1b-v2 — Hugging Face, nvidia](https://huggingface.co/nvidia/canary-1b-v2)
- [nemotron-3.5-asr-streaming-0.6b — Hugging Face, nvidia](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b)
- [CTranslate2 — GitHub, OpenNMT](https://github.com/OpenNMT/CTranslate2)
- [whisperX — GitHub, m-bain](https://github.com/m-bain/whisperX)
- [Apple Developer, SpeechTranscriber](https://developer.apple.com/documentation/speech/speechtranscriber)
- [Apple Developer, DictationTranscriber](https://developer.apple.com/documentation/speech/dictationtranscriber)
- [Bring advanced speech-to-text to your app with SpeechAnalyzer — WWDC25](https://developer.apple.com/videos/play/wwdc2025/277/)
- [yt-dlp — GitHub](https://github.com/yt-dlp/yt-dlp)
- [Clip - Tilnote — Chrome 웹 스토어](https://chromewebstore.google.com/detail/focbaalelhmfiddakohmchapddnhbdkp)
- [OpenAI, Speech to text](https://developers.openai.com/api/docs/guides/speech-to-text)
- [OpenAI, Pricing](https://developers.openai.com/api/docs/pricing)
- [Deepgram, Pricing](https://deepgram.com/pricing)
- [ElevenLabs, API Pricing](https://elevenlabs.io/pricing/api)
- [Google Cloud, Chirp 3](https://docs.cloud.google.com/speech-to-text/docs/models/chirp-3)
- [Google Cloud, Speech-to-Text pricing](https://cloud.google.com/speech-to-text/pricing)
- [NAVER Cloud, CLOVA Speech](https://www.ncloud.com/product/aiService/clovaSpeech)
- [NAVER Cloud, CLOVA Speech 장문 인식 API](https://api.ncloud-docs.com/docs/ai-application-service-clovaspeech-longsentence)
- [RTZR, 요금 안내](https://developers.rtzr.ai/docs/pricing/)

## 관련 문서

- [[Video-Transcript-Pipeline|영상 전사 파이프라인 구현]]
- [[Claude-Code-Business-Automation|Claude Code 비즈니스 자동화]]
- [[LLM-Generation-Mechanics-Context-and-Agent|LLM Context와 환각과 에이전트]]
