# 오늘의파티룸 — 홈페이지 소스 (GitHub → Cloudflare Pages)

오늘·내일 비는 파티룸을 당일·전날 할인으로 연결하는 플랫폼의 전체 코드입니다.
게스트 사이트(검색노출용 서버 렌더링), 호스트센터, 관리자, 딜 엔진이 한 저장소에 들어 있고,
**Cloudflare Pages + Pages Functions + D1** 만으로 돌아갑니다. 터미널 없이 브라우저만으로 배포할 수 있습니다.

```
todaypartyroom/
├─ public/            정적 파일 (CSS·JS·이미지·robots.txt). Pages 빌드 출력 폴더
│  ├─ assets/         app.css(게스트), console.css(호스트·관리자), guest.js, host.js, admin.js
│  └─ _routes.json    정적 파일은 Functions를 거치지 않도록 하는 설정
├─ functions/         서버 코드 (Cloudflare Pages Functions, 파일 경로 = URL)
│  ├─ index.js        홈
│  ├─ [[path]].js     지역 허브(/seoul/mapo/hongdae), sitemap.xml, 404
│  ├─ deals/, events.js, theme/, space/, magazine/, host/, admin/, me.js, help.js …
│  └─ api/            JSON API (게스트·호스트·관리자)
├─ lib/               공통 로직 (딜 엔진 deals.js, 인증 auth.js, 레이아웃 html.js …)
├─ schema.sql         D1 테이블 + 기본 설정 + 지역·테마 시드 (원본. 관리자 'DB 준비하기'가 lib/schema-sql.js로 실행)
└─ seed_demo.sql      샘플 공간 3곳 (원본. 관리자 화면에서 넣고 지울 수 있음)
```

---

## 1. 배포 순서 (브라우저만 사용)

### A. GitHub 저장소에 올리기
1. GitHub 로그인 → **New repository** → 이름 예: `todaypartyroom` → Private → Create.
2. 저장소 화면에서 **Add file → Upload files**.
3. 이 ZIP을 압축 해제한 뒤, 안에 있는 **폴더와 파일 전체**(`public`, `functions`, `lib`, `schema.sql`, `seed_demo.sql`, `README.md`, `.gitignore`)를 드래그해서 올립니다.
   - 폴더째 드래그하면 하위 파일까지 올라갑니다. `[[path]].js`처럼 대괄호가 있는 파일명도 그대로 유지돼야 합니다.
4. **Commit changes**.

### B. Cloudflare Pages 프로젝트 만들기
1. Cloudflare 대시보드 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. 위 저장소 선택 → 빌드 설정:
   - Framework preset: **None**
   - Build command: **(비워 둠)**
   - Build output directory: **`public`**
3. **Save and Deploy**. (첫 배포는 D1이 없어서 "설정이 필요합니다" 화면이 나옵니다. 정상입니다.)

### C. D1 데이터베이스 만들기
1. 대시보드 → **Storage & Databases → D1 SQL Database** → **Create** → 이름 `todaypartyroom`.
2. 테이블은 여기서 만들지 않습니다. D1 콘솔은 한 줄 입력칸이라 schema.sql을 붙여넣으면 주석 때문에 실행되지 않습니다.
   테이블 생성은 아래 F단계에서 관리자 화면의 **DB 준비하기** 버튼으로 합니다.

### D. Pages 프로젝트에 바인딩·환경변수 연결
Pages 프로젝트 → **Settings** →

**Bindings**
| 종류 | Variable name | 값 |
|---|---|---|
| D1 database | `DB` | 위에서 만든 `todaypartyroom` |
| R2 bucket (선택) | `IMAGES` | 사진 업로드용 버킷. 없으면 호스트가 사진 URL을 붙여넣는 방식으로 동작 |

**Environment variables** (Production에 추가)
| 이름 | 값 | 설명 |
|---|---|---|
| `SESSION_SECRET` | 아무 긴 임의 문자열(40자 이상) | 로그인 쿠키 서명 키. 비밀번호 생성기로 만드세요. 바꾸면 전원 로그아웃됩니다 |
| `SITE_URL` | `https://todaypartyroom.kr` 처럼 최종 주소 | 사이트맵·공유 링크·구조화 데이터에 쓰입니다. 도메인 연결 전엔 `https://프로젝트명.pages.dev` |

