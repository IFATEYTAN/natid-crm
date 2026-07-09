import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

/**
 * Analyzes historical call data for:
 * 1. Recurring patterns per customer/vehicle
 * 2. Calls at risk of escalation
 * 3. Proactive service improvement recommendations
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await limiter.check('analyzeHistorical', user.id, 5, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const { analysis_type } = await req.json();

    // Fetch recent calls (last 500 for meaningful analysis)
    const calls = await base44.entities.Call.list('-created_date', 500);
    const vendors = await base44.entities.Vendor.filter({ is_active: true });

    if (analysis_type === 'recurring_patterns') {
      // Group by customer phone and vehicle plate
      const customerCalls = {};
      const vehicleCalls = {};
      const areaCalls = {};

      for (const call of calls) {
        // Customer grouping
        if (call.customer_phone) {
          if (!customerCalls[call.customer_phone]) {
            customerCalls[call.customer_phone] = { name: call.customer_name, calls: [] };
          }
          customerCalls[call.customer_phone].calls.push({
            id: call.id,
            number: call.call_number,
            issue: call.issue_type,
            date: call.created_date,
            status: call.call_status,
            city: call.pickup_location_city
          });
        }
        // Vehicle grouping
        if (call.vehicle_plate) {
          if (!vehicleCalls[call.vehicle_plate]) {
            vehicleCalls[call.vehicle_plate] = { model: call.vehicle_model, calls: [] };
          }
          vehicleCalls[call.vehicle_plate].calls.push({
            id: call.id,
            number: call.call_number,
            issue: call.issue_type,
            date: call.created_date,
            customer: call.customer_name
          });
        }
        // Area grouping
        const area = call.pickup_location_city || call.pickup_location_area || 'unknown';
        if (area !== 'unknown') {
          if (!areaCalls[area]) areaCalls[area] = [];
          areaCalls[area].push({ issue: call.issue_type, date: call.created_date });
        }
      }

      // Find repeating customers (3+ calls)
      const repeatingCustomers = Object.entries(customerCalls)
        .filter(([_, data]) => data.calls.length >= 3)
        .map(([phone, data]) => ({
          phone,
          name: data.name,
          total_calls: data.calls.length,
          issues: data.calls.map(c => c.issue),
          last_call_date: data.calls[0]?.date
        }))
        .sort((a, b) => b.total_calls - a.total_calls)
        .slice(0, 10);

      // Find repeating vehicles (2+ calls)
      const repeatingVehicles = Object.entries(vehicleCalls)
        .filter(([_, data]) => data.calls.length >= 2)
        .map(([plate, data]) => ({
          plate,
          model: data.model,
          total_calls: data.calls.length,
          issues: data.calls.map(c => c.issue),
          last_call_date: data.calls[0]?.date
        }))
        .sort((a, b) => b.total_calls - a.total_calls)
        .slice(0, 10);

      // Top problem areas
      const areaStats = Object.entries(areaCalls)
        .map(([area, callsList]) => ({ area, count: callsList.length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Ask AI to find meaningful patterns
      const prompt = `נתח את הדפוסים הבאים מהיסטוריית קריאות שירות דרך וזהה תובנות משמעותיות.

לקוחות חוזרים (3+ קריאות):
${JSON.stringify(repeatingCustomers.slice(0, 5))}

רכבים חוזרים (2+ קריאות):
${JSON.stringify(repeatingVehicles.slice(0, 5))}

אזורים בולטים:
${JSON.stringify(areaStats)}

סה"כ קריאות: ${calls.length}

זהה:
1. דפוסי תקלות חוזרות (לקוח/רכב שצריך תשומת לב)
2. אזורים בעייתיים שדורשים כיסוי ספקים טוב יותר
3. תובנות על סוגי תקלות נפוצות

כתוב בעברית, תמציתית ומעשית.`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["info", "warning", "critical"] },
                  category: { type: "string", enum: ["customer", "vehicle", "area", "issue_type"] }
                },
                required: ["title", "description", "severity", "category"]
              }
            },
            summary: { type: "string" }
          },
          required: ["patterns", "summary"]
        }
      });

      return Response.json({
        repeating_customers: repeatingCustomers,
        repeating_vehicles: repeatingVehicles,
        area_stats: areaStats,
        ai_patterns: aiResponse.patterns || [],
        ai_summary: aiResponse.summary || '',
        total_analyzed: calls.length
      });
    }

    if (analysis_type === 'escalation_prediction') {
      // Find currently open calls and predict escalation risk
      const openCalls = calls.filter(c =>
        !['completed', 'cancelled'].includes(c.call_status)
      );

      const callsData = openCalls.slice(0, 20).map(c => {
        const waitMinutes = Math.round((Date.now() - new Date(c.created_date).getTime()) / 60000);
        return {
          id: c.id,
          number: c.call_number,
          customer: c.customer_name,
          issue: c.issue_type,
          status: c.call_status,
          priority: c.call_priority,
          wait_minutes: waitMinutes,
          has_vendor: !!c.assigned_vendor_id,
          vendor_name: c.assigned_vendor_name,
          city: c.pickup_location_city,
          is_vip: c.is_vip
        };
      });

      const prompt = `אתה מערכת חיזוי AI למוקד שירותי דרך. נתח את הקריאות הפתוחות וזהה אילו מהן עלולות להפוך דחופות/בעייתיות.

קריאות פתוחות:
${JSON.stringify(callsData)}

עבור כל קריאה בסיכון, הסבר:
- מדוע היא בסיכון
- מה הפעולה המומלצת
- רמת סיכון (low/medium/high/critical)

התחשב ב:
- זמן המתנה ארוך (מעל 20 דקות)
- חוסר שיבוץ ספק
- סוגי תקלות שמחמירים עם הזמן (כמו תאונה, רכב על כביש מהיר)
- לקוחות VIP
- עדיפות קיימת

כתוב בעברית.`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            at_risk_calls: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  call_id: { type: "string" },
                  call_number: { type: "string" },
                  risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  risk_reason: { type: "string" },
                  recommended_action: { type: "string" },
                  estimated_escalation_minutes: { type: "number" }
                },
                required: ["call_id", "risk_level", "risk_reason", "recommended_action"]
              }
            },
            overall_risk_summary: { type: "string" }
          },
          required: ["at_risk_calls", "overall_risk_summary"]
        }
      });

      return Response.json({
        at_risk_calls: aiResponse.at_risk_calls || [],
        overall_risk_summary: aiResponse.overall_risk_summary || '',
        total_open: openCalls.length
      });
    }

    if (analysis_type === 'proactive_recommendations') {
      // Build comprehensive stats
      const completedCalls = calls.filter(c => c.call_status === 'completed');
      const cancelledCalls = calls.filter(c => c.call_status === 'cancelled');

      const issueDistribution = {};
      const hourDistribution = {};
      const vendorPerf = {};

      for (const c of calls) {
        // Issue types
        const issue = c.issue_type || 'other';
        issueDistribution[issue] = (issueDistribution[issue] || 0) + 1;

        // Hour of day
        if (c.created_date) {
          const hour = new Date(c.created_date).getHours();
          hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
        }

        // Vendor performance
        if (c.assigned_vendor_id && c.call_status === 'completed') {
          if (!vendorPerf[c.assigned_vendor_id]) {
            vendorPerf[c.assigned_vendor_id] = {
              name: c.assigned_vendor_name,
              completed: 0,
              total_time: 0,
              ratings: []
            };
          }
          vendorPerf[c.assigned_vendor_id].completed++;
          if (c.time_to_completion) {
            vendorPerf[c.assigned_vendor_id].total_time += c.time_to_completion;
          }
          if (c.customer_rating) {
            vendorPerf[c.assigned_vendor_id].ratings.push(c.customer_rating);
          }
        }
      }

      const vendorSummary = Object.entries(vendorPerf).map(([id, data]) => ({
        name: data.name,
        completed: data.completed,
        avg_time: data.completed > 0 ? Math.round(data.total_time / data.completed) : 0,
        avg_rating: data.ratings.length > 0 ? (data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(1) : null
      })).sort((a, b) => b.completed - a.completed).slice(0, 10);

      const prompt = `אתה יועץ AI לשיפור שירות מוקד שירותי דרך. נתח את הנתונים וצור המלצות פרואקטיביות לשיפור.

סטטיסטיקות:
- סה"כ קריאות: ${calls.length}
- הושלמו: ${completedCalls.length}
- בוטלו: ${cancelledCalls.length}
- אחוז ביטול: ${calls.length > 0 ? Math.round(cancelledCalls.length / calls.length * 100) : 0}%

התפלגות סוגי תקלות: ${JSON.stringify(issueDistribution)}
התפלגות לפי שעות (שעה: כמות): ${JSON.stringify(hourDistribution)}
ביצועי ספקים: ${JSON.stringify(vendorSummary)}
ספקים פעילים: ${vendors.length}

צור 5 המלצות פרואקטיביות ומעשיות לשיפור השירות. התמקד ב:
1. ניהול כוח אדם (מתי צריך יותר ספקים)
2. שיפור ביצועי ספקים
3. צמצום ביטולים
4. שיפור זמני תגובה
5. תכנון מונע (לפי דפוסי תקלות)

כתוב בעברית, מעשית וספציפית.`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  impact: { type: "string", enum: ["low", "medium", "high"] },
                  category: { type: "string", enum: ["staffing", "vendor_performance", "cancellations", "response_time", "preventive"] },
                  actionable_steps: { type: "array", items: { type: "string" } }
                },
                required: ["title", "description", "impact", "category"]
              }
            },
            executive_summary: { type: "string" }
          },
          required: ["recommendations", "executive_summary"]
        }
      });

      return Response.json({
        recommendations: aiResponse.recommendations || [],
        executive_summary: aiResponse.executive_summary || '',
        stats: {
          total: calls.length,
          completed: completedCalls.length,
          cancelled: cancelledCalls.length,
          issue_distribution: issueDistribution,
          peak_hours: Object.entries(hourDistribution).sort((a, b) => b[1] - a[1]).slice(0, 5),
          vendor_count: vendors.length
        }
      });
    }

    return Response.json({ error: 'Invalid analysis_type' }, { status: 400 });

  } catch (error) {
    console.error('Historical analysis error:', error);
    return Response.json({ error: 'Failed to analyze historical patterns' }, { status: 500 });
  }
});

// ===== Inline _shared/rateLimit (kept per-file: shared-module bundling is broken
// platform-wide for new deployments - see docs/LESSONS_LEARNED.md 2026-07-09) =====
/**
 * Deno KV-based rate limiter for serverless functions.
 * Uses sliding window counters for per-key rate limiting.
 *
 * Usage:
 *   const kv = await Deno.openKv();
 *   const limiter = createRateLimiter(kv);
 *   const result = await limiter.check('sms', userId, 10, 60_000); // 10 per minute
 *   if (!result.allowed) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
 */

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

