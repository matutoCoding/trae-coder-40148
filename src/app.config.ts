export default defineAppConfig({
  pages: [
    'pages/schedule/index',
    'pages/team/index',
    'pages/reconciliation/index',
    'pages/profile/index',
    'pages/schedule-detail/index',
    'pages/schedule-create/index',
    'pages/team-detail/index',
    'pages/transaction-detail/index',
    'pages/discrepancy-detail/index',
    'pages/approval/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#D4383C',
    navigationBarTitleText: '婚庆档期管理',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#D4383C',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/schedule/index',
        text: '档期排期'
      },
      {
        pagePath: 'pages/team/index',
        text: '团队管理'
      },
      {
        pagePath: 'pages/reconciliation/index',
        text: '对账中心'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的'
      }
    ]
  }
})
