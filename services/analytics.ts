// services/analytics.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { Platform } from "react-native";

const QUEUE_KEY = "analytics_queue_v1";
const SESSION_KEY = "analytics_session_v1";

export type AnalyticsEventName =
  | "app_open"
  | "session_start"
  | "session_end"
  | "ingredient_search"
  | "ingredient_add"
  | "ingredient_remove"
  | "generate_recipes_start"
  | "generate_recipes_success"
  | "generate_recipes_error"
  | "recipe_open"
  | "recipe_save"
  | "feedback_recipe";

export type AnalyticsEvent = {
  id: string;
  name: AnalyticsEventName;
  ts: number; // Date.now()
  props?: Record<string, any>;
  context: {
    platform: string;
    appVersion?: string | null;
    deviceModel?: string | null;
    osVersion?: string | null;
    timezoneOffsetMin: number;
  };
  sessionId?: string;
};

function uuid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function getQueue(): Promise<AnalyticsEvent[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
}

async function setQueue(q: AnalyticsEvent[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

async function getOrCreateSessionId(): Promise<string> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (raw) return raw;
  const sid = uuid();
  await AsyncStorage.setItem(SESSION_KEY, sid);
  return sid;
}

function baseContext() {
  return {
    platform: Platform.OS,
    appVersion: Application.nativeApplicationVersion ?? null,
    deviceModel: Device.modelName ?? null,
    osVersion: Device.osVersion ?? null,
    timezoneOffsetMin: new Date().getTimezoneOffset(),
  };
}

export async function track(name: AnalyticsEventName, props?: Record<string, any>) {
  const sessionId = await getOrCreateSessionId();
  const ev: AnalyticsEvent = {
    id: uuid(),
    name,
    ts: Date.now(),
    props,
    context: baseContext(),
    sessionId,
  };

  const q = await getQueue();
q.push(ev);

// limita tamanho da fila (MVP): guarda só os últimos 500
const MAX = 500;
const trimmed = q.length > MAX ? q.slice(q.length - MAX) : q;

await setQueue(trimmed);

}

export async function flushAnalytics() {
  const q = await getQueue();
  if (!q.length) return;

  try {
    // Use a URL completa do seu backend na Vercel:
    const url = "https://okau-lilac.vercel.app/api/analytics";

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: q }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await setQueue([]); // limpou com sucesso
  } catch {
    // fica na fila e tenta depois
  }
}


// Helpers de sessão (opcional, mas ajuda muito)
export async function startSession() {
  await track("session_start");
}

export async function endSession(durationMs: number) {
  await track("session_end", { durationMs });
}
