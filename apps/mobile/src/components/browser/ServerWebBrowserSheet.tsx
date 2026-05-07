import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, LayoutChangeEvent, Linking, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { Sheet, type SheetHandle } from '../ui/Sheet'
import WebView, { type WebViewNavigation, type WebViewProps } from 'react-native-webview'
import { X, ChevronLeft, ChevronRight, RotateCw, ExternalLink, AlertCircle } from 'lucide-react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'

interface Props {
  title: string
  initialUrl: string
  onDismiss: () => void
  errorHint?: string | null
  matchUrl?: (url: string) => boolean
  onMatchedUrl?: (url: string) => Promise<void> | void
  onLoadSuccess?: () => void
  onLoadFailure?: (message: string) => void
}

export default function ServerWebBrowserSheet({
  title,
  initialUrl,
  onDismiss,
  errorHint,
  matchUrl,
  onMatchedUrl,
  onLoadSuccess,
  onLoadFailure,
}: Props) {
  const { colors } = useTheme()
  const { height: windowHeight } = useWindowDimensions()
  const sheetRef = useRef<SheetHandle>(null)
  const webViewRef = useRef<WebView>(null)
  const [currentUrl, setCurrentUrl] = useState(initialUrl)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [headerHeight, setHeaderHeight] = useState(0)

  const bodyHeight = headerHeight > 0 ? windowHeight - headerHeight : 0

  function handleHeaderLayout(e: LayoutChangeEvent) {
    const h = e.nativeEvent.layout.height
    console.log('[ServerWebBrowserSheet] header layout height:', h, 'window:', windowHeight, 'computed body:', windowHeight - h)
    setHeaderHeight(h)
  }

  const source = useMemo<WebViewProps['source']>(() => ({ uri: initialUrl }), [initialUrl])

  useEffect(() => {
    setCurrentUrl(initialUrl)
    setLoading(true)
    setLoadError(null)
  }, [initialUrl])

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
    <Sheet
      ref={sheetRef}
      detents={[1]}
      onDismiss={onDismiss}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]} onLayout={handleHeaderLayout}>
        <TouchableOpacity onPress={() => sheetRef.current?.dismiss()} style={styles.iconButton} activeOpacity={0.7}>
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
          <TouchableOpacity onPress={() => Linking.openURL(currentUrl)} style={styles.iconButton} activeOpacity={0.7}>
            <ExternalLink color={colors.text} size={18} strokeWidth={2.25} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.body, bodyHeight > 0 ? { height: bodyHeight } : undefined]}>
        <WebView
          ref={webViewRef}
          source={source}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStart}
          onLoadStart={() => {
            console.log('[ServerWebBrowserSheet] onLoadStart url:', initialUrl)
            setLoading(true)
            setLoadError(null)
          }}
          onLoad={() => {
            console.log('[ServerWebBrowserSheet] onLoad success')
            setLoading(false)
            onLoadSuccess?.()
          }}
          onLoadEnd={() => {
            console.log('[ServerWebBrowserSheet] onLoadEnd')
            setLoading(false)
          }}
          onError={(event) => {
            console.log('[ServerWebBrowserSheet] onError:', event.nativeEvent.description)
            setLoading(false)
            const message = event.nativeEvent.description || 'Failed to load page.'
            setLoadError(message)
            onLoadFailure?.(message)
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
              {errorHint ? (
                <Text style={[styles.errorText, { color: colors.textSecondary }]}>{errorHint}</Text>
              ) : null}
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
    </Sheet>
  )
}

const styles = StyleSheet.create({
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
    ...typeStyles.bodyBold,
  },
  url: {
    ...typeStyles.meta,
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
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
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
    ...typeStyles.bodySmall,
  },
  errorOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
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
    ...typeStyles.bodyBold,
  },
  errorText: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  retryText: {
    ...typeStyles.bodySmall,
  },
})
