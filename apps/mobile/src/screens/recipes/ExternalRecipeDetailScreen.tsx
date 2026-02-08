import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSimpleNavigation } from '../../navigation/CustomNavigationContext';
import { colors, typography, spacing, borderRadius, shadow } from '../../styles';
import { useExternalRecipeDetail } from '../../hooks/use-recipes';
import { RecipeImage } from '../../components/RecipeImage';

interface ExternalRecipeDetailScreenProps {
  route: {
    params: {
      source: string;
      externalId: string;
      title: string;
      imageUrl?: string;
    };
  };
}

type TabType = 'ingredients' | 'instructions';

export default function ExternalRecipeDetailScreen({ route }: ExternalRecipeDetailScreenProps) {
  const navigation = useSimpleNavigation();
  const { source, externalId, title, imageUrl } = route.params;
  const [activeTab, setActiveTab] = useState<TabType>('ingredients');
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  const { data: recipe, isLoading, error } = useExternalRecipeDetail(source, externalId);

  const handleToggleIngredient = (index: number) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  const sourceLabel = source === 'korean_seed' ? '한식 레시피'
    : source === 'spoonacular' ? 'Spoonacular'
    : source === 'themealdb' ? 'TheMealDB'
    : source;

  const difficultyMap: Record<string, string> = {
    easy: '쉬움',
    medium: '보통',
    hard: '어려움',
  };

  const totalTime = recipe
    ? (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)
    : 0;

  return (
    <View style={styles.container}>
      {/* Back Button Header */}
      <View style={styles.backHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceBadgeText}>{sourceLabel}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Image - show preview image while loading, then recipe image */}
        <RecipeImage uri={recipe?.image_url || imageUrl} style={styles.recipeImage} />

        <View style={styles.content}>
          {/* Title - show immediately from params */}
          <Text style={styles.title}>{recipe?.title || title}</Text>

          {isLoading && (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>상세 정보를 불러오는 중...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorSection}>
              <Text style={styles.errorText}>상세 정보를 불러올 수 없습니다</Text>
            </View>
          )}

          {recipe && (
            <>
              {/* Description */}
              {recipe.description && (
                <Text style={styles.description}>{recipe.description}</Text>
              )}

              {/* Meta Row */}
              <View style={styles.metaRow}>
                {totalTime > 0 && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaValue}>⏱ {totalTime}분</Text>
                    <Text style={styles.metaLabel}>조리시간</Text>
                  </View>
                )}
                <View style={styles.metaItem}>
                  <Text style={styles.metaValue}>👥 {recipe.servings}인분</Text>
                  <Text style={styles.metaLabel}>기준량</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaValue}>
                    📊 {difficultyMap[recipe.difficulty] || recipe.difficulty}
                  </Text>
                  <Text style={styles.metaLabel}>난이도</Text>
                </View>
              </View>

              {/* Nutrition Info */}
              {(recipe.calories || recipe.protein_grams || recipe.carbs_grams || recipe.fat_grams) && (
                <View style={styles.nutritionRow}>
                  {recipe.calories != null && (
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{recipe.calories}</Text>
                      <Text style={styles.nutritionLabel}>kcal</Text>
                    </View>
                  )}
                  {recipe.protein_grams != null && (
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{recipe.protein_grams}g</Text>
                      <Text style={styles.nutritionLabel}>단백질</Text>
                    </View>
                  )}
                  {recipe.carbs_grams != null && (
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{recipe.carbs_grams}g</Text>
                      <Text style={styles.nutritionLabel}>탄수화물</Text>
                    </View>
                  )}
                  {recipe.fat_grams != null && (
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{recipe.fat_grams}g</Text>
                      <Text style={styles.nutritionLabel}>지방</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Categories / Tags */}
              {recipe.categories && recipe.categories.length > 0 && (
                <View style={styles.tagsRow}>
                  {recipe.categories.map((cat, i) => (
                    <View key={`cat-${i}`} style={styles.tag}>
                      <Text style={styles.tagText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Tab Navigation */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'ingredients' && styles.tabActive]}
                  onPress={() => setActiveTab('ingredients')}
                >
                  <Text style={[styles.tabText, activeTab === 'ingredients' && styles.tabTextActive]}>
                    재료 ({recipe.ingredients?.length || 0})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'instructions' && styles.tabActive]}
                  onPress={() => setActiveTab('instructions')}
                >
                  <Text style={[styles.tabText, activeTab === 'instructions' && styles.tabTextActive]}>
                    조리법 ({recipe.instructions?.length || 0})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab Content */}
              {activeTab === 'ingredients' && (
                <View style={styles.section}>
                  {recipe.ingredients && recipe.ingredients.length > 0 ? (
                    recipe.ingredients.map((ingredient, index) => (
                      <TouchableOpacity
                        key={`ing-${index}`}
                        style={styles.ingredientItem}
                        onPress={() => handleToggleIngredient(index)}
                      >
                        <View style={styles.checkbox}>
                          {checkedIngredients.has(index) && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.ingredientName,
                            checkedIngredients.has(index) && styles.ingredientChecked,
                          ]}
                        >
                          {ingredient.name}
                        </Text>
                        <Text
                          style={[
                            styles.ingredientAmount,
                            checkedIngredients.has(index) && styles.ingredientChecked,
                          ]}
                        >
                          {ingredient.amount} {ingredient.unit}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>재료 정보가 없습니다</Text>
                  )}
                </View>
              )}

              {activeTab === 'instructions' && (
                <View style={styles.section}>
                  {recipe.instructions && recipe.instructions.length > 0 ? (
                    recipe.instructions.map((instruction, index) => (
                      <View key={`step-${index}`} style={styles.instructionItem}>
                        <View style={styles.stepNumber}>
                          <Text style={styles.stepNumberText}>
                            {instruction.step_number}
                          </Text>
                        </View>
                        <Text style={styles.instructionText}>
                          {instruction.description}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>조리법 정보가 없습니다</Text>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadow.sm,
  },
  backButton: {
    paddingVertical: spacing.sm,
  },
  backButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  sourceBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  sourceBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  recipeImage: {
    height: 250,
    width: '100%',
  },
  imagePlaceholder: {
    height: 250,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 80,
    opacity: 0.5,
  },
  content: {
    padding: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  loadingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaValue: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    ...typography.h4,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  nutritionLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tagText: {
    ...typography.labelSmall,
    color: colors.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  ingredientName: {
    flex: 1,
    ...typography.body,
    color: colors.text,
  },
  ingredientAmount: {
    ...typography.body,
    color: colors.textSecondary,
  },
  ingredientChecked: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: {
    ...typography.labelSmall,
    color: colors.textLight,
    fontWeight: '700',
  },
  instructionText: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
