import { GoogleGenAI, Type } from "@google/genai";
import { SecurityControl, GenerationResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
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
};

export const generateSecurityControls = async (serviceName: string): Promise<SecurityControl[]> => {
  try {
    const prompt = `
      Act as a specialized Security Compliance Engine. Your ONLY function is to output security controls for Cloud Services.

      *** STRICT GUARDRAILS & INPUT VALIDATION ***
      Input: "${serviceName}"

      1. **Profanity/Abuse Check**: If the input contains ANY profanity, curse words, hate speech, or offensive language -> REJECT.
      2. **Relevance Check**: The input MUST be a specific Cloud Service (e.g., "AWS S3", "Azure VM", "GCP Cloud Run") or a standard IT infrastructure component (e.g., "PostgreSQL Database", "Kubernetes Cluster").
      3. **Scope Enforcement**: 
         - If the input is a general question (e.g., "Who is the president?", "What is 2+2?"). -> REJECT.
         - If the input asks to generate code, write poems, or anything outside of a security control list. -> REJECT.
         - If the input is ambiguous or nonsense. -> REJECT.

      IF REJECTED:
      Return a JSON object with strictly: { "error": "Request rejected: Input allowed only for valid Cloud/IT services. No profanity or general queries." }

      IF VALID:
      Generate a comprehensive list of security controls following these rules:

      STEP 1: IDENTIFY CLOUD PROVIDER
      Determine if the service belongs to AWS, Azure, or GCP. Apply the specific guidelines below.

      STEP 2: APPLY PROVIDER-SPECIFIC LOGIC

      --- IF AWS (Amazon Web Services) ---
      1. **Standards**: Map strictly to **CIS AWS Foundations Benchmark v3.0** and NIST SP 800-53 Rev 5.
      2. **Preferred Tools**: Prioritize AWS Security Hub, GuardDuty, AWS Config, CloudTrail, and Systems Manager.
      3. **Modernization**: 
         - Use **CloudWatch Agent** for OS-level logging (not legacy scripts).
         - Use **AWS KMS** with Key Policies for encryption management.
         - Use **IAM Roles** (not long-term access keys).

      --- IF AZURE (Microsoft Azure) ---
      1. **Standards**: Map strictly to **CIS Microsoft Azure Benchmark v3.0** and NIST SP 800-53 Rev 5.
      2. **Preferred Tools**: Prioritize Microsoft Defender for Cloud, Azure Policy, Azure Sentinel.
      3. **Modernization (CRITICAL)**: 
         - **Network**: Recommend **VNet Flow Logs** (Do NOT recommend NSG Flow Logs).
         - **Logging**: Recommend **Azure Monitor Agent (AMA)** (Do NOT recommend Legacy Log Analytics Agent/MMA).
         - **Identity**: Prioritize **Managed Identities** over Service Principals/Keys.

      --- IF GCP (Google Cloud Platform) ---
      1. **Standards**: Map strictly to **CIS Google Cloud Platform Foundation Benchmark v3.0** and NIST SP 800-53 Rev 5.
      2. **Preferred Tools**: Prioritize Security Command Center (SCC), Cloud Armor, VPC Service Controls, Organization Policy Service.
      3. **Modernization**:
         - Use **Workload Identity Federation** for external access.
         - Ensure **Uniform Bucket-Level Access** for Storage.

      STEP 3: GENERAL REQUIREMENTS
      1. **Mapping Specificity**: You MUST include specific version numbers/IDs in the mapping.
         - Format: "CIS [Provider] v[Version] [ID]; NIST Rev 5 [ID]"
         - Example: "CIS AWS v3.0 1.4; NIST Rev 5 AC-2(1)"
      2. **Classification**: Assign "Control Plane" or "Data Plane".
      3. **Mandatory Controls** (Include these for ALL services): 
         - **Naming**: "Organizational Naming Standards" (Control Plane).
         - **Tagging**: "Resource Tagging Strategy" (Control Plane).
         - **Monitoring**: "Security Monitoring and Alerting" (Control Plane). *Must use the provider's native monitoring stack identified above.*
      
      OUTPUT FORMAT:
      For each control, provide:
      1. Control ID (e.g., [CLOUD]-[SVC]-01).
      2. Control Name.
      3. Control Description (Technical implementation details).
      4. Mapping string.
      5. Plane classification.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    return parseResponse(response.text);

  } catch (error) {
    console.error("Error generating security controls:", error);
    throw error;
  }
};

export const regenerateControlsWithFeedback = async (
  serviceName: string, 
  currentControls: SecurityControl[], 
  feedback: string
): Promise<SecurityControl[]> => {
  try {
    const prompt = `
      Act as a Security Architect. You are updating a Security Controls document for "${serviceName}" based on peer review feedback.
      
      CURRENT CONTROLS:
      ${JSON.stringify(currentControls)}

      FEEDBACK / REVIEW COMMENTS:
      ${feedback}

      INSTRUCTIONS:
      1. Analyze the feedback. It might ask to add controls, remove controls, or modify descriptions.
      2. If the feedback is about a closed PR (e.g., "Closed because of duplication" or "Project cancelled"), treat it as a request to IMPROVE the document to avoid rejection next time, or just apply valid technical corrections mentioned.
      3. Apply the changes to the controls list.
      4. Ensure all controls still map to CIS/NIST and follow the original formatting rules.
      5. Return the FULL updated list of controls.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    return parseResponse(response.text);
  } catch (error) {
    console.error("Error regenerating controls:", error);
    throw error;
  }
};

export const generateTerraform = async (serviceName: string, controls: SecurityControl[]): Promise<string> => {
  try {
    const prompt = `
      Act as a Senior DevOps Engineer. Generate a production-ready Terraform configuration (HCL) for the following cloud service: "${serviceName}".

      CONTEXT:
      The following Security Controls MUST be implemented in the resource configuration where technically feasible:
      ${JSON.stringify(controls.map(c => ({ name: c.controlName, description: c.controlDescription })))}

      REQUIREMENTS:
      1. Use the official provider (AWS, Azure, or Google).
      2. Include necessary variables and outputs.
      3. Enable security features by default (e.g., encryption, logging, versioning) matching the controls list.
      4. Add comments in the code explaining which security control is being addressed (e.g. "// Implements [Control ID]: Control Name").
      5. Return ONLY the Terraform code. Do not include markdown formatting (like \`\`\`hcl).
      
      FORMAT:
      Provide raw HCL code.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });

    let code = response.text || "";
    // Clean up markdown if model adds it despite instructions
    code = code.replace(/^```hcl\s*/, '').replace(/^```terraform\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
    
    return code.trim();

  } catch (error) {
    console.error("Error generating terraform:", error);
    throw error;
  }
};

const parseResponse = (jsonStr: string | undefined): SecurityControl[] => {
    if (!jsonStr) {
      throw new Error("No data returned from Gemini.");
    }
    const parsedData = JSON.parse(jsonStr) as GenerationResponse;
    if (parsedData.error) throw new Error(parsedData.error);
    if (!parsedData.controls) throw new Error("Invalid response structure");
    return parsedData.controls;
};