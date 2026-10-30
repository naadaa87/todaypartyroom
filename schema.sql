-- =====================================================================
-- 오늘의파티룸 D1 스키마 v1.0
-- Cloudflare D1 콘솔에 전체를 붙여넣고 실행하세요. (오류가 나면 섹션별로 나누어 실행)
-- =====================================================================

-- 1) 지역 (시 > 구 > 상권)
CREATE TABLE IF NOT EXISTS regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,              -- 'si' | 'gu' | 'area'
  parent_id INTEGER,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  faq_json TEXT DEFAULT '[]',
  sort INTEGER DEFAULT 0,
  indexable INTEGER DEFAULT 1,
  UNIQUE(parent_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_regions_parent ON regions(parent_id);

-- 2) 테마(용도)
CREATE TABLE IF NOT EXISTS themes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  sort INTEGER DEFAULT 0
);

-- 3) 호스트
CREATE TABLE IF NOT EXISTS hosts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,               -- 상호
  phone TEXT NOT NULL,
  biz_no TEXT DEFAULT '',
  representative TEXT DEFAULT '',
  status TEXT DEFAULT 'active',     -- active | suspended
  created_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- 4) 공간
CREATE TABLE IF NOT EXISTS spaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  host_id INTEGER NOT NULL,
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  intro TEXT DEFAULT '',
  description TEXT DEFAULT '',
  address TEXT DEFAULT '',
  address_detail TEXT DEFAULT '',
  lat REAL, lng REAL,
  region_id INTEGER,                -- area 레벨
  capacity_std INTEGER DEFAULT 4,
  capacity_max INTEGER DEFAULT 10,
  area_m2 REAL,
  floor_info TEXT DEFAULT '',
  parking TEXT DEFAULT '',
  amenities_json TEXT DEFAULT '[]',
  rules TEXT DEFAULT '',
  refund_policy TEXT DEFAULT '',
  transport TEXT DEFAULT '',
  deposit_text TEXT DEFAULT '',
  booking_type TEXT DEFAULT 'link', -- link | tel | kakao | web
  booking_url TEXT DEFAULT '',
  booking_tel TEXT DEFAULT '',
  booking_kakao TEXT DEFAULT '',
  deal_link TEXT DEFAULT '',
  photos_json TEXT DEFAULT '[]',
  status TEXT DEFAULT 'draft',      -- draft | pending | revision | approved | rejected | hidden
  review_note TEXT DEFAULT '',
  subscription_status TEXT DEFAULT 'none', -- none | trial | active | past_due | cancelled
  subscription_until TEXT,
  views INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_spaces_host ON spaces(host_id);
CREATE INDEX IF NOT EXISTS idx_spaces_region ON spaces(region_id, status);

CREATE TABLE IF NOT EXISTS space_themes (
  space_id INTEGER NOT NULL,
  theme_id INTEGER NOT NULL,
  PRIMARY KEY (space_id, theme_id)
);

-- 5) 슬롯(판매 시간 단위)
CREATE TABLE IF NOT EXISTS slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  kind TEXT DEFAULT 'package',      -- package | hourly
  start_time TEXT NOT NULL,         -- 'HH:MM'
  end_time TEXT NOT NULL,           -- 'HH:MM' (시작보다 작으면 익일)
  price_weekday INTEGER NOT NULL,
  price_weekend INTEGER NOT NULL,
  base_people INTEGER DEFAULT 4,
  extra_fee INTEGER DEFAULT 0,
  sort INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_slots_space ON slots(space_id);

CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_id INTEGER NOT NULL,
  old_weekday INTEGER, old_weekend INTEGER,
  new_weekday INTEGER, new_weekend INTEGER,
  changed_at TEXT DEFAULT (datetime('now'))
);

-- 6) 공실 캘린더 (행이 없으면 '미정')
CREATE TABLE IF NOT EXISTS vacancies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,
  slot_id INTEGER NOT NULL,
  date TEXT NOT NULL,               -- 'YYYY-MM-DD'
  status TEXT NOT NULL,             -- vacant | booked | closed
  source TEXT DEFAULT 'manual',
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(space_id, slot_id, date)
);
CREATE INDEX IF NOT EXISTS idx_vac_date ON vacancies(date, status);

