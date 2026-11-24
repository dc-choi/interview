---
tags: [palantir, foundry, boardroom]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-11-24
---

# Boardroom의 작업 모드와 재사용 지침

Chat은 director를 통해 Ontology 조회, 코드 실행, 파일 분석과 다른 생성 workflow를 시작한다.

## Meetings

2026-11-24 확인한 문서에서는 Panel 절이 빠지고 그 자리(`#panel` 앵커 유지)에 Meetings 절이 생겼다. Palantir가 변경 사실 자체를 공지한 것은 아니며, 두 판의 문서를 비교한 결과다. Panel은 live meeting에 voice/text로 참여해 director가 항목을 agent에 분배하고 종합 요약을 계속 갱신하는 모드로 설명됐다. Meetings는 회의를 녹음하면서 발화에서 바로 agent에게 일을 맡기는 흐름이다.

- 시작: sidebar나 home에서 Meetings를 열고, 화상회의 같은 다른 앱/탭의 소리도 받으려면 Include computer audio를 켠 뒤 Start recording을 누른다. Microphone 권한을 허용하고, computer audio를 켰다면 소리 공유가 켜진 source를 고른다. 녹음/전사 전에 관련된 모든 관할의 통지와 동의 요건을 확인하는 것은 사용 조직의 책임으로 명시돼 있다.
- 추출: 녹음 중 전사하면서 질문, 아이디어, 문제와 사람이 할 action item(due out)을 뽑는다. Assistant가 질문/아이디어/문제를 관련 agent에 배정하고, 그 agent가 조사해 답한다. 원문은 배정 대상으로 질문/아이디어/문제만 들고, due out은 human action item으로 부른다.
- 검토: 전사문에서 추출 항목과 연결된 구간이 강조되고, 강조 위에 올리면 오른쪽 패널에서 답변과 조사 내용을 보거나 View session으로 해당 agent 세션을 연다. Due outs 화면에서 action item을 보고 수정/삭제하며, 저장된 녹음은 전사문과 연결 항목과 함께 Meetings 목록에 남는다.
- 확장: Ontology action을 더 설정해 사용자 정의 객체를 추출하거나 회의 옆에 Workshop 앱을 띄울 수 있다.

자동 추출한 due out은 회의 기록의 후보다. 담당자와 기한을 사람이 확인하기 전에는 확정된 업무 지시로 보지 않는다.

## 생성 모드

Documents는 조사, 섹션 작성과 상호 검토를 조정하고 근거 객체/조사 결과를 인용한다. 작업 도중 사용자 편집을 유지한다고 문서가 설명하며 DOCX/PDF로 내보낸다. Slide decks는 Ontology 근거와 저장 template/업로드 PPTX의 형식을 사용한다. Plans는 제안 팀과 adversary 팀의 비판을 반복해 대안을 개선한다. Agent 간 합의를 외부 사실 검증으로 대신하지 않는다.

## Skill과 template

Skill은 언제 어떤 절차를 수행하는지, template은 산출물 구조와 형식을 정의한다. Skill description에 적용 상황과 검색 용어를 두고 상세 절차는 content에 둔다. Agent가 제안한 skill은 사용자가 검토/수정/승인한다. Key skill에 등록된 것 외에도 접근 가능한 skill을 검색해 로드할 수 있다.

Boardroom-scoped skill은 해당 팀의 보안을 상속하고 global skill은 별도 권한으로 Ontology 전반에 제공된다. 팀 전용 맥락을 global skill에 옮기기 전에 권한을 확인한다. 반복 보고서도 조사 skill의 사실/가설 구분과 누락 데이터 표시를 template의 보기 좋은 형식과 함께 유지한다.

## 출처

- [Palantir, modes](https://www.palantir.com/docs/foundry/boardroom/modes)
- [Palantir, skills-and-templates](https://www.palantir.com/docs/foundry/boardroom/skills-and-templates)

## 관련 문서

- [[Palantir-Foundry]]
