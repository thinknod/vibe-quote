/* data.js : 고쳐 보는 곳
 * 우리 회사 견적기로 바꾸려면 이 파일만 고치면 됩니다. 저장하고 새로 고치면 바로 보여요.
 * 링크 미리보기(카카오톡 등)에 나오는 제목은 index.html 위쪽 og 태그도 함께 바꿔 주세요.
 * 예시 회사(새벽금속), 사업자번호, 주소, 단가는 모두 가상입니다.
 */

// 회사 정보. 견적서 위쪽 '공급자' 칸에 들어가요. 개인 연락처 대신 회사 대표 메일을 권해요
const COMPANY = {
  name: '새벽금속',
  line: '판금 주문 생산. 품목과 수량을 고르면 견적이 바로 나와요',
  bizNo: '000-00-00000 (가상)',
  address: '경기 시흥시 공단로 000 (가상 주소)',
  email: 'sales@example.com',
  validDays: 14,                      // 견적 유효 기간(일)
  notes: [                            // 견적서 아래 안내 (한 줄씩)
    '운송비는 별도이며, 공장 출고 기준입니다.',
    '도면을 받은 뒤 정식 견적을 드립니다. 이 금액은 자동 계산한 참고 견적이에요.',
    '납기는 영업일 기준이며, 주문 확정 다음 날부터 셉니다.',
  ],
};

// 재질. rate는 기준 단가에 곱하는 배수
const MATERIALS = [
  { id: 'spcc', name: '냉연강판', note: 'SPCC', rate: 1.0 },
  { id: 'sus', name: '스테인리스', note: 'SUS304', rate: 1.9 },
  { id: 'al', name: '알루미늄', note: 'AL5052', rate: 1.6 },
];

// 표면 처리. rate는 재질을 반영한 단가에 더하는 비율(0.25 = 25% 더함)
const FINISHES = [
  { id: 'none', name: '없음', rate: 0 },
  { id: 'powder', name: '분체 도장', rate: 0.25 },
  { id: 'zinc', name: '아연 도금', rate: 0.15 },
  { id: 'hairline', name: '헤어라인', rate: 0.10 },
];

// 품목. base는 냉연강판, 표면 처리 없음 기준의 개당 단가(원). leadDays는 보통 납기(영업일)
// materials, finishes에는 이 품목에 고를 수 있는 것의 id만 적어요
const ITEMS = [
  { id: 'bracket', name: 'L자 브래킷', desc: '2t, 50×50mm, 구멍 넷', unit: '개', base: 1800, minQty: 50, leadDays: 7,
    materials: ['spcc', 'sus', 'al'], finishes: ['none', 'powder', 'zinc'] },
  { id: 'cover', name: '제어함 커버', desc: '1.6t, 400×300mm, 절곡 넷', unit: '개', base: 18500, minQty: 10, leadDays: 10,
    materials: ['spcc', 'sus'], finishes: ['none', 'powder', 'hairline'] },
  { id: 'shelf', name: '선반 받침대', desc: '3t, 250mm, 보강 리브', unit: '개', base: 4200, minQty: 30, leadDays: 8,
    materials: ['spcc', 'sus'], finishes: ['none', 'powder', 'zinc'] },
  { id: 'plate', name: '레이저 절단 평판', desc: '2t, 300×300mm 안쪽, 모양 자유', unit: '장', base: 3500, minQty: 20, leadDays: 5,
    materials: ['spcc', 'sus', 'al'], finishes: ['none', 'zinc', 'hairline'] },
  { id: 'guard', name: '기계 안전 커버', desc: '1.2t 타공판, 600×400mm', unit: '개', base: 42000, minQty: 5, leadDays: 12,
    materials: ['spcc', 'sus'], finishes: ['none', 'powder'] },
];

// 수량 구간 할인. 줄 하나의 수량이 qty개 이상이면 off만큼 할인(큰 구간부터 적용)
const TIERS = [
  { qty: 100, off: 0.03 },
  { qty: 500, off: 0.07 },
  { qty: 1000, off: 0.10 },
];

// 빠른 납기. rate만큼 금액을 더하고, 납기 일수를 cut만큼 줄여요(0.4 = 40% 줄임)
const RUSH = { label: '빠른 납기', rate: 0.15, cut: 0.4 };

const VAT = 0.1;   // 부가세

// 색. accent는 버튼과 강조색이에요. 흰 글자가 잘 보이게 진한 색을 고르세요
const THEME = {
  accent: '#1F5FA8',
  accentSoft: '#E3ECF7',
};
