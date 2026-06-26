function goHome() {
    document.getElementById('main-menu').style.display = 'block';
    document.getElementById('basic-math').style.display = 'none';
    document.getElementById('eigen').style.display = 'none';
    document.getElementById('decomposition').style.display = 'none';
    document.getElementById('equations').style.display = 'none';
    showStatsOnHome();
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const basicSection = document.getElementById('basic-math');
        const eigenSection = document.getElementById('eigen');
        const decompSection = document.getElementById('decomposition');
        const eqSection = document.getElementById('equations');

        if (basicSection.style.display !== 'none') {
            const nextBtn = document.getElementById('basic-next');
            if (nextBtn.style.display !== 'none') {
                generateBasicProblem();
            } else {
                checkBasicAnswer();
            }
        }

        if (eigenSection.style.display !== 'none') {
            const nextBtn = document.getElementById('eigen-next');
            if (nextBtn.style.display !== 'none') {
                generateEigenProblem();
            } else {
                checkEigenAnswer();
            }
        }

        if (decompSection.style.display !== 'none') {
            const nextBtn = document.getElementById('step-next');
            if (nextBtn && nextBtn.style.display !== 'none') {
                goNextStep();
            } else {
                checkCurrentStep();
            }
        }

        if (eqSection.style.display !== 'none') {
            const nextBtn = document.getElementById('eq-next');
            if (nextBtn && nextBtn.style.display !== 'none') {
                generateEquation();
            } else {
                checkEquation();
            }
        }
    }
});
