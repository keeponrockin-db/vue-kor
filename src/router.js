import Vue from 'vue'
import Router from 'vue-router'
import Matches from './views/Matches.vue'
import Edit from './views/Edit.vue'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'matches',
      component: Matches,
      props: (route) => ({
        query: route.query
      })
    },
    {
      path: '/edit',
      name: 'edit',
      component: Edit,
      props: (route) => ({
        v: route.query.v
      })
    }
  ]
})
