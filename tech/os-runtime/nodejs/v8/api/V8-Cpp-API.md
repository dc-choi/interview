---
tags: [runtime, v8, cpp, embedding]
status: index
category: "OS & Runtime"
aliases: ["V8 C++ API", "V8 Doxygen"]
---

# V8 C++ 임베딩 API

엔진을 호스트에 연결할 때 필요한 수명, 스케줄링과 실패 처리 계약이다. 각 문서는 2026-10-02의 Doxygen `head`, V8 15.7.0 candidate 헤더를 기준으로 한다. 설치한 Node.js의 V8 버전과 같은 것으로 간주하지 않는다. API 적용 전 해당 배포 버전과 빌드 옵션을 다시 확인한다.

- [[V8-Cpp-API-Lifecycle|초기화, Isolate와 플랫폼 작업]]
- [[V8-Cpp-API-Handles-and-Exceptions|Handles, 약한 참조와 예외]]
- [[V8-Cpp-API-Native-Bindings|Native 함수, 객체와 권한 경계]]
- [[V8-Cpp-API-Buffers-and-Strings|버퍼, 문자열과 외부 메모리]]
- [[V8-Cpp-API-Execution|Script, Module과 microtask 실행]]
- [[V8-Cpp-API-Serialization|직렬화, 코드 캐시와 snapshot]]
- [[V8-Cpp-API-Cppgc|C++ 객체 그래프와 cppgc]]
- [[V8-Cpp-API-Profiling|CPU, 힙과 JIT 진단 계약]]
- [[V8-Cpp-API-Inspector|Inspector 연결과 디버깅]]

엔진 내부 구조와 JS 수준의 성능 원리는 [[V8|V8 엔진]], 임베딩의 안전 경계는 [[V8-Embedding-and-Security]]에서 연결한다.
