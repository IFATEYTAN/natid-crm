import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { problem_description, location_address, location_city, vehicle_type } = await req.json();

    if (!problem_description || problem_description.trim().length < 3) {
      return Response.json({ error: 'problem_description is required' }, { status: 400 });
    }

    const prompt = `אתה מערכת מיון חכמה לקריאות שירות דרך בישראל.
בהינתן תיאור תקלה מלקוח, סווג את הקריאה.

תיאור התקלה: "${problem_description}"
מיקום: ${location_address || 'לא צוין'}${location_city ? ', ' + location_city : ''}
סוג רכב: ${vehicle_type || 'לא צוין'}

סוגי תקלות אפשריים:
- mechanical: תקלה מכנית
- stopped_driving: רכב לא נוסע
- flat_tire: פנצ'ר
- stuck_wheel: גלגל תקוע
- accident: תאונה
- no_fuel: אין דלק
- dead_battery: מצבר ריק
- locked_keys: מפתחות נעולים
- other: אחר

סוגי שירות אפשריים:
- towing: גרירה
- flat_tire: פנצ'ר
- battery: מצבר
- lockout: פתיחת רכב
- fuel: דלק
- accident: תאונה
- mechanical: תקלה מכנית
- other: אחר

רמות עדיפות:
- low: נמוכה
- normal: רגילה
- high: גבוהה
- urgent: דחופה

קבע את סוג התקלה, סוג השירות הנדרש, רמת העדיפות, וכתוב הסבר קצר.
שים לב: תאונות, רכב באמצע כביש מהיר, ילדים/תינוקות ברכב = עדיפות דחופה.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          issue_type: {
            type: "string",
            enum: ["mechanical", "stopped_driving", "flat_tire", "stuck_wheel", "accident", "no_fuel", "dead_battery", "locked_keys", "other"]
          },
          service_type: {
            type: "string",
            enum: ["towing", "flat_tire", "battery", "lockout", "fuel", "accident", "mechanical", "other"]
          },
          priority: {
            type: "string",
            enum: ["low", "normal", "high", "urgent"]
          },
          confidence: {
            type: "number",
            description: "Confidence score 0-100"
          },
          reasoning: {
            type: "string",
            description: "Short explanation in Hebrew"
          }
        },
        required: ["issue_type", "service_type", "priority", "confidence", "reasoning"]
      }
    });

    return Response.json(response);

  } catch (error) {
    console.error('Categorize call error:', error);
    return Response.json({ error: 'Failed to categorize call' }, { status: 500 });
  }
});