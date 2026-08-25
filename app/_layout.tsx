import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AssistantFab } from "@/components/AssistantFab";
import { AppProvider } from "@/context/AppContext";
import { AssistantChatProvider } from "@/context/AssistantChatContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { BonifaceProvider } from "@/context/BonifaceContext";
import { LangProvider } from "@/context/LangContext";
import { useWebAutoUpdate } from "@/hooks/useWebAutoUpdate";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RoleGate({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isEmployee, isManager, isOwner, isPlatformAdmin, ownerAccessActive, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const root = String(segments[0] ?? "");
    const second = String(segments[1] ?? "");
    const inEmployee = root === "employee";
    const inOwner = root === "owner";
    const inAdmin = root === "admin";
    const legal = new Set(["assistant", "privacy", "terms"]);
    const guestOk = legal.has(root) || root === "account" || (inAdmin && second === "login");

    if (!isLoggedIn) {
      if (inAdmin && second !== "login") {
        router.replace("/admin/login" as any);
        return;
      }
      if (!guestOk) {
        router.replace("/account" as any);
      }
      return;
    }

    if (isPlatformAdmin) {
      if (!inAdmin && !legal.has(root)) {
        router.replace("/admin" as any);
      }
      return;
    }

    if (isOwner) {
      if (inAdmin) {
        router.replace((ownerAccessActive ? "/owner/hub" : "/owner/blocked") as any);
        return;
      }
      if (!ownerAccessActive && !(inOwner && second === "blocked")) {
        router.replace("/owner/blocked" as any);
        return;
      }
      if (ownerAccessActive && inOwner && second === "blocked") {
        router.replace("/owner" as any);
        return;
      }
      if (!inOwner && !legal.has(root) && root !== "account") {
        router.replace("/owner" as any);
      }
      return;
    }

    if (isLoggedIn && isEmployee && !inEmployee && !legal.has(root) && root !== "account") {
      router.replace("/employee" as any);
    } else if (isLoggedIn && isManager && (inEmployee || inOwner || inAdmin)) {
      router.replace("/");
    }
  }, [isLoggedIn, isEmployee, isManager, isOwner, isPlatformAdmin, ownerAccessActive, isLoading, segments, router]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <RoleGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="owner" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="employee" options={{ headerShown: false }} />
        <Stack.Screen name="cards" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ headerShown: false }} />
        <Stack.Screen name="briefing" options={{ headerShown: false }} />
        <Stack.Screen name="schedule" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="assistant" options={{ headerShown: false }} />
      </Stack>
    </RoleGate>
  );
}

export default function RootLayout() {
  useWebAutoUpdate();

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppProvider>
              <BonifaceProvider>
                <LangProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <KeyboardProvider>
                      <AssistantChatProvider>
                        <RootLayoutNav />
                        <AssistantFab />
                      </AssistantChatProvider>
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </LangProvider>
              </BonifaceProvider>
            </AppProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
