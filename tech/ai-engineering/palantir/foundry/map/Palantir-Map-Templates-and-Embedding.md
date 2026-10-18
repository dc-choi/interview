---
tags: [palantir, foundry, map]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Map template 입력, Workshop output과 저장 효과

일반 map을 Save as template으로 만들고 object parameter와 scalar parameter에 Search Around를 연결한다. layer는 상수 object 포함, 현재 object를 제외한 styling만 포함, 또는 제거를 고른다. overlay와 pinned series도 선택한다. URL objectRids 또는 objectSetRid는 preload 입력이지 권한 부여가 아니다.

Workshop Map widget은 Import map template과 variable mapping을 설정한다. Override map RID가 있으면 template 생성보다 기존 map을 표시하며 Refresh key 변경은 full reload다. scenario 입력과 scenario 수정 후 regenerate option을 구분한다.

## Output과 Action

Selected objects/All visible objects를 ObjectSet variable로 내보내고 선택 변경 event를 실행할 수 있다. Available actions를 일부만 고르고 추가 module variable default를 제공한다. 성공적인 Action 뒤의 event와 단순 selection change event는 다르다.

template embed에서 Save는 새 map resource를 만들고 기존 map embed에서는 그 map을 갱신한다. 새 map 생성 성공 뒤 On create new map event/Action에 Saved map RID를 전달한다. 이 Action은 form을 보이지 않으므로 모든 required parameter에 default가 필요하다. resource 저장 성공과 후속 Action 성공을 같은 원자적 사건으로 가정하지 않는다.

legacy의 하나의 mixed ObjectSet input은 non-object parameter가 없고 type당 object parameter가 1개인 template에만 작동해 권장되지 않는다. interface의 옛 Show series panel 설정은 Series panel deprecation 상태와 함께 확인한다.

Marketplace는 Map template을 지원하지만 Map Layers는 제외한다. product의 template이 package됐다고 overlay dependency까지 지원된다고 판단하지 않는다. Notepad Map embed는 문서당 4개 제한과 별도 parameter 계약을 따른다.

## 출처

- [Palantir, templates](https://www.palantir.com/docs/foundry/map/templates)
- [Palantir, widget](https://www.palantir.com/docs/foundry/map/widget)
- [Palantir, marketplace-map-templates](https://www.palantir.com/docs/foundry/map/marketplace-map-templates)

## 관련 문서

- [[Palantir-Map-Function-Contracts]]
- [[Palantir-Notepad-Analytics-Widgets]]
