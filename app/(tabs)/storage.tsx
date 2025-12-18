// Storage Page - Main tab showing all saved links by category
import { AddLinkModal } from '@/components/AddLinkModal';
import { CategorySection, isNewLink } from '@/components/CategorySection';
import { FloatingButton } from '@/components/FloatingButton';
import { LoginScreen } from '@/components/LoginScreen';
import { ScreenHeader } from '@/components/ScreenHeader';
import Colors from '@/constants/Colors';
import { Link } from '@/constants/types';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAuth } from '@/hooks/useAuth';
import { useLinks } from '@/hooks/useLinks';
import { openLink } from '@/utils/openLink';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mobile-first: max width 390px (iPhone 14 width)
const MAX_WIDTH = 390;

export default function StoragePage() {
  const { effectiveTheme, setThemeMode } = useAppSettings();
  const colors = Colors[effectiveTheme];
  const insets = useSafeAreaInsets();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { categories, getLinksForCategory, toggleFavorite, isLoading, links } = useLinks();

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Count new links and favorites
  const newLinksCount = links.filter(link => isNewLink(link.createdAt)).length;
  const favoritesCount = links.filter(link => link.isFavorite).length;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleLinkPress = (link: Link) => {
    // Open link in new tab (web) or in-app browser (native)
    openLink(link.url);
  };

  // Show login screen if not authenticated
  if (!isAuthLoading && !user) {
    return <LoginScreen />;
  }

  if (isLoading || isAuthLoading) {
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

        {/* Filter Bar */}
        {(newLinksCount > 0 || favoritesCount > 0) && (
          <View style={styles.filterBar}>
            {/* NEW Filter */}
            {newLinksCount > 0 && (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: showNewOnly ? '#FF4757' : colors.card,
                    borderColor: showNewOnly ? '#FF4757' : colors.border,
                  }
                ]}
                onPress={() => {
                  setShowNewOnly(!showNewOnly);
                  if (!showNewOnly) setShowFavoritesOnly(false);
                }}
              >
                <Text style={[
                  styles.newBadgeText,
                  { color: showNewOnly ? '#FFF' : '#FF4757' }
                ]}>NEW</Text>
                <Text style={[
                  styles.filterText,
                  { color: showNewOnly ? '#FFF' : colors.text }
                ]}>
                  {newLinksCount}
                </Text>
              </TouchableOpacity>
            )}

            {/* Favorites Filter */}
            {favoritesCount > 0 && (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: showFavoritesOnly ? colors.accentAlt : colors.card,
                    borderColor: showFavoritesOnly ? colors.accentAlt : colors.border,
                  }
                ]}
                onPress={() => {
                  setShowFavoritesOnly(!showFavoritesOnly);
                  if (!showFavoritesOnly) setShowNewOnly(false);
                }}
              >
                <Ionicons
                  name={showFavoritesOnly ? 'star' : 'star-outline'}
                  size={14}
                  color={showFavoritesOnly ? '#000' : colors.accentAlt}
                />
                <Text style={[
                  styles.filterText,
                  { color: showFavoritesOnly ? '#000' : colors.text }
                ]}>
                  즐겨찾기 {favoritesCount}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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
          {/* Empty State */}
          {links.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📎</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>저장된 링크가 없습니다</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                + 버튼을 눌러 첫 번째 링크를 추가해보세요!
              </Text>
            </View>
          ) : (
            categories.map((category) => {
              let categoryLinks = getLinksForCategory(category.id);

              // Apply NEW filter if enabled
              if (showNewOnly) {
                categoryLinks = categoryLinks.filter(link => isNewLink(link.createdAt));
              }

              // Apply favorites filter if enabled
              if (showFavoritesOnly) {
                categoryLinks = categoryLinks.filter(link => link.isFavorite);
              }

              // Skip favorites category (handled as filter now)
              if (category.id === 'favorites' || category.name === '즐겨찾기') {
                return null;
              }

              // Hide uncategorized category if it has no links
              if (category.id === '00000000-0000-0000-0000-000000000005' && categoryLinks.length === 0) {
                return null;
              }

              // Skip categories with no links after filtering
              if (categoryLinks.length === 0) {
                return null;
              }

              return (
                <CategorySection
                  key={category.id}
                  category={category}
                  links={categoryLinks}
                  onLinkPress={handleLinkPress}
                  onFavoriteToggle={toggleFavorite}
                />
              );
            })
          )}

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
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  newBadgeInFilter: {
    // placeholder for NEW badge styling in filter
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
