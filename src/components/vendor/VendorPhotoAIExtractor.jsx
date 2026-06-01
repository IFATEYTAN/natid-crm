import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/components/ui/FeedbackToast';
import { Sparkles, Loader2, CheckCircle, ChevronDown, ChevronUp, Copy } from 'lucide-react';

const CATEGORY_PROMPTS = {
  license_plate: {
    label: 'לוחית רישוי',
    prompt: `נתח את התמונה של לוחית הרישוי וחלץ את הנתונים הבאים:
- מספר רכב (license_plate)
- סוג לוחית (plate_type: פרטי/מסחרי/דיפלומטי/צבאי/אחר)
- צבע רכב אם ניתן לראות (vehicle_color)`,
    schema: {
      type: 'object',
      properties: {
        license_plate: { type: 'string', description: 'מספר רכב' },
        plate_type: { type: 'string', description: 'סוג לוחית' },
        vehicle_color: { type: 'string', description: 'צבע רכב' },
        confidence: { type: 'string', description: 'רמת ודאות: גבוהה/בינונית/נמוכה' },
      },
    },
  },
  odometer: {
    label: 'מד אוץ',
    prompt: `נתח את התמונה של מד הקילומטראז׳/לוח מחוונים וחלץ:
- קריאת מד אוץ (odometer_reading)
- יחידה (unit: ק"מ/מיילים)
- נורות התרעה דולקות אם ניתן לראות (warning_lights)`,
    schema: {
      type: 'object',
      properties: {
        odometer_reading: { type: 'string', description: 'קריאת מד אוץ' },
        unit: { type: 'string', description: 'יחידה' },
        warning_lights: { type: 'array', items: { type: 'string' }, description: 'נורות אזהרה' },
        confidence: { type: 'string', description: 'רמת ודאות' },
      },
    },
  },
  insurance_card: {
    label: 'תעודת ביטוח',
    prompt: `נתח את תמונת תעודת הביטוח/רישיון רכב וחלץ:
- שם חברת ביטוח (insurance_company)
- מספר פוליסה (policy_number)
- שם בעל הפוליסה (owner_name)
- מספר רכב (vehicle_number)
- תוקף הפוליסה (valid_until)
- סוג כיסוי (coverage_type)`,
    schema: {
      type: 'object',
      properties: {
        insurance_company: { type: 'string' },
        policy_number: { type: 'string' },
        owner_name: { type: 'string' },
        vehicle_number: { type: 'string' },
        valid_until: { type: 'string' },
        coverage_type: { type: 'string' },
        confidence: { type: 'string' },
      },
    },
  },
  damage: {
    label: 'נזק',
    prompt: `נתח את תמונת הנזק ברכב וחלץ:
- תיאור הנזק (damage_description)
- חומרת הנזק (severity: קל/בינוני/חמור)
- מיקום הנזק ברכב (location: קדמי/אחורי/צד ימין/צד שמאל/גג/תחתית)
- סוג הנזק (damage_type: שריטה/מכה/שבר/התעקמות/אחר)
- הערכה האם הרכב נסיע (drivable: כן/לא/לא ברור)`,
    schema: {
      type: 'object',
      properties: {
        damage_description: { type: 'string' },
        severity: { type: 'string' },
        location: { type: 'string' },
        damage_type: { type: 'string' },
        drivable: { type: 'string' },
        confidence: { type: 'string' },
      },
    },
  },
  customer_document: {
    label: 'מסמך לקוח',
    prompt: `נתח את המסמך וחלץ את כל המידע הרלוונטי:
- סוג המסמך (document_type)
- שם (name)
- מספר זהות אם קיים (id_number)
- תאריך תוקף אם קיים (expiry_date)
- פרטים נוספים (additional_info)`,
    schema: {
      type: 'object',
      properties: {
        document_type: { type: 'string' },
        name: { type: 'string' },
        id_number: { type: 'string' },
        expiry_date: { type: 'string' },
        additional_info: { type: 'string' },
        confidence: { type: 'string' },
      },
    },
  },
  before_treatment: {
    label: 'לפני טיפול',
    prompt: `נתח את התמונה של הרכב לפני טיפול וחלץ:
- מצב כללי של הרכב (general_condition)
- סוג רכב ודגם אם ניתן לזהות (vehicle_type)
- צבע (color)
- נזקים קיימים שנראים (existing_damage)
- מיקום הרכב (location_description)`,
    schema: {
      type: 'object',
      properties: {
        general_condition: { type: 'string' },
        vehicle_type: { type: 'string' },
        color: { type: 'string' },
        existing_damage: { type: 'string' },
        location_description: { type: 'string' },
        confidence: { type: 'string' },
      },
    },
  },
  after_treatment: {
    label: 'אחרי טיפול',
    prompt: `נתח את התמונה של הרכב אחרי טיפול וחלץ:
- מצב הרכב אחרי הטיפול (post_treatment_condition)
- האם הרכב נראה תקין (looks_fixed)
- הערות נוספות (notes)`,
    schema: {
      type: 'object',
      properties: {
        post_treatment_condition: { type: 'string' },
        looks_fixed: { type: 'string' },
        notes: { type: 'string' },
        confidence: { type: 'string' },
      },
    },
  },
};

