import { type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
    const anthropic = new Anthropic();
    const messages = await req.json();
    
    const transformedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content[0].text
    }));

    try {
        const stream = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 8192,
            temperature: 0,
            system: "You are a helpful assistant. Respond concisely.",
            messages: transformedMessages,
            stream: true
        });

        const encoder = new TextEncoder();
        const customStream = new ReadableStream({
            async start(controller) {
                for await (const part of stream) {
                    if (part.type === 'content_block_delta' && part.delta?.text) {
                        controller.enqueue(encoder.encode(part.delta.text));
                    }
                }
                controller.close();
            },
        });

        return new Response(customStream);
    } catch (error) {
        console.error('Claude API Error:', error);
        return Response.json({ error: "Failed to get response from Claude" }, { status: 500 });
    }
}
