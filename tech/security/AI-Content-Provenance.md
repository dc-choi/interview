---
tags: [security, ai, provenance, watermark, c2pa, biosecurity]
status: done
verified_at: 2026-11-01
category: "보안(Security)"
aliases: ["AI 콘텐츠 출처 증명", "AI Content Provenance", "텍스트 워터마크", "SynthID Bio", "단백질 설계 워터마크"]
---

# AI 콘텐츠의 워터마크와 출처 증명

AI 처리 흔적을 판단할 때는 텍스트의 통계적 신호, 파일의 서명된 출처 정보, 일반 탐지기의 문체 추정을 구분한다. 어느 하나의 검출 결과만으로 작성자, 사실성이나 전체 제작 과정을 확정할 수 없다.

## 서로 다른 신호

| 구분 | 검사하는 대상 | 해석의 한계 |
|---|---|---|
| 통계적 텍스트 워터마크 | 생성 과정의 단어 선택에 남긴 패턴 | 충분한 표본과 해당 방식의 검출 조건이 필요하며 AI 관여 가능성을 판단한다 |
| Content Credentials (C2PA) | 콘텐츠에 연결된 서명된 출처 정보 | 서명과 콘텐츠의 연결을 확인하며 내용 자체의 진실성을 보증하지 않는다 |
| 일반 AI 텍스트 탐지 | 문체 등 텍스트의 특징 | 특정 제공자의 워터마크 키로 검증하는 검사와 다르다 |
| 숨은 문자 검사 | Unicode 문자와 제어 문자 | 문자 존재만으로 특정 모델의 통계적 워터마크를 입증하지 못한다 |
| 이미지와 오디오 워터마크 | 이미지나 오디오 신호 자체에 넣은 패턴 | 해당 제공자의 검출 수단으로 확인하며 일부 변환을 견딜 수 있지만 모든 AI 생성물을 식별하지 않는다 |
| 생물 서열과 구조 워터마크 | AI가 설계한 단백질 서열의 아미노산 선택과 예측 구조의 원자 좌표 | 워터마크의 유무만 표시해 설계자를 구분하지 않으며, 서열 재설계나 구조 완화 같은 가공에 지워질 수 있다 |

### 텍스트 워터마크는 숨은 글자와 다르다

Claude의 공개 설명은 SynthID-Text 계열 방식을 사용한다. 의미상 선택 여지가 있는 단어를 고를 때 키와 앞선 문맥을 이용해 난수 선택을 구성한다. 문장 뒤에 숨은 문자를 덧붙이는 방식이 아니다. 따라서 숨은 문자 제거와 통계적 워터마크 검사는 별개다.

짧은 글이나 정답이 고정된 표현은 검출에 필요한 선택이 적다. 교정한 글은 수정된 단어에만 신호가 생길 수 있다. 검출은 Claude의 관여 가능성을 나타내며, 최초 작성자나 다른 AI의 사용 여부를 확정하지 않는다.

## 파일의 출처 정보와 내용의 사실성

C2PA Content Credentials는 출처 정보의 서명과 변조 여부, 해당 콘텐츠와의 연결을 검증할 수 있게 한다. 유효한 서명이 있다고 해서 사진 속 사건이나 글의 주장이 사실이라는 뜻은 아니다.

파일 변환이나 재저장 과정에서 메타데이터가 사라질 수 있다. C2PA는 워터마크나 지문 같은 soft binding으로 외부에 보관한 출처 정보를 다시 찾는 방식도 설명한다. 메타데이터가 없다는 사실을 전체 출처 정보의 부재나 사람이 만든 콘텐츠라는 증거로 해석하지 않는다.

Claude의 파일 표시는 지원되는 파일 형식과 제품 기능에 따라 적용된다. 텍스트 워터마크 지원과 C2PA 지원도 모델별로 다를 수 있으므로, 모든 과거 모델과 모든 파일에 같은 표시가 붙는다고 일반화하지 않는다.

### OpenAI의 출처 확인 API는 이미지와 오디오가 중심이다

2026-10-21 OpenAI 개발자 문서의 Content provenance 가이드를 대조했다. API를 실제로 호출해 시험하지는 않았다.

