import { GoogleGenAI, Type } from "@google/genai";
import { SecurityControl, GenerationResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSecurityControls = async (serviceName: string): Promise<SecurityControl[]> => {
  try {
    const prompt = `
      Act as a Senior Cloud Security Compliance Architect.
      
      GUARDRAILS & SAFETY CHECK:
      1. Analyze the input: "${serviceName}".
      2. If the input contains profanity, hate speech, or is NOT related to Cloud Infrastructure, IT Services, or Software Development, you MUST reject it.
      3. Return a JSON object with a single property "error": "Request rejected: Input violates usage policy. Only cloud/IT services are permitted." if it fails the check.
      
      If the input is valid, generate a Security Controls list.

      Step 1: Identify the Cloud Provider (AWS, Azure, GCP).

      CRITICAL - DEPRECATION & MODERNIZATION:
      1. **Avoid Deprecated Features**: 
         - Azure: Recommend VNet Flow Logs (not NSG Flow Logs), AMA (not Legacy Agents).
         - AWS: Recommend CloudWatch Agent.
      2. **Latest Standards**: Ensure configurations align with the current Well-Architected Framework.

      Requirements:
      1. **Mapping Specificity**: You MUST include specific version numbers in the mapping.
         - Format: "CIS [Provider] Benchmark v[X.Y] [Control_ID]; NIST SP 800-53 Rev 5 [Control_ID]"
         - Example: "CIS Azure v3.0 5.2; NIST Rev 5 AC-2(1)"
      2. **Classification**: "Control Plane" or "Data Plane".
      3. **Mandatory Controls**: 
         - **Naming Standards**: "Organizational Naming Standards" (Control Plane).
         - **Tagging**: "Resource Tagging Strategy" (Control Plane).
         - **Monitoring**: "Security Monitoring and Alerting" (Control Plane). Detail native tools (Sentinel/Azure Monitor, CloudWatch/Security Hub, SCC).
      
      For each control, provide:
      1. A unique Control ID (e.g., [CLOUD]-[SVC]-01).
      2. A concise Control Name.
      3. A detailed Control Description.
      4. Mapping string.
      5. The Plane classification.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT, // Changed to OBJECT to handle potential error field or array
          properties: {
            error: {
              type: Type.STRING,
              description: "Error message if guardrails are violated"
            },
            controls: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  controlId: { type: Type.STRING },
                  controlName: { type: Type.STRING },
                  controlDescription: { type: Type.STRING },
                  mapping: { type: Type.STRING },
                  plane: { 
                    type: Type.STRING,
                    enum: ["Control Plane", "Data Plane"]
                  }
                },
                required: ["controlId", "controlName", "controlDescription", "mapping", "plane"]
              }
            }
          }
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) {
      throw new Error("No data returned from Gemini.");
    }

    const parsedData = JSON.parse(jsonStr) as GenerationResponse;

    if (parsedData.error) {
      throw new Error(parsedData.error);
    }

    if (!parsedData.controls) {
        throw new Error("Invalid response structure");
    }

    return parsedData.controls;

  } catch (error) {
    console.error("Error generating security controls:", error);
    throw error;
  }
};