import React from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { PlanCard, PlanCardContent, PlanCardDescription, PlanCardHeader, PlanCardTitle } from './PlanCard'
import type { PlanQuestion } from './model'

type Props = {
  questions: PlanQuestion[]
  onAnswer: (questionId: string, answer: string) => void
}

export default function PlanQuestionList({ questions, onAnswer }: Props) {
  const { colors } = useTheme()

  if (questions.length === 0) return null

  const pending = questions.filter((q) => q.required && !q.answer.trim()).length

  return (
    <PlanCard>
      <PlanCardHeader>
        <PlanCardTitle>Questions</PlanCardTitle>
        <PlanCardDescription>
          {pending > 0
            ? `${pending} required question${pending > 1 ? 's' : ''} need${pending === 1 ? 's' : ''} an answer before you can accept.`
            : 'All required questions answered.'}
        </PlanCardDescription>
      </PlanCardHeader>

      <PlanCardContent>
        {questions.map((q) => {
          const unanswered = q.required && !q.answer.trim()

          return (
            <View
              key={q.id}
              style={[styles.questionBlock, { backgroundColor: colors.backgroundSecondary }]}
            >
              <View style={styles.questionHeader}>
                <Text style={[styles.questionText, { color: colors.text }]}>{q.question}</Text>
                {q.required ? (
                  <Text style={[styles.requiredMark, { color: unanswered ? colors.error : colors.success }]}>
                    {unanswered ? 'required' : 'answered'}
                  </Text>
                ) : null}
              </View>
              <TextInput
                value={q.answer}
                onChangeText={(text) => onAnswer(q.id, text)}
                placeholder="Type your answer..."
                placeholderTextColor={colors.textTertiary}
                multiline
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: unanswered ? colors.error : colors.border,
                    color: colors.text,
                  },
                ]}
                textAlignVertical="top"
              />
            </View>
          )
        })}
      </PlanCardContent>
    </PlanCard>
  )
}

const styles = StyleSheet.create({
  questionBlock: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  questionText: {
    ...typographyScale.base,
    fontWeight: '600',
    flex: 1,
  },
  requiredMark: {
    ...typographyScale.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  input: {
    ...typographyScale.sm,
    minHeight: 64,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
})