- Content Provenance API는 업로드한 이미지와 오디오에서 OpenAI 출처 신호를 찾는다. C2PA Content Credentials는 이미지에만, SynthID는 이미지와 오디오에 적용하며, 해당하지 않는 검사는 `not_detected`로 돌려주지 않고 결과에서 뺀다. SynthID 워터마크는 이미지나 오디오 자체에 들어가 일부 변환을 견딜 수 있지만, 이 API는 범용 AI 탐지기가 아니다.
- C2PA 결과는 manifest 상태(`trusted`, `valid`, `invalid`, `not_present`)와 함께 읽는다. `detected`는 `trusted`나 `valid` manifest가 OpenAI를 발급자로 확인하고 AI 생성 action을 담을 때만 나온다. 제3자 manifest, AI 생성 action이 없는 manifest, `invalid`와 `not_present`는 모두 `not_detected`이며 `invalid` manifest는 출처 증거로 쓰지 않는다.
- `not_detected`는 지원 신호를 찾지 못했다는 뜻일 뿐, 사람이 만들었거나 OpenAI로 만들지 않았다는 증거가 아니다. 메타데이터가 지워졌거나 변조 흔적이 있는 경우, 워터마크가 손상된 경우, 예전 생성 모델이나 출처 신호 도입 전에 만든 경우에도 검출되지 않을 수 있다. 다른 회사 모델의 생성물은 현재 검출하지 않는다.
- 텍스트 검증은 AI 연구와 학술 기관을 포함한 승인된 조직에만 사례별 심사로 열려 있다. 이 API로 임의 텍스트의 OpenAI 생성 여부를 누구나 판정할 수 있다고 가정하지 않는다.
- 업로드는 요청당 파일 하나, 50 MiB 이하이며 오디오는 디코딩 후 60초 이하다.

## 생물학적 설계의 워터마크는 서열과 구조에 들어간다

2026-09-30 Google DeepMind가 공개한 SynthID Bio는 AI가 설계한 단백질 서열과 예측 구조에 출처 신호를 넣는 방법 모음이다. 검사 대상이 파일의 메타데이터가 아니라 서열과 좌표 자체다. 두 방식의 확인 지점은 다르다. 공식 블로그는 서열 워터마크를 디지털 모델뿐 아니라 합성된 실제 단백질에서도 확인할 수 있게 하는 것을 목표로 들고, 구조 워터마크는 예측 구조의 원자 좌표라는 디지털 산출물에 적용된다.

- 서열 워터마크는 텍스트 워터마크와 같은 원리를 쓴다. SynthID-Text의 tournament sampling을 단백질 설계 모델 ProteinMPNN의 샘플링 분포에 적용해, 비밀 키와 앞선 H-gram 문맥에서 끌어낸 난수 씨드로 아미노산 선택을 치우치게 한다. 차이는 생물학적 기능을 유지해야 한다는 제약과, 검출 대상이 파일이 아니라 서열이라는 점이다.
- 구조 워터마크는 AlphaFold 3의 diffusion 모듈과 confidence 모듈을 미세 조정해 예측 좌표에 신호를 남기고, 잔기 내 원자 간 거리와 torsion 각을 계산하는 탐지기를 함께 학습한다. 논문은 워터마킹 수단을 모델 가중치에 직접 넣는 방식이라 가중치가 공개된 뒤에는 그 가중치에서 워터마킹을 떼어낼 수 없다고 적는다. 따라서 워터마크를 넣은 가중치를 그대로 실행하는 한 누가 돌리든 예측 좌표에 신호가 남는다. 공식 블로그는 의도적 조작에 대한 강건성을 더 높이는 일을 남은 핵심 과제로 든다.
- 기능 보존은 세 표적(SARS-CoV-2 spike RBD, VEGF-A, PD-L1)의 결합 단백질 설계로 확인했다. 블로그는 적중률, 결합 친화도와 서열 다양성이 워터마크 없는 설계와 대등했다고 적는다. 논문은 Carterra LSA XT 장비의 SPR로 결합 동역학을 측정했고 KD 10⁻⁷ M 이하 기준 적중률에 유의한 차이가 없었다고 보고한다. 다만 KD 10⁻⁶ M 이하 기준에서는 샘플링 온도 0.5의 non-distortionary 설정과 온도 0.1로 만든 워터마크 없는 설계 사이에 유의한 차이가 있었고 워터마크 없는 쪽의 적중률이 더 높았다. 논문은 두 워터마크 설정(non-distortionary 0.5와 distortionary 0.1)을 높은 샘플링 온도와 강한 워터마크가 결합 친화도에 주는 영향을 평가하려고 골랐다고 적는다. 유의한 차이가 난 쌍은 샘플링 온도도 달라 이 차이를 워터마크만의 효과로 읽지 않는다.
- 구조 워터마크의 검출률은 표적별 수치가 아니라 미세 조정 설정별 수치다. 학습 시 좌표 노이즈 진폭 s를 0.001, 0.01, 0.1 Å로 달리한 세 모델 모두 거짓 양성률 0.1%에서 참 양성률 99.8%를 넘었고, 거짓 양성률 0.01%에서는 s = 0.001 모델이 98.99%였다.
- 의도한 용도는 DNA 합성 주문 선별의 자동 확인 신호와 PDB, UniProt, GenBank 같은 공개 데이터베이스의 출처 표시다. 논문은 같은 용도를 핵산 합성 선별이라는 표현으로 적는다.

