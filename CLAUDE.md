# Mori Isle — 작업 안내 (Claude용)

3D 스프라이트 적층 미니어처 디오라마 빌더. 게임 전체가 `mori_isle.html` 한 파일(HTML·CSS·JS·GLSL, Three.js 0.160 unpkg importmap)이다. 아트·UX·성능 기준은 `3d.md`(명세서), 사용자용 설명은 `README.md`.

## 참고 게임: Cinderwatch
표현 방식, 그래픽, 이펙트, 분위기의 기준으로 **Cinderwatch**를 참고하고 있다. 사용자는 "이 게임처럼" 만들고 싶어 한다.
- **무엇:** 단일 HTML로 된 자동 진행 3D 아이소메트릭 타워 디펜스. Three.js r170. 모델, 텍스처, 소리를 모두 코드로 만든다. MIT 라이선스이므로 코드를 그대로 옮길 때는 라이선스 고지를 함께 넣는다.
- **위치:** 사용자 PC의 `D:\Owl\cinderwatch-main` (압축본 `D:\Owl\cinderwatch-main.zip`, 원본 github.com/kevintngo/cinderwatch). 읽기만 한다. 핵심 파일은 `src/20-post.js`(렌더링·후처리), `src/10-gfx.js`(절차적 텍스처, 재질, 메쉬 빌더), `src/40-fx.js`(조명, 파티클), `src/80-audio.js`(소리), `src/90-main.js`(카메라, 루프, 자동 해상도).
- **목표로 하는 느낌:** 저해상도 픽셀 감성인데 확대하면 미니어처 디오라마처럼 매끈하고 세밀함. 어둡고 차가운 바탕 위에 따뜻한 불빛이 주인공. 깊이 기반 틸트 시프트, 디더링, 필름 그레인 같은 아날로그 질감.
- **이미 가져온 것:** 저해상도 렌더링 + 또렷한 업스케일, 직교 카메라 1픽셀 정렬과 디더 위치 고정, Bayer 디더, 필름 그레인, 깊이 기반 틸트 시프트, HDR 블룸 2단, 화면 기반 AO, 불빛에 물드는 안개, 자동 해상도 조절, 어두운 밤과 노이즈 깜빡임, 노이즈 불꽃 셰이더와 불티, 화면 이동·커서 위치 확대, 노이즈 기반 효과음·잔향·컴프레서·좌우 위치감, 그림자 갱신 줄이기, CDP 헤드리스 테스트 도구, 섬 조립·붕괴 연출(시작 화면과 섬 초기화. Cinderwatch는 땅 조각이 아래에서 솟지만 Mori Isle은 레고처럼 위에서 층층이 내려앉는다), 각진 로우폴리 지형(`31-terrain.js` 격자·삼각형별 색), 층층이 턱진 지층 벽(`wallColumn`), 조약돌 길(`L_COBBLE` 월드 UV).
- **일부러 안 가져온 것:** 포인트 라이트 실시간 그림자(명세서 금지, Iris Xe 부담), 4단계로 끊은 픽셀 연기(명세서는 둥근 구체 연기), 전투·몬스터·AI 자동 플레이(장르가 다름).
- **오브젝트 제작 방식 (사용자 결정, 2026-11-26 변경):** 만드는 기술은 Cinderwatch를 따르고 생김새와 분위기는 Mori Isle 고유(동화 같은 숲속 미니어처)로 만든다. 지형·지층·돌길과 바위·모닥불은 로우폴리(`Soup`)로 바꿨다(적층은 픽셀 그림이 박혀 있어 확대해도 매끈해지지 않음. Cinderwatch는 화면 기준 저해상도라 축소하면 픽셀, 확대하면 로우폴리가 드러남). **소나무·참나무·들꽃·갈대·버섯은 적층을 유지**한다(사용자 결정 2026-11-26: "지금이 전보다 훨씬 낫고 이 정도면 괜찮다". 나무의 복셀 느낌은 동화풍 숲과 어울림). 구조물·바위·소품은 `Soup`. 사용자 결정: 바꾼 것은 스크린샷 승인 없이 바로 적용하고, 아니다 싶으면 되돌린다.
- **차이점:** Cinderwatch는 카메라 각도가 고정이지만 Mori Isle은 좌우 회전과 상하 30°~86°를 허용한다. Cinderwatch는 일반 3D 메쉬, Mori Isle은 스프라이트 적층과 도형 조립을 섞어 쓴다. 기법을 가져올 때 이 차이를 고려한다.
- 아직 안 가져온 후보는 아래 "남은 일"에 있다.

## 작업 방식
- 답변과 진행 메시지는 한국어로 쓴다.
- 기능 하나가 끝날 때마다 `main`에 바로 커밋한다. 새 브랜치는 만들기 전에 사용자에게 묻는다(사용자 결정). `git push`는 Claude 권한으로 거부되므로 사용자가 직접 한다. 끝나면 push 명령을 안내한다.
- 시각 변경은 스크린샷을 찍지 않는다(사용자 결정 2026-11-26: 반영되면 사용자가 직접 확인). 조작·배치·소리는 `tools/tests`의 자동 테스트로 확인하고, 확인 못 한 것(실기기 프레임, 실제 소리 느낌, 생김새)은 그렇다고 말한다.
- 타깃 기기는 Intel Iris Xe 노트북. 품질을 해치지 않는 최적화만 한다.

