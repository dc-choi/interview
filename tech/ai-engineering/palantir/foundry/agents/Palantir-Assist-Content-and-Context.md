---
tags: [palantir, aip-assist, rag, documentation, context]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["AIP Assist 문서 등록과 문맥"]
---

# AIP Assist의 문서 등록과 문맥

AIP Assist는 플랫폼 사용을 지원하는 대화형 도구다. Default는 platform/developer/custom source를 고르고, 전용 documentation mode와 custom chatbot을 선택할 수 있다. AIP enablement와 해당 기능의 enrollment availability를 확인한다.

## 등록, serving과 chatbot publish는 다른 단계다

Custom source는 권장 Notepad 또는 Code Repositories의 `documentation` repository다. Notepad는 project에 두고 content/title/description을 채워 Add to AIP Assist로 등록한다. 빈 문서는 등록할 수 없고 새 내용의 discoverability에는 시간이 걸린다. 해당 project의 organization marking과 기존 user/group permission도 필요하다.

Documentation repository는 enablement/allowlist가 필요할 수 있다. `docs` 아래 product folder에 `overview.md`의 `@name`/`@description`과 Markdown을 넣고 `_aip-assist.json`을 `aip-assist.json`으로 바꿔 product와 간결한 설명을 opt-in한다. Commit/check에서 documentation publish까지 확인한다. 원래 underscore file이 재생성돼도 다시 처리할 필요는 없다.

등록 성공은 ingestion과 Control Panel 발견을 뜻하며 아직 사용자의 응답에 쓰는 설정은 아니다. 관리자가 source를 추가하고 기본 해당 Notepad/repository에서만 시험한 뒤 Always 또는 By resource를 설정한다. Always는 default Assist의 공개 platform/developer 문서와 함께 검색한다. By resource는 현재 열어 둔 관련 resource에서 serve하는 조건이지 문서 자체의 data permission을 주는 기능이 아니다.

Custom-source chatbot은 선택한 source를 retrieval context로 구성하고 model/instruction을 정해 publish한 뒤 Usage의 AIP Assist를 켠다. 이후 설정 변경도 새 version publish가 필요하다. Chatbot 저장 위치 read와 backing source 접근, model 사용권이 모두 필요하다. Chatbot Studio의 다른 Ontology/function tool을 추가했다면 custom-doc-only 설명을 전체 도구의 데이터 경계로 확대하지 않는다.

## 변경 전파와 image 지원을 확인한다

문서 갱신은 검색 DB로 자동 전파된다. 갱신 요청과 전파 완료/응답 검증은 다른 시점이다. 확인일 FAQ는 public/custom documentation image를 표시하지만 Notepad image는 미지원으로 안내해 caption과 citation에서 원본을 열도록 했다. 문서에 이미지가 있다는 이유로 model이 내용을 모두 읽었다고 가정하지 않는다.

Heading/subheading마다 한 주제와 명확한 용어 정의를 두면 retrieval chunk가 한 질문의 근거를 담기 쉽다. Platform 공용 용어와 다른 업무 의미를 구분한다. 현행 안내는 정본 내용을 수정하고 오래된 문장 뒤의 override/deprecated 주석만으로 충돌을 해결하지 않는다. 감사상 과거 기록을 보존할 때는 current retrieval corpus와 역할을 분리하는 것이 설계 해석이다.

## Documentation-only 설명과 첨부 문맥은 구분한다

Overview와 best-practices는 data/metadata 미접근을 설명하지만 전용 integration 문서는 repository/file/선택 snippet과 referenced dataset/object metadata를 attachment로 제공한다고 명시한다. Issues 정보와 summary, Ontology 오류도 context가 된다. 미접근 문장을 모든 mode/integration의 보편 보장으로 사용하지 않고 현재 선택한 attachment/tool을 확인한다.

Workshop Send to Assist는 static/dynamic variable prompt와 default chatbot을, Slate `slate.askAIPAssist`는 선택 prompt를 전달한다. Carbon은 enablement와 전용 chatbot 구성이 먼저다. Contour expression과 repository code 설명은 생성/진단 보조이며 실제 수정/check/deployment를 자동 완성하지 않는다.

## 질문과 제안의 검토 경계

제품/오류/원하는 출력과 예시를 구체화하고 한 질문씩 후속 확인한다. 불명확한 지시나 모델의 설명을 서버의 실제 상태와 같다고 보지 않는다. Community suggested action은 대화 기반 title/body의 forum 초안을 열며 enrollment 관리자가 끌 수 있다. 초안 제안은 외부 공개 동의가 아니므로 confidential 내용과 최종 발송을 검토한다.

## 출처

- [Palantir, AIP Assist](https://www.palantir.com/docs/foundry/assist/overview)
- [Palantir, Serve custom content sources with AIP Assist](https://www.palantir.com/docs/foundry/assist/adding-documentation-to-aip-assist)
- [Palantir, Deploy AIP Chatbots to AIP Assist](https://www.palantir.com/docs/foundry/assist/agents-in-aip-assist)
- [Palantir, Custom content sources in AIP Assist](https://www.palantir.com/docs/foundry/assist/aip-assist-custom-docs-overview)
- [Palantir, Register custom content sources with AIP Assist](https://www.palantir.com/docs/foundry/assist/aip-assist-registering-content)
- [Palantir, Suggested actions in AIP Assist](https://www.palantir.com/docs/foundry/assist/aip-assist-suggested-actions)
- [Palantir, AIP Assist best practices](https://www.palantir.com/docs/foundry/assist/aip-best-practices)
- [Palantir, AIP Assist application integrations](https://www.palantir.com/docs/foundry/assist/application-integrations)
- [Palantir, Custom content source best practices](https://www.palantir.com/docs/foundry/assist/custom-documentation-best-practices)

## 관련 문서

- [[Palantir-Chatbot-Application-State|Chatbot 변수와 UI trigger]]
- [[Palantir-AI-FDE-and-Skills|개발 agent와 skill]]
- [[Palantir-AIP-Enablement-and-Responsible-Use|모델 데이터 접근 통제]]
