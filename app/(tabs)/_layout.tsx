// Tab Layout - Bottom navigation with 보관 and 설정 tabs
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useAppSettings } from '@/hooks/useAppSettings';

// Mobile-first: max width 390px
const MAX_WIDTH = 390;

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: 0 }} {...props} />;
}

export default function TabLayout() {
  const { effectiveTheme } = useAppSettings();
  const colors = Colors[effectiveTheme];

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      <View style={styles.mobileContainer}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.tabIconDefault,
            tabBarStyle: {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              height: 70,
              paddingTop: 8,
              paddingBottom: 8,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '500',
              marginTop: 4,
              marginBottom: 0,
            },
            tabBarItemStyle: {
              paddingBottom: 0,
            },
            headerShown: false,
            sceneStyle: {
              backgroundColor: colors.background,
            },
          }}
        >
          <Tabs.Screen
            name="explore"
            options={{
              title: '탐색',
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon name={focused ? 'compass' : 'compass-outline'} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="index"
            options={{
              title: '보관',
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon name={focused ? 'folder' : 'folder-outline'} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: '설정',
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon name={focused ? 'settings' : 'settings-outline'} color={color} />
              ),
            }}
          />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
  },
});