## 코드 구조 (mori_isle.html)
- 상단 상수: `HASH`(URL 옵션), `LOWRES`(저해상도 설정), `ATMOSPHERES`(낮·노을·밤), `ITEM_DEFS`(오브젝트 정의, `drawSlice`로 적층 레이어를 그림).
- **4B. SOUP MESH KIT** (Cinderwatch에서 옮김, MIT 고지 포함): `Soup`으로 도형을 조립하고, 꼭짓점마다 `aSurf`(재질 종류, 거칠기, 흔들림, 발광)를 넣는다. 재질은 64×64 텍스처 11장 묶음(`L_WOOD`, `L_METAL` 등) + 요철 셰이더 하나를 공유한다. `add()` 한 번이 부품 하나이고, 부품을 높이순으로 묶어 `aLayerH`에 넣기 때문에 적층과 같은 낙하·분해 셰이더가 그대로 동작한다. 하위 조립품은 `merge()`로 붙이면 한 덩어리로 떨어진다.
- **도는 부품 (`def.spin`):** `aSurf.z`(sway)가 음수인 꼭짓점은 셰이더에서 `def.spin.pivot`(로컬 x, y)을 지나는 로컬 z축으로 `speed` rad/s만큼 돈다(`SPIN_OFF`, `soupSpin`). draw call 추가 없음, 낙하·분해 연출을 그대로 따른다. 그림자 패스에는 회전이 없다(바람 흔들림과 같음). `soupSpin`은 `uTime`을 인자로 받는다(어떤 재질에서는 `uTime` 선언이 뒤에 와서 직접 쓰면 컴파일 실패, 실제로 겪음). 셰이더를 고치면 콘솔 오류를 꼭 확인한다(테스트는 통과해도 조립 오브젝트 전체가 사라질 수 있음).
- **조립 오브젝트 추가:** `SOUP_ITEMS`에 `type: 'soup'`, `build(S, rng)`로 정의하고 같은 id의 `ITEM_DEFS` 항목을 대체한다. 적층 버전이 없는 새 오브젝트(예: `woodpile`)는 `SOUP_ITEMS`에 `name`·`category`·`freePlace`까지 넣으면 팔레트에 추가된다. 충돌 반경은 `solidRadius`(칸 배치·자유 배치 모두). 매달린 천처럼 위가 고정되고 아래가 흔들리는 부품은 `soupSwayBelow`. `deform`은 크기를 곱한 뒤(실제 크기) 꼭짓점에 적용된다. 아이콘은 실제 모델을 찍어 만든다(`renderSoupIcon`). 불빛이 칸 중앙에 있지 않으면 `glow.offsetX/offsetZ`를 준다. 색은 `MCOL`, 금속은 `metalness` 대신 낮은 거칠기(0.3~0.5)로 반사를 낸다.
- **UI (14. HUD):** 글자를 최소로 둔다(사용자 결정). 아래는 카테고리 슬롯(`catSlots`, 호버 90ms 뒤 열림·220ms 유예 뒤 닫힘, 터치는 클릭으로 토글) + 지우개 + 회전, 오른쪽 위는 아이콘만. 이름은 호버·선택 때 `showItemName`으로 잠깐만 띄운다. 색은 CSS 변수(`--ink`, `--glow`, 시간대별 `--scrim`·`--halo`), 글꼴은 Galmuri(jsDelivr). **HUD 아이콘은 "손으로 깎은 나무 토큰"**(사용자 결정: Tiny Glade·동물의 숲처럼 일관된 코지 스큐어모피즘이되 고유하게). `4C. COZY UI TOKENS`의 `GLYPHS`(56×56, 진한 갈색 선 + 홈에 채운 차분한 색)와 `makeToken(name, {round})`로 만든다. 카테고리 슬롯은 오브젝트 그림이 아니라 카테고리 토큰. 새 아이콘도 이 방식으로만 추가한다. 트레이의 오브젝트는 크림색 종이 카드 위의 실제 3D 모델 아이콘(`renderObjectIcon` + `fitIconCanvas`, 소나무·참나무·들꽃·갈대·버섯은 적층 그림). 지형 도구 카드만 모델 대신 종이 위 잉크 그림(`.card-glyph`, 같은 `GLYPHS`). 새 텍스트 배너나 상자형 패널을 늘리지 말 것. 사용자 결정: 아이콘 밑 숫자·키 표시 없음, 브라우저 `title` 툴팁 금지(아이콘 버튼은 `data-hint` 이름표, 카테고리는 이름표 없음). 4초 유휴 흐림(`ui-idle`)은 `.panel`을 제외해야 한다(아니면 닫힌 창이 보인다).
- **지형 (8. 섬):** 높이는 칸 데이터 `terrain.level`(1번 섹션)을 읽고, 연못은 아직 수식 `getPondSDF`. 윗면은 0.2 간격 격자를 살짝 흔들고 삼각형마다 평면 법선·색 하나(`turfColor`, 잔디는 `L_GRASS`, 비탈은 흙·바위). 높이는 `getTurfHeight`(= `getContinuousTerrainHeight` + 가장자리 경사 + ±약 3cm 요철). 지층 세 덩어리는 `buildStrataChunk`(띠 + 위 밝고 아래 어두운 턱, 표토 윗선은 잔디 가장자리 꼭짓점과 정확히 맞춤 → 가장자리 꼭짓점은 흔들지 않는다). 돌길은 `pathMesh` 하나를 `rebuildInstances`에서 `buildPathGeometry`로 다시 만든다. 셋 다 공유 재질 `makeTerrainMaterial`(Soup 텍스처 묶음 + 요철 + 안개·바람, `userData.shared`). 매끈한 `topGeo`는 격자 오버레이 전용. 접지 그림자는 요철 위로 `wy + 0.026`.
- `CozyAudio`: 모든 효과음은 `audio.out(node, pan)` → `sfxBus`로, 배경음(바람·풍경·모닥불)은 `masterGain`으로 보낸다. 둘 다 잔향(`reverb`)과 컴프레서(`comp`)를 거친다.
- `enhanceStandardMaterial`: 표준 재질에 바람, 높이 안개, 분해 보기, 낙하 애니메이션(`aSpawn` 인스턴스 속성)을 셰이더로 덧붙인다. 그림자용 `customDepthMaterial`도 낙하 애니메이션을 따라간다.
- `initGame()` 안: 렌더러/렌더 타깃 → 카메라(`updateCameraTransform`) → 조명 → 후처리(`runPostPipeline`) → 섬·인스턴스 → `rebuildInstances()` → `islandRoot`로 묶기 → 입력 → 17. 시작 조립 → `animate()`.
- **시작 화면과 조립 (17. STARTUP ASSEMBLY):** 사용자 결정: 로딩 토큰 없이 검은 화면(`#loader`, 글자는 실패 때 "다시 불러오기"뿐)에서 페이드인, 건너뛰기 없음. `body.booting`이 HUD를 숨긴다. 검은 화면 뒤에서 완성된 섬을 3프레임 그려 셰이더·그림자를 미리 컴파일한 뒤 `onBootReady`가 검은 화면을 걷고 `startAssembly(true, FIRST_LEAD)`를 부른다. 타임라인은 `IT` 상수 하나에 모여 있다. 섬 세 층은 위치 오프셋으로 떨어지고, 오브젝트는 `spawnT`를 미래로 잡아 기존 낙하 셰이더를 그대로 쓴다. 불빛은 `introLightK(x, z, now)`(스프라이트, 포인트 라이트, 불꽃, 불티, 굴뚝 연기, 차례는 `intro.ignite`), 접지 그림자는 `introShadowK`로 가린다. 효과·소리는 `introFx`로 예약한다. 섬 층·오두막 착지에는 임팩트 링(`spawnRing`, 풀 4개, 셰이더로 폭 일정), 불이 붙을 때는 픽셀 별 반짝임(`spawnSparks`, 깊이 테스트 없음: 불빛 위치가 오두막 안이라 가려짐)을 넣는다. 둘 다 시계의 함수라 `introClock`으로 멈춰 찍을 수 있고, 쉴 때는 draw call이 없다. "처음 섬으로"는 `resetIsland`(흔들림 → `islandRoot`째 낙하 → 다시 조립). 조립 중 입력은 window capture 단계의 `holdIntroInput`이 막는다(휠, 새로고침·개발자 도구 키만 통과). `#intro=0`이면 끄고, `#debug=1`이면 기본으로 꺼진다.
- **소리 기본값:** `audio.wantOn = true`(아이콘도 켜짐). 브라우저가 첫 클릭·키 전에는 소리를 막으므로, 허락돼 있으면 `onBootReady`에서 바로 켜고, 아니면 `unlockAudio`가 첫 pointerdown/pointerup/keydown에서 켠다. 실제로 재생될 때까지(`audioPlaying`) 계속 시도한다(Esc·브라우저 단축키는 사용자 동작이 아니고, 터치는 손을 뗄 때만 인정된다). 소리 버튼은 `unlockAudio`에서 빼고 버튼이 직접 처리한다(막힌 상태의 첫 누름은 끄기가 아니라 켜기). 막힌 동안 컨텍스트 시계가 멈춰 예약된 소리가 나중에 한꺼번에 터지므로, 조립 소리는 `introReady()`(실행 중일 때만)로 거른다. 배경음 버튼으로 끄면 `wantOn = false`.
- **굴뚝 연기 (`smokeInst`, 11번 근처 정의 + animate 7번):** 요철 있는 반투명 구체(Icosahedron 2단계, 삼각형 180개) 인스턴스, draw call 1개, 그림자 없음, `depthWrite: false`. 굴뚝마다 `smokeStates`(오두막 위치 키)에 덩어리 목록을 두고, 덩어리는 태어난 시각만으로 위치·크기를 계산한다. 생성은 `dt`가 아니라 경과 시간 기준(느린 프레임에서도 고르게). 매 프레임 카메라에서 먼 순서로 정렬해 인스턴스 버퍼에 쓴다(`smokeDraw` 재사용). 불투명도는 셰이더에서 나이(서서히 나타났다 옅어짐) × 가장자리 깃털(`dot(normal, view)`) × 부드러운 노이즈 침식(`aSmoke.z`, 저주파만). 색은 윗면 크림색·아랫면 살짝 푸른 정도(진한 그늘 금지, 사용자 지적: 안쪽이 회색으로 보임), 밤에는 젊은 덩어리 아랫면에 불빛(`aSmoke.w`). 증기기관차처럼 뿜지 않도록 거의 일정한 속도로 천천히 오른다(사용자 지적). 위치는 `islandRoot` 기준. `startAssembly`에서 `smokeStates.clear()`(숨은 예열 프레임에 생긴 연기가 조립 중 공중에 남던 버그). 조정값은 `SMOKE`(rate, life, mouth, wind). 확대 확인: `#zoom=16&pan=-1.6,-2.6`.
- **`islandRoot`:** 섬 층, 울타리, 오두막, 불빛 후광, 연기, 불꽃, 불티, 모든 인스턴스 오브젝트의 부모. 먼지, 꽃잎, 커서, 포인트 라이트는 월드에 둔다. 섬 위에 서는 새 오브젝트 그룹을 만들면 여기에 넣는다(초기화 때 같이 떨어지도록).

