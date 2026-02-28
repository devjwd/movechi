import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    // Error boundary caught an error
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", textAlign: "center", color: '#fff' }}>
          <h2>Something went wrong.</h2>
          <p>Please refresh the page or try again later.</p>
          {this.state.error && (
            <details style={{ marginTop: '1rem', textAlign: 'left', maxWidth: '800px', margin: '1rem auto' }}>
              <summary style={{ cursor: 'pointer', color: '#ff6b6b' }}>Show Error Details</summary>
              <pre style={{ background: '#1a1a1a', padding: '1rem', borderRadius: '4px', overflow: 'auto', marginTop: '0.5rem' }}>
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
