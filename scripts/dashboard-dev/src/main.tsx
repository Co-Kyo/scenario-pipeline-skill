import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * React entry point.
 *
 * Reads window.__PIPELINE_DATA__ (injected by the build script or null in dev mode)
 * and passes it to the App component. If the data is null (empty/skeleton state),
 * App will render EmptyState components for all views.
 */
const pipelineData = (window as unknown as { __PIPELINE_DATA__: unknown }).__PIPELINE_DATA__;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App data={pipelineData} />
  </React.StrictMode>,
);
