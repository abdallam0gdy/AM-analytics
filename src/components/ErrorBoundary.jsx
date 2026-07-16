import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-surface-light dark:bg-surface-dark border border-outline-variant/30 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-error-container/20 dark:bg-error-container/10 flex items-center justify-center text-error animate-pulse">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
                عذراً، حدث خطأ غير متوقع
              </h2>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                واجه التطبيق مشكلة في تحميل هذه الصفحة. يمكنك محاولة إعادة التحميل.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3 text-left font-mono text-[10px] text-red-500/80 overflow-auto max-h-32 text-xs">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-all duration-300 shadow-md cursor-pointer"
            >
              <RotateCcw size={16} />
              <span>إعادة تحميل التطبيق</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
