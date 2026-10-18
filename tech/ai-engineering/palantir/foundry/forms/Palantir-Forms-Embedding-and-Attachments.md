---
tags: [palantir, foundry, forms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Forms embedding, bulk edit와 attachment 저장

Slate의 Foundry Form/iframe과 legacy Object View section에 form을 넣을 수 있다. iframe은 embedded=true가 필요하며 noHeader,progressOnly,forceDarkMode는 표시 옵션이다. noHeader가 true면 progressOnly는 무시한다. field urlParam으로 prefill하고 object view에서는 static값 또는 현재 object property를 대응시킨다. Create linked object form의 last linked object는 sort property로 정의한다.

Object-backed bulk edit는 기본 꺼져 있고 Settings에서 켠다. 기본 한 번에 최대200objects이며 **form에 있는 모든 properties를 모든 선택 object에 덮어쓴다.** required field만 두고 validator로 누락을 막는 구성이 권장된다. 일부값 변경 UI라는 이유로 다른 field가 보존된다고 가정하지 않는다.

Attachment Default mode는 지정 folder에 standalone files를 올린다. Subfolder mode는 성공 제출 시 entry별 folder를 만들고 이름과 RID를 기록한다. RID를 받을 빈 text field를 선택하고 read-only/hidden으로 둔다. resubmit은 기록된 subfolder를 사용하지만 RID가 없으면 새 folder를 만들고 새 이름/RID를 field에 자동 저장하지 않는다. 중복 folder나 orphan tracking을 확인해야 한다. destination/upload mode는 update configuration transform으로 바꾸지 못하며 upload/publish folder 권한도 별도로 필요하다.

## 출처

- [Palantir, attachments-field](https://www.palantir.com/docs/foundry/forms/attachments-field)
- [Palantir, integrate](https://www.palantir.com/docs/foundry/forms/integrate)

## 관련 문서

- [[Palantir-Forms-Lifecycle-and-Permissions]]