논문이 밝힌 한계도 함께 읽는다. 두 방식 모두 워터마크의 유무만 담는 zero-bit 방식이라 그 이상의 정보를 실어 보내지 못한다. 서열 워터마크는 ProteinMPNN으로 서열을 다시 설계하면 대부분 지워지고 샘플링 시점에 적용되므로 사용자가 끌 수 있으며, 구조 워터마크는 강건성 평가에서 구조 완화(OpenMM과 Amber99sb force field)를 견디지 못했다. 논문은 워터마크와 무관하게 기존 유사도 기반 선별을 함께 수행하는 층상 접근을 전제로, 절대적인 보안을 보장하기보다 진입 장벽을 높이는 것이 목적이라고 적고, 운영에는 산업 전반의 조정과 표준화가 더 필요하다고 덧붙인다. 공식 블로그도 생물보안에 만능 해법인 단일 개입은 없다고 적고 이 방식을 여러 층을 겹치는 방어의 한 층으로 설명한다.

2026-11-01 공식 블로그와 Nature가 open access로 공개한 논문 본문을 대조했다. 논문에서는 구조 정확도와 검출성 결과 절, 결합 실험 절, 한계 서술, Methods의 워터마킹 목표와 탐지기 설명, 그림 1 캡션을 확인했다. 보충 자료의 치환 공격 결과는 확인하지 않았고, 워터마크 삽입과 검출을 직접 실행하거나 재현하지 않았다. 발표 이후 바뀐 배포 범위와 접근 조건도 확인하지 않았다.

## 제거 도구의 성공과 탐지 결과를 분리한다

`watermarks-remover`의 README는 Unicode 제거 수와 메타데이터 처리 결과를 검증 가능한 작업으로 구분하고, 통계적 텍스트 재작성은 최선 노력 방식으로 설명한다. 제공자 탐지기가 실패한다고 보증하지 않는다. 도구 소개의 탐지 회피 주장을 검증된 성능으로 옮기지 않는다.

운영 제안으로는 원본과 편집본, 실제로 사용한 생성 도구, 파일 변환 이력을 보존하고 검사 결과에는 대상 형식과 검출 수단을 함께 적는다. 글의 정확성은 출처 대조로 별도 확인한다. 탐지 신호의 유무만으로 작성자를 판정하거나 제출 책임을 대신하지 않는다.

2026-10-20 공식 설명과 C2PA 2.2 Explainer, 도구 README를 대조했다. 실제 파일 생성, 워터마크 검출과 제거 성능은 시험하지 않았다. 법적 표시 의무의 대상과 예외는 이 문서의 검증 범위에 포함하지 않는다.

## 출처

- [How Claude’s text watermark works — Anthropic](https://www.anthropic.com/news/claude-text-watermark)
- [Anthropic, How Claude marks AI-generated content](https://support.claude.com/en/articles/16266773-how-claude-marks-ai-generated-content)
- [C2PA, Content Credentials Explainer 2.2](https://spec.c2pa.org/specifications/specifications/2.2/explainer/Explainer.html)
- [OpenAI API, Content provenance](https://developers.openai.com/api/docs/guides/content-provenance) — 2026-10-21 이미지와 오디오 검사 범위, 결과 해석, 텍스트 검증 접근과 업로드 제한
- [Introducing SynthID Bio — Google DeepMind](https://deepmind.google/blog/introducing-synthid-bio/)
- [Function-preserving watermarking of AI-generated proteins — Nature](https://www.nature.com/articles/s41586-026-10965-y)
- [watermarks-remover — GitHub, guillaumemeyer](https://github.com/guillaumemeyer/watermarks-remover)

## 관련 문서

- [[AI-Creative-Service-Delivery#후처리와 생성의 경계를 증명할 자료를 남긴다|후처리와 생성의 경계]] — 제출 규칙과 처리 내역의 증빙

- [[LLM-Application-Security|LLM 애플리케이션 보안]]
- [[Web-Content-Manipulation-for-AI|AI가 읽는 웹 콘텐츠의 조작]] — 생성한 통계의 인용 세탁과 출처 확인
- [[Forensic-Watermarking|포렌식 워터마킹과 콘텐츠 유출 추적]] — 식별값을 실어 배포 경로를 추적하는 방식과 유무만 담는 zero-bit 방식의 대비
- [[Generative-Video-Editing|생성형 영상 편집과 결과 검증]]
- [[Resume-Experience-Narrative-and-Evidence|이력서 경험 서술과 증거 설계]]
