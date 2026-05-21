/**
 * Templates for Number One Mobile Cash integration code.
 * Contains copyable apps script Code.gs and standalone index.html files.
 */

export const CODE_GS_TEMPLATE = `/**
 * نظام إدارة حسابات وتحويلات الكاش وانستا باي - محل "Number One"
 * كود Google Apps Script (Code.gs)
 * يعمل كـ API للاستقبال والرفع على Google Sheets وطبقة صور Google Drive مع أرشيف شهري تلقائي
 * 
 * طريقة التركيب:
 * 1. افتح جدول بيانات Google جديد (Google Sheet) وعنونه باسم مناسب.
 * 2. من القائمة العلوية اختر: Extension (الإضافات) -> Apps Script (أشرطة أدوات التطبيق).
 * 3. احذف الكود الافتراضي وضع هذا الكود بدلاً منه.
 * 4. عدل متغير (GOOGLE_DRIVE_FOLDER_ID) أدناه إذا أردت حفظ الصور بمجلد مخصص.
 * 5. اضغط على زر Deploy (نشر) -> New Deployment (نشر جديد).
 * 6. اختر نوع النشر: Web App (تطبيق ويب).
 * 7. اضبط الإعدادات كالتالي:
 *    - Execute as: Me (بريدي الإلكتروني).
 *    - Who has access: Anyone (أي شخص - لتتيح للتطبيق إرسال البيانات دون تسجيل دخول).
 * 8. اضغط Deploy وامنح الصلاحيات المطلوبة (Authorize Access)، ثم انسخ رابط الـ Web App URL والصقه في إعدادات التطبيق.
 */

// ضع هنا معرف المجلد (Folder ID) من Google Drive لحفظ صور التحويلات فيه
// يمكنك استخراجه من رابط المجلد في المتصفح بعد كلمة folders/
// إذا تركته فارغاً "" فسيتم حفظ الصور في المجلد الرئيسي (My Drive) مباشرة
var GOOGLE_DRIVE_FOLDER_ID = ""; 

function doPost(e) {
  try {
    // التحقق من استقبال البيانات
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ 
        status: "error", 
        message: "لم يتم استقبال أي بيانات في الطلب" 
      });
    }
    
    // فك شفرة البيانات
    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ 
        status: "error", 
        message: "البيانات المرسلة ليست بالصيغة الصحيحة (JSON)" 
      });
    }
    
    // استخراج الحقول المرسلة من التطبيق
    var type = data.type || "غير محدد";           // نوع العملية (تحويل/استلام كاش أو انستا باي)
    var clientName = data.clientName || "عميل عام"; // اسم العميل أو الجهة
    var amount = parseFloat(data.amount) || 0;     // المبلغ المالي
    var phone = data.phone || "بدون رقم";          // هاتف العميل أو رقم الحساب
    var notes = data.notes || "لا توجد";           // ملاحظات إضافية
    var imageBase64 = data.image || "";            // الصورة المشفرة Base64
    var imageName = data.imageName || "receipt.png"; // اسم ملف الصورة
    
    var imageUrl = "لا يوجد إيصال";
    
    // 1. معالجة وتخزين الصورة في Google Drive
    if (imageBase64 && imageBase64.indexOf(",") > -1) {
      try {
        var parts = imageBase64.split(",");
        var base64Data = parts[1];
        var mimeHeader = parts[0];
        var contentType = mimeHeader.split(":")[1].split(";")[0];
        
        // فك التشفير وإنشاء ملف جديد
        var blob = Utilities.newBlob(
          Utilities.base64Decode(base64Data), 
          contentType, 
          "Receipt_" + Utilities.formatDate(new Date(), "GMT+2", "dd-MM-yyyy_HH-mm-ss") + "_" + imageName
        );
        
        var folder;
        if (GOOGLE_DRIVE_FOLDER_ID && GOOGLE_DRIVE_FOLDER_ID.trim() !== "") {
          try {
            folder = DriveApp.getFolderById(GOOGLE_DRIVE_FOLDER_ID);
          } catch(errFolder) {
            folder = DriveApp.getRootFolder(); // الرجوع للمجلد الرئيسي في حال حدوث خطأ
          }
        } else {
          folder = DriveApp.getRootFolder();
        }
        
        var file = folder.createFile(blob);
        // جعل الملف متاحاً للعرض لمن يمتلك الرابط
        file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
        imageUrl = file.getUrl();
      } catch (imgErr) {
        imageUrl = "فشل رفع الصورة: " + imgErr.toString();
      }
    }
    
    // 2. إدارة الأرشيف الشهري التلقائي وإنشاء ورقة العمل (Tab) إذا لم تكن موجودة
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var now = new Date();
    
    // تنسيق اسم الشيت الشهري مثلاً: Archive_May_2026
    var formattedTabName = "Archive_" + Utilities.formatDate(now, "GMT+2", "MMMM_yyyy");
    var sheet = ss.getSheetByName(formattedTabName);
    
    if (!sheet) {
      // إنشاء تابة جديدة وتسميتها
      sheet = ss.insertSheet(formattedTabName);
      
      // صف العناوين في الشيت
      var headers = [
        "التاريخ والوقت", 
        "نوع العمليّة", 
        "اسم العميل / الجهة", 
        "المبلغ (ج.م)", 
        "الهاتف / الحساب", 
        "ملاحظات", 
        "رابط إيصال التحويل"
      ];
      sheet.appendRow(headers);
      
      // تنسيق احترافي لصف العناوين
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#0f172a") // خلفية أزرق غامق جداً
                 .setFontColor("#f8fafc") // نص أبيض ناصع
                 .setFontWeight("bold")
                 .setHorizontalAlignment("center")
                 .setVerticalAlignment("middle")
                 .setFontFamily("Arial")
                 .setFontSize(11);
                 
      sheet.setFrozenRows(1); // تثبيت صف العناوين
      sheet.setRowHeight(1, 30); // تحديد ارتفاع مناسب
    }
    
    // 3. كتابة البيانات وتسجيلها
    var timestamp = Utilities.formatDate(now, "GMT+2", "dd/MM/yyyy HH:mm:ss");
    var rowData = [
      timestamp,
      type,
      clientName,
      amount,
      "'" + phone, // نضع علام ' لمنع إكسيل من إقصاء الأصفار اليسارية للأرقام
      notes,
      imageUrl
    ];
    
    sheet.appendRow(rowData);
    
    // تنسيق الصف المضاف حديثاً
    var lastRow = sheet.getLastRow();
    sheet.setRowHeight(lastRow, 25);
    var rowRange = sheet.getRange(lastRow, 1, 1, rowData.length);
    rowRange.setHorizontalAlignment("center")
            .setVerticalAlignment("middle")
            .setFontFamily("Arial")
            .setFontSize(10);
            
    // تلوين نوع العملية لجعل قراءة الشيت أسهل بالتلوين الشرطي البسيط أو تلوين النص
    var typeCell = sheet.getRange(lastRow, 2);
    if (type.indexOf("تحويل") > -1) {
      typeCell.setFontColor("#dc2626").setFontWeight("bold"); // لون أحمر غامق للحوالات الصادرة
    } else if (type.indexOf("استلام") > -1) {
      typeCell.setFontColor("#16a34a").setFontWeight("bold"); // لون أخضر غامق للواردات
    }
    
    return createJsonResponse({
      status: "success",
      message: "تم حفظ العملية بنجاح في أرشيف " + formattedTabName,
      tabName: formattedTabName,
      timestamp: timestamp,
      imageUrl: imageUrl
    });
    
  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: "حدث خطأ غير متوقع في الخادم: " + err.toString()
    });
  }
}

// معالجة طلبات GET لتمكين المزامنة السحابية وجلب كشف العمليات للمتصفحات الأخرى
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var allTransactions = [];
    
    // البحث في كافة تبويبات الأرشيف التي تبدأ باسم Archive_
    for (var s = 0; s < sheets.length; s++) {
      var sheet = sheets[s];
      var name = sheet.getName();
      
      if (name.indexOf("Archive_") === 0) {
        var values = sheet.getDataRange().getValues();
        if (values.length > 1) { // يحتوي على بيانات وصف عناوين
          // قراءة الصفوف بالتنازل التنازلي من الأحدث للأقدم
          for (var r = values.length - 1; r >= 1; r--) {
            var row = values[r];
            allTransactions.push({
              id: "cloud_" + name + "_" + r + "_" + (row[4] || "").toString().replace(/[^0-9]/g, ''),
              timestamp: row[0] ? row[0].toString() : "",
              type: row[1] ? row[1].toString() : "",
              clientName: row[2] ? row[2].toString() : "",
              amount: parseFloat(row[3]) || 0,
              phone: row[4] ? row[4].toString().replace(/^'/, '') : "", // إزالة علامة الحماية من الأصفار اليسارية
              notes: row[5] ? row[5].toString() : "",
              image: row[6] ? row[6].toString() : ""
            });
          }
        }
      }
    }
    
    // نرجع أحدث 100 عملية لسرعة الاستجابة وكفائة الشبكة
    return createJsonResponse({
      status: "success",
      transactions: allTransactions.slice(0, 100),
      count: allTransactions.length
    });
  } catch (err) {
    return createJsonResponse({
      status: "alive_but_empty",
      message: "بوابة Number One تعمل بنجاح! ولكن فشل جلب الحركات: " + err.toString(),
      developer: "Number One Team"
    });
  }
}

function createJsonResponse(outputObject) {
  var jsonString = JSON.stringify(outputObject);
  return ContentService.createTextOutput(jsonString)
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export const INDEX_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Number One - حسابات وتحويلات الكاش</title>
  <!-- خط Cairo من جوجل -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  
  <!-- tailwindcss CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- تخصيص بعض إعدادات تصميم تايلوند وبدء الخطوط -->
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            cairo: ['Cairo', 'sans-serif'],
          },
          colors: {
            brand: {
              50: '#f5f3ff',
              100: '#ede9fe',
              200: '#ddd6fe',
              300: '#c4b5fd',
              400: '#a78bfa',
              500: '#6366f1', /* نيلي - للتصميم الأنيق */
              600: '#4f46e5',
              700: '#4338ca',
              800: '#3730a3',
              900: '#312e81',
            },
            dark: {
              50: '#f8fafc',
              100: '#f1f5f9',
              200: '#e2e8f0',
              300: '#cbd5e1',
              400: '#94a3b8',
              500: '#64748b',
              600: '#475569',
              700: '#334155',
              800: '#1e293b',
              900: '#0f172a',
              950: '#0b0e14', /* أسود كربوني عميق */
            }
          }
        }
      }
    }
  </script>
  <style>
    body {
      font-family: 'Cairo', sans-serif;
    }
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type=number] {
      -moz-appearance: textfield;
    }
    .neon-border:focus-within {
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
      border-color: rgba(99, 102, 241, 0.8);
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #0f172a;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #6366f1;
    }
  </style>
</head>
<body class="bg-dark-950 text-slate-100 min-h-screen flex flex-col justify-between selection:bg-brand-500 selection:text-dark-950">

  <!-- هيدر التطبيق -->
  <header class="border-b border-dark-900 bg-dark-900/50 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
    <div class="max-w-4xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- لوجو التاج والاسم -->
        <div class="h-10 w-10 bg-brand-500 text-dark-950 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 font-extrabold text-xl font-mono">
          #1
        </div>
        <div>
          <h1 class="font-bold text-lg tracking-tight text-white flex items-center gap-1">
            Number One
            <span class="text-brand-500 text-xs px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20">كاش</span>
          </h1>
          <p class="text-xs text-slate-400">إدارة التحويلات والمعاملات المالية</p>
        </div>
      </div>
      
      <!-- الأزرار العلوية -->
      <div class="flex items-center gap-2" id="headerActions" style="display: none;">
        <button onclick="openSettings()" class="bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white p-2 rounded-lg transition text-xs flex items-center gap-1.5 border border-dark-700">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>الإعدادات</span>
        </button>
        <button onclick="logout()" class="bg-red-950/45 hover:bg-red-900/60 text-red-400 p-2 rounded-lg transition text-xs border border-red-900/40">
          خروج
        </button>
      </div>
    </div>
  </header>

  <!-- محتوى التطبيق -->
  <main class="flex-grow p-4 md:p-6 max-w-4xl mx-auto w-full">

    <!-- 1. واجهة تسجيل الدخول (Login UI) -->
    <div id="loginSection" class="w-full max-w-md mx-auto py-12">
      <div class="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <!-- تصميم زخرفي خلف اللوجو -->
        <div class="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl"></div>
        
        <div class="flex flex-col items-center text-center mb-8">
          <div class="h-14 w-14 bg-gradient-to-tr from-brand-600 to-brand-400 text-dark-950 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/15 mb-4">
            <!-- أيقونة مفتاح أو قفل -->
            <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-white">تسجيل الدخول للنظام</h2>
          <p class="text-sm text-slate-400 mt-1">يرجى إدخال كلمة المرور الخاصة بمحل "Number One" للوصول للوحة التحكم</p>
        </div>

        <form onsubmit="handleLogin(event)" class="space-y-5">
          <div>
            <label for="password" class="block text-xs font-semibold text-slate-400 mb-2">كلمة مرور لوحة التحكم</label>
            <div class="relative rounded-xl border border-dark-700 bg-dark-950 focus-within:border-brand-500 transition-all">
              <input type="password" id="password" required placeholder="••••••••" 
                     class="w-full bg-transparent px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none text-center tracking-widest font-bold rounded-xl" />
            </div>
            <p id="loginError" class="text-xs text-red-500 mt-2 font-medium hidden">كلمة المرور غير صحيحة! يرجى المحاولة مجدداً.</p>
          </div>

          <button type="submit" class="w-full bg-brand-500 hover:bg-brand-600 text-dark-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-brand-500/10 cursor-pointer text-sm transition-all duration-200 transform active:scale-[0.98]">
            دخول مباشر
          </button>
        </form>
      </div>
    </div>


    <!-- 2. لوحة التحكم الرئيسية (Main Dashboard) -->
    <div id="dashboardSection" class="space-y-6 hidden">
      
      <!-- رسالة لم يتم ضبط الرابط البرمجي بعد -->
      <div id="missingConfigAlert" class="bg-amber-950/40 border border-amber-500/30 text-amber-300 p-4 rounded-xl text-sm leading-relaxed flex items-start gap-3 hidden">
        <svg class="h-5 w-5 shrink-0 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div class="flex-grow">
          <p class="font-bold">رابط API المتصل بـ Google غير محدد!</p>
          <p class="text-xs text-slate-400 mt-1">يرجى الضغط على زر الإعدادات وإدخال رابط Web App الخاص بـ Google Apps Script لحفظ المعاملات بشكل صحيح.</p>
          <button onclick="openSettings()" class="mt-2.5 text-xs font-bold text-amber-400 hover:underline flex items-center gap-1">
            اضبط الرابط الآن &larr;
          </button>
        </div>
      </div>

      <!-- شبكة الواجهة: الفورم وحالة الاتصال -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        <!-- فرع الإدخال: الفورم (8 أعمدة من 12) -->
        <div class="md:col-span-12 lg:col-span-8 bg-dark-900 border border-dark-900 rounded-2xl p-5 md:p-6 shadow-xl relative">
          <h2 class="text-lg font-bold text-white mb-5 pb-3 border-b border-dark-950 flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-brand-500 animate-pulse"></span>
            تسجيل معاملة مالية جديدة
          </h2>

          <form onsubmit="handleFormSubmit(event)" class="space-y-4">
            <!-- نوع العملية بنظام الكروت الأنيقة والمنسدلة -->
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-2">نوع العملية</label>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <label class="cursor-pointer">
                  <input type="radio" name="operationType" value="تحويل كاش" checked onchange="updateOperationStyle(this)" class="sr-only peer">
                  <div class="bg-dark-950 hover:bg-dark-800 text-slate-300 border border-dark-800 rounded-xl p-3 text-center transition flex flex-col items-center justify-center gap-1 peer-checked:border-red-500 peer-checked:bg-red-950/20 peer-checked:text-red-400 h-16">
                    <span class="text-xs font-bold">تحويل كاش</span>
                    <span class="text-[9px] text-slate-500">صادر 💸</span>
                  </div>
                </label>
                
                <label class="cursor-pointer">
                  <input type="radio" name="operationType" value="استلام كاش" onchange="updateOperationStyle(this)" class="sr-only peer">
                  <div class="bg-dark-950 hover:bg-dark-800 text-slate-300 border border-dark-800 rounded-xl p-3 text-center transition flex flex-col items-center justify-center gap-1 peer-checked:border-green-500 peer-checked:bg-green-950/20 peer-checked:text-green-400 h-16">
                    <span class="text-xs font-bold">استلام كاش</span>
                    <span class="text-[9px] text-slate-500">وارد 💰</span>
                  </div>
                </label>

                <label class="cursor-pointer">
                  <input type="radio" name="operationType" value="تحويل انستا باي" onchange="updateOperationStyle(this)" class="sr-only peer">
                  <div class="bg-dark-950 hover:bg-dark-800 text-slate-300 border border-dark-800 rounded-xl p-3 text-center transition flex flex-col items-center justify-center gap-1 peer-checked:border-purple-500 peer-checked:bg-purple-950/20 peer-checked:text-purple-400 h-16">
                    <span class="text-xs font-bold">تحويل انستا باي</span>
                    <span class="text-[9px] text-slate-500">صادر ⚡</span>
                  </div>
                </label>

                <label class="cursor-pointer">
                  <input type="radio" name="operationType" value="استلام انستا باي" onchange="updateOperationStyle(this)" class="sr-only peer">
                  <div class="bg-dark-950 hover:bg-dark-800 text-slate-300 border border-dark-800 rounded-xl p-3 text-center transition flex flex-col items-center justify-center gap-1 peer-checked:border-sky-500 peer-checked:bg-sky-950/20 peer-checked:text-sky-400 h-16">
                    <span class="text-xs font-bold">استلام انستا باي</span>
                    <span class="text-[9px] text-slate-500">وارد 📲</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- الاسم والمبلغ في سطر واحد -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="clientName" class="block text-xs font-semibold text-slate-400 mb-1.5">اسم العميل أو الجهة <span class="text-red-500">*</span></label>
                <div class="relative bg-dark-950 border border-dark-800 rounded-xl flex items-center focus-within:border-brand-500 transition-all">
                  <span class="pl-0 pr-3 text-slate-500">👤</span>
                  <input type="text" id="clientName" required placeholder="مثال: وحيد المانسترلي" 
                         class="w-full bg-transparent px-3 py-3 text-slate-100 placeholder-slate-600 focus:outline-none text-sm" />
                </div>
              </div>

              <div>
                <label for="amount" class="block text-xs font-semibold text-slate-400 mb-1.5">المبلغ المطلوب (ج.م) <span class="text-red-500">*</span></label>
                <div class="relative bg-dark-950 border border-dark-800 rounded-xl flex items-center focus-within:border-brand-500 transition-all">
                  <span class="pl-0 pr-3 text-slate-500 font-bold text-xs text-brand-500">EGP</span>
                  <input type="number" id="amount" required step="any" min="0.1" placeholder="0.00" 
                         class="w-full bg-transparent px-3 py-3 text-slate-100 placeholder-slate-600 focus:outline-none text-sm font-semibold" />
                </div>
              </div>
            </div>

            <!-- رقم الهاتف والملاحظات -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="phone" class="block text-xs font-semibold text-slate-400 mb-1.5">رقم الهاتف أو الحساب المحول منه/إليه <span class="text-red-500">*</span></label>
                <div class="relative bg-dark-950 border border-dark-800 rounded-xl flex items-center focus-within:border-brand-500 transition-all">
                  <span class="pl-0 pr-3 text-slate-500">📞</span>
                  <input type="text" id="phone" required placeholder="رقم المحفظة أو الحساب" 
                         class="w-full bg-transparent px-3 py-3 text-slate-110 placeholder-slate-600 focus:outline-none text-sm font-mono tracking-wider" />
                </div>
              </div>

              <div>
                <label for="notes" class="block text-xs font-semibold text-slate-400 mb-1.5">ملاحظات إضافية (اختياري)</label>
                <div class="relative bg-dark-950 border border-dark-800 rounded-xl flex items-center focus-within:border-brand-500 transition-all">
                  <span class="pl-0 pr-3 text-slate-500">📝</span>
                  <input type="text" id="notes" placeholder="اكتب أي ملاحظة أخرى هنا" 
                         class="w-full bg-transparent px-3 py-3 text-slate-100 placeholder-slate-600 focus:outline-none text-sm" />
                </div>
              </div>
            </div>

            <!-- رفع إيصال الصورة عريض وممتاز -->
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">إرفاق صورة إيصال التحويل (لقطة الشاشة)</label>
              
              <!-- صندوق الرفع وتجربة المستخدم الممتازة -->
              <div id="dropZone" class="border-2 border-dashed border-dark-800 hover:border-brand-500/50 bg-dark-950 rounded-2xl p-5 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center min-h-[140px]"
                   onclick="triggerFileInput()"
                   ondragsover="handleDragOver(event)"
                   ondragleave="handleDragLeave()"
                   ondrop="handleFileDrop(event)">
                
                <input type="file" id="fileInput" accept="image/*" class="hidden" onchange="handleFileSelect(event)">
                
                <!-- الحالة الافتراضية للرفع -->
                <div id="uploadDefault" class="space-y-2">
                  <div class="text-3xl">📷</div>
                  <p class="text-xs font-medium text-slate-200">اسحب صورة الإيصال وأفلتها هنا، أو اضغط للتصفح</p>
                  <p class="text-[10px] text-slate-500">يقبل ملفات الصور فقط (PNG, JPG, BMP)</p>
                </div>

                <!-- حالة اختيار ملف ومعاينته -->
                <div id="uploadPreview" class="hidden w-full flex flex-col items-center justify-center gap-3">
                  <div class="relative">
                    <img id="previewImage" src="" alt="Thumbnail" class="max-h-24 max-w-[200px] h-auto rounded-lg border border-dark-700 object-contain shadow-md" />
                    <button type="button" onclick="cancelImage(event)" class="absolute -top-2 -right-2 h-6 w-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center font-bold text-xs shadow cursor-pointer">
                      ✕
                    </button>
                  </div>
                  <p id="imageDetails" class="text-xs text-brand-400 font-medium"></p>
                </div>
              </div>
            </div>

            <!-- زر الحفظ و الإرسال السحابي -->
            <div class="pt-2">
              <button type="submit" id="btnSubmit" class="w-full bg-brand-500 hover:bg-brand-600 text-dark-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-brand-500/10 cursor-pointer text-sm transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-[0.98]">
                <svg id="submitSpinner" class="animate-spin -ml-1 mr-3 h-5 w-5 text-dark-950 hidden" xmlns="http://www.w3.org/2000/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span id="submitText">حفظ وإرسال المعاملة إلى Google Sheets 🚀</span>
              </button>
            </div>
          </form>
        </div>

        <!-- الجانب الآخر: العمليات المحلية والإحصائيات السريعة (4 أعمدة من 12) -->
        <div class="md:col-span-12 lg:col-span-4 space-y-5">
          
          <!-- بطاقة الإحصائيات المختصرة -->
          <div class="bg-dark-900 border border-dark-900 rounded-2xl p-5 shadow-xl">
            <h3 class="text-sm font-bold text-slate-300 mb-4 pb-2 border-b border-dark-950">إحصائيات اليوم (محليّة)</h3>
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-dark-950 p-3 rounded-xl border border-dark-800">
                <span class="text-[10px] text-red-400 font-bold block">إجمالي الصادر</span>
                <span id="statOut" class="text-base font-extrabold text-white mt-1 block">0.00 ج.م</span>
              </div>
              <div class="bg-dark-950 p-3 rounded-xl border border-dark-800">
                <span class="text-[10px] text-green-400 font-bold block">إجمالي الوارد</span>
                <span id="statIn" class="text-base font-extrabold text-white mt-1 block">0.00 ج.م</span>
              </div>
            </div>
          </div>

          <!-- أرشيف محلي سريع لحفظ كشوفات آمنة للمحل -->
          <div class="bg-dark-900 border border-dark-900 rounded-2xl p-5 shadow-xl flex flex-col max-h-[400px]">
            <div class="flex items-center justify-between mb-3 pb-2 border-b border-dark-950">
              <h3 class="text-sm font-bold text-white flex items-center gap-1.5">
                <span>آخر 5 عمليات محلية</span>
                <span class="text-[10px] text-brand-500 font-bold" id="localBackupCount">(0)</span>
              </h3>
              <button onclick="clearLocalHistory()" class="text-[10px] text-red-550 hover:text-red-400 font-bold transition">حذف السجل</button>
            </div>

            <!-- قائمة العمليات -->
            <div id="localBackupList" class="space-y-3 overflow-y-auto custom-scrollbar flex-grow pr-1 text-xs">
              <!-- رسالة حالة خلو الأرشيف -->
              <p id="emptyBackupText" class="text-center text-slate-500 py-8">لا توجد أي عمليات مسجّلة حالياً.</p>
            </div>
          </div>
        </div>

      </div>

    </div>

  </main>

  <!-- نافذة منبثقة للإعدادات وقيم الروابط (Settings Modal) -->
  <dialog id="settingsDialog" class="bg-transparent backdrop:bg-dark-950/80 p-0 rounded-2xl overflow-hidden w-full max-w-xl mx-auto border-0 focus:outline-none">
    <div class="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-2xl relative text-right text-slate-200">
      <div class="flex items-center justify-between mb-5 pb-3 border-b border-dark-800">
        <h3 class="text-lg font-bold text-white flex items-center gap-2">
          ⚙️ إعدادات ربط Google Apps Script
        </h3>
        <button onclick="closeSettings()" class="text-slate-400 hover:text-white font-bold text-lg cursor-pointer">✕</button>
      </div>

      <div class="space-y-4 text-xs md:text-sm">
        <div class="bg-dark-950 p-3.5 rounded-xl border border-dark-800 leading-relaxed text-slate-300">
          <p class="font-bold text-brand-400 mb-1">💡 ما هو الرابط المتصل؟</p>
          <p class="text-xs">هو الرابط الذي يتم الحصول عليه بعد نشر كود Google Apps Script كـ (Web App). يسمح للموقع بإرسال البيانات المباشرة لشيكات الأرشيف الشهرية تلقائياً وبأمان تام.</p>
        </div>

        <div>
          <label for="apiUrlInput" class="block text-xs font-semibold text-slate-400 mb-2">رابط الخادم البرمجي لـ Google Web App API</label>
          <div class="relative bg-dark-950 border border-dark-800 rounded-xl flex items-center focus-within:border-brand-500 transition-all">
            <input type="url" id="apiUrlInput" placeholder="https://script.google.com/macros/s/.../exec" 
                   class="w-full bg-transparent px-4 py-3 text-slate-100 placeholder-slate-700 focus:outline-none text-xs font-mono tracking-normal text-left dir-ltr" />
          </div>
          <p class="text-[11px] text-slate-500 mt-2">انسخ رابط الـ Exec الممنوح من لوحة Apps Script وضعه بالكامل في هذا الحقل.</p>
        </div>

        <div class="pt-2 flex justify-end gap-3">
          <button type="button" onclick="closeSettings()" class="bg-dark-950 hover:bg-dark-800 text-slate-400 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer">
            إلغاء
          </button>
          <button type="button" onclick="saveSettings()" class="bg-brand-500 hover:bg-brand-600 text-dark-950 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer">
            حفظ التكوين 💾
          </button>
        </div>
      </div>
    </div>
  </dialog>

  <!-- الفوتر لتوضيح الحقوق -->
  <footer class="border-t border-dark-900 bg-dark-950 py-4 text-center text-xs text-slate-500">
    <div class="max-w-4xl mx-auto px-4">
      <p>محل موبايلات "Number One" &copy; 2026 - نظام إدارة الحسابات السحابية</p>
    </div>
  </footer>

  <!-- الأكواد البرمجية للعمليات بالمتصفح -->
  <script>
    // الإعدادات الافتراضية للبلورة والربط
    var GLOBAL_CONFIG = {
      correctPasscode: "waheed",
      apiKeyUrl: localStorage.getItem("numberOneGasApiUrl") || "",
      isLoggedIn: false
    };

    // التحقق من الجلسة القديمة أو تحميل الصفحة
    window.addEventListener("DOMContentLoaded", function() {
      var savedLogin = sessionStorage.getItem("numberOneLoggedIn");
      if (savedLogin === "true") {
        GLOBAL_CONFIG.isLoggedIn = true;
        showDashboard();
      } else {
        showLogin();
      }
      
      // تعبئة حقل الإعدادات وتحديث مؤشرات الإحصاء
      document.getElementById("apiUrlInput").value = GLOBAL_CONFIG.apiKeyUrl;
      updateLocalStatsInUI();
    });

    // تبديل الواجهات
    function showLogin() {
      document.getElementById("loginSection").style.display = "block";
      document.getElementById("dashboardSection").style.display = "none";
      document.getElementById("headerActions").style.display = "none";
    }

    function showDashboard() {
      document.getElementById("loginSection").style.display = "none";
      document.getElementById("dashboardSection").style.display = "block";
      document.getElementById("headerActions").style.display = "flex";
      
      // التحقق من تعريف الرابط
      if (!GLOBAL_CONFIG.apiKeyUrl || GLOBAL_CONFIG.apiKeyUrl.trim() === "") {
        document.getElementById("missingConfigAlert").style.display = "flex";
      } else {
        document.getElementById("missingConfigAlert").style.display = "none";
      }
    }

    // تسجيل الدخول
    function handleLogin(e) {
      e.preventDefault();
      var passInput = document.getElementById("password").value;
      if (passInput === GLOBAL_CONFIG.correctPasscode) {
        GLOBAL_CONFIG.isLoggedIn = true;
        sessionStorage.setItem("numberOneLoggedIn", "true");
        document.getElementById("loginError").style.display = "none";
        document.getElementById("password").value = "";
        showDashboard();
      } else {
        document.getElementById("loginError").style.display = "block";
      }
    }

    // الخروج
    function logout() {
      GLOBAL_CONFIG.isLoggedIn = false;
      sessionStorage.removeItem("numberOneLoggedIn");
      showLogin();
    }

    // فتح وغلق شاشة الإعدادات
    function openSettings() {
      document.getElementById("apiUrlInput").value = GLOBAL_CONFIG.apiKeyUrl;
      document.getElementById("settingsDialog").showModal();
    }

    function closeSettings() {
      document.getElementById("settingsDialog").close();
    }

    function saveSettings() {
      var url = document.getElementById("apiUrlInput").value.trim();
      GLOBAL_CONFIG.apiKeyUrl = url;
      localStorage.setItem("numberOneGasApiUrl", url);
      closeSettings();
      
      if (!url || url === "") {
        document.getElementById("missingConfigAlert").style.display = "flex";
      } else {
        document.getElementById("missingConfigAlert").style.display = "none";
      }
    }

    // معالجة تغيير طريقة تلوين إطار نوع العملية
    function updateOperationStyle(el) {
      // تعديل الجماليات إن لزم
    }

    // استدعاء ملف رفع الصورة يدوياً
    function triggerFileInput() {
      document.getElementById("fileInput").click();
    }

    function handleDragOver(e) {
      e.preventDefault();
      document.getElementById("dropZone").classList.add("border-brand-500", "bg-brand-500/5");
    }

    function handleDragLeave() {
      document.getElementById("dropZone").classList.remove("border-brand-500", "bg-brand-500/5");
    }

    var selectedImageBase64 = "";
    var selectedImageName = "";

    function handleFileDrop(e) {
      e.preventDefault();
      handleDragLeave();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processUploadedFile(e.dataTransfer.files[0]);
      }
    }

    function handleFileSelect(e) {
      if (e.target.files && e.target.files[0]) {
        processUploadedFile(e.target.files[0]);
      }
    }

    function processUploadedFile(file) {
      if (!file.type.match("image.*")) {
        alert("يرجى اختيار صور فقط لرفع إيصال التحويل!");
        return;
      }
      
      selectedImageName = file.name;
      var reader = new FileReader();
      
      reader.onload = function(evt) {
        selectedImageBase64 = evt.target.result;
        
        // تعديل شكل صندوق الرفع للمعينة
        document.getElementById("uploadDefault").style.display = "none";
        document.getElementById("uploadPreview").style.display = "flex";
        document.getElementById("previewImage").src = evt.target.result;
        document.getElementById("imageDetails").innerText = file.name + " (" + (file.size / 1024).toFixed(1) + " كيلوبايت)";
      };
      
      reader.readAsDataURL(file);
    }

    function cancelImage(e) {
      if(e) e.stopPropagation();
      selectedImageBase64 = "";
      selectedImageName = "";
      document.getElementById("fileInput").value = "";
      document.getElementById("uploadDefault").style.display = "block";
      document.getElementById("uploadPreview").style.display = "none";
      document.getElementById("previewImage").src = "";
    }

    // إرسال وحفظ المعاملة
    function handleFormSubmit(e) {
      e.preventDefault();
      
      if (!GLOBAL_CONFIG.apiKeyUrl || GLOBAL_CONFIG.apiKeyUrl.trim() === "") {
        alert("يرجى تعيين رابط Google Apps Script Web App الخاص بك أولاً في صفحة الإعدادات لتتمكن من إرسال البيانات!");
        openSettings();
        return;
      }

      // قراءة المدخلات
      var opType = document.querySelector('input[name="operationType"]:checked').value;
      var clientName = document.getElementById("clientName").value.trim();
      var amount = parseFloat(document.getElementById("amount").value);
      var phone = document.getElementById("phone").value.trim();
      var notes = document.getElementById("notes").value.trim();

      // تفعيل حالة التحميل بالزر
      setSubmitLoading(true);

      var payload = {
        type: opType,
        clientName: clientName,
        amount: amount,
        phone: phone,
        notes: notes || "لا توجد ملاحظات",
        image: selectedImageBase64,
        imageName: selectedImageName || "receipt.png"
      };

      // إجراء اتصال API بـ Google Apps Script
      fetch(GLOBAL_CONFIG.apiKeyUrl, {
        method: "POST",
        mode: "no-cors", // نظراً لاستخدام Google Apps Script مع redirects
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      })
      .then(function() {
        // نظراً لأن وضع no-cors لا يتيح قراءة الاستجابة، سنفترض نجاح الإرسال بمجرد تخطي الخطأ الشبكي المباشر وهو السلوك القياسي لربط جوجل
        saveTransactionLocally({
          id: Date.now(),
          type: opType,
          clientName: clientName,
          amount: amount,
          phone: phone,
          notes: notes,
          image: selectedImageBase64,
          timestamp: new Date().toLocaleString("ar-EG")
        });

        alert("تم إرسال وحفظ المعاملة بنجاح إلى ورقة عمل الأرشيف في Google Sheets 💾");
        resetForm();
      })
      .catch(function(err) {
        console.error("Error submitting:", err);
        alert("فشل الإرسال: " + err.toString());
      })
      .finally(function() {
        setSubmitLoading(false);
      });
    }

    function setSubmitLoading(isLoading) {
      var btn = document.getElementById("btnSubmit");
      var spinner = document.getElementById("submitSpinner");
      var text = document.getElementById("submitText");

      if (isLoading) {
        btn.disabled = true;
        btn.classList.add("opacity-75");
        spinner.classList.remove("hidden");
        text.innerText = "جاري الحفظ والتحويل السحابي للأرشيف...";
      } else {
        btn.disabled = false;
        btn.classList.remove("opacity-75");
        spinner.classList.add("hidden");
        text.innerText = "حفظ وإرسال المعاملة إلى Google Sheets 🚀";
      }
    }

    function resetForm() {
      document.getElementById("clientName").value = "";
      document.getElementById("amount").value = "";
      document.getElementById("phone").value = "";
      document.getElementById("notes").value = "";
      cancelImage();
    }

    // إدارة الأرشيف المحلي بالـ Storage
    function saveTransactionLocally(tx) {
      var history = JSON.parse(localStorage.getItem("numberOneTxHistory") || "[]");
      history.unshift(tx); // نضع الأحدث في المقدمة
      
      // نبقي فقط الأحدث 30 عملية محلياً
      if (history.length > 30) {
        history = history.slice(0, 30);
      }
      
      localStorage.setItem("numberOneTxHistory", JSON.stringify(history));
      updateLocalStatsInUI();
    }

    function clearLocalHistory() {
      if (confirm("هل أنت متأكد من حذف تاريخ المعاملات المحلية المحفوظ على هذا الجهاز؟")) {
        localStorage.removeItem("numberOneTxHistory");
        updateLocalStatsInUI();
      }
    }

    function updateLocalStatsInUI() {
      var history = JSON.parse(localStorage.getItem("numberOneTxHistory") || "[]");
      
      // الإحصائيات
      var totalIn = 0;
      var totalOut = 0;
      
      var listContainer = document.getElementById("localBackupList");
      listContainer.innerHTML = "";
      
      if (history.length === 0) {
        document.getElementById("emptyBackupText").style.display = "block";
        document.getElementById("localBackupCount").innerText = "(0)";
      } else {
        document.getElementById("emptyBackupText").style.display = "none";
        document.getElementById("localBackupCount").innerText = "(" + history.length + ")";
        
        var recentItems = history.slice(0, 5); // أحدث 5 فقط للواجهة الجانبية
        
        recentItems.forEach(function(tx) {
          // حساب المالية
          var isOut = tx.type.indexOf("تحويل") > -1;
          if (isOut) {
            totalOut += parseFloat(tx.amount);
          } else {
            totalIn += parseFloat(tx.amount);
          }
          
          // ستايل اللون
          var colorClass = isOut ? "text-red-400 border-red-900/30 bg-red-950/20" : "text-green-400 border-green-900/30 bg-green-950/20";
          var badgeText = tx.type;
          
          var div = document.createElement("div");
          div.className = "p-3 bg-dark-950 rounded-xl border border-dark-800 space-y-1.5";
          var innerHtmlContent = "";
          innerHtmlContent += '<div class="flex items-center justify-between">';
          innerHtmlContent += '  <span class="font-bold text-white text-xs">' + tx.clientName + '</span>';
          innerHtmlContent += '  <span class="text-[10px] py-0.5 px-2 rounded-full border ' + colorClass + ' font-bold">' + badgeText + '</span>';
          innerHtmlContent += '</div>';
          innerHtmlContent += '<div class="flex items-center justify-between text-[11px] text-slate-400">';
          innerHtmlContent += '  <span class="font-semibold text-slate-200">' + tx.amount.toFixed(2) + ' ج.م</span>';
          innerHtmlContent += '  <span class="font-mono">' + tx.phone + '</span>';
          innerHtmlContent += '</div>';
          innerHtmlContent += '<div class="flex items-center justify-between text-[10px] text-slate-500">';
          innerHtmlContent += '  <span>' + tx.timestamp + '</span>';
          if (tx.notes) {
            innerHtmlContent += '  <span class="truncate max-w-[120px]" title="' + tx.notes + '">📝 ' + tx.notes + '</span>';
          }
          innerHtmlContent += '</div>';
          div.innerHTML = innerHtmlContent;
          
          listContainer.appendChild(div);
        });
      }
      
      // يمكن احتساب الإجمالي من كامل السجل المحفوظ وليس آخر 5 فقط
      var fullHistoryTotalIn = 0;
      var fullHistoryTotalOut = 0;
      history.forEach(function(tx) {
        if (tx.type.indexOf("تحويل") > -1) {
          fullHistoryTotalOut += parseFloat(tx.amount);
        } else {
          fullHistoryTotalIn += parseFloat(tx.amount);
        }
      });
      
      document.getElementById("statOut").innerText = fullHistoryTotalOut.toLocaleString("ar-EG") + " ج.م";
      document.getElementById("statIn").innerText = fullHistoryTotalIn.toLocaleString("ar-EG") + " ج.م";
    }
  </script>
</body>
</html>
`;
