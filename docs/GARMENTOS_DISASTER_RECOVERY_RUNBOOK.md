# دليل استعادة البيانات وخطط التعافي من الكوارث (Disaster Recovery Runbook)
## GarmentOS Cloud — Production Disaster Recovery & Business Continuity Protocol

**الإصدار:** 1.0.0-commercial  
**تاريخ الاعتماد:** 4 نوفمبر 2026  
**الهدف التشغيلي (SLA Targets):**
- **RPO (Recovery Point Objective):** < 1 ساعة (نسخ دوري كل 6 ساعات + أرشفة سجلات WAL/Queue)
- **RTO (Recovery Time Objective):** < 30 دقيقة (استعادة آلية كاملة والتحقق من سلامة البصمة)

---

## 1. نظرة عامة وفلسفة التعافي المعزول (Isolated Disaster Recovery)

يتبنى نظام GarmentOS Cloud مبدأ **عدم الثقة العمياء في النسخ الاحتياطية**؛ إذ لا يُعتبر أي ملف نسخة احتياطية صالحاً للاستخدام ما لم يمر بفحصين إلزاميّين:
1. **التحقق من البصمة الرقمية (Cryptographic Checksum Verification):** مطابقة بصمة SHA-256 للملف مع البيان التعريفي الرقمي `manifest.json`.
2. **الاستعادة المعزولة (Isolated Target Verification):** استعادة البيانات في قاعدة بيانات اختبارية مؤقتة والتحقق من تطابق أعداد التنت (Tenants)، فواتير المبيعات (Sales Orders)، والقيود المحاسبية (Journal Entries) قبل إعادة توجيه حركة المرور الفعلية.

---

## 2. هيكل النسخ الاحتياطية وملفات البيان (Backup & Manifest Architecture)

يتم تخزين النسخ الاحتياطية محلياً في المسار المشفر والمحمي:
`storage/app/private/backups/database/`

ولكل عملية نسخ احتياطي يتم توليد ملفين متطابقين زمنياً:
1. **ملف التفريغ المضغوط والمشفر اختياريّاً:**
   - PostgreSQL: `BKP-YYYYMMDD-HHMMSS-XXXXXX.sql.gz[.enc]`
   - SQLite: `BKP-YYYYMMDD-HHMMSS-XXXXXX.sqlite[.enc]`
2. **ملف البيان التعريفي الآلي (Manifest JSON):**
   - `BKP-YYYYMMDD-HHMMSS-XXXXXX.manifest.json`

### نموذج ملف البيان (Manifest Schema):
```json
{
  "backup_id": "BKP-20261104-000051-76A1DF",
  "created_at": "2026-11-04T00:00:51Z",
  "environment": "production",
  "database_driver": "pgsql",
  "dump_file": "BKP-20261104-000051-76A1DF.sql.gz",
  "file_size_bytes": 14258940,
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "is_encrypted": false,
  "integrity_snapshot": {
    "tenants_count": 12,
    "sales_orders_count": 1485,
    "journal_entries_count": 4820
  }
}
```

---

## 3. خطوات الاستجابة لحوادث الكوارث (Emergency Incident Playbook)

### المرحلة 1: إعلان الطوارئ وتفعيل وضع الصيانة (Maintenance Mode)
فور اكتشاف تلف قاعدة البيانات أو حدوث هجوم فدية أو خطأ إداري فادح، يجب تجميد حركة المرور لمنع تفاقم عدم الاتساق:
```bash
# تفعيل وضع الصيانة مع إشعار المستخدمين
php artisan down --secret="garmentos-recovery-bypass-2026" --render="errors::503"
```

### المرحلة 2: تحديد أحدث نسخة احتياطية سليمة (Backup Identification)
استعراض النسخ الاحتياطية المتاحة وتحديد أحدث ملف بيان:
```bash
# عبر أداة التحقق
php artisan garmentos:verify-backup
```
أو قراءة قائمة النسخ:
```bash
ls -lat storage/app/private/backups/database/*.manifest.json | head -n 5
```

