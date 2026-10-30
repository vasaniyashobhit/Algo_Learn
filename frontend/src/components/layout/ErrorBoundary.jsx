import { Component } from 'react';
import { CrashScreen } from './CrashScreen.jsx';

/** React needs a class for error boundaries; this one only stores the error and shows CrashScreen. */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('AlgoLearn render error', error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) return <CrashScreen error={this.state.error} onReset={this.reset} />;
    return this.props.children;
  }
}
