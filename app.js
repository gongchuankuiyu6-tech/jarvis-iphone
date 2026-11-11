alert("JARVISのJavaScriptが起動しました！");
const $ = (id) => document.getElementById(id);
const messages = $("messages");
let recognition = null;
let listening = false;

function updateClock(){
  const now = new Date();
  $("clock").textContent = now.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  $("date").textContent = now.toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"long"}).toUpperCase();
}
updateClock(); setInterval(updateClock,1000);

function addMessage(who,text){
  const item=document.createElement("div");
  item.className="message "+(who==="YOU"?"user":"jarvis");
  const speaker=document.createElement("div");speaker.className="speaker";speaker.textContent=who;
  const body=document.createElement("div");body.textContent=text;
  item.append(speaker,body);messages.appendChild(item);messages.scrollTop=messages.scrollHeight;
}

function speak(text){
  if(!("speechSynthesis" in window)){ $("micNote").textContent="このブラウザでは音声読み上げに対応していません"; return; }
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang="ja-JP"; utterance.rate=0.92; utterance.pitch=0.82; utterance.volume=1;
  const voices=window.speechSynthesis.getVoices();
  const ja=voices.filter(v=>v.lang && v.lang.toLowerCase().startsWith("ja"));
  // Voice gender is not consistently exposed by iOS. Select a Japanese voice; actual tone depends on device settings.
  if(ja.length) utterance.voice=ja[0];
  window.speechSynthesis.speak(utterance);
}
if("speechSynthesis" in window) window.speechSynthesis.onvoiceschanged=()=>{};
 
async function respond(raw){
  const q = raw.trim();
  if(!q) return;

  addMessage("YOU", q);

  let answer = "";

  // 時刻と日付は今まで通り端末で確認
  if(/何時|時刻|時間/.test(q)){
    answer = "現在の時刻は、" +
      new Date().toLocaleTimeString("ja-JP", {
        hour:"2-digit", minute:"2-digit"
      }) + "です。";
  }else if(/日付|何日|今日/.test(q)){
    answer = "本日は、" +
      new Date().toLocaleDateString("ja-JP", {
        year:"numeric", month:"long",
        day:"numeric", weekday:"long"
      }) + "です。";
  }else{
    try{
      const response = await fetch(
        "https://jarvis-chat-api-backend--gongchuankuiyu6.replit.app/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: q,
            history: []
          })
        }
      );

      const data = await response.json();

      if(!response.ok){
        throw new Error(
          data.error?.message || "サーバーとの通信に失敗しました。"
        );
      }

      answer = data.reply || "回答を取得できませんでした。";

    }catch(error){
      answer = "申し訳ありません。AIサーバーに接続できませんでした。";
      console.error(error);
    }
  }

  addMessage("JARVIS", answer);
  speak(answer);
}

$("chatForm").addEventListener("submit",e=>{
  e.preventDefault();
  const v=$("chatInput").value;
  $("chatInput").value="";
  respond(v);
});

document.querySelectorAll(".quick").forEach(b=>{
  b.addEventListener("click",()=>respond(b.dataset.command));
});

$("clearButton").addEventListener("click",()=>{
  messages.innerHTML="";
});

const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SpeechRecognition){
  recognition=new SpeechRecognition();recognition.lang="ja-JP";recognition.interimResults=false;recognition.maxAlternatives=1;
  recognition.onstart=()=>{listening=true;$("micButton").classList.add("listening");$("micLabel").textContent="聞き取り中…";$("assistantState").textContent="LISTENING";};
  recognition.onend=()=>{listening=false;$("micButton").classList.remove("listening");$("micLabel").textContent="タップして話す";$("assistantState").textContent="STANDBY";};
  recognition.onresult=e=>respond(e.results[0][0].transcript);
  recognition.onerror=e=>{$("micNote").textContent="音声入力エラー: "+e.error+"。テキスト入力も利用できます。";};
  $("micButton").addEventListener("click",()=>{if(listening)recognition.stop();else{try{recognition.start();}catch(e){$("micNote").textContent="少し待ってからもう一度お試しください。";}}});
}else{
  $("micButton").addEventListener("click",()=>{$("micNote").textContent="このiPhoneのブラウザでは音声入力が利用できない場合があります。下の入力欄をご利用ください。";});
  $("micNote").textContent="このブラウザは音声入力に未対応の可能性があります。テキスト入力は利用できます。";
}

if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
}
