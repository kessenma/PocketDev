import React from 'react'
import {
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Bug, CheckCircle2, LockKeyhole, ShieldAlert, X } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import BauhausButton from '../shared/BauhausButton'
import { typeStyles } from '../../theme/typography'
import type { TaskDebugIssueKind, TaskDebugSelection } from './task-debug-utils'

type PendingPermission = {
  tool_name?: string
  tool_use_id?: string
  description?: string
}

type Props = {
  visible: boolean
  selection: TaskDebugSelection
  onClose: () => void
  onSelect: (selection: TaskDebugSelection) => void
  onContinue: () => void
  /** Pending permission denials for the current task — used to populate the permissions path */
  pendingPermissions?: PendingPermission[]
}

const OPTIONS: Array<{
  key: TaskDebugIssueKind
  title: string
  description: string
  Icon: typeof LockKeyhole
}> = [
  {
    key: 'auth',
    title: 'Auth',
    description: 'Re-authenticate the agent CLI and verify the session without stepping through reinstall.',
    Icon: LockKeyhole,
  },
  {
    key: 'permissions',
    title: 'Permissions',
    description: 'Permission repair will live here soon. For now this is a placeholder path.',
    Icon: ShieldAlert,
  },
]

export default function TaskDebugSheet({
  visible,
  selection,
  onClose,
  onSelect,
  onContinue,
  pendingPermissions = [],
}: Props) {
  const { colors } = useTheme()

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'ios' ? 'slide' : 'fade'}
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.panel, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <Bug color={colors.primary} size={18} strokeWidth={2.25} />
              <Text style={[styles.title, { color: colors.text }]}>Debug Task</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <X color={colors.textTertiary} size={18} strokeWidth={2.25} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Pick the issue you want to inspect. PocketDev will preselect the most likely problem when it can infer one from the current task.
            </Text>

            <View style={styles.optionList}>
              {OPTIONS.map(({ key, title, description, Icon }) => {
                const selected = selection === key
                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.7}
                    onPress={() => onSelect(selected ? null : key)}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: colors.panelAlt,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.optionHeader}>
                      <View style={styles.optionTitleWrap}>
                        <Icon color={selected ? colors.primary : colors.textTertiary} size={16} strokeWidth={2.25} />
                        <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
                      </View>
                      {selected ? (
                        <CheckCircle2 color={colors.primary} size={18} strokeWidth={2.25} />
                      ) : (
                        <View style={[styles.radio, { borderColor: colors.border }]} />
                      )}
                    </View>
                    <Text style={[styles.optionBody, { color: colors.textSecondary }]}>{description}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>

          {selection === 'permissions' && pendingPermissions.length > 0 ? (
            <View style={[styles.permissionsPanel, { borderTopColor: colors.border, backgroundColor: colors.panelAlt }]}>
              <Text style={[styles.permissionsTitle, { color: colors.textSecondary }]}>
                {pendingPermissions.length} pending approval{pendingPermissions.length > 1 ? 's' : ''}
              </Text>
              {pendingPermissions.map((p, i) => (
                <View key={p.tool_use_id ?? i} style={[styles.permissionsItem, { borderColor: colors.border }]}>
                  <ShieldAlert color='#f59e0b' size={12} strokeWidth={2.25} style={styles.permissionsIcon} />
                  <Text style={[styles.permissionsItemText, { color: colors.text }]} numberOfLines={1}>
                    {p.tool_name ?? 'Tool'}{p.description ? ` — ${p.description}` : ''}
                  </Text>
                </View>
              ))}
              <Text style={[styles.permissionsHint, { color: colors.textTertiary }]}>
                Close this sheet and answer the permission request in the task stream to let the agent continue.
              </Text>
            </View>
          ) : null}

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <BauhausButton
              onPress={onContinue}
              disabled={selection == null}
            >
              {selection === 'permissions' ? 'Go to Task Stream' : 'Continue'}
            </BauhausButton>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '80%',
    minHeight: 360,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing[4],
    gap: spacing[4],
  },
  description: {
    ...typeStyles.bodySmall,
  },
  optionList: {
    gap: spacing[3],
  },
  optionCard: {
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  optionTitle: {
    ...typeStyles.bodyStrong,
  },
  optionBody: {
    ...typeStyles.bodySmall,
  },
  radio: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderRadius: 9,
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
    gap: spacing[2],
  },
  placeholderText: {
    ...typeStyles.meta,
  },
  permissionsPanel: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    gap: spacing[2],
  },
  permissionsTitle: {
    ...typeStyles.meta,
    fontWeight: '700',
  },
  permissionsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  permissionsIcon: {
    flexShrink: 0,
  },
  permissionsItemText: {
    ...typeStyles.bodySmall,
    flex: 1,
  },
  permissionsHint: {
    ...typeStyles.bodySmall,
    marginTop: spacing[1],
  },
})
