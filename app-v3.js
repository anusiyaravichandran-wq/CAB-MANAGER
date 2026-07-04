/* ===================== FIREBASE CONFIG ===================== */
/* TODO: Replace with your own Firebase project config (Firestore + Auth-anonymous enabled) */
const firebaseConfig = {
  apiKey: "AIzaSyAeupI3EuaNwcII_rDexSmQR8ais_csfSw",
  authDomain: "taxi-maintenance.firebaseapp.com",
  projectId: "taxi-maintenance",
  storageBucket: "taxi-maintenance.firebasestorage.app",
  messagingSenderId: "323446645683",
  appId: "1:323446645683:web:1016eadfaa260816a8e1c6"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Guarantees a signed-in (anonymous) Firebase user before any Firestore read/write.
// Firestore security rules require request.auth != null, so every login-screen
// action (owner lookup, join-code check, driver login) must wait on this first —
// otherwise the read silently fails and the screen looks frozen.
let _authReadyPromise = null;
function ensureAuth(){
  if(!_authReadyPromise){
    _authReadyPromise = new Promise((resolve, reject)=>{
      const unsub = auth.onAuthStateChanged((user)=>{
        unsub();
        if(user) resolve(user);
        else auth.signInAnonymously().then((cred)=> resolve(cred.user)).catch(reject);
      });
    });
  }
  return _authReadyPromise;
}

/* ===================== CONSTANTS ===================== */
let currentCabId = null; // set after login: owner picks via cab selector, driver gets it from their active assignment
let currentSalaryPct = 0.30; // default 30% — owner-editable per driver from the Drivers tab
let currentSalaryBasis = "revenue"; // "revenue" | "netEarnings" — owner-editable per driver from the Drivers tab
const TOLL_GST_PCT = 0.05;
const COUNTRY_CODE = "+91"; // adjust if drivers/owners are outside India

let currentLang = localStorage.getItem("lang") || "en";
let currentUser = null; // 'owner' | 'driver'

/* ===================== TRANSLATIONS ===================== */
const T = {
  en: {
    appname:"Taxi Tracker", tagline:"Revenue & Payout Tracker", owner:"Owner", driver:"Driver", login:"Login",
    date:"Date", leave:"Mark today as Leave", kmsec:"Kilometers", startkm:"Start KM", endkm:"End KM",
    revsec:"Revenue", trip:"Trip Payment (Total Fare, as per bill)", online:"Online / RedTaxi Credit",
    netearnings:"Net Earnings (as shown in RedTaxi app)", netearningshint:"Base fare only, before GST/convenience fee — RedTaxi shows this separately from Revenue. Only used if your owner has chosen Net Earnings as the salary basis.",
    tollbill:"Toll Charges (as per bill)", tollbillhint:"Enter the base Toll Charges line from the customer's bill (not the GST line) — the app adds 5% GST automatically and excludes the total only when calculating driver salary.",
    expsec:"Expenses", fuel:"Fuel", fuelcash:"Fuel (Cash)", fuelcard:"Fuel (Card)",
    parking:"Parking (cash)", tollcollected:"Toll Collected (FASTag)",
    otherexp:"Other Expenses", addexpense:"Add Expense", otherexptotal:"Other Expenses Total",
    expamount:"Amount", expdesc:"Description",
    calcsec:"Auto Calculated", totalrev:"Total Revenue",
    salary30:"Driver Salary", salarybasehint:"Toll-in-Bill is excluded from whichever basis is used above",
    addtoll:"+ Toll Collected (FASTag)", deduct:"− Online, Fuel(Cash), Parking, Other Exp.",
    owneramt:"Owner Amount", paysec:"Owner Payment Status", unpaid:"Unpaid", paid:"Paid", cashpaid:"Cash Paid",
    upipaid:"UPI Paid", saveentry:"Save Entry", outstanding:"Total Outstanding (Unpaid)", monthpick:"Month",
    insurance:"Insurance", tyre:"Tyre Cost", redcomm:"RedTaxi Commission", maintbudget:"Maintenance (Budget)",
    maintactual:"Actual Maintenance", others:"Others", notes:"Notes", savemaint:"Save Maintenance",
    commhint:"RedTaxi settles commission 3x/month: 1–10 (paid 13th), 11–20 (paid 23rd), 21–end (paid 3rd next month). Enter the total commission for the month here.",
    today:"Today", revenue:"Revenue", salary:"Driver Salary", owneramount:"Owner Amount", status:"Status",
    thismonth:"This Month", totalrevenue:"Total Revenue", kmdriven:"KM Driven", fixedcosts:"EMI+Ins+Tyre+Maint+Others",
    profit:"Profit", paidtotal:"Owner Amount Paid", paidcash:"— Cash", paidupi:"— UPI", unpaidtotal:"Unpaid (Outstanding)",
    tab_entry:"Entry", tab_payout:"Payout", tab_maint:"Maintenance", tab_dash:"Dashboard", tab_cabs:"Cabs", tab_drivers:"Drivers", tab_mydash:"Dashboard",
    headerEntry:"Daily Entry", headerPayout:"Payout Details", headerMaint:"Maintenance", headerDash:"Dashboard", headerCabs:"Your Cabs", headerDrivers:"Drivers", headerSettings:"Settings", headerMydash:"My Dashboard",
    myincome:"My Income", myincome2:"My Income",
    ownerCabSelectLabel:"Viewing Cab", waitingForCab:"Waiting for your owner to assign you a cab.", checkAgain:"Check Again",
    joinOwner:"Join Owner", loginExisting:"Login (already joined)",
    careSection:"Customer Care", careSection2:"Customer Care", backupSection:"Backup Data",
    exportBackup:"Export Backup", importBackup:"Import Backup",
    wrongPin:"Wrong PIN, try again", savedOk:"Saved successfully", fillRequired:"Please fill required fields",
    splitMismatch:"Cash + UPI must equal Owner Amount", markPaid:"Mark Paid", markUnpaid:"Mark Unpaid", edit:"Edit",
    leaveTag:"Leave Day", noEntries:"No entries yet", delete:"Delete", confirmDelete:"Delete this entry?",
    share:"Share", shareReceiptTitle:"Daily Payout", shareFailed:"Couldn't generate image", shareFallback:"Image downloaded — attach it on WhatsApp",
    srTripRev:"Trip Total (Fare)", srOnline:"Online/Credit (settled separately)", srFuelCash:"Fuel (Cash)", srParking:"Parking",
    srOtherExp:"Other Expenses", srTollCollected:"Toll Collected", srSalary:"Driver Salary",
    srHandover:"Handed Over To Owner",
    reportsec:"Reports & Export", expdaily:"Daily (Range)", expmonthly:"Monthly",
    startdate:"Start Date", enddate:"End Date", reportmonth:"Month",
    exportpdf:"Export PDF", exportexcel:"Export Excel",
  },
  ta: {
    appname:"டாக்ஸி கணக்கு", tagline:"வருமானம் & கொடுப்பனவு கணக்கு", owner:"உரிமையாளர்", driver:"டிரைவர்", login:"உள்நுழைய",
    date:"தேதி", leave:"இன்று லீவு", kmsec:"கிலோமீட்டர்", startkm:"தொடக்க KM", endkm:"முடிவு KM",
    revsec:"வருமானம்", trip:"டிரிப் பணம் (மொத்த கட்டணம், பில் படி)", online:"ஆன்லைன் / RedTaxi கிரெடிட்",
    netearnings:"நிகர வருமானம் (RedTaxi ஆப்பில் காட்டப்படும்)", netearningshint:"அடிப்படை கட்டணம் மட்டும், GST/வசதி கட்டணத்திற்கு முன் — RedTaxi இதை வருமானத்திலிருந்து தனியாக காட்டும். உரிமையாளர் நிகர வருமான அடிப்படையை தேர்ந்தால் மட்டும் இது பயன்படுத்தப்படும்.",
    tollbill:"டோல் கட்டணம் (பில் படி)", tollbillhint:"வாடிக்கையாளர் பில்லில் உள்ள அடிப்படை டோல் கட்டணத்தை மட்டும் உள்ளிடவும் (GST வரி இல்லாமல்) — ஆப் தானாக 5% GST சேர்த்து, டிரைவர் சம்பளம் கணக்கிடும்போது மட்டும் அந்த மொத்தத்தை கழிக்கும்.",
    expsec:"செலவுகள்", fuel:"எரிபொருள்", fuelcash:"எரிபொருள் (கேஷ்)", fuelcard:"எரிபொருள் (கார்டு)",
    parking:"பார்க்கிங் (கேஷ்)", tollcollected:"வசூலித்த டோல் (FASTag)",
    otherexp:"மற்ற செலவுகள்", addexpense:"செலவு சேர்க்க", otherexptotal:"மற்ற செலவுகள் மொத்தம்",
    expamount:"தொகை", expdesc:"விவரம்",
    calcsec:"தானியங்கி கணக்கீடு", totalrev:"மொத்த வருமானம்",
    salary30:"டிரைவர் சம்பளம்", salarybasehint:"மேலே உள்ள எந்த அடிப்படையிலும் பில் டோல் கழிக்கப்படும்",
    addtoll:"+ வசூலித்த டோல் (FASTag)", deduct:"− ஆன்லைன், எரிபொருள்(கேஷ்), பார்க்கிங், மற்ற செலவுகள்",
    owneramt:"உரிமையாளர் தொகை", paysec:"கட்டண நிலை", unpaid:"செலுத்தப்படவில்லை", paid:"செலுத்தப்பட்டது", cashpaid:"கேஷ்",
    upipaid:"UPI", saveentry:"சேமிக்க", outstanding:"மொத்த நிலுவை", monthpick:"மாதம்",
    insurance:"இன்சூரன்ஸ்", tyre:"டயர் செலவு", redcomm:"RedTaxi கமிஷன்", maintbudget:"பராமரிப்பு (பட்ஜெட்)",
    maintactual:"உண்மையான பராமரிப்பு", others:"மற்றவை", notes:"குறிப்புகள்", savemaint:"சேமிக்க",
    commhint:"RedTaxi மாதம் 3 முறை கமிஷன் வசூலிக்கும்: 1–10 (13ம் தேதி), 11–20 (23ம் தேதி), 21–முடிவு (அடுத்த மாத 3ம் தேதி). மாத மொத்த கமிஷனை இங்கே உள்ளிடவும்.",
    today:"இன்று", revenue:"வருமானம்", salary:"டிரைவர் சம்பளம்", owneramount:"உரிமையாளர் தொகை", status:"நிலை",
    thismonth:"இந்த மாதம்", totalrevenue:"மொத்த வருமானம்", kmdriven:"ஓட்டிய KM", fixedcosts:"EMI+இன்சூரன்ஸ்+டயர்+பராமரிப்பு+மற்றவை",
    profit:"லாபம்", paidtotal:"செலுத்திய தொகை", paidcash:"— கேஷ்", paidupi:"— UPI", unpaidtotal:"நிலுவை",
    tab_entry:"உள்ளீடு", tab_payout:"கொடுப்பனவு", tab_maint:"பராமரிப்பு", tab_dash:"டாஷ்போர்டு", tab_cabs:"கார்கள்", tab_drivers:"டிரைவர்கள்", tab_mydash:"டாஷ்போர்டு",
    headerEntry:"தினசரி உள்ளீடு", headerPayout:"கொடுப்பனவு விவரம்", headerMaint:"பராமரிப்பு", headerDash:"டாஷ்போர்டு", headerCabs:"உங்கள் கார்கள்", headerDrivers:"டிரைவர்கள்", headerSettings:"அமைப்புகள்", headerMydash:"என் டாஷ்போர்டு",
    myincome:"என் வருமானம்", myincome2:"என் வருமானம்",
    ownerCabSelectLabel:"பார்க்கும் கார்", waitingForCab:"உரிமையாளர் கார் ஒதுக்கும் வரை காத்திருக்கவும்.", checkAgain:"மீண்டும் சரிபார்க்க",
    joinOwner:"உரிமையாளரை இணை", loginExisting:"உள்நுழைய (ஏற்கனவே இணைந்தவர்)",
    careSection:"வாடிக்கையாளர் சேவை", careSection2:"வாடிக்கையாளர் சேவை", backupSection:"தரவு காப்புப்பிரதி",
    exportBackup:"காப்புப்பிரதி பதிவிறக்கம்", importBackup:"காப்புப்பிரதி மீட்டமை",
    wrongPin:"தவறான PIN, மீண்டும் முயற்சிக்கவும்", savedOk:"வெற்றிகரமாக சேமிக்கப்பட்டது", fillRequired:"தேவையான புலங்களை நிரப்பவும்",
    splitMismatch:"கேஷ் + UPI = உரிமையாளர் தொகைக்கு சமமாக இருக்க வேண்டும்", markPaid:"செலுத்தியதாக குறி", markUnpaid:"செலுத்தாததாக குறி", edit:"திருத்து",
    leaveTag:"லீவு நாள்", noEntries:"உள்ளீடுகள் இல்லை", delete:"நீக்கு", confirmDelete:"இந்த உள்ளீட்டை நீக்கவா?",
    share:"பகிர்", shareReceiptTitle:"தினசரி கொடுப்பனவு", shareFailed:"படம் உருவாக்க முடியவில்லை", shareFallback:"படம் டவுன்லோட் ஆனது — WhatsApp இல் இணைக்கவும்",
    srTripRev:"டிரிப் மொத்த கட்டணம்", srOnline:"ஆன்லைன்/கிரெடிட் (தனியாக தீர்வு)", srFuelCash:"எரிபொருள் (கேஷ்)", srParking:"பார்க்கிங்",
    srOtherExp:"மற்ற செலவுகள்", srTollCollected:"வசூலித்த டோல்", srSalary:"டிரைவர் சம்பளம்",
    srHandover:"உரிமையாளரிடம் ஒப்படைத்தது",
    reportsec:"அறிக்கை & ஏற்றுமதி", expdaily:"தினசரி (வரம்பு)", expmonthly:"மாதம் வாரியாக",
    startdate:"தொடக்க தேதி", enddate:"முடிவு தேதி", reportmonth:"மாதம்",
    exportpdf:"PDF ஏற்றுமதி", exportexcel:"Excel ஏற்றுமதி",
  }
};
function tr(key){ return (T[currentLang] && T[currentLang][key]) || T.en[key] || key; }

function applyTranslations(){
  document.querySelectorAll("[id^='t_']").forEach(el=>{
    const key = el.id.slice(2);
    if(T.en[key]) el.textContent = tr(key);
  });
  document.getElementById("langTaBtn").className = currentLang==="ta"?"on":"";
  document.getElementById("langEnBtn").className = currentLang==="en"?"on":"";
  document.getElementById("langTaBtn2").className = currentLang==="ta"?"on":"";
  document.getElementById("langEnBtn2").className = currentLang==="en"?"on":"";
  updateHeader();
  buildTabbar();
}
function setLang(l){ currentLang = l; localStorage.setItem("lang", l); applyTranslations(); renderActiveScreen(); }

/* ===================== AUTH HELPERS ===================== */
function normalizeMobile(raw){ return (raw||"").replace(/\D/g,"").slice(-10); }
function genOwnerId(){ return "OWN" + Math.floor(100000 + Math.random()*900000); }
function nowTs(){ return Date.now(); }
function showAuthScreen(fullId){
  document.querySelectorAll(".screen").forEach(s=>{ s.classList.remove("active"); s.classList.remove("show"); });
  document.getElementById(fullId).classList.add("active");
}
function genJoinCode(){ return Math.random().toString(36).slice(2,8).toUpperCase(); }
function goOwnerMobile(){ showAuthScreen("screen_ownerMobile"); }
function goDriverStart(){ showAuthScreen("screen_driverStart"); }
function goDriverLoginScreen(){ showAuthScreen("screen_driverLogin"); }
function goDriverJoinScreen(){ showAuthScreen("screen_driverJoin"); }
function backToOwnerMobile(){ showAuthScreen("screen_ownerMobile"); }

/* ===================== OWNER LOGIN (mobile + PIN, no OTP) ===================== */
let currentOwnerId = null, currentOwnerMobile = null;

async function ownerContinue(){
  const mobile = normalizeMobile(document.getElementById("ownerMobileInput").value);
  if(mobile.length !== 10){ showToast("Enter a valid 10-digit mobile number"); return; }
  currentOwnerMobile = mobile;
  try{
    await ensureAuth();
    const indexDoc = await db.collection("ownerMobileIndex").doc(mobile).get();
    if(indexDoc.exists){
      currentOwnerId = indexDoc.data().ownerId;
      document.getElementById("ownerPinMobileLabel").textContent = `Owner account for ${mobile}`;
      document.getElementById("ownerPinInput").value = "";
      showAuthScreen("screen_ownerEnterPin");
    } else {
      document.getElementById("ownerNewPinInput").value = "";
      document.getElementById("ownerNewPinConfirmInput").value = "";
      showAuthScreen("screen_ownerSetPin");
    }
  }catch(err){
    console.error("ownerContinue failed:", err);
    showToast("Couldn't reach the server — check connection and try again");
  }
}
async function ownerEnterPinSubmit(){
  const pin = document.getElementById("ownerPinInput").value.trim();
  if(pin.length !== 4){ showToast("Enter your 4-digit PIN"); return; }
  try{
    await ensureAuth();
    const ownerDoc = await db.collection("owners").doc(currentOwnerId).get();
    if(!ownerDoc.exists || ownerDoc.data().pin !== pin){ showToast("Incorrect PIN"); return; }
    localStorage.setItem("taxiapp_v3_ownerId", currentOwnerId);
    currentUser = "owner";
    currentCabId = null;
    enterApp();
  }catch(err){
    console.error("ownerEnterPinSubmit failed:", err);
    showToast("Couldn't reach the server — check connection and try again");
  }
}
async function ownerSetPin(){
  const pin = document.getElementById("ownerNewPinInput").value.trim();
  const confirmPin = document.getElementById("ownerNewPinConfirmInput").value.trim();
  if(pin.length !== 4){ showToast("PIN must be 4 digits"); return; }
  if(pin !== confirmPin){ showToast("PINs don't match"); return; }
  try{
    await ensureAuth();
    await createOwner(currentOwnerMobile, pin);
    localStorage.setItem("taxiapp_v3_ownerId", currentOwnerId);
    currentUser = "owner";
    currentCabId = null;
    enterApp();
  }catch(err){
    console.error("ownerSetPin failed:", err);
    showToast("Couldn't reach the server — check connection and try again");
  }
}
async function createOwner(mobile, pin){
  let ownerId;
  for(let i=0;i<5;i++){
    ownerId = genOwnerId();
    const check = await db.collection("owners").doc(ownerId).get();
    if(!check.exists) break;
  }
  await db.collection("owners").doc(ownerId).set({ ownerId, mobile, pin, joinCode: genJoinCode(), createdAt: nowTs() });
  await db.collection("ownerMobileIndex").doc(mobile).set({ ownerId });
  currentOwnerId = ownerId;
}

/* ===================== DRIVER JOIN (Owner ID + mobile + Join Code, no OTP) ===================== */
let joinOwnerId = null, joinDriverMobile = null, joinExistingDriverId = null;

async function submitJoinRequest(){
  const ownerId = (document.getElementById("joinOwnerIdInput").value||"").trim().toUpperCase();
  const mobile = normalizeMobile(document.getElementById("joinDriverMobileInput").value);
  const code = (document.getElementById("joinCodeInput").value||"").trim().toUpperCase();
  if(!ownerId){ showToast("Enter the Owner ID"); return; }
  if(mobile.length !== 10){ showToast("Enter a valid 10-digit mobile number"); return; }
  if(!code){ showToast("Enter the Join Code from your owner"); return; }
  try{
    await ensureAuth();
    const ownerDoc = await db.collection("owners").doc(ownerId).get();
    if(!ownerDoc.exists){ showToast("Owner ID not found — check with your owner"); return; }
    if((ownerDoc.data().joinCode||"").toUpperCase() !== code){ showToast("Incorrect Join Code — ask your owner for the current one"); return; }

    const existingSnap = await db.collection("drivers").where("mobile","==",mobile).limit(1).get();
    if(!existingSnap.empty){
      const ex = existingSnap.docs[0];
      const exData = ex.data();
      if(exData.ownerId === ownerId){
        if(exData.status === "active"){ showToast("Already joined this owner — try logging in instead"); return; }
        joinExistingDriverId = ex.id;
      } else {
        showToast("This mobile is already linked to a different owner"); return;
      }
    } else {
      joinExistingDriverId = null;
    }

    joinOwnerId = ownerId; joinDriverMobile = mobile;
    showAuthScreen("screen_driverSetPin");
  }catch(err){
    console.error("submitJoinRequest failed:", err);
    showToast("Couldn't reach the server — check connection and try again");
  }
}
async function setDriverPin(){
  const pin = document.getElementById("newPinInput").value.trim();
  const confirmPin = document.getElementById("newPinConfirmInput").value.trim();
  if(pin.length !== 4){ showToast("PIN must be 4 digits"); return; }
  if(pin !== confirmPin){ showToast("PINs don't match"); return; }
  const driverData = { mobile: joinDriverMobile, ownerId: joinOwnerId, pin, status:"active", joinedAt: nowTs() };
  try{
    await ensureAuth();
    if(joinExistingDriverId){
      await db.collection("drivers").doc(joinExistingDriverId).set(driverData, {merge:true});
    } else {
      driverData.salaryPct = 0.30; // default 30%, owner can change from the Drivers tab
      driverData.salaryBasis = "revenue"; // default basis, owner can switch to Net Earnings from the Drivers tab
      await db.collection("drivers").add(driverData);
    }
    showToast("Joined successfully! Log in with your mobile + PIN.");
    goDriverLoginScreen();
  }catch(err){
    console.error("setDriverPin failed:", err);
    showToast("Couldn't reach the server — check connection and try again");
  }
}

/* ===================== DRIVER DAILY LOGIN (mobile + PIN, no OTP) ===================== */
let currentDriverId = null;

async function driverLogin(){
  const mobile = normalizeMobile(document.getElementById("loginMobileInput").value);
  const pin = document.getElementById("loginPinInput").value.trim();
  if(mobile.length !== 10 || pin.length !== 4){ showToast("Enter mobile and 4-digit PIN"); return; }
  try{
    await ensureAuth();
    const snap = await db.collection("drivers").where("mobile","==",mobile).limit(1).get();
    if(snap.empty){ showToast("No account found for this mobile"); return; }
    const doc = snap.docs[0];
    const d = doc.data();
    if(d.status === "pending"){ showToast("Your join request is still waiting on owner approval"); return; }
    if(d.status === "inactive"){ showToast("Your account is paused — contact your owner"); return; }
    if(d.status === "deleted"){ showToast("This account is no longer active"); return; }
    if(d.pin !== pin){ showToast("Incorrect PIN"); return; }
    currentDriverId = doc.id;
    localStorage.setItem("taxiapp_v3_driverId", currentDriverId);
    await resolveDriverCabAndEnter();
  }catch(err){
    console.error("driverLogin failed:", err);
    showToast("Couldn't reach the server — check connection and try again");
  }
}
async function resolveDriverCabAndEnter(){
  const assignSnap = await db.collection("driverCabAssignments")
    .where("driverId","==",currentDriverId).where("status","==","active").limit(1).get();
  if(assignSnap.empty){
    currentUser = "driver"; currentCabId = null;
    showAuthScreen("screen_driverWaiting");
    return;
  }
  currentCabId = assignSnap.docs[0].data().cabId;
  currentUser = "driver";
  enterApp();
}
async function recheckDriverAssignment(){
  showToast("Checking...");
  await resolveDriverCabAndEnter();
}

/* ===================== FORGOT PIN — handled by owner from the Drivers tab, see ownerResetDriverPin() ===================== */

/* ===================== OWNER: CABS ===================== */
async function loadCabs(){
  const snap = await db.collection("cabs").where("ownerId","==",currentOwnerId).where("status","==","active").get();
  const grid = document.getElementById("cabGrid");
  grid.innerHTML = "";
  document.getElementById("cabEmptyMsg").style.display = snap.empty ? "block":"none";
  document.getElementById("ownerIdBadge").textContent = "Owner ID: " + currentOwnerId;
  snap.forEach(doc=>{
    const d = doc.data();
    const row = document.createElement("div");
    row.className = "driver-row";
    row.innerHTML = `
      <div class="info">
        <div class="name">${d.cabId}</div>
        <div class="sub"><span class="status-pill active">active</span></div>
      </div>
      <div class="actions">
        <button class="btn danger small" onclick="unregisterCab('${d.cabId}')">Unregister</button>
      </div>`;
    grid.appendChild(row);
  });
}
async function addCab(){
  const input = document.getElementById("newCabRegInput");
  const cabId = (input.value||"").trim().toUpperCase().replace(/\s+/g,"");
  if(!cabId){ showToast("Enter a registration number"); return; }
  const ref = db.collection("cabs").doc(cabId);
  const existing = await ref.get();
  if(existing.exists && existing.data().status === "active"){
    showToast("Already registered to " + (existing.data().ownerId===currentOwnerId ? "your account" : "another owner"));
    return;
  }
  await ref.set({ cabId, ownerId: currentOwnerId, status:"active", createdAt: nowTs() });
  input.value = "";
  showToast("Cab added");
  loadCabs();
}
async function unregisterCab(cabId){
  if(!confirm(`Mark ${cabId} as unregistered (e.g. sold)? Historical records stay linked to you.`)) return;
  await db.collection("cabs").doc(cabId).set({ status:"unregistered" }, {merge:true});
  const assignSnap = await db.collection("driverCabAssignments").where("cabId","==",cabId).where("status","==","active").get();
  const batch = db.batch();
  assignSnap.forEach(doc=> batch.update(doc.ref, {status:"ended", endedAt: nowTs()}));
  await batch.commit();
  showToast("Cab unregistered");
  loadCabs();
}

/* ===================== OWNER: DRIVERS ===================== */
async function loadDrivers(){
  const snap = await db.collection("drivers")
    .where("ownerId","==",currentOwnerId).where("status","in",["pending","active","inactive"]).get();
  const list = document.getElementById("driversList");
  list.innerHTML = "";
  document.getElementById("driversEmptyMsg").style.display = snap.empty ? "block":"none";
  document.getElementById("ownerIdBadge2").textContent = "Owner ID: " + currentOwnerId;
  const ownerSelfDoc = await db.collection("owners").doc(currentOwnerId).get();
  document.getElementById("ownerJoinCodeBadge").textContent = "Join Code: " + (ownerSelfDoc.data().joinCode || "—");

  for(const doc of snap.docs){
    const d = doc.data();
    const pct = d.salaryPct!==undefined ? Math.round(d.salaryPct*100) : 30;
    const basis = d.salaryBasis || "revenue";
    const row = document.createElement("div");
    row.className = "driver-row";
    let assignedCabHtml = "", assignControlHtml = "", salaryHtml = "", basisControlHtml = "";
    if(d.status === "active"){
      const assignSnap = await db.collection("driverCabAssignments")
        .where("driverId","==",doc.id).where("status","==","active").limit(1).get();
      const currentCab = assignSnap.empty ? null : assignSnap.docs[0].data().cabId;
      const currentAssignId = assignSnap.empty ? null : assignSnap.docs[0].id;
      assignedCabHtml = currentCab ? `Cab: <b>${currentCab}</b>` : `No cab assigned`;
      const cabsSnap = await db.collection("cabs").where("ownerId","==",currentOwnerId).where("status","==","active").get();
      let options = `<option value="">— Unassigned —</option>`;
      cabsSnap.forEach(c=>{
        const sel = c.id===currentCab ? "selected":"";
        options += `<option value="${c.id}" ${sel}>${c.id}</option>`;
      });
      assignControlHtml = `<select class="assign-select" onchange="reassignCab('${doc.id}','${currentAssignId||""}', this.value)">${options}</select>`;
      salaryHtml = ` &nbsp; Salary: <b>${pct}%</b> <button class="btn secondary small" style="padding:3px 8px; font-size:10.5px;" onclick="editDriverSalaryPct('${doc.id}', ${pct})">Edit</button>`;
      basisControlHtml = `<select class="assign-select" onchange="setDriverSalaryBasis('${doc.id}', this.value)">
        <option value="revenue" ${basis==="revenue"?"selected":""}>Salary based on: Revenue (gross)</option>
        <option value="netEarnings" ${basis==="netEarnings"?"selected":""}>Salary based on: Net Earnings (base fare)</option>
      </select>`;
    }
    row.innerHTML = `
      <div class="info">
        <div class="name">${d.mobile}</div>
        <div class="sub"><span class="status-pill ${d.status}">${d.status}</span> &nbsp; ${assignedCabHtml}${salaryHtml}</div>
        ${assignControlHtml}
        ${basisControlHtml}
      </div>
      <div class="actions">
        ${d.status!=="pending" ? `<button class="toggle-switch ${d.status==='active'?'on':''}" onclick="toggleDriverActive('${doc.id}','${d.status}')"><span class="knob"></span></button>` : ""}
        ${d.status!=="pending" ? `<button class="btn secondary small" onclick="ownerResetDriverPin('${doc.id}')">Reset PIN</button>` : ""}
        <button class="btn danger small" onclick="deleteDriver('${doc.id}')">Delete</button>
      </div>`;
    list.appendChild(row);
  }
}
async function editDriverSalaryPct(driverId, currentPct){
  const input = prompt(`Salary percentage for this driver (0–100):`, currentPct);
  if(input === null) return;
  const pct = Number(input);
  if(isNaN(pct) || pct < 0 || pct > 100){ showToast("Enter a number between 0 and 100"); return; }
  await db.collection("drivers").doc(driverId).set({ salaryPct: pct/100 }, {merge:true});
  showToast(`Salary set to ${pct}%`);
  loadDrivers();
}
async function setDriverSalaryBasis(driverId, basis){
  await db.collection("drivers").doc(driverId).set({ salaryBasis: basis }, {merge:true});
  showToast(basis==="netEarnings" ? "Salary now based on Net Earnings" : "Salary now based on Revenue");
  loadDrivers();
}
async function ownerResetDriverPin(driverId){
  const pin = prompt("Enter a new 4-digit PIN for this driver:");
  if(pin === null) return;
  if(!/^\d{4}$/.test(pin)){ showToast("PIN must be exactly 4 digits"); return; }
  await db.collection("drivers").doc(driverId).set({pin}, {merge:true});
  showToast(`Driver PIN reset to ${pin} — tell them to log in with it.`);
}
async function regenerateJoinCode(){
  const code = genJoinCode();
  await db.collection("owners").doc(currentOwnerId).set({joinCode: code}, {merge:true});
  document.getElementById("ownerJoinCodeBadge").textContent = "Join Code: " + code;
  showToast("New join code generated — share it with your driver");
}
async function toggleDriverActive(driverId, currentStatus){
  const newStatus = currentStatus === "active" ? "inactive" : "active";
  await db.collection("drivers").doc(driverId).set({status:newStatus}, {merge:true});
  showToast(newStatus==="active" ? "Driver reactivated" : "Driver paused");
  loadDrivers();
}
async function deleteDriver(driverId){
  if(!confirm("Delete this driver? Their past history stays intact, but they'll lose access.")) return;
  await db.collection("drivers").doc(driverId).set({status:"deleted", deletedAt: nowTs()}, {merge:true});
  const assignSnap = await db.collection("driverCabAssignments").where("driverId","==",driverId).where("status","==","active").get();
  const batch = db.batch();
  assignSnap.forEach(doc=> batch.update(doc.ref, {status:"ended", endedAt: nowTs()}));
  await batch.commit();
  showToast("Driver deleted");
  loadDrivers();
}
async function reassignCab(driverId, oldAssignId, newCabId){
  if(oldAssignId){
    await db.collection("driverCabAssignments").doc(oldAssignId).set({status:"ended", endedAt: nowTs()}, {merge:true});
  }
  if(newCabId){
    const otherSnap = await db.collection("driverCabAssignments").where("cabId","==",newCabId).where("status","==","active").get();
    const batch = db.batch();
    otherSnap.forEach(doc=> batch.update(doc.ref, {status:"ended", endedAt: nowTs()}));
    await batch.commit();
    await db.collection("driverCabAssignments").add({ ownerId: currentOwnerId, driverId, cabId:newCabId, status:"active", assignedAt: nowTs() });
  }
  showToast("Assignment updated");
  loadDrivers();
}

/* ===================== OWNER: CAB SELECTOR (for Dashboard/Payout/Maintenance) ===================== */
async function ensureCabSelected(){
  const bar = document.getElementById("ownerCabSelectorBar");
  const sel = document.getElementById("ownerCabSelect");
  const snap = await db.collection("cabs").where("ownerId","==",currentOwnerId).where("status","==","active").get();
  if(snap.empty){
    bar.style.display = "none";
    currentCabId = null;
    return false;
  }
  bar.style.display = "flex";
  sel.innerHTML = "";
  let found = false;
  snap.forEach(doc=>{
    const opt = document.createElement("option");
    opt.value = doc.id; opt.textContent = doc.id;
    if(doc.id === currentCabId){ opt.selected = true; found = true; }
    sel.appendChild(opt);
  });
  if(!found){ currentCabId = snap.docs[0].id; sel.value = currentCabId; }
  return true;
}
function onOwnerCabChange(){
  currentCabId = document.getElementById("ownerCabSelect").value;
  renderActiveScreen();
}

/* ===================== SETTINGS ===================== */
const CARE_NUMBER = "8667033939";
function openSettings(){
  document.querySelectorAll("#mainApp .screen").forEach(s=> s.classList.remove("active"));
  document.getElementById("screen_settings").classList.add("active");
  document.getElementById("headerTitle").textContent = tr("headerSettings");
  const ownerBlock = document.getElementById("settingsOwnerBlock");
  const driverBlock = document.getElementById("settingsDriverBlock");
  if(currentUser === "owner"){
    ownerBlock.style.display = "block";
    driverBlock.style.display = "none";
    document.getElementById("settingsOwnerId").textContent = "Owner ID: " + currentOwnerId;
  } else {
    ownerBlock.style.display = "none";
    driverBlock.style.display = "block";
  }
}
function closeSettings(){
  renderActiveScreen();
}

/* ----- Export Backup (owner: all cabs, drivers, entries, maintenance) ----- */
async function exportBackup(){
  showToast("Preparing backup...");
  try{
    const backup = { exportedAt: nowTs(), ownerId: currentOwnerId, owner:null, cabs:[], drivers:[], assignments:[], entries:{}, maintenance:{} };

    const ownerDoc = await db.collection("owners").doc(currentOwnerId).get();
    backup.owner = ownerDoc.exists ? ownerDoc.data() : null;

    const cabsSnap = await db.collection("cabs").where("ownerId","==",currentOwnerId).get();
    cabsSnap.forEach(doc=> backup.cabs.push(doc.data()));

    const driversSnap = await db.collection("drivers").where("ownerId","==",currentOwnerId).get();
    driversSnap.forEach(doc=> backup.drivers.push({ id: doc.id, ...doc.data() }));

    const assignSnap = await db.collection("driverCabAssignments").where("ownerId","==",currentOwnerId).get();
    assignSnap.forEach(doc=> backup.assignments.push({ id: doc.id, ...doc.data() }));

    for(const cabDoc of cabsSnap.docs){
      const cabId = cabDoc.id;
      const entriesSnap = await db.collection("vehicles").doc(cabId).collection("entries").get();
      backup.entries[cabId] = entriesSnap.docs.map(d=> d.data());
      const maintSnap = await db.collection("vehicles").doc(cabId).collection("maintenance").get();
      backup.maintenance[cabId] = maintSnap.docs.map(d=> d.data());
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `taxi-backup-${currentOwnerId}-${todayStr()}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded");
  }catch(err){
    showToast("Backup failed: " + (err.message||"try again"));
  }
}

/* ----- Import Backup (merges into current owner's account) ----- */
async function importBackup(event){
  const file = event.target.files[0];
  if(!file) return;
  if(!confirm("Restore this backup? Matching records will be overwritten; nothing else is deleted.")){
    event.target.value = "";
    return;
  }
  showToast("Restoring backup...");
  try{
    const text = await file.text();
    const backup = JSON.parse(text);

    for(const cab of (backup.cabs||[])){
      await db.collection("cabs").doc(cab.cabId).set({...cab, ownerId: currentOwnerId}, {merge:true});
    }
    for(const driver of (backup.drivers||[])){
      const { id, ...data } = driver;
      if(id) await db.collection("drivers").doc(id).set({...data, ownerId: currentOwnerId}, {merge:true});
      else await db.collection("drivers").add({...data, ownerId: currentOwnerId});
    }
    for(const assign of (backup.assignments||[])){
      const { id, ...data } = assign;
      if(id) await db.collection("driverCabAssignments").doc(id).set({...data, ownerId: currentOwnerId}, {merge:true});
      else await db.collection("driverCabAssignments").add({...data, ownerId: currentOwnerId});
    }
    for(const cabId in (backup.entries||{})){
      for(const entry of backup.entries[cabId]){
        if(entry.date) await db.collection("vehicles").doc(cabId).collection("entries").doc(entry.date).set(entry, {merge:true});
      }
    }
    for(const cabId in (backup.maintenance||{})){
      for(const rec of backup.maintenance[cabId]){
        if(rec.month) await db.collection("vehicles").doc(cabId).collection("maintenance").doc(rec.month).set(rec, {merge:true});
      }
    }
    showToast("Backup restored");
  }catch(err){
    showToast("Restore failed: " + (err.message||"invalid file"));
  }
  event.target.value = "";
}

/* ===================== LOGOUT ===================== */
function logout(){
  localStorage.removeItem("taxiapp_v3_ownerId");
  localStorage.removeItem("taxiapp_v3_driverId");
  currentUser = null; currentOwnerId = null; currentDriverId = null; currentCabId = null;
  document.getElementById("mainApp").style.display = "none";
  goOwnerMobile();
}

/* ===================== APP SHELL / TABS ===================== */
const TABS = {
  owner: [
    {id:"cabs", icon:"🚕", labelKey:"tab_cabs"},
    {id:"drivers", icon:"👤", labelKey:"tab_drivers"},
    {id:"dash", icon:"📊", labelKey:"tab_dash"},
    {id:"payout", icon:"💰", labelKey:"tab_payout"},
    {id:"maint", icon:"🔧", labelKey:"tab_maint"},
  ],
  driver: [
    {id:"entry", icon:"📝", labelKey:"tab_entry"},
    {id:"mydash", icon:"📊", labelKey:"tab_mydash"},
    {id:"payout", icon:"💰", labelKey:"tab_payout"},
  ]
};
let activeTab = "cabs";
let pendingReload = false;
function maybeReload(){
  if(pendingReload && activeTab !== "entry"){
    pendingReload = false;
    window.location.reload();
  }
}

function buildTabbar(){
  const bar = document.getElementById("tabbar");
  bar.innerHTML = "";
  const tabs = TABS[currentUser] || TABS.owner;
  if(!tabs.find(t=>t.id===activeTab)) activeTab = tabs[0].id;
  tabs.forEach(t=>{
    const btn = document.createElement("button");
    btn.className = t.id===activeTab ? "active":"";
    btn.innerHTML = `<span class="e">${t.icon}</span><span>${tr(t.labelKey)}</span>`;
    btn.onclick = ()=> switchTab(t.id);
    bar.appendChild(btn);
  });
}
function switchTab(id){
  activeTab = id;
  buildTabbar();
  renderActiveScreen();
  maybeReload();
}
function updateHeader(){
  const map = {cabs:"headerCabs", drivers:"headerDrivers", dash:"headerDash", mydash:"headerMydash", payout:"headerPayout", maint:"headerMaint", entry:"headerEntry"};
  document.getElementById("headerTitle").textContent = tr(map[activeTab] || "headerDash");
  document.getElementById("headerSub").textContent = currentUser==="owner" ? tr("owner") : tr("driver");
}
function showScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  const el = document.getElementById("screen_"+id);
  if(el) el.classList.add("active");
}

function enterApp(){
  document.querySelectorAll(".screen").forEach(s=> s.classList.remove("active"));
  document.getElementById("mainApp").style.display="block";
  applyTranslations();
  activeTab = (currentUser==="driver") ? "entry" : "cabs";
  buildTabbar();
  renderActiveScreen();
}
function renderActiveScreen(){
  showScreen(activeTab);
  updateHeader();
  const selectorBar = document.getElementById("ownerCabSelectorBar");
  const needsCabSelector = currentUser==="owner" && (activeTab==="dash" || activeTab==="payout" || activeTab==="maint");
  if(!needsCabSelector) selectorBar.style.display = "none";

  if(activeTab==="cabs") loadCabs();
  if(activeTab==="drivers") loadDrivers();
  if(activeTab==="entry") initEntryScreen();
  if(activeTab==="mydash") loadDriverDashboard();
  if(activeTab==="payout"){
    if(currentUser==="owner") ensureCabSelected().then(has=> has && loadPayoutList());
    else loadPayoutList();
  }
  if(activeTab==="maint"){
    if(currentUser==="owner") ensureCabSelected().then(has=> has && initMaintScreen());
    else initMaintScreen();
  }
  if(activeTab==="dash"){
    if(currentUser==="owner") ensureCabSelected().then(has=> has && loadDashboard());
    else loadDashboard();
  }
}

/* ===================== HELPERS ===================== */
function todayStr(){
  const d = new Date();
  return d.toISOString().slice(0,10);
}
function fmt(n){
  n = Number(n)||0;
  return "₹" + n.toLocaleString("en-IN", {maximumFractionDigits:0});
}
function showToast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 1800);
}
function entryDocRef(dateStr){
  return db.collection("vehicles").doc(currentCabId).collection("entries").doc(dateStr);
}
function maintDocRef(monthStr){ // monthStr like 2026-06
  return db.collection("vehicles").doc(currentCabId).collection("maintenance").doc(monthStr);
}

/* ===================== DRIVER: DAILY ENTRY ===================== */
async function initEntryScreen(){
  if(currentDriverId){
    const driverDoc = await db.collection("drivers").doc(currentDriverId).get();
    const dd = driverDoc.exists ? driverDoc.data() : {};
    currentSalaryPct = dd.salaryPct!==undefined ? dd.salaryPct : 0.30;
    currentSalaryBasis = dd.salaryBasis || "revenue";
  }
  const salaryHint = document.getElementById("salaryPctHint");
  const basisLabel = currentSalaryBasis === "netEarnings" ? "Net Earnings" : "Total Revenue";
  if(salaryHint) salaryHint.textContent = `Driver Salary is calculated at ${Math.round(currentSalaryPct*100)}% of ${basisLabel} (set by your owner)`;
  // Net Earnings field stays visible regardless of basis, so the driver can log it even if the
  // owner hasn't switched to that basis yet (owner may change their mind later without losing history)

  const dateInput = document.getElementById("entDate");
  if(!dateInput.value) dateInput.value = todayStr();
  dateInput.onchange = loadEntryForDate;
  ["tripPayment","onlinePayment","netEarnings","tollCharge","fuelCash","fuelCard","parking","tollCollected"].forEach(id=>{
    document.getElementById(id).oninput = recalcEntry;
  });
  loadEntryForDate();
}

/* ----- Other Expenses (repeatable rows) ----- */
let expRowSeq = 0;
function addExpenseRow(amount, desc){
  const id = "exp_" + (expRowSeq++);
  const wrap = document.createElement("div");
  wrap.className = "exp-row";
  wrap.id = id;
  wrap.innerHTML = `
    <input type="number" class="exp-amt" placeholder="${tr('expamount')}" value="${amount!==undefined?amount:''}" oninput="recalcEntry()">
    <input type="text" class="exp-desc" placeholder="${tr('expdesc')}" value="${desc!==undefined?desc.replace(/"/g,'&quot;'):''}" oninput="recalcEntry()">
    <button type="button" class="exp-remove" onclick="removeExpenseRow('${id}')">×</button>
  `;
  document.getElementById("otherExpList").appendChild(wrap);
  recalcEntry();
}
function removeExpenseRow(id){
  const el = document.getElementById(id);
  if(el) el.remove();
  recalcEntry();
}
function clearExpenseRows(){
  document.getElementById("otherExpList").innerHTML = "";
}
function getOtherExpenses(){
  const rows = document.querySelectorAll("#otherExpList .exp-row");
  const list = [];
  rows.forEach(row=>{
    const amount = Number(row.querySelector(".exp-amt").value) || 0;
    const desc = row.querySelector(".exp-desc").value || "";
    if(amount || desc) list.push({amount, desc});
  });
  return list;
}

async function loadEntryForDate(){
  const date = document.getElementById("entDate").value;
  const doc = await entryDocRef(date).get();
  const data = doc.exists ? doc.data() : null;
  document.getElementById("leaveToggle").checked = data ? !!data.leave : false;
  toggleLeaveMode();
  ["tripPayment","onlinePayment","netEarnings","parking","tollCollected"].forEach(id=>{
    document.getElementById(id).value = data && data[id]!==undefined ? data[id] : "";
  });
  // Toll base charge — new entries store tollCharge directly. Legacy entries only had
  // tollBill (a manually entered GST-inclusive total) — back-calculate an approx base for editing.
  if(data && data.tollCharge!==undefined){
    document.getElementById("tollCharge").value = data.tollCharge;
  } else if(data && data.tollBill!==undefined){
    document.getElementById("tollCharge").value = Math.round((data.tollBill/(1+TOLL_GST_PCT))*100)/100;
  } else {
    document.getElementById("tollCharge").value = "";
  }
  // Fuel cash/card — fall back to legacy single fuelAmount+fuelMode entries
  if(data && (data.fuelCash!==undefined || data.fuelCard!==undefined)){
    document.getElementById("fuelCash").value = data.fuelCash!==undefined ? data.fuelCash : "";
    document.getElementById("fuelCard").value = data.fuelCard!==undefined ? data.fuelCard : "";
  } else if(data && data.fuelAmount!==undefined){
    document.getElementById("fuelCash").value = data.fuelMode==="cash" ? data.fuelAmount : "";
    document.getElementById("fuelCard").value = data.fuelMode==="card" ? data.fuelAmount : "";
  } else {
    document.getElementById("fuelCash").value = "";
    document.getElementById("fuelCard").value = "";
  }
  clearExpenseRows();
  if(data && Array.isArray(data.otherExpenses) && data.otherExpenses.length){
    data.otherExpenses.forEach(e=> addExpenseRow(e.amount, e.desc));
  }
  document.getElementById("payStatus").value = (data && data.payStatus) || "unpaid";
  document.getElementById("cashPaid").value = data && data.cashPaid!==undefined ? data.cashPaid : "";
  document.getElementById("upiPaid").value = data && data.upiPaid!==undefined ? data.upiPaid : "";
  togglePaySplit();
  recalcEntry();
}
function toggleLeaveMode(){
  const isLeave = document.getElementById("leaveToggle").checked;
  document.getElementById("entryFields").style.display = isLeave ? "none" : "block";
}
function calcEntryValues(){
  const v = id=> Number(document.getElementById(id).value) || 0;
  const trip = v("tripPayment"), online = v("onlinePayment");
  const netEarnings = v("netEarnings");
  const tollCharge = v("tollCharge");
  const tollBillTotal = Math.round(tollCharge * (1+TOLL_GST_PCT) * 100) / 100;
  const fuelCash = v("fuelCash"), fuelCard = v("fuelCard");
  const parking = v("parking"), tollCollected = v("tollCollected");
  const otherExpenses = getOtherExpenses();
  const otherExpTotal = otherExpenses.reduce((s,e)=> s + (Number(e.amount)||0), 0);

  const totalRevenue = trip;
  // Salary is computed off whichever basis the owner picked for this driver — Revenue (gross,
  // everything included) or Net Earnings (base fare only). Owner Amount / cash handover always
  // stays tied to Revenue regardless, since that's the actual cash that changed hands.
  const salaryBaseSource = currentSalaryBasis === "netEarnings" ? netEarnings : totalRevenue;
  const salaryBase = Math.max(salaryBaseSource - tollBillTotal, 0);
  const salary = salaryBase * currentSalaryPct;
  const deductions = online + fuelCash + parking + otherExpTotal;
  const ownerAmount = totalRevenue - deductions - salary + tollCollected;

  return {trip, online, netEarnings, tollCharge, tollBillTotal, fuelCash, fuelCard, parking, tollCollected,
    otherExpenses, otherExpTotal, totalRevenue, salaryBaseSource, salaryBase, salary, deductions, ownerAmount};
}
function recalcEntry(){
  const c = calcEntryValues();
  document.getElementById("calcRevenue").textContent = fmt(c.totalRevenue);
  document.getElementById("calcSalary").textContent = fmt(c.salary);
  document.getElementById("calcTollCollected").textContent = "+" + fmt(c.tollCollected);
  document.getElementById("calcDeduct").textContent = "−" + fmt(c.deductions);
  document.getElementById("calcOwnerAmt").textContent = fmt(c.ownerAmount);
  const gstEl = document.getElementById("tollGstReadout");
  if(gstEl) gstEl.textContent = `Incl. GST 5%: ${fmt(c.tollBillTotal)}`;
  const totalEl = document.getElementById("otherExpTotalVal");
  if(totalEl) totalEl.textContent = fmt(c.otherExpTotal);
}
function togglePaySplit(){
  const isPaid = document.getElementById("payStatus").value === "paid";
  document.getElementById("paySplitFields").style.display = isPaid ? "block":"none";
}
async function saveEntry(){
  const date = document.getElementById("entDate").value;
  if(!date){ showToast(tr("fillRequired")); return; }
  const isLeave = document.getElementById("leaveToggle").checked;
  let payload = { date, leave: isLeave, updatedAt: Date.now() };

  if(isLeave){
    await entryDocRef(date).set(payload, {merge:true});
    showToast(tr("savedOk"));
    return;
  }

  const c = calcEntryValues();
  const payStatus = document.getElementById("payStatus").value;
  const cashPaid = Number(document.getElementById("cashPaid").value)||0;
  const upiPaid = Number(document.getElementById("upiPaid").value)||0;

  if(payStatus==="paid"){
    if(Math.round(cashPaid+upiPaid) !== Math.round(c.ownerAmount) && (cashPaid+upiPaid) > c.ownerAmount){
      showToast(tr("splitMismatch")); return;
    }
  }

  payload = {
    ...payload,
    tripPayment: c.trip, onlinePayment: c.online, netEarnings: c.netEarnings,
    tollCharge: c.tollCharge, tollBillTotal: c.tollBillTotal,
    fuelCash: c.fuelCash, fuelCard: c.fuelCard, parking: c.parking, tollCollected: c.tollCollected,
    otherExpenses: c.otherExpenses, otherExpTotal: c.otherExpTotal,
    totalRevenue: c.totalRevenue, salaryBase: c.salaryBase, driverSalary: c.salary,
    salaryBasisUsed: currentSalaryBasis, salaryPctUsed: currentSalaryPct,
    ownerAmount: c.ownerAmount, payStatus, cashPaid: payStatus==="paid"?cashPaid:0,
    upiPaid: payStatus==="paid"?upiPaid:0,
    // legacy fields cleared so old dashboards/queries relying on them don't double count
    fuelAmount: c.fuelCash + c.fuelCard, fuelMode: null,
  };
  await entryDocRef(date).set(payload, {merge:true});
  showToast(tr("savedOk"));
}

/* ===================== PAYOUT DETAILS TAB ===================== */
function fuelCashCard(d){
  // New entries store fuelCash/fuelCard directly. Old entries (pre-update) only have fuelAmount+fuelMode.
  if(d.fuelCash!==undefined || d.fuelCard!==undefined){
    return { cash: d.fuelCash||0, card: d.fuelCard||0 };
  }
  if(d.fuelAmount!==undefined){
    return { cash: d.fuelMode==="cash" ? (d.fuelAmount||0) : 0, card: d.fuelMode==="card" ? (d.fuelAmount||0) : 0 };
  }
  return { cash:0, card:0 };
}
async function loadPayoutList(){
  const snap = await db.collection("vehicles").doc(currentCabId).collection("entries")
    .orderBy("date","desc").limit(90).get();
  const list = document.getElementById("payoutList");
  list.innerHTML = "";
  let outstanding = 0;
  if(snap.empty){
    list.innerHTML = `<div class="empty">${tr("noEntries")}</div>`;
    document.getElementById("outstandingAmt").textContent = fmt(0);
    return;
  }
  snap.forEach(doc=>{
    const d = doc.data();
    if(d.leave){
      list.appendChild(renderLeaveItem(d));
      return;
    }
    if(d.payStatus==="unpaid") outstanding += (d.ownerAmount||0) - (d.cashPaid||0) - (d.upiPaid||0);
    list.appendChild(renderPayoutItem(d));
  });
  document.getElementById("outstandingAmt").textContent = fmt(outstanding);
}
function renderLeaveItem(d){
  const div = document.createElement("div");
  div.className = "history-item";
  div.innerHTML = `<div class="top"><span class="date">${d.date}</span><span class="badge leave">${tr("leaveTag")}</span></div>`;
  return div;
}
function renderPayoutItem(d){
  const div = document.createElement("div");
  div.className = "history-item";
  const statusBadge = d.payStatus==="paid" ? `<span class="badge paid">${tr("paid")}</span>` : `<span class="badge unpaid">${tr("unpaid")}</span>`;
  div.innerHTML = `
    <div class="top" onclick="openEditModal('${d.date}')" style="cursor:pointer;">
      <span class="date">${d.date}</span>
      ${statusBadge}
    </div>
    <div class="sub" onclick="openEditModal('${d.date}')" style="cursor:pointer;">
      <span>${tr("revenue")}: ${fmt(d.totalRevenue)}</span>
      <span>${tr("salary")}: ${fmt(d.driverSalary)}</span>
      <span>${tr("owneramount")}: ${fmt(d.ownerAmount)}</span>
      ${d.payStatus==="paid" ? `<span>${tr("cashpaid")}: ${fmt(d.cashPaid)}</span><span>${tr("upipaid")}: ${fmt(d.upiPaid)}</span>` : ""}
    </div>
    <div class="actions">
      <button class="share-btn" onclick="event.stopPropagation(); shareEntry('${d.date}')">📤 ${tr("share")}</button>
    </div>`;
  return div;
}
function closeModal(){ document.getElementById("editModalBg").classList.remove("show"); }
async function openEditModal(date){
  const doc = await entryDocRef(date).get();
  if(!doc.exists) return;
  const d = doc.data();
  const fc = fuelCashCard(d);
  const expTotal = d.otherExpTotal!==undefined ? d.otherExpTotal : (Array.isArray(d.otherExpenses) ? d.otherExpenses.reduce((s,e)=>s+(e.amount||0),0) : 0);
  const expRowsHtml = (d.otherExpenses||[]).map(e=>`<div class="row"><span class="lbl">— ${e.desc||tr("otherexp")}</span><span class="val">${fmt(e.amount)}</span></div>`).join("");
  const content = document.getElementById("editModalContent");
  content.innerHTML = `
    <h3 style="margin-bottom:14px;">${date}</h3>
    <div class="row"><span class="lbl">${tr("totalrev")}</span><span class="val">${fmt(d.totalRevenue)}</span></div>
    ${d.netEarnings ? `<div class="row"><span class="lbl">${tr("netearnings")}</span><span class="val">${fmt(d.netEarnings)}</span></div>` : ""}
    <div class="row"><span class="lbl">${tr("fuelcash")}</span><span class="val">${fmt(fc.cash)}</span></div>
    <div class="row"><span class="lbl">${tr("fuelcard")}</span><span class="val">${fmt(fc.card)}</span></div>
    <div class="row"><span class="lbl">${tr("parking")}</span><span class="val">${fmt(d.parking)}</span></div>
    <div class="row"><span class="lbl">${tr("tollbill")}</span><span class="val">${fmt(d.tollCharge!==undefined ? d.tollCharge : (d.tollBill!==undefined ? Math.round((d.tollBill/(1+TOLL_GST_PCT))*100)/100 : 0))} (+GST = ${fmt(d.tollBillTotal!==undefined ? d.tollBillTotal : d.tollBill)})</span></div>
    <div class="row"><span class="lbl">${tr("tollcollected")}</span><span class="val">${fmt(d.tollCollected)}</span></div>
    ${expRowsHtml}
    <div class="row"><span class="lbl">${tr("otherexptotal")}</span><span class="val">${fmt(expTotal)}</span></div>
    <div class="row"><span class="lbl">${tr("salary30")} ${d.salaryPctUsed!==undefined ? `(${Math.round(d.salaryPctUsed*100)}% of ${d.salaryBasisUsed==="netEarnings"?"Net Earnings":"Revenue"})` : ""}</span><span class="val">${fmt(d.driverSalary)}</span></div>
    <div class="divider"></div>
    <div class="row"><span class="lbl" style="color:var(--accent2)">${tr("owneramt")}</span><span class="val" style="color:var(--accent2)">${fmt(d.ownerAmount)}</span></div>
    <div class="divider"></div>
    <label>${tr("paysec")}</label>
    <select id="modalPayStatus">
      <option value="unpaid" ${d.payStatus==="unpaid"?"selected":""}>${tr("unpaid")}</option>
      <option value="paid" ${d.payStatus==="paid"?"selected":""}>${tr("paid")}</option>
    </select>
    <div class="pay-split">
      <div style="flex:1;"><label>${tr("cashpaid")}</label><input type="number" id="modalCash" value="${d.cashPaid||0}"></div>
      <div style="flex:1;"><label>${tr("upipaid")}</label><input type="number" id="modalUpi" value="${d.upiPaid||0}"></div>
    </div>
    <button class="btn" style="margin-top:10px;" onclick="saveModalPayment('${date}')">${tr("saveentry")}</button>
    <button class="btn secondary" style="margin-top:10px;" onclick="shareEntry('${date}')">📤 ${tr("share")}</button>
    <button class="btn outline-red" style="margin-top:10px; background:transparent;" onclick="deleteEntry('${date}')">${tr("delete")}</button>
  `;
  document.getElementById("editModalBg").classList.add("show");
}
async function saveModalPayment(date){
  const payStatus = document.getElementById("modalPayStatus").value;
  const cashPaid = Number(document.getElementById("modalCash").value)||0;
  const upiPaid = Number(document.getElementById("modalUpi").value)||0;
  await entryDocRef(date).set({payStatus, cashPaid: payStatus==="paid"?cashPaid:0, upiPaid: payStatus==="paid"?upiPaid:0}, {merge:true});
  closeModal();
  showToast(tr("savedOk"));
  loadPayoutList();
  if(activeTab==="dash") loadDashboard();
}
async function deleteEntry(date){
  if(!confirm(tr("confirmDelete"))) return;
  await entryDocRef(date).delete();
  closeModal();
  loadPayoutList();
}

/* ===================== SHARE PAYOUT AS IMAGE (WhatsApp) ===================== */
function buildShareReceipt(d, date){
  const fc = fuelCashCard(d);
  const expTotal = d.otherExpTotal!==undefined ? d.otherExpTotal : (Array.isArray(d.otherExpenses) ? d.otherExpenses.reduce((s,e)=>s+(e.amount||0),0) : 0);
  const statusBg = d.payStatus==="paid" ? "background:#dcfce7;color:#16a34a;" : "background:#fee2e2;color:#dc2626;";
  const statusText = d.payStatus==="paid" ? tr("paid") : tr("unpaid");
  const cashPaid = d.cashPaid||0, upiPaid = d.upiPaid||0;
  const handoverRows = d.payStatus==="paid"
    ? `${cashPaid>0?`<div class="sr-row"><span>${tr("cashpaid")}</span><span>${fmt(cashPaid)}</span></div>`:""}
       ${upiPaid>0?`<div class="sr-row"><span>${tr("upipaid")}</span><span>${fmt(upiPaid)}</span></div>`:""}`
    : "";
  const node = document.getElementById("shareReceipt");
  node.innerHTML = `
    <div class="sr-head">
      <div class="sr-app">🚖 ${tr("appname")}</div>
      <div class="sr-date">${date}</div>
    </div>
    <div class="sr-row"><span>${tr("srTripRev")}</span><span>${fmt(d.tripPayment||0)}</span></div>
    <div class="sr-row"><span>${tr("srOnline")}</span><span>−${fmt(d.onlinePayment)}</span></div>
    <div class="sr-row"><span>${tr("srSalary")}</span><span>−${fmt(d.driverSalary)}</span></div>
    <div class="sr-row"><span>${tr("srFuelCash")}</span><span>−${fmt(fc.cash)}</span></div>
    <div class="sr-row"><span>${tr("srParking")}</span><span>−${fmt(d.parking)}</span></div>
    <div class="sr-row"><span>${tr("srOtherExp")}</span><span>−${fmt(expTotal)}</span></div>
    <div class="sr-row"><span>${tr("srTollCollected")}</span><span>+${fmt(d.tollCollected)}</span></div>
    <div class="sr-final"><span>${tr("owneramt")}</span><span>${fmt(d.ownerAmount)}</span></div>
    <div class="sr-status" style="${statusBg}">${statusText}</div>
    ${handoverRows ? `<div class="sr-handover-title">${tr("srHandover")}</div>${handoverRows}` : ""}
  `;
}
async function shareEntry(date){
  if(typeof html2canvas === "undefined"){ showToast(tr("shareFailed")); return; }
  const doc = await entryDocRef(date).get();
  if(!doc.exists) return;
  const d = doc.data();
  if(d.leave) return;
  buildShareReceipt(d, date);
  const node = document.getElementById("shareReceipt");
  try{
    const canvas = await html2canvas(node, {backgroundColor:"#ffffff", scale:2});
    canvas.toBlob(async (blob)=>{
      if(!blob){ showToast(tr("shareFailed")); return; }
      const file = new File([blob], `payout-${date}.png`, {type:"image/png"});
      if(navigator.canShare && navigator.canShare({files:[file]})){
        try{
          await navigator.share({files:[file], title: tr("shareReceiptTitle"), text: `${tr("owneramt")}: ${fmt(d.ownerAmount)} (${date})`});
        }catch(e){ /* user cancelled share sheet — not an error */ }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `payout-${date}.png`; a.click();
        URL.revokeObjectURL(url);
        showToast(tr("shareFallback"));
      }
    }, "image/png");
  }catch(e){
    showToast(tr("shareFailed"));
  }
}

/* ===================== MAINTENANCE TAB ===================== */
function initMaintScreen(){
  const monthInput = document.getElementById("maintMonth");
  if(!monthInput.value) monthInput.value = new Date().toISOString().slice(0,7);
  loadMaintenance();
}
async function loadMaintenance(){
  const month = document.getElementById("maintMonth").value;
  const doc = await maintDocRef(month).get();
  const d = doc.exists ? doc.data() : {};
  ["emi","insurance","tyre","redtaxi","budget","actual","others"].forEach(k=>{
    document.getElementById("m_"+k).value = d[k] !== undefined ? d[k] : "";
  });
  document.getElementById("m_startKm").value = d.startKm !== undefined ? d.startKm : "";
  document.getElementById("m_endKm").value = d.endKm !== undefined ? d.endKm : "";
  document.getElementById("m_notes").value = d.notes || "";
}
async function saveMaintenance(){
  const month = document.getElementById("maintMonth").value;
  const payload = {};
  ["emi","insurance","tyre","redtaxi","budget","actual","others"].forEach(k=>{
    payload[k] = Number(document.getElementById("m_"+k).value)||0;
  });
  payload.startKm = Number(document.getElementById("m_startKm").value)||0;
  payload.endKm = Number(document.getElementById("m_endKm").value)||0;
  payload.notes = document.getElementById("m_notes").value || "";
  payload.month = month;
  await maintDocRef(month).set(payload, {merge:true});
  showToast(tr("savedOk"));
  if(activeTab==="dash") loadDashboard();
}

/* ===================== DASHBOARD ===================== */
function initDashboardScreen(){
  const dayPicker = document.getElementById("dashDayPicker");
  const monthPicker = document.getElementById("dashMonthPicker");
  if(!dayPicker.value) dayPicker.value = todayStr();
  if(!monthPicker.value) monthPicker.value = todayStr().slice(0,7);
  dayPicker.onchange = ()=> loadDashboardDay(dayPicker.value);
  monthPicker.onchange = ()=> loadDashboardMonth(monthPicker.value);

  const expStart = document.getElementById("expStartDate");
  const expEnd = document.getElementById("expEndDate");
  const expMonth = document.getElementById("expMonth");
  if(!expStart.value) expStart.value = todayStr();
  if(!expEnd.value) expEnd.value = todayStr();
  if(!expMonth.value) expMonth.value = todayStr().slice(0,7);

  loadDashboardDay(dayPicker.value);
  loadDashboardMonth(monthPicker.value);
}
async function loadDashboard(){
  initDashboardScreen();
}
async function loadDriverDashboard(){
  if(currentDriverId){
    const driverDoc = await db.collection("drivers").doc(currentDriverId).get();
    currentSalaryPct = (driverDoc.exists && driverDoc.data().salaryPct!==undefined) ? driverDoc.data().salaryPct : 0.30;
  }
  const today = todayStr();
  const month = today.slice(0,7);

  const todayDoc = await entryDocRef(today).get();
  const td = todayDoc.exists ? todayDoc.data() : null;
  if(td && !td.leave){
    document.getElementById("my_todayRev").textContent = fmt(td.totalRevenue);
    document.getElementById("my_todaySalary").textContent = fmt(td.driverSalary);
  } else {
    document.getElementById("my_todayRev").textContent = fmt(0);
    document.getElementById("my_todaySalary").textContent = fmt(0);
  }

  const snap = await db.collection("vehicles").doc(currentCabId).collection("entries")
    .where("date",">=", month+"-01").where("date","<=", month+"-31").get();
  let mRev=0, mSalary=0;
  snap.forEach(doc=>{
    const d = doc.data();
    if(d.leave) return;
    mRev += d.totalRevenue||0;
    mSalary += d.driverSalary||0;
  });
  document.getElementById("my_monthRev").textContent = fmt(mRev);
  document.getElementById("my_monthSalary").textContent = fmt(mSalary);
  document.getElementById("my_salaryPctNote").textContent = `At ${Math.round(currentSalaryPct*100)}% (set by your owner)`;
}
async function loadDashboardDay(date){
  const todayDoc = await entryDocRef(date).get();
  const td = todayDoc.exists ? todayDoc.data() : null;
  if(td && !td.leave){
    const fc = fuelCashCard(td);
    document.getElementById("d_todayRev").textContent = fmt(td.totalRevenue);
    document.getElementById("d_todayFuel").textContent = fmt(fc.cash + fc.card);
    document.getElementById("d_todaySalary").textContent = fmt(td.driverSalary);
    document.getElementById("d_todayOwner").textContent = fmt(td.ownerAmount);
    document.getElementById("d_todayStatus").innerHTML = td.payStatus==="paid"
      ? `<span class="badge paid">${tr("paid")}</span>` : `<span class="badge unpaid">${tr("unpaid")}</span>`;
  } else if(td && td.leave){
    ["d_todayRev","d_todayFuel","d_todaySalary","d_todayOwner"].forEach(id=>document.getElementById(id).textContent="—");
    document.getElementById("d_todayStatus").innerHTML = `<span class="badge leave">${tr("leaveTag")}</span>`;
  } else {
    ["d_todayRev","d_todayFuel","d_todaySalary","d_todayOwner"].forEach(id=>document.getElementById(id).textContent=fmt(0));
    document.getElementById("d_todayStatus").innerHTML = `<span class="badge unpaid">${tr("noEntries")}</span>`;
  }
}
async function loadDashboardMonth(month){
  const snap = await db.collection("vehicles").doc(currentCabId).collection("entries")
    .where("date",">=", month+"-01").where("date","<=", month+"-31").get();
  let mRev=0, mFuel=0, mSalary=0, mPaid=0, mPaidCash=0, mPaidUpi=0, mUnpaid=0;
  snap.forEach(doc=>{
    const d = doc.data();
    if(d.leave) return;
    const fc = fuelCashCard(d);
    mRev += d.totalRevenue||0;
    mFuel += fc.cash + fc.card;
    mSalary += d.driverSalary||0;
    if(d.payStatus==="paid"){
      mPaid += (d.cashPaid||0)+(d.upiPaid||0);
      mPaidCash += d.cashPaid||0;
      mPaidUpi += d.upiPaid||0;
    } else {
      mUnpaid += (d.ownerAmount||0) - (d.cashPaid||0) - (d.upiPaid||0);
    }
  });

  const maintDoc = await maintDocRef(month).get();
  const md = maintDoc.exists ? maintDoc.data() : {};
  const comm = md.redtaxi||0;
  const fixedCosts = (md.emi||0)+(md.insurance||0)+(md.tyre||0)+(md.actual||0)+(md.others||0);
  const kmTotal = Math.max((md.endKm||0)-(md.startKm||0), 0);
  const profit = mRev - mSalary - mFuel - comm - fixedCosts;

  document.getElementById("d_mRev").textContent = fmt(mRev);
  document.getElementById("d_mKm").textContent = kmTotal;
  document.getElementById("d_mFuel").textContent = fmt(mFuel);
  document.getElementById("d_mSalary").textContent = fmt(mSalary);
  document.getElementById("d_mComm").textContent = fmt(comm);
  document.getElementById("d_mFixed").textContent = fmt(fixedCosts);
  const profitEl = document.getElementById("d_mProfit");
  profitEl.textContent = fmt(profit);
  profitEl.className = "val " + (profit>=0?"profit-pos":"profit-neg");
  document.getElementById("d_mPaid").textContent = fmt(mPaid);
  document.getElementById("d_mPaidCash").textContent = fmt(mPaidCash);
  document.getElementById("d_mPaidUpi").textContent = fmt(mPaidUpi);
  document.getElementById("d_mUnpaid").textContent = fmt(mUnpaid);
}

/* ===================== REPORTS & EXPORT (PDF / Excel) ===================== */
let exportMode = "daily";
function setExportMode(mode){
  exportMode = mode;
  document.getElementById("expModeDaily").classList.toggle("on", mode==="daily");
  document.getElementById("expModeMonthly").classList.toggle("on", mode==="monthly");
  document.getElementById("exportDailyFields").style.display = mode==="daily" ? "block":"none";
  document.getElementById("exportMonthlyFields").style.display = mode==="monthly" ? "block":"none";
}
async function fetchReportEntries(){
  let startDate, endDate;
  if(exportMode==="daily"){
    startDate = document.getElementById("expStartDate").value;
    endDate = document.getElementById("expEndDate").value;
  } else {
    const month = document.getElementById("expMonth").value;
    startDate = month+"-01";
    endDate = month+"-31";
  }
  if(!startDate || !endDate){ showToast(tr("fillRequired")); return null; }
  const snap = await db.collection("vehicles").doc(currentCabId).collection("entries")
    .where("date",">=",startDate).where("date","<=",endDate).orderBy("date","asc").get();
  const rows = [];
  snap.forEach(doc=>{
    const d = doc.data();
    if(d.leave){
      rows.push({date:d.date, leave:true});
      return;
    }
    const fc = fuelCashCard(d);
    const expTotal = d.otherExpTotal!==undefined ? d.otherExpTotal : (Array.isArray(d.otherExpenses)?d.otherExpenses.reduce((s,e)=>s+(e.amount||0),0):0);
    rows.push({
      date:d.date, leave:false,
      revenue:d.totalRevenue||0, salary:d.driverSalary||0,
      fuelCash:fc.cash, fuelCard:fc.card, parking:d.parking||0,
      tollCharge: d.tollCharge!==undefined?d.tollCharge:0,
      tollBillTotal: d.tollBillTotal!==undefined?d.tollBillTotal:(d.tollBill||0),
      tollCollected:d.tollCollected||0, otherExp:expTotal,
      ownerAmount:d.ownerAmount||0, payStatus:d.payStatus||"unpaid",
      cashPaid:d.cashPaid||0, upiPaid:d.upiPaid||0,
    });
  });
  return {rows, startDate, endDate};
}
function reportTotals(rows){
  const t = {revenue:0,salary:0,fuelCash:0,fuelCard:0,parking:0,tollCollected:0,otherExp:0,ownerAmount:0,cashPaid:0,upiPaid:0};
  rows.forEach(r=>{
    if(r.leave) return;
    t.revenue+=r.revenue; t.salary+=r.salary; t.fuelCash+=r.fuelCash; t.fuelCard+=r.fuelCard;
    t.parking+=r.parking; t.tollCollected+=r.tollCollected; t.otherExp+=r.otherExp;
    t.ownerAmount+=r.ownerAmount; t.cashPaid+=r.cashPaid; t.upiPaid+=r.upiPaid;
  });
  return t;
}
async function exportReport(kind){
  const result = await fetchReportEntries();
  if(!result) return;
  const {rows, startDate, endDate} = result;
  if(!rows.length){ showToast(tr("noEntries")); return; }
  const totals = reportTotals(rows);
  const title = exportMode==="daily" ? `${startDate} to ${endDate}` : startDate.slice(0,7);
  if(kind==="pdf") exportReportPDF(rows, totals, title);
  else exportReportExcel(rows, totals, title);
}
function exportReportPDF(rows, totals, title){
  if(typeof window.jspdf === "undefined"){ showToast(tr("shareFailed")); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({orientation:"landscape", unit:"pt"});
  doc.setFontSize(14);
  doc.text(`${tr("appname")} — ${tr("headerDash")} (${title})`, 30, 30);

  const head = [["Date","Revenue","Salary","Fuel(Cash)","Fuel(Card)","Parking","Toll Collected","Other Exp","Owner Amt","Status","Cash Paid","UPI Paid"]];
  const body = rows.map(r=> r.leave
    ? [r.date, tr("leaveTag"),"","","","","","","","","",""]
    : [r.date, r.revenue.toFixed(0), r.salary.toFixed(0), r.fuelCash.toFixed(0), r.fuelCard.toFixed(0),
       r.parking.toFixed(0), r.tollCollected.toFixed(0), r.otherExp.toFixed(0), r.ownerAmount.toFixed(0),
       r.payStatus, r.cashPaid.toFixed(0), r.upiPaid.toFixed(0)]
  );
  body.push(["TOTAL", totals.revenue.toFixed(0), totals.salary.toFixed(0), totals.fuelCash.toFixed(0),
    totals.fuelCard.toFixed(0), totals.parking.toFixed(0), totals.tollCollected.toFixed(0),
    totals.otherExp.toFixed(0), totals.ownerAmount.toFixed(0), "", totals.cashPaid.toFixed(0), totals.upiPaid.toFixed(0)]);

  doc.autoTable({ head, body, startY: 45, styles:{fontSize:8}, headStyles:{fillColor:[245,158,11]},
    footStyles:{fillColor:[30,41,59]}, didParseCell:(data)=>{
      if(data.row.index === body.length-1) data.cell.styles.fontStyle = "bold";
    }});
  doc.save(`report-${title.replace(/\s+/g,"_")}.pdf`);
}
function exportReportExcel(rows, totals, title){
  if(typeof XLSX === "undefined"){ showToast(tr("shareFailed")); return; }
  const data = rows.map(r=> r.leave
    ? {Date:r.date, Status:tr("leaveTag")}
    : {
      Date:r.date, Revenue:r.revenue, "Driver Salary":r.salary,
      "Fuel (Cash)":r.fuelCash, "Fuel (Card)":r.fuelCard, Parking:r.parking,
      "Toll Charge (base)":r.tollCharge, "Toll (incl. GST)":r.tollBillTotal,
      "Toll Collected":r.tollCollected, "Other Expenses":r.otherExp,
      "Owner Amount":r.ownerAmount, "Pay Status":r.payStatus,
      "Cash Paid":r.cashPaid, "UPI Paid":r.upiPaid,
    }
  );
  data.push({
    Date:"TOTAL", Revenue:totals.revenue, "Driver Salary":totals.salary,
    "Fuel (Cash)":totals.fuelCash, "Fuel (Card)":totals.fuelCard, Parking:totals.parking,
    "Toll Collected":totals.tollCollected, "Other Expenses":totals.otherExp,
    "Owner Amount":totals.ownerAmount, "Cash Paid":totals.cashPaid, "UPI Paid":totals.upiPaid,
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `report-${title.replace(/\s+/g,"_")}.xlsx`);
}

/* ===================== INIT / SERVICE WORKER ===================== */
window.addEventListener("load", ()=>{
  applyTranslations();
  const savedOwnerId = localStorage.getItem("taxiapp_v3_ownerId");
  const savedDriverId = localStorage.getItem("taxiapp_v3_driverId");
  ensureAuth().then(()=>{
    if(savedOwnerId){
      currentOwnerId = savedOwnerId;
      currentUser = "owner";
      enterApp();
    } else if(savedDriverId){
      currentDriverId = savedDriverId;
      db.collection("drivers").doc(currentDriverId).get().then(async (doc)=>{
        if(!doc.exists || doc.data().status !== "active"){ logout(); return; }
        await resolveDriverCabAndEnter();
      }).catch(()=>{ currentUser = null; currentDriverId = null; });
    }
  }).catch((err)=>{
    console.error("Anonymous sign-in failed:", err);
    showToast("Connection error — please reload the app");
  });
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("service-worker-v3.js").then((reg)=>{
      // If a new service worker is already waiting (found on this load), activate it now
      if(reg.waiting) reg.waiting.postMessage("SKIP_WAITING");

      // Watch for a new service worker being found (app updated on the server)
      reg.addEventListener("updatefound", ()=>{
        const newWorker = reg.installing;
        if(!newWorker) return;
        newWorker.addEventListener("statechange", ()=>{
          if(newWorker.state === "installed" && navigator.serviceWorker.controller){
            // New version installed and ready — activate it immediately, no driver action needed
            newWorker.postMessage("SKIP_WAITING");
          }
        });
      });

      // Periodically check for updates while the app is open (e.g. every 5 min)
      setInterval(()=> reg.update().catch(()=>{}), 5*60*1000);
      // Also check immediately whenever the app is brought to the foreground
      document.addEventListener("visibilitychange", ()=>{
        if(document.visibilityState === "visible") reg.update().catch(()=>{});
      });
    }).catch(()=>{});

    // Once the new service worker takes control, reload so the fresh app.js/index.html run.
    // Deferred if the driver is actively on the entry form, so an unsaved entry isn't wiped —
    // it reloads as soon as they switch tabs or the app is backgrounded instead.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", ()=>{
      if(refreshing) return;
      refreshing = true;
      if(activeTab === "entry"){ pendingReload = true; refreshing = false; return; }
      window.location.reload();
    });
    document.addEventListener("visibilitychange", ()=>{
      if(document.visibilityState === "hidden") maybeReload();
    });
  }
});
