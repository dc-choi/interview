---
tags: [ai, video, editing, ffmpeg, whisper, subtitles, licensing]
status: done
verified_at: 2026-11-01
category: "AI엔지니어링(AIEngineering)"
aliases: ["Talking-Head Video Auto Editing", "녹화 영상 자동 편집", "무음 컷 편집", "코딩 에이전트 영상 편집"]
---

# 녹화 영상의 자동 컷 편집과 자막

한 사람이 카메라 앞에서 말하는 녹화본에는 무음 구간, 말실수와 다시 말한 구간이 섞인다. 코딩 에이전트에게 편집을 맡길 때는 에이전트가 영상을 직접 보고 판단하게 하기보다 오디오 분석, 음성 인식과 렌더러처럼 결과를 파일로 남기는 전용 도구를 부르게 하는 방식을 제안한다. 에이전트는 도구를 조합해 컷 목록과 자막을 만들고, 사람은 결과 영상으로 검수한다. 엔진 판, 모델이나 설정이 바뀌면 음성 인식 결과도 달라질 수 있으므로, 재현과 되돌리기의 근거는 도구의 재실행이 아니라 보관한 전사문, 컷 목록과 설정이다.

## 단계와 산출물

| 단계 | 도구 예 | 산출물 | 확인할 것 |
|---|---|---|---|
| 무음 탐지 | FFmpeg `silencedetect` | 무음의 시작, 끝과 길이 | 말의 쉼이나 숨소리까지 자르지 않는가 |
| 전사 | Whisper 계열(`large-v3-turbo`) | 구간이나 단어 단위 시각이 붙은 텍스트 | 무음 구간의 환각, 고유명사 오인식 |
| 다시 말한 구간 판별 | 전사문과 단어 시각 비교 규칙 | 지울 구간과 남길 구간 목록 | 의도한 반복과 강조를 지우지 않는가 |
| 렌더링 | FFmpeg, HyperFrames, Remotion | 컷을 반영한 영상, 모션 그래픽 | 컷 경계의 소리 끊김, 자막과 화면의 싱크 |
| 자막 | 전사문과 스타일 규칙 | SRT 같은 자막 파일 | 컷 반영 뒤의 시각과 텍스트, 줄 길이, 줄 수, 읽기 속도, 표시 시간 |
| 효과음과 소재 | 라이선스를 확인한 소재 | 최종 믹스 | 사용 조건, 음량 |

이 표는 아래 공식 문서의 기능과 작업 제안을 묶은 분해다. 특정 제품이 전 과정을 자동으로 보장한다는 뜻이 아니다.

## 무음 탐지는 구간을 알려 줄 뿐 자르지 않는다

2026-11-01 FFmpeg 필터 문서 기준, `silencedetect`는 입력 음량이 noise 허용값 이하인 상태가 최소 길이 이상 이어지면 로그를 남긴다. 기본값은 noise -60dB(진폭비 0.001)와 duration 2초다. `mono`를 켜면 채널을 따로 본다. 결과는 초 단위의 `silence_start`, `silence_end`, `silence_duration`이며 로그와 frame metadata(`lavfi.silence_start` 등, `mono`에서는 채널 번호 접미사가 붙는다)에 남는다.

```bash
# 예시 값이다. 녹음 환경의 잡음 수준과 말버릇에 맞춰 조정한다.
ffmpeg -i take.mp4 -vn -af silencedetect=noise=-35dB:d=0.6 -f null - 2> silence.log
```

필터는 영상을 자르지 않으므로 로그를 컷 목록으로 바꾸는 단계와 실제로 잘라내는 단계가 따로 필요하다. 기본값 2초는 문장 사이의 짧은 쉼을 잡지 못한다. noise 값을 0dB 쪽으로 올리면(예: -60dB에서 -30dB) 녹음 레벨에 따라 작게 말한 끝음절도 무음으로 볼 수 있다. 위 예시의 -35dB와 0.6초는 공식 권장값이 아니라 시험해 볼 출발점이다. 잘라낼 때는 무음 끝을 그대로 컷 지점으로 쓰지 말고 말소리 앞뒤에 여유를 둔다(적용 제안).

