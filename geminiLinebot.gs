const CHANNEL_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty('CHANNEL_ACCESS_TOKEN');
const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
const LINE_ENDPOINT = 'https://api.line.me/v2/bot/message/reply';
const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

var messages = PropertiesService.getScriptProperties().getProperty('messages');
messages = messages ? JSON.parse(messages) : []; // もし以前に保存されたものがなければ、空の配列を作成

function doPost(e) {
  var json = JSON.parse(e.postData.contents);
  var replytoken = json.events[0].replyToken;
  if (typeof replytoken === 'undefined') {
    return;
  }
  var questionText = json.events[0].message.text;
  var userPart = {"role": "user",
              "parts": [{
                "text": questionText}]};
  messages.push(userPart);

  var response = getGeminiProResponse(messages);
  var modelPart = {"role": "model",
                "parts": [{
                  "text": response}]};
  messages.push(modelPart);
  while(messages.length > 8){
    messages.shift();
  }
  
   UrlFetchApp.fetch(LINE_ENDPOINT, {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN,
    },
    'method': 'post',
    'payload': JSON.stringify({
      'replyToken': replytoken,
      'messages': [{
        'type': 'text',
        'text': response,
      }],
    }),
  });

  PropertiesService.getScriptProperties().setProperty('messages', JSON.stringify(messages));

  return ContentService.createTextOutput(
    JSON.stringify({'content': 'post ok'})
  ).setMimeType(ContentService.MimeType.JSON);
}

function getGeminiProResponse(messages) {
  const payload = {
    "contents": messages,
    //"generationConfig": {"maxOutputTokens": 100,}
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(GEMINI_API_ENDPOINT, options);
  const jsonResponse = JSON.parse(response.getContentText());

  if (jsonResponse && jsonResponse.candidates && jsonResponse.candidates.length > 0) {
    const answerText = jsonResponse.candidates[0].content.parts[0].text;
    return answerText;
  } else {
    return "回答を取得できませんでした。";
  }
}