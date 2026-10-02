# Founder Fog — Arabic translation guide

Founder Fog is a mobile startup-survival game. You run a startup week by week; stress drains your
"clarity" and below 40% a "fog" scrambles your numbers. You are translating its UI and story text
into Arabic for an Egyptian/Arab audience.

## Input
A JSON array of items: `key` (copy it exactly), `text` (the English source string) and
`code_before` (the ~70 characters of JavaScript right before the string, so you can tell whether
it is user-facing).

## Output
A JSON object mapping every `key` → Arabic string, or `null` when the string must NOT be translated.
Every key from the input must appear exactly once. Write valid JSON (UTF-8, no comments).

## Return null when the string is code, not text a player reads
ids and keys (e.g. "option_A", "emp_cto", "star_performer"), export/component names
("OnboardingScreen", "StartupEngine"), style/font/color values, tab/route keys, event types
("mentor", "negative"), anything compared with === or used as an object key, emoji-only strings,
and pure symbols. When `code_before` ends in `===`, `== `, `key:`, `id:`, `Key:`, `targetTab:`,
`type:`, `fontFamily:`, `dataSet` etc. it is code → null. Person and company names ARE text
(transliterate them: "Tariq Mansour" → "طارق منصور", "Layla Fahmy" → "ليلى فهمي"); keep real
brand names in Latin (TechCrunch, AWS, LinkedIn, Google, YouTube, X).

## Hard rules (the build rejects or breaks otherwise)
1. Keep every `${...}` placeholder exactly as written (same characters, same count). You may move
   it within the sentence for natural Arabic order.
2. Keep leading/trailing spaces exactly. Strings like "Week " or " of " are glued to numbers in
   code: "Week " → "الأسبوع ", " of " → " من ".
3. Keep emojis, "▸", "·", "|", "→", "←", "\n", numbers, "%", "+", "−", "-" and money tokens like
   "$3,500" unchanged (keep Western digits and the "$" before the number). In effect previews like
   "MRR +$3,500 | Tech Debt +25%" keep the "|" separators and each sign right before its number:
   "الإيراد الشهري +$3,500 | الدين التقني +25%".
4. Do not add quotes or backticks that are not in the source.
5. Keep it short — this is a phone UI. Buttons should stay button-length.

## Style
Modern Standard Arabic, warm and punchy, like a well-localised game. Second person ("أنت").
Personal messages from family/friends (Mom, an old friend) may use light Egyptian colloquial.
UPPERCASE English labels → normal Arabic (Arabic has no case). Keep startup jargon readable;
add the English acronym in parentheses only for MRR/CAC/LTV/ARPU where helpful the first time —
but in short labels/chips use the glossary term alone.

## Glossary (use exactly these)
Cash → النقد · MRR → الإيراد الشهري · Burn / burn rate → الحرق · burn / wk → الحرق / أسبوع
Runway → مدة الصمود · months → أشهر (1 month → شهر) · Clarity → الوضوح · Morale → المعنويات
Tech Debt / tech debt → الدين التقني · Churn / Churn Rate → معدل التسرّب · CAC → تكلفة الاستحواذ
ARPU → متوسط الإيراد للمستخدم · LTV → القيمة الدائمة للعميل · Users → المستخدمون
Investor Trust / Trust → ثقة المستثمرين · Valuation → التقييم · Equity → حصة الملكية
EXP / XP → نقاط الخبرة · Level → المستوى · Perk → ميزة · Streak → سلسلة
Week → الأسبوع · Month → الشهر · Weekly target / Target → الهدف الأسبوعي / الهدف
Strategy → استراتيجية · Dilemma → معضلة · Fog → الضباب · Burnout → الاحتراق النفسي
HQ → المقر · Journal → اليوميات · Team → الفريق · Circle → الدائرة · Actions → الأنشطة
Inbox / Messages → البريد / رسائل · Founder → المؤسس · Co-founder → الشريك المؤسس · CTO → المدير التقني
Pre-seed → ما قبل البذرة · Seed → البذرة · Series A → الجولة A · Series B → الجولة B · Unicorn → يونيكورن
Pitch investors → اعرض على المستثمرين · Term sheet → ورقة الشروط · Round → جولة تمويل
Runway crunch → أزمة السيولة · Pivot → تحوّل استراتيجي · Moonshot → مغامرة كبرى
Hire → توظيف · Fire → فصل · Candidates → المرشحون · Payroll → الرواتب
End week N → إنهاء الأسبوع · Start week → ابدأ الأسبوع
