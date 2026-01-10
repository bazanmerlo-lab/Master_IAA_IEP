
import { GoogleGenAI, Type } from "@google/genai";
import { ContentType } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateInitialContextQuestions = async (prompt: string, type: ContentType) => {
  const model = 'gemini-3-flash-preview';
  const response = await ai.models.generateContent({
    model,
    contents: `Actúa como un Diseñador de Soluciones Digitales. El usuario quiere crear un contenido de tipo ${type} con el siguiente prompt: "${prompt}". 
    Para garantizar un resultado profesional y ético en Marketing, genera 4 preguntas breves para obtener contexto sobre: Objetivo, Público, Tono/Estilo y Restricciones.
    Responde solo con las preguntas en un formato de lista amigable.`,
  });
  return response.text;
};

export const generateFinalContent = async (
  prompt: string, 
  type: ContentType, 
  context: any
) => {
  if (type === ContentType.IMAGEN) {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{
          text: `Marketing content generation. Type: Image. Prompt: ${prompt}. Objective: ${context.objective}. Audience: ${context.audience}. Tone: ${context.tone}. Style: ${context.style}. Restrictions: No sensitive or explicit content. Avoid bias. Professional advertising quality.`
        }]
      },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } else {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Actúa como un Editor de Contenido Publicitario. Genera un texto basado en:
      Prompt: ${prompt}
      Objetivo: ${context.objective}
      Público: ${context.audience}
      Tono: ${context.tone}
      Estilo: ${context.style}
      Restricciones: ${context.restrictions}
      
      Asegúrate de que sea profesional, creativo y cumpla con las normas de privacidad y derechos de autor.`,
    });
    return response.text;
  }
};
