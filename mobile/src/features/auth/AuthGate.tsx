import { useEffect } from "react";
import { AppState } from "react-native";
import { focusManager, QueryClientProvider } from "@tanstack/react-query";
import { Stack, Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { queryClient } from "../../api/queryClient";
import { sessionActions, useSession } from "../../lib/session";
import { theme } from "../../theme/tokens";
import { privateCache } from "../../api/cache";

void SplashScreen.preventAutoHideAsync();

export function AuthGate() {
  const { status, user } = useSession();
  const userId = user?.id;
  useEffect(() => {
    if (status === "signedIn" && userId)
      void privateCache.start(userId).catch(() => undefined);
    return () => privateCache.stop();
  }, [status, userId]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) =>
      focusManager.setFocused(state === "active"),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    void sessionActions.restore();
  }, []);
  useEffect(() => {
    if (status !== "restoring") void SplashScreen.hideAsync();
  }, [status]);
  if (status === "restoring") return null;
  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.ink },
          animation: "none",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Protected guard={status === "signedOut"}>
          <Stack.Screen name="(auth)/sign-in" />
        </Stack.Protected>
        <Stack.Protected
          guard={status === "needsName" || status === "signedIn"}
        >
          <Stack.Screen name="(auth)/name" />
        </Stack.Protected>
        <Stack.Protected guard={status === "blocked"}>
          <Stack.Screen name="(auth)/blocked" />
        </Stack.Protected>
        <Stack.Protected guard={status === "signedIn"}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="subject/[slug]" />
          <Stack.Screen name="material/[id]" />
          <Stack.Screen
            name="upload/[slug]"
            options={{ presentation: "modal" }}
          />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}

export function SessionRedirect() {
  const { status } = useSession();
  if (status === "restoring") return null;
  const paths = {
    signedOut: "/sign-in",
    needsName: "/name",
    blocked: "/blocked",
    signedIn: "/subjects",
  } as const;
  return <Redirect href={paths[status]} />;
}