## 지켜야 할 규칙 (어기면 조용히 깨짐)
- **그림자는 필요할 때만 갱신한다** (`renderer.shadowMap.autoUpdate = false`). 그림자를 드리우는 물체를 움직이는 코드를 넣으면 반드시 `markShadowsDirty(초)`를 부른다. 지금은 `rebuildInstances`(1.0초)와 분해 보기 전환(1.4초)에서 부른다.
- **포인트 라이트 8개는 항상 `visible = true`**로 두고, 안 쓰면 `intensity = 0`, 사용 여부는 `pl.userData.active`로 구분한다. 보이는 조명 수가 바뀌면 모든 셰이더가 다시 컴파일되어 끊긴다. 불빛 오브젝트는 몇 개든 `lightSources`에 모이고, `updatePointLights`가 0.3초마다 화면 중심에 가까운 8개를 골라 조명을 빌려 준다(바뀔 때 0.2초 페이드). 조명을 직접 배정하지 말 것.
- **배치 방식 세 가지:** ① 1칸 격자(`placedItems`, 오두막·나무·돌길·울타리) ② ¼칸 맞춤(`snapProps`, `snapPlace: true` + `footprint: [x0, x1, z0, z1]` 바닥 크기, 벤치·가로등·모닥불·생활 소품. 사용자 결정 2026-11-26: 소품이 칸 가운데 떠 보여서 바꿈, 나무는 아직 1칸 유지) ③ 자유 배치(`freeProps`, 꽃·버섯·바위·화분). ¼칸 맞춤은 `snapPlacement`가 ¼칸에 맞추되 오두막 벽·다른 소품 가장자리가 `SNAP_PULL`(0.16) 안이면 거기에 붙이고, `snapRectBlocked`가 네모 바닥으로 충돌(연못, 비탈·턱, 섬 밖, 돌길 중심, 나무·울타리 기둥과 가로대, 바위·꽃, 다른 소품)을 본다. 1칸·자유 배치 쪽도 `snapProps`를 피한다(`canPlaceAtHit`, `isBlockedForPoint`). 접지 그림자·모닥불·불빛은 공통 `addItemExtras`. 새 소품의 `footprint`는 땅에 닿는 부분만 잡는다(위로 뻗은 팔·처마는 빼도 됨).
- **오브젝트 정의 공통 항목:** `id`, `name`(설명 없이 이름만), `category`(`CATEGORIES`의 id), `type`, `freePlace`, `autoConnect`, `contactRadius`, `glow`, `explodeTier`. 카테고리가 없으면 콘솔 경고가 뜨고 `items.mjs` 테스트가 실패한다. 도구 막대는 카테고리 순으로 정렬된다.
- **오두막 합치기:** 낙하가 끝나면 `mergeChunkToOneMesh`가 덩어리마다 재질 값을 꼭짓점에 넣어 메쉬 1~2개로 합친다(공유 재질 `getCabinMergedMaterial`, `userData.shared`라 해제하지 않음). 오두막에 새 재질을 쓸 때는 불투명·단면 `MeshStandardMaterial`이어야 하고, 야간 발광 배율은 `enhanceStandardMaterial`의 `emissiveNightBoost`로 준다.
- **카메라 상하 각도는 30° ~ 86°**(`ELEV_MIN`/`ELEV_MAX`). 스프라이트 적층은 낮은 각도에서 층이 갈라져 보여서 사용자가 수평·아래 시점을 막기로 결정했다. 넓히지 말 것.
- **직교 카메라 + 1픽셀 정렬**: `updateCameraTransform`이 카메라 위치를 씬 픽셀 단위로 맞추고 남는 차이(`camSub`)는 업스케일 셰이더가 보정한다. 카메라 위치를 직접 건드리지 말고 `camPan`, `camDist`, `camElev`, `orbitAngle`, `camShake`를 바꾼 뒤 이 함수를 거친다.
- **`chunkTopSurface.children[0]`은 잔디 지형 메쉬**여야 한다(포인터 레이 대상 `rayTargets`). 섬 윗면에 무언가를 먼저 `add`하지 말 것.
- **씬 렌더 타깃은 투명 검정 위의 premultiplied 색이다.** atmo 패스는 `하늘·(1-a) + rgb`로 합성한다(일반 블렌딩 결과가 그 형태). 반투명 물체가 하늘 위에서 어두워지지 않으려면 이 식을 유지한다.
- **해상도가 바뀌면 `applyResolution()`**을 부른다(깊이 텍스처는 `setSize`로 안 바뀌어서 새로 만든다).
- **오두막**은 부품 96개로 만들어 낙하 애니메이션이 끝나면 `mergeCabinPrefab`으로 합친다. 다시 만들 때 `disposeObjectTree`로 해제한다.
- 적층 오브젝트의 점 크기(`gl_PointSize`)는 `sharedUniforms.uPointScale`(씬 픽셀/CSS 픽셀)을 곱한다.
- **새 불빛·불꽃 효과는 `introLightK`를 곱한다.** 안 그러면 시작 조립 때 물체보다 빛이 먼저 공중에 뜬다. 모닥불 불꽃 셰이더는 인스턴스 크기를 무시하므로 꺼진 불은 크기를 줄이지 말고 목록에서 뺀다.
- **HUD 버튼 HTML은 빈 자리로 둔다.** 아이콘은 `setToken`/`makeToken`으로만 넣는다(옛 SVG를 넣으면 로딩 중에 비친다).

