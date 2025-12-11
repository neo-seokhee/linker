// Tab Layout - Bottom navigation with custom URL-aware tab bar for web
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useAppSettings } from '@/hooks/useAppSettings';

// Mobile-first: max width 390px
const MAX_WIDTH = 390;

// Custom Tab Bar for web that reads URL directly
function CustomTabBar({ state, descriptors, navigation }: any) {
  const { effectiveTheme } = useAppSettings();
  const colors = Colors[effectiveTheme];
  const [activeTab, setActiveTab] = useState('index');

  // On web, read URL to determine active tab
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('/storage')) {
        setActiveTab('storage');
      } else if (path.includes('/settings')) {
        setActiveTab('settings');
      } else {
        setActiveTab('index');
      }
    }
  }, []);

  // On native, use expo-router state
  useEffect(() => {
    if (Platform.OS !== 'web') {
      const route = state.routes[state.index];
      setActiveTab(route.name);
    }
  }, [state.index]);

  const tabs = [
    { name: 'index', title: '탐색', icon: 'compass', iconOutline: 'compass-outline' },
    { name: 'storage', title: '보관', icon: 'folder', iconOutline: 'folder-outline' },
    { name: 'settings', title: '설정', icon: 'settings', iconOutline: 'settings-outline' },
  ];

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      {tabs.map((tab) => {
        const isFocused = activeTab === tab.name;

        const onPress = () => {
          setActiveTab(tab.name);
          const event = navigation.emit({
            type: 'tabPress',
            target: tab.name,
            canPreventDefault: true,
          });

          if (!event.defaultPrevented) {
            navigation.navigate(tab.name);
          }
        };

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Ionicons
              name={(isFocused ? tab.icon : tab.iconOutline) as any}
              size={24}
              color={isFocused ? colors.accent : colors.tabIconDefault}
            />
            <Text style={[
              styles.tabLabel,
              { color: isFocused ? colors.accent : colors.tabIconDefault }
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { effectiveTheme } = useAppSettings();
  const colors = Colors[effectiveTheme];

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      <View style={styles.mobileContainer}>
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: {
              backgroundColor: colors.background,
            },
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="storage" />
          <Tabs.Screen name="settings" />
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
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    height: 70,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});

