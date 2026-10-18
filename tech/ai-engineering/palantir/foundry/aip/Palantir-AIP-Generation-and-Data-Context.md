---
tags: [palantir, aip, context, generation]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["AIP 생성 제안과 데이터 맥락"]
---

# 생성 제안과 데이터 맥락의 검토

AIP의 생성, 설정 제안과 실행은 별도 단계다. 2023년 Quiver/Pipeline Builder 도입 사례는 자연어 입력의 모호함과 model에 전달하는 context를 구체적으로 보여준다. 아래 한도는 그 시점의 설명이며 현재 모든 AIP 도구의 계약은 아니다.

## 모호함을 숨기지 않는 제안

Quiver AIP Generate는 분석 card graph를 만들고 Configure는 기존 card 설정을 바꾼다. 2023년 초기에는 object/object-set card에 한정됐고 사용자가 근거와 결과를 보고 accept/reject했다. 지원되지 않는 card까지 같은 방식으로 처리된다고 가정하지 않는다.

2023년 8월에는 configuration suggestion과 assumption을 요구한 suggestion을 구분했다. High value, important customer나 presentable 같은 표현은 객관적인 고정 기준이 아니므로 model이 정한 threshold와 표시 선택을 사용자에게 드러낸다. 설명이 붙었다는 사실만으로 business 정의가 맞아진 것은 아니다.

## 데이터 hint는 metadata-only와 다르다

Quiver는 관련 property에 대해 string 최대 100개 unique value, numeric min/max/average를 hint로 전달했다. 이는 존재하지 않는 값으로 filter해 빈 결과를 만드는 오류를 줄이지만 실제 데이터의 요약이 context에 들어간다는 뜻이다. 초기 documentation-only AIP Assist의 데이터 미접근 설명을 이 도구에 적용하지 않는다.

Pipeline Builder Explain, 이름/설명 제안, regex와 timestamp formatter는 이해/구성 보조다. 생성된 parsing logic은 실제 입력과 경계 사례로 확인한다. Sensitive Data Scanner의 AIP regex 생성도 pattern 정의를 돕는 기능이며 scan 실패/skipped와 no-match를 구분해야 한다. Queue 규모는 계산 시간의 예상 근거이지 결과의 완전성을 뜻하지 않는다.

## 기존 화면의 Action과 연결할 때

시계열 chart selection의 X/Y boundary를 Action parameter로 전달하면 annotation object 생성이나 운영 property 수정을 맥락 안에서 수행할 수 있다. 시각적 선택 범위의 단위와 timestamp, Action의 기본값과 권한을 맞춘다. 같은 chart에서 분석과 쓰기 작업을 수행해도 사용자 승인과 backend validation 계약은 유지된다.

Action notification의 all-recipient access 조건과 permissioned recipient만 보내는 설정은 다르다. 2023년 확장은 한 명의 권한 부족 때문에 모두 실패하는 경로를 조절하도록 했다. UI에서 recipient를 숨기는 것과 실제 data permission은 구분한다.

## 지원 surface와 version을 구분한다

2023년 10월 AIP는 Vega spec과 Workshop widget preview를 제안하고 Code Repositories의 오류 설명, code translation과 Python autocomplete를 제공했다. 각 surface의 지원 표시와 accept/apply 단계를 확인한다. Pipeline Builder Generate의 metadata 기반 설명을 실제 property value hint를 쓰는 Quiver에 확대하지 않는다.

2023년 12월 AIP Logic GA 당시 branching/evaluation/Logic Assistant는 roadmap이었다. 현재 기능 유무를 이 공지로 판단하지 않는다. 같은 달 Python transform/TypeScript Function의 LLM 호출과 Builder embedding board는 별도 developer permission을 요구했다. 당시 `text-embedding-ada-002` 예시를 현재 유일한 embedding model로 고정하지 않는다. Vector property의 dimension, similarity와 query/document embedding 호환성을 유지한다.

개발자가 unsupported input/output function을 Developer Console에서 선택할 수 있어도 SDK generation/CLI에서 실패할 수 있었다. Selection UI의 허용과 generated SDK의 타입 지원은 다른 단계다. Python SDK beta→GA, package generator version 선택과 OpenAPI export도 각각의 artifact와 지원 시점을 확인한다.

