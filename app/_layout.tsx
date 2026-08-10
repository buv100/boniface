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
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { BonifaceProvider } from "@/context/BonifaceContext";
import { LangProvider } from "@/context/LangContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RoleGate({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isEmployee, isManager, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const root = String(segments[0] ?? "");
    const inEmployee = root === "employee";
    // Shared screens both roles can open
    const sharedRoots = new Set(["assistant", "privacy", "terms", "account"]);
    if (isLoggedIn && isEmployee && !inEmployee && !sharedRoots.has(root)) {
      router.replace("/employee" as any);
    } else if (isLoggedIn && isManager && inEmployee) {
      router.replace("/");
    }
  }, [isLoggedIn, isEmployee, isManager, isLoading, segments, router]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <RoleGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
                      <RootLayoutNav />
                      <AssistantFab />
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