## 렌더링 파이프라인
씬(HDR half float, 깊이 텍스처, 저해상도) → atmo(하늘 합성, AO, 불빛에 물드는 안개) → dof(깊이 기반 틸트 시프트) → bloom(1/2, 1/4) → comp(색수차, 색 보정, ACES, 비네팅, Bayer 디더) → 업스케일(픽셀 경계만 부드럽게 + 필름 그레인). 자동 해상도 조절은 `trackPerformance`.

## 테스트 도구 (Node 22+, Chrome 필요)
```powershell
node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/controls.mjs
node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/audio.mjs
node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/items.mjs
node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/ui.mjs
node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/snap.mjs
node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/console.mjs
node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/terrain.mjs
node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/terrain-edit.mjs
node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1&intro=1" tools/tests/intro.mjs
$env:AUTOPLAY='0'; node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1&intro=1" tools/tests/sound-unlock.mjs; $env:AUTOPLAY=$null
$env:SHOT='night'; node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1&time=night" tools/tests/screenshot.mjs
```
- `tools/cdp.mjs`는 헤드리스 Chrome을 띄워 마우스·휠·키 입력, `evaluate`, 스크린샷을 제공한다. 결과 스크린샷은 `tools/shots/`(git 제외).
- `#debug=1`이면 `window.__mori`(state, project, hit, audio, items, lights, renderables, terrainDump, meshDigest)가 생긴다. 읽기 전용 테스트 훅이다. `renderables()`로 draw call이 어디서 나오는지 나눠 볼 수 있다.
- 헤드리스는 SwiftShader(소프트웨어 렌더링)라 몇 초에 몇 프레임뿐이다. 시간(ms) 측정은 의미 없고, draw call 수(`#fps=1`이면 `body[data-bench]`와 콘솔에 기록)로 비교한다. 기본 섬 기준 그림자 갱신 없는 프레임 57 calls(2026-11-26 지형 데이터 전환 전후 측정, 삼각형·프로그램 수는 실행마다 조금 흔들림. 오두막 합치기 개선 전 82).
- 시간대 전환은 천천히 섞이므로 스크린샷에는 `#time=night`처럼 시작 옵션을 쓴다(즉시 적용됨).
- 헤드리스에서는 조립 중 한 프레임이 몇 초씩 걸려 시각이 안 맞는다. 조립 장면은 `__mori.introClock(초)`로 시계를 멈추고 `__mori.frame()`이 2 늘어난 뒤 찍는다(`intro.mjs` 참고, 결과 `tools/shots/intro-*.png`). `null`을 주면 다시 흐른다. `__mori.introFx()`는 보이는 링 수와 반짝임 상태를 준다.
- `cdp.mjs`는 기본으로 자동 재생을 허락한다. 실제 첫 방문처럼 소리가 막힌 상태를 보려면 `$env:AUTOPLAY='0'`.
- URL 옵션 전체 목록은 README 참고.

