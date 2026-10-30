import router from '@/router/router.js';

export function reportButtom(){
    router.push('/all-reports');
}

export function principalView(){
    router.push('/principalview');
}

export function Home(){
    router.push('/home');
}
export function displayPrincipal(){
    const viewPrincipal=document.getElementById('principal');
    viewPrincipal.style.display='none';
}