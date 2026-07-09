import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AdminExtractedQuestion } from "@/lib/admin-assessment-types";

const extractedQuestionSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["MCQ", "WRITTEN", "PRACTICAL"] },
          question: { type: "string" },
          marks: { type: "integer" },
          options: { type: "array", items: { type: "string" } },
          correctAnswer: { type: ["string", "null"] },
          rubric: { type: ["string", "null"] },
          difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD"] },
        },
        required: [
          "type",
          "question",
          "marks",
          "options",
          "correctAnswer",
          "rubric",
          "difficulty",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  const isPdf = file.type === "application/pdf";
  const isImage = file.type.startsWith("image/");
  if (!isPdf && !isImage) {
    return NextResponse.json(
      { error: "Only PDF or image files are supported." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      output_config: {
        format: { type: "json_schema", schema: extractedQuestionSchema },
      },
      messages: [
        {
          role: "user",
          content: [
            isPdf
              ? {
                  type: "document",
                  source: { type: "base64", media_type: "application/pdf", data: base64 },
                }
              : {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: file.type as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
                    data: base64,
                  },
                },
            {
              type: "text",
              text: "Extract every question from this question paper. For each question, determine its type (MCQ, WRITTEN, or PRACTICAL), the question text, marks (default 5 if not stated), MCQ options if present, the correct answer if determinable (the option text for MCQ, or a model answer/rubric summary for written/practical), a grading rubric if applicable, and a difficulty estimate (EASY, MEDIUM, or HARD).",
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No structured output returned.");
    }

    const parsed = JSON.parse(textBlock.text) as { questions: AdminExtractedQuestion[] };
    return NextResponse.json({ questions: parsed.questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
