function goHome() {
    document.getElementById('main-menu').style.display = 'block';
    document.getElementById('basic-math').style.display = 'none';
    document.getElementById('eigen').style.display = 'none';
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const basicSection = document.getElementById('basic-math');
        const eigenSection = document.getElementById('eigen');

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
    }
});