export default function VendorPhotoAIExtractor({ photos, callId, onDataExtracted }) {
  const [processing, setProcessing] = useState({});
  const [results, setResults] = useState({});
  const [expanded, setExpanded] = useState({});

  const activePhotos = (photos || []).filter((p) => !p.is_deleted);
  const extractablePhotos = activePhotos.filter(
    (p) => CATEGORY_PROMPTS[p.category] && p.ai_extraction_status !== 'completed'
  );
  const completedPhotos = activePhotos.filter((p) => p.ai_extraction_status === 'completed');

  const extractSingle = async (photo) => {
    const config = CATEGORY_PROMPTS[photo.category];
    if (!config) return;

    setProcessing((prev) => ({ ...prev, [photo.id]: true }));

    await base44.entities.CallPhoto.update(photo.id, { ai_extraction_status: 'processing' });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `אתה מנתח תמונות מקצועי עבור חברת גרירה ושירותי דרך.
${config.prompt}
חשוב: ענה בעברית. אם לא ניתן לזהות שדה מסוים, כתוב "לא ניתן לזהות".`,
      file_urls: [photo.file_url],
      response_json_schema: config.schema,
    });

    const summaryParts = Object.entries(result)
      .filter(([k, v]) => k !== 'confidence' && v && v !== 'לא ניתן לזהות')
      .map(([, v]) => (Array.isArray(v) ? v.join(', ') : v));
    const summary = summaryParts.join(' | ');

    await base44.entities.CallPhoto.update(photo.id, {
      ai_extracted_data: result,
      ai_extraction_status: 'completed',
      ai_extraction_summary: summary,
    });

    setResults((prev) => ({ ...prev, [photo.id]: result }));
    setProcessing((prev) => ({ ...prev, [photo.id]: false }));
    onDataExtracted?.(photo.id, result, summary);
    showToast.success(`ניתוח ${config.label} סגור`);
  };

  const extractAll = async () => {
    for (const photo of extractablePhotos) {
      await extractSingle(photo);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast.success('הועתק ללוח');
  };

  if (activePhotos.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          ניתוח AI לתמונות
        </h3>
        {extractablePhotos.length > 0 && (
          <Button
            size="sm"
            onClick={extractAll}
            disabled={Object.values(processing).some(Boolean)}
            className="gap-1 bg-purple-600 hover:bg-purple-700"
          >
            {Object.values(processing).some(Boolean) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            נתח הכל ({extractablePhotos.length})
          </Button>
        )}
      </div>

      {/* Extractable photos */}
      {extractablePhotos.length > 0 && (
        <div className="space-y-2">
          {extractablePhotos.map((photo) => {
            const config = CATEGORY_PROMPTS[photo.category];
            const isProcessing = processing[photo.id];
            return (
              <Card key={photo.id} className="bg-purple-50 border-purple-200">
                <CardContent className="p-3 flex items-center gap-3">
                  <img src={photo.file_url} alt="" className="w-14 h-14 object-cover rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {config?.label || photo.category}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{photo.file_name}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => extractSingle(photo)}
                    disabled={isProcessing}
                    className="gap-1 shrink-0"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {isProcessing ? 'מנתח...' : 'נתח'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Completed extractions */}
      {completedPhotos.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-600 flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            תמונות שנותחו ({completedPhotos.length})
          </div>
          {completedPhotos.map((photo) => {
            const config = CATEGORY_PROMPTS[photo.category];
            const data = results[photo.id] || photo.ai_extracted_data;
            const isExpanded = expanded[photo.id];
            return (
              <Card key={photo.id} className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={photo.file_url}
                      alt=""
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {config?.label || photo.category}
                      </div>
                      <div className="text-xs text-green-700 truncate">
                        {photo.ai_extraction_summary || 'ניתוח סגור'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {photo.ai_extraction_summary && (
                        <button
                          onClick={() => copyToClipboard(photo.ai_extraction_summary)}
                          className="w-7 h-7 rounded-full hover:bg-green-100 flex items-center justify-center"
                        >
                          <Copy className="w-3 h-3 text-green-600" />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [photo.id]: !prev[photo.id] }))
                        }
                        className="w-7 h-7 rounded-full hover:bg-green-100 flex items-center justify-center"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-green-600" />
                        )}
                      </button>
                    </div>
                  </div>
                  {isExpanded && data && (
                    <div className="mt-3 pt-3 border-t border-green-200 space-y-1.5">
                      {Object.entries(data).map(([key, value]) => {
                        if (!value || key === 'confidence') return null;
                        const displayValue = Array.isArray(value)
                          ? value.join(', ')
                          : String(value);
                        if (displayValue === 'לא ניתן לזהות') return null;
                        return (
                          <div key={key} className="flex items-start gap-2 text-sm">
                            <span className="text-green-800 font-medium min-w-[80px]">
                              {FIELD_LABELS[key] || key}:
                            </span>
                            <span className="text-green-700">{displayValue}</span>
                          </div>
                        );
                      })}
                      {data.confidence && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-100 text-green-700 border-green-300 mt-1"
                        >
                          ודאות: {data.confidence}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {extractablePhotos.length === 0 && completedPhotos.length === 0 && (
        <Card className="bg-gray-50">
          <CardContent className="p-4 text-center text-sm text-gray-400">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
            העלה תמונות של לוחית רישוי, מד אוץ, תעודת ביטוח, נזק או מסמכים — ו-AI ינתח אותן אוטומטית
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const FIELD_LABELS = {
  license_plate: 'מספר רכב',
  plate_type: 'סוג לוחית',
  vehicle_color: 'צבע רכב',
  odometer_reading: 'קריאת מד אוץ',
  unit: 'יחידה',
  warning_lights: 'נורות אזהרה',
  insurance_company: 'חברת ביטוח',
  policy_number: 'מספר פוליסה',
  owner_name: 'בעל פוליסה',
  vehicle_number: 'מספר רכב',
  valid_until: 'תוקף',
  coverage_type: 'סוג כיסוי',
  damage_description: 'תיאור נזק',
  severity: 'חומרה',
  location: 'מיקום',
  damage_type: 'סוג נזק',
  drivable: 'נסיע',
  document_type: 'סוג מסמך',
  name: 'שם',
  id_number: 'ת.ז.',
  expiry_date: 'תוקף',
  additional_info: 'מידע נוסף',
  general_condition: 'מצב כללי',
  vehicle_type: 'סוג רכב',
  color: 'צבע',
  existing_damage: 'נזקים קיימים',
  location_description: 'מיקום',
  post_treatment_condition: 'מצב אחרי טיפול',
  looks_fixed: 'נראה תקין',
  notes: 'הערות',
};
