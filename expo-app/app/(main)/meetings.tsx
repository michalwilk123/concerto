import {
  FlatList,
  StyleSheet,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useGroupsStore } from "@/stores/groups-store";
import { useMeetingsStore } from "@/stores/meetings-store";
import { colors, spacing } from "@/constants/theme";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
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
    <Card padding="lg" style={styles.card}>
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Typography
            variant="titleMd"
            numberOfLines={1}
            style={styles.meetingName}
          >
            {item.name}
          </Typography>
          <Badge
            label={item.isPublic ? "Public" : "Private"}
            tone={item.isPublic ? "green" : "purple"}
          />
        </View>
        <Typography variant="caption" tone="tertiary">
          {new Date(item.createdAt).toLocaleDateString()}
        </Typography>
      </View>
      <Button
        title="Open"
        onPress={() => handleJoin(item)}
        variant="secondary"
        size="sm"
      />
    </Card>
  );

  if (!selectedGroupId) {
    return (
      <View style={styles.empty}>
        <Typography variant="titleMd" tone="secondary">
          No group selected
        </Typography>
        <Typography variant="body" tone="tertiary" style={styles.emptySub}>
          Open the sidebar to select a group
        </Typography>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBar}>
          <Typography variant="bodySm" tone="danger" style={styles.errorText}>
            {error}
          </Typography>
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
              <Typography variant="titleMd" tone="secondary">
                No meetings
              </Typography>
              <Typography variant="body" tone="tertiary" style={styles.emptySub}>
                Pull down to refresh
              </Typography>
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
    flexDirection: "row",
    alignItems: "center",
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
    flexShrink: 1,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bgPrimary,
  },
  emptySub: {
    marginTop: spacing.xs,
  },
  errorBar: {
    backgroundColor: "rgba(229, 57, 53, 0.15)",
    padding: spacing.md,
  },
  errorText: {
    textAlign: "center",
  },
});
