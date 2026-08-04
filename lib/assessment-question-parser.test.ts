import { describe, expect, it } from "vitest";
import { parseQuestionsFromText } from "./assessment-question-parser";

describe("written question parsing", () => {
  it("keeps a passage-only written question without forced sub-questions", () => {
    const [question] = parseQuestionsFromText(`Question 1
Explain the passage in your own words.
Marks: 10
Time: 15`);

    expect(question.type).toBe("WRITTEN");
    expect(question.question).toBe("Explain the passage in your own words.");
    expect(question.marks).toBe(10);
    expect(question.cqParts).toBeUndefined();
  });

  it("parses any number of Bengali sub-questions", () => {
    const [question] = parseQuestionsFromText(`সৃজনশীল প্রশ্ন ১: একটি উদ্দীপক
ক. প্রথম প্রশ্ন [1 marks]
খ. দ্বিতীয় প্রশ্ন [2 marks]
গ. তৃতীয় প্রশ্ন [3 marks]`);

    expect(question.cqParts).toHaveLength(3);
    expect(question.cqParts?.map((part) => part.marks)).toEqual([1, 2, 3]);
    expect(question.marks).toBe(6);
  });

  it("parses variable English sub-questions without treating MCQ options as CQ", () => {
    const [written] = parseQuestionsFromText(`Creative Question 1
A sales scenario passage.
A. Identify the bias [2 marks]
B. Explain its effect [3 marks]
C. Recommend a response [5 marks]`);
    const [mcq] = parseQuestionsFromText(`Question 1
Which answer is correct?
A. First
B. Second
C. Third
D. Fourth
Answer: B
Marks: 5`);

    expect(written.type).toBe("WRITTEN");
    expect(written.cqParts).toHaveLength(3);
    expect(mcq.type).toBe("MCQ");
    expect(mcq.cqParts).toBeUndefined();
  });

  it("accepts structured JSON with variable CQ parts", () => {
    const [question] = parseQuestionsFromText(
      JSON.stringify({
        questions: [
          {
            question: "A passage",
            cqParts: [
              { label: "A", text: "First", marks: 4 },
              { label: "B", question: "Second", marks: 6 },
            ],
          },
        ],
      }),
    );

    expect(question.cqParts).toHaveLength(2);
    expect(question.marks).toBe(10);
  });
});
