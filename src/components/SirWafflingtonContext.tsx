// Lifts Sir Wafflington's chat state up to the app root so messages, draft
// input, and open/closed state survive route changes (e.g. entering a game
// and returning to the hub).

import { createContext, useContext, useState, ReactNode } from "react";

export type ChatMsg = { role: "user" | "assistant"; content: string };

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  input: string;
  setInput: (v: string) => void;
  messages: ChatMsg[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMsg[]>>;
  streaming: boolean;
  setStreaming: (v: boolean) => void;
};

const SirWafflingtonContext = createContext<Ctx | null>(null);

export const SirWafflingtonProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [streaming, setStreaming] = useState(false);

  return (
    <SirWafflingtonContext.Provider
      value={{ open, setOpen, input, setInput, messages, setMessages, streaming, setStreaming }}
    >
      {children}
    </SirWafflingtonContext.Provider>
  );
};

export const useSirWafflington = () => {
  const ctx = useContext(SirWafflingtonContext);
  if (!ctx) throw new Error("useSirWafflington must be used within SirWafflingtonProvider");
  return ctx;
};
