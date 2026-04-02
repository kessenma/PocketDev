const { deriveLayoutState } = require('./useAdaptiveLayout')

describe('deriveLayoutState', () => {
  it('keeps phones in phone mode', () => {
    expect(deriveLayoutState({ width: 430, height: 932 }, false)).toMatchObject({
      isTabletDevice: false,
      layoutMode: 'phone',
      isLandscape: false,
      windowWidth: 430,
    })
  })

  it('uses tablet split mode for wide tablets', () => {
    expect(deriveLayoutState({ width: 1180, height: 820 }, true)).toMatchObject({
      isTabletDevice: true,
      layoutMode: 'tabletSplit',
      isLandscape: true,
      windowHeight: 820,
    })
  })

  it('uses bounded tablet mode for narrow tablet widths', () => {
    expect(deriveLayoutState({ width: 820, height: 1180 }, true)).toMatchObject({
      isTabletDevice: true,
      layoutMode: 'tablet',
      isLandscape: false,
    })
  })
})
