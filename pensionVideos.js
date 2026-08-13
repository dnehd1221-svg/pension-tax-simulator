'use strict';

/**
 * 삼성증권 공식 유튜브 채널(@samsungsecurities) 연금 관련 영상 큐레이션 목록.
 * 채널 자체 검색 결과에서 업로더가 "삼성증권"으로 확인된 영상만 선별했다 (2026년 8월 기준).
 * 새 영상이 올라오면 이 목록에 항목을 추가해 키워드 커버리지를 넓힐 수 있다.
 */
const PENSION_VIDEOS = [
  { id: 'mtj5IME0nxU', title: '연금계좌(IRP, 연금저축) 세액공제한도가 궁금해요 [연금 투자사용설명서 EP.1]', tags: ['세액공제', '한도', 'IRP', '연금저축'] },
  { id: '2Z-ECkcZSSo', title: '[연금클라쓰] 세액공제 끝판왕! 연금계좌 활용법', tags: ['세액공제', '연금계좌', '활용법'] },
  { id: 'ZMLMYmp81NA', title: '연금저축계좌와 IRP의 차이점은 무엇인가요? [연금 투자사용설명서 EP.2]', tags: ['연금저축', 'IRP', '차이'] },
  { id: 'id_fCkM8O00', title: 'IRP와 연금저축의 납입순서가 궁금해요 [궁금한 연금 이야기 EP.2]', tags: ['IRP', '연금저축', '납입'] },
  { id: 'QOa2JiEM0DM', title: '[연금투자노트] 다이렉트IRP, 네가 궁금해!', tags: ['IRP', '다이렉트IRP'] },
  { id: 'FUZXGn3kWiY', title: '연금수령 시 세금은 어떻게 되나요? [연금 투자사용설명서 EP.3]', tags: ['연금수령', '세금', '연금소득세'] },
  { id: 'V9C28wcjb2A', title: '소중한 내 연금 잘 받는 법은? 연금수령 Q&A!', tags: ['연금수령'] },
  { id: '8bUhdxmpR9c', title: '연금수령요건과 연금수령한도가 궁금해요 [연금 투자사용설명서 EP.4]', tags: ['연금수령', '한도', '요건'] },
  { id: 'QibJ4PPrZ0g', title: '[보이는 연금] 퇴직금도 전략적으로 인출하세요', tags: ['퇴직금', '인출', '중도인출'] },
  { id: 'jwpoyx8Cu48', title: '[테마Talk] 연금 인출 활용법 (1부)', tags: ['인출', '중도인출'] },
  { id: '3fjF6lI8cGo', title: '[테마Talk] 연금 인출 활용법 (2부)', tags: ['인출', '중도인출'] },
  { id: 'r-b4807ns7k', title: '[연금상담소2] 디폴트옵션?', tags: ['디폴트옵션', 'IRP', '퇴직연금'] },
  { id: '1nBI0fZK0sQ', title: '[연금상담소2] 환상의 짝꿍, 디폴트옵션 상품을 찾아라! -IRP 편-', tags: ['디폴트옵션', 'IRP'] },
  { id: '3mtPf2O40Sc', title: '타사에 있는 연금계좌를 이전해오고 싶어요! [연금 투자사용설명서 EP.6]', tags: ['계좌이전', '이전'] },
  { id: 'oBOtGj0zg_k', title: '[놀.삼.투] 정든 내 연금 펀드로 이사하기 – mPOP에서 연금 이전하는 법', tags: ['계좌이전', '펀드', '이전'] },
  { id: 'nfvoBQwygns', title: '[보이는 연금] 2026년 연금제도, 이렇게 달라집니다', tags: ['제도개편', '2026년'] },
  { id: 'b7RRbOMTxko', title: 'AI가 운용해주는 퇴직연금 로보일임 서비스, mPOP에서 쉽게 만나보세요', tags: ['퇴직연금', '로보어드바이저'] },
  { id: '3qz5sEtY_FA', title: '[DC] 퇴직연금DC로 퇴직금 투자도 내 마음대로', tags: ['퇴직연금', 'DC', '퇴직금'] },
  { id: 'xlaX36-Apyg', title: '연금으로 ETF 투자! 뭔가 다른 점이 있다! (감상평 이벤트)', tags: ['ETF', '연금투자'] },
  { id: '-uaLkS9siPg', title: 'ISA 만기해지자금, 연금계좌에 어떻게 입금하나요? [궁금한 연금 이야기 EP.1]', tags: ['ISA', '연금계좌'] },
  { id: 'MAs8l9qWoRw', title: '연금교습소 ep1. 은퇴, 생활비 그리고 3층연금', tags: ['은퇴', '3층연금'] },
  { id: 'LOw_0vff1YQ', title: '연금교습소 ep4. 연금 저축 계좌 vs IRP', tags: ['연금저축', 'IRP', '비교'] },
  { id: 'SGX8A0v1_fc', title: '삼성증권 퇴직연금 가입자교육', tags: ['퇴직연금', '가입자교육'] },
  { id: 'STfoGwvljI4', title: '[보이는 연금] 연금계좌, 이렇게 활용하셔야 합니다.', tags: ['연금계좌', '활용법'] },
];

/** 입력 키워드와 제목/태그의 겹치는 정도로 가장 관련성 높은 영상 하나를 찾는다 */
function findBestPensionVideo(keyword) {
  const q = keyword.trim();
  if (!q) return null;

  let best = null;
  let bestScore = 0;
  for (const video of PENSION_VIDEOS) {
    let score = 0;
    if (video.title.includes(q)) score += 3;
    for (const tag of video.tags) {
      if (tag.includes(q) || q.includes(tag)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = video;
    }
  }
  return best;
}
