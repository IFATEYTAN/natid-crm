import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';

/**
 * Card Component Stories
 *
 * The Card component is a container for related content.
 * It provides structure with header, content, and footer sections.
 */
export default {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A flexible container component for grouping related content with optional header, content, and footer sections.',
      },
    },
  },
};

// Basic card
export const Basic = {
  render: () => (
    <Card className="w-[350px]" dir="rtl">
      <CardHeader>
        <CardTitle>כותרת הכרטיס</CardTitle>
        <CardDescription>תיאור קצר של תוכן הכרטיס</CardDescription>
      </CardHeader>
      <CardContent>
        <p>זהו תוכן הכרטיס. ניתן להציב כאן כל תוכן שתרצה.</p>
      </CardContent>
    </Card>
  ),
};

// Card with footer
export const WithFooter = {
  render: () => (
    <Card className="w-[350px]" dir="rtl">
      <CardHeader>
        <CardTitle>פרטי קריאה</CardTitle>
        <CardDescription>קריאה מספר #12345</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p>
            <strong>לקוח:</strong> ישראל ישראלי
          </p>
          <p>
            <strong>כתובת:</strong> תל אביב, רחוב הרצל 1
          </p>
          <p>
            <strong>סטטוס:</strong> ממתין לטיפול
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline">ביטול</Button>
        <Button variant="brand">שבץ ספק</Button>
      </CardFooter>
    </Card>
  ),
};

// Stats card
export const StatsCard = {
  render: () => (
    <Card className="w-[200px]" dir="rtl">
      <CardHeader className="pb-2">
        <CardDescription>קריאות פתוחות</CardDescription>
        <CardTitle className="text-4xl">127</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">+20% מהשבוע שעבר</p>
      </CardContent>
    </Card>
  ),
};

// Card grid example
export const CardGrid = {
  render: () => (
    <div className="grid grid-cols-3 gap-4" dir="rtl">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>קריאות היום</CardDescription>
          <CardTitle className="text-3xl">45</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>ספקים פעילים</CardDescription>
          <CardTitle className="text-3xl">12</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>זמן תגובה ממוצע</CardDescription>
          <CardTitle className="text-3xl">18 דק׳</CardTitle>
        </CardHeader>
      </Card>
    </div>
  ),
};

// Form card example
export const FormCard = {
  render: () => (
    <Card className="w-[400px]" dir="rtl">
      <CardHeader>
        <CardTitle>הוסף לקוח חדש</CardTitle>
        <CardDescription>מלא את הפרטים להוספת לקוח למערכת</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">שם מלא</label>
          <input className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="הזן שם מלא" />
        </div>
        <div>
          <label className="text-sm font-medium">טלפון</label>
          <input className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="050-0000000" />
        </div>
        <div>
          <label className="text-sm font-medium">אימייל</label>
          <input
            className="w-full mt-1 px-3 py-2 border rounded-md"
            placeholder="email@example.com"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline">ביטול</Button>
        <Button>שמור</Button>
      </CardFooter>
    </Card>
  ),
};
