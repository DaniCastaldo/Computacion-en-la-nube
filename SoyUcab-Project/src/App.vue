<script >
  import loginView from './components/PrincipalView.vue';
  export default {
    name: 'App',
    components:{
      loginView
    }
  };
  
</script>

<template>
  <div id="principal">
    <router-link to="/principalview" ></router-link>
  </div>
  <router-view/>
  
  

</template>

