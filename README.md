# 깡톡 (Ggangtok) 📞

게임할 때 친구들과 **단체 음성통화**만 하는 앱. 채팅 없음, 통화만.

- 한 방에 5~8명 동시 통화
- 폰 + PC 섞여 있어도 OK (브라우저만 있으면 됨)
- 입장하면 마이크 자동 켜짐, 말하면 캐릭터에 이퀄라이저·테두리 효과
- 방 만들면 8자리 코드 자동 생성(직접 못 정함 → 중복 방지), 코드가 비밀번호 역할
- PWA (홈 화면에 설치 가능)

## 작동 방식

- **WebRTC mesh** — 방 안의 사람들끼리 직접(P2P) 음성 연결.
- **시그널링** — Supabase Realtime broadcast 채널. **DB 테이블/RLS 설정 전혀 필요 없음.**
- **STUN + 무료 TURN** — 구글 STUN + Open Relay 무료 TURN(계정 불필요)을 기본 탑재.
  직접연결이 안 되는 모바일망에서도 TURN이 음성을 중계해 연결 성공률을 높임.
- **캐릭터 8종** — 입장할 때 졸라맨 캐릭터를 골라 표시.
- **이퀄라이저 게이지** — 말하면 막대가 음량 따라 출렁임.
- **자동 정리** — 누가 나가거나 탭을 닫으면 방에서 즉시 사라짐. 연결이 끝내 안 되면 "연결 실패" 표시.

## 준비물 (단 2개)

Supabase 프로젝트의 **URL**과 **anon key**만 있으면 됨.
(대시보드 → Project Settings → API)

`.env` 파일을 만들어서 아래처럼 채운다:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

> Vercel에 올릴 땐 위 두 개를 **Environment Variables**에 등록하면 됨.
> (빌드 시점에 박히니까, 값 바꾸면 재배포 필요)

## 실행

```bash
npm install
npm run dev      # 로컬 테스트 (https 아니면 마이크 권한 주의)
npm run build    # 배포용 빌드 (dist/)
```

## 배포 (Vercel)

1. GitHub에 이 폴더 올리기
2. Vercel에서 Import → Framework: **Vite** 자동 인식
3. Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가
4. Deploy

## 알아둘 점

- **닉네임 중복 차단:** 방에 이미 있는 이름과 같으면 입장이 막히고 다른 이름을 입력하라고 안내함.
- **8명은 mesh의 거의 한계선**. 음성은 가벼워서 보통 괜찮지만, 누군가 와이파이가
  약하면 그 사람만 끊길 수 있음. 5~6명일 때 가장 안정적.
- **일부 모바일망(LTE/5G)** 에선 직접연결이 막힐 수 있는데, 무료 TURN이 기본 탑재돼
  대부분 해결됨. 그래도 안 붙으면 무료 TURN 한도/상태 문제일 수 있으니
  `src/hooks/useVoiceRoom.js` 의 `ICE_SERVERS` 를 Cloudflare/Metered 무료 TURN으로 교체.
- 마이크 권한 때문에 **https(또는 localhost)** 에서만 동작함. Vercel은 자동 https라 OK.
- **모바일 백그라운드 제약(중요):** 웹앱이라 폰에서 다른 앱(게임)을 앞에 띄우면 통화가
  끊길 수 있음. 특히 iOS는 백그라운드 탭을 잠재워서 마이크/오디오가 멈춤. 안드로이드도
  보장 안 됨. **권장: 통화는 다른 기기에서 앞에 띄워두고 쓰기**(게임=폰/콘솔, 통화=다른 폰/PC).
  같은 폰 백그라운드가 꼭 필요하면 Capacitor 네이티브 래핑(안드로이드 포그라운드 서비스 /
  iOS VoIP 백그라운드 모드)이 필요함.