**Functions → Compatibility date**: 최신 날짜로 설정(그대로 두어도 됩니다).

### E. 다시 배포
**Deployments** 탭 → 최근 배포의 **⋯ → Retry deployment** (또는 GitHub에서 아무 파일이나 수정·커밋). 바인딩은 재배포 후 적용됩니다.

### F. DB 준비 + 최초 관리자 만들기
1. `https://사이트주소/admin` 접속 → **DB 준비하기** 화면이 나옵니다.
2. 화면 확인용 샘플(공간 3곳·매거진 글 1개)이 필요하면 체크한 채로 **DB 준비하기**를 누릅니다. 테이블 20개와 지역·테마·기본 설정이 만들어집니다.
   - 샘플 호스트 로그인: `demo@todaypartyroom.kr` / `demo1234!` (호스트센터 `/host/app`)
3. 이어서 **최초 관리자 만들기** 화면에서 이메일·비밀번호(10자 이상)를 입력합니다. 이 화면은 관리자가 없을 때 한 번만 나옵니다.
4. 실제 오픈 전에는 **관리자 → 설정 → DB 관리 → 샘플 데이터 삭제**를 누르세요.
5. 나중에 코드가 업데이트되어 테이블이 추가되면 같은 곳의 **DB 점검·업데이트**를 누르면 됩니다(기존 데이터는 그대로 유지).

### G. 기본 설정 입력 (관리자 → 설정)
- 회사명·사업자 정보·문의 이메일·카카오톡 채널 링크 (푸터와 고객센터에 표시)
- 요금 문구, 무료 체험 일수(기본 30, 0이면 없음), 입금 계좌 안내(정기결제 연동 전 수동 확인용)
- 공휴일 목록(주말 요금 적용 기준), 편의시설 목록, 함께하는 사이트 링크
- 지역·테마는 **지역 / 테마** 메뉴에서 추가·수정 (상권 설명과 FAQ는 검색노출용 허브 페이지에 들어갑니다)

### H. 도메인 연결
Pages 프로젝트 → **Custom domains** → 도메인 추가 → 안내대로 DNS 설정. 연결 후 `SITE_URL`을 최종 주소로 바꾸고 재배포합니다.

### I. 검색엔진 등록
- **네이버 서치어드바이저**: 사이트 등록 → 소유 확인(HTML 태그 방식이면 `lib/html.js`의 `<head>`에 메타태그 한 줄 추가) → 사이트맵 `https://사이트주소/sitemap.xml` 제출 → 핵심 허브 URL 수집 요청.
- **구글 서치콘솔**: 동일하게 등록 후 사이트맵 제출.
- 분석 도구(GA4·네이버 애널리틱스) 스크립트는 `lib/html.js`의 `layout()` 안 `<head>`에 붙이면 전 페이지에 적용됩니다.

---

## 2. 운영 흐름

1. 호스트가 `/host`에서 가입 → 호스트센터(`/host/app`)에서 공간 등록(기본정보·사진·요금·예약채널) → **검수 제출**.
2. 관리자 **검수** 메뉴에서 승인 → 공개되며 무료 체험이 시작됩니다(체험 일수는 설정값).
3. 호스트가 **공실 캘린더**에서 비는 칸을 표시하고 **자동 할인**을 켜 두면, 전날·당일에 할인 딜이 자동으로 노출됩니다. 타임딜·핫딜·반짝딜·이벤트는 **딜** 탭에서 1분 안에 만듭니다.
4. 게스트는 지역을 골라 오늘·내일 비는 곳을 보고 "예약하기"로 호스트 채널(네이버 예약·전화·카카오톡)로 이동합니다. 딜 전용 링크가 없으면 휴대폰 번호로 **딜 코드**가 발급되고, 호스트는 **딜 코드** 탭에서 사용 처리합니다.
5. 체험이 끝나면 호스트가 **구독** 탭에서 입금 후 "결제 요청" → 관리자 **신고·문의**에서 확인 → 해당 공간 상세에서 **+N개월 활성화**.