## 남은 일
- **지형 편집 (사용자 요청·순서 합의 2026-11-26).** 1·2단계 끝(2단계는 사용자 확인 대기), 3단계는 사용자 확인 뒤 시작.
  - **전체 순서:** ① 데이터 구조 전환(겉모습 변화 없음) → ② 높낮이(칸 단위 한 단씩 올리고 내리기, 지층 벽 자동) → ③ 재질 칠하기(잔디·모래·흙·돌·꽃밭, ¼칸 붓, Soup 텍스처 묶음에 모래 추가) → ④ 물 채우기(파낸 칸에 물, 둥글게 다듬은 연못) → ⑤ 저장(브라우저 저장소, 몇 KB). 단계마다 따로 커밋(그 단계만 되돌릴 수 있게)하고 사용자 확인받기(스크린샷 없이 사용자가 직접 확인).
  - **정한 방식 (사용자 결정 2026-11-26):** 지형 함수의 이름과 호출 방식은 유지하고 안에서 데이터를 읽는다. 데이터의 처음 값은 지금 규칙의 결과로 채운다. **연못은 4단계 전까지 기존 수식 `getPondSDF`(원 4개)를 그대로 쓴다**(12×12 칸으로는 지금의 둥근 모양을 똑같이 못 만듦). 연못을 칸 데이터로 바꾸는 것은 4단계.
  - **① 완료:** 1번 섹션의 `terrain`(`level`: `Int8Array(144)`, 인덱스 `gz * GRID_SIZE + gx`, 음수 허용 / `version`: 바뀔 때마다 증가). 처음 값은 `defaultHillLevel`(옛 언덕 규칙)로 `resetTerrainData()`가 채운다. `getHillLevel`은 섬 밖이면 0, 안이면 배열 값(정수 좌표만 받음, 지금 호출부는 모두 정수). 재질은 3단계에서 `terrain`에 필드를 더한다.
  - **검증 테스트 `tools/tests/terrain.mjs`:** 바꾸기 전에 기록한 `terrain-baseline.json`과 비교한다. 0.02 간격(섬 밖 0.5까지) `getContinuousTerrainHeight`·`getTurfHeight`·`getPondSDF`·`isPondWorld`의 실수 비트 해시, 칸마다 `getHillLevel`·`getTileElevation`·`isPondTile`, 씬 모든 메쉬의 지오메트리·인스턴스 행렬·캔버스 텍스처(`sdfTex`) 해시(`__mori.terrainDump`, `__mori.meshDigest`). 연기·먼지 같은 움직이는 것과 `Math.random` 입자는 빠진다. 일부러 칸 하나를 바꾸면 FAIL이 나는 것까지 확인했다. **2단계부터는 기본 섬이 바뀌는 게 목적이 아니므로 "편집 안 한 기본 섬은 그대로"인지 확인하는 데 쓰고, 기본 섬 자체를 바꾸는 결정이 나면 `BASELINE=1`로 두 번 돌려 다시 기록한다.**
  - **② 완료 (높낮이):** 하단 6번째 카테고리 '지형'(`CATEGORIES`의 `terrain`)에 `TERRAIN_TOOLS`(땅 올리기 `raise`, 땅 내리기 `lower`). `ITEM_DEFS`가 아니라서 모델·유령·`assetsById`가 없다(`terrainToolById`로 구분, 트레이 카드는 종이 위에 `GLYPHS` 그림 `.card-glyph`, 카테고리 토큰은 `terrain`). 클릭 → `editTerrainAt(gx, gz, dir)` → `terrain.level` ±1 → `rebuildTerrainSurface()` → `rebuildInstances()`(오브젝트·돌길·풀·조약돌·그림자 갱신). 범위 0~`TERRAIN_MAX`(3). 막는 규칙 `terrainEditAllowed`: 칸 중심 ±0.8(`TERRAIN_REACH`, 비탈이 이웃으로 0.28 들어감) 안에 연못 SDF < 0.1, 또는 그 안의 오두막·돌길·¼칸 소품 발밑 기울기(`rectDeviation`)가 지금보다 나빠지면(0.04 넘게) 막는다. 나무·울타리 같은 1칸 오브젝트는 평평한 칸 중심에 서서 함께 오르고, 자유 배치는 땅을 따른다. 오두막은 새로 놓을 때 상하좌우 이웃 칸이 같은 단이어야 한다(`canPlaceAtHit`). "처음 섬으로"(`populateStarterIsland`)는 지형도 기본으로(`terrainIsDefault` 아니면 `resetTerrainData` + 다시 만들기), "모두 비우기"는 오브젝트만. 커서는 올리기 초록·내리기 금색·막힘 빨강, 소리 `playTerrain`/`playTerrainBlocked`, 먼지·작은 흔들림. 키 6.
  - **다시 만드는 곳 `rebuildSurface`(`buildMiniatureIsland`가 돌려줌, 바깥 이름 `rebuildTerrainSurface`):** 메쉬는 그대로 두고 지오메트리만 바꾼다(`chunkTopSurface.children[0]` = 잔디 규칙 유지, 재질 공유라 해제 안 함). 잔디 윗면 `buildTurfGeometry`, 표토 `buildTopsoil`, 뿌리 `placeRoots`, 격자 오버레이 `fitGridHeights(gridGeo)`. 점토·암반·박힌 돌·물·연잎·안개는 높이와 무관해서 그대로. 표토는 3단 벽용 띠 두 개(1.18, 0.98)를 맨 위에 더 얹고 `buildStrataChunk`의 `jBase: 2`로 무늬 seed를 기존 번호에 맞춰, 기본 섬 벽(띠를 건너뜀)은 전과 똑같다(`terrain.mjs` 통과). 연못에 따라 달라지는 것(4단계): `sdfTex`(128² 캔버스, 물·격자 두 재질이 씀), `waterGeo`, 물 높이 `waterMesh.position.y = -0.09`(조립 `WATER_Y`가 읽음).
  - **편집 테스트 `tools/tests/terrain-edit.mjs`:** 올리고 내리면 섬 메쉬(`__mori.islandDigest`)와 높이 해시가 처음과 정확히 같은지, 연못·오두막 칸·0 아래·3 위 거부, 올린 칸 옆 오두막 거부, "처음 섬으로" 복구, 콘솔 오류 0. 훅 `terrainLevel`, `terrainVersion`, `terrainAllowed`, `hit`의 `wy`.
  - **남은 확인 (사용자):** 실기기에서 편집 한 번의 끊김(헤드리스는 측정 의미 없음), 3단 벽과 비탈의 생김새, 소리 느낌. 드래그로 여러 칸 칠하기는 아직 없다(클릭 한 번에 한 칸).
  - **위치를 직접 적어 둔 곳 (연못 관련은 4단계):** `rebuildInstances`의 물가 풀 (C)와 물가 조약돌이 연못 중심 (2.35, 2.35)에서 바깥으로 훑는다. 연잎 3개 좌표(1.9,2.0 / 3.1,2.3 / 2.3,3.0), 연못 안개 `pondMist` (2.3, 2.3) 5.6 크기. `getPondSDF`의 원 4개 중심·반지름. 높이와 관련된 것: `LAYER_EDGE`(층 윗면 y와 반폭, 윗층 y 0.0은 섬 바닥 높이라 언덕 편집과 무관), 시작 섬 배치 `populateStarterIsland`(나무·오두막 칸 좌표가 언덕 모양을 전제). 시작 조립의 연못 등장(`IT.water`)은 `waterMesh`·`lilyParts`를 그대로 쓴다.
  - **이후 단계 메모:** 3단계 재질 칠하기는 같은 '지형' 카테고리에 도구를 더하고 `terrain`에 재질 배열을 더한 뒤 `turfColor`가 읽게 한다. 4단계 물은 `level` 음수(0 아래 파기)와 물 칸, 물에 잠긴 오브젝트 막기·지우기, 연못 SDF를 칸 데이터 거리장으로(위 '연못 관련' 고정 좌표도 함께). 성능: 편집 때만 다시 만들고 평소 프레임 비용 변화 없음. 배치 규칙(`snapRectBlocked`, `shoreOk`, `isBlockedForPoint`, `canPlaceAtHit`)과 선착장은 지형 함수를 쓰므로 데이터를 따라온다.
