import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react';

const riskColors = {
  low: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

const riskLabels = { low: 'נמוך', medium: 'בינוני', high: 'גבוה', critical: 'קריטי' };

const riskBorderColors = {
  low: 'border-l-green-400',
  medium: 'border-l-yellow-400',
  high: 'border-l-orange-500',
  critical: 'border-l-red-500',
};

export default function EscalationPredictionWidget() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const analyze = async () => {
    setLoading(true);
    const response = await base44.functions.invoke('analyzeHistoricalPatterns', {
      analysis_type: 'escalation_prediction',
    });
    setResult(response.data);
    setLoading(false);
  };

  const highRiskCount =
    result?.at_risk_calls?.filter((c) => c.risk_level === 'high' || c.risk_level === 'critical')
      .length || 0;

  return (
    <Card
      className={`${highRiskCount > 0 && result ? 'border-red-200 bg-red-50/20' : 'border-orange-200'}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="bg-gradient-to-l from-orange-500 to-red-500 text-white p-1 rounded-md">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            חיזוי הסלמה - AI
            {highRiskCount > 0 && (
              <Badge className="bg-red-100 text-red-700 text-xs">{highRiskCount} בסיכון</Badge>
            )}
          </CardTitle>
          <div className="flex gap-1">
            {result && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
                className="h-7 w-7 p-0"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={analyze}
              disabled={loading}
              className="gap-1 h-7 text-xs"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              {result ? 'רענן' : 'סרוק'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {loading && (
        <CardContent>
          <div className="flex items-center justify-center py-8 text-orange-600 text-sm">
            <Loader2 className="w-5 h-5 animate-spin ml-2" />
            סורק קריאות פתוחות לזיהוי סיכונים...
          </div>
        </CardContent>
      )}

      {result && !loading && expanded && (
        <CardContent className="space-y-3">
          {result.overall_risk_summary && (
            <div className="bg-white rounded-lg p-3 border text-sm text-gray-700">
              {result.overall_risk_summary}
            </div>
          )}

          {result.at_risk_calls?.length === 0 && (
            <div className="text-center py-4 text-green-600 text-sm">
              <span className="text-lg">✓</span> לא זוהו קריאות בסיכון הסלמה
            </div>
          )}

          {result.at_risk_calls
            ?.filter((c) => c.risk_level !== 'low')
            .map((call, i) => (
              <div
                key={i}
                className={`bg-white rounded-lg p-3 border border-l-4 ${riskBorderColors[call.risk_level]}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`w-4 h-4 ${call.risk_level === 'critical' ? 'text-red-500' : call.risk_level === 'high' ? 'text-orange-500' : 'text-yellow-500'}`}
                    />
                    <span className="font-medium text-sm">
                      {call.call_number || `#${call.call_id?.slice(-6)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${riskColors[call.risk_level]}`}>
                      {riskLabels[call.risk_level]}
                    </Badge>
                    <Link to={createPageUrl(`CallDetails?id=${call.call_id}`)}>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <Eye className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-1">{call.risk_reason}</p>
                <p className="text-xs text-blue-600 font-medium">💡 {call.recommended_action}</p>
                {call.estimated_escalation_minutes && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    זמן משוער להסלמה: ~{call.estimated_escalation_minutes} דק'
                  </p>
                )}
              </div>
            ))}

          <p className="text-[11px] text-gray-400 text-center">
            {result.total_open} קריאות פתוחות נסרקו
          </p>
        </CardContent>
      )}

      {!result && !loading && (
        <CardContent>
          <div className="text-center py-6 text-gray-400 text-sm">
            לחץ "סרוק" לזיהוי קריאות בסיכון הסלמה
          </div>
        </CardContent>
      )}
    </Card>
  );
}
