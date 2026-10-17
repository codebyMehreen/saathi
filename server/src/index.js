import { createApp } from './app.js';
import { addLog } from './store.js';
import { geminiConfigured } from './agent.js';

const port = Number(process.env.PORT) || 3001;

createApp().listen(port, () => {
  const mode = geminiConfigured() ? `Gemini (${process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'})` : 'demo mode (no GEMINI_API_KEY)';
  addLog('system', 'Saathi started', `Reading bills with ${mode}.`);
  console.log(`Saathi server on http://localhost:${port} — ${mode}`);
});