function createRateLimiter(kv: Deno.Kv) {
  return {
    /**
     * Check and consume a rate limit token.
     * @param prefix - Category prefix (e.g., 'sms', 'webhook', 'maps')
     * @param key - Unique identifier (user ID, IP address, phone number)
     * @param maxRequests - Maximum requests allowed in the window
     * @param windowMs - Time window in milliseconds
     */
    async check(
      prefix: string,
      key: string,
      maxRequests: number,
      windowMs: number
    ): Promise<RateLimitResult> {
      const now = Date.now();
      const windowStart = now - windowMs;
      const kvKey = ['rate_limit', prefix, key];

      // Get current window data
      const entry = await kv.get<{ timestamps: number[] }>(kvKey);
      const timestamps = (entry.value?.timestamps || []).filter(
        (t) => t > windowStart
      );

      if (timestamps.length >= maxRequests) {
        const oldestInWindow = timestamps[0];
        return {
          allowed: false,
          remaining: 0,
          resetAt: oldestInWindow + windowMs,
        };
      }

      // Add current request timestamp
      timestamps.push(now);
      await kv.set(kvKey, { timestamps }, { expireIn: windowMs });

      return {
        allowed: true,
        remaining: maxRequests - timestamps.length,
        resetAt: now + windowMs,
      };
    },

    /**
     * Get daily counter for quota monitoring (e.g., Google Maps API).
     * @param prefix - Category prefix
     * @returns Current daily count
     */
    async getDailyCount(prefix: string): Promise<number> {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const kvKey = ['daily_count', prefix, today];
      const entry = await kv.get<{ count: number }>(kvKey);
      return entry.value?.count || 0;
    },

    /**
     * Increment daily counter.
     */
    async incrementDaily(prefix: string): Promise<number> {
      const today = new Date().toISOString().slice(0, 10);
      const kvKey = ['daily_count', prefix, today];
      const entry = await kv.get<{ count: number }>(kvKey);
      const newCount = (entry.value?.count || 0) + 1;
      // Expire after 48 hours to auto-cleanup
      await kv.set(kvKey, { count: newCount }, { expireIn: 48 * 60 * 60 * 1000 });
      return newCount;
    },
  };
}

/**
 * Extract client IP from request headers (for webhook rate limiting).
 */
function getClientIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Build a standard 429 response with rate limit headers.
 */
function rateLimitResponse(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      error: 'Too many requests - please try again later',
      retry_after_seconds: retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}
// ===== End inline _shared/rateLimit =====
