import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Setup Gemini API client on server-side
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Invoice analysis endpoint - Optimized for high speed
app.post('/api/analyze-invoice', async (req, res) => {
  try {
    const { imageBase64, mimeType, fileName } = req.body;

    if (!imageBase64 && !fileName) {
      return res.status(400).json({ error: 'Nenhum documento ou ficheiro fornecido' });
    }

    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (ai && imageBase64) {
      try {
        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
        const targetMimeType = mimeType?.includes('pdf') ? 'application/pdf' : (mimeType || 'image/jpeg');

        const prompt = `Analisa esta fatura de fornecedor em Portugal para empresa de construção.
Extrai em JSON rigoroso:
1. supplier: name, nif (9 digitos), address, phone, email
2. invoice: number, date (AAAA-MM-DD), dueDate (AAAA-MM-DD), subtotal, vatAmount, vatRate (ex: 23), total
3. items: array [name, description, quantity, unit, unitPrice, discount, vatRate, total, category]
Devolve exclusivamente o JSON estruturado.`;

        // Fast generation with MINIMAL thinking to ensure near-instant extraction
        const generatePromise = ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: targetMimeType,
                  data: cleanBase64,
                },
              },
              { text: prompt },
            ],
          },
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                supplier: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    nif: { type: Type.STRING },
                    address: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    email: { type: Type.STRING },
                  },
                  required: ['name'],
                },
                invoice: {
                  type: Type.OBJECT,
                  properties: {
                    number: { type: Type.STRING },
                    date: { type: Type.STRING },
                    dueDate: { type: Type.STRING },
                    subtotal: { type: Type.NUMBER },
                    vatAmount: { type: Type.NUMBER },
                    vatRate: { type: Type.NUMBER },
                    total: { type: Type.NUMBER },
                  },
                  required: ['number', 'date', 'subtotal', 'total'],
                },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      quantity: { type: Type.NUMBER },
                      unit: { type: Type.STRING },
                      unitPrice: { type: Type.NUMBER },
                      discount: { type: Type.NUMBER },
                      vatRate: { type: Type.NUMBER },
                      total: { type: Type.NUMBER },
                      category: { type: Type.STRING },
                    },
                    required: ['name', 'quantity', 'unitPrice', 'total'],
                  },
                },
              },
              required: ['supplier', 'invoice', 'items'],
            },
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de análise de 6.5s excedido')), 6500)
        );

        const response: any = await Promise.race([generatePromise, timeoutPromise]);

        if (response && response.text) {
          const parsed = JSON.parse(response.text);
          return res.json({ success: true, data: parsed, engine: 'gemini-flash' });
        }
      } catch (geminiError: any) {
        console.warn('Análise Gemini falhou ou excedeu tempo, a abrir campos para preenchimento:', geminiError?.message || geminiError);
      }
    }

    // Clean blank template with zero dummy data
    return res.json({
      success: true,
      data: {
        supplier: {
          name: '',
          nif: '',
          address: '',
          phone: '',
          email: '',
        },
        invoice: {
          number: '',
          date: today,
          dueDate: dueDate,
          subtotal: 0,
          vatAmount: 0,
          vatRate: 23,
          total: 0,
        },
        items: [
          {
            name: '',
            description: '',
            quantity: 1,
            unit: 'un',
            unitPrice: 0,
            discount: 0,
            vatRate: 23,
            total: 0,
            category: 'Geral',
          },
        ],
      },
      engine: 'manual',
    });
  } catch (err: any) {
    console.error('Erro na análise de fatura:', err);
    return res.status(500).json({ error: 'Erro ao processar fatura: ' + err.message });
  }
});

// Configure Vite or Static Serve
async function setupVite() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Obragest a correr na porta ${PORT} [http://localhost:${PORT}]`);
  });
}

setupVite().catch((err) => {
  console.error('Falha ao iniciar servidor:', err);
  process.exit(1);
});
