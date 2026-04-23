/**
 * ============================================================
 *  スピ不動産 — 吉方位診断フォーム受信 GASスクリプト
 * ============================================================
 *  機能:
 *  1. LPのフォームから送信されたデータを受信
 *  2. 本命星を自動計算
 *  3. Googleスプレッドシートに記録
 *  4. 申込者に自動返信メール送信
 *  5. 運営者に通知メール送信
 * ============================================================
 */

/* ====== 設定（ここを書き換えてください） ====== */

const SHEET_ID      = 'ここにスプレッドシートのIDを貼り付け';
const ADMIN_EMAIL   = 'ここに運営者のメールアドレスを記入';
const BRAND_NAME    = 'スピ不動産';
const REPLY_SIGN    = `──────────────────────
${BRAND_NAME}
運命の住まいとの出会いを、導きます。
──────────────────────`;


/* ====== メイン処理（POST受信） ====== */

function doPost(e) {
  try {
    const data = e.parameter;

    // 本命星を計算
    const honmeisei = calcHonmeisei(data.year, data.month, data.day);

    // スプレッドシートに1行追加
    appendToSheet(data, honmeisei);

    // 申込者に自動返信
    if (data.email) {
      sendAutoReply(data, honmeisei);
    }

    // 運営者に通知
    sendAdminNotification(data, honmeisei);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, honmeisei: honmeisei }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error(err);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


/* ====== スプレッドシートに記録 ====== */

function appendToSheet(data, honmeisei) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();

  // 初回だけヘッダー行を追加
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      '受信日時', 'お名前', '生年月日', '生まれ時刻', '性別',
      '本命星', 'メールアドレス', '電話番号', '現住所エリア', '引越し検討時期'
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#1a1538').setFontColor('#c9a961');
  }

  sheet.appendRow([
    new Date(),
    data.name || '',
    `${data.year}/${data.month}/${data.day}`,
    data.time || '不明',
    data.gender || '',
    honmeisei,
    data.email || '',
    data.phone || '',
    data.current || '',
    data.timing || '未選択'
  ]);
}


/* ====== 申込者への自動返信メール ====== */

function sendAutoReply(data, honmeisei) {
  const subject = `【${BRAND_NAME}】吉方位診断のお申込みありがとうございます`;

  const body = `${data.name} 様

この度は「${BRAND_NAME}」の吉方位診断にお申込みいただき、
誠にありがとうございます。

ご入力いただいた情報をもとに、鑑定士があなたの命式と
本命星を読み解き、今年の吉方位レポートをお作りします。


【お申込み内容】
━━━━━━━━━━━━━━━━━━━━━━
 お名前 : ${data.name || ''}様
 生年月日: ${data.year}年${data.month}月${data.day}日
 性別  : ${data.gender || ''}
 本命星 : ${honmeisei}
━━━━━━━━━━━━━━━━━━━━━━


【今後の流れ】
鑑定結果は3営業日以内に、このメールアドレスへ
詳細なレポートとしてお送りいたします。

少々お時間をいただきますが、何卒お待ちくださいませ。


運命の住まいとの出会いを、心よりお祈りしています。

${REPLY_SIGN}
`;

  MailApp.sendEmail({
    to: data.email,
    subject: subject,
    body: body,
    name: BRAND_NAME
  });
}


/* ====== 運営者への通知メール ====== */

function sendAdminNotification(data, honmeisei) {
  const subject = `🌙 新規申込: ${data.name || '匿名'}様（${honmeisei}）`;

  const body = `【新規の吉方位診断申込】

■ お名前   : ${data.name || '(未入力)'}
■ メール  : ${data.email || '(未入力)'}
■ 電話    : ${data.phone || '(任意・未入力)'}
■ 生年月日 : ${data.year}/${data.month}/${data.day}
■ 生時刻   : ${data.time || '不明'}
■ 性別    : ${data.gender || '(未入力)'}
■ 本命星   : ${honmeisei}
■ 現住所   : ${data.current || '(未入力)'}
■ 検討時期 : ${data.timing || '未選択'}

━━━━━━━━━━━━━━━━━━━━━━
スプレッドシートで詳細確認:
https://docs.google.com/spreadsheets/d/${SHEET_ID}
━━━━━━━━━━━━━━━━━━━━━━
`;

  MailApp.sendEmail(ADMIN_EMAIL, subject, body);
}


/* ====== 九星気学: 本命星計算 ====== */

function calcHonmeisei(year, month, day) {
  let y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  // 立春(2/4)前の生まれは前年扱い
  if (m < 2 || (m === 2 && d < 4)) y -= 1;

  // 各桁を合計 → 一桁になるまで繰り返す
  let sum = String(y).split('').reduce((a, b) => a + parseInt(b, 10), 0);
  while (sum >= 10) {
    sum = String(sum).split('').reduce((a, b) => a + parseInt(b, 10), 0);
  }

  let num = 11 - sum;
  if (num > 9) num -= 9;

  const stars = [
    '', '一白水星', '二黒土星', '三碧木星', '四緑木星',
    '五黄土星', '六白金星', '七赤金星', '八白土星', '九紫火星'
  ];
  return stars[num] || '不明';
}


/* ====== テスト用関数（初回のみ手動で実行） ====== */

function testSubmit() {
  const testData = {
    parameter: {
      name: 'テスト 太郎',
      year: '1990',
      month: '5',
      day: '15',
      time: '午の刻 11-13時',
      gender: '男性',
      email: ADMIN_EMAIL,
      current: '東京都 渋谷区',
      timing: '3ヶ月以内'
    }
  };
  const result = doPost(testData);
  console.log(result.getContent());
}
