---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["디버깅 도구", "Debugging Tools"]
---

# 디버깅 & 프로파일링 — 도구 선택과 디버깅

## 진단 도구 선택 가이드

| 증상 | 진단 도구 | 참조 섹션 |
|------|---------|---------|
| 앱이 예상대로 동작하지 않음 | Inspector (Chrome DevTools, VS Code) | 디버깅 |
| 응답 시간이 느림 (높은 레이턴시) | V8 프로파일러, Linux Perf | [[Debugging-Profiling-Memory\|프로파일링]] |
| 메모리 사용량이 지속적으로 증가 | Heap Snapshot, GC Traces | [[Debugging-Profiling-Memory\|메모리 진단]] |
| CPU 사용량이 높음 | Flame Graph, Perf | [[Debugging-Profiling-Memory\|Flame Graph]] |
| 프로세스 충돌/재시작 반복 | Heap Snapshot + GC Traces | [[Debugging-Profiling-Memory\|메모리 진단]] |

## 디버깅
```
--inspect 스위치로 Node.js 프로세스가 디버깅 클라이언트를 수신한다.
기본: 127.0.0.1:9229 (각 프로세스에 고유 UUID 할당)
```

| 플래그 | 설명 |
|--------|------|
| `--inspect` | Inspector 활성화, 기본 127.0.0.1:9229 |
| `--inspect=[host:port]` | 주소/포트 지정 |
| `--inspect-brk` | 사용자 코드 시작 전 중단 |
| `--inspect-wait` | 디버거 연결 대기 |
| `node inspect script.js` | CLI 디버거로 실행 |

**Inspector 클라이언트**: Chrome DevTools (`chrome://inspect`), VS Code, WebStorm

**원격 디버깅 (SSH 터널)**
```bash
# 원격: node --inspect server.js
# 로컬: ssh -L 9221:localhost:9229 user@remote.example.com
# Chrome DevTools를 localhost:9221에 연결
```

**보안**: 디버그 포트를 공개적으로 노출 금지 (임의 코드 실행 위험). 기본적으로 127.0.0.1에만 바인딩.

### 라이브 디버깅 워크플로
```
1. node --inspect-brk app.js로 시작 (첫 줄에서 중단)
2. Chrome DevTools 또는 VS Code를 연결
3. 브레이크포인트 설정 → 코드를 단계별로 실행
4. 스코프 패널에서 변수 값 검사
5. 콘솔 패널에서 표현식 평가
6. Call Stack 패널에서 호출 경로 추적
```

## 다음 단계
- [[Debugging-Profiling-Memory|프로파일링 & 메모리 진단]]

## 관련 문서
- [[Debugging-Profiling|디버깅 & 프로파일링 인덱스]]
- [[V8|V8 엔진]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
- [[Node.js]]
