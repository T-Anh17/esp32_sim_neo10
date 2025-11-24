#include "webserver.h"
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <DNSServer.h>

static AsyncWebServer server(80);
static DNSServer dnsServer;

// >>> Đổi tên này theo ý bạn (chỉ dùng để HƯỚNG DẪN người dùng gõ HTTP)
static const byte DNS_PORT = 53;
static IPAddress apIP(192, 168, 4, 1);

static const char *FRIENDLY_HOST = "setup.device";

void taskSendSMS(void *param)
{
  String link = getGPSLink();
  SIM7680C_sendSMS(link);
  vTaskDelete(NULL);
}

static void sendLanding(AsyncWebServerRequest *req)
{
  if (auto *c = req->client())
    c->setNoDelay(true);

  const char *html = R"HTML(
<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Thiết lập SOS</title>
<style>
  :root{
    --bg:#0b1220; --ink:#eef2ff; --muted:#9aa6c6; --brand:#2563eb; --ok:#16a34a;
    --card:#0f172acc; --border:#23324d; --radius:18px;
  }
  *{box-sizing:border-box} html,body{height:100%}
  body{
    margin:0; font-family:system-ui, Segoe UI, Roboto, Arial;
    background:var(--bg); color:var(--ink);
    display:flex; align-items:center; justify-content:center; padding:16px;
  }
  .wrap{ width:min(720px,100%); }
  .card{
    background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
    padding:18px; box-shadow:0 10px 30px #0006;
  }
  .title{margin:6px 0 8px; font-size:22px; font-weight:800; letter-spacing:.2px}
  .hint{margin:0 0 12px; color:var(--muted); font-size:13px}
  .grid{ display:grid; grid-template-columns:1fr; gap:12px; }
  @media (min-width:640px){ .grid{ grid-template-columns: 1fr 1fr; } }
  label{ font-size:14px; color:var(--muted); margin-bottom:6px; display:block }
  input{
    width:100%; padding:12px 12px; border-radius:12px; outline:none;
    background:#1e293b; border:1px solid var(--border); color:#fff; font-size:16px;
  }
  .actions{
    display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; margin-top:12px;
  }
  button{ appearance:none; border:0; border-radius:12px; padding:12px 16px; font-weight:700; cursor:pointer; }
  .save{ background:var(--brand); color:#fff }
  .send{ background:var(--ok); color:#06210d }
  .toast{
    position:fixed; left:50%; transform:translateX(-50%);
    bottom:16px; padding:10px 14px; border-radius:10px; font-size:14px;
    background:#0f172aff; border:1px solid var(--border); color:#fff; display:none;
  }
  .row{ display:flex; flex-direction:column; gap:6px }
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="title">Thiết lập SOS</div>
      <p class="hint">Mẹo: lần sau chỉ cần gõ <b>http://setup.device</b> để mở trang này.</p>

      <div class="grid">
        <div class="row">
          <label>Số điện thoại</label>
          <input id="phone" type="tel" inputmode="tel" placeholder="+84775316675" autocomplete="tel" required>
        </div>
        <div class="row">
          <label>Nội dung</label>
          <input id="message" type="text" placeholder="HELP ME" maxlength="160" required>
        </div>
      </div>

      <div class="actions">
        <button class="save" id="saveBtn">💾 Lưu</button>
        <button class="send" id="sendBtn">✉️ Gửi tin nhắn</button>
      </div>
    </div>
  </div>

  <div id="toast" class="toast"></div>

<script>
(function(){
  const phoneEl = document.getElementById('phone');
  const msgEl   = document.getElementById('message');
  const toastEl = document.getElementById('toast');

  function toast(t, ok=true){
    toastEl.textContent = t;
    toastEl.style.borderColor = ok ? '#1f6feb' : '#ef4444';
    toastEl.style.display = 'block';
    setTimeout(()=> toastEl.style.display='none', 1600);
  }

  function normalizePhone(raw){
    let s = (raw||'').replace(/[^\d+]/g,'');
    if (s.startsWith('00')) s = '+' + s.slice(2);
    if (s.startsWith('0'))  s = '+84' + s.slice(1);
    if (!s.startsWith('+')) s = '+' + s;
    return s;
  }

  function buildPayload(){
    const p = normalizePhone(phoneEl.value);
    const m = msgEl.value.trim();
    return { phone: p, message: m };
  }

  async function postForm(url, data){
    const body = new URLSearchParams(data).toString();
    const r = await fetch(url, {
      method:'POST',
      headers: { 'Content-Type':'application/x-www-form-urlencoded' },
      body
    });
    if (!r.ok) throw new Error('HTTP '+r.status);
    return await r.text();
  }

  document.getElementById('saveBtn').onclick = async ()=>{
    try{
      const {phone, message} = buildPayload();
      if (!phone || phone.length < 9) return toast('Số điện thoại không hợp lệ', false);
      if (!message) return toast('Nội dung trống', false);
      await postForm('/save', { phone, message });
      toast('Đã lưu');
    }catch(e){ toast('Lưu thất bại', false); }
  };

  document.getElementById('sendBtn').onclick = async ()=>{
    try{
      const {phone, message} = buildPayload();
      if (!phone || phone.length < 9) return toast('Số điện thoại không hợp lệ', false);
      if (!message) return toast('Nội dung trống', false);
      await postForm('/send', { phone, message });
      toast('Đã gửi yêu cầu');
    }catch(e){ toast('Gửi thất bại', false); }
  };

  setTimeout(()=> { if (window.innerWidth<640) phoneEl.focus(); }, 300);
})();
</script>
</body></html>
)HTML";

  req->send(200, "text/html; charset=UTF-8", html);
}

void initFriendlyNamePortal()
{
  Serial.begin(115200);

  // Wi-Fi AP tối ưu cho portal
  WiFi.persistent(false);
  WiFi.mode(WIFI_AP);
  WiFi.setSleep(false);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
  WiFi.softAP("TV_Device", "123456788", 6 /*kênh*/, 0 /*hidden*/);

  Serial.print("[AP] IP: ");
  Serial.println(WiFi.softAPIP());

  // DNS wildcard: bất kỳ tên miền -> apIP
  dnsServer.start(DNS_PORT, "*", apIP);

  // Trang chính
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *r)
            { sendLanding(r); });

  // Lưu vào bộ nhớ
  server.on("/save", HTTP_POST, [](AsyncWebServerRequest *r)
            {
  if (r->hasParam("phone", true) && r->hasParam("message", true)) {
    String phone = r->getParam("phone", true)->value();
    String message = r->getParam("message", true)->value();

    saveDataToRom(phone, message); // 🔹 Lưu vào NVS + cập nhật PHONE/SMS

    r->send(200, "text/plain", "OK");
  } else {
    r->send(400, "text/plain", "Missing params");
  } });

  // Gui tin nhắn
  server.on("/send", HTTP_POST, [](AsyncWebServerRequest *r)
            {
  String phone, message;

  // Ưu tiên lấy dữ liệu mới từ form
  if (r->hasParam("phone", true))
    phone = r->getParam("phone", true)->value();
  else if (strlen(PHONE) > 0)
    phone = PHONE; // fallback: dùng giá trị đã lưu

  if (r->hasParam("message", true))
    message = r->getParam("message", true)->value();
  else if (strlen(SMS) > 0)
    message = SMS;

  // Nếu thiếu dữ liệu thì báo lỗi
  if (phone.isEmpty() || message.isEmpty()) {
    r->send(400, "text/plain", "Chưa nhập số điện thoại hoặc nội dung");
    Serial.println("[WARN] Không có số điện thoại hoặc nội dung để gửi SMS");
    return;
  }

  // Lưu lại để cập nhật NVS + biến toàn cục
  saveDataToRom(phone, message);

  // 🔹 Bước 1: lấy link GPS
  String link = getGPSLink(); // ví dụ: "https://maps.google.com/?q=10.1234,106.5678"
  Serial.printf("[GPS] Link: %s\n", link.c_str());

  // 🔹 Bước 2: Gọi hàm gửi SMS (nội dung = SMS + link)
  xTaskCreatePinnedToCore(taskSendSMS, "taskSendSMS", 4096, NULL, 1, NULL, 1);

  r->send(200, "text/plain", "Đang gửi SMS..."); });

  // Redirect mọi URL khác về tên dễ nhớ (giúp người dùng thấy đúng tên)
  server.onNotFound([](AsyncWebServerRequest *r)
                    {
    String url = String("http://") + FRIENDLY_HOST + "/";
    AsyncWebServerResponse* resp = r->beginResponse(302, "text/plain", "");
    resp->addHeader("Location", url);
    r->send(resp); });

  // (tuỳ chọn) chặn cache để luôn tải mới
  // DefaultHeaders::Instance().addHeader("Cache-Control", "no-store");

  server.begin();
  Serial.println("[Web] Friendly-name portal ready ✅");
}

void loopFriendlyNamePortal()
{
  dnsServer.processNextRequest(); // cần gọi thường xuyên trong loop
}
