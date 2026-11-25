# Mori Isle — 작업 안내 (Claude용)

3D 스프라이트 적층 미니어처 디오라마 빌더. 게임 전체가 `mori_isle.html` 한 파일(HTML·CSS·JS·GLSL, Three.js 0.160 unpkg importmap)이다. 아트·UX·성능 기준은 `3d.md`(명세서), 사용자용 설명은 `README.md`.

## 작업 방식
- 답변과 진행 메시지는 한국어로 쓴다.
- 기능 하나가 끝날 때마다 커밋한다. `git push`는 Claude 권한으로 거부되므로 사용자가 직접 한다. 끝나면 push 명령을 안내한다.
- 시각 변경은 헤드리스 Chrome 스크린샷으로, 조작·소리는 `tools/tests`의 자동 테스트로 확인하고, 확인 못 한 것(실기기 프레임, 실제 소리 느낌)은 그렇다고 말한다.
- 타깃 기기는 Intel Iris Xe 노트북. 품질을 해치지 않는 최적화만 한다.

## 코드 구조 (mori_isle.html)
- 상단 상수: `HASH`(URL 옵션), `LOWRES`(저해상도 설정), `ATMOSPHERES`(낮·노을·밤), `ITEM_DEFS`(오브젝트 정의, `drawSlice`로 적층 레이어를 그림).
- `CozyAudio`: 모든 효과음은 `audio.out(node, pan)` → `sfxBus`로, 배경음(바람·풍경·모닥불)은 `masterGain`으로 보낸다. 둘 다 잔향(`reverb`)과 컴프레서(`comp`)를 거친다.
- `enhanceStandardMaterial`: 표준 재질에 바람, 높이 안개, 분해 보기, 낙하 애니메이션(`aSpawn` 인스턴스 속성)을 셰이더로 덧붙인다. 그림자용 `customDepthMaterial`도 낙하 애니메이션을 따라간다.
- `initGame()` 안: 렌더러/렌더 타깃 → 카메라(`updateCameraTransform`) → 조명 → 후처리(`runPostPipeline`) → 섬·인스턴스 → `rebuildInstances()` → 입력 → `animate()`.

## 지켜야 할 규칙 (어기면 조용히 깨짐)
- **그림자는 필요할 때만 갱신한다** (`renderer.shadowMap.autoUpdate = false`). 그림자를 드리우는 물체를 움직이는 코드를 넣으면 반드시 `markShadowsDirty(초)`를 부른다. 지금은 `rebuildInstances`(1.0초)와 분해 보기 전환(1.4초)에서 부른다.
- **포인트 라이트 8개는 항상 `visible = true`**로 두고, 안 쓰면 `intensity = 0`, 사용 여부는 `pl.userData.active`로 구분한다. 보이는 조명 수가 바뀌면 모든 셰이더가 다시 컴파일되어 끊긴다.
- **카메라 상하 각도는 30° ~ 86°**(`ELEV_MIN`/`ELEV_MAX`). 스프라이트 적층은 낮은 각도에서 층이 갈라져 보여서 사용자가 수평·아래 시점을 막기로 결정했다. 넓히지 말 것.
- **직교 카메라 + 1픽셀 정렬**: `updateCameraTransform`이 카메라 위치를 씬 픽셀 단위로 맞추고 남는 차이(`camSub`)는 업스케일 셰이더가 보정한다. 카메라 위치를 직접 건드리지 말고 `camPan`, `camDist`, `camElev`, `orbitAngle`, `camShake`를 바꾼 뒤 이 함수를 거친다.
- **해상도가 바뀌면 `applyResolution()`**을 부른다(깊이 텍스처는 `setSize`로 안 바뀌어서 새로 만든다).
- **오두막**은 부품 96개로 만들어 낙하 애니메이션이 끝나면 `mergeCabinPrefab`으로 재질별로 합친다. 다시 만들 때 `disposeObjectTree`로 해제한다.
- 적층 오브젝트의 점 크기(`gl_PointSize`)는 `sharedUniforms.uPointScale`(씬 픽셀/CSS 픽셀)을 곱한다.

## 렌더링 파이프라인
씬(HDR half float, 깊이 텍스처, 저해상도) → atmo(하늘 합성, AO, 불빛에 물드는 안개) → dof(깊이 기반 틸트 시프트) → bloom(1/2, 1/4) → comp(색수차, 색 보정, ACES, 비네팅, Bayer 디더) → 업스케일(픽셀 경계만 부드럽게 + 필름 그레인). 자동 해상도 조절은 `trackPerformance`.

## 테스트 도구 (Node 22+, Chrome 필요)
```powershell
node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/controls.mjs
node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/audio.mjs
$env:SHOT='night'; node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1&time=night" tools/tests/screenshot.mjs
```
- `tools/cdp.mjs`는 헤드리스 Chrome을 띄워 마우스·휠·키 입력, `evaluate`, 스크린샷을 제공한다. 결과 스크린샷은 `tools/shots/`(git 제외).
- `#debug=1`이면 `window.__mori`(state, project, hit, audio)가 생긴다. 읽기 전용 테스트 훅이다.
- 헤드리스는 SwiftShader(소프트웨어 렌더링)라 몇 초에 몇 프레임뿐이다. 시간(ms) 측정은 의미 없고, draw call 수(`#fps=1`이면 `body[data-bench]`와 콘솔에 기록)로 비교한다. 기본 섬 기준 그림자 갱신 없는 프레임 80 calls.
- 시간대 전환은 천천히 섞이므로 스크린샷에는 `#time=night`처럼 시작 옵션을 쓴다(즉시 적용됨).
- URL 옵션 전체 목록은 README 참고.

## 남은 일
- 명세서 미완: 1픽셀 외곽선·샤픈 후처리, 상단 조작 안내 배너 제거(미니멀 UI 규칙).
- Cinderwatch에서 가져올 후보(사용자와 논의됨): 섬 조립·붕괴 연출(섬 초기화), 계절 테마(눈·낙엽 덮기 셰이더), 높이 텍스처 표면 요철, 감상 모드 자동 카메라, 안정성(소리 설정 기억, WebGL 컨텍스트 복구, 모션 줄이기 설정), 파일 분할 + 빌드 스크립트.
- 직접 확인 필요로 남은 것: 실제 노트북 프레임, 소리 느낌, 밤 밝기, WASD 이동 속도.
