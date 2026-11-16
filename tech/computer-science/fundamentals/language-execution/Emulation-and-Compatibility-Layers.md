---
tags: [compatibility, emulation, wine, proton, rosetta, metal, gpu, game]
status: done
verified_at: 2026-11-01
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Emulation and Compatibility Layers", "에뮬레이션과 호환 계층", "게임 이식", "Game Porting"]
---

# 다른 플랫폼용 프로그램 실행: 에뮬레이션, 호환 계층과 네이티브 이식

CPU와 GPU가 같은 종류의 계산을 할 수 있어도 다른 플랫폼용 프로그램은 변환이나 이식 없이 그대로 실행하기 어렵고, 실행되더라도 변환 비용과 GPU 구조에 따라 성능이 달라질 수 있다. 프로그램은 특정 CPU 명령어 집합, OS API, 그래픽 API와 셰이더 형식을 전제로 만들어지기 때문이다. 이 차이를 어느 층에서 메우는지에 따라 호환성과 성능이 달라진다.

## 프로그램이 기대하는 실행 계약

| 층 | 프로그램이 기대하는 것 | 맞지 않을 때 쓰는 방법의 예 |
|---|---|---|
| CPU 명령어 | x86_64나 arm64 같은 기계어 | 명령어 변환(Rosetta), 원래 기기를 재현하는 에뮬레이터, 대상 명령어 집합으로 다시 빌드 |
| OS API | 파일, 입력, 소리와 창을 다루는 Windows API 같은 OS 기능 | Windows API를 다른 플랫폼의 기능으로 구현하는 Wine |
| 그래픽 API | Direct3D, Metal, Vulkan | Direct3D를 Vulkan 위에서 구현하는 DXVK와 vkd3d-proton |
| 셰이더 | DXIL 같은 셰이더 중간 표현 | DXIL을 Metal 라이브러리로 바꾸는 Metal shader converter |

