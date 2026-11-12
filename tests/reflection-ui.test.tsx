// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes, ImgHTMLAttributes } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import ReviewDeck from "@/components/ReviewDeck";
import type { ItemDTO } from "@/types/item";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: ImgHTMLAttributes<HTMLImageElement>) => <img src={String(src)} alt={alt} />,
}));
vi.mock("next/link", () => ({
  default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />,
}));

beforeAll(() => {
  // jsdom has <dialog> but not its modal methods.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

const item = (id: string, name: string): ItemDTO => ({
  id,
  name,
  price: 40,
  currency: "USD",
  imageUrl: "https://res.cloudinary.com/test/image/upload/x.png",
  description: null,
  availableAt: "2026-01-02T00:00:00.000Z",
  status: "pending",
  decision: null,
  decidedAt: null,
  reflection: null,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const LAMP = item("aaaaaaaaaaaaaaaaaaaaaaaa", "Desk lamp");
const BOOTS = item("bbbbbbbbbbbbbbbbbbbbbbbb", "Rain boots");

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    const { decision } = JSON.parse(String(init.body ?? "{}"));
    const id = url.split("/")[3];
    return new Response(JSON.stringify({ item: { ...item(id, "x"), status: "reviewed", decision } }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup() {
  const user = userEvent.setup();
  render(<ReviewDeck initial={{ items: [LAMP, BOOTS], nextAvailableAt: null }} income={null} />);
  const chatbot = () => screen.getByTestId("reflection-chatbot") as HTMLDialogElement;
  const isOpen = () => chatbot().hasAttribute("open");
  const inChat = () => within(chatbot());
  const answer = async (label: string) => {
    await user.click(inChat().getByRole("button", { name: label }));
  };
  const next = async () => {
    await user.click(inChat().getByRole("button", { name: /^(Next|See summary)$/ }));
  };
  return { user, chatbot, isOpen, inChat, answer, next };
}

/** Answers that add up to 1 + 1 + 0 + 2 + 1 = 5 ("Clear need"). */
async function answerAll({ answer, next }: ReturnType<typeof setup>) {
  for (const label of ["No", "It would be useful", "Occasionally", "Yes", "It will make my life easier"]) {
    await answer(label);
    await next();
  }
}

const sentBody = () => JSON.parse(String(fetchMock.mock.calls[0][1].body));

describe("Buy opens the reflection chatbot", () => {
  it("does not record anything until the user confirms", async () => {
    const t = setup();
    expect(t.isOpen()).toBe(false);
    await t.user.click(screen.getByRole("button", { name: "Buy" }));
    expect(t.isOpen()).toBe(true);
    expect(t.inChat().getByText("Question 1 of 5")).toBeTruthy();
    expect(t.inChat().getByRole("heading", { name: "Do you already own something similar?" })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("the → shortcut opens it too instead of buying", async () => {
    const t = setup();
    await t.user.keyboard("{ArrowRight}");
    expect(t.isOpen()).toBe(true);
    // Arrow keys inside the chatbot must not decide on the card behind it.
    await t.user.keyboard("{ArrowLeft}");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Do Not Buy still skips immediately without the chatbot", async () => {
    const t = setup();
    await t.user.click(screen.getByRole("button", { name: "Do Not Buy" }));
    expect(t.isOpen()).toBe(false);
    expect(sentBody()).toEqual({ decision: "skip" });
  });
});

describe("answering", () => {
  it("shows one question at a time, echoes the answer, and gates Next", async () => {
    const t = setup();
    await t.user.click(screen.getByRole("button", { name: "Buy" }));
    const nextButton = t.inChat().getByRole("button", { name: "Next" }) as HTMLButtonElement;
    expect(nextButton.disabled).toBe(true);
    expect((t.inChat().getByRole("button", { name: "Back" }) as HTMLButtonElement).disabled).toBe(true);

    await t.answer("No");
    expect(t.inChat().getByRole("button", { name: "No", pressed: true })).toBeTruthy();
    expect(t.inChat().getByText("Your answer:").closest("p")!.textContent).toBe("Your answer: No");
    expect(nextButton.disabled).toBe(false);

    await t.next();
    expect(t.inChat().getByText("Question 2 of 5")).toBeTruthy();
    expect(t.inChat().queryByText("Do you already own something similar?")).toBeNull();
  });

  it("all five questions lead to the score and summary", async () => {
    const t = setup();
    await t.user.click(screen.getByRole("button", { name: "Buy" }));
    await answerAll(t);
    expect(screen.getByTestId("reflection-score").textContent).toBe("+5");
    expect(screen.getByTestId("reflection-summary").textContent).toBe(
      "This purchase seems connected to a clear need or frequent use.",
    );
    expect(t.inChat().getByText(/not financial or professional advice/)).toBeTruthy();
    for (const name of ["Confirm Buy", "Mark Do Not Buy Instead", "Need More Time", "Review Answers"]) {
      expect(t.inChat().getByRole("button", { name })).toBeTruthy();
    }
  });

  it("Back keeps earlier answers and lets the user change one", async () => {
    const t = setup();
    await t.user.click(screen.getByRole("button", { name: "Buy" }));
    await t.answer("No");
    await t.next();
    await t.answer("It would be useful");
    await t.next();

    await t.user.click(t.inChat().getByRole("button", { name: "Back" }));
    expect(t.inChat().getByText("Question 2 of 5")).toBeTruthy();
    expect(t.inChat().getByRole("button", { name: "It would be useful", pressed: true })).toBeTruthy();
    await t.answer("No, I mostly want it");
    expect(t.inChat().getByRole("button", { name: "It would be useful", pressed: false })).toBeTruthy();

    await t.next();
    for (const label of ["Occasionally", "Yes", "It will make my life easier"]) {
      await t.answer(label);
      await t.next();
    }
    // 1 - 2 + 0 + 2 + 1
    expect(screen.getByTestId("reflection-score").textContent).toBe("+2");
    expect(screen.getByTestId("reflection-summary").textContent).toMatch(/worth thinking about it a little longer/);
  });

  it("Review Answers returns to question 1 with answers kept", async () => {
    const t = setup();
    await t.user.click(screen.getByRole("button", { name: "Buy" }));
    await answerAll(t);
    await t.user.click(t.inChat().getByRole("button", { name: "Review Answers" }));
    expect(t.inChat().getByText("Question 1 of 5")).toBeTruthy();
    expect(t.inChat().getByRole("button", { name: "No", pressed: true })).toBeTruthy();
  });
});

describe("finishing", () => {
  it("Confirm Buy sends the answer ids and moves to the next card", async () => {
    const t = setup();
    await t.user.click(screen.getByRole("button", { name: "Buy" }));
    await answerAll(t);
    await t.user.click(t.inChat().getByRole("button", { name: "Confirm Buy" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/items/${LAMP.id}/decision`);
    expect(sentBody()).toEqual({
      decision: "buy",
      reflection: {
        answers: { "own-similar": "no", necessary: "useful", frequency: "occasionally", budget: "yes", reason: "easier" },
      },
    });
    expect(await screen.findByRole("heading", { name: "Rain boots" })).toBeTruthy();
    expect(t.isOpen()).toBe(false);
  });

  it("Mark Do Not Buy Instead records skip with the reflection", async () => {
    const t = setup();
    await t.user.click(screen.getByRole("button", { name: "Buy" }));
    await answerAll(t);
    await t.user.click(t.inChat().getByRole("button", { name: "Mark Do Not Buy Instead" }));
    expect(sentBody()).toMatchObject({ decision: "skip", reflection: { answers: { reason: "easier" } } });
  });

  it("Need More Time snoozes the item without deciding", async () => {
    const t = setup();
    await t.user.click(screen.getByRole("button", { name: "Buy" }));
    await answerAll(t);
    await t.user.click(t.inChat().getByRole("button", { name: "Need More Time" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/items/${LAMP.id}/snooze`);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
    expect(await screen.findByRole("heading", { name: "Rain boots" })).toBeTruthy();
    expect(screen.getByTestId("snooze-notice").textContent).toMatch(/Desk lamp will be back/);
    expect(t.isOpen()).toBe(false);
  });

  it("Need More Time is also offered after skipping the questions", async () => {
    const t = setup();
    await t.user.click(screen.getByRole("button", { name: "Buy" }));
    await t.user.click(t.inChat().getByRole("button", { name: "Skip the questions" }));
    await t.user.click(t.inChat().getByRole("button", { name: "Need More Time" }));
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/items/${LAMP.id}/snooze`);
  });

  it("a double tap on Confirm Buy only submits once", async () => {
    const t = setup();
    await t.user.click(screen.getByRole("button", { name: "Buy" }));
    await answerAll(t);
    const confirm = t.inChat().getByRole("button", { name: "Confirm Buy" });
    confirm.click();
    confirm.click();
    await screen.findByRole("heading", { name: "Rain boots" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("skipping the questions still allows either choice, without a reflection", async () => {
    const t = setup();
    await t.user.click(screen.getByRole("button", { name: "Buy" }));
    await t.user.click(t.inChat().getByRole("button", { name: "Skip the questions" }));
    expect(screen.queryByTestId("reflection-score")).toBeNull();
    await t.user.click(t.inChat().getByRole("button", { name: "Confirm Buy" }));
    expect(sentBody()).toEqual({ decision: "buy" });
  });
});

describe("closing", () => {
  it("closing records nothing, and reopening resumes where the user left off", async () => {
    const t = setup();
    await t.user.click(screen.getByRole("button", { name: "Buy" }));
    await t.answer("No");
    await t.next();
    await t.answer("Yes, I need it");

    await t.user.click(t.inChat().getByRole("button", { name: "Close reflection" }));
    expect(t.isOpen()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Desk lamp" })).toBeTruthy();

    await t.user.click(screen.getByRole("button", { name: "Buy" }));
    expect(t.isOpen()).toBe(true);
    expect(t.inChat().getByText("Question 2 of 5")).toBeTruthy();
    expect(t.inChat().getByRole("button", { name: "Yes, I need it", pressed: true })).toBeTruthy();
  });

  it("Escape (the dialog's close event) closes it without deciding", async () => {
    const t = setup();
    await t.user.click(screen.getByRole("button", { name: "Buy" }));
    t.chatbot().close();
    expect(t.isOpen()).toBe(false);
    await t.user.click(screen.getByRole("button", { name: "Buy" }));
    expect(t.isOpen()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
