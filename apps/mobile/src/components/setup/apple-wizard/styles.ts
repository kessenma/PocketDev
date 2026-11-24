import { StyleSheet } from 'react-native'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'

/** Shared layout for the App Store wizard steps (mirrors the Go wizard steps). */
export const stepStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    gap: spacing[3],
    paddingBottom: spacing[6],
  },
  title: {
    ...typeStyles.screenTitle,
    textAlign: 'center',
    marginTop: spacing[4],
  },
  subtitle: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  cardTitle: {
    ...typeStyles.button,
    flexShrink: 1,
  },
  cardBody: {
    ...typeStyles.bodySmall,
  },
  cardMeta: {
    ...typeStyles.mono,
  },
  label: {
    ...typeStyles.meta,
    fontWeight: '600',
  },
  input: {
    ...typeStyles.body,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  buttonText: {
    ...typeStyles.button,
  },
  disabled: {
    opacity: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  option: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[1],
  },
  optionTitle: {
    ...typeStyles.bodySmall,
    fontWeight: '700',
  },
  optionBody: {
    ...typeStyles.meta,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  successCard: {
    backgroundColor: '#22c55e18',
    borderColor: '#22c55e44',
  },
  successText: {
    color: '#22c55e',
  },
  flex: {
    flex: 1,
  },
  link: {
    ...typeStyles.bodySmall,
    fontWeight: '600',
  },
})
