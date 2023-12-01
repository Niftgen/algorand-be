const Mixpanel = require('mixpanel');

const mixpanelToken = process.env.MIXPANEL_TOKEN || ''
export default Mixpanel.init(mixpanelToken)
