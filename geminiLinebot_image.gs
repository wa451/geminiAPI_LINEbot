const CHANNEL_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty('CHANNEL_ACCESS_TOKEN');
const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
const LINE_ENDPOINT = 'https://api.line.me/v2/bot/message/reply';
const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`;

function doPost(e) {
  var json = JSON.parse(e.postData.contents);
  var replytoken = json.events[0].replyToken;
  if (typeof replytoken === 'undefined') {
    sendMsg("error")
    return;
  }
 // PropertiesService.getScriptProperties().setProperty('i',"a");
  var imageBlob = getImage(json.events[0].message.id);


  // BlobをBase64にエンコード
  var base64EncodedImage = Utilities.base64Encode(imageBlob.getBytes());

  var response = getGeminiProResponse(base64EncodedImage);
  var payload = {
        'replyToken': replytoken,
        'messages': [{
          'type': 'text',
          'text': response,
        }]
      };
  sendMsg(payload);
  PropertiesService.getScriptProperties().setProperty('i',"d");

  return ContentService.createTextOutput(
    JSON.stringify({'content': 'post ok'})
  ).setMimeType(ContentService.MimeType.JSON);
}

function sendMsg(payload){
     UrlFetchApp.fetch(LINE_ENDPOINT, {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN,
    },
    'method': 'post',
    'payload': JSON.stringify(payload),
  });
}

function getGeminiProResponse(base64EncodedImage) {
  const payload = {
    "contents":[
    {
      "parts":[
        {"text": "この画像について説明してください"},
        {
          "inline_data": {
            "mime_type":"image/jpeg",
            "data": base64EncodedImage
          }
        }
      ]
    }
  ]
  };

  const options = {
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

function getImage(id) {
  //画像取得用エンドポイント
  var url = 'https://api-data.line.me/v2/bot/message/' + id + '/content';
  var data = UrlFetchApp.fetch(url,{
    'headers': {
      'Authorization' :  'Bearer ' + CHANNEL_ACCESS_TOKEN,
    },
    'method': 'get'
  });
  //ファイル名を被らせないように、今日のDateのミリ秒をファイル名にしています
  var img = data.getBlob();
  return img;
}