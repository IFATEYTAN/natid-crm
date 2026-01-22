import { AlertCircle } from "lucide-react";

export function ErrorMessage({ error, title = "שגיאה בטעינת הנתונים" }) {
  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
      <div className="flex">
        <div className="py-1">
          <AlertCircle className="h-6 w-6 text-red-500 mr-4" />
        </div>
        <div>
          <p className="font-bold">{title}</p>
          <p className="text-sm">{error?.message || "אירעה שגיאה לא צפויה. נסה שוב מאוחר יותר."}</p>
        </div>
      </div>
    </div>
  );
}

export default ErrorMessage;