import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useSimpleNavigation } from '../../navigation/CustomNavigationContext';
import { useRecipes, useAddMealSlot, useWeekMealPlan } from '../../hooks';
import { colors, typography, spacing, borderRadius, shadow } from '../../styles';
import type { Recipe } from '@meal-planning/shared-types';

interface AddMealScreenProps {
  route: {
    params: {
      date?: string;
      mealType?: string;
    };
  };
}

type DifficultyKey = 'easy' | 'medium' | 'hard';

const DIFFICULTY_LABELS: Record<DifficultyKey, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

export default function AddMealScreen({ route }: AddMealScreenProps) {
  const navigation = useSimpleNavigation();
  const { date, mealType } = route.params;
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch recipes
  const { data: recipesData, isLoading: recipesLoading } = useRecipes(
    searchQuery ? { query: searchQuery } : undefined
  );

  // Get week start date from the date param
  const weekStartDate = React.useMemo(() => {
    if (!date) return '';
    const d = new Date(date);
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - d.getDay());
    const y = startOfWeek.getFullYear();
    const m = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const dd = String(startOfWeek.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }, [date]);

  // Fetch meal plan to get the ID
  const { data: mealPlan } = useWeekMealPlan(weekStartDate);

  // Add meal slot mutation
  const addMealSlot = useAddMealSlot();

  const recipes = recipesData?.data || [];

  // Format date for display
  const formattedDate = React.useMemo(() => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }, [date]);

  const handleSelectRecipe = async (recipe: Recipe) => {
    if (!mealPlan || !date || !mealType) {
      return;
    }

    try {
      await addMealSlot.mutateAsync({
        mealPlanId: mealPlan.id,
        data: {
          recipe_id: recipe.id,
          date: date,
          meal_type: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
          servings: recipe.servings,
        },
      });

      // Go back to meal plan screen
      navigation.goBack();
    } catch (error) {
      if (__DEV__) console.error('Failed to add meal:', error);
      Alert.alert('오류', '식사를 추가하는데 실패했습니다. 이미 해당 시간에 식사가 있을 수 있습니다.');
    }
  };

  const renderRecipeItem = ({ item }: { item: Recipe }) => {
    const totalTime = (item.prep_time_minutes || 0) + (item.cook_time_minutes || 0);

    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => handleSelectRecipe(item)}
        disabled={addMealSlot.isPending}
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
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {DIFFICULTY_LABELS[item.difficulty as DifficultyKey]}
                </Text>
              </View>
            )}
            {totalTime > 0 && <Text style={styles.metaText}>⏱ {totalTime}분</Text>}
            {item.servings && <Text style={styles.metaText}>👥 {item.servings}인분</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (recipesLoading) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← 뒤로</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {formattedDate} {MEAL_TYPE_LABELS[mealType || ''] || mealType}
            </Text>
            <Text style={styles.headerSubtitle}>레시피 선택</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>레시피를 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {formattedDate} {MEAL_TYPE_LABELS[mealType || ''] || mealType}
          </Text>
          <Text style={styles.headerSubtitle}>레시피 선택</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

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

      {/* Recipe List */}
      <FlatList
        data={recipes}
        renderItem={renderRecipeItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{searchQuery ? '🔍' : '🍳'}</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? '검색 결과가 없습니다' : '레시피가 없습니다'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? '다른 검색어로 시도해보세요' : '레시피 탭에서 레시피를 추가해보세요'}
            </Text>
          </View>
        }
      />

      {/* Loading overlay */}
      {addMealSlot.isPending && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingOverlayText}>식사 추가 중...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadow.sm,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  backButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 60, // Same width as back button for centering
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
  },
  recipeCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadow.md,
  },
  recipePlaceholder: {
    height: 120,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipePlaceholderText: {
    fontSize: 48,
    opacity: 0.5,
  },
  recipeImageContainer: {
    height: 120,
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
    backgroundColor: colors.primaryLight,
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
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    ...shadow.xl,
  },
  loadingOverlayText: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.md,
  },
});