2024년 1월의 Workshop AIP Agent widget은 이후 2026년 4월 AIP Chatbot으로 이름이 바뀌었다. Tool, object type awareness와 application variable의 read/write를 따로 구성한다. Widget의 prompt가 있다는 사실만으로 모든 variable이나 Ontology resource를 읽는 것은 아니다. Code Workspace의 model import/binding도 prototype 추론 surface이며 운영 pipeline 배포와 구분한다.

2024년 2월 Automate의 수동 실행은 기존 Object Set에 effect를 적용하고 당시 최대 100,000객체와 batch 크기를 안내했다. Type은 설정한 condition의 Object Set과 맞아야 하며 신규 객체에 자동 실행을 멈추려면 Mute해야 했다. 기존 집합을 한 번 실행하는 요청과 이후 자동 trigger 활성화는 다른 상태다. AIP Logic edit를 즉시 적용하거나 검토용 stage로 남기는 선택도 유지한다.

2024년 3월 Single Completion block은 token overhead를 줄이지만 tool과 지정 return type을 제공하지 않는 경로였다. Object Set/array output, JSON/date/math Transform block과 같은 구조화 경로와 구분한다. UI debugger의 tool-call reset은 이미 발생한 외부 effect를 되돌린다는 의미가 아니다.

## 정형 출력, 오류와 context를 따로 검증한다

2024년 4월 Builder Use LLM은 분류, sentiment, summary, entity extraction과 translation template 및 row preview를 제공했다. 5월 output type 강제와 `Include errors`가 추가되면 결과 column은 원래 값과 error를 담은 struct가 된다. 원래 output이 struct여도 바깥 wrapper가 하나 더 생긴다. Context limit, output coercion 실패와 null/empty prompt는 정상 empty answer와 구분해 downstream에서 처리한다.

6월의 OpenAI preview/trial token count는 근사치이며 cached result는 새 token을 쓰지 않아 count가 없다. Cache를 재사용한 빠른 preview와 실제 full build의 비용/지연을 같다고 가정하지 않는다. TypeScript compiler의 반복 수정도 compile error 감소를 위한 것이며 업무 논리와 권한 검증을 대신하지 않는다.

AIP Accelerate의 Context Thread는 parent cell의 정보를 child에 전달하고 중간에서 분기해 여러 context 경로를 만든다. Dataset/media/local upload와 결과 dataset export의 출처, branch별 문맥을 관리한다. Assist custom documentation은 Documentation repository enablement/allowlist와 Control Panel의 always/by-resource 범위를 구성하는 경로다. 문서 corpus 등록과 사용자가 현재 data에 접근할 권한은 별도 계약이다.

2024년 4월 Logic의 deterministic Apply Action/Execute block은 LLM이 parameter를 선택하지 않아도 정확한 값으로 Action/Function을 실행하는 경로였다. Query Objects의 link traversal도 선택한 link/object 범위에서 설정한다. LLM을 쓰는 업무 안에서도 정확한 계산과 정해진 실행을 모든 단계에서 model에 맡길 필요는 없다.

2024년 9월 Use LLM/Text to Embeddings의 `Skip recomputing rows`는 input prompt에 전달한 column/parameter 값으로 이전 row를 비교하는 build cache다. Prompt/model 변경 시 cache clear를 고르며 output type이 같으면 이전 값을 유지할 수 있었다. 같은 column 값이라고 새로운 prompt의 결과인 것은 아니다. Preview cache와 이 기능을 구분하고 model/prompt 변경 후 재계산 정책을 정한다.

Image prompt는 media reference column과 vision 지원 model을 연결한다. Media Set을 table row로 바꾸는 과정과 해당 model/provider/geo availability를 함께 확인한다. Notepad custom docs도 existing user/group 권한과 always/by-resource scope를 유지한다. AIP Eval의 string/object/temporal/custom evaluator, aggregate/개별 결과는 nondeterminism을 드러내는 수단이며 한 번의 pass로 품질을 영구 보장하지 않는다.