- **굴뚝 연기 (사용자 확인 끝, 2026-11-26):** 사용자 지적(조립 중 잔존, 증기기관차 같은 분출, 불투명, 회색 안쪽·아랫면)을 고친 `4921259`에 "좋네요" 답을 받았다. 다시 지적이 없으면 건드리지 않는다. 실기기 프레임만 미확인.
- **배경(하늘) 품질 높이기 (적용했다가 취소, 2026-11-26):** ①②를 커밋하고(`6343b86`, `f7dbb69`) ⑥을 손보던 중 사용자가 전부 취소하고 복구해 달라고 해서 게임 코드를 작업 전(`eba554c`) 상태로 되돌렸다(`0721c72`). 취소 이유는 듣지 않았다. 사용자가 먼저 꺼내지 않으면 다시 시작하지 않는다. 아래는 작업 전의 분석과 제안이다.
  - 지금 하늘: atmo 패스의 `getSky(uv)` 하나. 화면 y 기준 `uSkyBottom`→`uSkyTop` 2색 그라데이션 + 밤 해시 별. 색은 `ATMOSPHERES`의 `skyTop`/`skyBottom`.
  - 확인한 문제: 낮은 아래가 거의 흰색이라 섬 아래 윤곽이 녹음. 노을은 흙 지층과 같은 주황이고 `nightFactor 0.48 > 0.35`라 흐린 별이 먼지처럼 뜸. 밤 별은 크기·색이 균일해 반딧불이와 구분 안 되고 바탕이 불빛에 비해 밝은 남색. 카메라 회전·기울임에 하늘이 반응하지 않아 86°에서도 지평선 그라데이션이 남음. 구름·해달·지평선 빛 없음.
  - Cinderwatch: 하늘을 안 그림. 거의 검은 클리어 컬러 + 진한 비네팅(0.55) + 암부 리프트 + 28단계 Bayer 디더.
  - 제안("동화책 배경막", 미니어처 뒤의 그림 배경막): ① 섬 뒤 타원 후광 + 모서리 어둡게 ② `camElev`가 낮을수록 올라오는 지평선 빛띠 ③ 주광 방향 쪽 은은한 빛 번짐(`orbitAngle`) ④ 2~3단 톤 납작한 vnoise 구름(디더 경계, 회전하면 흐름) ⑤ 씬 픽셀 1개짜리 별, 밝기·색 다양, 몇 개만 십자, 노을엔 없음, 회전하면 함께 돎 ⑥ 낮 파우더 블루→크림, 노을 남보라→복숭아→금빛, 밤 거의 검은 남색. 순서 ①②⑥ → ⑤ → ③ → ④, 단계마다 커밋. `--halo`·`--scrim`도 새 하늘에 맞춤.
  - 취소 전에 받은 답: 동화책 배경막, 해·달은 원반 없이 빛 번짐만, 구름 없음. 다시 하게 되면 확인부터 한다.
  - 지킬 것: 화면 기준이라 1픽셀 정렬·`uDitherOfs`와 맞춤. 별·구름은 pan에는 안 움직이고 회전에만 반응. 씬이 가린 픽셀은 `getSky`를 건너뜀(이미 적용). 픽셀당 몇 번 연산(Iris Xe).
