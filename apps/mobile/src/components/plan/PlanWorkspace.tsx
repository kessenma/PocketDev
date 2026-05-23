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
  { value: 'review', label: 'Review' },
  { value: 'history', label: 'History' },
] as const

type Props = {
  onAccepted?: () => void
}

export default function PlanWorkspace({ onAccepted }: Props) {
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

  function handleAccept() {
    acceptPlan()
    onAccepted?.()
  }

  const header = (
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
  )

  const reviewContent = activePlan ? (
    layoutMode === 'tabletSplit' ? (
      <SplitViewLayout
        leading={
          <View style={styles.stack}>
            <PlanSummaryCard
              taskId={activePlan.taskId}
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
            {activePlan.questions.length > 0 && (
              <PlanQuestionList questions={activePlan.questions} onAnswer={answerQuestion} />
            )}
            <PlanConversation messages={activePlan.messages} onSend={sendMessage} />
            <PlanNotes value={activePlan.userNotes} onChangeText={updateNotes} />
            <PlanActionBar
              canAccept={canAccept}
              isSubmitting={isSubmitting}
              onAccept={handleAccept}
              onDeny={denyPlan}
            />
          </View>
        }
        leadingWidth={420}
      />
    ) : (
      <View style={styles.stack}>
        <PlanSummaryCard
          taskId={activePlan.taskId}
          title={activePlan.title}
          description={activePlan.description}
          agentName={activePlan.agentName}
          status={activePlan.status}
          stepCount={activePlan.steps.length}
          pendingQuestionCount={pendingQuestionCount}
        />
        <PlanStepList steps={activePlan.steps} />
        {activePlan.questions.length > 0 && (
          <PlanQuestionList questions={activePlan.questions} onAnswer={answerQuestion} />
        )}
        <PlanConversation messages={activePlan.messages} onSend={sendMessage} />
        <PlanNotes value={activePlan.userNotes} onChangeText={updateNotes} />
        <PlanActionBar
          canAccept={canAccept}
          isSubmitting={isSubmitting}
          onAccept={handleAccept}
          onDeny={denyPlan}
        />
      </View>
    )
  ) : (
    <PlanHistoryList plans={history} onSelect={() => {}} />
  )

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {header}
      {lastActionMessage ? (
        <View style={[styles.messageBanner, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.messageText, { color: colors.textSecondary }]}>{lastActionMessage}</Text>
        </View>
      ) : null}
      {activeView === 'review' ? reviewContent : null}
      {activeView === 'history' ? <PlanHistoryList plans={history} onSelect={() => {}} /> : null}
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
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshLink: {
    ...typeStyles.bodySmall,
    fontWeight: '700',
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
})
