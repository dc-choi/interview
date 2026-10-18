---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 모델 출시 기록을 읽는 방법

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## Provider, region과 lifecycle을 따로 기록하기

아래는 2026년 2~6월 공지 당시의 제공 이력이다. 현재 추천/가격/region 정본을 대신하지 않는다. provider별 family enablement가 선행 조건이며 같은 이름의 모델을 다른 provider로 사용할 수 있다고 모든 지역/컴플라이언스 경로가 같아지는 것은 아니다.

| 시점 | 공지의 핵심 조건 |
|---|---|
| 2월 | GPT-5.2 Codex Direct OpenAI non-geo, Claude 4.5 Sonnet/Haiku Japan Bedrock, Opus 4.6와 Sonnet 4.6 provider 확대, Gemini 3.1 Pro Vertex commercial non-geo |
| 3월 | GPT-5.3 Codex Direct non-geo, GPT-5.4 OpenAI/Azure non-geo, 5.4 mini/nano Direct non-geo, Gemini 3.1 Flash-Lite Vertex |
| 4월 | Grok 4.20 reasoning/non-reasoning xAI, Nemotron 3 Super/Nano Bedrock, GPT-5.1 Azure IL2/4/5, Opus 4.7 provider 확대 |
| 5월 | GPT-5.5 Azure US/EU geo 및 non-geo, OpenAI US geo 및 non-geo, Direct Anthropic Opus 4.7/4.6와 Sonnet 4.6 US geo, Vertex Gemini/Claude IL2/4, Grok 4.3, Gemini 3.5 Flash |
| 6월 | Opus 4.8 provider/region 확대, Grok Build 0.1, Azure Anthropic family commercial non-geo, Vertex Gemini IL5 |

- Nemotron Super 120B는 non-geo와 US/EU/UK/JP geo, Nano 30B는 non-geo와 US geo로 범위가 달랐다.
- Gemini 3.1 Pro는 Google Cloud preview지만 AIP 안에서는 GA 특성으로 제공한다고 명시했다. 공급자 lifecycle과 Palantir lifecycle이 다르다.
- GPT-5.4 초기 공지의 context는 200k, mini/nano는 400k, GPT-5.5는 1.05M으로 서로 다르게 적혔다. 모델군 이름으로 공통 한도를 추정하지 않는다.
- Claude Sonnet 4.6/Opus 4.6/4.7/4.8 일부 문장은 US/EU non-georestricted와 georestricted 표기가 혼재한다. 해당 provider/region 지원을 상충 없는 정본 matrix로 다시 확인해야 한다.
- 5월 Gemini IL2/4에는 frontier와 legacy 목록을 분리했고 6월 IL5는 Gemini 3.5/3.1/3 및 2.5 계열을 구분했다.
- provider를 추가하면 capacity와 장애 시 routing 선택지가 늘 수 있지만 모든 provider 장애를 피하거나 모델 품질을 보장하는 조건은 아니다.

모델 변경 전 같은 test case/evaluator로 품질/비용/지연을 비교하고 model ID, provider, region, reasoning과 tool mode를 고정한다. Workflow Lineage의 Logic model 일괄 교체 GA는 다른 resource type까지 자동 교체하는 기능이 아니었다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [May 12, 2026, Additional Gemini and Claude models are now available on IL2 and IL4 enrollments via Google Vertex — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#83abc7db-f236-49ff-804a-b822fe568515)
- [June 25, 2026, Anthropic models available through Azure in AIP — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#e5930642-4b17-484e-84ba-d98433126bad)
- [June 30, 2026, Google Vertex now available for IL5 enrollments — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#e8bb610b-bd32-4c36-b8d1-20443a0f85ea)
- [February 5, 2026, Claude Sonnet 4.5, Claude Haiku 4.5 now available in Japan region — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#45492ab6-8070-4b6d-a12a-ef0765dae30c)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