- 명세서 미완: 1픽셀 외곽선·샤픈 후처리.
- **시작 화면 확인 필요:** 실제 노트북에서 조립 중 프레임(그림자를 매 프레임 갱신하는 약 4초 동안 자동 해상도가 떨어지는지), 소리 느낌, 페이드 길이, 반짝임 크기(낮에는 작게 보임). 만화식 직선 임팩트 라인은 사용자와 합의해 넣지 않음.
- **새로고침 뒤 소리 (끝, 2026-11-26):** 사용자가 해결됐다고 확인함. 소리 켜기 재시도와 소리 버튼 처리 수정(`sound-unlock.mjs`)이 남아 있다.
- **확대 선명도 (끝, 2026-11-26):** 원인은 렌더링이 아니라 재료였다(두 게임 모두 화면 기준 저해상도. 안개·블룸·DoF·해상도를 하나씩 꺼 봐도 근본 차이 없음). 측정: Cinderwatch는 draw call 116, 삼각형 약 67만(그림자 포함)으로 Mori(59, 약 5만)보다 훨씬 많이 그려도 가볍다. 저해상도라 비용이 픽셀에 묶이기 때문이다. 카메라 고정은 성능과 무관하다.
  - 완료: 각진 로우폴리 지형 + 잔디 결, 층층이 턱진 지층, 조약돌 길(위 '지형' 항목).
  - 완료: 바위·모닥불을 `Soup`로. 나무·꽃·갈대·버섯은 적층 유지(사용자 결정). 적층이 남아 있으니 카메라 30° 하한도 그대로.
  - 참고: 낮의 높이 안개·바닥 안개가 지층 벽을 회색으로 덮는다(사용자는 안개가 원인이 아니라고 봄, 건드리지 않음). 실기기 프레임은 `#fps=1`로 확인 필요.
  - 헤드리스 기본 화면 1000×640은 내부 해상도가 실제 노트북의 절반쯤이다. 디테일 확인은 `W=1600 H=900` 환경변수로 크게 찍는다.
