import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useSimpleNavigation } from '../../navigation/CustomNavigationContext';
import { colors, typography, spacing, borderRadius, shadow } from '../../styles';
import {
  useBrowseRecipeDetail,
  useRecipeStats,
  useMyRating,
  useIsFavorite,
  useToggleFavorite,
  useRateRecipe,
  useUpdateRating,
  useDeleteRating,
} from '../../hooks';

interface RecipeDetailScreenProps {
  route: {
    params: {
      recipeId: string;
    };
  };
}

type TabType = 'ingredients' | 'instructions' | 'reviews';

export default function RecipeDetailScreen({ route }: RecipeDetailScreenProps) {
  const navigation = useSimpleNavigation();
  const { recipeId } = route.params;
  const [activeTab, setActiveTab] = useState<TabType>('ingredients');
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState('');

  // Fetch data
  const { data: recipe, isLoading: recipeLoading } = useBrowseRecipeDetail(recipeId);
  const { data: stats, isLoading: statsLoading } = useRecipeStats(recipeId);
  const { data: myRating, isLoading: myRatingLoading } = useMyRating(recipeId);
  const { data: isFavorite, isLoading: favoriteLoading } = useIsFavorite(recipeId);

  // Mutations
  const toggleFavoriteMutation = useToggleFavorite(recipeId);
  const rateRecipeMutation = useRateRecipe(recipeId);
  const updateRatingMutation = useUpdateRating(recipeId, myRating?.id || '');
  const deleteRatingMutation = useDeleteRating(recipeId, myRating?.id || '');

  const isLoading = recipeLoading || statsLoading || myRatingLoading || favoriteLoading;

  // Handlers
  const handleToggleFavorite = () => {
    toggleFavoriteMutation.mutate();
  };

  const handleToggleIngredient = (index: number) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  const handleSubmitRating = () => {
    if (myRating) {
      // Update existing rating
      updateRatingMutation.mutate(
        { rating: ratingValue, review: reviewText || undefined },
        {
          onSuccess: () => {
            setShowRatingForm(false);
            setReviewText('');
          },
        }
      );
    } else {
      // Create new rating
      rateRecipeMutation.mutate(
        { rating: ratingValue, review: reviewText || undefined },
        {
          onSuccess: () => {
            setShowRatingForm(false);
            setReviewText('');
          },
        }
      );
    }
  };

  const handleDeleteRating = () => {
    Alert.alert('평가 삭제', '평가를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          deleteRatingMutation.mutate();
          setShowRatingForm(false);
        },
      },
    ]);
  };

  const handleEditRating = () => {
    if (myRating) {
      setRatingValue(myRating.rating);
      setReviewText(myRating.review || '');
      setShowRatingForm(true);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>레시피를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const difficultyMap: Record<string, string> = {
    easy: '쉬움',
    medium: '보통',
    hard: '어려움',
  };

  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  return (
    <View style={styles.container}>
      {/* Back Button Header */}
      <View style={styles.backHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Image */}
        {recipe.image_url ? (
          <Image
            source={{ uri: recipe.image_url }}
            style={styles.recipeImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>🍳</Text>
          </View>
        )}

      {/* Content */}
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{recipe.title}</Text>
            {recipe.description && (
              <Text style={styles.description}>{recipe.description}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleToggleFavorite}
            disabled={toggleFavoriteMutation.isPending}
          >
            <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>⏱ {totalTime}분</Text>
            <Text style={styles.metaLabel}>조리시간</Text>
          </View>
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

        {/* Rating Display */}
        {stats && (
          <View style={styles.ratingDisplay}>
            <Text style={styles.ratingStars}>
              {renderStars(stats.average_rating || 0)}
            </Text>
            <Text style={styles.ratingText}>
              {stats.average_rating?.toFixed(1) || '0.0'} ({stats.total_ratings}개 평가)
            </Text>
          </View>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ingredients' && styles.tabActive]}
            onPress={() => setActiveTab('ingredients')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'ingredients' && styles.tabTextActive,
              ]}
            >
              재료
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'instructions' && styles.tabActive]}
            onPress={() => setActiveTab('instructions')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'instructions' && styles.tabTextActive,
              ]}
            >
              조리법
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
            onPress={() => setActiveTab('reviews')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'reviews' && styles.tabTextActive,
              ]}
            >
              리뷰
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'ingredients' && (
          <View style={styles.section}>
            {recipe.ingredients.map((ingredient, index) => (
              <TouchableOpacity
                key={ingredient.id}
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
            ))}
          </View>
        )}

        {activeTab === 'instructions' && (
          <View style={styles.section}>
            {recipe.instructions.map((instruction) => (
              <View key={instruction.id} style={styles.instructionItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>
                    {instruction.step_number}
                  </Text>
                </View>
                <Text style={styles.instructionText}>
                  {instruction.description}
                </Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'reviews' && (
          <View style={styles.section}>
            {/* User's Own Rating */}
            {myRating && !showRatingForm && (
              <View style={styles.myRatingCard}>
                <View style={styles.myRatingHeader}>
                  <Text style={styles.myRatingTitle}>내 평가</Text>
                  <View style={styles.myRatingActions}>
                    <TouchableOpacity
                      onPress={handleEditRating}
                      style={styles.ratingActionButton}
                    >
                      <Text style={styles.ratingActionText}>수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleDeleteRating}
                      style={styles.ratingActionButton}
                    >
                      <Text style={[styles.ratingActionText, styles.deleteText]}>
                        삭제
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.myRatingStars}>
                  {renderStars(myRating.rating)}
                </Text>
                {myRating.review && (
                  <Text style={styles.myRatingReview}>{myRating.review}</Text>
                )}
              </View>
            )}

            {/* Add/Edit Rating Form */}
            {showRatingForm && (
              <View style={styles.ratingForm}>
                <Text style={styles.ratingFormTitle}>
                  {myRating ? '평가 수정' : '평가 작성'}
                </Text>
                <View style={styles.starSelector}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRatingValue(star)}
                    >
                      <Text style={styles.starButton}>
                        {star <= ratingValue ? '⭐' : '☆'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="리뷰를 작성해주세요 (선택)"
                  placeholderTextColor={colors.textMuted}
                  value={reviewText}
                  onChangeText={setReviewText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <View style={styles.ratingFormActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowRatingForm(false);
                      setReviewText('');
                      setRatingValue(5);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmitRating}
                    disabled={
                      rateRecipeMutation.isPending || updateRatingMutation.isPending
                    }
                  >
                    <Text style={styles.submitButtonText}>
                      {rateRecipeMutation.isPending || updateRatingMutation.isPending
                        ? '저장 중...'
                        : '저장'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Add Rating Button */}
            {!myRating && !showRatingForm && (
              <TouchableOpacity
                style={styles.addRatingButton}
                onPress={() => setShowRatingForm(true)}
              >
                <Text style={styles.addRatingButtonText}>⭐ 평가 작성하기</Text>
              </TouchableOpacity>
            )}

            {/* Stats Summary */}
            {stats && (
              <View style={styles.reviewStats}>
                <Text style={styles.reviewStatsText}>
                  평균 평점: {stats.average_rating?.toFixed(1) || '0.0'} / 5.0
                </Text>
                <Text style={styles.reviewStatsText}>
                  총 {stats.total_ratings}개의 평가
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
    </View>
  );
}

// Helper function to render stars
function renderStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    '⭐'.repeat(fullStars) +
    (hasHalfStar ? '⭐' : '') +
    '☆'.repeat(emptyStars)
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
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
  },
  favoriteButton: {
    padding: spacing.sm,
  },
  favoriteIcon: {
    fontSize: 32,
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
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  ratingStars: {
    fontSize: 20,
  },
  ratingText: {
    ...typography.body,
    color: colors.textSecondary,
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
  myRatingCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  myRatingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  myRatingTitle: {
    ...typography.h4,
    color: colors.text,
  },
  myRatingActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  ratingActionButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  ratingActionText: {
    ...typography.label,
    color: colors.primary,
  },
  deleteText: {
    color: colors.error,
  },
  myRatingStars: {
    fontSize: 20,
    marginBottom: spacing.sm,
  },
  myRatingReview: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  ratingForm: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  ratingFormTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  starSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  starButton: {
    fontSize: 32,
  },
  reviewInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    minHeight: 100,
    marginBottom: spacing.md,
  },
  ratingFormActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.label,
    color: colors.text,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  submitButtonText: {
    ...typography.label,
    color: colors.textLight,
    fontWeight: '600',
  },
  addRatingButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  addRatingButtonText: {
    ...typography.label,
    color: colors.textLight,
    fontWeight: '600',
  },
  reviewStats: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  reviewStatsText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
});
