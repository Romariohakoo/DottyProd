export type TicketKind = "plane" | "train" | "bus";

export interface RecognizedTicket {
  status: "found" | "empty" | "unsupported";
  kind?: TicketKind;
  number?: string;
  from?: string;
  to?: string;
  date?: string;
  departure?: string;
  seat?: string;
  extra?: string;
}

interface DetectedCode {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect: (image: ImageBitmap) => Promise<DetectedCode[]>;
}

interface BarcodeDetectorClass {
  new (options: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats: () => Promise<string[]>;
}

const FORMATS = ["pdf417", "aztec", "qr_code", "data_matrix"];

export const AIRPORTS: Record<string, string[]> = {
  LED: ["санкт-петербург", "пулково", "петербург"],
  KZN: ["казань"],
  SVO: ["шереметьево", "москва"],
  DME: ["домодедово", "москва"],
  VKO: ["внуково", "москва"],
  ZIA: ["жуковский", "москва"],
  AER: ["сочи", "адлер"],
  KGD: ["калининград", "храброво"],
  SVX: ["екатеринбург", "кольцово"],
  OVB: ["новосибирск", "толмачёво", "толмачево"],
  KUF: ["самара", "курумоч"],
  UFA: ["уфа"],
  ROV: ["ростов", "платов"],
  MRV: ["минеральные воды"],
  KRR: ["краснодар"],
  MMK: ["мурманск"],
  IKT: ["иркутск"],
  VVO: ["владивосток"],
  IST: ["стамбул"],
};

const pad = (value: number) => String(value).padStart(2, "0");

function fromJulian(day: number, year: number) {
  const date = new Date(year, 0, day, 12);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseBoardingPass(raw: string, year: number): RecognizedTicket | null {
  if (!/^M[1-9]/.test(raw) || raw.length < 58) return null;
  const pnr = raw.slice(23, 30).trim();
  const from = raw.slice(30, 33).trim();
  const to = raw.slice(33, 36).trim();
  const carrier = raw.slice(36, 39).trim();
  const flight = raw.slice(39, 44).trim().replace(/^0+/, "");
  const julian = Number(raw.slice(44, 47));
  const cabin = raw.slice(47, 48).trim();
  const seat = raw.slice(48, 52).trim().replace(/^0+/, "");
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) return null;
  return {
    status: "found",
    kind: "plane",
    number: `${carrier} ${flight}`.trim(),
    from,
    to,
    date: julian > 0 && julian <= 366 ? fromJulian(julian, year) : undefined,
    seat: seat || undefined,
    extra: [cabin && `класс ${cabin}`, pnr && `бронь ${pnr}`]
      .filter(Boolean)
      .join(", "),
  };
}

function parseReceipt(raw: string): RecognizedTicket | null {
  const params = new URLSearchParams(raw);
  const stamp = params.get("t");
  const sum = params.get("s");
  const match = stamp?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (!match) return null;
  return {
    status: "found",
    kind: "train",
    date: `${match[1]}-${match[2]}-${match[3]}`,
    departure: `${match[4]}:${match[5]}`,
    extra: sum ? `${Number(sum).toLocaleString("ru-RU")} ₽` : undefined,
  };
}

export async function recognizeTicket(
  file: File,
  year: number,
): Promise<RecognizedTicket> {
  const Detector = (
    window as Window & { BarcodeDetector?: BarcodeDetectorClass }
  ).BarcodeDetector;
  if (!Detector) return { status: "unsupported" };
  try {
    const supported = await Detector.getSupportedFormats();
    const formats = FORMATS.filter((format) => supported.includes(format));
    if (!formats.length) return { status: "unsupported" };
    const bitmap = await createImageBitmap(file);
    const codes = await new Detector({ formats }).detect(bitmap);
    bitmap.close();
    for (const code of codes) {
      const parsed =
        parseBoardingPass(code.rawValue, year) ?? parseReceipt(code.rawValue);
      if (parsed) return parsed;
    }
    return { status: "empty" };
  } catch {
    return { status: "empty" };
  }
}