-- 7) 오토딜 규칙 (공간당 1개)
CREATE TABLE IF NOT EXISTS auto_rules (
  space_id INTEGER PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  tomorrow_rate INTEGER DEFAULT 15,
  today_rate INTEGER DEFAULT 25,
  steps_json TEXT DEFAULT '[]',     -- [{"from":"14:00","rate":35}]
  floor_json TEXT DEFAULT '{}',     -- {"slot_id": 90000}
  exclude_days_json TEXT DEFAULT '[]',   -- [5,6] (0=일)
  exclude_slots_json TEXT DEFAULT '[]',  -- [slot_id]
  exclude_from TEXT, exclude_to TEXT,
  monthly_cap INTEGER DEFAULT 20,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 8) 딜
CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,
  type TEXT NOT NULL,               -- TODAY | TOMORROW | TIME | HOT | FLASH | EVENT
  origin TEXT DEFAULT 'MANUAL',     -- AUTO | MANUAL
  targets_json TEXT NOT NULL,       -- [{"date":"2026-10-30","slot_id":3}]
  discount_mode TEXT DEFAULT 'RATE',-- RATE | AMOUNT | FIXED
  discount_value INTEGER DEFAULT 0,
  floor_price INTEGER DEFAULT 0,
  quantity INTEGER,                 -- NULL = 무제한
  claimed INTEGER DEFAULT 0,
  starts_at TEXT NOT NULL,          -- ISO(KST 기준 문자열 'YYYY-MM-DDTHH:MM')
  ends_at TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',     -- SCHEDULED | ACTIVE | ENDED
  end_reason TEXT,
  benefit_text TEXT DEFAULT '',
  deal_link TEXT DEFAULT '',
  title TEXT DEFAULT '',
  base_price_snapshot TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_deals_space ON deals(space_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_ends ON deals(status, ends_at);

-- 9) 딜 받기(코드)
CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id INTEGER NOT NULL,
  space_id INTEGER NOT NULL,
  phone TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  slot_id INTEGER, date TEXT,
  price INTEGER, base_price INTEGER,
  issued_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT,
  used_at TEXT,
  status TEXT DEFAULT 'issued'      -- issued | used | expired
);
CREATE INDEX IF NOT EXISTS idx_claims_space ON claims(space_id, status);
CREATE INDEX IF NOT EXISTS idx_claims_phone ON claims(phone);

-- 10) 딜 알림 구독
CREATE TABLE IF NOT EXISTS alert_subs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact TEXT NOT NULL,            -- 휴대폰 또는 이메일
  channel TEXT DEFAULT 'kakao',     -- kakao | email | push
  regions_json TEXT DEFAULT '[]',
  days_json TEXT DEFAULT '[]',
  timeband TEXT DEFAULT '',
  size INTEGER,
  types_json TEXT DEFAULT '[]',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 11) 신고·문의
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,               -- deal_unfulfilled | content | inquiry | other
  target_type TEXT, target_id INTEGER,
  contact TEXT DEFAULT '',
  content TEXT NOT NULL,
  status TEXT DEFAULT 'open',       -- open | resolved
  admin_note TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- 12) 관리자
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT DEFAULT '',
  role TEXT DEFAULT 'owner',        -- owner | ops | content
  created_at TEXT DEFAULT (datetime('now'))
);

-- 13) 설정 (코드 수정 없이 바꾸는 값)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 14) 매거진
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  body TEXT DEFAULT '',             -- 단락은 빈 줄로 구분, '## '로 소제목
  category TEXT DEFAULT 'guide',
  region_id INTEGER,
  published INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 15) 리뷰 (2차 — 테이블만 준비)
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,
  phone TEXT,
  claim_id INTEGER,
  rating INTEGER,
  body TEXT DEFAULT '',
  photos_json TEXT DEFAULT '[]',
  sponsored INTEGER DEFAULT 0,
  status TEXT DEFAULT 'visible',
  created_at TEXT DEFAULT (datetime('now'))
);

-- 16) 이벤트 로그(통계)
CREATE TABLE IF NOT EXISTS event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,               -- view_space | click_deal | claim | click_channel | subscribe
  space_id INTEGER, deal_id INTEGER, region_id INTEGER,
  channel TEXT, source TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_event_space ON event_log(space_id, type, created_at);