주요 주소
| 주소 | 내용 |
|---|---|
| `/` | 홈 (지역 선택, 오늘·내일 딜) |
| `/seoul/mapo/hongdae` | 상권 허브 (검색노출 핵심) |
| `/deals/today` `/deals/tomorrow` `/deals/time` `/deals/hot` `/deals/flash` `/events` | 딜 허브 |
| `/theme/birthday` 등 | 테마 허브 |
| `/space/{slug}` · `/space/{slug}/deal/{id}` | 공간 상세 · 딜 상세(공유용) |
| `/host` · `/host/app` | 호스트 모집 · 호스트센터 |
| `/admin` | 관리자 |
| `/me` | 게스트 마이(받은 코드·알림) |
| `/sitemap.xml` `/robots.txt` | 검색엔진용 |

---

## 3. 아직 연동되지 않은 것 (연결 지점)

| 기능 | 현재 동작 | 연결할 곳 |
|---|---|---|
| 카카오 알림톡·문자·이메일 발송 | 구독 조건은 저장되고 관리자 **알림 구독** 메뉴에서 목록을 볼 수 있음. 실제 발송은 안 됨 | 알림톡(발신프로필·템플릿 승인 후) 또는 이메일 API를 `functions/api/claim.js`(코드 발급 시)와 딜 생성 시점에 호출. 구독자 조회는 `alert_subs` 테이블 |
| 카드 정기결제 | 계좌이체 후 호스트가 "결제 요청" → 관리자가 수동 활성화 | 토스페이먼츠 빌링 등 PG 연동 시 `functions/api/host/spaces/[id]/subscription.js`와 `functions/api/admin/spaces/[id].js`의 `extend` 로직 사용 |
| 휴대폰 본인인증(SMS) | 딜 코드는 번호 입력만으로 발급 | 문자 인증 API를 `functions/api/claim.js` 앞단에 추가 |
| 사진 업로드 | R2 바인딩(`IMAGES`)이 있으면 업로드, 없으면 URL 입력 | `functions/api/upload.js`, 서빙은 `functions/img/[[key]].js` |
| 네이버 예약·구글 캘린더 공실 자동 반영 | 호스트가 캘린더에서 직접 표시 | iCal 피드 읽어 `vacancies`에 반영하는 작업 추가 |
| 리뷰 | 미구현(테이블 `reviews`는 준비됨) | 공간 상세 `functions/space/[slug].js`에 섹션 추가 |
| 지도 표시 | 주소 텍스트 + "네이버 지도에서 보기" 링크 | 네이버/카카오 지도 API 키 발급 후 상세 페이지에 삽입 |

---

## 4. 자주 묻는 문제

- **"D1 바인딩(DB)이 설정되지 않았습니다"** → D단계 바인딩 변수명이 정확히 `DB`인지, 재배포했는지 확인.
- **"DB가 아직 준비되지 않았습니다"** → `/admin`에서 **DB 준비하기**를 누르세요. 확인은 D1 콘솔에서 `/tables` 입력.
- **사진 업로드 시 "이미지 저장소(R2)가 연결되지 않았습니다"** → R2 버킷을 만들고 바인딩 `IMAGES` 추가 후 재배포. 또는 URL 입력 방식 사용.
- **공유 링크·사이트맵 주소가 `pages.dev`로 나옴** → `SITE_URL` 환경변수를 최종 도메인으로 바꾸고 재배포.
- **로그인이 자꾸 풀림** → `SESSION_SECRET`을 바꾸면 기존 로그인이 모두 무효화됩니다. 한 번 정하면 유지하세요.
- **지역 허브가 검색에 안 잡힘** → 공간 수가 설정의 "색인 허용 최소 공간 수"보다 적으면 `noindex`로 나갑니다. 호스트가 채워지면 자동 해제됩니다.

## 5. 수정·업데이트
GitHub에서 파일을 수정하고 커밋하면 Cloudflare Pages가 자동으로 다시 배포합니다. 문구·색상은 `public/assets/app.css`와 `lib/html.js`, 약관·고객센터 문구는 `lib/pages-static.js`, 지역·테마·설정값은 관리자 화면에서 바꿀 수 있습니다.