이 문서는 GPU 구조의 차이를 주로 성능 측면에서 다룬다([[#실행되는 것과 제 속도로 도는 것은 다르다|성능 절]]).

그래픽 API는 프로그램이 GPU 기능을 요청하는 공통 인터페이스이고, GPU 드라이버가 그 요청을 해당 GPU에서 실행되도록 처리한다. 같은 OS 안에서 제조사가 다른 GPU로 같은 게임을 돌릴 수 있는 이유다. Direct3D를 쓰는 Windows 게임을 macOS로 옮기면 그래픽 API(Direct3D에서 Metal)와 OS API가 함께 달라지고, CPU 명령어 집합까지 다르면 기계어를 변환하거나 대상 명령어 집합으로 다시 빌드해야 한다.

## 에뮬레이션, 호환 계층과 네이티브 이식

- **에뮬레이터:** 원래 기기의 동작을 재현해 그 기기용 프로그램을 다른 기기에서 실행한다. Cemu는 Wii U 게임과 애플리케이션을 PC에서 에뮬레이션하는 소프트웨어다.
- **호환 계층:** 기기를 재현하지 않고 프로그램이 호출하는 API를 대상 플랫폼의 기능으로 구현한다. Wine은 Windows 바이너리를 적재해 실행하는 로더와, Windows API 호출을 Unix, X11 또는 Mac의 대응 기능으로 구현하는 라이브러리로 구성된다. Valve의 Proton은 Wine을 사용해 Windows 전용 게임을 Linux에서 실행하는 Steam용 도구다. DXVK는 Direct3D 8~11을, vkd3d-proton은 Direct3D 12 API 전체를 목표로 Vulkan 위에서 구현한다. Proton은 Direct3D 9~11에 기본으로 DXVK를 쓰고 OpenGL 기반 wined3d를 대체 경로로 둔다.
- **명령어 변환:** Apple의 Rosetta는 x86_64 명령어가 든 Mac 앱을 Apple silicon에서 실행하게 하는 변환 과정이다. JIT 컴파일러가 있는 앱을 포함해 대부분의 Intel 기반 앱을 변환하지만 커널 확장과 x86_64 플랫폼을 가상화하는 VM 앱은 변환하지 않고, AVX512 명령어의 실행은 지원하지 않는다. 2026-11-01 확인한 Apple 문서는 Rosetta를 macOS 27까지 범용 도구로 제공하고, 그 뒤에는 Intel 기반 프레임워크에 의존하고 더 이상 업데이트되지 않는 오래된 게임을 지원하는 Rosetta 기능 일부만 남기겠다고 안내한다.
- **평가 환경과 이식 도구:** Apple의 Game Porting Toolkit(2026-11-01 확인 기준 버전 4)은 수정하지 않은 Windows 실행 파일을 Apple silicon에서 돌려 성능의 기준 추정치와 셰이더가 올바르게 변환되는지를 먼저 확인하는 평가 환경을 제공한다. 실제 이식에서 Metal shader converter를 쓰면 DXIL 셰이더를 metallib으로 바꿀 수 있다.
- **네이티브 이식:** 개발사가 대상 플랫폼의 API와 하드웨어에 맞춰 직접 빌드한다. 앞의 방식들과 비교하면 개발사가 부담하는 비용이 가장 크지만, 렌더링과 메모리 사용을 대상 구조에 맞추고 업데이트 뒤의 동작까지 개발사가 관리할 수 있다.

이 범주들은 서로 배타적이지 않아 한 도구가 여러 층을 함께 다룬다. 수정하지 않은 Windows 실행 파일을 Apple silicon에서 돌리는 평가 환경은 명령어, OS API와 그래픽 API의 차이를 함께 메워야 한다. CPU만 다른 경우의 실행 방식은 [[Docker-Core#CPU architecture 불일치|컨테이너의 CPU 아키텍처 불일치]]에서도 볼 수 있다.

변환 계층의 공통 기능 하나를 구현하면 그 기능을 쓰는 여러 프로그램이 함께 실행될 수 있고, 반대로 공통 계층의 결함은 그 경로를 쓰는 여러 프로그램에 함께 나타날 수 있다. 이는 계층 구조에서 도출한 해석이며 개별 프로젝트의 호환 목록을 확인한 결과가 아니다.

## 실행되는 것과 제 속도로 도는 것은 다르다

60fps를 내려면 프레임 간격을 약 16.7ms(1000ms/60) 이하로 유지해야 한다. 그래픽 명령의 변환과 전달이 늦어지면 GPU가 다음 작업을 기다리는 구간이 생겨, GPU의 이론 성능이 충분해도 프레임이 늦어질 수 있다. 이는 처리 구조에서 도출한 설명이다. 호환 계층에서의 성능은 평균 fps보다 프레임 시간의 분포와 CPU, GPU가 각각 쓰는 시간을 함께 재서 판단한다.

Apple silicon의 GPU는 TBDR(tile-based deferred rendering)을 쓴다. 렌더링 대상을 타일이라는 작은 영역의 격자로 나누고, GPU 안에 있는 빠른 임시 저장소인 타일 메모리에서 각 타일을 렌더링한 뒤 최종 결과를 장치 메모리에 쓴다. Apple은 장치 메모리 접근을 최대한 피해 시간과 에너지를 아끼는 것을 타일 메모리의 역할로 설명하고, tile shader로 중간 결과를 장치 메모리에 내보내지 않고 타일 메모리에 두는 방법을 안내한다.

다른 GPU 구조를 전제로 중간 결과를 매번 장치 메모리에 썼다가 다시 읽는 렌더링을 그대로 옮기면 이 이점을 살리지 못하고 메모리 대역폭과 전력을 더 쓸 수 있다. 그래서 이식 최적화는 그래픽 API 교체에 그치지 않고 중간 데이터를 어디에 두는지를 대상 GPU 구조에 맞추는 일을 포함한다. 이 두 문장은 Apple의 타일 메모리 설명에서 도출한 해석이다.

## 16비트 Windows 프로그램의 호환 경계

2026-11-02 winevdm 저장소 기준, 64비트 Windows용 이식판은 CPU 에뮬레이터와 Wine 기반 Win16→Win32 호출 변환, 16비트 핸들과 네이티브 핸들의 대응을 함께 사용한다. 같은 Windows 계열에서도 명령 실행 환경과 API, 핸들 표현의 차이를 각각 메워야 한다는 사례다. `%WINDIR%`에 설정을 쓰던 프로그램은 현대 Windows의 쓰기 제한 때문에 다른 위치로 리디렉션한다.

Win16 실행 파일을 `otvdm.exe`에 넘기거나 `otvdmw.exe`로 실행하는 경로와 설치 후 파일 연결을 제공한다. DOS 에뮬레이션은 불완전하다고 명시하므로, Win16 지원을 모든 DOS 프로그램의 호환 보장으로 확대하지 않는다. 설치, 레지스트리 변경과 실행 시험은 하지 않았다. 기존 게임 이식 절 전체를 다시 검증한 것은 아니므로 문서의 기존 검증일은 유지한다.

## 판단 기준

- 비공식 실행 시연은 시연에서 보인 범위가 실행됐다는 뜻이다. 정식 지원, 안정적인 성능, 쉬운 설치나 업데이트 뒤의 호환을 뜻하지 않는다.
- 온라인 게임은 그래픽이 실행돼도 안티치트 지원에서 막힐 수 있고, 계정과 온라인 서비스의 동작도 따로 확인한다. Steamworks 문서는 개발사를 대상으로 Easy Anti-Cheat는 빌드별로 지원을 직접 켜야 하고, BattlEye는 게임마다 수동 설정 단계가 필요하며 세부 사항은 Valve나 BattlEye 기술 담당자에게 문의하라고 안내한다. 2026-11-01 확인 기준 커널 공간 방식은 현재 지원하지 않고 권장하지도 않는다.
- 이식 여부는 기대 판매와 개발, 품질 검증, 업데이트마다 드는 유지보수 비용을 비교해 판단한다(검토 기준). Apple은 평가 환경을 이식 전에 성능과 그래픽 이식 가능성을 확인하는 용도로, Metal shader converter를 셰이더 변환 시간을 줄이는 도구로 안내한다.

## 출처

- [winevdm on 64-bit Windows — GitHub, otya128/winevdm](https://github.com/otya128/winevdm) — 2026-11-02 README의 구성, 실행과 DOS 지원 한계를 확인.

- [Apple Developer, Game Porting Toolkit](https://developer.apple.com/games/game-porting-toolkit/)
- [Apple Developer, Metal shader converter](https://developer.apple.com/metal/shader-converter/)
- [Apple Developer Documentation, Tailor your apps for Apple GPUs and tile-based deferred rendering](https://developer.apple.com/documentation/metal/tailor-your-apps-for-apple-gpus-and-tile-based-deferred-rendering)
- [Apple Developer Documentation, About the Rosetta translation environment](https://developer.apple.com/documentation/apple-silicon/about-the-rosetta-translation-environment)
- [Steamworks Documentation, Steam Hardware and Proton](https://partner.steamgames.com/doc/steamhardware/proton)
- [Wine README — GitHub, wine-mirror/wine](https://github.com/wine-mirror/wine/blob/master/README.md)
- [Proton — GitHub, ValveSoftware/Proton](https://github.com/ValveSoftware/Proton)
- [DXVK — GitHub, doitsujin/dxvk](https://github.com/doitsujin/dxvk)
- [vkd3d-proton — GitHub, HansKristian-Work/vkd3d-proton](https://github.com/HansKristian-Work/vkd3d-proton)
- [Cemu - Wii U Emulator — Cemu](https://cemu.info/)
- [닌텐도 독점작 젤다가 PS5에서 돌아간다? PS5에서 돌아간 젤다로 보는 기술과 게임 시장의 변화, 소니, 애플, 스팀이 같은 변화를 다르게 보는 이유 — YouTube, 안될공학 - IT 테크 신기술](https://www.youtube.com/watch?v=K-nAWPCBRUw) — 2026-10-18 업로드, 정리의 계기. 사실은 위 1차 출처와 대조했고 1차 출처를 찾지 못한 시연과 출시 사례는 쓰지 않았다.

## 관련 문서

- [[Native-Compilation-Compatibility|네이티브 컴파일과 호환성]]
- [[Compile-and-Runtime|컴파일과 런타임]]
- [[Docker-Core|Docker 기본]] — 컨테이너의 CPU 아키텍처 불일치
- [[OpenBSD-Platform|OpenBSD]] — Wine 이식 초안의 보안 제약