-- =====================================================================
-- 기본 설정값
-- =====================================================================
INSERT OR IGNORE INTO settings(key, value) VALUES
 ('site_name', '오늘의파티룸'),
 ('site_tagline', '오늘 비는 파티룸, 오늘 가장 싸게'),
 ('company_name', '(회사명을 입력하세요)'),
 ('company_info', '사업자등록번호 000-00-00000 | 대표 홍길동 | 서울특별시 ○○구 ○○로 00'),
 ('contact_email', 'hello@example.com'),
 ('contact_kakao', ''),
 ('host_fee_text', '월 30,000원 (하루 1,000원) · 수수료 0원'),
 ('trial_days', '30'),
 ('index_min_spaces', '1'),
 ('deal_cutoff_minutes', '60'),
 ('holidays', '["2026-01-01","2026-02-16","2026-02-17","2026-02-18","2026-03-01","2026-03-02","2026-05-05","2026-05-24","2026-05-25","2026-06-06","2026-08-15","2026-08-17","2026-09-24","2026-09-25","2026-09-26","2026-10-03","2026-10-05","2026-10-09","2026-12-25","2027-01-01","2027-02-05","2027-02-06","2027-02-07","2027-02-08","2027-03-01","2027-05-05","2027-05-13","2027-06-06","2027-06-07","2027-08-15","2027-08-16","2027-09-14","2027-09-15","2027-09-16","2027-10-03","2027-10-04","2027-10-09","2027-10-11","2027-12-25","2027-12-27"]'),
 ('footer_links', '[]'),
 ('amenities', '["주방","냉장고","전자레인지","노래방","빔프로젝터","TV","블루투스 스피커","보드게임","콘솔게임","와이파이","에어컨","루프탑","복층","주차","엘리베이터","흡연구역","화장실(내부)","무인출입"]'),
 ('bank_account', '(입금 계좌를 입력하세요)');

-- =====================================================================
-- 테마
-- =====================================================================
INSERT OR IGNORE INTO themes(slug, name, description, icon, sort) VALUES
 ('birthday', '생일파티', '생일 축하 모임에 맞는 파티룸', '🎂', 1),
 ('bridal-shower', '브라이덜샤워', '브라이덜샤워·베이비샤워 장소', '💐', 2),
 ('year-end', '송년회·회식', '송년회, 팀 회식, 모임 뒤풀이', '🥂', 3),
 ('workshop', '워크숍·모임', '소규모 워크숍, 스터디, 동호회', '📋', 4),
 ('all-night', '올나잇', '밤부터 아침까지 이용하는 올나잇 파티룸', '🌙', 5),
 ('game', '게임·보드게임', '콘솔·보드게임이 갖춰진 공간', '🎮', 6),
 ('kids', '키즈파티', '아이 생일·가족 모임', '🎈', 7),
 ('rooftop', '루프탑·뷰', '루프탑, 전망이 좋은 공간', '🌆', 8),
 ('photo', '촬영·파티세팅', '사진이 잘 나오는 세팅 공간', '📷', 9);

-- =====================================================================
-- 지역 (시 > 구 > 상권) — 관리자에서 추가·수정 가능
-- =====================================================================
INSERT OR IGNORE INTO regions(id, level, parent_id, slug, name, sort) VALUES
 (1,'si',NULL,'seoul','서울',1),
 (2,'si',NULL,'gyeonggi','경기',2),
 (3,'si',NULL,'incheon','인천',3),
 (4,'si',NULL,'busan','부산',4),
 (5,'si',NULL,'daegu','대구',5),
 (6,'si',NULL,'daejeon','대전',6),
 (7,'si',NULL,'gwangju','광주',7);