## 다시 말한 구간은 촬영 규칙을 맞춰 두면 찾기 쉽다

다음은 공식 도구가 제공하는 기능이 아니라 촬영과 편집을 맞추는 작업 제안이다.

- 촬영할 때 실수하면 무음 탐지의 최소 길이보다 길게 멈춘 뒤 문장 처음부터 다시 말한다. 그 쉼이 찾을 수 있는 경계가 된다.
- 실패한 시도는 앞 문장에서 쉼 없이 이어질 수 있다. 그래서 무음 경계로 나눈 구간을 통째로 지우지 않는다. 쉼 직전부터 거꾸로 찾아, 다시 시작한 문장의 앞부분과 연속으로 겹치는 단어열(예: 두 단어 이상)이 시작되는 시각을 삭제 시작점으로 잡고 마지막 시도만 남긴다. 한 단어만 맞추면 흔한 첫 단어가 앞의 정상 문장에서 먼저 잡힐 수 있다. 이 판단에는 아래의 단어 단위 시각이 필요하다.
- 겹침을 찾지 못한 쉼 경계도 검토 목록에 올린다. 단어 시각의 정확도는 측정하지 않았으므로 삭제 경계 앞뒤를 직접 들어 확인한다.
- 강조를 위한 반복이나 내용을 고쳐 말한 문장도 비슷해 보인다. 자동 삭제 전에 삭제 후보와 그 전사문을 목록으로 보고, 삭제 구간을 표시한 미리보기를 확인한다.
- 끊긴 문장의 첫머리가 전사문에 남는지는 엔진과 설정에 따라 다를 수 있으므로 짧은 시험 녹화로 먼저 확인한다.

## 전사는 시각 정보가 붙은 형태로 받는다

2026-11-01 OpenAI의 저장소와 모델 카드 기준, `large-v3-turbo`는 `large-v3`를 가지치기해 디코더를 32층에서 4층으로 줄이고 추가 학습한 모델이다. 품질 저하가 작은 대신 훨씬 빠르다. README는 이 모델이 번역 작업으로는 학습되지 않았다고 적으므로 전사 용도로 쓴다. 공식 `openai-whisper` 패키지는 cross-attention과 동적 시간 정합으로 단어 단위 시각을 뽑는 `word_timestamps` 옵션을 제공한다. 명령줄의 `--word_timestamps`는 실험 기능으로 표시돼 있다. 자막 줄 폭과 줄 수를 정하는 `--max_line_width`, `--max_line_count`는 이 옵션을 켜야 쓸 수 있고, `--max_line_count`는 `--max_line_width` 없이는 효과가 없다.

이 줄 폭 옵션이 아래 Netflix 규칙의 글자 수 계산과 같다고 가정하지 않고 별도 검사기로 확인한다(적용 제안). 이 vault의 기본 전사 엔진인 whisper.cpp에서 단어 단위 시각을 얻는 옵션은 이번에 확인하지 않았다. 컷 판단에는 정리 전의 원본 출력을 쓴다. [[Video-Transcript-Pipeline|영상 전사 파이프라인]]의 `transcript.md`는 3회 이상 반복한 문장을 줄이고 문단 단위 시각만 남기므로 다시 말한 구간을 찾는 입력으로 맞지 않는다. 무음 구간에서 없던 문장을 지어내는 환각, 한국어 실측 오류율과 VAD 설정은 [[Local-Speech-to-Text|로컬 음성 인식]]에서 다룬다. 컷 판단에 쓰는 전사문도 같은 방식으로 고유명사와 숫자를 검수한다.

## 한국어 자막은 줄 길이와 읽기 속도를 함께 맞춘다

