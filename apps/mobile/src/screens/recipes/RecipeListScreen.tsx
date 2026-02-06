import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextInput,
  RefreshControl,
} from 'react-native';
import type { Recipe } from '@meal-planning/shared-types';
import { useRecipes, useBrowseRecipes } from '../../hooks';
import { useSimpleNavigation } from '../../navigation/CustomNavigationContext';
import { colors, typography, spacing, borderRadius, shadow } from '../../styles';

type DifficultyKey = 'easy' | 'medium' | 'hard';

const DIFFICULTY_LABELS: Record<DifficultyKey, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

const badgeStyles: Record<DifficultyKey, ViewStyle> = {
  easy: {
    backgroundColor: colors.difficulty.easy.bg,
  },
  medium: {
    backgroundColor: colors.difficulty.medium.bg,
  },
  hard: {
    backgroundColor: colors.difficulty.hard.bg,
  },
};

export default function RecipeListScreen() {
  const navigation = useSimpleNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<'browse' | 'mine'>('browse');

  const browseResult = useBrowseRecipes(
    activeSection === 'browse' ? (searchQuery ? { query: searchQuery } : undefined) : undefined
  );
  const myResult = useRecipes(
    activeSection === 'mine' ? (searchQuery ? { query: searchQuery } : undefined) : undefined
  );

  const currentData = activeSection === 'browse' ? browseResult : myResult;
  const { data, isLoading, error, refetch } = currentData;

  const recipes = data?.data || [];
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderRecipeItem = ({ item }: { item: Recipe }) => {
    const totalTime = (item.prep_time_minutes || 0) + (item.cook_time_minutes || 0);

    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => navigation.navigate('RecipeDetail', { recipeId: String(item.id) })}
      >
        {item.image_url ? (
          <View style={styles.recipeImageContainer}>
            <Text style={styles.recipeImagePlaceholder}>🖼️</Text>
          </View>
        ) : (
          <View style={styles.recipePlaceholder}>
            <Text style={styles.recipePlaceholderText}>🍳</Text>
          </View>
        )}
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.categories && item.categories.length > 0 && (
            <Text style={styles.categoryText} numberOfLines={1}>
              {item.categories.join(', ')}
            </Text>
          )}
          <View style={styles.recipeMeta}>
            {item.difficulty && (
              <View style={[styles.badge, badgeStyles[item.difficulty as DifficultyKey]]}>
                <Text style={styles.badgeText}>
                  {DIFFICULTY_LABELS[item.difficulty as DifficultyKey]}
                </Text>
              </View>
            )}
            {totalTime > 0 && (
              <Text style={styles.metaText}>⏱ {totalTime}분</Text>
            )}
            {item.servings && (
              <Text style={styles.metaText}>👥 {item.servings}인분</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>레시피를 불러올 수 없습니다</Text>
        <Text style={styles.errorSubtitle}>
          {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>레시피를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="레시피 검색..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Segment Control */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentButton, activeSection === 'browse' && styles.segmentButtonActive]}
          onPress={() => setActiveSection('browse')}
        >
          <Text style={[styles.segmentText, activeSection === 'browse' && styles.segmentTextActive]}>
            전체 레시피
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, activeSection === 'mine' && styles.segmentButtonActive]}
          onPress={() => setActiveSection('mine')}
        >
          <Text style={[styles.segmentText, activeSection === 'mine' && styles.segmentTextActive]}>
            내 레시피
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recipe List */}
      <FlatList
        data={recipes}
        renderItem={renderRecipeItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>
              {searchQuery ? '🔍' : '🍳'}
            </Text>
            <Text style={styles.emptyTitle}>
              {searchQuery
                ? '검색 결과가 없습니다'
                : activeSection === 'mine'
                ? '아직 내 레시피가 없습니다'
                : '레시피가 없습니다'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? '다른 검색어로 시도해보세요'
                : activeSection === 'mine'
                ? '레시피를 추가하거나 전체 레시피에서 가져오세요'
                : '첫 레시피를 추가해보세요'}
            </Text>
          </View>
        }
      />

      {/* FAB for adding recipe */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('RecipeForm', {})}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.textLight,
  },
  searchContainer: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    height: 44,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0,
  },
  clearButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  clearButtonText: {
    ...typography.body,
    color: colors.textMuted,
    fontSize: 18,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  recipeCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadow.md,
  },
  recipePlaceholder: {
    height: 160,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipePlaceholderText: {
    fontSize: 48,
    opacity: 0.5,
  },
  recipeImageContainer: {
    height: 160,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeImagePlaceholder: {
    fontSize: 48,
    opacity: 0.5,
  },
  recipeInfo: {
    padding: spacing.lg,
  },
  recipeTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  categoryText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    ...typography.labelSmall,
    color: colors.text,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
    opacity: 0.5,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.lg,
  },
  fabText: {
    fontSize: 28,
    color: colors.textLight,
    fontWeight: '300',
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    ...typography.button,
    color: colors.textSecondary,
    fontSize: 14,
  },
  segmentTextActive: {
    color: colors.textLight,
  },
});
