# Navigation Quick Reference

## How It Works

### Architecture
```
CustomNavigationContext
├── Tab Stacks (recipes, mealplans, shopping, profile)
│   └── Screen Stack (array of {name, params})
├── navigate(screen, params) → pushes to current tab's stack
└── goBack() → pops from current tab's stack

App.tsx → ContentRenderer
├── Check screen stack
│   ├── Has screen? → Render detail screen
│   └── Empty? → Render default tab screen
```

### Navigation Flow Example

**User taps recipe card:**
```typescript
// RecipeListScreen.tsx
navigation.navigate('RecipeDetail', { recipeId: '123' })
  ↓
// CustomNavigationContext pushes to recipes tab stack
tabStacks.recipes = [{ name: 'RecipeDetail', params: { recipeId: '123' }}]
  ↓
// ContentRenderer sees stack entry, renders RecipeDetailScreen
<RecipeDetailScreen route={{ params: { recipeId: '123' }}} />
```

**User taps back button:**
```typescript
// RecipeDetailScreen.tsx
navigation.goBack()
  ↓
// CustomNavigationContext pops from recipes tab stack
tabStacks.recipes = []
  ↓
// ContentRenderer sees empty stack, renders default tab screen
<RecipeListScreen />
```

## Screen Mapping

| Screen Name | Component | Required Params | Tab |
|-------------|-----------|-----------------|-----|
| `RecipeDetail` | RecipeDetailScreen | `{ recipeId: string }` | recipes |
| `RecipeForm` | RecipeFormScreen | `{ recipeId?: string }` | recipes |
| `AddMeal` | AddMealScreen | `{ date: string, mealType: string }` | mealplans |
| `ShoppingListDetail` | ShoppingListDetailScreen | `{ listId: string }` | shopping |

## Common Patterns

### Navigate to Detail
```typescript
import { useSimpleNavigation } from '../../navigation/CustomNavigationContext';

const navigation = useSimpleNavigation();
navigation.navigate('RecipeDetail', { recipeId: recipe.id });
```

### Add Back Button
```tsx
import { useSimpleNavigation } from '../../navigation/CustomNavigationContext';

function MyScreen() {
  const navigation = useSimpleNavigation();
  
  return (
    <View>
      <View style={styles.backHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>
      </View>
      {/* Rest of screen */}
    </View>
  );
}

const styles = StyleSheet.create({
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
  backButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
```

### Access Current Screen Stack
```typescript
import { useNavigationState } from '../../navigation/CustomNavigationContext';

const { screenStack, activeTab } = useNavigationState();
const currentScreen = screenStack[screenStack.length - 1];
```

## Key Files

| File | Purpose |
|------|---------|
| `src/navigation/CustomNavigationContext.tsx` | Navigation state management |
| `App.tsx` | ContentRenderer - maps screen names to components |
| `src/screens/*/AddMealScreen.tsx` | New screen for selecting recipes for meals |
| `NAVIGATION_FIX_SUMMARY.md` | Complete implementation details |

## Debugging Tips

### Check Current Stack
```typescript
const { screenStack } = useNavigationState();
console.log('Current stack:', screenStack);
```

### Verify Navigation Calls
```typescript
navigation.navigate('RecipeDetail', { recipeId: '123' });
// Check: Is screen name in ROUTE_TO_TAB mapping?
// Check: Are params being passed correctly?
```

### Screen Not Rendering?
1. Check ContentRenderer in App.tsx has the screen case
2. Verify screen name matches exactly (case-sensitive)
3. Check component is imported in App.tsx
4. Verify props interface matches route.params structure

## Cross-Tab Navigation

Navigate to a screen on a different tab:
```typescript
// From recipes tab, navigate to shopping detail
navigation.navigate('ShoppingListDetail', { listId: '456' });
// Result: Switches to shopping tab AND pushes ShoppingListDetail
```

## State Persistence

✅ **Persists between navigations:** Screen stack for each tab  
❌ **Does NOT persist:** 
- Across app restarts
- When switching tabs (intentional design)
- Component state when unmounted

