---
tags: [ai, llm, pricing, market, open-weights, prompt-caching]
status: done
verified_at: 2026-10-27
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM API Price Competition", "LLM API 가격 경쟁", "LLM 가격 인하", "API Price Cuts", "오픈 웨이트 가격 압력", "Kimi K3.1 Pro"]
---

# LLM API 가격 경쟁 — 인하의 형태, 워크로드별 효과와 오픈 웨이트 압력

모델 API의 가격 인하는 같은 모델의 정가 인하만 뜻하지 않는다. 한시 프로모션, 도입가의 정가 전환, 더 싼 후속 모델 출시와 캐시 읽기 단가만의 인하가 섞여 있고, 발표된 최대 인하율은 특정 모델의 특정 항목에서 나온 값이다. 이 문서는 인하의 형태를 나누고, 근접 성능의 오픈 웨이트 모델이 가격 기준선이 되는 구조를 사례로 정리한다. 2026-10-27에 OpenAI 가격표와 변경 이력, Anthropic 가격표와 Opus 5.5 발표, Moonshot AI의 가격표와 기술 블로그, Artificial Analysis 모델 페이지로 대조한 기준이다. 캐시 단가 변경이 청구액에 미치는 계산은 [[LLM-Prompt-Caching#단가 변경은 워크로드의 토큰 구성으로 환산한다|프롬프트 캐싱]]이 다룬다.

## 인하의 다섯 가지 형태

| 형태 | 사례(2026년, 100만 토큰당 입력, 캐시 입력, 출력) | 예산에서 확인할 것 |
|---|---|---|
| 같은 모델의 정가 인하 | 2026-07-30 GPT-5.6 Luna 80%, GPT-5.6 Terra 20% 인하. 확인일의 Luna는 $0.20, $0.02, $1.20 | 모델 ID를 바꾸지 않아도 적용되는지와 적용 시작일 |
| 한시 프로모션 | 2026-08-21 GPT-5.6 Sol을 $4, $0.40, $20으로 인하. 가격표는 적어도 2026-11-21까지 적용한다고 표시 | 종료일 뒤 단가로 예산을 잡는다 |
| 도입가의 정가 전환 | Claude Sonnet 5의 $2, $10은 2026-08-31까지의 도입가로 발표됐다가 정가가 됐고, 9월 1일 예정했던 $3, $15 인상은 취소됐다 | 발표 문구의 기한과 가격표 각주 |
| 더 싼 후속 모델 | Opus 5.5(2026-09-22) $4, $0.20, $20은 Opus 5의 $5, $0.50, $25보다 입출력 20%, 캐시 읽기 60% 낮다. GPT-6 Sol(2026-09-22) $2, $0.20, $10, GPT-6 Luna $0.10, $0.01, $0.50, GPT-6.1 Terra(2026-10-26) $1, $0.05, $5 | 모델 교체이므로 품질, 토큰 사용량과 동작 차이를 다시 평가한다. 이전 모델의 단가는 그대로다 |
| 캐시 읽기만 인하 | Fable 5.1(2026-09-01)은 입출력이 Fable 5와 같은 $10, $50이고 캐시 읽기만 $1에서 $0.25. GPT-6.1 Sol(2026-09-29)은 GPT-6 Sol과 입출력이 같고 캐시 입력만 $0.20에서 $0.10. Sonnet 5.5는 Sonnet 5와 입출력이 같고 캐시 읽기가 $0.20에서 $0.10 | 효과가 워크로드의 캐시 읽기 비중에 따라 없음에서 대부분까지 달라진다 |

헤드라인의 최대 80%는 GPT-5.6 Luna 한 모델의 정가 인하율이다. 같은 기간의 다른 변경은 인하 폭과 대상 항목이 모두 다르므로, 기사 제목의 인하율을 자기 청구액 변화로 옮기지 않는다.

## 같은 인하가 워크로드마다 다르게 닿는다

- **단발 요청**: 캐시를 거의 쓰지 않는 단발 채팅은 캐시 읽기만 내린 변경의 혜택이 없다.
- **에이전트 세션**: 멀티턴 에이전트는 매 턴 앞선 대화를 다시 보내므로 캐시 읽기가 입력의 대부분이 된다. Max Woolf(2026-10-25)는 에이전트 코딩에서 캐시 읽기가 토큰 지출의 96~99%라고 추정했지만 근거를 밝히지 않았다.
- **계산 예**: 캐시 읽기 15만, 캐시 쓰기 2천, 출력 500토큰인 에이전트 한 턴을 가정하면 Fable 5에서 5.1로 바꿀 때 턴 비용은 약 56% 줄고 같은 모델의 단발 채팅은 그대로다. Opus 5에서 5.5로 바꾸면 각각 50%, 20% 준다([[LLM-Prompt-Caching#단가 변경은 워크로드의 토큰 구성으로 환산한다|계산 표]]).
- **공급사 절감률의 조건**: Anthropic은 자체 시험에서 Opus 5.5가 기본 설정의 일반 워크로드에서 Opus 5보다 40% 적게 든다고 밝혔다. 단가 변화와 기본 설정에서의 토큰 사용량이 함께 반영된 공급사 수치이므로 자기 워크로드로 다시 잰다.

## 근접 성능 오픈 웨이트 모델이 기준선을 만든다

Moonshot AI가 2026-10-23 공개한 Kimi K3.1 Pro는 K3를 바탕으로 사후학습 연산을 크게 늘린 모델이며, 회사는 3T급 오픈 웨이트 모델이자 100만 토큰 컨텍스트라고 소개한다.

- **가격(공식 가격표)**: 입력 $2, 출력 $10, 캐시 입력 $0.20, 캐시 쓰기는 5분 $2, 1시간 $4다. 2~3배 빠르다고 소개한 Highspeed는 입력 $4, 출력 $20이고 캐시 입력은 같은 $0.20이다. 직전 K3는 $3, $15, $0.30이다.
- **제3자 지수**: 2026-10-27 Artificial Analysis(Intelligence Index v4.3.2)에서 55점으로 215개 모델 중 4위이고, 1위 Claude Opus 5.5는 58점이다. 같은 날 두 모델의 과업당 비용은 $2.11 대 $5.98, 지수 평가에서 생성한 출력 토큰은 1억 5천만 대 2억 6천만(비교 중앙값 8,700만), 캐시 적중, 입력, 출력을 7:2:1로 섞은 가중 단가는 $1.54 대 $2.94였다.
- **입출력 절반과 같은 캐시 단가**: 입출력 단가는 Opus 5.5의 절반이지만 캐시 입력은 둘 다 $0.20이다. 캐시 읽기가 대부분인 에이전트 턴에서는 단가 차이가 줄어 위 계산 예의 구성에서 약 22%에 그친다. 지수의 과업당 비용에는 생성 토큰 수 차이도 반영되므로 같은 토큰 수를 둔 단가 비교와 구분한다.
- **공급사 벤치마크의 조건**: 기술 블로그는 Terminal-Bench 4.0에서 65.7%(Claude Opus 5.5 66.4%, GPT-6 Astra 58.2%)를 보고한다. 각주에 따르면 K3.1 Pro의 코딩과 에이전트 결과는 대부분 Claude Code 하네스, effort max, temperature 1.0, top-p 0.95로 쟀고, 경쟁 모델 점수는 각 회사 블로그나 공식 리더보드에 보고된 최고값을 가져왔다. 같은 하네스로 다시 잰 비교가 아니다. 본문에 실린 BenchCAD(여러 시점의 렌더링을 보고 CAD 코드로 형상을 재구성, 1,000건 부분집합의 Voxel IoU)는 도구 사용 조건에서 92.7로 Opus 5.5 96.2, GPT-6 Astra 95.9보다 낮고 Fable 5.1 92.6과 비슷하다.
- **이미지로만 실린 표**: 나머지 비교표는 이미지라 본문으로 대조하지 못했다. 이를 옮긴 2차 자료(DataCamp)에는 SWE-Marathon v1.1 51.7(Opus 5.5 46.3, GPT-6 Astra 42.5)처럼 앞선 항목과 ProgramBench 31.5(Opus 5.5 65.0), Terminal-Bench Science 0.1 38.1(Opus 5.5 63.3)처럼 크게 뒤진 항목이 함께 있다. 발표 수치를 읽는 일반 조건은 [[Model-Release-Claims|모델 발표 수치 읽기]]를 따른다.
- **공급사가 강조한 쓰임**: 설명, 스케치와 참조 이미지로 3D 모델을 만들고 MCP 커넥터 없이 Blender와 CAD용 스크립트를 작성, 실행하는 파라메트릭 모델링, Unity, Unreal Engine, Godot 프로젝트 제작, 금융 문서 분석(OfficeQA Pro v2 64.4)이다. 내부 환각 스트레스 시험에서 도구 사용 시 주장 단위 환각률이 K3의 23.4%에서 8.3%로 줄었고 사실 오류가 하나 이상 든 응답의 비율은 K3의 42.4% 수준이었다. 오류를 일부러 유도한 어려운 프롬프트로 만든 시험이라 일상 사용의 오류율이 아니라고 회사도 적는다.
- **오픈 웨이트는 아직 약속이다**: 전체 가중치는 2026-11-04까지 공개 예정이고 라이선스는 발표에 없다. 확인일의 Artificial Analysis는 가중치가 공개되지 않은 모델로 표시한다. 오픈 웨이트 순위와 라이선스 판단은 가중치와 모델 카드가 나온 뒤 한다([[Open-Source-License-Review#오픈 웨이트 모델과 Open Source AI는 다르다|오픈 웨이트와 Open Source AI]]). 공개 전에 사이버 능력을 줄인 조치는 [[AI-Frontier-Regulation-Debate#오픈 웨이트와 허가 없는 검증|프론티어 AI 규제 논쟁]]에 정리했다.

## 인하의 원인으로 제시된 설명

확인된 사실과 해석을 나눠 둔다.

- **공급사가 밝힌 이유**: Anthropic은 Opus 5.5가 Opus 5보다 서빙에 연산이 덜 들고 가격이 이를 반영한다고 밝혔다.
- **해석(Max Woolf, 2026-10-25)**: 오픈 웨이트와 저가 모델(DeepSeek V4 Flash, Kimi K3.1 Pro)과의 경쟁, OpenRouter 같은 도구로 모델을 쉽게 바꾸는 낮은 전환 비용, 서빙 효율 개선과 두 회사의 맞대응을 원인으로 들었다. 두 회사의 상장 준비설과 추론 이익률에 대한 의문도 적었지만 근거가 보도와 추정이므로 이 문서는 사실로 쓰지 않는다.
- **해자 관점(이 문서의 판단)**: 같은 형식의 API로 호출하는 모델은 전환 비용이 낮아 단가로 고객을 붙잡기 어렵다. 가중치가 공개된 모델은 여러 추론 사업자가 함께 서빙할 수 있어 단가를 원가 쪽으로 끌어내리는 압력이 된다. 모델 밖에서 해자를 찾는 논의는 [[Distribution-As-Moat|도달력이 새 해자]]와 [[Data-Flywheel-Moat|데이터 플라이휠과 제품 해자]]를 따른다.

## 예산과 모델 교체 전에 확인할 것

1. 인하가 어느 형태인지와 기한을 적는다. 프로모션은 종료 뒤 단가로 예산을 잡는다.
2. 자기 워크로드의 입력, 캐시 쓰기, 캐시 읽기, 출력 비용 비중을 사용량 필드로 잰다.
3. 모델을 바꾸는 인하는 같은 작업의 과업당 비용과 품질로 비교한다. 토크나이저와 생성 토큰 수가 모델마다 다르다([[AI-Capability-and-Cost-Trends#모델 비교에서 속도와 비용의 측정 단위를 분리한다|단가와 과업당 비용]]).
4. 캐시 쓰기 단가와 수명도 비교한다. 확인일 기준 짧은 수명의 쓰기는 Anthropic(5분)과 OpenAI(30분)가 입력의 1.25배, Moonshot(5분)은 1배다.
5. 오픈 웨이트 약속은 가중치, 라이선스와 모델 카드가 실제로 나온 뒤 판단한다.

## 출처

- [OpenAI API Docs, Pricing](https://developers.openai.com/api/docs/pricing) — 2026-10-27 모델별 입력, 캐시 입력, 캐시 쓰기, 출력 단가와 GPT-5.6 Sol 프로모션 기한
- [OpenAI API Docs, Changelog](https://developers.openai.com/api/docs/changelog) — 2026-07-30 Luna, Terra 인하, 2026-08-21 GPT-5.6 Sol 인하, GPT-6 Sol과 Luna, GPT-6.1 Sol과 Terra 출시일
- [Anthropic Docs, Pricing](https://platform.claude.com/docs/en/about-claude/pricing) — 2026-10-27 모델별 단가, Sonnet 5 도입가의 정가 전환 각주, 토크나이저의 토큰 수 차이
- [Introducing Claude Opus 5.5 — Anthropic](https://www.anthropic.com/claude-opus-5-5) — 2026-09-22, 서빙 연산과 가격, 입출력과 캐시 읽기 인하율, 기본 설정의 40% 절감 주장
- [Kimi API Docs, Model Pricing](https://platform.kimi.ai/docs/pricing/chat) — 2026-10-27 K3.1 Pro, Highspeed, K3의 단가와 캐시 쓰기
- [Kimi K3.1 Pro Tech Blog: Advancing Open Intelligence — Moonshot AI](https://www.kimi.ai/blog/kimi-k3-1-pro) — 2026-10-23, 평가 각주, Terminal-Bench 4.0과 BenchCAD 수치, 강조한 쓰임, 환각 시험, 가중치 공개 일정
- [Kimi K3.1 Pro: Benchmarks, Pricing, and How to Access It — DataCamp](https://www.datacamp.com/blog/kimi-k3-1-pro) — 공식 블로그의 표 이미지 수치를 옮긴 2차 자료
- [Kimi K3.1 Pro Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/kimi-k3-1-pro) — 2026-10-27 열람, 지수, 과업당 비용, 생성 토큰, 가중 단가, 가중치 공개 표시
- [Claude Opus 5.5 (Max, Default Fallback) Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/claude-opus-5-5) — 2026-10-27 열람
- [OpenAI and Anthropic cut their LLM prices by up to 80% within a few months. Why? — Max Woolf's Blog](https://minimaxir.com/2026/10/cheap-llms/) — 2026-10-25, 인하 원인의 해석과 캐시 읽기 비중 추정. 단가와 날짜는 위 공식 자료로 대조
- [Introducing Kimi K3.1 Pro — Simon Willison](https://simonwillison.net/2026/Oct/23/kimi-k31-pro/) — 2026-10-23, Highspeed가 캐시 입력을 뺀 단가의 두 배라는 설명
- [OpenAI와 Anthropic은 몇 달 만에 LLM 가격을 최대 80% 내렸다. 왜일까? — GeekNews](https://news.hada.io/topic?id=36009) — 학습 계기
- [Kimi K3.1 Pro 공개 - 코딩과 3D 제작을 강화한 100만 토큰 컨텍스트의 3T급 모델 — GeekNews](https://news.hada.io/topic?id=35879) — 학습 계기

## 관련 문서

- [[LLM-Prompt-Caching|LLM 프롬프트 캐싱]] — 캐시 단가 변경의 워크로드별 환산
- [[AI-Capability-and-Cost-Trends|AI 능력과 비용 추세 읽기]] — 단가, 과업당 비용과 오픈웨이트 점유율
- [[Model-Release-Claims|모델 발표 수치 읽기]] — 공급사 벤치마크의 비교 대상과 측정 조건
- [[LLM-Model-Tiers|LLM 모델 티어 선택]] — 티어와 라우팅
- [[LLM-Market-Landscape|생성형 AI 시장 경쟁 구도]]
- [[AI-Frontier-Regulation-Debate|프론티어 AI 규제 논쟁]] — 공개 전 능력 감쇠
- [[LLM-Cost-Optimization|LLM 비용 최적화]]
