import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardList, AlertTriangle, Lightbulb } from 'lucide-react';

const questionsByType = {
  battery: [
    { id: 'engine_tries', label: 'האם הרכב מנסה להניע?', type: 'boolean' },
    { id: 'dashboard_lights', label: 'אורות לוח מכוונים דולקים?', type: 'boolean' },
    {
      id: 'idle_time',
      label: 'כמה זמן הרכב עומד?',
      type: 'select',
      options: ['עד שעה', '1-6 שעות', '6-24 שעות', 'יותר מיום'],
    },
    {
      id: 'parking_type',
      label: 'סוג חניה',
      type: 'select',
      options: ['חניה פתוחה', 'חניון תת-קרקעי', 'חניון קומות', 'שול כביש'],
    },
  ],
  flat_tire: [
    {
      id: 'which_tire',
      label: 'באיזה גלגל?',
      type: 'select',
      options: ['קדמי ימין', 'קדמי שמאל', 'אחורי ימין', 'אחורי שמאל'],
    },
    { id: 'has_spare', label: 'יש גלגל חילוף?', type: 'boolean' },
    { id: 'on_road_shoulder', label: 'האם הרכב על שול הכביש?', type: 'boolean' },
    { id: 'tire_size', label: 'מידת צמיג (אם ידוע)', type: 'text' },
  ],
  mechanical: [
    { id: 'symptoms', label: 'מה הסימפטומים?', type: 'text' },
    { id: 'unusual_noise', label: 'האם יש רעשים חריגים?', type: 'boolean' },
    { id: 'engine_starts', label: 'האם הרכב מניע?', type: 'boolean' },
    { id: 'warning_lights', label: 'נורות אזהרה דולקות?', type: 'boolean' },
  ],
  accident: [
    { id: 'has_injuries', label: 'האם יש נפגעים?', type: 'boolean' },
    { id: 'can_drive', label: 'האם הרכב ניתן לנסיעה?', type: 'boolean' },
    { id: 'police_reported', label: 'האם דווח למשטרה?', type: 'boolean' },
    {
      id: 'other_vehicles',
      label: 'כמה רכבים מעורבים?',
      type: 'select',
      options: ['1', '2', '3+'],
    },
  ],
  towing: [
    { id: 'engine_starts', label: 'האם הרכב מניע?', type: 'boolean' },
    { id: 'gear_neutral', label: 'האם ניתן לשים בהילוך סרק?', type: 'boolean' },
    { id: 'steering_locked', label: 'האם ההגה נעול?', type: 'boolean' },
    { id: 'handbrake_released', label: 'האם בלם היד משוחרר?', type: 'boolean' },
  ],
  lockout: [
    {
      id: 'key_location',
      label: 'היכן המפתח?',
      type: 'select',
      options: ['בתוך הרכב', 'אבד', 'נשבר', 'לא ידוע'],
    },
    { id: 'doors_locked', label: 'כל הדלתות נעולות?', type: 'boolean' },
    { id: 'has_spare_key', label: 'יש מפתח חלופי?', type: 'boolean' },
  ],
  fuel: [
    {
      id: 'fuel_type',
      label: 'סוג דלק',
      type: 'select',
      options: ['בנזין 95', 'בנזין 98', 'דיזל', 'חשמלי', 'היברידי'],
    },
    { id: 'estimated_amount', label: 'כמות משוערת (ליטר)', type: 'text' },
  ],
};

function getRecommendation(serviceType, answers) {
  if (
    serviceType === 'battery' &&
    answers.engine_tries === false &&
    answers.parking_type &&
    answers.parking_type !== 'שול כביש'
  ) {
    return {
      type: 'info',
      message: 'המלצה: שיבוץ ניידת (עלות נמוכה יותר מגרר)',
    };
  }

  if (serviceType === 'accident' && answers.has_injuries === true) {
    return {
      type: 'danger',
      message: 'שימו לב: יש נפגעים - יש לוודא שהוזעקו שירותי חירום',
    };
  }

  return null;
}

export default function TechnicalQuestionnaire({ serviceType, answers = {}, onChange }) {
  const questions = questionsByType[serviceType];

  const recommendation = useMemo(
    () => getRecommendation(serviceType, answers),
    [serviceType, answers]
  );

  // Hide if no questions for this service type
  if (!questions || questions.length === 0) {
    return null;
  }

  const handleChange = (id, value) => {
    onChange({ ...answers, [id]: value });
  };

  const renderQuestion = (question) => {
    switch (question.type) {
      case 'boolean':
        return (
          <div key={question.id} className="flex items-center justify-between gap-4 py-2">
            <Label htmlFor={question.id} className="text-sm cursor-pointer">
              {question.label}
            </Label>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">
                {answers[question.id] ? 'כן' : 'לא'}
              </span>
              <Switch
                id={question.id}
                checked={answers[question.id] === true}
                onCheckedChange={(checked) => handleChange(question.id, checked)}
              />
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={question.id} className="space-y-1.5 py-2">
            <Label htmlFor={question.id} className="text-sm">
              {question.label}
            </Label>
            <Select
              dir="rtl"
              value={answers[question.id] || ''}
              onValueChange={(value) => handleChange(question.id, value)}
            >
              <SelectTrigger id={question.id} className="w-full">
                <SelectValue placeholder="בחר..." />
              </SelectTrigger>
              <SelectContent>
                {question.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'text':
        return (
          <div key={question.id} className="space-y-1.5 py-2">
            <Label htmlFor={question.id} className="text-sm">
              {question.label}
            </Label>
            <Input
              id={question.id}
              value={answers[question.id] || ''}
              onChange={(e) => handleChange(question.id, e.target.value)}
              placeholder="הקלד כאן..."
              className="text-end"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          שאלון טכני
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-1">
        <div className="divide-y">{questions.map(renderQuestion)}</div>

        {recommendation && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-md p-3 text-sm ${
              recommendation.type === 'danger'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {recommendation.type === 'danger' ? (
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            ) : (
              <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
            )}
            <span>{recommendation.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
