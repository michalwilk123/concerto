import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useGroupsStore } from "@/stores/groups-store";
import { useMeetingsStore } from "@/stores/meetings-store";
import { colors, spacing, radius } from "@/constants/theme";
import type { Meeting } from "@/lib/types";

export default function MeetingsScreen() {
  const router = useRouter();
  const selectedGroupId = useGroupsStore((s) => s.selectedGroupId);
  const { meetings, isLoading, error, fetchMeetings } = useMeetingsStore();

  const handleJoin = (meeting: Meeting) => {
    router.push({
      pathname: "/(main)/meeting-detail",
      params: { meetingId: meeting.id, meetingName: meeting.name },
    });
  };

  const renderItem = ({ item }: { item: Meeting }) => (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.meetingName} numberOfLines={1}>
            {item.name}
          </Text>
          <View
            style={[
              styles.badge,
              item.isPublic ? styles.badgePublic : styles.badgePrivate,
            ]}
          >
            <Text style={styles.badgeText}>
              {item.isPublic ? "Public" : "Private"}
            </Text>
          </View>
        </View>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Pressable style={styles.joinButton} onPress={() => handleJoin(item)}>
        <Text style={styles.joinButtonText}>Open</Text>
      </Pressable>
    </View>
  );

  if (!selectedGroupId) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No group selected</Text>
        <Text style={styles.emptySubtext}>
          Open the sidebar to select a group
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <FlatList
        data={meetings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          meetings.length === 0 ? styles.emptyList : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              if (selectedGroupId) {
                void fetchMeetings(selectedGroupId);
              }
            }}
            tintColor={colors.accentPurple}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              color={colors.accentPurple}
              size="large"
              style={{ marginTop: 60 }}
            />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No meetings</Text>
              <Text style={styles.emptySubtext}>
                Pull down to refresh
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  emptyList: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardBody: {
    flex: 1,
    marginRight: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  meetingName: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: colors.textPrimary,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgePublic: {
    backgroundColor: "rgba(61, 155, 79, 0.2)",
  },
  badgePrivate: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: colors.textSecondary,
  },
  date: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: colors.textTertiary,
  },
  joinButton: {
    backgroundColor: colors.accentPurple,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  joinButtonText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bgPrimary,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: colors.textTertiary,
  },
  errorBar: {
    backgroundColor: "rgba(229, 57, 53, 0.15)",
    padding: spacing.md,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: colors.accentRed,
    textAlign: "center",
  },
});
