import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRecipes, useMealPlans, useShoppingLists } from '../../hooks';
import { colors, typography, spacing, borderRadius, shadow } from '../../styles';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const { data: recipesData } = useRecipes();
  const { data: mealPlansData } = useMealPlans();
  const { data: shoppingListsData } = useShoppingLists();

  const recipeCount = recipesData?.meta?.total ?? '-';
  const mealPlanCount = mealPlansData?.meta?.total ?? '-';
  const shoppingListCount = shoppingListsData?.meta?.total ?? '-';

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: logout },
      ]
    );
  };

  const dietaryLabels: Record<string, string> = {
    vegetarian: '채식',
    vegan: '비건',
    gluten_free: '글루텐프리',
    dairy_free: '유제품 제외',
    nut_free: '견과류 제외',
    halal: '할랄',
    kosher: '코셔',
    low_carb: '저탄수화물',
    keto: '키토',
    paleo: '팔레오',
  };

  const allergenLabels: Record<string, string> = {
    eggs: '달걀',
    milk: '우유',
    peanuts: '땅콩',
    tree_nuts: '견과류',
    fish: '생선',
    shellfish: '갑각류',
    wheat: '밀',
    soy: '대두',
    sesame: '참깨',
  };

  const menuItems = [
    { icon: '👤', label: '프로필 수정', onPress: () => {} },
    { icon: '🥗', label: '식이 제한 설정', onPress: () => {} },
    { icon: '⚠️', label: '알러지 설정', onPress: () => {} },
    { icon: '🔔', label: '알림 설정', onPress: () => {} },
    { icon: '❓', label: '도움말', onPress: () => {} },
    { icon: '📧', label: '문의하기', onPress: () => {} },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || '사용자'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
        {user?.servings_default && (
          <Text style={styles.userDetail}>기본 인분: {user.servings_default}인분</Text>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{recipeCount}</Text>
          <Text style={styles.statLabel}>레시피</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{mealPlanCount}</Text>
          <Text style={styles.statLabel}>식사 계획</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{shoppingListCount}</Text>
          <Text style={styles.statLabel}>장보기 목록</Text>
        </View>
      </View>

      {/* Dietary Restrictions */}
      {user?.dietary_restrictions && user.dietary_restrictions.length > 0 && (
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>🥗 식이 제한</Text>
          <View style={styles.tagContainer}>
            {user.dietary_restrictions.map((item) => (
              <View key={item} style={styles.tag}>
                <Text style={styles.tagText}>{dietaryLabels[item] || item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Allergens */}
      {user?.allergens && user.allergens.length > 0 && (
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>⚠️ 알러지</Text>
          <View style={styles.tagContainer}>
            {user.allergens.map((item) => (
              <View key={item} style={[styles.tag, styles.allergenTag]}>
                <Text style={[styles.tagText, styles.allergenTagText]}>{allergenLabels[item] || item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>로그아웃</Text>
      </TouchableOpacity>

      {/* App Version */}
      <Text style={styles.versionText}>버전 0.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.h1,
    color: colors.textLight,
  },
  userName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userEmail: {
    ...typography.body,
    color: colors.textSecondary,
  },
  userDetail: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadow.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  infoSection: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadow.sm,
  },
  infoSectionTitle: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tagText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  allergenTag: {
    backgroundColor: colors.errorLight,
    borderColor: colors.error,
  },
  allergenTagText: {
    color: colors.error,
  },
  menuContainer: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadow.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  menuLabel: {
    flex: 1,
    ...typography.body,
    color: colors.text,
  },
  menuArrow: {
    ...typography.h3,
    color: colors.textMuted,
  },
  logoutButton: {
    marginTop: spacing['2xl'],
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  logoutButtonText: {
    ...typography.button,
    color: colors.error,
  },
  versionText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing['3xl'],
  },
});
