import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  async componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // תיעוד השגיאה ביומן פעולות
    try {
      await base44.functions.invoke('logAuditAction', {
        action: 'error',
        entity_type: 'System',
        entity_name: 'React Error Boundary',
        details: `${error.toString()}\nComponent Stack: ${errorInfo.componentStack?.substring(0, 500)}`,
        severity: 'critical'
      });
    } catch (logError) {
      console.error('Failed to log error to audit:', logError);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50" dir="rtl">
          <div className="max-w-md text-center p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              משהו השתבש
            </h1>
            <p className="text-gray-600 mb-6">
              אירעה שגיאה בלתי צפויה. ניתן לנסות לטעון מחדש את הדף.
            </p>
            {this.state.error && (
              <pre className="text-xs text-red-600 bg-red-50 p-3 rounded-lg mb-4 text-left overflow-auto max-h-32" dir="ltr">
                {this.state.error.toString()}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={this.handleReset}>
                נסה שוב
              </Button>
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                טען מחדש
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;