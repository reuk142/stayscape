import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="container empty-state top-space" role="alert"><h1>Something went wrong</h1><p>Reload the page to try again.</p><button className="btn btn-accent" onClick={() => window.location.reload()}>Reload StayScape</button></main>;
    return this.props.children;
  }
}
