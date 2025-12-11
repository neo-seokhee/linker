// Storage Page - Main tab showing all saved links by category
import { AddLinkModal } from '@/components/AddLinkModal';
import { CategorySection } from '@/components/CategorySection';
import { FloatingButton } from '@/components/FloatingButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import Colors from '@/constants/Colors';
import { Link } from '@/constants/types';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useLinks } from '@/hooks/useLinks';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mobile-first: max width 390px (iPhone 14 width)
const MAX_WIDTH = 390;

export default function StoragePage() {
  const { effectiveTheme, setThemeMode } = useAppSettings();
  const colors = Colors[effectiveTheme];
  const insets = useSafeAreaInsets();
  const { categories, getLinksForCategory, toggleFavorite, isLoading } = useLinks();

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleLinkPress = (link: Link) => {
    // Open link in new tab (web) or external browser (native)
    if (Platform.OS === 'web') {
      window.open(link.url, '_blank');
    } else {
      Linking.openURL(link.url);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      <View style={styles.mobileContainer}>
        {/* Header */}
        <ScreenHeader />

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {categories.map((category) => {
            const links = getLinksForCategory(category.id);

            // Hide uncategorized category if it has no links
            if (category.id === '00000000-0000-0000-0000-000000000005' && links.length === 0) {
              return null;
            }

            return (
              <CategorySection
                key={category.id}
                category={category}
                links={links}
                onLinkPress={handleLinkPress}
                onFavoriteToggle={toggleFavorite}
              />

            );
          })}

          {/* Bottom padding for FAB */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Floating Add Button */}
        <FloatingButton onPress={() => setIsAddModalVisible(true)} />

        {/* Add Link Modal */}
        <AddLinkModal
          visible={isAddModalVisible}
          onClose={() => setIsAddModalVisible(false)}
        />
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 12,
  },
});
