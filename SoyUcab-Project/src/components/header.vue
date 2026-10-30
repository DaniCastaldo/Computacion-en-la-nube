<template>
     <header>
            <div class="logoUcab"><img src="../../../public/logo-ucab3.png" alt="Logo Ucab"></div>
            <div class="buscador"><input type="text" name="" id=""></div>
            <div class="NavBar">
                <button id='home' @click="gotoHome"></button>
                <button id='conversaciones'></button>
                <button id='campana'></button>
                <button id='perfil' @click="gotoProfile"></button>
                <button id='reportsButtom' @click="gotoAllReports">
                    <div class="contenido-boton">
                        <img src='../../../public/insignia.png' alt='Reportes'>
                        <h2>Reportes</h2>
                    </div>
                </button>
            </div>
        </header>
</template>
<script>
    import { reportButtom, Home } from '@/services/metodosGenerales';
    

    export default {
        name: 'HeaderBar',

        methods: {
            gotoAllReports() {
                reportButtom();
            },
            gotoHome(){
                Home();
            },
            gotoProfile() {
                // Navegar a la vista de perfil
                this.$router.push('/profile');
            }
        }
    };
</script>