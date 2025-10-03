import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Alert,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { themeService, type Theme } from '@/services/theme';
import { profileService } from '@/services/profile';
import { authService } from '@/services/auth';
import { notificationService } from '@/services/notifications';
import { AnimationService, AnimationPresets } from '@/services/animations';
import type { UserProfile, Achievement } from '@/types/User';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>(themeService.getCurrentTheme());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Animation values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);
  const scaleAnim = new Animated.Value(0.9);

  useEffect(() => {
    const unsubscribeTheme = themeService.subscribe(setTheme);
    const unsubscribeProfile = profileService.subscribe(setProfile);
    
    // Animate on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: AnimationService.createSlideInAnimation().slideIn,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    setIsLoading(false);

    return () => {
      unsubscribeTheme();
      unsubscribeProfile();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      router.replace('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleThemeToggle = async () => {
    const newTheme = themeService.getCurrentTheme().mode === 'light' ? 'dark' : 'light';
    await themeService.setTheme(newTheme);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleNotificationToggle = async () => {
    if (!profile) return;
    
    const newNotificationState = !profile.preferences.notifications.enabled;
    await profileService.updatePreferences({
      notifications: { ...profile.preferences.notifications, enabled: newNotificationState }
    });

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleAutoBackupToggle = async () => {
    if (!profile) return;
    
    const newBackupState = !profile.preferences.autoBackup.enabled;
    await profileService.updatePreferences({
      autoBackup: { ...profile.preferences.autoBackup, enabled: newBackupState }
    });

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return '👑';
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '⭐';
    return '📚';
  };

  const getAchievementColor = (category: Achievement['category']) => {
    switch (category) {
      case 'attendance': return theme.colors.success;
      case 'streak': return theme.colors.warning;
      case 'milestone': return theme.colors.primary;
      case 'special': return theme.colors.secondary;
      default: return theme.colors.gray[500];
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading profile...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: insets.top }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => setShowEditModal(true)}
            >
              <Ionicons name="pencil" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <LinearGradient
            colors={[theme.colors.pastel.purple, theme.colors.pastel.blue]}
            style={styles.profileCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.profileInfo}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.white }]}>
                <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                  {profile?.displayName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.profileDetails}>
                <Text style={[styles.displayName, { color: theme.colors.white }]}>
                  {profile?.displayName || 'User'}
                </Text>
                <Text style={[styles.email, { color: theme.colors.white }]}>
                  {profile?.email || 'user@example.com'}
                </Text>
                <Text style={[styles.joinDate, { color: theme.colors.white }]}>
                  Joined {new Date(profile?.createdAt || Date.now()).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: theme.colors.pastel.orange }]}>
                <Text style={styles.statEmoji}>{getStreakEmoji(profile?.streakCount || 0)}</Text>
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {profile?.streakCount || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Current Streak
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: theme.colors.pastel.green }]}>
                <Text style={styles.statEmoji}>🎯</Text>
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {profile?.totalAttendanceDays || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Total Days
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: theme.colors.pastel.pink }]}>
                <Text style={styles.statEmoji}>🏆</Text>
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {profile?.achievements.length || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Achievements
              </Text>
            </View>
          </View>

          {/* Achievements Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Achievements</Text>
              <TouchableOpacity onPress={() => setShowAchievements(true)}>
                <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
              {profile?.achievements.slice(0, 5).map((achievement) => (
                <View 
                  key={achievement.id}
                  style={[
                    styles.achievementCard, 
                    { 
                      backgroundColor: theme.colors.surface,
                      borderColor: getAchievementColor(achievement.category) + '20'
                    }
                  ]}
                >
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                  <Text style={[styles.achievementTitle, { color: theme.colors.text }]}>
                    {achievement.title}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Settings</Text>
            
            <View style={[styles.settingsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons 
                    name={theme.mode === 'dark' ? 'moon' : 'sunny'} 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Dark Mode</Text>
                    <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                      Switch between light and dark themes
                    </Text>
                  </View>
                </View>
                <Switch
                  value={theme.mode === 'dark'}
                  onValueChange={handleThemeToggle}
                  trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary }}
                  thumbColor={theme.colors.white}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons name="notifications" size={24} color={theme.colors.primary} />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Notifications</Text>
                    <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                      Get attendance reminders
                    </Text>
                  </View>
                </View>
                <Switch
                  value={profile?.preferences.notifications.enabled || false}
                  onValueChange={handleNotificationToggle}
                  trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary }}
                  thumbColor={theme.colors.white}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons name="cloud-upload" size={24} color={theme.colors.primary} />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Auto Backup</Text>
                    <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                      Automatically backup data daily
                    </Text>
                  </View>
                </View>
                <Switch
                  value={profile?.preferences.autoBackup.enabled || false}
                  onValueChange={handleAutoBackupToggle}
                  trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary }}
                  thumbColor={theme.colors.white}
                />
              </View>
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity 
            style={[styles.signOutButton, { backgroundColor: theme.colors.danger + '20', borderColor: theme.colors.danger }]}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out" size={20} color={theme.colors.danger} />
            <Text style={[styles.signOutText, { color: theme.colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Display Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={profile?.displayName || ''}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Phone Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={profile?.phone || ''}
                  placeholder="Enter your phone number"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
              
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Achievements Modal */}
      <Modal
        visible={showAchievements}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAchievements(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Achievements</Text>
              <TouchableOpacity onPress={() => setShowAchievements(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.achievementsModalContent}>
              {profile?.achievements.map((achievement) => (
                <View 
                  key={achievement.id}
                  style={[
                    styles.achievementModalCard, 
                    { 
                      backgroundColor: theme.colors.background,
                      borderColor: getAchievementColor(achievement.category) + '20'
                    }
                  ]}
                >
                  <Text style={styles.achievementModalIcon}>{achievement.icon}</Text>
                  <View style={styles.achievementModalInfo}>
                    <Text style={[styles.achievementModalTitle, { color: theme.colors.text }]}>
                      {achievement.title}
                    </Text>
                    <Text style={[styles.achievementModalDescription, { color: theme.colors.textSecondary }]}>
                      {achievement.description}
                    </Text>
                    <Text style={[styles.achievementModalDate, { color: theme.colors.textSecondary }]}>
                      Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
  },
  profileDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    opacity: 0.9,
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 14,
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statEmoji: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '500',
  },
  achievementsScroll: {
    flexDirection: 'row',
  },
  achievementCard: {
    width: 100,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  achievementIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 40,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  achievementsModalContent: {
    padding: 20,
    maxHeight: 400,
  },
  achievementModalCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  achievementModalIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  achievementModalInfo: {
    flex: 1,
  },
  achievementModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementModalDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  achievementModalDate: {
    fontSize: 12,
  },
});
