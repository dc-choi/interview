---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 LLM 제공 경로, 용량과 가용성의 의미

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## 모델 이름보다 먼저 볼 조건

2025년 모델 공지는 과거 제공 이력이다. 당시 가격, context window와 지원 지역을 현재 값으로 사용하지 않는다. provider 활성화, 계약 addendum, 지리 제한과 enrollment 용량은 별개의 조건이다.

- 1월 Grok-2/vision은 비제한 및 US geo enrollment에 발표됐고 AIP addendum와 xAI 사용 활성화가 필요했다. Gemini 1.5 Flash/Pro는 Vertex AI와 model family 활성화 경로였으며 당시 context는 각각 1M/2M으로 소개됐다.
- 3월 공지는 Claude 3.7 Sonnet, 3.5 Haiku/Sonnet v2, Gemini 2.0 Flash, o1-preview/mini, Llama 3.3 70B를 구분했다. 기본 비제한 제공과 geo별 matrix가 달랐다. 예를 들어 그 표에서 Gemini 2.0 Flash와 o1 계열은 US/EU, Claude 3.7과 Haiku는 US였다.
- 8월에는 Gemini 2.5 Pro/Flash/Lite와 Grok-4, GPT-5/mini/nano, Opus 4.1 등이 순차 소개됐다. model family 승인과 provider 경로를 따라 확인해야 한다.
- 10월 Sonnet 4.5와 Haiku 4.5는 Direct Anthropic, Bedrock, Vertex 등 제공 경로가 명시됐다. 같은 모델 이름이라도 모든 경로와 지역이 같다는 뜻은 아니다.
- 11월 Direct OpenAI의 US geo 제공은 Azure 경로와 별개다. GPT-4.1의 Azure IL2/4/5 지원 발표와 일반 commercial 지원을 섞지 않는다.
- 12월 GPT-5.1 및 Codex 5/5.1/mini, Opus 4.5, Grok 4.1 fast reasoning/non-reasoning 공지가 이어졌다. 비제한, Direct/Azure/provider, context와 reasoning mode를 각각 확인한다. 당시 발표를 현재 추천 모델 목록으로 사용하지 않는다.

## 용량을 읽는 단위

- 2월 28일 Model Selector GA 공지는 3월 3일 주 제공을 알렸다. class, cost, speed와 availability는 상대적 선택 지표다. availability는 TPM/RPM enrollment limit에 기반하며 응답 품질이나 무중단을 보장하지 않는다.
- 3월 Workflow usage에서 attempted/successful/rate-limited와 request/token을 분리했다. Logic node는 당시 debugger 사용량만 표시하고 Workshop, Automate와 OSDK의 실제 사용량은 해당 호출 위치에 표시했다.
- 4월 usage 화면은 모델/Project/resource별 분 단위 지표와 2주 범위를 제공했다. 6시간 미만 구간에서 Project/resource segmentation을 사용한다. batch는 Project/enrollment 용량의 최대 80%로 제한해 interactive 여유를 남기는 정책이 소개됐다.
- 5월 reserved capacity는 추가 TPM/RPM을 Project 비율로 배분하고 소진 뒤 shared limit로 fallback하는 구조였다. Resource Management administrator가 allocation을 요청/배정한다. 장문의 무중단 홍보 표현과 별도로 **provider/model availability는 보장하지 않는 조건**이 있다.
- 7월 model-family 사용은 Project의 모든 Organization에서 허용돼야 했다. model family는 단순 UI 그룹이 아니라 법적/컴플라이언스 승인 범위다.
- 8월 Project별 모델 제한 override는 기본 0으로 allowlist를 만들거나 특정 모델을 0으로 차단할 수 있다. 지정 Project와 미지정 Project 기본값을 구분하며 provider 승인 권한까지 부여하지 않는다.

## 판단에 적용

모델 후보는 같은 입력과 evaluator로 비교하고, provider/region/모델 ID, 요청 및 token 제한, batch 여부를 기록한다. BYOM/registered model은 법적 조건과 custom model 필요에 대응하는 별도 경로이며 공급자가 권한 모델을 대체하지 않는다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [March 13, 2025, Introducing new LLMs to AIP in March 2025 — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#f6fc6660-6572-4381-bb08-9547fd6c9e51)
- [February 28, 2025, Choose the best model for your workflow with AIP Model Selector [GA] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#f3a78b42-62ce-4f37-b280-10d22481e391)
- [June 3, 2025, Streamline vision LLM-based PDF extraction with new transform input types — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#f77d1c79-455d-48c5-909a-10169546fa2c)
- [November 6, 2025, Ontology and AIP Observability: Tracing-backed telemetry is now available — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#46b9df7d-b0c8-450a-a65a-e90e2c1692f9)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
