import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  chatMessageBody,
  parseJsonBody,
  readRequestBytes,
  recordingChunkQuery,
  recordingFinalizeBody,
} from "./live-validation";

const validClientMessageId = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("chatMessageBody", () => {
  it("accepts a normal trimmed message", () => {
    const result = chatMessageBody.parse({
      message: "  hello everyone  ",
      clientMessageId: validClientMessageId,
    });
    expect(result.message).toBe("hello everyone");
  });

  it("rejects empty/whitespace-only messages", () => {
    expect(() =>
      chatMessageBody.parse({ message: "   ", clientMessageId: validClientMessageId }),
    ).toThrow();
  });

  it("rejects messages over 1000 characters", () => {
    const long = "a".repeat(1001);
    expect(() =>
      chatMessageBody.parse({ message: long, clientMessageId: validClientMessageId }),
    ).toThrow();
  });

  it("accepts a message right at the 1000-character boundary", () => {
    const exact = "a".repeat(1000);
    expect(() =>
      chatMessageBody.parse({ message: exact, clientMessageId: validClientMessageId }),
    ).not.toThrow();
  });

  it("rejects disallowed control characters", () => {
    expect(() =>
      chatMessageBody.parse({
        message: "hello\x07world",
        clientMessageId: validClientMessageId,
      }),
    ).toThrow();
  });

  it("allows newlines and tabs", () => {
    expect(() =>
      chatMessageBody.parse({
        message: "line one\nline two\tindented",
        clientMessageId: validClientMessageId,
      }),
    ).not.toThrow();
  });

  it("rejects an oversized encoded UTF-8 payload even under the char-count cap", () => {
    // Each of these emoji encodes to 4 bytes in UTF-8; 1000 of them is well
    // under 1000 chars (counted as surrogate pairs -> 2000 UTF-16 code units,
    // still <1000 grapheme/codepoint iterations) but over the 8KB byte cap.
    const heavy = "🎉".repeat(1000);
    expect(() =>
      chatMessageBody.parse({ message: heavy, clientMessageId: validClientMessageId }),
    ).toThrow();
  });

  it("requires clientMessageId to be a valid UUID", () => {
    expect(() =>
      chatMessageBody.parse({ message: "hi", clientMessageId: "not-a-uuid" }),
    ).toThrow();
  });

  it("accepts an optional toUserId", () => {
    const result = chatMessageBody.parse({
      message: "hi",
      clientMessageId: validClientMessageId,
      toUserId: "cljabc123",
    });
    expect(result.toUserId).toBe("cljabc123");
  });
});

describe("recordingChunkQuery", () => {
  it("coerces seq from a string query param", () => {
    const result = recordingChunkQuery.parse({
      seq: "3",
      recordingAttemptId: validClientMessageId,
    });
    expect(result.seq).toBe(3);
  });

  it("rejects negative seq", () => {
    expect(() =>
      recordingChunkQuery.parse({ seq: "-1", recordingAttemptId: validClientMessageId }),
    ).toThrow();
  });

  it("rejects non-integer seq", () => {
    expect(() =>
      recordingChunkQuery.parse({ seq: "1.5", recordingAttemptId: validClientMessageId }),
    ).toThrow();
  });
});

describe("recordingFinalizeBody", () => {
  it("requires the active recording attempt id", () => {
    expect(
      recordingFinalizeBody.parse({
        failed: false,
        recordingAttemptId: validClientMessageId,
      }).recordingAttemptId,
    ).toBe(validClientMessageId);
    expect(() => recordingFinalizeBody.parse({ failed: false })).toThrow();
  });
});

describe("parseJsonBody", () => {
  const schema = z.object({ message: z.string() });

  it("parses a valid JSON body with the correct content-type", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hi" }),
    });
    const result = await parseJsonBody(request, schema);
    expect(result.message).toBe("hi");
  });

  it("rejects a non-JSON content-type", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ message: "hi" }),
    });
    await expect(parseJsonBody(request, schema)).rejects.toThrow();
  });

  it("rejects a body whose declared Content-Length exceeds maxBytes before reading it", async () => {
    const oversized = "x".repeat(100);
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(oversized.length),
      },
      body: JSON.stringify({ message: oversized }),
    });
    await expect(parseJsonBody(request, schema, 10)).rejects.toThrow();
  });

  it("rejects malformed JSON", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not valid json",
    });
    await expect(parseJsonBody(request, schema)).rejects.toThrow();
  });

  it("rejects a body that fails schema validation", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: 123 }),
    });
    await expect(parseJsonBody(request, schema)).rejects.toThrow();
  });

  it("stops a streamed body as soon as it crosses the hard byte limit", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(6));
          controller.enqueue(new Uint8Array(6));
          controller.close();
        },
      }),
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    await expect(readRequestBytes(request, 10)).rejects.toThrow();
  });
});
