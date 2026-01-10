
import { GoogleGenAI, Type } from "@google/genai";
import { ContentType } from "./types";

// Always use named parameter for apiKey
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateInitialContextQuestions = async (prompt: string, type: ContentType) => {
  // Use gemini-3-flash-preview for basic text tasks like question generation
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
  context: any,
  imageRef?: string // Nueva opción para referencia visual
) => {
  if (type === ContentType.IMAGEN) {
    // gemini-2.5-flash-image is correct for general image generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{
          text: `Marketing content generation. Type: Image. Prompt: ${prompt}. Objective: ${context.objective}. Audience: ${context.audience}. Tone: ${context.tone}. Style: ${context.style}. Restrictions: No sensitive or explicit content. Professional advertising quality.`
        }]
      },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    // Iterate through parts to find the image data
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } else {
    // Generación de Texto con soporte Multimodal
    const parts: any[] = [
      {
        text: `Actúa como un Editor de Contenido Publicitario. Genera un texto basado en:
        Prompt: ${prompt}
        Objetivo: ${context.objective}
        Público: ${context.audience}
        Tono: ${context.tone}
        Estilo: ${context.style}
        Restricciones: ${context.restrictions}
        ${imageRef ? "Se ha adjuntado una imagen de referencia. Analízala y asegúrate de que el texto sea coherente con lo que se ve en la imagen." : ""}
        
        Asegúrate de que sea profesional, creativo y cumpla con las normas de privacidad.`
      }
    ];

    if (imageRef && imageRef.startsWith('data:')) {
      const base64Data = imageRef.split(',')[1];
      const mimeType = imageRef.split(';')[0].split(':')[1];
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/png',
          data: base64Data
        }
      });
    }

    // Use gemini-3-pro-preview for complex reasoning/text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
    });
    return response.text;
  }
};