### المرحلة 3: فحص السلامة والبصمة الرقمية (Pre-Restore Verification)
التأكد من أن ملف التفريغ لم يتعرض للتلاعب أو التلف أثناء النقل أو التخزين:
```bash
php artisan garmentos:restore --verify-only
```
إذا أظهر الفحص:
`✓ Pre-restore SHA-256 Checksum verified`
يتم الانتقال للمرحلة التالية. إذا فشل الفحص، يتم الرجوع إلى النسخة السابقة مباشرة في سجل النسخ.

### المرحلة 4: الاستعادة التجريبية المعزولة (Isolated Sandbox Restoration)
قبل المساس بقاعدة البيانات الحية، يتم إجراء استعادة كاملة في قاعدة بيانات معزولة للتحقق من الاتساق:
```bash
# في بيئة PostgreSQL:
php artisan garmentos:restore --target-db=garmentos_recovery_sandbox --force
```
ستقوم الأداة آلياً بما يلي:
1. إنشاء قاعدة بيانات معزولة `garmentos_recovery_sandbox`.
2. استعادة ملف التفريغ بالكامل عبر `pg_restore`.
3. فحص عدد الهجرات المطبقة (`migrations table`).
4. مطابقة أعداد سجلات التنت والفواتير والقيود مع لقطة البيان (`integrity_snapshot`).
5. طباعة: `✓ DISASTER RECOVERY RESTORATION TEST: PASSED & VERIFIED`.

### المرحلة 5: التبديل إلى الإنتاج الحي (Live Production Switchover)
بعد نجاح الفحص المعزول، يتم تطبيق الاستعادة على قاعدة البيانات الإنتاجية:
```bash
php artisan garmentos:restore --target-db=garmentos_prod --force
```

### المرحلة 6: استعادة الملفات الخاصة وإيصالات إنستاباي (Private Receipts Recovery)
إذا تضمن الحادث فقداناً للملفات المرفوعة:
1. استعادة مجلد `storage/app/private/receipts/` من النسخة السحابية الاحتياطية (AWS S3 Glacier أو DigitalOcean Spaces).
2. التأكد من صلاحيات المجلدات للمستخدم `www-data`:
   ```bash
   chown -R www-data:www-data storage/app/private
   chmod -R 750 storage/app/private
   ```

### المرحلة 7: الفحص النهائي وإعادة تشغيل النظام (Post-Recovery Health Check)
التحقق من جاهزية كافة الخدمات:
```bash
# فحص الصحة والأنظمة الفرعية
curl -s http://localhost:9000/api/v1/health | jq .
```
الاستجابة المطلوبة:
```json
{
  "status": "healthy",
  "checks": {
    "database": {"status": "healthy"},
    "cache": {"status": "healthy"},
    "storage": {"status": "healthy"},
    "queue": {"status": "healthy"}
  }
}
```

ثم رفع وضع الصيانة:
```bash
php artisan up
```

---

## 4. سيناريوهات خاصة (Edge-Cases & Disaster Scenarios)

### السيناريو أ: استعادة نسخة احتياطية مشفرة بكلمة مرور (Encrypted Backup Recovery)
إذا كانت النسخة مشفرة بتقنية AES-256-CBC:
```bash
php artisan garmentos:restore --backup-id=BKP-20261104-000051-76A1DF --password="YourSecureSecretPassphrase" --target-db=garmentos_prod --force
```

### السيناريو ب: مزامنة واسترجاع النسخ من التخزين السحابي (S3 / Spaces Recovery)
في حال التلف الكلي للخادم المحلي، يتم سحب النسخ من التخزين الخارجي:
```bash
# استخدام AWS CLI أو S3cmd لسحب ملفات التفريغ والبيان
aws s3 sync s3://garmentos-cloud-backups/database/ storage/app/private/backups/database/
```
ثم تشغيل أمر الاستعادة كالمعتاد.

---

## 5. جدول الاختبارات الدورية للتعافي (Drill Schedule)
لضمان فعالية الخطة، يُلزم الفريق الهندسي بتنفيذ التدريبات التالية:
- **أسبوعياً:** فحص آلي لسلامة البصمات لكافة النسخ عبر Cron Job.
- **شهرياً:** تجربة استعادة آلية معزولة مجدولة في بيئة الاختبار (Staging) مع فحص سلامة الحسابات والقيود.
- **ربع سنوياً:** محاكاة كاملة لفقدان خادم رئيسي وإعادة بنائه من الصفر بالحاويات واستعادة البيانات.

