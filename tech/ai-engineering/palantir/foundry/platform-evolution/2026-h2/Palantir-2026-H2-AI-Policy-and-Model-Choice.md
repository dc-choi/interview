---
tags: [palantir, release-history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# AI 정책과 모델 선택

아래는 2026년 하반기 릴리스 당시 변경을 합성한 기록이다. 실제 enrollment 적용과 현재 지원 범위는 해당 기능 문서로 확인한다.

## 세션 기반 model access

2026-10-12의 marking allowlist는 prompt 데이터에 붙은 marking만 검사하지 않는다. 현재 Foundry session이 접근 가능한 mandatory marking 전체를 검사하며 하나라도 목록 밖이면 AI FDE를 포함한 AIP 요청을 거절한다. Marking 없는 session은 통과하며 scoped session으로 범위를 줄일 수 있다.

Palantir 제공 model family와 registered model에 적용하고, registered model의 개별 정책은 enrollment 정책을 대체할 수 있다. 정책이 반드시 교집합으로 좁아진다고 가정하지 않는다. 목적 제한, 최소화, 사람 감독과 retention을 구체적 platform control에 매핑하는 privacy 문서도 10월 확장됐다.

## 모델의 경로와 지역

10월15일 발표에서 GLM-5.3은 Bedrock의 non-georestricted/US commercial에서 experimental, Gemini 4 Argon은 Vertex의 non/US/EU commercial 및 US government IL2/4/5에서 experimental로 안내됐다. Haiku5.5는 여러 commercial provider와 Vertex government IL2/4 경로를 구분했다. GPT-6.1 Sol은 Direct/Bedrock의 non/US, Azure의 non-georestricted commercial 경로로 안내됐다.

10월6일 Opus5.5/Sonnet5의 UK-georestricted Bedrock, 10월1일 Fireworks의 US-georestricted KimiK3/GLM5.3/GLM5.3Flash/DeepSeekV4.1Flash가 추가됐다. 이는 발표 당시의 가용성 기록이다. 현재 모델 목록, model family 활성화, experimental 허용과 token 정책을 배포 전에 다시 확인한다. Model Catalog 설명/정렬도 모델 실행 가능성 자체를 보장하지 않는다.

## 상속되는 기본값과 agent 문맥

AIP Analyst는 새 analysis의 미설정 값에 primary Organization의 search scope/model category를 상속하고 사용자가 override할 수 있다. PDF watermark는 조직이 요구할 수 있다. Group skill은 회원에게 나타나고 관리자가 기본 enable을 정하지만 사용자는 toggle할 수 있다.

Fast/Balanced/Smart category의 기본 모델은 제품이 갱신한다. 개별 모델 override를 두면 그 자동 갱신을 받지 않는다. Compact view와 thinking detail 숨김은 표시 선택이며 도구 결과를 확장해 조사할 수 있다.

AI FDE는 Workflow Lineage URL의 graph context, clustered layout과 promoted skill tag를 지원한다. Workshop scenario enable/version 변경은 실제 enrollment 지원과 기존 scenario variable에 대해 검증한다. Python repository branch switch의 lockfile-only 자동 정리는 source/dependency 수정이 없을 때만 적용되고 실제 편집이 있으면 차단을 유지한다. Autopilot session usage는 LLM call/token을 표시하지만 전체 workflow 비용과 구분한다.

## 9월 agent 권한과 검증 전략

AI FDE의 waiting 표시와 session 이름/history/skill 선택은 사용자의 주의와 작업 상태를 보여 준다. 자동승인 project를 여러 category에 추가할 때 Tool approval configurations는 즉시 적용하고 Settings는 저장 전 draft로 남는다. Scope 선택과 backend 권한은 계속 별개다.

Project cover 편집은 기존 본문을 먼저 읽고 target과 Markdown preview로 승인한다. SQL worksheet는 Exploration의 Load가 기본 읽기 도구이며 Create/Update/Save 쓰기는 별도 추가한다. Agent-worker Data Connection debugging은 관련 agent log를 미리 싣고, lineage 도구는 Ontology/비Ontology provenance를 합쳐 하류를 찾는다.

Pro-code agent repository는 기존 저장소 load/edit를 지원했지만 신규 초기화는 당시 미지원이었다. Tag publish 전에 branch 연결을 맞추며, OSDK React repository도 Global Branching 사용 여부에 따라 global/local branch가 달라진다. Malformed patch와 stale file 오류를 구분해 재시도하고 truncated/깨진 행을 거부하는 Workspace 수정도 데이터 손실 방지 계약이다.

AIP Evolve는 목표/validation/허용 divergence/변경 종류/iteration 제한을 정하고 agent fleet이 만든 proposal과 증거를 사람이 검토해 merge한다. AIP/AI FDE 접근 외 Marketplace 설치와 target/test data 권한이 필요하다. 초기 고객의 비용/점수 개선 소개를 보편 실측 효과로 사용하지 않는다.

9월 model 출시는 Opus5.5 commercial/Vertex government IL2/4, Bedrock KimiK3 non/US, xAI Grok4.7 non/US, Direct/Azure GPT6 계열, Fireworks GLM/Kimi/DeepSeek non-georestricted 등 provider/지역 조합을 구분했다. Opus5 Bedrock IL2/4, GPT5.6 Azure IL2/4/5, Gemini3.8Flash Vertex non/US/EU/IL2/4/5도 추가됐다. 이후10월 확대를 소급 적용하지 않는다. Grok Extra High는 model이 지원한다고 광고하는 경우만 선택한다.

SDS LLM match condition은 content/column name을 AND 또는 OR로 결합하고 예/반례로 경계를 설명한다. Vision model의 이미지 판정과 text model의 문서 추출 텍스트 판정은 다르다. 불확실한 분류를 민감정보 부재 보장으로 해석하지 않는다.

## 8월 agent 도구와 media의 생명주기

AI FDE Automate 도구는 시간/object-set condition,user/project scope,Action/Logic/notification effect,branch/pause/expiry/retry/fallback과 downstream 대기를 지원했다. 당시 time-series/stream/dataset/metric 조건,standalone dependency,legacy event,Function/Agent effect,기존 automation에 effect 추가,run-history/manual-trigger/telemetry는 미지원이었다. 도구 가용성을 Automate 제품 전체 능력과 동일시하지 않는다.

AIP Analyst analysis lookup은 이전 도구/자원을 template으로 읽고 live 결과를 가져오지 않으므로 도구를 다시 실행해 현재 데이터를 얻는다. Skill 생성/수정과 Notepad/Quiver/Contour export도 실제 자원을 바꾸는 단계다. Interface/multi-scope object set과 time-series 지원에도 downstream 미지원 경고를 확인한다.

Media functions GA는TSv1/v2/Python의 읽기/업로드/참조 편집을 제공하지만 upload한 media는 Ontology media property에 편집이 적용되기 전 temporary다. V1 MediaItem과 V2/Python Media는 API가 다르다. Beta transform은 SDK polling helper를 사용하고 dense-page OCR은 기본 function timeout을 넘을 수 있다.

LLM model announcement는8월 Gemma4 31B Bedrock 제공/26B 예정,Gemini3.7Flash Vertex non/US/EU/IL2/4/5,Grok4.6 xAI non/US와 additional Bedrock open models의 non/US/EU/UK/JP commercial 경로를 구분했다. Gemini 안내의 시작 절차에 xAI family 활성화가 섞여 있어 설정 근거로 복사하지 않고 해당 model의 현재 상세 문서와 대조한다.

AIP Evolve는8월 beta에서9월 GA로 바뀌었다. ROUGE evaluator와 test-case/iteration별 세로 results table은 판정 도구이며 lexical overlap 점수가 업무 사실성 보장은 아니다. Reasoning selector/terminal stderr redirect 분류/Pilot model deep link는 설정 선택을 개선해도 backend 권한과 자동 승인 범위를 넓히는 근거가 되지 않는다.

## 7월 실행 주체와 품질 비교

Pro-code agent는 OSDK/OMCP/Palantir MCP에 scoped permission으로 인증하고 Ontology binding/API name으로 publish한다. Claude/OpenAI/Google template과 Continue가 설정을 단순화해도 임의 data/tool 접근 권한을 주는 것은 아니다.

Document Intelligence extraction은 per-page Python 함수로 deploy하고 Automate/Action으로 event-driven workflow를 구성할 수 있다. Chunk size/overlap/embedding model은 retrieval 의미와 비용에 영향을 준다. Model/Evals media-reference 입력도 실제 media 권한을 요구한다.

Model evaluation은 ModelInput으로 읽은 정확한 model version에 결과를 남긴다. 같은 evaluation set은 같은 방법론을 공유해야 버전 간 metric을 비교할 수 있다. Modeling Objective 없이 사용할 수 있고 당시 palantir_models0.2384.0 이상을 요구했다. Drift monitor/AI FDE 개선 계획을 이미 제공되는 보장으로 쓰지 않는다.

Saved Analyst analysis는 재열 때 tool과 응답을 현재 Ontology 및 viewer 권한으로 다시 실행한다. 역사적 결과의 고정 snapshot이 아니다. Enrollment admin이 saving을 끄면 생성/열기도 제한된다.

Realtime audio OSDK는 browser WebSocket으로 현재 Foundry user의 권한 아래 model과 Ontology function/Action을 연결한다. 당시 realtime/transcription model 목록은 경로별 지원과 구분한다. User rate limit은 interactive 귀속을 다루고 default/per-model/group override를 구성한다. 한도가 실제 capacity 예약 보장은 아니다.

7월 Sonnet5,Opus5,Gemini3.6Flash/3.5FlashLite,Grok4.5,GPT5.6 계열은 provider와 commercial/government/geo 조합별로 추가됐다. Marketing 성능/가격과 context metadata를 use-case benchmark로 대체하지 않는다. AI FDE trace debugging/history search/lineage graph는 관측 context이며 전체 dependency 검증을 보장하지 않는다.

AI FDE cat/sed 자동 실행 분류는 해당 제품의 approval policy다. sed는 sandbox flag와 unsafe option 검사가 있으며 이 문서를 읽는 별도 agent의 실행 권한으로 전이되지 않는다.

## 출처

- [Palantir Foundry, Release notes 2026](https://www.palantir.com/docs/foundry/announcements/release-notes/2026/)

## 관련 문서

- [[Palantir-2026-H2-Platform-Evolution]]
