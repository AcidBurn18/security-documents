import { GoogleGenAI, Type } from "@google/genai";
import { SecurityControl } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSecurityControls = async (serviceName: string): Promise<SecurityControl[]> => {
  try {
    const prompt = `
      Act as a Senior Cloud Security Compliance Architect with deep knowledge of AWS, Azure, and Google Cloud Platform (GCP).
      Generate a comprehensive list of Security Controls for the service: "${serviceName}".
      
      Step 1: Identify the Cloud Provider (AWS, Azure, GCP, or others) based on the service name. If ambiguous, assume the most common cloud usage or list general cloud-native controls.

      CRITICAL - DEPRECATION & MODERNIZATION CHECK:
      1. **Avoid Deprecated Features**: Do NOT recommend features that are deprecated.
         - Example (Azure): Use VNet Flow Logs instead of NSG Flow Logs. Use AMA instead of Legacy Agents.
         - Example (AWS): Use CloudWatch Agent instead of legacy scripts.
      2. **Latest Standards**: Ensure configurations reflect the current Well-Architected Framework for the specific cloud.

      Requirements:
      1. **Standards**: Map to the **latest relevant CIS Benchmark** (e.g., CIS AWS Foundations, CIS Azure Benchmark, CIS GCP Foundations) and **NIST SP 800-53 Rev 5**.
      2. **Classification**: Classify each control as either "**Control Plane**" (Management, Configuration, API/ARM/IAM level) or "**Data Plane**" (Data access, encryption, content level).
      3. **Mandatory Controls**: 
         - **Naming Standards**: "Organizational Naming Standards" (Control Plane).
         - **Tagging**: "Resource Tagging Strategy" (Control Plane).
         - **Monitoring**: "Security Monitoring and Alerting" (Control Plane). You MUST detail the native monitoring and alerting configurations (e.g., **Azure Monitor/Sentinel** for Azure, **CloudWatch/Security Hub** for AWS, **Cloud Logging/SCC** for GCP).
      
      For each control, provide:
      1. A unique Control ID (e.g., [CLOUD]-[SVC]-01).
      2. A concise Control Name.
      3. A detailed Control Description (Specify modern implementation).
      4. Mapping string (e.g., "CIS AWS v3.0 1.4; NIST Rev5 AC-2").
      5. The Plane classification.
      
      Focus on Identity, Networking, Data Protection, Logging, and Configuration Management.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              controlId: {
                type: Type.STRING,
                description: "Unique identifier for the control"
              },
              controlName: {
                type: Type.STRING,
                description: "Short name of the security control"
              },
              controlDescription: {
                type: Type.STRING,
                description: "Detailed description of the control implementation using latest cloud-native features"
              },
              mapping: {
                type: Type.STRING,
                description: "References to relevant CIS Benchmarks and NIST SP 800-53 Rev 5"
              },
              plane: {
                type: Type.STRING,
                enum: ["Control Plane", "Data Plane"],
                description: "The scope of the control (Management vs Data)"
              }
            },
            required: ["controlId", "controlName", "controlDescription", "mapping", "plane"]
          }
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) {
      throw new Error("No data returned from Gemini.");
    }

    return JSON.parse(jsonStr) as SecurityControl[];

  } catch (error) {
    console.error("Error generating security controls:", error);
    throw error;
  }
};