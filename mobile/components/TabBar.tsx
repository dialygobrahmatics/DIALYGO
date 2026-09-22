import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, radius, spacing } from '../theme/tokens';

type TabItem = { name: string; label: string; icon: keyof typeof Feather.glyphMap };

/** Custom bottom navigation: predictable testIDs, Dialygo styling and a central upload action. */
export function DialygoTabBar({
  state,
  navigation,
  items,
  fab,
  prefix,
}: {
  state: any;
  navigation: any;
  items: TabItem[];
  fab?: { icon: keyof typeof Feather.glyphMap; route: string; testID: string; label: string };
  prefix: string;
}) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;
  const half = Math.ceil(items.length / 2);
  const left = fab ? items.slice(0, half) : items;
  const right = fab ? items.slice(half) : [];

  const renderItem = (item: TabItem) => {
    const focused = activeName === item.name;
    const color = focused ? colors.navy : colors.textMuted;
    return (
      <Pressable
        key={item.name}
        testID={`${prefix}-tab-${item.name === 'index' ? 'home' : item.name}`}
        onPress={() => navigation.navigate(item.name)}
        style={styles.item}
      >
        <Feather name={item.icon} size={19} color={color} />
        <Text style={[styles.label, { color }]}>{item.label}</Text>
        {focused ? <View style={styles.activeDot} /> : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} testID={`${prefix}-tab-bar`}>
      {left.map(renderItem)}
      {fab ? (
        <Pressable testID={fab.testID} onPress={() => router.push(fab.route as any)} style={styles.fabWrap}>
          <View style={styles.fab}>
            <Feather name={fab.icon} size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.fabLabel}>{fab.label}</Text>
        </Pressable>
      ) : null}
      {right.map(renderItem)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  item: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2 },
  label: { fontSize: 10, fontWeight: '600' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.saffron },
  fabWrap: { flex: 1, alignItems: 'center', marginTop: -26 },
  fab: {
    width: 50,
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
  },
  fabLabel: { fontSize: 10, fontWeight: '700', color: colors.saffron, marginTop: 4 },
});
