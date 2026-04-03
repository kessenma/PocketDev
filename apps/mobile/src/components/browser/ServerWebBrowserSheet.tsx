import React, { useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import WebView, { type WebViewNavigation, type WebViewProps } from 'react-native-webview'
import { X, ChevronLeft, ChevronRight, RotateCw, AlertCircle } from 'lucide-react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'

interface Props {
  visible: boolean
  title: string
  initialUrl: string
  onClose: () => void
  matchUrl?: (url: string) => boolean
  onMatchedUrl?: (url: string) => Promise<void> | void
}

export default function ServerWebBrowserSheet({
  visible,
  title,
  initialUrl,
  onClose,
  matchUrl,
  onMatchedUrl,
}: Props) {
  const { colors } = useTheme()
  const webViewRef = useRef<WebView>(null)
  const [currentUrl, setCurrentUrl] = useState(initialUrl)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const source = useMemo<WebViewProps['source']>(() => ({ uri: initialUrl }), [initialUrl])

  function handleNavigationStateChange(navState: WebViewNavigation) {
    setCurrentUrl(navState.url)
    setCanGoBack(navState.canGoBack)
    setCanGoForward(navState.canGoForward)
  }

  function handleShouldStart(request: { url: string }) {
    if (matchUrl?.(request.url)) {
      void onMatchedUrl?.(request.url)
      return false
    }
    return true
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton} activeOpacity={0.7}>
            <X color={colors.text} size={20} strokeWidth={2.25} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            <Text style={[styles.url, { color: colors.textTertiary }]} numberOfLines={1}>{currentUrl}</Text>
          </View>
          <View style={styles.toolbar}>
            <TouchableOpacity
              onPress={() => webViewRef.current?.goBack()}
              style={[styles.iconButton, !canGoBack && styles.disabledButton]}
              disabled={!canGoBack}
              activeOpacity={0.7}
            >
              <ChevronLeft color={colors.text} size={18} strokeWidth={2.25} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => webViewRef.current?.goForward()}
              style={[styles.iconButton, !canGoForward && styles.disabledButton]}
              disabled={!canGoForward}
              activeOpacity={0.7}
            >
              <ChevronRight color={colors.text} size={18} strokeWidth={2.25} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => webViewRef.current?.reload()} style={styles.iconButton} activeOpacity={0.7}>
              <RotateCw color={colors.text} size={18} strokeWidth={2.25} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.body}>
          <WebView
            ref={webViewRef}
            source={source}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStart}
            onLoadStart={() => {
              setLoading(true)
              setLoadError(null)
            }}
            onLoadEnd={() => setLoading(false)}
            onError={(event) => {
              setLoading(false)
              setLoadError(event.nativeEvent.description || 'Failed to load page.')
            }}
            startInLoadingState
            allowsBackForwardNavigationGestures
            style={styles.webview}
          />

          {loading && (
            <View pointerEvents="none" style={styles.loadingOverlay}>
              <View style={[styles.loadingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading page…</Text>
              </View>
            </View>
          )}

          {loadError && (
            <View style={styles.errorOverlay}>
              <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <AlertCircle color={colors.error} size={20} strokeWidth={2.25} />
                <Text style={[styles.errorTitle, { color: colors.text }]}>Page failed to load</Text>
                <Text style={[styles.errorText, { color: colors.textSecondary }]}>{loadError}</Text>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setLoadError(null)
                    webViewRef.current?.reload()
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.retryText, { color: colors.primaryText }]}>Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  url: {
    ...typographyScale.xs,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.35,
  },
  body: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  loadingText: {
    ...typographyScale.sm,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
  },
  errorCard: {
    width: '100%',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[2],
  },
  errorTitle: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  errorText: {
    ...typographyScale.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  retryText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
})
