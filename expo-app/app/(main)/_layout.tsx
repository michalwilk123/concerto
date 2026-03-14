import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { useGroupsStore } from "@/stores/groups-store";
import { colors, spacing, radius } from "@/constants/theme";

function CustomDrawerContent() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { groups, selectedGroupId, isLoading, selectGroup } = useGroupsStore();

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <DrawerContentScrollView
      style={styles.drawer}
      contentContainerStyle={styles.drawerContent}
    >
      <View style={styles.header}>
        <Text style={styles.appName}>Concerto</Text>
        <Text style={styles.userName} numberOfLines={1}>
          {user?.name}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Groups</Text>
        {isLoading ? (
          <ActivityIndicator
            color={colors.accentPurple}
            style={{ marginTop: spacing.md }}
          />
        ) : (
          groups.map((group) => (
            <Pressable
              key={group.id}
              style={[
                styles.groupItem,
                group.id === selectedGroupId && styles.groupItemActive,
              ]}
              onPress={() => selectGroup(group.id)}
            >
              <Text
                style={[
                  styles.groupItemText,
                  group.id === selectedGroupId && styles.groupItemTextActive,
                ]}
                numberOfLines={1}
              >
                {group.name}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Pressable
          style={styles.navItem}
          onPress={() => router.navigate("/(main)/meetings")}
        >
          <Text style={styles.navItemText}>Meetings</Text>
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={() => router.navigate("/(main)/files")}
        >
          <Text style={styles.navItemText}>Files</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
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
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: colors.accentPurple,
    marginBottom: spacing.xs,
  },
  userName: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
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
  groupItemText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: colors.textSecondary,
  },
  groupItemTextActive: {
    color: colors.accentPurple,
  },
  navItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  navItemText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: colors.textPrimary,
  },
  footer: {
    marginTop: "auto",
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  logoutButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  logoutText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: colors.accentRed,
  },
});