2026-11-01 확인한 Netflix Korean Timed Text Style Guide(최근 변경 기록 2025-07-07)는 외국어 콘텐츠의 한국어 자막(1절)과 한국어 콘텐츠의 청각장애인용 자막인 SDH(2절)를 나눠 규칙을 둔다.

| 항목 | 1절: 외국어 콘텐츠의 한국어 자막 | 2절: 한국어 SDH |
|---|---|---|
| 줄 길이 | 한 줄 16자. 라틴 문자, 공백과 문장부호는 0.5자로 센다 | 한 줄 16자 |
| 줄 수 | 최대 두 줄. 글자 수 제한을 넘지 않으면 보통 한 줄로 둔다 | 최대 두 줄 |
| 읽기 속도 | 성인 프로그램 초당 12자, 어린이 프로그램 초당 9자까지 | 성인 초당 14자, 어린이 초당 11자까지 올릴 수 있다 |

1절은 자막 줄 끝에 마침표나 쉼표를 두지 않고 말줄임표로 한 글자짜리 U+2026을 쓰게 한다. 같은 사이트의 일반 요구사항은 자막 하나의 표시 시간을 최소 5/6초, 최대 7초로 둔다. 날짜 표기가 없는 FAQ는 줄당 글자 수를 넘으면 자동으로 반려한다며 한국어 23자, Netflix 오리지널 16자를 기준으로 적는다. 스타일 가이드의 16자 제한과 FAQ의 자동 반려 기준은 별개이므로, 자동 반려를 피한 것과 스타일 가이드를 지킨 것은 다르다.

한국어로 말한 영상에 한국어 자막을 다는 경우는 1절의 번역 자막이 아니고, 소리 설명을 넣지 않으면 2절의 SDH도 아니다. 2021-07-11 변경 기록은 번역 자막과 같은 언어 자막(intralingual)의 줄당 글자 수 제한이 같다고 적지만, 그 밖의 규칙까지 정한 절은 없다. 그러므로 자체 채널에서 줄 수와 읽기 속도 규칙을 쓰는 것은 확장 적용이다(적용 제안). Netflix 납품이 아니면 이 규칙은 의무가 아니며, 사람이 읽을 분량을 정하는 공개 기준으로 쓴다.

컷을 반영하면 원본 기준 자막 시각이 앞에서 지운 길이만큼 밀리고, 다시 말한 구간을 지웠다면 그 말이 원본 전사문으로 만든 자막에 남는다. 지운 구간에 든 단어를 자막 텍스트에서 빼고, 남은 단어의 시각을 렌더링에 실제로 적용한 컷 경계로 옮겨 자막을 다시 묶는다. 컷 결과를 다시 전사하는 경로를 택하면 앞서 고친 고유명사와 숫자를 다시 검수한다. 무음을 많이 자를수록 자막이 화면에 머물 시간이 줄어 읽기 속도와 최소 표시 시간을 넘기기 쉬우므로 두 기준을 함께 검사한다(적용 제안). 에이전트에게 자막을 맡길 때는 문서 이름만 전달하지 말고 줄 길이, 줄 수, 초당 글자 수와 표시 시간을 숫자로 주고, 결과 파일을 같은 숫자로 검사한다(적용 제안).

## 모션 그래픽과 효과음은 라이선스부터 확인한다

