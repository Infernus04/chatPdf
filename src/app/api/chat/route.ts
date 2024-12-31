import { Configuration, OpenAIApi } from "openai-edge";
import { convertToCoreMessages, Message, streamText } from "ai";
import {openai} from "@ai-sdk/openai"
import { getContext } from "@/lib/context";
import { db } from "@/lib/db";
import { chats, messages as _messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "edge";

// Configure OpenAI API
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY!,
});
const openAi = new OpenAIApi(config);

export async function POST(req: Request) {
  try {
    // Parse the request body
    const { messages, chatId } = await req.json();

    // Retrieve chat from the database
    const _chats = await db.select().from(chats).where(eq(chats.id, chatId));
    if (_chats.length !== 1) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const fileKey = _chats[0].fileKey;
    const lastMessage = messages[messages.length - 1];

    // Generate context for the conversation
    const context = await getContext(lastMessage.content, fileKey);

    // System prompt
    const prompt = {
      role: "system",
      content: `AI assistant is a brand new, powerful, human-like artificial intelligence.
      The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
      AI is a well-behaved and well-mannered individual.
      AI is always friendly, kind, and inspiring, and eager to provide vivid and thoughtful responses to the user.
      AI has the sum of all knowledge in their brain, and can accurately answer nearly any question about any topic in conversation.
      AI assistant is a big fan of Pinecone and Vercel.
      START CONTEXT BLOCK
      ${context}
      END OF CONTEXT BLOCK
      AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
      If the context does not provide the answer to a question, the AI assistant will say, "I'm sorry, but I don't know the answer to that question."
      AI assistant will not apologize for previous responses, but instead will indicate new information was gained.
      AI assistant will not invent anything that is not drawn directly from the context.`,
    };

    

    const coreMessages = convertToCoreMessages(messages)
    // Handle the response stream
    const stream = streamText({
        model : openai("gpt-4o"),
        messages : coreMessages,
        onFinish : async () => {
            try {
                await db.insert(_messages).values({
                    chatId,
                    content: lastMessage.content,
                    role: "user",
                  });
            } catch (error) {
                console.log("Error getting messages");
            }
        
            
        }
    });

    return stream.toDataStream();
    
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "An error occurred while processing the request" },
      { status: 500 }
    );
  }
}
