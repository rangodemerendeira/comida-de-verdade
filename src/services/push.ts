import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const API_URL = "https://okau-lilac.vercel.app"; // <-- troque aqui

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push só funciona em dispositivo físico.");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Permissão de notificações negada.");
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return token;
}

export async function enviarTokenParaServidor(token: string) {
  try {
    await fetch(`${API_URL}/api/push/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        userId: null,
      }),
    });
  } catch (e) {
    console.error("Erro ao enviar token para servidor:", e);
  }
}
