import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSimpleNavigation } from '../../navigation/CustomNavigationContext';
import { useShoppingLists } from '../../hooks';
import { colors, typography, spacing, borderRadius, shadow } from '../../styles';
import type { ShoppingList } from '@meal-planning/shared-types';

export default function ShoppingListsScreen() {
  const navigation = useSimpleNavigation();
  const { data, isLoading, error, refetch } = useShoppingLists();

  const handlePress = (listId: string) => {
    navigation.navigate('ShoppingListDetail', { listId });
  };

  const renderListItem = ({ item }: { item: ShoppingList }) => {
    // Calculate progress from items (if available in the future)
    // For now, just show the list
    const itemCount = 0; // Will be populated when we fetch items
    const checkedCount = 0;
    const progress = itemCount > 0 ? (checkedCount / itemCount) * 100 : 0;
    const isComplete = itemCount > 0 && checkedCount === itemCount;

    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => handlePress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.listHeader}>
          <View style={[styles.listIcon, isComplete && styles.listIconComplete]}>
            <Text style={styles.listIconText}>{isComplete ? '✅' : '🛒'}</Text>
          </View>
          <View style={styles.listInfo}>
            <Text style={styles.listName}>{item.name}</Text>
            <Text style={styles.listMeta}>
              {new Date(item.created_at).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
              })}
              {item.meal_plan_id && ' • 식사 계획에서 생성됨'}
            </Text>
          </View>
        </View>
        {itemCount > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>오류가 발생했습니다</Text>
        <Text style={styles.errorSubtitle}>
          {error instanceof Error ? error.message : '알 수 없는 오류'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetch()}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lists = data?.data || [];

  return (
    <View style={styles.container}>
      <FlatList
        data={lists}
        renderItem={renderListItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          lists.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyTitle}>장보기 목록이 없습니다</Text>
              <Text style={styles.emptySubtitle}>
                식사 계획에서 자동으로 생성하세요
              </Text>
            </View>
          ) : null
        }
      />

      {isLoading && lists.length === 0 && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>장보기 목록 불러오는 중...</Text>
        </View>
      )}

      {/* FAB - for future manual list creation */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          // TODO: Implement manual list creation
          console.log('Create new shopping list');
        }}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.md,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  listIconComplete: {
    backgroundColor: colors.successLight,
  },
  listIconText: {
    fontSize: 24,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  listMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    width: 40,
    textAlign: 'right',
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
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
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
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.textLight,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
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
});
