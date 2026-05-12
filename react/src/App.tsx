import React from 'react';
import { HashRouter, Routes, Route } from "react-router-dom";
import { Toaster } from 'sonner';
import WeddingGenerator from "./pages/WeddingGenerator";
import WeddingPreview from "./pages/WeddingPreview";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) {
    console.log('ErrorBoundary caught:', error);
  }
  render() {
    return this.state.hasError
      ? <div className="p-8 text-center text-muted-foreground">页面出现问题，请刷新重试</div>
      : this.props.children;
  }
}

const App = () => (
  <HashRouter>
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<WeddingGenerator />} />
        <Route path="/preview" element={<WeddingPreview />} />
      </Routes>
    </ErrorBoundary>
    <Toaster position="top-right" />
  </HashRouter>
);

export default App;