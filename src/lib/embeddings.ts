import { OpenAIApi, Configuration } from "openai-edge";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(config);

export async function getEmbeddings(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Input text cannot be empty or whitespace.");
  }

  try {
    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: text.replace(/\n/g, " "),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();

    if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
      throw new Error("Unexpected response structure from OpenAI API.");
    }

    return result.data[0].embedding as number[];
  } catch (error: any) {
    console.error("Error calling OpenAI embeddings API:", error.message || error);
    throw new Error("Failed to generate embeddings. See logs for details.");
  }
}
