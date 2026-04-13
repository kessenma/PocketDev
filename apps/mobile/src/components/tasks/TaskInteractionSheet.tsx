import React, { useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { MessageCircleQuestion, ShieldAlert, X } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import type { TaskQuestion } from '@pocketdev/shared/types'
import { useTheme } from '../../contexts/ThemeContext'
import { useTaskStore } from '../../stores/tasks'
import BauhausButton from '../shared/BauhausButton'
import { typeStyles } from '../../theme/typography'
import { getQuestionOptionLabel } from './task-stream-utils'

type Props = {
  taskId: string
}

export default function TaskInteractionSheet({ taskId }: Props) {
  const { colors } = useTheme()
  const questionsRaw = useTaskStore((s) => s.pendingQuestions.get(taskId))
  const questions = useMemo(() => questionsRaw ?? [], [questionsRaw])
  const answerQuestion = useTaskStore((s) => s.answerQuestion)
  const clearQuestions = useTaskStore((s) => s.clearQuestions)
  const task = useTaskStore((s) => s.tasks.get(taskId))
  const [dismissed, setDismissed] = useState(false)

  // Reset dismissed state when new questions arrive
  React.useEffect(() => {
    if (questions.length > 0) setDismissed(false)
  }, [questions.length])

  const visible = questions.length > 0 && !dismissed
  if (!visible) return null

  const current = questions[0]
  const isTerminal = task?.status === 'completed' || task?.status === 'failed' || task?.status === 'killed'

  function handleDismiss() {
    clearQuestions(taskId)
    setDismissed(true)
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={handleDismiss}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.panel }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              {isTerminal
                ? <ShieldAlert color="#f59e0b" size={18} strokeWidth={2.25} />
                : <MessageCircleQuestion color={colors.primary} size={18} strokeWidth={2.25} />}
              <Text style={[styles.title, { color: colors.text }]}>
                {isTerminal ? 'Permissions Required' : 'Agent Question'}
              </Text>
              {!isTerminal && questions.length > 1 && (
                <Text style={[styles.queueBadge, { color: colors.textTertiary }]}>
                  1 of {questions.length}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <X color={colors.text} size={20} strokeWidth={2.25} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            <QuestionCard
              question={current}
              isTerminal={isTerminal}
              onAnswer={(answer) => answerQuestion(taskId, current.questionId, answer)}
            />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function QuestionCard({
  question,
  isTerminal,
  onAnswer,
}: {
  question: TaskQuestion
  isTerminal: boolean
  onAnswer: (answer: string) => void
}) {
  const { colors } = useTheme()

  switch (question.type) {
    case 'permission':
      return <PermissionCard question={question} isTerminal={isTerminal} onAnswer={onAnswer} colors={colors} />
    case 'yes_no':
      return <YesNoCard question={question} onAnswer={onAnswer} colors={colors} />
    case 'multiple_choice':
      return <MultipleChoiceCard question={question} onAnswer={onAnswer} colors={colors} />
    case 'free_response':
      return <FreeResponseCard question={question} onAnswer={onAnswer} colors={colors} />
    case 'form':
      return <FormCard question={question} onAnswer={onAnswer} colors={colors} />
    default:
      return <FreeResponseCard question={question} onAnswer={onAnswer} colors={colors} />
  }
}

function PermissionCard({
  question,
  isTerminal,
  onAnswer,
  colors,
}: {
  question: TaskQuestion
  isTerminal: boolean
  onAnswer: (answer: string) => void
  colors: any
}) {
  return (
    <View style={styles.cardContent}>
      <Text style={[styles.questionPrompt, { color: colors.text }]}>{question.prompt}</Text>

      {question.toolDetails ? (
        <View style={[styles.toolDetailBox, { backgroundColor: colors.panelAlt, borderColor: colors.border }]}>
          <Text style={[styles.toolName, { color: colors.text }]}>{question.toolDetails.toolName}</Text>
          {question.toolDetails.toolInput?.command != null ? (
            <Text style={[styles.toolInput, { color: colors.textTertiary }]} numberOfLines={5}>
              {String(question.toolDetails.toolInput.command)}
            </Text>
          ) : null}
          {question.toolDetails.toolInput?.file_path != null ? (
            <Text style={[styles.toolInput, { color: colors.textTertiary }]} numberOfLines={2}>
              {String(question.toolDetails.toolInput.file_path)}
            </Text>
          ) : null}
          {question.toolDetails.detail ? (
            <Text style={[styles.toolInput, { color: colors.textTertiary }]} numberOfLines={4}>
              {question.toolDetails.detail}
            </Text>
          ) : null}
        </View>
      ) : null}

      {isTerminal ? (
        <Text style={[typeStyles.bodySmall, { color: colors.textSecondary }]}>
          Task ended — answer sent for debugging. Check agent logs.
        </Text>
      ) : null}

      <View style={styles.permissionButtons}>
        <View style={styles.flexButton}>
          <BauhausButton onPress={() => onAnswer('y')}>Allow</BauhausButton>
        </View>
        <View style={styles.flexButton}>
          <BauhausButton variant="danger" onPress={() => onAnswer('n')}>Deny</BauhausButton>
        </View>
      </View>
    </View>
  )
}

function YesNoCard({
  question,
  onAnswer,
  colors,
}: {
  question: TaskQuestion
  onAnswer: (answer: string) => void
  colors: any
}) {
  return (
    <View style={styles.cardContent}>
      <Text style={[styles.questionPrompt, { color: colors.text }]}>{question.prompt}</Text>
      <View style={styles.yesNoButtons}>
        <View style={styles.flexButton}>
          <BauhausButton onPress={() => onAnswer('y')}>Yes</BauhausButton>
        </View>
        <View style={styles.flexButton}>
          <BauhausButton variant="secondary" onPress={() => onAnswer('n')}>No</BauhausButton>
        </View>
      </View>
    </View>
  )
}

function MultipleChoiceCard({
  question,
  onAnswer,
  colors,
}: {
  question: TaskQuestion
  onAnswer: (answer: string) => void
  colors: any
}) {
  return (
    <View style={styles.cardContent}>
      <Text style={[styles.questionPrompt, { color: colors.text }]}>{question.prompt}</Text>
      <View style={styles.optionsList}>
        {(question.options ?? []).map((option, i) => (
          <TouchableOpacity
            key={option.value}
            activeOpacity={0.7}
            onPress={() => onAnswer(option.value)}
            style={[styles.optionCard, { borderColor: colors.border, backgroundColor: colors.panelAlt }]}
          >
            <View style={[styles.optionIndex, { backgroundColor: colors.primary }]}>
              <Text style={[styles.optionIndexText, { color: colors.primaryText }]}>{i + 1}</Text>
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionText, { color: colors.text }]}>{getQuestionOptionLabel(option)}</Text>
              {option.description ? (
                <Text style={[styles.optionDescription, { color: colors.textTertiary }]}>{option.description}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

function FreeResponseCard({
  question,
  onAnswer,
  colors,
}: {
  question: TaskQuestion
  onAnswer: (answer: string) => void
  colors: any
}) {
  const [input, setInput] = useState('')

  return (
    <View style={styles.cardContent}>
      <Text style={[styles.questionPrompt, { color: colors.text }]}>{question.prompt}</Text>
      <TextInput
        style={[styles.freeInput, { backgroundColor: colors.panelAlt, color: colors.text, borderColor: colors.border }]}
        value={input}
        onChangeText={setInput}
        placeholder="Type your response..."
        placeholderTextColor={colors.textTertiary}
        multiline
        textAlignVertical="top"
      />
      <BauhausButton
        onPress={() => {
          if (input.trim()) onAnswer(input.trim())
        }}
        disabled={!input.trim()}
      >
        Send
      </BauhausButton>
    </View>
  )
}

function FormCard({
  question,
  onAnswer,
  colors,
}: {
  question: TaskQuestion
  onAnswer: (answer: string) => void
  colors: any
}) {
  const fields = question.fields ?? []
  const initialValues = React.useMemo(
    () => Object.fromEntries(fields.map((field) => [field.id, ''])),
    [fields],
  )
  const [values, setValues] = useState<Record<string, string>>(initialValues)

  React.useEffect(() => {
    setValues(initialValues)
  }, [initialValues])

  const canSubmit = fields.every((field) => (values[field.id] ?? '').trim().length > 0)

  return (
    <View style={styles.cardContent}>
      <Text style={[styles.questionPrompt, { color: colors.text }]}>{question.prompt}</Text>
      <View style={styles.formFields}>
        {fields.map((field) => (
          <View key={field.id} style={styles.formField}>
            {field.header ? (
              <Text style={[styles.formFieldHeader, { color: colors.textTertiary }]}>{field.header}</Text>
            ) : null}
            <Text style={[styles.formFieldPrompt, { color: colors.text }]}>{field.prompt}</Text>
            {field.options?.length ? (
              <View style={styles.optionsList}>
                {field.options.map((option, i) => {
                  const selected = values[field.id] === option.value
                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.7}
                      onPress={() => setValues((state) => ({ ...state, [field.id]: option.value }))}
                      style={[
                        styles.optionCard,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: colors.panelAlt,
                        },
                      ]}
                    >
                      <View style={[styles.optionIndex, { backgroundColor: selected ? colors.primary : colors.border }]}>
                        <Text style={[styles.optionIndexText, { color: selected ? colors.primaryText : colors.textTertiary }]}>{i + 1}</Text>
                      </View>
                      <View style={styles.optionTextWrap}>
                        <Text style={[styles.optionText, { color: colors.text }]}>{getQuestionOptionLabel(option)}</Text>
                        {option.description ? (
                          <Text style={[styles.optionDescription, { color: colors.textTertiary }]}>{option.description}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            ) : (
              <TextInput
                style={[styles.freeInput, { backgroundColor: colors.panelAlt, color: colors.text, borderColor: colors.border }]}
                value={values[field.id] ?? ''}
                onChangeText={(text) => setValues((state) => ({ ...state, [field.id]: text }))}
                placeholder="Type your response..."
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={field.isSecret}
                multiline={!field.isSecret}
                textAlignVertical="top"
              />
            )}
          </View>
        ))}
      </View>
      <BauhausButton onPress={() => onAnswer(JSON.stringify(values))} disabled={!canSubmit}>
        Send
      </BauhausButton>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    minHeight: 400,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
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
  queueBadge: {
    ...typographyScale.xs,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing[4],
  },
  cardContent: {
    gap: spacing[3],
  },
  questionPrompt: {
    ...typeStyles.bodyStrong,
  },
  toolDetailBox: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[1],
  },
  toolName: {
    ...typeStyles.meta,
    fontWeight: '700',
  },
  toolInput: {
    ...typeStyles.mono,
    fontSize: 11,
  },
  permissionButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  yesNoButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  flexButton: {
    flex: 1,
  },
  optionsList: {
    gap: spacing[2],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  optionIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIndexText: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  optionText: {
    ...typeStyles.body,
    flex: 1,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionDescription: {
    ...typeStyles.meta,
    marginTop: spacing[1],
  },
  freeInput: {
    ...typeStyles.body,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    minHeight: 80,
    maxHeight: 200,
  },
  formFields: {
    gap: spacing[4],
  },
  formField: {
    gap: spacing[2],
  },
  formFieldHeader: {
    ...typeStyles.meta,
  },
  formFieldPrompt: {
    ...typeStyles.body,
  },
})
