import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#1B2B3A', color: '#fff', minHeight: '100vh' }}>
          <h1 style={{ color: '#C4A265', marginBottom: 16 }}>Erro ao carregar Viva Beiramar</h1>
          <pre style={{ color: '#ff6b6b', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 14 }}>
            {this.state.error.toString()}
          </pre>
          <pre style={{ color: '#aaa', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12, marginTop: 16 }}>
            {this.state.error.stack}
          </pre>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: 24, padding: '12px 24px', background: '#C4A265', color: '#1B2B3A', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>
            Limpar cache e recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