2024년 Assist Agents는 custom source만 검색하는 선택된 mode였고 일반 Assist의 custom docs 추가는 platform documentation과 함께 쓰는 경로였다. Carbon에서 agent를 노출해도 사용자에게 agent 권한이 필요했다. Agent Studio(현재 Chatbot Studio)/Threads는 interactive ad-hoc 업무와 문서 맥락에 적합하고 반복 정형 처리에는 Logic/Automate를 구분했다. AIP Terminal profile 이전도 수동 transfer와 삭제 예고가 있었으며 Workshop widget은 영향이 없었다.

Assist code/repository attachment는 코드와 referenced dataset/object metadata를 context에 넣는다. 2023년 documentation-only 설명을 계속 적용할 수 없다. Cross-tab context 동기화와 mode 변경도 현재 대화가 쓰는 source를 검토할 이유다. UI의 Reasoning/detail panel은 제품이 노출한 설명과 tool 기록이며 모델 판단의 정확성 증명으로 취급하지 않는다.

2024년 11월 Builder raw trial trace는 initial prompt에 platform이 추가한 내용, 실패한 intermediate output, correction과 final output을 분리해 보여줬다. 최종 값만 보고 첫 요청이 그대로 처리됐다고 판단하지 않는다. 당시 TypeScript ChatCompletion function-interface BYOM은 Logic GA와 Builder/Studio beta가 달랐으며 현재 REST/Compute Module 등록 경로와 구분한다.

2025년 Assist multi-threaded chat은 mode/agent별 context를 바꾸며 당시 7일 history를 안내했다. 저장 대화는 장기 감사 보존과 다르다. Workshop Send to Assist event는 static/dynamic prompt와 default agent를 고르지만 agent의 custom source/사용자 권한 구성이 먼저 필요하다. Evals intermediate parameter는 block output을 드러내고 Project-scoped run results dataset은 후속 분석을 위한 별도 보존 자산이다.

2025년 3월 chatbot의 Function publish는 이름/version을 구성하고 Eval/Automate 및 다른 chatbot tool에서 소비하는 경로를 열었다. Interactive conversation과 Function 한 번의 입력/출력 계약을 나누고 agent-to-agent 호출의 권한, 비용과 종료 조건을 검토한다. Assist speech-to-text도 transcript를 input field에 넣은 뒤 보내는 단계이며 녹음만으로 prompt가 자동 실행되는 계약과 다르다.

Sentiment workflow는 polarity label, emotion category와 bounded numeric score 중 필요한 출력을 정하고 sarcasm/다국어/도메인별 사례로 평가한다. Builder Use LLM template와 row/subset preview, rate-limit/error 처리는 구성 경로다. LLM의 문맥 이해가 전통 모델보다 낫다는 벤더의 포괄적 소개를 각 데이터의 실측 우월성으로 채택하지 않는다. Financial/moderation 용도도 sentiment 점수 자체를 거래 판단이나 유해성 판정과 동일시하지 않는다.

## 출처

- [Palantir, July 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-07)
- [Palantir, August 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-08)
- [Palantir, September 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-09)
- [Palantir, October 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-10)
- [Palantir, November 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-11)
- [Palantir, December 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-12)
- [Palantir, January 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-01)
- [Palantir, February 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-02)
- [Palantir, March 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-03)
- [Palantir, April 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-04)
- [Palantir, May 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-05)
- [Palantir, June 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-06)
- [Palantir, July 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-07)
- [Palantir, September 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-09)
- [Palantir, October 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-10)
- [Palantir, November 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-11)
- [Palantir, December 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-12)
- [Palantir, January 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-01)
- [Palantir, February 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-02)
- [Palantir, March 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-03)
- [Palantir, Conduct sentiment analysis with AIP](https://www.palantir.com/docs/foundry/app-building/sentiment-analysis)

## 관련 문서

- [[Palantir-AIP-Enablement-and-Responsible-Use|현재 enablement와 책임 있는 사용]]
- [[Palantir-Action-External-Effects|Action과 notification]]
- [[Palantir-AIP-Analyst|분석 agent의 실행과 저장]]
