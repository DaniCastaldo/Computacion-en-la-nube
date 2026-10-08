<script >
  export default {
    name: 'App',
    methods: {
      hideGoToText() {
        const tut = document.getElementById('tutoresreport');
        const prof= document.getElementById('profReport');
        const mapR= document.getElementById('mapReport');
        const prin= document.getElementById('principal');
        prin.style.display='none';
        tut.style.display = 'none';
        prof.style.display = 'none';
        mapR.style.display = 'none';
        
        
        
      }
    }
  };
  
</script>

<template>
  <div id="tutoresreport">
    <router-link to="/tutores-report" @click="hideGoToText">Go to Profesores Report</router-link>
  </div>

  <div id='profReport'> 
    <router-link to="/reconocimiento-report" @click="hideGoToText">Go to Profesores Report</router-link>
  </div>

  <div id='mapReport'> 
    <router-link to="/map-egresados" @click="hideGoToText">Go to Mapa Report</router-link>
  </div>
  
  <div id="principal">
    <router-link to="/principalview" ></router-link>
  </div>
  <router-view/>
  
  

</template>