- **HyperFrames**: HTML, CSS, 미디어와 특정 시점으로 이동해 그릴 수 있는 애니메이션을 MP4로 만드는 오픈소스 프레임워크다. README는 headless Chrome에서 프레임마다 이동해 그린 결과를 FFmpeg로 인코딩하며 같은 입력이 같은 출력을 만든다고 설명한다. 그 재현에 필요한 조건과 Remotion과의 소스 형식 차이는 [[Claude-Design-Handoff|AI 디자인 시스템과 구현 인계]]에 있다. Apache-2.0이고 Node.js 22 이상과 FFmpeg가 필요하다.
- **Remotion**: 자체 라이선스를 쓴다. 2026-11-01 확인한 현재 라이선스 기준 개인, 직원 3명 이하의 영리 조직, 비영리 조직과 상업적 사용 전 평가는 무료이고 그 밖의 경우는 Company License가 필요하다. LICENSE.md는 Remotion 5.0에서 라이선스가 조금 바뀐다고 예고한다. 외주로 다른 회사가 직접 실행할 제작 도구를 넘긴다면 그 회사의 조건도 확인한다(적용 제안). 외주자가 직원 4명 이상인 고객사를 위해 직접 렌더링할 때의 조건은 이번에 확인하지 않았다.
- **earshot**: 코딩 에이전트가 소리를 듣고 검토하고 만들게 하는 오픈소스 도구다. README 기준으로 `earshot sfx`는 화면의 특정 순간에 효과음을 맞추고 `earshot kit`은 영상 전체의 효과음을 만들며, 두 명령은 모델과 네트워크 없이 동작한다. 모델을 쓰는 명령은 처음 쓸 때 공개 모델 두 개(CLAP은 Apache-2.0, AST는 BSD-3-Clause, 합계 약 1.1GB)를 내려받는다. 코드는 MIT다. 핵심 명령의 출력은 WAV이고, 영상에 섞는 단계는 저장소의 별도 스킬이 다룬다. 실행해 보지는 않았다.
- **Pexels**: 사진과 영상을 무료로 쓸 수 있고 출처 표기는 필요 없다. 라이선스 페이지가 광고와 마케팅 같은 상업적 용도를 사용 예로 든다. 식별 가능한 인물을 나쁘게 보이게 하거나 불쾌감을 주는 방식으로 쓰기, 수정하지 않은 사본 판매, 이미지 속 인물이나 브랜드가 제품을 보증한다고 암시하기, 다른 스톡 사진이나 배경화면 플랫폼에 재배포하거나 판매하기, 상표나 상호에 쓰기는 금지된다.
- **Unsplash**: 상업적 용도를 포함해 허락이나 출처 표기 없이 쓸 수 있다. 크게 수정하지 않은 이미지를 팔거나, 이미지를 모아 비슷하거나 경쟁하는 서비스를 만드는 것은 허용하지 않는다. Unsplash+ 이미지는 별도 구독 라이선스다.
- **Mixkit**: 효과음 무료 라이선스는 상업적 프로젝트에도 쓸 수 있다. 효과음을 단독으로나 스톡 소재로 재배포하거나, 도구나 템플릿 또는 원본 파일과 함께 배포하거나, 저작권 관리 서비스에 등록할 수는 없다. 무료 음악 라이선스는 게임, TV와 라디오 방송, CD와 DVD 사용을 막는다. 영상은 상업적 사용을 허용하는 무료 라이선스와 개인 프로젝트로 한정하는 제한 라이선스로 나뉘므로 소재마다 붙은 라이선스를 확인한다.

Pexels와 Unsplash의 요약은 각 사이트의 콘텐츠 라이선스다. 에이전트가 API로 소재를 받으면 API 약관이 조건을 더할 수 있으므로 출처 표기나 링크 요구가 있는지 확인한다(이번에 대조하지 않음). 오픈소스 코드와 모델의 라이선스 검토 절차는 [[Open-Source-License-Review|오픈소스 라이선스 검토]]를 따른다. 위 라이선스 요약은 2026-11-01 확인한 각 공식 페이지 기준이며 법률 자문이 아니다.

## 운영 체크포인트

- 원본 파일을 지우지 않고 컷 목록, 무음 탐지 설정과 전사문을 함께 보관하는가
- 자동 컷 뒤 전체를 재생해 문장 첫 음절과 남길 문장 끝음절의 잘림, 숨소리 컷과 배경음 끊김을 확인했는가
- 다시 말한 구간의 삭제 후보를 사람이 확인했는가
- 컷을 반영한 뒤 자막 시각을 다시 맞추고, 지운 말이 자막에 남지 않았는지 확인했는가
- 자막 파일을 줄 길이, 줄 수, 읽기 속도와 표시 시간의 숫자 기준으로 검사했는가
- 사용한 소재의 출처, 라이선스와 받은 경로(직접 내려받기, API)를 프로젝트에 기록했는가
- 고객 납품물이면 플랫폼별 자막과 음량 규격을 따로 확인했는가

