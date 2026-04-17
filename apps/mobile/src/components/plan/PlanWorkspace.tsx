import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import { useAdaptiveLayout } from '../../hooks/useAdaptiveLayout'
import { usePlanStore } from '../../stores/plan'
import SplitViewLayout from '../layout/SplitViewLayout'
import PlanActionBar from './PlanActionBar'
import PlanConversation from './PlanConversation'
import PlanHistoryList from './PlanHistoryList'
import PlanNotes from './PlanNotes'
import PlanQuestionList from './PlanQuestionList'
import PlanSegmentedControl from './PlanSegmentedControl'
import PlanStepList from './PlanStepList'
import PlanSummaryCard from './PlanSummaryCard'

const VIEW_OPTIONS = [
  { value: 'plan', label: 'Plan' },
  { value: 'conversation', label: 'Conversation' },
  { value: 'history', label: 'History' },
] as const

export default function PlanWorkspace() {
  const { colors } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const activePlan = usePlanStore((state) => state.activePlan)
  const history = usePlanStore((state) => state.history)
  const activeView = usePlanStore((state) => state.activeView)
  const lastActionMessage = usePlanStore((state) => state.lastActionMessage)
  const isRefreshing = usePlanStore((state) => state.isRefreshing)
  const isSubmitting = usePlanStore((state) => state.isSubmitting)
  const selectView = usePlanStore((state) => state.selectView)
  const answerQuestion = usePlanStore((state) => state.answerQuestion)
  const updateNotes = usePlanStore((state) => state.updateNotes)
  const sendMessage = usePlanStore((state) => state.sendMessage)
  const acceptPlan = usePlanStore((state) => state.acceptPlan)
  const denyPlan = usePlanStore((state) => state.denyPlan)
  const refresh = usePlanStore((state) => state.refresh)

  const pendingQuestionCount = activePlan
    ? activePlan.questions.filter((q) => q.required && !q.answer.trim()).length
    : 0
  const canAccept = !!activePlan && pendingQuestionCount === 0 && !isSubmitting

  const header = (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Plan Review</Text>
        <Text style={[styles.title, { color: colors.text }]}>Agent plan review</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Review agent-proposed plans, answer questions, and accept or deny them before implementation continues.
        </Text>
      </View>

      <View style={styles.controlRow}>
        <PlanSegmentedControl
          value={activeView}
          options={VIEW_OPTIONS}
          onChange={selectView}
        />
        <Text
          accessibilityRole="button"
          onPress={refresh}
          style={[styles.refreshLink, { color: isRefreshing ? colors.textTertiary : colors.primary }]}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Text>
      </View>

      <View style={[styles.messageBanner, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.messageText, { color: colors.textSecondary }]}>{lastActionMessage}</Text>
      </View>
    </View>
  )

  const planView = activePlan ? (
    layoutMode === 'tabletSplit' ? (
      <SplitViewLayout
        leading={
          <View style={styles.stack}>
            <PlanSummaryCard
              title={activePlan.title}
              description={activePlan.description}
              agentName={activePlan.agentName}
              status={activePlan.status}
              stepCount={activePlan.steps.length}
              pendingQuestionCount={pendingQuestionCount}
            />
            <PlanStepList steps={activePlan.steps} />
          </View>
        }
        trailing={
          <View style={styles.stack}>
            <PlanQuestionList questions={activePlan.questions} onAnswer={answerQuestion} />
            <PlanNotes value={activePlan.userNotes} onChangeText={updateNotes} />
            <PlanActionBar
              canAccept={canAccept}
              isSubmitting={isSubmitting}
              onAccept={acceptPlan}
              onDeny={denyPlan}
            />
          </View>
        }
        leadingWidth={420}
      />
    ) : (
      <View style={styles.stack}>
        <PlanSummaryCard
          title={activePlan.title}
          description={activePlan.description}
          agentName={activePlan.agentName}
          status={activePlan.status}
          stepCount={activePlan.steps.length}
          pendingQuestionCount={pendingQuestionCount}
        />
        <PlanStepList steps={activePlan.steps} />
        <PlanQuestionList questions={activePlan.questions} onAnswer={answerQuestion} />
        <PlanNotes value={activePlan.userNotes} onChangeText={updateNotes} />
        <PlanActionBar
          canAccept={canAccept}
          isSubmitting={isSubmitting}
          onAccept={acceptPlan}
          onDeny={denyPlan}
        />
      </View>
    )
  ) : (
    <View style={[styles.emptyState, { backgroundColor: colors.backgroundSecondary }]}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No active plan</Text>
      <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
        When an agent proposes a plan, it will appear here for your review.
      </Text>
    </View>
  )

  const conversationView = activePlan ? (
    <PlanConversation messages={activePlan.messages} onSend={sendMessage} />
  ) : (
    <View style={[styles.emptyState, { backgroundColor: colors.backgroundSecondary }]}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversation</Text>
      <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
        Start a conversation with the agent when a plan is active.
      </Text>
    </View>
  )

  const historyView = (
    <PlanHistoryList plans={history} onSelect={() => {}} />
  )

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {header}
      {activeView === 'plan' ? planView : null}
      {activeView === 'conversation' ? conversationView : null}
      {activeView === 'history' ? historyView : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  header: {
    gap: spacing[3],
  },
  headerText: {
    gap: spacing[1],
  },
  eyebrow: {
    ...typeStyles.sectionTitle,
  },
  title: {
    ...typeStyles.heading,
  },
  subtitle: {
    ...typeStyles.body,
    maxWidth: 760,
  },
  controlRow: {
    gap: spacing[3],
  },
  refreshLink: {
    ...typeStyles.bodySmall,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  messageBanner: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  messageText: {
    ...typeStyles.bodySmall,
  },
  stack: {
    gap: spacing[4],
    flex: 1,
  },
  emptyState: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
    minHeight: 180,
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typeStyles.bodyBold,
  },
  emptyBody: {
    ...typeStyles.bodySmall,
  },
})
