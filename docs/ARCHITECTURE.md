# البنية المعمارية v0.4.0

```text
ملف أو نص
  ↓
موجّه الصيغة
  ├─ Delimited Reader
  ├─ XLSX Reader
  ├─ DOCX OOXML Reader
  ├─ PDF.js Reader
  └─ Manual Review Fallback
  ↓
مجموعة بيانات موحدة
  headers + rows + rawText + sourceMeta
  ↓
التعرف على النوع وفحص الجودة
  ↓
موجّه التحليل
  ├─ تحليل رقمي حتمي
  ├─ توزيع مستويات
  └─ تحليل سردي تربوي محلي
  ↓
استنتاجات مرتبطة بأدلة + إجراء + مؤشر نجاح
```

## العقد الموحد للمصدر

```js
{
  name,
  kind,
  datasets: [
    {
      id,
      name,
      headers,
      rows,
      rawText,
      meta: {
        sourceType,
        mode,
        extractionMode,
        page,
        sheetName,
        tableIndex
      }
    }
  ]
}
```

هذا العقد يسمح بإضافة OCR أو مزود ذكاء اصطناعي لاحقًا دون إعادة بناء واجهة التحليل.
