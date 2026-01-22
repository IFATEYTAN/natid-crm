import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  Phone,
  Truck,
  User,
  MapPin,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Download,
  Play
} from 'lucide-react';

export default function UserGuidePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <BookOpen className="w-16 h-16 mx-auto text-red-600 mb-4" />
        <h1 className="text-3xl font-bold text-[#172B4D]">מדריך למשתמש</h1>
        <p className="text-[#6B778C] mt-2">כל מה שצריך לדעת כדי לעבוד עם מערכת נתיב</p>
      </div>

      <Tabs defaultValue="operator" className="space-y-6" dir="rtl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="operator">מדריך למוקדן</TabsTrigger>
          <TabsTrigger value="vendor">מדריך לספק שירות</TabsTrigger>
        </TabsList>

        {/* Operator Guide */}
        <TabsContent value="operator">
          <div className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-red-600" />
                  פתיחת קריאה חדשה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold shrink-0">1</div>
                  <div>
                    <h4 className="font-medium">לחץ על "קריאה חדשה"</h4>
                    <p className="text-sm text-[#6B778C]">הכפתור האדום בתפריט הצד או בראש הדשבורד</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold shrink-0">2</div>
                  <div>
                    <h4 className="font-medium">מלא את פרטי הלקוח</h4>
                    <p className="text-sm text-[#6B778C]">שם, טלפון, ומידע על חברת הביטוח אם רלוונטי</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold shrink-0">3</div>
                  <div>
                    <h4 className="font-medium">הזן את פרטי הרכב והמיקום</h4>
                    <p className="text-sm text-[#6B778C]">מספר רכב, סוג התקלה, וכתובת מדויקת</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold shrink-0">4</div>
                  <div>
                    <h4 className="font-medium">שמור ושבץ ספק</h4>
                    <p className="text-sm text-[#6B778C]">המערכת תציע ספקים זמינים באזור</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-red-600" />
                  שיבוץ ספק לקריאה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">טיפ חשוב</h4>
                      <p className="text-sm text-blue-700">
                        בחר ספק על פי קרבה למיקום, זמינות, ודירוג. המערכת מסמנת ספקים מומלצים.
                      </p>
                    </div>
                  </div>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    פתח את דף פרטי הקריאה
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    לחץ על "שבץ ספק"
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    בחר ספק מהרשימה ואשר
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    הספק יקבל התראה אוטומטית
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-600" />
                  מעקב אחר קריאות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="dashboard">
                    <AccordionTrigger>איך לראות סטטוס קריאות?</AccordionTrigger>
                    <AccordionContent>
                      בדשבורד הראשי תראה את כל הקריאות הפעילות מסודרות לפי סטטוס. 
                      קריאות דחופות מסומנות באדום. לחץ על קריאה כדי לראות פרטים מלאים.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="map">
                    <AccordionTrigger>איך לעקוב אחר ספקים במפה?</AccordionTrigger>
                    <AccordionContent>
                      עבור ל"מעקב GPS" בתפריט. תראה את כל הספקים המחוברים על המפה בזמן אמת.
                      לחץ על סמן ספק כדי לראות פרטים ולהתקשר אליו.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="sla">
                    <AccordionTrigger>מה זה SLA ואיך לעקוב?</AccordionTrigger>
                    <AccordionContent>
                      SLA הוא זמן התגובה המובטח ללקוח. המערכת מסמנת קריאות שקרובות לחריגה מה-SLA.
                      ודא לטפל בקריאות אלו בעדיפות גבוהה.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vendor Guide */}
        <TabsContent value="vendor">
          <div className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-red-600" />
                  התחלת עבודה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold shrink-0">1</div>
                  <div>
                    <h4 className="font-medium">התחבר למערכת</h4>
                    <p className="text-sm text-[#6B778C]">השתמש בפרטים שקיבלת מהמוקד</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold shrink-0">2</div>
                  <div>
                    <h4 className="font-medium">סמן את עצמך כזמין</h4>
                    <p className="text-sm text-[#6B778C]">הפעל את מתג הזמינות בפרופיל שלך</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold shrink-0">3</div>
                  <div>
                    <h4 className="font-medium">אפשר שיתוף מיקום</h4>
                    <p className="text-sm text-[#6B778C]">המוקד יוכל לראות את מיקומך ולשבץ אותך לקריאות קרובות</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-red-600" />
                  קבלת וטיפול בקריאות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">שים לב</h4>
                      <p className="text-sm text-yellow-700">
                        כאשר מקבלים קריאה, יש לאשר אותה תוך 5 דקות. אחרת הקריאה תועבר לספק אחר.
                      </p>
                    </div>
                  </div>
                </div>
                
                <h4 className="font-medium">תהליך הטיפול:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    קבל התראה על קריאה חדשה
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    אשר את הקריאה ועדכן "יצאתי לדרך"
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    עדכן "הגעתי למקום" כשאתה מגיע
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    צלם תמונות לפני ואחרי הטיפול
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    קבל חתימת לקוח וסגור את הקריאה
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-red-600" />
                  שאלות נפוצות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="cancel">
                    <AccordionTrigger>מה עושים אם הלקוח מבטל?</AccordionTrigger>
                    <AccordionContent>
                      עדכן את סטטוס הקריאה ל"בוטל" והוסף הערה עם סיבת הביטול.
                      התקשר למוקד אם יש בעיה.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="problem">
                    <AccordionTrigger>מה אם אני לא יכול לטפל בתקלה?</AccordionTrigger>
                    <AccordionContent>
                      צור קשר מיידי עם המוקד. הם יסייעו למצוא פתרון או ישלחו ספק נוסף.
                      אל תעזוב את הלקוח לבד.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="payment">
                    <AccordionTrigger>איך מקבלים תשלום?</AccordionTrigger>
                    <AccordionContent>
                      התשלומים מעובדים אוטומטית בסוף כל חודש. 
                      ניתן לראות את הפירוט בדף "התחשבנות" בפורטל הספקים.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Contact */}
      <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
        <CardContent className="pt-6 text-center">
          <h3 className="text-lg font-semibold text-[#172B4D] mb-2">צריך עזרה נוספת?</h3>
          <p className="text-[#6B778C] mb-4">צוות התמיכה שלנו כאן בשבילך</p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" className="gap-2">
              <Phone className="w-4 h-4" />
              03-1234567
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 gap-2">
              <HelpCircle className="w-4 h-4" />
              פתח פנייה
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}