- **오브젝트 늘리기** (목록은 사용자 확인 완료, 생활 소품·건물 완료. 나무·식물, 길·담, 자연 소품 남음. 지형 편집 뒤에 이어서). 한 카테고리씩 만들고 스크린샷으로 확인한 뒤 커밋. 생활 소품 5종 완료(2026-11-26, 물건마다 커밋, 사용자 생김새 확인 대기). 다음 카테고리는 미정. 디테일이 중요하다고 사용자가 강조함(부품 어긋남, 재질 구분, 불빛 반사). 구조물은 `SOUP_ITEMS`, 울타리도 조립 방식으로 다시 만들고, 나무·덤불·꽃은 적층. 새 적층 오브젝트와 기존 적층 아이콘도 실제 모델 아이콘으로.

  | 카테고리 | 추가할 것 |
  | --- | --- |
  | 건물 | 완료: 장작 창고, 우물, 풍차(작은 크기, 도는 날개). 작은 다리는 선착장으로 대체(사용자 결정 2026-11-26: 연못이 폭 약 3칸의 둥근 덩어리라 짧은 다리 자리가 없음). 선착장은 `def.shore`(land·water 로컬 네모) 규칙으로 물가에만 놓이고 `shorePlacement`가 근처 위치·방향을 찾아 물 쪽으로 돌린다. 높이는 `snapGroundY`(땅 쪽 끝 기준) |
  | 나무·식물 | 자작나무, 벚나무, 덤불, 그루터기, 텃밭 |
  | 길·담 | 돌담, 징검다리, 나무 계단 |
  | 생활 소품 | 완료: 장작더미, 우편함, 손수레, 빨랫줄, 화분(자유 배치) |
  | 자연 소품 | 조약돌, 쓰러진 통나무, 연잎, 고사리 |

- 오브젝트가 많아지면 할 최적화 후보: 불빛 후광(하나당 draw call 1개) 묶기, 조립 오브젝트(종류당 1개 + 그림자 1개) 합치기.
- 제안만 했고 결정 안 난 것: 섬 받침대의 "Mori Isle" 황동 명판(3D), 섬 배치 저장, Cinderwatch식 불빛 감쇠.
- Cinderwatch에서 가져올 후보(사용자와 논의됨): 계절 테마(눈·낙엽 덮기 셰이더), 높이 텍스처 표면 요철, 감상 모드 자동 카메라, 안정성(소리 설정 기억, WebGL 컨텍스트 복구, 모션 줄이기 설정), 파일 분할 + 빌드 스크립트.
- 직접 확인 필요로 남은 것: 실제 노트북 프레임(`#fps=1`, 예전 적층 비교는 `#stack=1`), 소리 느낌, 밤 밝기, WASD 이동 속도, UI 호버 손맛, 휴대폰 크기 화면.
