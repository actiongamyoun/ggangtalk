# 깡통톡 (Ggangtong Talk) 📞

게임할 때 친구들과 **단체 음성통화**만 하는 앱. 채팅 없음, 통화만.

- 한 방에 5~8명 동시 통화
- 폰 + PC 섞여 있어도 OK (브라우저만 있으면 됨)
- 입장하면 마이크 자동 켜짐, 누가 말하면 테두리가 빛남
- 6자리 방 코드로 입장
- PWA (홈 화면에 설치 가능)

## 작동 방식

- **WebRTC mesh** — 방 안의 사람들끼리 직접(P2P) 음성 연결. 중계 서버 없이 무료.
- **시그널링** — Supabase Realtime broadcast 채널. **DB 테이블/RLS 설정 전혀 필요 없음.**
- **STUN** — 구글 무료 STUN. 집 와이파이는 대부분 잘 붙음.

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

- **8명은 mesh의 거의 한계선**. 음성은 가벼워서 보통 괜찮지만, 누군가 와이파이가
  약하면 그 사람만 끊길 수 있음. 5~6명일 때 가장 안정적.
- **일부 모바일망(LTE/5G)** 에선 직접연결이 막혀 통화가 안 붙을 수 있음.
  그땐 `src/hooks/useVoiceRoom.js` 의 `ICE_SERVERS` 에 TURN 서버를 추가해야 함.
- 마이크 권한 때문에 **https(또는 localhost)** 에서만 동작함. Vercel은 자동 https라 OK.
