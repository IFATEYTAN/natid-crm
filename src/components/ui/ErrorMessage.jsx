import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ErrorMessage({ error, title = "שגיאה" }) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {error?.message || "אירעה שגיאה בטעינת הנתונים"}
      </AlertDescription>
    </Alert>
  );
}