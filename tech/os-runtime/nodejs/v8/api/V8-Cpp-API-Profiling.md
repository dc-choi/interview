---
tags: [runtime, v8, cpp, profiling, diagnostics]
status: done
verified_at: 2026-10-02
category: "OS & Runtime"
aliases: ["V8 CpuProfiler", "V8 HeapProfiler", "V8 JIT Events"]
---

# V8 CPU, 힙과 JIT 진단 계약

Profiler가 보여 주는 데이터는 표본, 수명과 포함 범위에 영향을 받는다. API가 반환한 포인터의 수명과 측정 대상을 먼저 확인해야 잘못된 성능 결론을 피할 수 있다. 기준은 V8 15.7.0 candidate API다.

## CPU profile의 표본

`CpuProfiler`는 생성과 dispose가 필요한 자원이다. Sampling interval은 활성 profile이 없을 때 변경한다. 기본 interval은 1,000마이크로초지만 실제 해상도와 스케줄링 지연을 측정해야 한다. Profile별 interval은 기본 interval의 배수로 조정될 수 있다.

개별 sample 기록을 켜지 않으면 aggregate call tree만 남을 수 있다. Sample 수 제한에 도달하면 이후 sample을 버리는 조건도 확인한다. Sample이 없다는 사실을 함수가 전혀 실행되지 않았다는 증거로 쓰지 않는다.

Timestamp는 마이크로초이며 profiler가 쓰는 시간 기준을 따른다. Epoch wall clock과 그대로 합치지 않는다. Profile node의 line/column과 함수 source location의 기준이 다를 수 있으므로 0-based와 1-based 값을 표시 단계에서 구분한다.

## 반환 포인터의 소유권

`CpuProfile::Delete()` 이후에는 profile node, 함수 이름과 관련 borrowed pointer를 사용하지 않는다. 비동기 보고를 위해 보관하려면 profile이 살아 있을 때 필요한 데이터를 복사한다. Line tick을 담는 배열도 요구된 capacity를 맞춘다.

Profiler 종료, profile 삭제와 보고 transport의 종료 순서를 명시한다. 측정 결과를 보관한다는 이유로 isolate 수명까지 무조건 연장하지 않는다.

## Heap snapshot의 그래프

Snapshot edge는 retaining 객체에서 retained 객체를 향한다. Node 자체의 크기와 해당 node 때문에 살아 있는 retained size는 다르다. 큰 shallow size가 아닌 작은 root가 더 큰 객체 그래프를 붙잡을 수 있다.

Object ID는 추적 조건 아래 여러 snapshot을 연결하는 데 쓸 수 있다. 알 수 없는 객체의 ID 0이나 snapshot 수명이 끝난 node pointer를 실제 객체 identity로 쓰지 않는다. Snapshot을 삭제하면 내부 node와 edge 포인터도 무효다.

JSON 직렬화 결과가 힙 크기에 비례해 커질 수 있다. 대용량 snapshot에는 streaming output, 중단 정책과 native 메모리 여유가 필요하다. `OutputStream`이 abort를 반환하면 `EndOfStream()` callback이 오지 않는 계약도 종료 처리에 반영한다.

## Sampling heap profiler의 한계

Sampling heap profiler는 평균 간격을 둔 확률적 allocation 표본이다. 기본 평균 간격은 512 KiB, 기본 stack depth는 16이지만 실제 설정을 결과와 함께 남긴다. 시작 전 allocation과 일반 native `malloc` 전체를 포괄하지 않는다.

살아 있는 allocation만 포함하는 기본 관찰과 이미 회수된 객체를 포함하는 flag를 구분한다. Sampling 중단은 유지 중인 표본을 버릴 수 있다. `GetAllocationProfile()`의 반환 소유권과 profiling이 꺼진 상태의 null 결과도 처리한다.

CPU profile과 heap sampling은 측정 대상이 다르다. Allocation이 많아도 live heap이 작을 수 있고, CPU가 낮아도 외부 buffer를 계속 보유할 수 있다.

## EmbedderGraph로 native 객체 연결

JS snapshot에 native 객체를 연결하려면 graph에 node를 추가한 뒤 strong/weak edge를 정확하게 등록한다. Wrapper node를 통해 JS 객체와 native 메모리 관계를 표현할 수 있다. 모든 native bytes가 자동으로 graph에 들어가는 것은 아니다.

