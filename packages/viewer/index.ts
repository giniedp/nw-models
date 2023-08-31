import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './index.css';
import App from './src/App.svelte';
const app = new App({
  target: document.getElementById('app') as any,
})
export default app
