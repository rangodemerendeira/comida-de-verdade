import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from "@expo/vector-icons";


export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
       <Tabs.Screen
        name="saved"
        options={{
          title: "Salvos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star" size={size ?? 28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
  name="history"
  options={{
    title: "Histórico",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="time-outline" size={size ?? 28} color={color} />
    ),
  }}
/>
      
    </Tabs>
  );
}
