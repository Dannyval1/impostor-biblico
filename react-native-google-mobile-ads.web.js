// Web mock for react-native-google-mobile-ads
// Ads are not supported on web — this is a no-op stub.

const noop = () => {};

const AdEventType = { ERROR: 'error', OPENED: 'opened', CLOSED: 'closed', CLICKED: 'clicked' };
const RewardedAdEventType = { LOADED: 'loaded', EARNED_REWARD: 'earned_reward' };

const TestIds = {
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
};

const AdsConsent = { initialize: noop };

class FakeAd {
  static createForAdRequest() { return new FakeAd(); }
  addAdEventListener() { return noop; }
  load() {}
  show() { return Promise.resolve(); }
}

class InterstitialAd extends FakeAd {}
class RewardedAd extends FakeAd {}
class BannerAd extends FakeAd {}

module.exports = {
  AdEventType,
  RewardedAdEventType,
  TestIds,
  AdsConsent,
  InterstitialAd,
  RewardedAd,
  BannerAd,
};
