import { GoogleGenAI, Type } from "@google/genai";
import { PaperAnalysis } from "../types";

function getAiClient(apiKey: string) {
  const trimmedApiKey = apiKey.trim();

  if (!trimmedApiKey) {
    throw new Error("A Gemini API key is required.");
  }

  return new GoogleGenAI({ apiKey: trimmedApiKey });
}

export async function analyzePaper(apiKey: string, fileBase64: string, mimeType: string): Promise<Omit<PaperAnalysis, 'id'>> {
  const ai = getAiClient(apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        inlineData: {
          data: fileBase64,
          mimeType: mimeType,
        }
      },
      "You are an expert academic researcher. Analyze this research paper. Extract the title, authors, publication year, journal/conference name, a concise summary of the whole study, unique findings, research gaps mentioned, and future directions suggested."
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Title of the paper" },
          authors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of authors" },
          year: { type: Type.STRING, description: "Publication year" },
          journal: { type: Type.STRING, description: "Name of the journal or conference" },
          summary: { type: Type.STRING, description: "Concise summary of the study" },
          uniqueFindings: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Unique findings of the paper" },
          gaps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Research gaps mentioned in the paper" },
          futureDirections: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Future research directions suggested" },
          tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 relevant topic tags or keywords for the paper" },
        },
        required: ["title", "authors", "year", "journal", "summary", "uniqueFindings", "gaps", "futureDirections", "tags"]
      }
    }
  });

  if (!response.text) {
    throw new Error("Failed to generate analysis");
  }

  return JSON.parse(response.text);
}

export async function synthesizeDomain(apiKey: string, papers: PaperAnalysis[]): Promise<string> {
  const prompt = `
    As an expert academic researcher, synthesize the following research papers into a cohesive domain overview.
    Focus on the evolution of findings, common gaps, and the trajectory of future research.

    Papers Data:
    ${JSON.stringify(papers, null, 2)}

    Provide a well-structured markdown response with the following sections:
    ## Overall Domain Summary
    ## Key Themes & Unique Findings
    ## Persistent Research Gaps
    ## Future Trajectory
  `;

  const ai = getAiClient(apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
  });

  return response.text || "Synthesis failed.";
}

export async function chatWithLibrary(apiKey: string, papers: PaperAnalysis[], question: string): Promise<string> {
  const prompt = `
    You are an expert academic research assistant. Use the provided research papers to answer the user's question.
    If the answer is not in the papers, say so. Cite the papers (e.g., [Author, Year]) when making claims.

    Papers Data:
    ${JSON.stringify(papers, null, 2)}

    User Question:
    ${question}
  `;

  const ai = getAiClient(apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
  });

  return response.text || "Failed to generate answer.";
}
