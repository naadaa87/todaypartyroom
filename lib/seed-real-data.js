// 오늘의파티룸 첫 실제 지점 — 쏘플파티룸 직영 6곳 (신촌 5 · 건대 1)
// 출처: 쏘플파티룸 고객 공개용 지점 정보(요금·인원·시설·예약 링크). 와이파이·도어락 등 내부 정보는 넣지 않았습니다.
// 배포 후 첫 요청 때 한 번만 등록됩니다(settings.seed_real_v1). 이후 수정은 호스트센터에서 하세요.
export const REAL_HOST = { email: 'ssople@todaypartyroom.local', name: '쏘플파티룸', phone: '010-8540-1886', kakao: 'https://pf.kakao.com/_mufLd' };
export const REAL_SPACES = [
 {
  "slug": "sinchon-restel",
  "name": "레스텔 신촌점 파티룸",
  "intro": "신촌역 근처 6층, 최대 8명이 아늑하게 쉬어 가는 노래방·닌텐도 스위치 파티룸",
  "description": "신촌역 근처 건물 6층에 있는 12평 파티룸이에요. 엘리베이터로 올라오고, 기준 4명·최대 8명이라 친구 서너 명의 생일파티나 커플 기념일, 소규모 모임에 아늑하게 맞아요.\n\n화려한 장비보다 편하게 쉬는 데 초점을 둔 공간이에요. 65인치 UHD TV로 본인 계정의 넷플릭스·유튜브를 볼 수 있고, TJ 노래방과 닌텐도 스위치(마리오카트 8 디럭스, 슈퍼 마리오 파티 잼버리, 별의 커비, 오버쿡 등)가 있어요. 좌식과 입식 자리가 함께 있고, 은은한 조명과 포토존이 있어 사진이 예쁘게 나와요.\n\n이동식 인덕션과 냄비·프라이팬, 전자레인지, 전기포트, 냉장고, 기본 식기가 있어 배달 음식을 데우거나 간단히 조리할 수 있어요. 화장실은 건물 공용이에요.",
  "address": "서울특별시 서대문구 연세로5가길 11, 6층",
  "region_id": 111,
  "capacity_std": 4,
  "capacity_max": 8,
  "area_m2": 39.7,
  "floor_info": "6층 · 엘리베이터 있음",
  "parking": "건물 주차는 안 돼요. 근처 창천 민영주차장(08~22시, 1시간 3,000원)이나 타이거 민영주차장(심야권 18,000원)을 이용해 주세요.",
  "amenities": [
   "주방",
   "냉장고",
   "전자레인지",
   "노래방",
   "TV",
   "보드게임",
   "콘솔게임",
   "와이파이",
   "에어컨",
   "엘리베이터",
   "무인출입"
  ],
  "rules": "· 실내 전 구역 금연이에요(전자담배 포함). 흡연은 건물 밖에서 해 주세요. 실내 흡연 시 보증금이 전액 차감돼요.\n· 실내에서는 비치된 실내화로 갈아 신어 주세요.\n· 22시 이후에는 문을 닫고 소리를 줄여 주세요. 복도와 흡연 장소에서도 조용히 부탁드려요.\n· 고기·생선구이처럼 냄새가 강한 요리는 할 수 없어요.\n· 예약한 인원만 입실할 수 있어요. 인원 추가는 이용 당일까지 쏘플파티룸 카카오톡으로 알려 주세요(최대 인원 안에서 1인당 1만원).\n· 미성년자끼리는 낮·올데이 패키지만 이용할 수 있고, 전원 보호자 동의서가 필요해요.\n· 나가실 때 분리수거·설거지·소등·냉난방기 끄기 같은 기본 정리를 부탁드려요.\n· 비품을 잃어버리거나 파손하면 구입가가 청구돼요.",
  "refund_policy": "이용일 8일 전까지 취소하면 전액 환불해 드려요.\n이용일 7일 전부터는 이용 금액을 환불해 드리기 어려워요.\n인원을 줄이는 경우에도 같은 기준이 적용돼요.",
  "transport": "신촌역에서 걸어서 3분, 연세로 상가 거리 안쪽 건물(연세로5가길 11) 6층이에요.",
  "deposit_text": "청소 보증금 8만원 · 이용일 다음 주 수요일에 돌려드려요 (정리 미흡·흡연·파손 시 차감)",
  "booking_url": "https://map.naver.com/p/entry/place/2072291275?placePath=%2Fticket%3Ffrom%3Dmap%26fromPanelNum%3D1%26additionalHeight%3D76%26timestamp%3D202610112147%26locale%3Dko%26svcName%3Dmap_pcv5%26entry%3Dbmp&c=15.00,0,0,0,dh",
  "photos": [
   "/assets/spaces/sinchon-restel.webp",
   "https://daroom.b-cdn.net/space/324/260027_NDyOF7TOizvN.jpg",
   "https://daroom.b-cdn.net/space/324/260027_Q9Ryw0xisnhM.jpg",
   "https://daroom.b-cdn.net/space/324/260027_gVTGEA7UOjvC.jpg",
   "https://daroom.b-cdn.net/space/324/260027_wqZcy0gx9vSR.jpg",
   "https://daroom.b-cdn.net/space/324/260027_PMaXcbkQvJZG.jpg",
   "https://daroom.b-cdn.net/space/324/260027_SFMdBeyyxzKk.jpg",
   "https://daroom.b-cdn.net/space/324/260027_da3e21U6zhUL.jpg",
   "https://daroom.b-cdn.net/space/324/260027_Xq2DZcSzHs4w.jpg",
   "https://daroom.b-cdn.net/space/324/260027_suVUTxr7FgZA.jpg"
  ],
  "themes": [
   "birthday",
   "all-night",
   "game"
  ],
  "slots": [
   {
    "name": "낮타임",
    "start": "12:00",
    "end": "17:00",
    "wk": 80000,
    "fri": 80000,
    "sat": 90000,
    "sun": 90000,
    "base": 4,
    "extra": 10000
   },
   {
    "name": "밤타임",
    "start": "19:00",
    "end": "10:00",
    "wk": 120000,
    "fri": 160000,
    "sat": 200000,
    "sun": 120000,
    "base": 4,
    "extra": 10000
   },
   {
    "name": "올데이",
    "start": "12:00",
    "end": "22:00",
    "wk": 120000,
    "fri": 200000,
    "sat": 260000,
    "sun": 180000,
    "base": 4,
    "extra": 10000
   }
  ]
 },
 {
  "slug": "sinchon-urbanholy",
  "name": "신촌 어반홀리 파티룸",
  "intro": "신촌역 5분, 최대 20명까지 쓰는 22평 파티룸 · 빔프로젝터·노래방·PS5",
  "description": "신촌역에서 걸어서 5분 안쪽, 연세로 상가 거리 건물 2층에 있는 22평 파티룸이에요. 엘리베이터가 있고 기준 4명부터 최대 20명까지 들어올 수 있어서 생일파티부터 동아리·과 모임, 작은 세미나까지 두루 쓰여요.\n\n2~3인용 테이블 여러 개로 되어 있어 모임 형태에 맞게 자리를 바꿔 쓸 수 있어요. 100인치 스크린과 빔프로젝터(OTT는 본인 계정, 노트북은 HDMI 연결), TJ 노래방과 무선 마이크, 플레이스테이션5·닌텐도 스위치, 보드게임 14종이 있어요.\n\n인덕션 2구와 냄비·프라이팬, 전자레인지, 냉장고, 식기가 다 있어 음식을 해 먹을 수 있고 배달·주류 반입도 돼요. 화장실은 실내에 있고 남녀가 나뉘어 있어요. 반려견 1마리까지 함께 올 수 있어요(애견 보증금 3만원 별도).",
  "address": "서울특별시 서대문구 연세로5가길 11, 2층",
  "region_id": 111,
  "capacity_std": 4,
  "capacity_max": 20,
  "area_m2": 72.7,
  "floor_info": "2층 · 엘리베이터 있음",
  "parking": "건물 주차는 안 돼요. 근처 창천 민영주차장(08~22시, 1시간 3,000원)이나 타이거 민영주차장(심야권 18,000원)을 이용해 주세요.",
  "amenities": [
   "주방",
   "냉장고",
   "전자레인지",
   "노래방",
   "빔프로젝터",
   "TV",
   "보드게임",
   "콘솔게임",
   "와이파이",
   "에어컨",
   "엘리베이터",
   "화장실(내부)",
   "무인출입",
   "반려동물 동반"
  ],
  "rules": "· 실내 전 구역 금연이에요(전자담배 포함). 흡연은 건물 밖에서 해 주세요. 실내 흡연 시 보증금이 전액 차감돼요.\n· 실내에서는 비치된 실내화로 갈아 신어 주세요.\n· 22시 이후에는 문을 닫고 소리를 줄여 주세요. 복도와 흡연 장소에서도 조용히 부탁드려요.\n· 고기·생선구이처럼 냄새가 강한 요리는 할 수 없어요.\n· 반려견은 1마리까지 함께 올 수 있어요(애견 보증금 3만원 별도).\n· 예약한 인원만 입실할 수 있어요. 인원 추가는 이용 당일까지 쏘플파티룸 카카오톡으로 알려 주세요(최대 인원 안에서 1인당 1만원).\n· 미성년자끼리는 낮·올데이 패키지만 이용할 수 있고, 전원 보호자 동의서가 필요해요.\n· 나가실 때 분리수거·설거지·소등·냉난방기 끄기 같은 기본 정리를 부탁드려요.\n· 비품을 잃어버리거나 파손하면 구입가가 청구돼요.",
  "refund_policy": "이용일 8일 전까지 취소하면 전액 환불해 드려요.\n이용일 7일 전부터는 이용 금액을 환불해 드리기 어려워요.\n인원을 줄이는 경우에도 같은 기준이 적용돼요.",
  "transport": "신촌역에서 걸어서 5분 안쪽, 연세로 상가 거리 안쪽 건물(연세로5가길 11) 2층이에요.",
  "deposit_text": "청소 보증금 8만원 · 이용일 다음 주 수요일에 돌려드려요 (정리 미흡·흡연·파손 시 차감) · 반려견 동반 시 애견 보증금 3만원 추가",
  "booking_url": "https://map.naver.com/p/entry/place/1738147136?placePath=%2Fticket%3Ffrom%3Dmap%26fromPanelNum%3D1%26additionalHeight%3D76%26timestamp%3D202610112146%26locale%3Dko%26svcName%3Dmap_pcv5%26entry%3Dbmp&c=15.00,0,0,0,dh",
  "photos": [
   "/assets/spaces/sinchon-urbanholy.webp",
   "https://daroom.b-cdn.net/space/310/264127_yPVgJE71UeXx.jpg",
   "https://daroom.b-cdn.net/space/310/264127_vdu1b89VfIMf.jpg",
   "https://daroom.b-cdn.net/space/310/264127_lsJpxW4Jwsda.jpg",
   "https://daroom.b-cdn.net/space/310/264127_PwhjeA3rPicV.jpg",
   "https://daroom.b-cdn.net/space/310/264127_q8BHNx6CmTR5.jpg",
   "https://daroom.b-cdn.net/space/310/264127_30rPXKTNK2uy.jpg",
   "https://daroom.b-cdn.net/space/310/264127_C6KKBHLg6X1K.jpg",
   "https://daroom.b-cdn.net/space/310/264127_Rwx34m0K5JX8.jpg",
   "https://daroom.b-cdn.net/space/310/264127_TJfTsM9Fincc.jpg"
  ],
  "themes": [
   "birthday",
   "workshop",
   "all-night",
   "game"
  ],
  "slots": [
   {
    "name": "낮타임",
    "start": "11:00",
    "end": "16:00",
    "wk": 70000,
    "fri": 70000,
    "sat": 90000,
    "sun": 90000,
    "base": 4,
    "extra": 10000
   },
   {
    "name": "밤타임",
    "start": "19:00",
    "end": "09:00",
    "wk": 100000,
    "fri": 160000,
    "sat": 200000,
    "sun": 100000,
    "base": 4,
    "extra": 10000
   },
   {
    "name": "올데이",
    "start": "12:00",
    "end": "22:00",
    "wk": 120000,
    "fri": 150000,
    "sat": 300000,
    "sun": 150000,
    "base": 4,
    "extra": 10000
   }
  ]
 },
 {
  "slug": "sinchon-playtion-1",
  "name": "신촌 플레이션1호점 게임파티룸",
  "intro": "신촌 PC 6대 게임 파티룸 · 빔프로젝터·노래방·레트로 오락기 · 최대 8명",
  "description": "신촌역 근처 이케이빌딩 지하 2층, 엘리베이터로 내려가는 10평 게임 파티룸이에요. 기준 4명·최대 8명이라 여섯 명 안팎이 PC 앞에 나란히 앉아 내전하기 좋아요.\n\nPC 6대(RTX4060 Ti, 32인치 커브드 게이밍 모니터, 게이밍 키보드·마우스)가 있고 리그 오브 레전드, 발로란트, 배틀그라운드, 오버워치2 같은 인기 게임 일부가 설치돼 있어요. 입실 후 본인 계정으로 로그인해 이용하면 되고, PC방이 아니라서 유료 게임과 PC방 혜택은 없어요. 빔프로젝터, TV 노래방, 미러볼, 레트로 오락기, 보드게임 14종도 있어요.\n\n취사는 안 되지만 전자레인지·전기포트·냉장고가 있어 배달 음식을 먹기 좋아요. 화장실은 실내에 있어요(남녀 공용). 지하 2층이라 늦은 시간에도 소리 부담이 적은 편이에요.",
  "address": "서울특별시 서대문구 연세로11길 5, 이케이빌딩 지하 2층",
  "region_id": 111,
  "capacity_std": 4,
  "capacity_max": 8,
  "area_m2": 33.1,
  "floor_info": "지하 2층 · 엘리베이터 있음",
  "parking": "건물 주차는 안 돼요. 걸어서 3분 거리 타이거 민영주차장(심야권 18,000원)이나 명신 주차장(1시간 4,000원)을 이용해 주세요.",
  "amenities": [
   "냉장고",
   "전자레인지",
   "노래방",
   "빔프로젝터",
   "TV",
   "보드게임",
   "게임용 PC",
   "와이파이",
   "에어컨",
   "엘리베이터",
   "화장실(내부)",
   "무인출입"
  ],
  "rules": "· 실내 전 구역 금연이에요(전자담배 포함). 흡연은 건물 밖에서 해 주세요. 실내 흡연 시 보증금이 전액 차감돼요.\n· 실내에서는 비치된 실내화로 갈아 신어 주세요.\n· 22시 이후에는 문을 닫고 소리를 줄여 주세요. 복도와 흡연 장소에서도 조용히 부탁드려요.\n· 취사는 할 수 없어요. 배달·포장 음식은 괜찮아요.\n· PC 위치와 세팅은 바꿀 수 없어요. 게임은 입실 후 본인 계정으로 이용해 주세요.\n· 예약한 인원만 입실할 수 있어요. 인원 추가는 이용 당일까지 쏘플파티룸 카카오톡으로 알려 주세요(최대 인원 안에서 1인당 1만원).\n· 미성년자끼리는 낮·올데이 패키지만 이용할 수 있고, 전원 보호자 동의서가 필요해요.\n· 나가실 때 분리수거·설거지·소등·냉난방기 끄기 같은 기본 정리를 부탁드려요.\n· 비품을 잃어버리거나 파손하면 구입가가 청구돼요.",
  "refund_policy": "이용일 8일 전까지 취소하면 전액 환불해 드려요.\n이용일 7일 전부터는 이용 금액을 환불해 드리기 어려워요.\n인원을 줄이는 경우에도 같은 기준이 적용돼요.",
  "transport": "신촌역에서 걸어서 갈 수 있는 연세로11길 이케이빌딩 지하 2층이에요.",
  "deposit_text": "청소 보증금 8만원 · 이용일 다음 주 수요일에 돌려드려요 (정리 미흡·흡연·파손 시 차감)",
  "booking_url": "https://map.naver.com/p/entry/place/1101486757?placePath=%2Fticket%3Ffrom%3Dmap%26fromPanelNum%3D1%26additionalHeight%3D76%26timestamp%3D202610112144%26locale%3Dko%26svcName%3Dmap_pcv5%26entry%3Dbmp&c=15.00,0,0,0,dh",
  "photos": [
   "/assets/spaces/sinchon-playtion-1.webp",
   "https://daroom.b-cdn.net/space/284/254617_K8Qw7QBTOijd.jpg",
   "https://daroom.b-cdn.net/space/284/254617_OFNuSLPxQPym.jpg",
   "https://daroom.b-cdn.net/space/284/254617_BfHOcQRAnSD5.jpg",
   "https://daroom.b-cdn.net/space/284/254617_kkur4sfrYC6G.jpg",
   "https://daroom.b-cdn.net/space/284/254617_IyntD4X3I9Jz.jpg",
   "https://daroom.b-cdn.net/space/284/254617_PCcvttcDZx2n.jpg",
   "https://daroom.b-cdn.net/space/284/254617_duZm4d7595Xv.jpg",
   "https://daroom.b-cdn.net/space/284/254617_UjclmNNbB1FM.jpg",
   "https://daroom.b-cdn.net/space/284/254617_6LWvrMFwyMKv.jpg"
  ],
  "themes": [
   "game",
   "birthday",
   "all-night"
  ],
  "slots": [
   {
    "name": "낮타임",
    "start": "11:00",
    "end": "16:00",
    "wk": 80000,
    "fri": 80000,
    "sat": 100000,
    "sun": 100000,
    "base": 4,
    "extra": 10000
   },
   {
    "name": "밤타임",
    "start": "19:00",
    "end": "09:00",
    "wk": 120000,
    "fri": 170000,
    "sat": 250000,
    "sun": 120000,
    "base": 4,
    "extra": 10000
   },
   {
    "name": "올데이",
    "start": "12:00",
    "end": "22:00",
    "wk": 130000,
    "fri": 190000,
    "sat": 350000,
    "sun": 190000,
    "base": 4,
    "extra": 10000
   }
  ]
 },
 {
  "slug": "sinchon-playtion-2",
  "name": "신촌 플레이션2호점 게임파티룸",
  "intro": "신촌 PC 8대 게임 파티룸 · PS5·스위치·TJ 노래방 · 최대 14명",
  "description": "신촌역 근처 연세로5가길 건물 3층의 22평 게임 파티룸이에요. 엘리베이터가 있고 기준 4명·최대 14명이라 10명 넘는 생일파티나 과 모임에도 넉넉해요.\n\nPC 8대(RTX4060, 32인치 게이밍 모니터, 사운드바)로 내전을 하고, 플레이스테이션5와 닌텐도 스위치, 빔프로젝터, TJ 노래방(블루투스 마이크·미러볼), 홀덤 테이블보, 보드게임 14종까지 있어 게임과 노래를 한 공간에서 즐길 수 있어요. PC 게임은 입실 후 본인 계정으로 이용해요(유료 게임·PC방 혜택 없음).\n\n인덕션 2구와 조리도구, 전자레인지, 냉장고가 있어 간단한 요리가 되고 배달·주류 반입도 돼요. 화장실은 실내에 있어요(남녀 공용).",
  "address": "서울특별시 서대문구 연세로5가길 11, 3층",
  "region_id": 111,
  "capacity_std": 4,
  "capacity_max": 14,
  "area_m2": 72.7,
  "floor_info": "3층 · 엘리베이터 있음",
  "parking": "건물 주차는 안 돼요. 근처 창천 민영주차장(08~22시, 1시간 3,000원)이나 타이거 민영주차장(심야권 18,000원)을 이용해 주세요.",
  "amenities": [
   "주방",
   "냉장고",
   "전자레인지",
   "노래방",
   "빔프로젝터",
   "TV",
   "보드게임",
   "콘솔게임",
   "게임용 PC",
   "와이파이",
   "에어컨",
   "엘리베이터",
   "화장실(내부)",
   "무인출입"
  ],
  "rules": "· 실내 전 구역 금연이에요(전자담배 포함). 흡연은 건물 밖에서 해 주세요. 실내 흡연 시 보증금이 전액 차감돼요.\n· 실내에서는 비치된 실내화로 갈아 신어 주세요.\n· 22시 이후에는 문을 닫고 소리를 줄여 주세요. 복도와 흡연 장소에서도 조용히 부탁드려요.\n· 고기·생선구이처럼 냄새가 강한 요리는 할 수 없어요.\n· PC 위치와 세팅은 바꿀 수 없어요. 게임은 입실 후 본인 계정으로 이용해 주세요.\n· 예약한 인원만 입실할 수 있어요. 인원 추가는 이용 당일까지 쏘플파티룸 카카오톡으로 알려 주세요(최대 인원 안에서 1인당 1만원).\n· 미성년자끼리는 낮·올데이 패키지만 이용할 수 있고, 전원 보호자 동의서가 필요해요.\n· 나가실 때 분리수거·설거지·소등·냉난방기 끄기 같은 기본 정리를 부탁드려요.\n· 비품을 잃어버리거나 파손하면 구입가가 청구돼요.",
  "refund_policy": "이용일 8일 전까지 취소하면 전액 환불해 드려요.\n이용일 7일 전부터는 이용 금액을 환불해 드리기 어려워요.\n인원을 줄이는 경우에도 같은 기준이 적용돼요.",
  "transport": "신촌역에서 걸어서 5분 안쪽, 연세로 상가 거리 안쪽 건물(연세로5가길 11) 3층이에요.",
  "deposit_text": "청소 보증금 8만원 · 이용일 다음 주 수요일에 돌려드려요 (정리 미흡·흡연·파손 시 차감)",
  "booking_url": "https://map.naver.com/p/entry/place/1959276014?placePath=%2Fticket%3Ffrom%3Dmap%26fromPanelNum%3D1%26additionalHeight%3D76%26timestamp%3D202610112146%26locale%3Dko%26svcName%3Dmap_pcv5%26entry%3Dbmp&c=15.00,0,0,0,dh",
  "photos": [
   "/assets/spaces/sinchon-playtion-2.webp",
   "https://daroom.b-cdn.net/space/311/251218_j4Q8D12SdOOe.jpg",
   "https://daroom.b-cdn.net/space/311/251218_k8abBAQMmTc5.jpg",
   "https://daroom.b-cdn.net/space/311/251218_I1pAP52q09Sz.jpg",
   "https://daroom.b-cdn.net/space/311/251218_uWW0ELkwoo88.jpg",
   "https://daroom.b-cdn.net/space/311/251218_GN5qe2hj6OiT.jpg",
   "https://daroom.b-cdn.net/space/311/251218_KimGEcugbjBI.jpg",
   "https://daroom.b-cdn.net/space/311/251218_Hg3LRDMQy68h.jpg",
   "https://daroom.b-cdn.net/space/311/251218_5dh2GCuhJkeH.jpg",
   "https://daroom.b-cdn.net/space/311/251218_8wkFlJT7R8gu.jpg"
  ],
  "themes": [
   "game",
   "birthday",
   "all-night"
  ],
  "slots": [
   {
    "name": "낮타임",
    "start": "11:00",
    "end": "16:00",
    "wk": 80000,
    "fri": 80000,
    "sat": 100000,
    "sun": 100000,
    "base": 4,
    "extra": 10000
   },
   {
    "name": "밤타임",
    "start": "19:00",
    "end": "09:00",
    "wk": 140000,
    "fri": 250000,
    "sat": 290000,
    "sun": 140000,
    "base": 4,
    "extra": 10000
   },
   {
    "name": "올데이",
    "start": "12:00",
    "end": "22:00",
    "wk": 130000,
    "fri": 220000,
    "sat": 400000,
    "sun": 220000,
    "base": 4,
    "extra": 10000
   }
  ]
 },
 {
  "slug": "sinchon-playtion-3",
  "name": "신촌 플레이션3호점 게임파티룸",
  "intro": "신촌 RTX5060 PC 8대 게임 파티룸 · PS5·스위치2·노래방 · 최대 12명",
  "description": "신촌역 근처 연세로5가길 건물 5층의 18평 게임 파티룸이에요. 엘리베이터가 있고 기준 4명·최대 12명이라 8~10명 모임에 균형이 좋아요.\n\nPC 8대(RTX5060, 32인치 게이밍 모니터, 사운드바)를 갖췄고, 플레이스테이션5·닌텐도 스위치2(마리오카트, 슈퍼 마리오 파티 잼버리 등), 금영 노래방(블루투스 마이크·미러볼), 홀덤 테이블, 대형 TV, 보드게임 14종이 있어요. PC 게임은 입실 후 본인 계정으로 이용해요(유료 게임·PC방 혜택 없음).\n\n이동식 인덕션과 조리도구, 전자레인지, 냉장고, 식기가 있어 간단한 요리가 되고 배달·주류 반입도 돼요. 화장실은 실내에 있어요(남녀 공용).",
  "address": "서울특별시 서대문구 연세로5가길 11, 5층",
  "region_id": 111,
  "capacity_std": 4,
  "capacity_max": 12,
  "area_m2": 59.5,
  "floor_info": "5층 · 엘리베이터 있음",
  "parking": "건물 주차는 안 돼요. 근처 창천 민영주차장(08~22시, 1시간 3,000원)이나 타이거 민영주차장(심야권 18,000원)을 이용해 주세요.",
  "amenities": [
   "주방",
   "냉장고",
   "전자레인지",
   "노래방",
   "TV",
   "보드게임",
   "콘솔게임",
   "게임용 PC",
   "와이파이",
   "에어컨",
   "엘리베이터",
   "화장실(내부)",
   "무인출입"
  ],
  "rules": "· 실내 전 구역 금연이에요(전자담배 포함). 흡연은 건물 밖에서 해 주세요. 실내 흡연 시 보증금이 전액 차감돼요.\n· 실내에서는 비치된 실내화로 갈아 신어 주세요.\n· 22시 이후에는 문을 닫고 소리를 줄여 주세요. 복도와 흡연 장소에서도 조용히 부탁드려요.\n· 고기·생선구이처럼 냄새가 강한 요리는 할 수 없어요.\n· PC 위치와 세팅은 바꿀 수 없어요. 게임은 입실 후 본인 계정으로 이용해 주세요.\n· 예약한 인원만 입실할 수 있어요. 인원 추가는 이용 당일까지 쏘플파티룸 카카오톡으로 알려 주세요(최대 인원 안에서 1인당 1만원).\n· 미성년자끼리는 낮·올데이 패키지만 이용할 수 있고, 전원 보호자 동의서가 필요해요.\n· 나가실 때 분리수거·설거지·소등·냉난방기 끄기 같은 기본 정리를 부탁드려요.\n· 비품을 잃어버리거나 파손하면 구입가가 청구돼요.",
  "refund_policy": "이용일 8일 전까지 취소하면 전액 환불해 드려요.\n이용일 7일 전부터는 이용 금액을 환불해 드리기 어려워요.\n인원을 줄이는 경우에도 같은 기준이 적용돼요.",
  "transport": "신촌역에서 걸어서 5분 안쪽, 연세로 상가 거리 안쪽 건물(연세로5가길 11) 5층이에요.",
  "deposit_text": "청소 보증금 8만원 · 이용일 다음 주 수요일에 돌려드려요 (정리 미흡·흡연·파손 시 차감)",
  "booking_url": "https://map.naver.com/p/entry/place/2004425629?placePath=%2Fticket%3Ffrom%3Dmap%26fromPanelNum%3D1%26additionalHeight%3D76%26timestamp%3D202610112147%26locale%3Dko%26svcName%3Dmap_pcv5%26entry%3Dbmp&c=15.00,0,0,0,dh",
  "photos": [
   "/assets/spaces/sinchon-playtion-3.webp",
   "https://daroom.b-cdn.net/space/322/263018_rkpfpWv0WxHl.jpg",
   "https://daroom.b-cdn.net/space/322/263018_2kPEkL9sTJRj.jpg",
   "https://daroom.b-cdn.net/space/322/263018_kICToxO3kbH4.jpg",
   "https://daroom.b-cdn.net/space/322/263018_Sjh2IxIz5Wb0.jpg",
   "https://daroom.b-cdn.net/space/322/263018_gg2mW8W9JdXt.jpg",
   "https://daroom.b-cdn.net/space/322/263018_p1yiamysZOlH.jpg",
   "https://daroom.b-cdn.net/space/322/263018_fhkGZfl9iwzD.jpg",
   "https://daroom.b-cdn.net/space/322/263018_ykwOMDVj9mrI.jpg",
   "https://daroom.b-cdn.net/space/322/263018_DstZNObboc31.jpg"
  ],
  "themes": [
   "game",
   "birthday",
   "all-night"
  ],
  "slots": [
   {
    "name": "낮타임",
    "start": "11:00",
    "end": "16:00",
    "wk": 80000,
    "fri": 80000,
    "sat": 100000,
    "sun": 100000,
    "base": 4,
    "extra": 10000
   },
   {
    "name": "밤타임",
    "start": "19:00",
    "end": "09:00",
    "wk": 140000,
    "fri": 250000,
    "sat": 280000,
    "sun": 140000,
    "base": 4,
    "extra": 10000
   },
   {
    "name": "올데이",
    "start": "12:00",
    "end": "22:00",
    "wk": 130000,
    "fri": 220000,
    "sat": 380000,
    "sun": 220000,
    "base": 4,
    "extra": 10000
   }
  ]
 },
 {
  "slug": "kondae-playtion",
  "name": "건대 플레이션 게임파티룸",
  "intro": "건대 PC 6대 게임 파티룸 · 스위치2·레트로 오락기 · 최대 10명",
  "description": "어린이대공원역 근처 건물 1층에 있는 10평 게임 파티룸이에요. 기준 4명·최대 10명이라 친구 서너 명이 모여 게임으로 밤새 놀기 좋은 아담한 공간이에요.\n\nPC 6대(RTX5060, 32인치 게이밍 모니터)와 닌텐도 스위치2(슈퍼 마리오 파티 잼버리, 오버쿡 등), 레트로 오락기, TV, 보드게임이 있어요. PC 게임은 입실 후 본인 계정으로 이용해요(유료 게임·PC방 혜택 없음). 노래방은 이용할 수 없어요.\n\n취사는 안 되지만 전자레인지·냉장고·식기가 있어 배달 음식을 먹기 좋아요. 화장실은 건물 공용이고 남녀가 나뉘어 있어요.",
  "address": "서울특별시 광진구 능동로13길 39, 1층",
  "region_id": 131,
  "capacity_std": 4,
  "capacity_max": 10,
  "area_m2": 33.1,
  "floor_info": "1층 · 엘리베이터 없음",
  "parking": "도보 2분 거리 화양동 공영주차장(24시간, 1시간 2,400원)을 이용해 주세요.",
  "amenities": [
   "냉장고",
   "전자레인지",
   "TV",
   "보드게임",
   "콘솔게임",
   "게임용 PC",
   "와이파이",
   "에어컨",
   "무인출입"
  ],
  "rules": "· 실내 전 구역 금연이에요(전자담배 포함). 흡연은 건물 밖에서 해 주세요. 실내 흡연 시 보증금이 전액 차감돼요.\n· 실내에서는 비치된 실내화로 갈아 신어 주세요.\n· 22시 이후에는 문을 닫고 소리를 줄여 주세요. 복도와 흡연 장소에서도 조용히 부탁드려요.\n· 취사는 할 수 없어요. 배달·포장 음식은 괜찮아요.\n· 노래방은 이용할 수 없어요.\n· PC 위치와 세팅은 바꿀 수 없어요. 게임은 입실 후 본인 계정으로 이용해 주세요.\n· 예약한 인원만 입실할 수 있어요. 인원 추가는 이용 당일까지 쏘플파티룸 카카오톡으로 알려 주세요(최대 인원 안에서 1인당 1만원).\n· 미성년자끼리는 낮·올데이 패키지만 이용할 수 있고, 전원 보호자 동의서가 필요해요.\n· 나가실 때 분리수거·설거지·소등·냉난방기 끄기 같은 기본 정리를 부탁드려요.\n· 비품을 잃어버리거나 파손하면 구입가가 청구돼요.",
  "refund_policy": "이용일 8일 전까지 취소하면 전액 환불해 드려요.\n이용일 7일 전부터는 이용 금액을 환불해 드리기 어려워요.\n인원을 줄이는 경우에도 같은 기준이 적용돼요.",
  "transport": "어린이대공원역 근처 능동로13길 건물 1층이에요. 화양동 공영주차장에서 걸어서 2분 거리예요.",
  "deposit_text": "청소 보증금 8만원 · 이용일 다음 주 수요일에 돌려드려요 (정리 미흡·흡연·파손 시 차감)",
  "booking_url": "https://map.naver.com/p/entry/place/1657884917?placePath=%2Fticket%3Ffrom%3Dmap%26fromPanelNum%3D1%26additionalHeight%3D76%26timestamp%3D202610112144%26locale%3Dko%26svcName%3Dmap_pcv5%26entry%3Dbmp&c=15.00,0,0,0,dh",
  "photos": [
   "/assets/spaces/kondae-playtion.webp",
   "https://daroom.b-cdn.net/space/298/251501_IZAwOIERhtgx.jpg",
   "https://daroom.b-cdn.net/space/298/251501_WoCSuz0VdXxx.jpg",
   "https://daroom.b-cdn.net/space/298/251501_p99sbcRdrIZx.jpg",
   "https://daroom.b-cdn.net/space/298/251501_Sd2xqgE3RPcc.jpg",
   "https://daroom.b-cdn.net/space/298/251501_ayZN9lCbh6B3.jpg",
   "https://daroom.b-cdn.net/space/298/251501_lI8nNQIdGStn.jpg",
   "https://daroom.b-cdn.net/space/298/251501_P7ecxJbDyIPU.jpg",
   "https://daroom.b-cdn.net/space/298/251501_6A8JF2M6EpBN.jpg"
  ],
  "themes": [
   "game",
   "birthday",
   "all-night"
  ],
  "slots": [
   {
    "name": "낮타임",
    "start": "12:00",
    "end": "17:00",
    "wk": 70000,
    "fri": 70000,
    "sat": 80000,
    "sun": 80000,
    "base": 4,
    "extra": 10000
   },
   {
    "name": "밤타임",
    "start": "19:00",
    "end": "10:00",
    "wk": 100000,
    "fri": 150000,
    "sat": 200000,
    "sun": 100000,
    "base": 4,
    "extra": 10000
   },
   {
    "name": "올데이",
    "start": "12:00",
    "end": "22:00",
    "wk": 100000,
    "fri": 140000,
    "sat": 270000,
    "sun": 140000,
    "base": 4,
    "extra": 10000
   }
  ]
 }
];
