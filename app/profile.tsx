import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '@/src/context/AuthContext';
import { getUserProfile, updateUserProfile, UserProfile, getNotificationPreferences, saveNotificationPreference } from '@/src/db/queries';
import { colors, radius, spacing, typography, globalStyles } from '@/src/styles/globals';
import { supabase } from '@/src/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { userId, session } = useAuth();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleFocus = (field: 'displayName' | 'username') => {
    setTimeout(() => {
      if (field === 'displayName') {
        scrollViewRef.current?.scrollTo({ y: 220, animated: true });
      } else if (field === 'username') {
        scrollViewRef.current?.scrollTo({ y: 310, animated: true });
      }
    }, 120);
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Profile data state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Auth modal state
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Notification states
  const [prefStreak, setPrefStreak] = useState(true);
  const [prefSync, setPrefSync] = useState(true);
  const [prefWorkout, setPrefWorkout] = useState(true);
  const [prefMeal, setPrefMeal] = useState(true);

  // Load user profile & preferences
  useEffect(() => {
    async function loadData() {
      setIsLoadingProfile(true);
      try {
        const data = await getUserProfile(db, userId);
        if (data) {
          setProfile(data);
          setDisplayName(data.name);
          setUsername(data.username);
        }

        const prefs = await getNotificationPreferences(db);
        setPrefStreak(prefs['pref_notification_streak'] !== '0');
        setPrefSync(prefs['pref_notification_sync'] !== '0');
        setPrefWorkout(prefs['pref_notification_workout'] !== '0');
        setPrefMeal(prefs['pref_notification_meal'] !== '0');
      } catch (e) {
        console.error('Failed to load user data:', e);
      } finally {
        setIsLoadingProfile(false);
      }
    }
    loadData();
  }, [db, userId]);

  const handleTogglePref = async (key: string, currentValue: boolean, setter: (val: boolean) => void) => {
    const newValue = !currentValue;
    setter(newValue);
    try {
      await saveNotificationPreference(db, key, newValue ? '1' : '0');
    } catch (e) {
      console.error(`Failed to save preference ${key}:`, e);
    }
  };

  // Handle saving personal details
  const handleSaveProfile = async () => {
    if (!displayName.trim() || !username.trim()) {
      Alert.alert('Validation Error', 'Display Name and Username cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      // Clean username (ensure it starts with @ for fitstat branding)
      let cleanUsername = username.trim();
      if (!cleanUsername.startsWith('@')) {
        cleanUsername = `@${cleanUsername}`;
      }

      await updateUserProfile(db, userId, cleanUsername, displayName.trim());
      setProfile((prev) => prev ? { ...prev, name: displayName.trim(), username: cleanUsername } : null);
      setUsername(cleanUsername);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (e) {
      console.error('Failed to update profile:', e);
      Alert.alert('Error', 'Username may already be taken.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Auth submission
  const handleAuthSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setAuthError('Email and Password are required.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setAuthError(null);
    setIsAuthLoading(true);
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
        Alert.alert('Verification', 'Please check your email to complete registration.');
      }
      setAuthModalVisible(false);
      setEmail('');
      setPassword('');
    } catch (e: any) {
      console.error('Auth error:', e);
      setAuthError(e.message || 'Authentication failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your account will return to local offline mode.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
            } catch (e) {
              console.error('Sign out error:', e);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {isLoadingProfile ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { flexGrow: 1, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 80 }
            ]}
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios' ? false : true}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* User Info Card */}
            <View style={styles.userInfoCard}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={36} color={colors.background} />
              </View>
              <View style={styles.userInfoText}>
                <Text style={styles.profileName}>{profile?.name || 'Dev Tester'}</Text>
                <Text style={styles.profileUsername}>{profile?.username || '@dev_tester'}</Text>
              </View>
            </View>

            {/* Cloud Sync Section */}
            <Text style={styles.sectionTitle}>Cloud Backup & Sync</Text>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons
                    name={session ? 'cloud-done' : 'cloud-offline-outline'}
                    size={20}
                    color={session ? colors.success : colors.textSecondary}
                  />
                  <Text style={styles.cardTitle}>Cloud Database Sync</Text>
                </View>
                <View style={[styles.statusBadge, session ? styles.statusBadgeSynced : styles.statusBadgeOffline]}>
                  <Text style={[styles.statusBadgeText, session ? styles.statusTextSynced : styles.statusTextOffline]}>
                    {session ? 'Synced' : 'Offline-Only'}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardDescription}>
                {session
                  ? `Fully backed up to the cloud. Synced with ${session.user.email}.`
                  : 'Your logs are currently stored offline on this device. Connect cloud sync to enable multiple devices backup.'}
              </Text>

              {session ? (
                <Pressable
                  style={({ pressed }) => [styles.btnDanger, pressed && { opacity: 0.8 }]}
                  onPress={handleSignOut}
                >
                  <Ionicons name="log-out-outline" size={18} color={colors.alert} />
                  <Text style={styles.btnDangerText}>Disconnect Cloud Sync</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.8 }]}
                  onPress={() => {
                    setAuthError(null);
                    setAuthModalVisible(true);
                  }}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color={colors.background} />
                  <Text style={styles.btnPrimaryText}>Enable Cloud Sync</Text>
                </Pressable>
              )}
            </View>

            {/* Profile Details Edit Card */}
            <Text style={styles.sectionTitle}>Personal Details</Text>
            <View style={styles.card}>
              <Text style={styles.inputLabel}>DISPLAY NAME</Text>
              <TextInput
                style={styles.textInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your display name"
                placeholderTextColor={colors.textMuted}
                onFocus={() => handleFocus('displayName')}
              />

              <Text style={styles.inputLabel}>USERNAME</Text>
              <TextInput
                style={styles.textInput}
                value={username}
                onChangeText={setUsername}
                placeholder="e.g. @username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => handleFocus('username')}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.btnSave,
                  pressed && { opacity: 0.8 },
                  isSaving && { opacity: 0.6 },
                ]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.background} />
                    <Text style={styles.btnSaveText}>Save Profile Changes</Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Notification Preferences */}
            <Text style={styles.sectionTitle}>Notification Settings</Text>
            <View style={styles.card}>
              {/* Streak reset warning */}
              <View style={styles.preferenceRow}>
                <View style={styles.preferenceLeft}>
                  <Ionicons name="flame-outline" size={19} color={colors.textSecondary} />
                  <Text style={styles.preferenceLabel}>Streak Reset Warnings</Text>
                </View>
                <Pressable
                  onPress={() => handleTogglePref('pref_notification_streak', prefStreak, setPrefStreak)}
                  style={[styles.toggleTrack, prefStreak && styles.toggleTrackActive]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      prefStreak ? styles.toggleThumbActive : styles.toggleThumbInactive,
                    ]}
                  />
                </Pressable>
              </View>

              {/* Cloud backup alert */}
              <View style={[styles.preferenceRow, { marginTop: spacing.md }]}>
                <View style={styles.preferenceLeft}>
                  <Ionicons name="cloud-offline-outline" size={19} color={colors.textSecondary} />
                  <Text style={styles.preferenceLabel}>Cloud Sync Status Alerts</Text>
                </View>
                <Pressable
                  onPress={() => handleTogglePref('pref_notification_sync', prefSync, setPrefSync)}
                  style={[styles.toggleTrack, prefSync && styles.toggleTrackActive]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      prefSync ? styles.toggleThumbActive : styles.toggleThumbInactive,
                    ]}
                  />
                </Pressable>
              </View>

              {/* Workout reminders */}
              <View style={[styles.preferenceRow, { marginTop: spacing.md }]}>
                <View style={styles.preferenceLeft}>
                  <Ionicons name="barbell-outline" size={19} color={colors.textSecondary} />
                  <Text style={styles.preferenceLabel}>Workout Logging Reminders</Text>
                </View>
                <Pressable
                  onPress={() => handleTogglePref('pref_notification_workout', prefWorkout, setPrefWorkout)}
                  style={[styles.toggleTrack, prefWorkout && styles.toggleTrackActive]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      prefWorkout ? styles.toggleThumbActive : styles.toggleThumbInactive,
                    ]}
                  />
                </Pressable>
              </View>

              {/* Meal diary alerts */}
              <View style={[styles.preferenceRow, { marginTop: spacing.md }]}>
                <View style={styles.preferenceLeft}>
                  <Ionicons name="restaurant-outline" size={19} color={colors.textSecondary} />
                  <Text style={styles.preferenceLabel}>Nutrition Diary Alerts</Text>
                </View>
                <Pressable
                  onPress={() => handleTogglePref('pref_notification_meal', prefMeal, setPrefMeal)}
                  style={[styles.toggleTrack, prefMeal && styles.toggleTrackActive]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      prefMeal ? styles.toggleThumbActive : styles.toggleThumbInactive,
                    ]}
                  />
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Auth Bottom Sheet / Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={authModalVisible}
        onRequestClose={() => setAuthModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
          <Pressable style={styles.modalDismissArea} onPress={() => setAuthModalVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connect Cloud Sync</Text>
              <Pressable onPress={() => setAuthModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Switcher Tab */}
            <View style={styles.tabContainer}>
              <Pressable
                style={[styles.tab, authMode === 'login' && styles.tabActive]}
                onPress={() => {
                  setAuthMode('login');
                  setAuthError(null);
                }}
              >
                <Text style={[styles.tabText, authMode === 'login' && styles.tabTextActive]}>LOG IN</Text>
              </Pressable>
              <Pressable
                style={[styles.tab, authMode === 'register' && styles.tabActive]}
                onPress={() => {
                  setAuthMode('register');
                  setAuthError(null);
                }}
              >
                <Text style={[styles.tabText, authMode === 'register' && styles.tabTextActive]}>REGISTER</Text>
              </Pressable>
            </View>

            {authError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.alert} />
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.modalInput}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>PASSWORD</Text>
            <TextInput
              style={styles.modalInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter secure password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              style={({ pressed }) => [
                styles.modalSubmitBtn,
                pressed && { opacity: 0.8 },
                isAuthLoading && { opacity: 0.6 },
              ]}
              onPress={handleAuthSubmit}
              disabled={isAuthLoading}
            >
              {isAuthLoading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.modalSubmitBtnText}>
                  {authMode === 'login' ? 'Confirm and Log In' : 'Create Free Account'}
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    ...typography.titleLarge,
    color: colors.text,
  },
  headerPlaceholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoText: {
    gap: 4,
  },
  profileName: {
    ...typography.titleMedium,
    color: colors.text,
    fontSize: 18,
  },
  profileUsername: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.titleSmall,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  statusBadgeSynced: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderColor: colors.success,
  },
  statusBadgeOffline: {
    backgroundColor: 'rgba(136, 136, 168, 0.1)',
    borderColor: colors.textSecondary,
  },
  statusBadgeText: {
    ...typography.labelSmall,
    fontSize: 9,
    fontFamily: 'Jura-Bold',
  },
  statusTextSynced: {
    color: colors.success,
  },
  statusTextOffline: {
    color: colors.textSecondary,
  },
  cardDescription: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  btnPrimary: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  btnPrimaryText: {
    ...typography.titleSmall,
    color: colors.background,
  },
  btnDanger: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.alert,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  btnDangerText: {
    ...typography.titleSmall,
    color: colors.alert,
  },
  inputLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  textInput: {
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    ...typography.bodyMedium,
    color: colors.text,
    marginBottom: spacing.md,
  },
  btnSave: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  btnSaveText: {
    ...typography.titleSmall,
    color: colors.background,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  preferenceLabel: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: 'rgba(74, 222, 128, 0.25)',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  toggleThumbActive: {
    backgroundColor: colors.success,
    alignSelf: 'flex-end',
  },
  toggleThumbInactive: {
    backgroundColor: colors.textMuted,
    alignSelf: 'flex-start',
  },

  // Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.titleLarge,
    color: colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontFamily: 'Jura-Bold',
  },
  tabTextActive: {
    color: colors.primary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: colors.alert,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.alert,
    flex: 1,
  },
  modalInput: {
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    ...typography.bodyMedium,
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalSubmitBtn: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  modalSubmitBtnText: {
    ...typography.titleSmall,
    color: colors.background,
  },
});