Graph 생성 callback에서 GC를 일으키지 않는다. 이름과 native identity의 수명도 snapshot 요구 기간을 따라야 한다. 같은 주소를 재사용하는 allocator에서는 주소만으로 서로 다른 시점의 객체를 하나로 합치지 않도록 해석한다.

Native 객체 크기의 중복 집계와 누락을 함께 점검한다. Wrapper와 실제 backing memory 양쪽에 같은 bytes를 적으면 사용량을 부풀릴 수 있다.

## JIT와 코드 주소의 변동

JIT event의 문자열과 구조체는 callback 안에서만 유효한 borrowed data일 수 있다. 나중에 symbolization하려면 필요한 내용을 복사한다. 생성, 이동과 중첩 주소 범위를 처리하고 알 수 없는 새 event code는 안전하게 무시한다.

일부 제거 통지가 제공되지 않는 계약에서는 새 코드 영역이 기존 주소를 덮는 상황을 반영해야 한다. 한 번 관찰한 PC 범위를 영구적인 함수 주소로 등록하지 않는다.

Stack sampling과 unwinding에는 정지한 실행 스레드, 지원 CPU와 code page metadata 조건이 있다. 임의의 시점에 다른 스레드의 JS stack을 읽는 것은 안전한 관측 API가 아니다. Signal-safe API라는 이름도 잘못된 입력과 스레드 조건까지 허용하지 않는다.

## Tracing과 결과 해석

Tracing controller의 backend에 따라 지원되는 observer와 hook이 다르다. Perfetto 구성에서 기존 observer 경로가 no-op일 수 있다. 내부 `AddTraceEvent`를 직접 호출하기보다 지원되는 tracing macro와 platform 계약을 따른다.

측정 시에는 엔진 버전, flags, sampling 설정, profiler overhead와 workload를 함께 기록한다. 숫자를 비교하기 전에 누락된 자원, 시간 기준과 표본 손실 여부를 확인한다.

`metrics::Recorder`의 main-thread event는 foreground runner를 통해 지연 보고될 수 있다. Thread-safe event 구현에는 embedder의 동기화 책임이 있다. Context ID로 context를 찾는 결과도 비어 있을 수 있으므로 종료한 context의 이벤트를 처리할 수 있어야 한다.

GC의 total, main-thread, atomic과 incremental duration은 중첩 관계를 확인한 뒤 집계한다. 필드별 microseconds, bytes, percent와 bytes-per-microsecond를 구분한다. 일부 초기값 -1을 정상적인 0으로 바꾸면 아직 관측하지 않은 항목이 통계에 섞인다. Wasm compilation도 cached, deserialized, lazy와 streaming 경로를 구분해 비교한다.

실험적 `LongTaskStats`는 reset 이후의 V8 실행과 GC 시간을 집계한다. 이 중 `v8_execute_us`는 `--slow-histograms`가 켜져 있어야 수집된다. 수집하지 않은 필드의 기본값 0을 실행 시간이 없었다는 증거로 쓰지 않는다. 이 통계는 host의 모든 I/O와 native 작업을 포함한 end-to-end task duration도 아니다.

## 출처

- [V8, CpuProfiler](https://v8.github.io/api/head/classv8_1_1CpuProfiler.html)
- [V8, CpuProfile](https://v8.github.io/api/head/classv8_1_1CpuProfile.html)
- [V8, HeapProfiler](https://v8.github.io/api/head/classv8_1_1HeapProfiler.html)
- [V8, HeapSnapshot](https://v8.github.io/api/head/classv8_1_1HeapSnapshot.html)
- [V8, EmbedderGraph](https://v8.github.io/api/head/classv8_1_1EmbedderGraph.html)
- [V8, Profiler header](https://v8.github.io/api/head/v8-profiler_8h.html)
- [V8, Unwinder](https://v8.github.io/api/head/classv8_1_1Unwinder.html)
- [V8, Metrics Recorder](https://v8.github.io/api/head/classv8_1_1metrics_1_1Recorder.html)
- [V8, LongTaskStats](https://v8.github.io/api/head/structv8_1_1metrics_1_1LongTaskStats.html)

## 관련 문서

- [[V8-Cpp-API]]
- [[V8-Profiling-and-Tooling]]
- [[V8-GC-and-Memory]]
- [[V8-Cpp-API-Cppgc]]
