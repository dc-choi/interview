---
tags: [web, frontend, react, effect, ref, custom-hook]
status: index
category: "웹&네트워크(Web&Network)"
aliases: ["React Effects", "React 외부 동기화와 ref"]
---

# React 외부 동기화와 ref

render 계산과 event 처리로 해결할 수 없는 외부 시스템 연결을 다룬다. 먼저 동기화 필요성을 판단하고, 자원 수명과 의존성을 정한 뒤 반복되는 로직을 Hook으로 추출한다.

- [[React-Effects-and-Custom-Hooks|Effect와 외부 시스템 동기화]] — setup/cleanup, 생명주기, race condition과 불필요한 Effect 제거
- [[React-Effect-Dependencies-and-Events|의존성과 Effect Event]] — reactive value, 객체 identity, 최신 값과 재동기화 조건 분리
- [[React-Refs-and-DOM|ref와 DOM]] — state와 ref, callback ref, imperative handle과 flushSync
- [[React-Custom-Hooks|custom Hook]] — 로직 재사용, 구독, interval 합성, 지연과 debounce

## 관련 문서

- [[React-State|state와 동기화]]
- [[React-State-Effects-and-Events|event와 form, Hook 규칙]]
