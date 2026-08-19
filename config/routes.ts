export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        path: '/user/login',
        layout: false,
        name: '登录',
        component: './user/auth-login',
      },
      { path: '/user', redirect: '/user/login' },
      { component: '404', path: '/user/*' },
    ],
  },
  { path: '/corp-select', layout: false, component: './user/corp-select' },
  {
    path: '/social/callback',
    layout: false,
    component: './user/social-callback',
  },
  { path: '/pwdExpired', layout: false, component: './user/password-expired' },

  { component: '404', path: '/*' },
];