INSERT OR IGNORE INTO regions(id, level, parent_id, slug, name, sort) VALUES
 (11,'gu',1,'mapo','마포구',1),
 (12,'gu',1,'seodaemun','서대문구',2),
 (13,'gu',1,'gangnam','강남구',3),
 (14,'gu',1,'gwangjin','광진구',4),
 (15,'gu',1,'songpa','송파구',5),
 (16,'gu',1,'jongno','종로구',6),
 (17,'gu',1,'jung','중구',7),
 (18,'gu',1,'gwanak','관악구',8),
 (19,'gu',1,'dongjak','동작구',9),
 (20,'gu',1,'yongsan','용산구',10),
 (21,'gu',1,'seocho','서초구',11),
 (22,'gu',1,'yeongdeungpo','영등포구',12),
 (23,'gu',1,'seongdong','성동구',13),
 (24,'gu',1,'gangseo','강서구',14),
 (25,'gu',1,'nowon','노원구',15),
 (31,'gu',2,'suwon','수원시',1),
 (32,'gu',2,'seongnam','성남시',2),
 (33,'gu',2,'goyang','고양시',3),
 (34,'gu',2,'bucheon','부천시',4),
 (35,'gu',2,'yongin','용인시',5),
 (36,'gu',2,'anyang','안양시',6),
 (41,'gu',3,'bupyeong','부평구',1),
 (42,'gu',3,'namdong','남동구',2),
 (51,'gu',4,'busanjin','부산진구',1),
 (52,'gu',4,'haeundae','해운대구',2),
 (61,'gu',5,'jung-daegu','중구',1),
 (71,'gu',6,'seo-daejeon','서구',1),
 (81,'gu',7,'seo-gwangju','서구',1),
 (82,'gu',7,'dong-gwangju','동구',2);

INSERT OR IGNORE INTO regions(id, level, parent_id, slug, name, sort) VALUES
 (101,'area',11,'hongdae','홍대',1),
 (102,'area',11,'hapjeong','합정·상수',2),
 (103,'area',11,'yeonnam','연남',3),
 (104,'area',11,'mangwon','망원',4),
 (111,'area',12,'sinchon','신촌',1),
 (112,'area',12,'ewha','이대',2),
 (121,'area',13,'gangnam-station','강남역',1),
 (122,'area',13,'yeoksam','역삼',2),
 (123,'area',13,'samseong','삼성·선릉',3),
 (124,'area',13,'apgujeong','압구정·청담',4),
 (131,'area',14,'kondae','건대',1),
 (132,'area',14,'guui','구의·자양',2),
 (141,'area',15,'jamsil','잠실',1),
 (142,'area',15,'seokchon','석촌·송리단길',2),
 (151,'area',16,'jongno-area','종로',1),
 (152,'area',16,'hyehwa','혜화·대학로',2),
 (161,'area',17,'euljiro','을지로',1),
 (162,'area',17,'myeongdong','명동',2),
 (171,'area',18,'sillim','신림',1),
 (172,'area',18,'snu','서울대입구',2),
 (181,'area',19,'noryangjin','노량진',1),
 (182,'area',19,'sadang','사당·이수',2),
 (191,'area',20,'itaewon','이태원',1),
 (192,'area',20,'yongsan-station','용산역',2),
 (201,'area',21,'gyodae','교대·서초',1),
 (211,'area',22,'yeongdeungpo-station','영등포역',1),
 (212,'area',22,'yeouido','여의도',2),
 (221,'area',23,'seongsu','성수',1),
 (222,'area',23,'wangsimni','왕십리',2),
 (231,'area',24,'magok','마곡',1),
 (241,'area',25,'nowon-station','노원역',1),
 (301,'area',31,'suwon-station','수원역·인계동',1),
 (302,'area',31,'gwanggyo','광교',2),
 (311,'area',32,'bundang','분당·서현',1),
 (312,'area',32,'pangyo','판교',2),
 (321,'area',33,'ilsan','일산',1),
 (331,'area',34,'bucheon-station','부천역',1),
 (341,'area',35,'suji','수지·죽전',1),
 (351,'area',36,'beomgye','범계·평촌',1),
 (401,'area',41,'bupyeong-station','부평역',1),
 (411,'area',42,'guwol','구월·인천시청',1),
 (501,'area',51,'seomyeon','서면',1),
 (511,'area',52,'haeundae-beach','해운대',1),
 (601,'area',61,'dongseongno','동성로',1),
 (701,'area',71,'dunsan','둔산',1),
 (801,'area',81,'sangmu','상무',1),
 (811,'area',82,'chungjangno','충장로',1);
