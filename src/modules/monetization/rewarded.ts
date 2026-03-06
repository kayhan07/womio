export type RewardedOutcome = {
  completed: boolean
  source: "admob" | "mock"
  revenueMicros?: number
  error?: string
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const dynamicRequire = (name: string): any => {
  try {
     
    return Function("n", "return require(n)")(name)
  } catch {
    return null
  }
}

export async function showRewardedAd(): Promise<RewardedOutcome> {
  const devMode = process.env.EXPO_PUBLIC_REWARDED_DEV_MODE === "1"
  const configuredId = process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID || ""
  if (devMode) {
    await wait(1600)
    return { completed: true, source: "mock" }
  }

  if (!configuredId) {
    return { completed: false, source: "mock", error: "missing_ad_unit_id" }
  }

  const mobileAds = dynamicRequire("react-native-google-mobile-ads")
  if (!mobileAds?.RewardedAd) {
    return { completed: false, source: "mock", error: "sdk_not_installed" }
  }

  const unitId =
    configuredId === "TEST"
      ? (mobileAds.TestIds?.REWARDED || configuredId)
      : configuredId

  const ad = mobileAds.RewardedAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: true,
  })

  return await new Promise<RewardedOutcome>((resolve) => {
    let earned = false
    let done = false
    let revenueMicros: number | undefined
    const unsubs: (() => void)[] = []
    const finish = (outcome: RewardedOutcome) => {
      if (done) return
      done = true
      unsubs.forEach((u) => {
        try { u() } catch {}
      })
      resolve(outcome)
    }

    unsubs.push(
      ad.addAdEventListener(mobileAds.RewardedAdEventType.EARNED_REWARD, () => {
        earned = true
      })
    )
    unsubs.push(
      ad.addAdEventListener(mobileAds.AdEventType.PAID, (paid: { value?: number }) => {
        if (typeof paid?.value === "number" && Number.isFinite(paid.value)) {
          revenueMicros = Math.max(0, Math.round(paid.value))
        }
      })
    )
    unsubs.push(
      ad.addAdEventListener(mobileAds.AdEventType.ERROR, (e: { message?: string }) => {
        finish({ completed: false, source: "admob", error: e?.message || "ad_error" })
      })
    )
    unsubs.push(
      ad.addAdEventListener(mobileAds.AdEventType.CLOSED, () => {
        finish({ completed: earned, source: "admob", revenueMicros })
      })
    )
    unsubs.push(
      ad.addAdEventListener(mobileAds.AdEventType.LOADED, () => {
        ad.show()
      })
    )

    ad.load()
  })
}

