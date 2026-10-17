export type CharacterStyle = {
  body?: string;
  primaryColor?: string;
  secondaryColor?: string;
  skinColor?: string;
  hairColor?: string;
  hair?: string;
  hat?: string;
  accessory?: string;
};

export type StartNgPlayer = {
  id?: number;
  name: string;
  account?: string;
  style: CharacterStyle;
  face?: string;
  signedIn: boolean;
};

type StartNgReply = Record<string, unknown> & { requestId?: string };
type BoardEntry = { rank: number; player_id: number; name: string; stats?: { dodges?: number; distance?: number; time?: number } };

const START_NG = "https://start.ng";
let framePromise: Promise<HTMLIFrameElement> | undefined;

function connectFrame(): Promise<HTMLIFrameElement> {
  framePromise ??= new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.src = `${START_NG}/connect`;
    frame.hidden = true;
    frame.title = "Start.ng connection";
    frame.onload = () => resolve(frame);
    frame.onerror = () => reject(new Error("Start.ng connection failed"));
    document.body.append(frame);
  });
  return framePromise;
}

export async function askStartNg(message: Record<string, unknown>, replyType: string, timeoutMs = 5000): Promise<StartNgReply | null> {
  try {
    const frame = await connectFrame();
    return await new Promise((resolve) => {
      const requestId = Math.random().toString(36).slice(2);
      const done = (reply: StartNgReply | null) => {
        clearTimeout(timer);
        removeEventListener("message", onMessage);
        resolve(reply);
      };
      const timer = window.setTimeout(() => done(null), timeoutMs);
      const onMessage = (event: MessageEvent<StartNgReply>) => {
        if (event.origin !== START_NG || event.source !== frame.contentWindow) return;
        if (event.data?.type === replyType && event.data.requestId === requestId) done(event.data);
      };
      addEventListener("message", onMessage);
      frame.contentWindow?.postMessage({ ...message, requestId }, START_NG);
    });
  } catch {
    return null;
  }
}

const guest: StartNgPlayer = {
  name: "Guest Rider",
  style: { body: "male", primaryColor: "#e8ff46", secondaryColor: "#17211c", skinColor: "#8d5524", hairColor: "#17120f", hair: "short", hat: "none", accessory: "none" },
  signedIn: false,
};

export async function getPlayer(): Promise<StartNgPlayer> {
  const reply = await askStartNg({ type: "startng:whoami" }, "startng:user");
  const raw = (reply?.user ?? reply?.guest) as Partial<StartNgPlayer> | undefined;
  if (!raw?.name) return guest;
  return {
    id: typeof raw.id === "number" ? raw.id : undefined,
    name: raw.name,
    account: typeof raw.account === "string" ? raw.account : undefined,
    style: raw.style ?? guest.style,
    face: typeof raw.face === "string" ? raw.face : undefined,
    signedIn: Boolean(reply?.user),
  };
}

export function signIn(): void {
  location.href = `${START_NG}/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;
}

export async function saveScore(dodges: number, distance: number, time: number): Promise<string> {
  const reply = await askStartNg({ type: "startng:score", stats: { dodges, distance, time } }, "startng:scoreSaved");
  if (!reply) return "Run saved locally. Sign in on start.ng to join the global board.";
  if (reply.ok !== true) return typeof reply.error === "string" ? reply.error : "Sign in to save this run.";
  const result = reply.result as { improved?: boolean; rank?: number } | undefined;
  return result?.improved ? `New start.ng best — you are #${result.rank ?? "?"}!` : `Run complete — your best rank is #${result?.rank ?? "?"}.`;
}

export async function getLeaderboard(): Promise<BoardEntry[]> {
  const reply = await askStartNg({ type: "startng:leaderboard", limit: 10 }, "startng:leaderboardData");
  return reply?.ok === true && Array.isArray(reply.entries) ? reply.entries as BoardEntry[] : [];
}
