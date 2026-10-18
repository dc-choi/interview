---
tags: [palantir, foundry, data-connection, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Agent offline, 인증서와 메모리 장애 복구

먼저 host의 `var/diagnostic/launch.yml`과 enhancedMessage, Manager service/startup log를 확인한다. host process가 running이라고 Foundry 연결이 online인 것은 아니다. 공개 복구 절차의 정리이며 실제 process 종료, truststore 변경이나 재설치를 수행하지 않았다.

## 인증서 만료

Agent Manager가 CA 만료/회전 때문에 Foundry와 끊기면 UI 인증서 추가만으로는 업데이트를 내려받을 수 없다. SSLHandshakeException/PKIX/CertificateExpiredException과 현재 server certificate를 확인한다. server 자체가 만료 certificate를 제시하면 원본 관리자가 먼저 갱신해야 한다.

UI에도 새 CA를 등록한 뒤 default Linux host에서 auto-restart 해제, Manager stop, truststore backup, bundled keytool로 각 CA를 고유 alias로 import, Manager start 순서로 복구한다. fingerprint는 provider와 대조한다.

Manager가 연결되면 Restart Agent로 UI certificate를 적용하고 두 process의 연결을 확인한다. 기존 auto-restart도 복원한다. local truststore password를 모르거나 수정할 수 없으면 새 certificate가 포함된 fresh bundle로 재설치하되 source-encryption key 두 파일을 보존한다. 옛 bundle 재사용은 새 CA가 포함됐다는 보장이 없다.

## port와 ghost process

Manager의 startup BindException은 install.yml의 port(기본 7032)를, Bootstrapper never-reported는 해당 startup log와 server admin port(기본 7002)를 확인한다. 원문 예시의 port 상한 65536은 유효한 TCP/UDP 최대값이 아니므로 실제 유효 port와 점유 여부를 확인한다.

online인데 restart에 반응하지 않으면 다른 ghost instance를 확인한다. 원문은 Manager stop, process index 제거, 이전 process stop, UI heartbeat 중단 확인 후 Manager start를 제시한다. 임의의 Java 전체 종료로 대체하지 않는다. host에서 agent를 직접 시작하면 ghost가 생길 수 있다.

## OOM과 heap

exit 137만으로 OOM을 확정하지 않는다. 원문이 제시하는 return-code 로그와 OS killed-process/OOM 로그, PID와 발생 시각을 함께 대조한다. 프로세스 종료는 antivirus나 외부 종료 때문일 수도 있다.

기본 heap은 agent 1GB, Explorer 1GB, Bootstrapper 512MB, Manager 512MB로 합계 약 3GB다. 다른 process와 off-heap 여유가 필요하다. agent를 멈추고 정상~고부하 시 host available memory를 보며 약 2~4GB buffer 권장과 전체 process 예산을 함께 판단한다.

Windows는 launcher-custom.yml을 쓰지 않아 Manager/Bootstrapper가 각 system memory 25%를 받을 수 있다. 원문은 JAVA_HOME 및 MAGRITTE_BOOTVISOR_WIN_OPTS/MAGRITTE_BOOTSTRAPPER_OPTS를 명시하고 새 command prompt로 재시작하는 수정을 안내한다. heap을 줄이면 OS kill 가능성은 줄어도 Java heap 부족은 늘 수 있다.

## download와 관리

download link는 10분 만료와 일회 secret 조건이다. Teams 같은 link-preview가 먼저 접근하면 무효화될 수 있다. link를 재발급하고 secret 단어를 직접 입력하는 안내를 확인한다. disconnected-unexpectedly에서는 curl HTTP1.0 옵션이 진단 workaround일 수 있다.

create permission과 administer permission을 나누고, Bootvisor Unknown의 강제 복구는 원문이 Palantir Support 확인과 작업 종료/maintenance를 선행하도록 명시한다. 복구 후 UI online뿐 아니라 실제 sync와 사용 credential을 확인한다.

## 출처

- [Palantir, agents-troubleshooting](https://www.palantir.com/docs/foundry/data-connection/agents-troubleshooting)
- [Palantir, faq](https://www.palantir.com/docs/foundry/data-connection/faq)

## 관련 문서

- [[Palantir-Connection-Operations]]
- [[Palantir-Agent-Lifecycle]]
- [[Palantir-Agent-Proxy-TLS]]
