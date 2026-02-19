/**
 * Google Apps Script - EasyClaw 뉴스레터 구독자 수집
 *
 * 사용 방법:
 * 1. Google Sheets에서 시트를 하나 만들고, 첫 행에 [email, source, subscribedAt] 헤더를 추가
 * 2. 확장 프로그램 → Apps Script 열기
 * 3. 이 코드를 붙여넣고 저장
 * 4. 배포 → 새 배포 → 웹 앱 → 액세스 권한: "모든 사용자" → 배포
 * 5. 생성된 URL을 Vercel 환경 변수 NEWSLETTER_SCRIPT_URL에 설정
 */

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()
  var data = JSON.parse(e.postData.contents)
  var email = (data.email || '').trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: 'invalid email' })
    ).setMimeType(ContentService.MimeType.JSON)
  }

  // 중복 체크
  var emails = sheet.getRange('A2:A').getValues().flat().filter(String)
  if (emails.indexOf(email) !== -1) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: true })
    ).setMimeType(ContentService.MimeType.JSON)
  }

  sheet.appendRow([email, data.source || 'app', new Date().toISOString()])

  return ContentService.createTextOutput(
    JSON.stringify({ success: true })
  ).setMimeType(ContentService.MimeType.JSON)
}
