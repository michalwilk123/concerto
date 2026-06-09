import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { useGroupsStore } from "@/stores/groups-store";
import { colors, spacing, radius } from "@/constants/theme";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";

function CustomDrawerContent() {
  const router = useRouter();
  const { user, logout, deleteAccount } = useAuthStore();
  const { groups, selectedGroupId, isLoading, selectGroup } = useGroupsStore();

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace("/(auth)/login");
            } catch (e: any) {
              Alert.alert("Could not delete account", e?.message ?? "Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <DrawerContentScrollView
      style={styles.drawer}
      contentContainerStyle={styles.drawerContent}
    >
      <View style={styles.header}>
        <Typography variant="titleLg" style={styles.appName}>
          Concerto
        </Typography>
        <Typography variant="body" tone="secondary" numberOfLines={1}>
          {user?.name}
        </Typography>
      </View>

      <View style={styles.section}>
        <Typography variant="overline" tone="tertiary" style={styles.sectionTitle}>
          Groups
        </Typography>
        {isLoading ? (
          <ActivityIndicator
            color={colors.accentPurple}
            style={{ marginTop: spacing.md }}
          />
        ) : (
          groups.map((group) => {
            const active = group.id === selectedGroupId;
            return (
              <Pressable
                key={group.id}
                style={[styles.groupItem, active && styles.groupItemActive]}
                onPress={() => selectGroup(group.id)}
              >
                <Typography
                  variant="body"
                  tone={active ? "primary" : "secondary"}
                  weight="medium"
                  numberOfLines={1}
                  style={active ? styles.groupItemTextActive : undefined}
                >
                  {group.name}
                </Typography>
              </Pressable>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <Pressable
          style={styles.navItem}
          onPress={() => router.navigate("/(main)/meetings")}
        >
          <Typography variant="body" weight="medium">
            Meetings
          </Typography>
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => router.navigate("/(main)/files")}
        >
          <Typography variant="body" weight="medium">
            Files
          </Typography>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="ghost"
          size="sm"
        />
        <Button
          title="Delete Account"
          onPress={handleDeleteAccount}
          variant="danger"
          size="sm"
        />
      </View>
    </DrawerContentScrollView>
  );
}

export default function MainLayout() {
  return (
    <Drawer
      drawerContent={() => <CustomDrawerContent />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgSecondary },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontFamily: "DMSans_600SemiBold" },
        drawerStyle: { backgroundColor: colors.bgPrimary },
      }}
    >
      <Drawer.Screen
        name="meetings"
        options={{ title: "Meetings" }}
      />
      <Drawer.Screen
        name="files"
        options={{ title: "Files" }}
      />
      <Drawer.Screen
        name="meeting"
        options={{
          title: "Meeting",
          headerShown: false,
          drawerItemStyle: { display: "none" },
          swipeEnabled: false,
        }}
      />
      <Drawer.Screen
        name="meeting-webview"
        options={{
          title: "Meeting",
          headerShown: false,
          drawerItemStyle: { display: "none" },
          swipeEnabled: false,
        }}
      />
      <Drawer.Screen
        name="meeting-detail"
        options={{
          title: "Meeting",
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawer: {
    backgroundColor: colors.bgPrimary,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: spacing.lg,
  },
  appName: {
    color: colors.accentPurple,
    marginBottom: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  groupItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: 2,
  },
  groupItemActive: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
  },
  groupItemTextActive: {
    color: colors.accentPurple,
  },
  navItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  footer: {
    marginTop: "auto",
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    alignItems: "flex-start",
    gap: spacing.xs,
  },
});
