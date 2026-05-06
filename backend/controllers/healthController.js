// Health check controller
export const healthCheck = (req, res) => {
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    aiProvider: 'Groq (Llama 4 Scout 17Bx16E)',
    appUrl
  });
}; 