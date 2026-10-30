-- =====================================================================
-- 샘플 데이터 (선택) — 화면 확인용. 실제 운영 전에 삭제하세요. (맨 아래 삭제 SQL 참고)
-- 샘플 호스트 로그인: demo@todaypartyroom.kr / demo1234!
-- =====================================================================
INSERT OR IGNORE INTO hosts (id, email, password_hash, name, phone, biz_no, representative, status) VALUES
 (9001, 'demo@todaypartyroom.kr', 'pbkdf2$100000$aBHi2unWHTuukYWU1CohNQ$jsdNDxmU7PkWUDVKxYW_dqSyPRezjCBu3rR3FRUrxdM', '[샘플] 데모 호스트', '01000000000', '0000000000', '데모', 'active');

INSERT OR IGNORE INTO spaces (id, host_id, slug, name, intro, description, address, region_id, capacity_std, capacity_max, area_m2, floor_info, parking, amenities_json, rules, refund_policy, transport, deposit_text, booking_type, booking_url, booking_tel, booking_kakao, photos_json, status, subscription_status, subscription_until) VALUES
 (9001, 9001, 'hongdae-demo-rooftop', '[샘플] 홍대 루프탑 파티룸', '10명까지 편한 루프탑, 노래방·빔 완비', '홍대입구역 9번 출구에서 5분. 루프탑 테라스와 실내 공간이 연결된 파티룸입니다. 생일파티, 브라이덜샤워, 소규모 송년회에 잘 맞습니다.

특징 1. 루프탑 테라스에서 노을과 야경을 볼 수 있습니다.
특징 2. 노래방 기기, 빔프로젝터, 블루투스 스피커가 갖춰져 있습니다.
특징 3. 주방에서 간단한 조리가 가능하고 배달 음식 반입이 자유롭습니다.

이용 규칙: 22시 이후 루프탑에서는 소음을 자제해 주세요. 퇴실 시 분리수거를 부탁드립니다.
찾아오는 길: 홍대입구역 9번 출구 → 어울마당로 방향 도보 5분, 1층 편의점 건물 5층.', '서울 마포구 어울마당로 00', 101, 6, 12, 60, '5층, 엘리베이터 있음', '건물 앞 2대 무료', '["주방","냉장고","전자레인지","노래방","빔프로젝터","블루투스 스피커","루프탑","와이파이","에어컨"]', '22시 이후 루프탑 소음 자제. 흡연은 지정 구역에서만. 퇴실 시 분리수거.', '이용일 7일 전까지 100% 환불, 3일 전까지 50%, 이후 환불 불가.', '홍대입구역 9번 출구 도보 5분', '청소보증금 30,000원 (퇴실 후 환급)', 'link', 'https://booking.naver.com/', '010-0000-0000', '', '["https://picsum.photos/seed/tpr1/800/600","https://picsum.photos/seed/tpr2/800/600","https://picsum.photos/seed/tpr3/800/600","https://picsum.photos/seed/tpr4/800/600"]', 'approved', 'trial', date('now','+9 hours','+30 day')),
 (9002, 9001, 'gangnam-demo-game', '[샘플] 강남역 게임 파티룸', '콘솔·보드게임 60종, 최대 8명', '강남역 11번 출구 3분 거리의 게임 파티룸입니다. 닌텐도 스위치, 플레이스테이션, 보드게임 60종을 자유롭게 이용할 수 있습니다. 동호회 모임, 생일파티, 커플 데이트에 많이 찾으십니다.

특징 1. 대형 TV 2대와 콘솔 게임 2세트.
특징 2. 방음이 잘 되어 늦은 시간에도 편하게 이용 가능합니다.
특징 3. 무인 출입 시스템으로 비대면 입장.

이용 규칙: 음식물 반입 가능, 취식 후 정리 부탁드립니다. 게임기 파손 시 실비 청구.
찾아오는 길: 강남역 11번 출구 → 테헤란로 방향 도보 3분, 2층.', '서울 강남구 테헤란로 00', 121, 4, 8, 40, '2층', '불가(인근 공영주차장)', '["콘솔게임","보드게임","TV","블루투스 스피커","와이파이","에어컨","무인출입"]', '게임기 파손 시 실비 청구. 퇴실 시간 엄수.', '이용일 5일 전까지 100% 환불, 이후 환불 불가.', '강남역 11번 출구 도보 3분', '', 'tel', '', '010-0000-0001', '', '["https://picsum.photos/seed/tpr5/800/600","https://picsum.photos/seed/tpr6/800/600","https://picsum.photos/seed/tpr7/800/600"]', 'approved', 'trial', date('now','+9 hours','+30 day')),
 (9003, 9001, 'kondae-demo-allnight', '[샘플] 건대 올나잇 파티룸', '저녁부터 아침까지, 최대 15명', '건대입구역 2번 출구 4분. 밤 7시부터 다음 날 아침 10시까지 쓸 수 있는 올나잇 전용 파티룸입니다. 복층 구조라 잠자는 공간과 노는 공간이 분리됩니다.

특징 1. 복층 구조, 매트리스 6개 구비.
특징 2. 노래방·빔프로젝터·보드게임.
특징 3. 24시간 무인 출입.

이용 규칙: 외부 소음 주의, 퇴실 10시 엄수.
찾아오는 길: 건대입구역 2번 출구 → 로데오거리 방향 도보 4분, 3층.', '서울 광진구 동일로 00', 131, 8, 15, 80, '3층(복층)', '건물 지하 1대', '["주방","냉장고","노래방","빔프로젝터","보드게임","복층","와이파이","에어컨","무인출입"]', '퇴실 10시 엄수. 외부 소음 주의.', '이용일 7일 전까지 100% 환불, 이후 환불 불가.', '건대입구역 2번 출구 도보 4분', '청소보증금 50,000원', 'kakao', '', '010-0000-0002', 'https://pf.kakao.com/', '["https://picsum.photos/seed/tpr8/800/600","https://picsum.photos/seed/tpr9/800/600","https://picsum.photos/seed/tpr10/800/600"]', 'approved', 'trial', date('now','+9 hours','+30 day'));

INSERT OR IGNORE INTO space_themes (space_id, theme_id) VALUES (9001,1),(9001,2),(9001,8),(9002,6),(9002,1),(9003,5),(9003,3);

INSERT OR IGNORE INTO slots (id, space_id, name, kind, start_time, end_time, price_weekday, price_weekend, base_people, extra_fee, sort) VALUES
 (9001, 9001, '낮타임', 'package', '12:00', '17:00', 80000, 120000, 6, 10000, 1),
 (9002, 9001, '밤타임', 'package', '19:00', '10:00', 150000, 200000, 6, 10000, 2),
 (9003, 9002, '시간제', 'hourly', '10:00', '23:00', 20000, 25000, 4, 3000, 1),
 (9004, 9003, '올나잇', 'package', '19:00', '10:00', 180000, 240000, 8, 10000, 1);

INSERT OR IGNORE INTO auto_rules (space_id, enabled, tomorrow_rate, today_rate, steps_json, floor_json, exclude_days_json, exclude_slots_json, monthly_cap) VALUES
 (9001, 1, 15, 25, '[{"from":"14:00","rate":35}]', '{"9002":90000}', '[5,6]', '[]', 20),
 (9002, 1, 10, 20, '[]', '{}', '[]', '[]', 30),
 (9003, 1, 15, 30, '[]', '{"9004":120000}', '[5,6]', '[]', 20);

-- 오늘·내일 공실 (실행 시점 기준)
INSERT OR IGNORE INTO vacancies (space_id, slot_id, date, status) VALUES
 (9001, 9001, date('now','+9 hours'), 'vacant'), (9001, 9002, date('now','+9 hours'), 'vacant'),
 (9001, 9001, date('now','+9 hours','+1 day'), 'vacant'),
 (9002, 9003, date('now','+9 hours'), 'vacant'), (9002, 9003, date('now','+9 hours','+1 day'), 'vacant'),
 (9003, 9004, date('now','+9 hours','+1 day'), 'vacant'), (9003, 9004, date('now','+9 hours','+2 day'), 'vacant');

-- 수동 딜: 핫딜(평일 낮 40%), 이벤트(케이크 증정)
INSERT OR IGNORE INTO deals (id, space_id, type, origin, targets_json, discount_mode, discount_value, floor_price, quantity, starts_at, ends_at, status, benefit_text, title, base_price_snapshot) VALUES
 (9001, 9001, 'HOT', 'MANUAL', '[{"date":"' || date('now','+9 hours','+2 day') || '","slot_id":9001},{"date":"' || date('now','+9 hours','+3 day') || '","slot_id":9001},{"date":"' || date('now','+9 hours','+4 day') || '","slot_id":9001}]', 'RATE', 40, 0, 3, strftime('%Y-%m-%dT%H:%M','now','+9 hours'), date('now','+9 hours','+4 day') || 'T11:00', 'ACTIVE', '', '낮타임 핫딜 40%', '{}'),
 (9002, 9003, 'EVENT', 'MANUAL', '[{"date":"' || date('now','+9 hours','+1 day') || '","slot_id":9004},{"date":"' || date('now','+9 hours','+2 day') || '","slot_id":9004}]', 'RATE', 0, 0, NULL, strftime('%Y-%m-%dT%H:%M','now','+9 hours'), date('now','+9 hours','+2 day') || 'T18:00', 'ACTIVE', '생일 케이크 증정 + 1시간 연장 무료', '생일파티 이벤트', '{}');

-- 자동 운영 예시: 매주 반복 공실 패턴 + 반복 딜
INSERT OR IGNORE INTO space_automation (space_id, pattern_json) VALUES
 (9001, '{"9001":["","vacant","vacant","vacant","vacant","",""],"9002":["","vacant","vacant","vacant","","",""]}'),
 (9002, '{"9003":["vacant","vacant","vacant","vacant","vacant","vacant","vacant"]}'),
 (9003, '{"9004":["vacant","vacant","vacant","vacant","","",""]}');

INSERT OR IGNORE INTO deal_schedules (id, space_id, enabled, name, type, days_json, slot_ids_json, lead_days, open_time, duration_min, discount_mode, discount_value, quantity, only_vacant, start_date) VALUES
 (9001, 9002, 1, '매일 오후 3시 타임딜', 'TIME', '[0,1,2,3,4,5,6]', '[9003]', 0, '15:00', 180, 'RATE', 30, NULL, 1, date('now','+9 hours')),
 (9002, 9001, 1, '평일 낮타임 핫딜', 'HOT', '[1,2,3,4]', '[9001]', 2, '10:00', NULL, 'RATE', 35, 2, 1, date('now','+9 hours'));

INSERT OR IGNORE INTO articles (id, slug, title, summary, body, category, region_id, published) VALUES
 (9001, 'hongdae-partyroom-guide', '홍대 파티룸 고르는 법: 인원·시간대·가격 기준 정리', '홍대 파티룸을 처음 예약할 때 확인할 다섯 가지와 당일 예약 요령.', '## 홍대 파티룸, 오늘 바로 예약할 수 있나요?
가능합니다. 오늘의파티룸에서는 호스트가 비어 있다고 표시한 시간대가 당일·전날 할인가로 올라옵니다. 지역에서 홍대를 고른 뒤 "오늘" 탭을 보면 지금 예약 가능한 곳만 보입니다.

## 인원은 어떻게 보나요?
기준 인원과 최대 인원이 다릅니다. 기준 인원을 넘으면 1인당 추가 요금이 붙는 곳이 많으니, 요금표의 "기준 인원"과 "인원 추가" 항목을 먼저 확인하세요.

## 낮타임과 밤타임은 무엇이 다른가요?
- 낮타임: 보통 12시부터 17시 전후. 생일파티·브라이덜샤워에 적합합니다.
- 밤타임: 보통 19시부터 다음 날 아침까지. 올나잇 모임에 적합하고 요금이 높습니다.

## 예약은 어디서 하나요?
각 공간이 정한 채널(네이버 예약, 전화, 카카오톡)로 연결됩니다. 딜 코드를 받았다면 예약할 때 코드를 말씀하세요.', 'region', 101, 1);

-- =====================================================================
-- 샘플 삭제 (운영 전 실행)
-- DELETE FROM claims WHERE space_id IN (9001,9002,9003);
-- DELETE FROM schedule_runs WHERE schedule_id IN (SELECT id FROM deal_schedules WHERE space_id IN (9001,9002,9003));
-- DELETE FROM deal_schedules WHERE space_id IN (9001,9002,9003);
-- DELETE FROM space_automation WHERE space_id IN (9001,9002,9003);
-- DELETE FROM deals WHERE space_id IN (9001,9002,9003);
-- DELETE FROM vacancies WHERE space_id IN (9001,9002,9003);
-- DELETE FROM auto_rules WHERE space_id IN (9001,9002,9003);
-- DELETE FROM slots WHERE space_id IN (9001,9002,9003);
-- DELETE FROM space_themes WHERE space_id IN (9001,9002,9003);
-- DELETE FROM spaces WHERE id IN (9001,9002,9003);
-- DELETE FROM hosts WHERE id = 9001;
-- DELETE FROM articles WHERE id = 9001;
