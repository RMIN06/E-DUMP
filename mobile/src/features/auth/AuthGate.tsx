import { useEffect, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import { focusManager, QueryClientProvider } from "@tanstack/react-query";
import { Stack, Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { queryClient } from "../../api/queryClient";
import { sessionActions, useSession } from "../../lib/session";
import { theme } from "../../theme/tokens";
import { privateCache } from "../../api/cache";
import { useMotionPreference } from "../../theme/animation";
import { motion } from "../../theme/motion";

void SplashScreen.preventAutoHideAsync();

export function AuthGate({ children }: PropsWithChildren) {
  const { status, user } = useSession();
  const reduced = useMotionPreference();
  const userId = user?.id;
  useEffect(() => {
    if (status === "signedIn" && userId)
      void privateCache.start(userId).catch(() => undefined);
    return () => privateCache.stop();
  }, [status, userId]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
      if (state === "active")
        void sessionActions.syncProfile().catch(() => undefined);
    });
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
      {children}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.ink },
          animation: reduced ? "none" : "slide_from_right",
          animationDuration: motion.durationBase,
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
          <Stack.Screen name="rules" />
          <Stack.Screen name="subject/[slug]" />
          <Stack.Screen name="material/[id]" />
          <Stack.Screen name="updates/[id]" />
          <Stack.Screen
            name="upload/[slug]"
            options={{ presentation: "modal", animation: reduced ? "none" : "slide_from_bottom" }}
          />
        </Stack.Protected>
        <Stack.Protected
          guard={status === "signedIn" && user?.role === "admin"}
        >
          <Stack.Screen name="admin/users" />
          <Stack.Screen name="admin/reports" />
          <Stack.Screen
            name="updates/new"
            options={{ presentation: "modal", animation: reduced ? "none" : "slide_from_bottom" }}
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
    signedIn: "/updates",
  } as const;
  return <Redirect href={paths[status]} />;
}