## 출처

- [FFmpeg Filters Documentation, silencedetect](https://www.ffmpeg.org/ffmpeg-filters.html#silencedetect) — 2026-11-01 매개변수, 기본값과 출력 확인
- [openai/whisper — GitHub](https://github.com/openai/whisper) — 2026-11-01 README의 turbo 설명과 번역 제외, `transcribe.py`의 단어 단위 시각과 자막 옵션 확인
- [openai/whisper-large-v3-turbo — Hugging Face](https://huggingface.co/openai/whisper-large-v3-turbo) — 2026-11-01 디코더 층 수, 추가 학습과 품질 저하 설명 확인
- [Netflix Partner Help Center, Korean Timed Text Style Guide](https://partnerhelp.netflixstudios.com/hc/en-us/articles/216001127) — 2026-11-01 1절과 2절의 줄 길이, 줄 수, 읽기 속도, 문장부호와 변경 기록 확인
- [Netflix Partner Help Center, Timed Text Style Guide: General Requirements](https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617) — 2026-11-01 최소와 최대 표시 시간 확인
- [Netflix Partner Help Center, What is the maximum number of characters per line allowed in Timed Text assets?](https://partnerhelp.netflixstudios.com/hc/en-us/articles/215274938) — 2026-11-01 자동 반려 기준 확인, 페이지에 날짜 표기 없음
- [heygen-com/hyperframes — GitHub](https://github.com/heygen-com/hyperframes) — 2026-11-01 렌더링 방식, 요구 사항과 라이선스 확인
- [Remotion, License](https://www.remotion.dev/license), [remotion-dev/remotion LICENSE.md — GitHub](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) — 2026-11-01 무료 사용 조건, Company License와 5.0 변경 예고 확인
- [Leonxlnx/earshot — GitHub](https://github.com/Leonxlnx/earshot) — 2026-11-01 README 기준 기능, 모델 다운로드 조건과 라이선스 확인
- [Pexels, License](https://www.pexels.com/license/), [Unsplash, License](https://unsplash.com/license) — 2026-11-01 허용 범위와 금지 사항 확인
- [Mixkit, Sound Effects Free License](https://mixkit.co/license/modal/sfxFree/), [Mixkit, Stock Music Free License](https://mixkit.co/license/modal/musicFree/), [Mixkit, Stock Video Free License](https://mixkit.co/license/modal/videoFree/), [Mixkit, Stock Video Restricted License](https://mixkit.co/license/modal/videoRestricted/) — 2026-11-01 효과음, 음악과 영상 라이선스의 차이 확인

## 관련 문서

- [[Local-Speech-to-Text|로컬 음성 인식으로 영상 전사하기]] — Whisper 계열 엔진 비교, VAD와 환각
- [[Video-Transcript-Pipeline|영상 전사 파이프라인 구현]] — 자막 우선과 음성 인식 폴백
- [[Generative-Video-Editing#긴 영상의 하이라이트는 원문과 시간 구간을 연결한다|전사 기반 구간 선택]] — 원본 발화와 시간 구간을 잇는 검수
- [[Claude-Design-Handoff|AI 디자인 시스템과 구현 인계]] — HyperFrames와 Remotion의 렌더링 원리와 재현 조건
- [[Open-Source-License-Review|오픈소스 라이선스 검토]] — 도구와 모델의 라이선스 확인
- [[Social-Content-Scaling|소셜 콘텐츠의 고객 적합성과 성장 단계]] — 콘텐츠 제작량과 사업 단계
